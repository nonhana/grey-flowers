import { z } from 'zod';

import {
  apiSuccessSchema,
  nonNegativeIntSchema,
  positiveIntSchema,
} from './common.js';

export const articleCardSchema = z
  .object({
    id: positiveIntSchema,
    to: z.string().min(1),
    title: z.string().min(1),
    description: z.string().nullable(),
    cover: z.string(),
    publishedAt: z.iso.datetime(),
    editedAt: z.iso.datetime(),
    wordCount: nonNegativeIntSchema,
    tags: z.array(z.string().min(1)),
    category: z.string().nullable(),
  })
  .strict();

export type ArticleCard = z.infer<typeof articleCardSchema>;

/** 公开详情：卡片字段 + alt + 原始 MDC + published */
export const articleDetailSchema = articleCardSchema
  .extend({
    alt: z.string(),
    content: z.string(),
    published: z.boolean(),
  })
  .strict();

export type ArticleDetail = z.infer<typeof articleDetailSchema>;

export const articleSearchItemSchema = z
  .object({
    to: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    category: z.string(),
    tags: z.array(z.string().min(1)),
    publishedAt: z.iso.datetime(),
    snippet: z.string(),
    score: z.number(),
  })
  .strict();

export type ArticleSearchItem = z.infer<typeof articleSearchItemSchema>;

export const neighborSchema = z
  .object({
    to: z.string().min(1),
    title: z.string().min(1),
  })
  .strict();

export type Neighbor = z.infer<typeof neighborSchema>;

/** [prev, next] 对；主站再映射为 { title, path } */
export const neighborsSchema = z.tuple([
  neighborSchema.nullable(),
  neighborSchema.nullable(),
]);

export type Neighbors = z.infer<typeof neighborsSchema>;

/** 发布文章 { 年: 月份[] } 映射（月份为 "MM"） */
export const articleDatesSchema = z.record(z.string(), z.array(z.string()));

export type ArticleDates = z.infer<typeof articleDatesSchema>;

const pageQuery = z.coerce.number().int().min(1).default(1);
const publicPageSizeQuery = z.coerce.number().int().min(1).max(50).default(6);

export const articleListQuerySchema = z
  .object({
    tag: z.string().min(1).max(50).optional(),
    category: z.string().min(1).max(50).optional(),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, { message: '月份须为 YYYY-MM 格式' })
      .optional(),
    page: pageQuery,
    pageSize: publicPageSizeQuery,
  })
  .strict();

export type ArticleListQuery = z.infer<typeof articleListQuerySchema>;

export const articleFilterQuerySchema = z
  .object({
    tag: z.string().min(1).max(50).optional(),
    category: z.string().min(1).max(50).optional(),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, { message: '月份须为 YYYY-MM 格式' })
      .optional(),
  })
  .strict();

export type ArticleFilterQuery = z.infer<typeof articleFilterQuerySchema>;

export const articleDetailQuerySchema = z
  .object({
    path: z.string().min(1).max(200),
  })
  .strict();

export type ArticleDetailQuery = z.infer<typeof articleDetailQuerySchema>;

export const articleNeighborsQuerySchema = z
  .object({
    path: z.string().min(1).max(200),
  })
  .strict();

export type ArticleNeighborsQuery = z.infer<typeof articleNeighborsQuerySchema>;

export const articleSearchQuerySchema = z
  .object({
    q: z.string().max(200).default(''),
    limit: z.coerce.number().int().min(1).max(10).default(8),
  })
  .strict();

export type ArticleSearchQuery = z.infer<typeof articleSearchQuerySchema>;

export const articlePreviewQuerySchema = z
  .object({
    path: z.string().min(1).max(200),
    token: z.string().min(1).max(512),
  })
  .strict();

export type ArticlePreviewQuery = z.infer<typeof articlePreviewQuerySchema>;

export const articleAdminSchema = z
  .object({
    id: positiveIntSchema,
    to: z.string().min(1),
    title: z.string().min(1),
    description: z.string().nullable(),
    cover: z.string(),
    coverAssetId: positiveIntSchema.nullable(),
    alt: z.string(),
    categoryId: positiveIntSchema.nullable(),
    category: z.string().nullable(),
    tags: z.array(z.string().min(1)),
    published: z.boolean(),
    publishedAt: z.iso.datetime(),
    editedAt: z.iso.datetime(),
    wordCount: nonNegativeIntSchema,
    revision: nonNegativeIntSchema,
    content: z.string(),
    inlineAssetIds: z.array(positiveIntSchema),
  })
  .strict();

export type ArticleAdmin = z.infer<typeof articleAdminSchema>;

export const articleListAdminSchema = z
  .object({
    id: positiveIntSchema,
    to: z.string().min(1),
    title: z.string().min(1),
    description: z.string().nullable(),
    cover: z.string(),
    coverAssetId: positiveIntSchema.nullable(),
    alt: z.string(),
    categoryId: positiveIntSchema.nullable(),
    category: z.string().nullable(),
    tags: z.array(z.string().min(1)),
    published: z.boolean(),
    publishedAt: z.iso.datetime(),
    editedAt: z.iso.datetime(),
    wordCount: nonNegativeIntSchema,
    revision: nonNegativeIntSchema,
  })
  .strict();

export type ArticleListAdmin = z.infer<typeof articleListAdminSchema>;

