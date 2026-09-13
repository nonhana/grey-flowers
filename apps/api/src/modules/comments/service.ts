import type {
  CommentAdmin,
  CommentCreateInput,
  CommentDeleteResult,
  CommentListData,
  CommentListQuery,
  CommentPublic,
  CommentPublicListQuery,
  CommentPublicTree,
  CommentReplyInput,
  Principal,
} from '@grey-flowers/contracts';
import type { Prisma, PrismaClient } from '@grey-flowers/db';

import type { ApiLogger } from '@/bootstrap/logger';

import { ApiError } from '@/http/errors';
import { pagination } from '@/lib/pagination';

import type { CommentMailer } from './mailer';

import { parseCommentMarkdown } from './comment-markdown';
import {
  commentAdminSelect,
  commentPublicSelect,
  toCommentAdmin,
  toCommentAdminTree,
  toCommentPublic,
  toCommentPublicTree,
} from './contracts';

type Client = PrismaClient | Prisma.TransactionClient;

interface ReplyMailTarget {
  author: { username: string };
  content: string;
  parent: { content: string } | null;
  path: string;
  replyToComment: { content: string } | null;
}

/**
 * 评论用例。正文走受限 Markdown（禁 heading/html/image/table + 14 标签白名单）；
 * level 由服务端按 parentId 决定（PARENT/CHILD 两级，回复 CHILD 时父归并到其父）；
 * 删除级联（子树 + UserMessage）+ 外部 replyTo 引用 SetNull 由 schema 迁移保证；
 * 通知收进服务端：回复他人时事务内建 UserMessage，提交后 best-effort 发邮件。
 */
