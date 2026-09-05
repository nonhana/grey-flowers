import { z } from 'zod';

import {
  apiSuccessSchema,
  nonNegativeIntSchema,
  positiveIntSchema,
} from './common';

export const publicTagSchema = z
  .object({
    name: z.string().min(1),
    count: nonNegativeIntSchema,
  })
  .strict();

export type PublicTag = z.infer<typeof publicTagSchema>;

export const publicCategorySchema = z
  .object({
    id: positiveIntSchema,
    name: z.string().min(1),
    cover: z.string(),
    articleCount: nonNegativeIntSchema,
  })
  .strict();

export type PublicCategory = z.infer<typeof publicCategorySchema>;

const nameSchema = z
  .string()
  .trim()
  .min(1, { message: '名称不能为空' })
  .max(50, { message: '名称不能超过 50 个字符' });

export const tagAdminSchema = z
  .object({
    id: positiveIntSchema,
    name: nameSchema,
    articleCount: nonNegativeIntSchema,
  })
  .strict();

export type TagAdmin = z.infer<typeof tagAdminSchema>;

export const categoryAdminSchema = z
  .object({
    id: positiveIntSchema,
    name: nameSchema,
    cover: z.string(),
    coverAssetId: positiveIntSchema.nullable(),
    articleCount: nonNegativeIntSchema,
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

/** 删除响应：返回被删实体 id（tag/category 同形）。 */
const deleteResultDataSchema = z.object({ id: positiveIntSchema }).strict();

export const tagDeleteResponseSchema = apiSuccessSchema(deleteResultDataSchema);

export type TagDeleteData = z.infer<typeof deleteResultDataSchema>;
export type TagDeleteResponse = z.infer<typeof tagDeleteResponseSchema>;

// cover 为空串=无封面；置 coverAssetId 时服务端以资产 deliveryUrl 归一 cover
export const categorySaveInputSchema = z
  .object({
    name: nameSchema,
    cover: z.string().default(''),
    coverAssetId: positiveIntSchema.nullable().optional(),
  })
  .strict();

export type CategorySaveInput = z.infer<typeof categorySaveInputSchema>;

export const categoryResponseSchema = apiSuccessSchema(categoryAdminSchema);

export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

export const categoryDeleteResponseSchema = apiSuccessSchema(
  deleteResultDataSchema,
);

export type CategoryDeleteData = z.infer<typeof deleteResultDataSchema>;
export type CategoryDeleteResponse = z.infer<
  typeof categoryDeleteResponseSchema
>;

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
