import { z } from 'zod';

import { commentAdminSchema } from './comments.js';
import {
  apiSuccessSchema,
  nonNegativeIntSchema,
  positiveIntSchema,
  userRoleSchema,
} from './common.js';

export const usernameSchema = z
  .string()
  .min(1, { message: '用户名不能为空' })
  .max(16, { message: '用户名不能超过 16 个字符' });

/** 用户输入侧邮箱（trim 后校验）。 */
export const emailInputSchema = z.email({ message: '邮箱格式不正确' }).trim();

/** 存储/输出侧邮箱（已归一，不再 trim）。 */
export const emailSchema = z.email();

export const siteSchema = z.url({ message: '站点链接格式不正确' });

/** 公开用户投影（注册响应、/auth/me 等）。 */
export const publicUserSchema = z
  .object({
    id: positiveIntSchema,
    email: emailSchema,
    username: usernameSchema,
    avatar: z.string(),
    site: siteSchema.nullable(),
  })
  .strict();

export type PublicUser = z.infer<typeof publicUserSchema>;

export const userAdminSummarySchema = z
  .object({
    id: positiveIntSchema,
    email: emailSchema,
    username: usernameSchema,
    avatar: z.string(),
    site: siteSchema.nullable(),
    role: userRoleSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    commentCount: nonNegativeIntSchema,
  })
  .strict();

export type UserAdminSummary = z.infer<typeof userAdminSummarySchema>;

export const userListQuerySchema = z
  .object({
    /** username/email contains insensitive */
    search: z.string().max(100).optional(),
    role: userRoleSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const userAdminListDataSchema = z
  .object({
    items: z.array(userAdminSummarySchema),
    total: nonNegativeIntSchema,
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
  })
  .strict();

export type UserAdminListData = z.infer<typeof userAdminListDataSchema>;

export const userAdminListResponseSchema = apiSuccessSchema(
  userAdminListDataSchema,
);

export type UserAdminListResponse = z.infer<typeof userAdminListResponseSchema>;

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
        total: nonNegativeIntSchema,
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

// 编辑：avatar 不可编辑；site: null 清空
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

export const userDeleteResultSchema = z
  .object({
    /** 实际删除评论总数（含级联子树） */
    deleted: nonNegativeIntSchema,
    /** 其中非本人作者的级联子评论数 */
    cascade: nonNegativeIntSchema,
  })
  .strict();

export type UserDeleteResult = z.infer<typeof userDeleteResultSchema>;

export const userDeleteResponseSchema = apiSuccessSchema(
  userDeleteResultSchema,
);

export type UserDeleteResponse = z.infer<typeof userDeleteResponseSchema>;