export class CommentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ApiLogger,
    private readonly mailer: CommentMailer,
  ) {}

  // ==================== 管理写 ====================

  /**
   * Admin 回复：归一 parentId（PARENT → 自身；CHILD → 其父），replyTo* 指向目标，
   * 目标作者非本人时事务内建通知 + 提交后 best-effort 邮件。
   */
  async replyAdmin(
    principal: Principal,
    id: number,
    input: CommentReplyInput,
  ): Promise<CommentAdmin> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const target = await tx.comment.findUnique({
        select: {
          authorId: true,
          id: true,
          level: true,
          parentId: true,
          path: true,
        },
        where: { id },
      });
      if (!target) throw new ApiError('NOT_FOUND');

      const contentMarkdown = await this.resolveContentMarkdown(input.content);
      const record = await tx.comment.create({
        data: {
          content: input.content,
          contentMarkdown,
          level: 'CHILD',
          parentId: target.level === 'PARENT' ? target.id : target.parentId,
          authorId: principal.userId,
          replyToUserId: target.authorId,
          replyToCommentId: target.id,
          path: target.path,
        },
        select: commentAdminSelect,
      });

      let notified = false;
      if (target.authorId !== principal.userId) {
        notified = await this.notifyReceiver(tx, target.authorId, record.id);
      }
      return {
        dto: toCommentAdmin(record),
        notified,
        record,
        targetAuthorId: target.authorId,
      };
    });

    if (outcome.notified) {
      await this.sendReplyMail(outcome.record, outcome.targetAuthorId);
    }
    return outcome.dto;
  }

  /** 单删（管理）：无作者限制，返回 { deleted, cascade }。 */
  async removeAdmin(id: number): Promise<CommentDeleteResult> {
    const existing = await this.prisma.comment.findUnique({
      select: { id: true },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');

    return await this.prisma.$transaction(async (tx) => {
      const childrenCount = await tx.comment.count({
        where: { parentId: id },
      });
      await tx.comment.delete({ where: { id } });
      return { deleted: 1 + childrenCount, cascade: childrenCount };
    });
  }

  /** 批删（管理，≤100）：全不存在 → NOT_FOUND；混合 → 删存在并可披露。 */
  async removeAdminBatch(ids: number[]): Promise<CommentDeleteResult> {
    const batch = [...new Set(ids)];
    const existing = await this.prisma.comment.findMany({
      select: { id: true },
      where: { id: { in: batch } },
    });
    if (existing.length === 0) throw new ApiError('NOT_FOUND');

    return await this.prisma.$transaction(async (tx) => {
      const children = await tx.comment.findMany({
        select: { id: true },
        where: { parentId: { in: batch } },
      });
      // 子评论若同时出现在批删 ids 里，已在 batch 名下计算，不重复计入级联。
      const existingIds = new Set(existing.map((row) => row.id));
      const cascade = children.filter((row) => !existingIds.has(row.id)).length;

      await tx.comment.deleteMany({ where: { id: { in: batch } } });
      return { deleted: existing.length + cascade, cascade };
    });
  }

  // ==================== 管理读 ====================

  async listAdmin(input: CommentListQuery): Promise<CommentListData> {
    const parentWhere = this.buildListWhere(input);
    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        select: this.commentAdminTreeSelect,
        ...pagination(input.page, input.pageSize),
        where: parentWhere,
      }),
      this.prisma.comment.count({ where: parentWhere }),
    ]);
    return {
      items: items.map((record) =>
        toCommentAdminTree(record, record._count.children),
      ),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }

  // ==================== 公开写 ====================

  /**
   * 公开发/回复：服务端算 level、受限 Markdown、目标存在性校验；
   * 若 replyToCommentId 且目标作者非本人 → 事务内建通知 + 提交后 best-effort 邮件。
   */
  async createPublic(
    principal: Principal,
    input: CommentCreateInput,
  ): Promise<CommentPublic> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      let parentId: number | null | undefined = input.parentId;
      if (parentId !== undefined) {
        const parent = await tx.comment.findUnique({
          select: { id: true, level: true, parentId: true, path: true },
          where: { id: parentId },
        });
        // parent 必须与本次评论同 path，否则会造成跨路径树损坏。
        if (!parent) throw new ApiError('NOT_FOUND');
        if (parent.path !== input.path) {
          throw new ApiError('VALIDATION_FAILED', {
            fields: {
              parentId: ['Parent comment does not belong to this path'],
            },
          });
        }
        // 树两级硬约束：回复 CHILD 时父归并到其父
        if (parent.level === 'CHILD') parentId = parent.parentId;
      }
      if (input.replyToUserId !== undefined) {
        const user = await tx.user.findUnique({
          select: { id: true },
          where: { id: input.replyToUserId },
        });
        if (!user) throw new ApiError('NOT_FOUND');
      }
      let targetAuthorId: number | null = null;
      if (input.replyToCommentId !== undefined) {
        const target = await tx.comment.findUnique({
          select: { authorId: true, id: true, path: true },
          where: { id: input.replyToCommentId },
        });
        if (!target) throw new ApiError('NOT_FOUND');
        // replyTo 目标同样必须与本次评论同 path。
        if (target.path !== input.path) {
          throw new ApiError('VALIDATION_FAILED', {
            fields: {
              replyToCommentId: ['Target comment does not belong to this path'],
            },
          });
        }
        targetAuthorId = target.authorId;
      }

      const contentMarkdown = await this.resolveContentMarkdown(input.content);
      const record = await tx.comment.create({
        data: {
          path: input.path,
          content: input.content,
          contentMarkdown,
          level: parentId ? 'CHILD' : 'PARENT',
          parentId,
          authorId: principal.userId,
          replyToUserId: input.replyToUserId,
          replyToCommentId: input.replyToCommentId,
        },
        select: commentPublicSelect,
      });

      let notified = false;
      if (targetAuthorId !== null && targetAuthorId !== principal.userId) {
        notified = await this.notifyReceiver(tx, targetAuthorId, record.id);
      }
      return { dto: toCommentPublic(record), notified, record, targetAuthorId };
    });

    if (outcome.notified && outcome.targetAuthorId !== null) {
      await this.sendReplyMail(outcome.record, outcome.targetAuthorId);
    }
    return outcome.dto;
  }

  /** 公开删：仅作者本人可删；级联子树 + 引用清理交 DB。 */
  async removeOwn(
    principal: Principal,
    id: number,
  ): Promise<CommentDeleteResult> {
    const existing = await this.prisma.comment.findUnique({
      select: { authorId: true, id: true },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');
    if (existing.authorId !== principal.userId) {
      throw new ApiError('AUTH_FORBIDDEN');
    }

    return await this.prisma.$transaction(async (tx) => {
      const childrenCount = await tx.comment.count({
        where: { parentId: id },
      });
      await tx.comment.delete({ where: { id } });
      return { deleted: 1 + childrenCount, cascade: childrenCount };
    });
  }

  // ==================== 公开读 ====================

  async listPublic(
    query: CommentPublicListQuery,
  ): Promise<CommentPublicTree[]> {
    const where = { level: 'PARENT' as const, path: query.path };
    const items = await this.prisma.comment.findMany({
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      select: this.commentPublicTreeSelect,
      ...pagination(query.page, query.pageSize),
      where,
    });
    return items.map(toCommentPublicTree);
  }

  async countPublic(
    path: string,
  ): Promise<{ totalCount: number; parentCount: number }> {
    const [totalCount, parentCount] = await Promise.all([
      this.prisma.comment.count({ where: { path } }),
      this.prisma.comment.count({ where: { path, level: 'PARENT' } }),
    ]);
    return { totalCount, parentCount };
  }

  async listMyComments(principal: Principal): Promise<CommentPublicTree[]> {
    const items = await this.prisma.comment.findMany({
      orderBy: { publishedAt: 'desc' },
      select: this.commentMyCommentsSelect,
      take: 10,
      where: { authorId: principal.userId },
    });
    return items.map(toCommentPublicTree);
  }

  async listMyMessages(principal: Principal): Promise<CommentPublic[]> {
    const items = await this.prisma.userMessage.findMany({
      orderBy: { comment: { publishedAt: 'desc' } },
      select: { comment: { select: commentPublicSelect } },
      take: 10,
      where: { receiverId: principal.userId },
    });
    return items.map((row) => toCommentPublic(row.comment));
  }

  // ==================== 私有 ====================

  /** 管理树 select：children 完整数组（publishedAt asc）+ childrenCount。 */
  private readonly commentAdminTreeSelect = {
    _count: { select: { children: true } },
    ...commentAdminSelect,
    children: {
      orderBy: { publishedAt: 'asc' as const },
      select: commentAdminSelect,
    },
  } satisfies Prisma.CommentSelect;

  /** 公开树 select：children 按 publishedAt asc（对齐主站）。 */
  private readonly commentPublicTreeSelect = {
    ...commentPublicSelect,
    children: {
      orderBy: { publishedAt: 'asc' as const },
      select: commentPublicSelect,
    },
  } satisfies Prisma.CommentSelect;

  /** 我的评论：children take 2 对齐主站（仅展示最近回复概览）。 */
  private readonly commentMyCommentsSelect = {
    ...commentPublicSelect,
    children: {
      orderBy: { publishedAt: 'asc' as const },
      select: commentPublicSelect,
      take: 2,
    },
  } satisfies Prisma.CommentSelect;

  /** 列表筛选：PARENT 树 + authorId/path contains/content search/日期区间。 */
  private buildListWhere(input: CommentListQuery): Prisma.CommentWhereInput {
    const { authorId, endDate, path, search, startDate } = input;
    const publishedAt: Prisma.DateTimeFilter | undefined =
      startDate || endDate
        ? {
            ...(startDate ? { gte: new Date(`${startDate}T00:00:00`) } : {}),
            ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999`) } : {}),
          }
        : undefined;

    return {
      ...(publishedAt ? { publishedAt } : {}),
      level: 'PARENT',
      ...(authorId !== undefined ? { authorId } : {}),
      ...(path !== undefined
        ? { path: { contains: path, mode: 'insensitive' as const } }
        : {}),
      ...(search !== undefined
        ? { content: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };
  }

  /** 正文受限 Markdown 解析；规则拒绝 → VALIDATION_FAILED（中文文案），异常 → INTERNAL_ERROR。 */
  private async resolveContentMarkdown(
    content: string,
  ): Promise<Prisma.InputJsonValue> {
    const parsed = await parseCommentMarkdown(content);
    if (!parsed.success) {
      const message = parsed.statusMessage;
      if (parsed.statusCode >= 500) {
        throw new ApiError('INTERNAL_ERROR', {
          message,
          cause: parsed.cause,
        });
      }
      throw new ApiError('VALIDATION_FAILED', { message });
    }
    return parsed.payload as unknown as Prisma.InputJsonValue;
  }

  /** 通知原语：同一 (接收者, 回复评论) 至多一条（skipDuplicates 依赖新唯一约束）；返回是否新建。 */
  private async notifyReceiver(
    client: Client,
    receiverId: number,
    replyCommentId: number,
  ): Promise<boolean> {
    const result = await client.userMessage.createMany({
      data: [{ receiverId, commentId: replyCommentId }],
      skipDuplicates: true,
    });
    return result.count > 0;
  }

  /** 邮件原语：提交后 best-effort，失败仅记日志，不阻断评论/通知。 */
  private async sendReplyMail(
    comment: ReplyMailTarget,
    receiverId: number,
  ): Promise<void> {
    try {
      const receiver = await this.prisma.user.findUnique({
        select: { email: true, username: true },
        where: { id: receiverId },
      });
      if (!receiver) return;

      await this.mailer.sendCommentReplyMail({
        receiverEmail: receiver.email,
        receiverName: receiver.username,
        replierName: comment.author.username,
        commentContent: comment.content,
        repliedContent:
          comment.replyToComment?.content ||
          comment.parent?.content ||
          undefined,
        pagePath: comment.path,
      });
    } catch (error) {
      this.logger.warn({ err: error }, 'comment reply mail failed');
    }
  }
}