const slugSchema = z
  .string()
  .trim()
  .regex(
    /^\/*[a-z0-9]+(?:-[a-z0-9]+)*$|^\/articles\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
    {
      message: '固定链接只能包含小写字母、数字和连字符',
    },
  )
  .max(200);

export const articleCreateInputSchema = z
  .object({
    title: z.string().trim().min(1, { message: '标题不能为空' }),
    slug: slugSchema.optional(),
    description: z.string().max(500).optional(),
    cover: z.string().max(1000).optional(),
    coverAssetId: positiveIntSchema.nullable().optional(),
    alt: z.string().max(200).optional(),
    categoryId: positiveIntSchema.nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    content: z.string().optional(),
    published: z.boolean().optional(),
  })
  .strict();

export type ArticleCreateInput = z.infer<typeof articleCreateInputSchema>;

export const articleSaveInputSchema = z
  .object({
    expectedRevision: nonNegativeIntSchema,
    title: z.string().trim().min(1, { message: '标题不能为空' }),
    description: z.string().max(500).nullable().optional(),
    cover: z.string().max(1000).optional(),
    coverAssetId: positiveIntSchema.nullable().optional(),
    alt: z.string().max(200).optional(),
    categoryId: positiveIntSchema.nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    content: z.string().optional(),
    publishedAt: z.iso.datetime().optional(),
    /** 应用本次保存后，向 ArticleSnapshot 写一行的新状态（恢复版本 / 手动版本） */
    createSnapshot: z.boolean().optional(),
    /** 冲突“保留我的”覆盖前，先落一张当前服务端状态快照 */
    preserveServerSnapshot: z.boolean().optional(),
  })
  .strict();

export type ArticleSaveInput = z.infer<typeof articleSaveInputSchema>;

export const articleListAdminQuerySchema = z
  .object({
    status: z.enum(['published', 'draft', 'all']).default('all'),
    q: z.string().max(200).optional(),
    page: pageQuery,
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type ArticleListAdminQuery = z.infer<typeof articleListAdminQuerySchema>;

export const articleListAdminDataSchema = z
  .object({
    items: z.array(articleListAdminSchema),
    total: nonNegativeIntSchema,
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(50),
  })
  .strict();

export const articleListAdminResponseSchema = apiSuccessSchema(
  articleListAdminDataSchema,
);

export type ArticleListAdminData = z.infer<typeof articleListAdminDataSchema>;
export type ArticleListAdminResponse = z.infer<
  typeof articleListAdminResponseSchema
>;

export const articleListDataSchema = z
  .object({
    items: z.array(articleCardSchema),
    total: nonNegativeIntSchema,
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(50),
  })
  .strict();

export const articleListResponseSchema = apiSuccessSchema(
  articleListDataSchema,
);

export type ArticleListData = z.infer<typeof articleListDataSchema>;
export type ArticleListResponse = z.infer<typeof articleListResponseSchema>;

export const articleDetailResponseSchema =
  apiSuccessSchema(articleDetailSchema);

export type ArticleDetailResponse = z.infer<typeof articleDetailResponseSchema>;

export const articleCountDataSchema = z
  .object({ count: nonNegativeIntSchema })
  .strict();

export const articleCountResponseSchema = apiSuccessSchema(
  articleCountDataSchema,
);

export type ArticleCountData = z.infer<typeof articleCountDataSchema>;
export type ArticleCountResponse = z.infer<typeof articleCountResponseSchema>;

export const articleSearchListDataSchema = z
  .object({
    items: z.array(articleSearchItemSchema),
  })
  .strict();

export const articleSearchResponseSchema = apiSuccessSchema(
  articleSearchListDataSchema,
);

export type ArticleSearchListData = z.infer<typeof articleSearchListDataSchema>;
export type ArticleSearchResponse = z.infer<typeof articleSearchResponseSchema>;

export const articleNeighborsResponseSchema = apiSuccessSchema(neighborsSchema);

export type ArticleNeighborsResponse = z.infer<
  typeof articleNeighborsResponseSchema
>;

export const articleDatesResponseSchema = apiSuccessSchema(articleDatesSchema);

export type ArticleDatesResponse = z.infer<typeof articleDatesResponseSchema>;

export const articleAdminResponseSchema = apiSuccessSchema(articleAdminSchema);

export type ArticleAdminResponse = z.infer<typeof articleAdminResponseSchema>;

/** 无 body 操作（publish / unpublish / delete / preview-token） */
export const articleNoBodyInputSchema = z.undefined();

export type ArticleNoBodyInput = z.infer<typeof articleNoBodyInputSchema>;

export const articleSnapshotSchema = z
  .object({
    id: positiveIntSchema,
    revision: nonNegativeIntSchema,
    title: z.string().min(1),
    description: z.string().nullable(),
    content: z.string(),
    wordCount: nonNegativeIntSchema,
    createdAt: z.iso.datetime(),
  })
  .strict();

export type ArticleSnapshot = z.infer<typeof articleSnapshotSchema>;

export const articleSnapshotListDataSchema = z
  .object({
    items: z.array(articleSnapshotSchema),
  })
  .strict();

export const articleSnapshotListResponseSchema = apiSuccessSchema(
  articleSnapshotListDataSchema,
);

export type ArticleSnapshotListData = z.infer<
  typeof articleSnapshotListDataSchema
>;
export type ArticleSnapshotListResponse = z.infer<
  typeof articleSnapshotListResponseSchema
>;

export const previewTokenDataSchema = z
  .object({
    token: z.string().min(1),
    expiresIn: positiveIntSchema,
  })
  .strict();

export const previewTokenResponseSchema = apiSuccessSchema(
  previewTokenDataSchema,
);

export type PreviewTokenData = z.infer<typeof previewTokenDataSchema>;
export type PreviewTokenResponse = z.infer<typeof previewTokenResponseSchema>;
