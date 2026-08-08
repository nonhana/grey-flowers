import { z } from 'zod';

import { apiSuccessSchema } from './auth.js';

// ============ 层级与作者投影 ============

export const commentLevelSchema = z.enum(['PARENT', 'CHILD']);

export type CommentLevel = z.infer<typeof commentLevelSchema>;

/** 公开：与主站公开 select 逐字段一致（无 email）。 */
export const commentAuthorPublicSchema = z
  .object({
    id: z.number().int().positive(),
    username: z.string(),
    site: z.string().nullable(),
    avatar: z.string(),
  })
  .strict();

export type CommentAuthorPublic = z.infer<typeof commentAuthorPublicSchema>;

/** 管理：运营需联系作者。 */
export const commentAuthorAdminSchema = z
  .object({
    id: z.number().int().positive(),
    username: z.string(),
    email: z.string(),
    avatar: z.string(),
    site: z.string().nullable(),
    role: z.enum(['USER', 'ADMIN']),
  })
  .strict();

export type CommentAuthorAdmin = z.infer<typeof commentAuthorAdminSchema>;

export const commentParentRefSchema = z
  .object({
    id: z.number().int().positive(),
    content: z.string(),
    authorId: z.number().int().positive(),
  })
  .strict();

export type CommentParentRef = z.infer<typeof commentParentRefSchema>;

export const commentReplyToUserSchema = z
  .object({
    id: z.number().int().positive(),
    username: z.string(),
  })
  .strict();

export type CommentReplyToUser = z.infer<typeof commentReplyToUserSchema>;

export const commentReplyToCommentSchema = z
  .object({
    id: z.number().int().positive(),
    content: z.string(),
  })
  .strict();

export type CommentReplyToComment = z.infer<typeof commentReplyToCommentSchema>;

// ============ 单条评论 DTO（公开） ============

export const commentPublicSchema = z
  .object({
    id: z.number().int().positive(),
    path: z.string(),
    content: z.string(),
    /** mdc AST Json 透传（主站渲染） */
    contentMarkdown: z.any().nullable(),
    level: commentLevelSchema,
    author: commentAuthorPublicSchema,
    parent: commentParentRefSchema.nullable(),
    replyToUser: commentReplyToUserSchema.nullable(),
    replyToComment: commentReplyToCommentSchema.nullable(),
    publishedAt: z.iso.datetime(),
    editedAt: z.iso.datetime(),
  })
  .strict();

export type CommentPublic = z.infer<typeof commentPublicSchema>;

export const commentPublicTreeSchema = commentPublicSchema
  .extend({
    /** children 按 publishedAt asc（对齐主站） */
    children: z.array(commentPublicSchema),
  })
  .strict();

export type CommentPublicTree = z.infer<typeof commentPublicTreeSchema>;

// ============ 单条评论 DTO（管理，无 contentMarkdown） ============

export const commentAdminSchema = z
  .object({
    id: z.number().int().positive(),
    path: z.string(),
    content: z.string(),
    level: commentLevelSchema,
    author: commentAuthorAdminSchema,
    parent: commentParentRefSchema.nullable(),
    replyToUser: commentReplyToUserSchema.nullable(),
    replyToComment: commentReplyToCommentSchema.nullable(),
    publishedAt: z.iso.datetime(),
    editedAt: z.iso.datetime(),
  })
  .strict();

export type CommentAdmin = z.infer<typeof commentAdminSchema>;

export const commentAdminTreeSchema = commentAdminSchema
  .extend({
    children: z.array(commentAdminSchema),
    /** 供删除确认披露 */
    childrenCount: z.number().int().min(0),
  })
  .strict();

export type CommentAdminTree = z.infer<typeof commentAdminTreeSchema>;

// ============ 输入 ============

