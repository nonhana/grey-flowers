import { z } from 'zod';

import { apiSuccessSchema } from './auth.js';

/** 公开读：主站标签列表（已发布语义，含文章计数） */
export const publicTagSchema = z
  .object({
    name: z.string().min(1),
    count: z.number().int().min(0),
  })
  .strict();

export type PublicTag = z.infer<typeof publicTagSchema>;

/** 公开读：主站分类列表（已发布语义，含文章计数与封面） */
export const publicCategorySchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    cover: z.string(),
    articleCount: z.number().int().min(0),
  })
  .strict();

export type PublicCategory = z.infer<typeof publicCategorySchema>;

const nameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Name must not be empty' })
  .max(50, { message: 'Name must not exceed 50 characters' });

/** 管理读：标签行 */
export const tagAdminSchema = z
  .object({
    id: z.number().int().positive(),
    name: nameSchema,
    articleCount: z.number().int().min(0),
  })
  .strict();

export type TagAdmin = z.infer<typeof tagAdminSchema>;

/** 管理读：分类行 */
export const categoryAdminSchema = z
  .object({
    id: z.number().int().positive(),
    name: nameSchema,
    cover: z.string(),
    coverAssetId: z.number().int().positive().nullable(),
    articleCount: z.number().int().min(0),
  })
  .strict();

export type CategoryAdmin = z.infer<typeof categoryAdminSchema>;

export const tagListQuerySchema = z
  .object({
    unused: z.literal('true').optional(),
  })
  .strict();

export type TagListQuery = z.infer<typeof tagListQuerySchema>;

export const tagListDataSchema = z
  .object({
    items: z.array(tagAdminSchema),
  })
  .strict();

export const tagListResponseSchema = apiSuccessSchema(tagListDataSchema);

export type TagListData = z.infer<typeof tagListDataSchema>;
export type TagListResponse = z.infer<typeof tagListResponseSchema>;

export const categoryListDataSchema = z
  .object({
    items: z.array(categoryAdminSchema),
  })
  .strict();

export const categoryListResponseSchema = apiSuccessSchema(
  categoryListDataSchema,
);

export type CategoryListData = z.infer<typeof categoryListDataSchema>;
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;

export const tagCreateInputSchema = z
  .object({
    name: nameSchema,
  })
  .strict();

export type TagCreateInput = z.infer<typeof tagCreateInputSchema>;

export const tagResponseSchema = apiSuccessSchema(tagAdminSchema);

export type TagResponse = z.infer<typeof tagResponseSchema>;

export const tagDeleteResponseSchema = apiSuccessSchema(
  z.object({ id: z.number().int().positive() }).strict(),
);

export type TagDeleteData = z.infer<typeof tagDeleteResponseSchema>;
export type TagDeleteResponse = z.infer<typeof tagDeleteResponseSchema>;

/** 分类保存：cover 为空串=无封面；置 coverAssetId 时服务端以资产 deliveryUrl 归一 cover */
export const categorySaveInputSchema = z
  .object({
    name: nameSchema,
    cover: z.string().default(''),
    coverAssetId: z.number().int().positive().nullable().optional(),
  })
  .strict();

export type CategorySaveInput = z.infer<typeof categorySaveInputSchema>;

export const categoryResponseSchema = apiSuccessSchema(categoryAdminSchema);

export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

export const categoryDeleteResponseSchema = apiSuccessSchema(
  z.object({ id: z.number().int().positive() }).strict(),
);

export type CategoryDeleteData = z.infer<typeof categoryDeleteResponseSchema>;
export type CategoryDeleteResponse = z.infer<
  typeof categoryDeleteResponseSchema
>;

/** 公开读响应 */
export const publicTagListDataSchema = z
  .object({
    items: z.array(publicTagSchema),
  })
  .strict();

export const publicTagListResponseSchema = apiSuccessSchema(
  publicTagListDataSchema,
);

export type PublicTagListData = z.infer<typeof publicTagListDataSchema>;
export type PublicTagListResponse = z.infer<typeof publicTagListResponseSchema>;

export const publicCategoryListDataSchema = z
  .object({
    items: z.array(publicCategorySchema),
  })
  .strict();

export const publicCategoryListResponseSchema = apiSuccessSchema(
  publicCategoryListDataSchema,
);

export type PublicCategoryListData = z.infer<
  typeof publicCategoryListDataSchema
>;
export type PublicCategoryListResponse = z.infer<
  typeof publicCategoryListResponseSchema
>;
