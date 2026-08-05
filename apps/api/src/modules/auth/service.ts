import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthUpdateMeInput,
  Principal,
  PublicUser,
} from '@grey-flowers/contracts';
import type { createPrismaClient } from '@grey-flowers/db';

import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

import type { ApiEnvironment } from '@/env.js';

import { ApiError } from '@/http/errors.js';
import { isUniqueConstraint } from '@/lib/prisma.js';

import { toPrincipal } from './principal.js';
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

    await this.revokeCurrentRefreshCredential(priorRefreshCredential, 'LOGOUT');

    const refreshSecret = createRefreshSecret();
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshSecretHash: hashRefreshSecret(refreshSecret, this.environment),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
      select: { id: true },
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

  async refresh(
    value: string | undefined,
  ): Promise<AuthenticatedSession | undefined> {
    const session = await this.findRefreshSession(value);
    if (!session) return undefined;

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    return this.createAuthenticatedSession(
      toPrincipal(session.user, session.id),
    );
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

  async promoteToAdmin(email: string) {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });
      if (!user) return 'not_found' as const;

      if (user.role === 'ADMIN') return 'already_admin' as const;

      await transaction.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
      await transaction.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          revokedAt: new Date(),
          revokeReason: 'ROLE_CHANGED',
        },
      });
      return 'promoted' as const;
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