export const commentCreateInputSchema = z
  .object({
    path: z.string().min(1, 'path 不能为空').max(300),
    content: z
      .string()
      .trim()
      .min(1, '评论内容不能为空')
      .max(2048, '评论内容不能超过 2048 字'),
    parentId: z.number().int().positive().optional(),
    replyToUserId: z.number().int().positive().optional(),
    replyToCommentId: z.number().int().positive().optional(),
  })
  .strict();

export type CommentCreateInput = z.infer<typeof commentCreateInputSchema>;

export const commentReplyInputSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, '回复内容不能为空')
      .max(2048, '回复内容不能超过 2048 字'),
  })
  .strict();

export type CommentReplyInput = z.infer<typeof commentReplyInputSchema>;

export const commentsBatchDeleteInputSchema = z
  .object({
    ids: z
      .array(z.number().int().positive())
      .min(1, '请提供要删除的评论 ID')
      .max(100, '单次最多删除 100 条评论'),
  })
  .strict();

export type CommentsBatchDeleteInput = z.infer<
  typeof commentsBatchDeleteInputSchema
>;

// ============ 删除结果（含级联披露） ============

export const commentDeleteResultSchema = z
  .object({
    /** 实际删除总数（含级联子树） */
    deleted: z.number().int().min(0),
    /** 其中级联删除的子评论数 */
    cascade: z.number().int().min(0),
  })
  .strict();

export type CommentDeleteResult = z.infer<typeof commentDeleteResultSchema>;

// ============ 列表查询（管理） ============

export const commentListQuerySchema = z
  .object({
    /** content contains insensitive */
    search: z.string().max(50).optional(),
    /** path contains insensitive（保留旧语义） */
    path: z.string().max(300).optional(),
    authorId: z.coerce.number().int().positive().optional(),
    /** publishedAt >= startDate 当日 00:00（本地时区由 API 校准） */
    startDate: z.iso.date().optional(),
    /** publishedAt <= endDate 当日 24:00 */
    endDate: z.iso.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type CommentListQuery = z.infer<typeof commentListQuerySchema>;

export const commentListDataSchema = z
  .object({
    items: z.array(commentAdminTreeSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
  })
  .strict();

export type CommentListData = z.infer<typeof commentListDataSchema>;

export const commentListResponseSchema = apiSuccessSchema(
  commentListDataSchema,
);

export type CommentListResponse = z.infer<typeof commentListResponseSchema>;

export const commentAdminResponseSchema = apiSuccessSchema(commentAdminSchema);

export type CommentAdminResponse = z.infer<typeof commentAdminResponseSchema>;

export const commentDeleteResponseSchema = apiSuccessSchema(
  commentDeleteResultSchema,
);

export type CommentDeleteResponse = z.infer<typeof commentDeleteResponseSchema>;

// ============ 公开读 ============

export const commentCountSchema = z
  .object({
    totalCount: z.number().int().min(0),
    parentCount: z.number().int().min(0),
  })
  .strict();

export type CommentCount = z.infer<typeof commentCountSchema>;

export const commentPublicListQuerySchema = z
  .object({
    path: z.string().min(1).max(300),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();

export type CommentPublicListQuery = z.infer<
  typeof commentPublicListQuerySchema
>;

export const commentPublicListResponseSchema = apiSuccessSchema(
  z.array(commentPublicTreeSchema),
);

export type CommentPublicListResponse = z.infer<
  typeof commentPublicListResponseSchema
>;

export const commentCountResponseSchema = apiSuccessSchema(commentCountSchema);

export type CommentCountResponse = z.infer<typeof commentCountResponseSchema>;

export const commentPublicResponseSchema =
  apiSuccessSchema(commentPublicSchema);

export type CommentPublicResponse = z.infer<typeof commentPublicResponseSchema>;

export const commentMeResponseSchema = apiSuccessSchema(
  z.array(commentPublicSchema),
);

export type CommentMeResponse = z.infer<typeof commentMeResponseSchema>;

export const commentMeTreeResponseSchema = apiSuccessSchema(
  z.array(commentPublicTreeSchema),
);

export type CommentMeTreeResponse = z.infer<typeof commentMeTreeResponseSchema>;
