import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthUpdateMeInput,
  Principal,
  PublicUser,
} from '@grey-flowers/contracts';
import type { Prisma, createPrismaClient } from '@grey-flowers/db';

import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

import type { ApiEnvironment } from '@/env.js';

import { ApiError } from '@/http/errors.js';
import { isUniqueConstraint } from '@/lib/prisma.js';

import { toPrincipal } from './principal.js';
import { decideRefresh } from './refresh-policy.js';
import {
  createRefreshSecret,
  formatRefreshCredential,
  hashRefreshSecret,
  parseRefreshCredential,
  SESSION_TTL_MS,
  signAccessToken,
  verifyRefreshSecret,
} from './tokens.js';

const passwordHashCost = 10;

const authUserSelect = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  site: true,
  role: true,
} as const;

type PrismaClient = ReturnType<typeof createPrismaClient>;
interface AuthUser {
  avatar: string;
  email: string;
  id: number;
  role: 'USER' | 'ADMIN';
  site: string | null;
  username: string;
}

interface AuthenticatedSession {
  accessToken: string;
  principal: Principal;
}

export interface LoginResult extends AuthenticatedSession {
  refreshCredential: string;
}

export interface UpdateMeResult {
  principal: Principal;
  requiresReauthentication: boolean;
}

const toPublicUser = (user: AuthUser): PublicUser => {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    site: user.site,
  };
};

