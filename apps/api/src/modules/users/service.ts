import type {
  Principal,
  UserAdminDetailData,
  UserAdminDetailQuery,
  UserAdminListData,
  UserAdminSummary,
  UserDeleteResult,
  UserListQuery,
  UserUpdateInput,
} from '@grey-flowers/contracts';
import type { Prisma, PrismaClient } from '@grey-flowers/db';

import { ApiError } from '@/http/errors';
import { pagination } from '@/lib/pagination';
import { isUniqueConstraint } from '@/lib/prisma';

import type { AuthService } from '../auth/service';

import { commentAdminSelect, toCommentAdmin } from '../comments/contracts';
import { toUserAdmin, userAdminSelect } from './contracts';

type Client = PrismaClient | Prisma.TransactionClient;
type Role = 'USER' | 'ADMIN';

/**
 * 删除事务的子树闭包：authorId 根集 → 全部后代（含他人子回复）。
 * deleted = 闭包大小；cascade = 闭包中 authorId !== 目标用户的评论数。
 */
const collectCascadeCommentIds = async (
  client: Client,
  rootIds: number[],
  rootAuthorId: number,
): Promise<Array<{ authorId: number }>> => {
  const closure = new Map<number, number>();
  for (const rootId of rootIds) closure.set(rootId, rootAuthorId);

  let frontier = rootIds;
  while (frontier.length > 0) {
    // 每层依赖上一层结果（顺序 BFS），无法并行。
    // oxlint-disable-next-line no-await-in-loop
    const rows = await client.comment.findMany({
      select: { authorId: true, id: true },
      where: { parentId: { in: frontier } },
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      if (!closure.has(row.id)) closure.set(row.id, row.authorId);
    }
    frontier = rows.map((row) => row.id);
  }

  return [...closure.values()].map((authorId) => ({ authorId }));
};

/**
 * 用户运营用例。检索/详情沿用管理 DTO（含 email、commentCount，无 password）；
 * 编辑与删除的角色归身份模块（applyRoleChange 撒全会话）；删除事务按 §四 顺序
 * 清理必填外键（receiver 消息、本人评论），可选外键由 DB SET NULL/CASCADE 落实。
 */
export class UserService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auth: AuthService,
  ) {}

  async list(input: UserListQuery): Promise<UserAdminListData> {
    const { page, pageSize, role, search } = input;
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: userAdminSelect,
        ...pagination(page, pageSize),
        where,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map(toUserAdmin),
      page,
      pageSize,
      total,
    };
  }

  async detail(
    id: number,
    query: UserAdminDetailQuery,
  ): Promise<UserAdminDetailData> {
    const user = await this.prisma.user.findUnique({
      select: userAdminSelect,
      where: { id },
    });
    if (!user) throw new ApiError('NOT_FOUND');

    const commentWhere: Prisma.CommentWhereInput = { authorId: id };
    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        select: commentAdminSelect,
        ...pagination(query.commentPage, query.commentPageSize),
        where: commentWhere,
      }),
      this.prisma.comment.count({ where: commentWhere }),
    ]);

    return {
      user: toUserAdmin(user),
      comments: {
        items: items.map(toCommentAdmin),
        page: query.commentPage,
        pageSize: query.commentPageSize,
        total,
      },
    };
  }

  /** 单事务：查重 → 更新非角色字段 → 角色变更经 auth.applyRoleChange（同事务撤会话）。 */
  async update(
    principal: Principal,
    id: number,
    input: UserUpdateInput,
  ): Promise<UserAdminSummary> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const currentUser = await transaction.user.findUnique({
          select: userAdminSelect,
          where: { id },
        });
        if (!currentUser) throw new ApiError('NOT_FOUND');
        if (id === principal.userId) {
          throw new ApiError('AUTH_FORBIDDEN', {
            message: '请通过个人资料接口修改自己的信息',
          });
        }

        const email = input.email?.trim();
        const username = input.username;
        if (email !== undefined || username !== undefined) {
          const duplicate = await transaction.user.findFirst({
            select: { id: true },
            where: {
              id: { not: id },
              OR: [
                ...(email === undefined ? [] : [{ email }]),
                ...(username === undefined ? [] : [{ username }]),
              ],
            },
          });
          if (duplicate)
            throw new ApiError('CONFLICT', {
              message: '用户名或邮箱已被占用',
            });
        }

        const roleChanged =
          input.role !== undefined && input.role !== currentUser.role;
        const user = await transaction.user.update({
          data: {
            ...(username === undefined ? {} : { username }),
            ...(email === undefined ? {} : { email }),
            ...(input.site === undefined ? {} : { site: input.site }),
            // 角色变更统一走 auth.applyRoleChange，这里不写 role。
          },
          select: userAdminSelect,
          where: { id },
        });

        if (roleChanged) {
          await this.auth.applyRoleChange(id, input.role as Role, transaction);
        }

        return toUserAdmin({
          ...user,
          role: roleChanged ? (input.role as Role) : user.role,
        });
      });
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ApiError('CONFLICT', {
          cause: error,
          message: '用户名或邮箱已被占用',
        });

      throw error;
    }
  }

  /** 单事务删除：守卫 → 闭包统计 → 清理必填引用 → 删本体（其余 DB 级联）。 */
  async remove(principal: Principal, id: number): Promise<UserDeleteResult> {
    return await this.prisma.$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({
        select: {
          id: true,
          role: true,
          _count: {
            select: { articleSnapshots: true, createdAssets: true },
          },
        },
        where: { id },
      });
      if (!target) throw new ApiError('NOT_FOUND');
      if (id === principal.userId) throw new ApiError('AUTH_FORBIDDEN');
      if (target.role === 'ADMIN') {
        throw new ApiError('CONFLICT', {
          message: '不能删除管理员账户',
        });
      }
      if (
        target._count.createdAssets > 0 ||
        target._count.articleSnapshots > 0
      ) {
        const assets = target._count.createdAssets;
        const snapshots = target._count.articleSnapshots;
        const parts = [
          assets > 0 ? `${assets} 个资产` : '',
          snapshots > 0 ? `${snapshots} 个文章快照` : '',
        ].filter(Boolean);
        throw new ApiError('CONFLICT', {
          message: `该用户还创建了 ${parts.join('、')}，无法删除`,
        });
      }

      const authored = await transaction.comment.findMany({
        select: { id: true },
        where: { authorId: id },
      });
      const closure = await collectCascadeCommentIds(
        transaction,
        authored.map((row) => row.id),
        id,
      );
      const deleted = closure.length;
      const cascade = closure.filter((row) => row.authorId !== id).length;

      await transaction.userMessage.deleteMany({ where: { receiverId: id } });
      await transaction.comment.deleteMany({ where: { authorId: id } });
      await transaction.user.delete({ where: { id } });

      return { cascade, deleted };
    });
  }
}
