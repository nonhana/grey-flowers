import { z } from 'zod';

import {
  apiSuccessSchema,
  emailInputSchema,
  emailSchema,
  siteSchema,
} from './auth.js';
import { usernameSchema, userRoleSchema } from './auth.js';
import { commentAdminSchema } from './comments.js';

// ============ 管理投影：合计评论数，无 password ============

export const userAdminSummarySchema = z
  .object({
    id: z.number().int().positive(),
    email: emailSchema,
    username: usernameSchema,
    avatar: z.string(),
    site: siteSchema.nullable(),
    role: userRoleSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    commentCount: z.number().int().min(0),
  })
  .strict();

export type UserAdminSummary = z.infer<typeof userAdminSummarySchema>;

// ============ 列表查询（管理） ============

export const userListQuerySchema = z
  .object({
    /** username/email contains insensitive */
    search: z.string().max(100).optional(),
    /** 角色筛选 */
    role: userRoleSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const userAdminListDataSchema = z
  .object({
    items: z.array(userAdminSummarySchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
  })
  .strict();

export type UserAdminListData = z.infer<typeof userAdminListDataSchema>;

export const userAdminListResponseSchema = apiSuccessSchema(
  userAdminListDataSchema,
);

export type UserAdminListResponse = z.infer<typeof userAdminListResponseSchema>;

// ============ 详情：资料 + 分页评论历史（复用 commentAdminSchema） ============

export const userAdminDetailQuerySchema = z
  .object({
    commentPage: z.coerce.number().int().min(1).default(1),
    commentPageSize: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

export type UserAdminDetailQuery = z.infer<typeof userAdminDetailQuerySchema>;

export const userAdminDetailDataSchema = z
  .object({
    user: userAdminSummarySchema,
    comments: z
      .object({
        items: z.array(commentAdminSchema),
        total: z.number().int().min(0),
        page: z.number().int().min(1),
        pageSize: z.number().int().min(1).max(50),
      })
      .strict(),
  })
  .strict();

export type UserAdminDetailData = z.infer<typeof userAdminDetailDataSchema>;

export const userAdminDetailResponseSchema = apiSuccessSchema(
  userAdminDetailDataSchema,
);

export type UserAdminDetailResponse = z.infer<
  typeof userAdminDetailResponseSchema
>;

// ============ 编辑（管理）——avatar 不在可编辑集合；site: null 清空 ============

export const userUpdateInputSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailInputSchema.optional(),
    site: siteSchema.nullable().optional(),
    role: userRoleSchema.optional(),
  })
  .strict();

export type UserUpdateInput = z.infer<typeof userUpdateInputSchema>;

export const userAdminResponseSchema = apiSuccessSchema(userAdminSummarySchema);

export type UserAdminResponse = z.infer<typeof userAdminResponseSchema>;

// ============ 删除结果（级联披露） ============

export const userDeleteResultSchema = z
  .object({
    /** 实际删除评论总数（含级联子树） */
    deleted: z.number().int().min(0),
    /** 其中非本人作者的级联子评论数 */
    cascade: z.number().int().min(0),
  })
  .strict();

export type UserDeleteResult = z.infer<typeof userDeleteResultSchema>;

export const userDeleteResponseSchema = apiSuccessSchema(
  userDeleteResultSchema,
);

export type UserDeleteResponse = z.infer<typeof userDeleteResponseSchema>;