const avatarUrl = (email: string) => {
  const hash = createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex');
  return `https://weavatar.com/avatar/${hash}`;
};

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly environment: ApiEnvironment,
  ) {}

  async register(input: AuthRegisterInput): Promise<PublicUser> {
    const email = input.email.trim();
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: input.username }],
      },
      select: { id: true },
    });
    if (existingUser) throw new ApiError('CONFLICT');

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          username: input.username,
          password: await bcrypt.hash(input.password, passwordHashCost),
          avatar: avatarUrl(email),
          ...(input.site === undefined ? {} : { site: input.site }),
        },
        select: authUserSelect,
      });
      return toPublicUser(user);
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ApiError('CONFLICT', { cause: error });

      throw error;
    }
  }

  async login(
    input: AuthLoginInput,
    priorRefreshCredential: string | undefined,
  ): Promise<LoginResult> {
    const account = input.account.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: account }, { username: account }],
      },
      select: {
        ...authUserSelect,
        password: true,
      },
    });

    if (!user || !(await bcrypt.compare(input.password, user.password)))
      throw new ApiError('AUTH_INVALID_CREDENTIALS');

    const refreshSecret = createRefreshSecret();
    // 同事务内「吊销旧会话 + 建新会话」：建会话失败不会连带吊销旧 refresh，
    // 避免登录失败导致旧端静默登出。旧会话缺失/已失效时 revoke 为空操作。
    const session = await this.prisma.$transaction(async (tx) => {
      await this.revokeSessionIn(tx, priorRefreshCredential, 'LOGOUT');

      return tx.session.create({
        data: {
          userId: user.id,
          refreshSecretHash: hashRefreshSecret(refreshSecret, this.environment),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
        select: { id: true },
      });
    });
    const principal = toPrincipal(user, session.id);

    return {
      ...(await this.createAuthenticatedSession(principal)),
      refreshCredential: formatRefreshCredential({
        sessionId: session.id,
        refreshSecret,
      }),
    };
  }

  /**
   * refresh 轮换：每次成功 refresh 都会生成新 refresh secret 并落库，
   * 旧 hash 记入 `previousRefreshSecretHash`。若收到的是「已轮换前的旧
   * credential」，且距上次轮换已超出重用宽限窗口，则判定为 token 重用
   * （可能被盗），随即吊销该用户全部 active session（REUSE_DETECTED）；
   * 窗口内则视为并发刷新 / 响应丢失后的重试，照常轮换（见 refresh-policy.ts）。
   */
  async refresh(value: string | undefined): Promise<LoginResult | undefined> {
    const credential = parseRefreshCredential(value);
    if (!credential) return undefined;

    const session = await this.prisma.session.findUnique({
      where: { id: credential.sessionId },
      select: {
        id: true,
        refreshSecretHash: true,
        previousRefreshSecretHash: true,
        lastUsedAt: true,
        revokedAt: true,
        expiresAt: true,
        userId: true,
        user: { select: authUserSelect },
      },
    });
    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date()
    )
      return undefined;

    const matches = (hash: string | null) =>
      hash !== null &&
      verifyRefreshSecret(credential.refreshSecret, hash, this.environment);

    const decision = decideRefresh({
      lastRotatedAt: session.lastUsedAt,
      matchesCurrentSecret: matches(session.refreshSecretHash),
      matchesPreviousSecret: matches(session.previousRefreshSecretHash),
      now: Date.now(),
    });

    if (decision === 'reuse-detected') {
      await this.prisma.session.updateMany({
        where: {
          userId: session.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          revokedAt: new Date(),
          revokeReason: 'REUSE_DETECTED',
        },
      });
      return undefined;
    }

    if (decision === 'reject') return undefined;

    const nextSecret = createRefreshSecret();
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        previousRefreshSecretHash: session.refreshSecretHash,
        refreshSecretHash: hashRefreshSecret(nextSecret, this.environment),
        lastUsedAt: new Date(),
      },
    });

    const principal = toPrincipal(session.user, session.id);

    return {
      ...(await this.createAuthenticatedSession(principal)),
      refreshCredential: formatRefreshCredential({
        sessionId: session.id,
        refreshSecret: nextSecret,
      }),
    };
  }

  async logout(value: string | undefined): Promise<void> {
    await this.revokeCurrentRefreshCredential(value, 'LOGOUT');
  }

  async updateMe(
    principal: Principal,
    input: AuthUpdateMeInput,
  ): Promise<UpdateMeResult> {
    const requiresReauthentication = input.newPassword !== undefined;

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const currentUser = await transaction.user.findUnique({
          where: { id: principal.userId },
          select: {
            ...authUserSelect,
            password: true,
          },
        });
        if (!currentUser) throw new ApiError('AUTH_REQUIRED');

        if (
          input.currentPassword &&
          !(await bcrypt.compare(input.currentPassword, currentUser.password))
        )
          throw new ApiError('AUTH_INVALID_CREDENTIALS');

        const email = input.email?.trim();
        const username = input.username;
        if (email !== undefined || username !== undefined) {
          const duplicate = await transaction.user.findFirst({
            where: {
              id: { not: currentUser.id },
              OR: [
                ...(email === undefined ? [] : [{ email }]),
                ...(username === undefined ? [] : [{ username }]),
              ],
            },
            select: { id: true },
          });
          if (duplicate) throw new ApiError('CONFLICT');
        }

        const user = await transaction.user.update({
          where: { id: currentUser.id },
          data: {
            ...(email === undefined ? {} : { email }),
            ...(username === undefined ? {} : { username }),
            ...(input.site === undefined ? {} : { site: input.site }),
            ...(input.newPassword === undefined
              ? {}
              : {
                  password: await bcrypt.hash(
                    input.newPassword,
                    passwordHashCost,
                  ),
                }),
          },
          select: authUserSelect,
        });

        if (requiresReauthentication) {
          await transaction.session.updateMany({
            where: {
              userId: currentUser.id,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
            data: {
              revokedAt: new Date(),
              revokeReason: 'PASSWORD_CHANGED',
            },
          });
        }

        return {
          principal: toPrincipal(user, principal.sessionId),
          requiresReauthentication,
        };
      });
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ApiError('CONFLICT', { cause: error });

      throw error;
    }
  }

  /**
   * 更新角色并在同一事务内撤销该用户全部 active Session（ROLE_CHANGED）。
   * tx 缺省时自建 $transaction；传入时可纳入外层事务（users.update 同事务原子）。
   * 角色未变 → 'unchanged'（不撤销会话）。符合认证设计：角色变更必须归身份模块。
   */
  async applyRoleChange(
    userId: number,
    role: 'USER' | 'ADMIN',
    tx?: Pick<Prisma.TransactionClient, 'session' | 'user'>,
  ): Promise<'unchanged' | 'updated'> {
    if (tx) return this.applyRoleChangeIn(tx, userId, role);
    return this.prisma.$transaction((transaction) =>
      this.applyRoleChangeIn(transaction, userId, role),
    );
  }

  /** 单事务体内的角色变更：见 applyRoleChange。 */
  private async applyRoleChangeIn(
    store: Pick<Prisma.TransactionClient, 'session' | 'user'>,
    userId: number,
    role: 'USER' | 'ADMIN',
  ): Promise<'unchanged' | 'updated'> {
    const current = await store.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!current) throw new ApiError('NOT_FOUND');

    if (current.role === role) return 'unchanged';

    await store.user.update({
      where: { id: userId },
      data: { role },
    });
    await store.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        revokedAt: new Date(),
        revokeReason: 'ROLE_CHANGED',
      },
    });
    return 'updated';
  }

  async promoteToAdmin(email: string) {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!user) return 'not_found' as const;

      const outcome = await this.applyRoleChangeIn(
        transaction,
        user.id,
        'ADMIN',
      );
      return outcome === 'updated'
        ? ('promoted' as const)
        : ('already_admin' as const);
    });
  }

  private async createAuthenticatedSession(
    principal: Principal,
  ): Promise<AuthenticatedSession> {
    return {
      principal,
      accessToken: await signAccessToken(
        {
          userId: principal.userId,
          sessionId: principal.sessionId,
        },
        this.environment,
      ),
    };
  }

  private async findRefreshSession(value: string | undefined) {
    const credential = parseRefreshCredential(value);
    if (!credential) return undefined;

    const session = await this.prisma.session.findUnique({
      where: { id: credential.sessionId },
      select: {
        id: true,
        refreshSecretHash: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: authUserSelect },
      },
    });
    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date() ||
      !verifyRefreshSecret(
        credential.refreshSecret,
        session.refreshSecretHash,
        this.environment,
      )
    ) {
      return undefined;
    }

    return session;
  }

  /**
   * revoke 旧 refresh credential 的可事务版本：传入客户端（本类 prisma 或外层事务）
   * 即可在同一原子单元内完成「吊销旧会话 + 建新会话」。旧会话缺失/已失效时空操作。
   */
  private async revokeSessionIn(
    store: Pick<PrismaClient, 'session'>,
    value: string | undefined,
    reason: 'LOGOUT' | 'PASSWORD_CHANGED' | 'ROLE_CHANGED',
  ) {
    const credential = parseRefreshCredential(value);
    if (!credential) return;

    await store.session.updateMany({
      where: {
        id: credential.sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }

  private async revokeCurrentRefreshCredential(
    value: string | undefined,
    reason: 'LOGOUT' | 'PASSWORD_CHANGED' | 'ROLE_CHANGED',
  ) {
    const session = await this.findRefreshSession(value);
    if (!session) return;

    await this.prisma.session.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }
}
