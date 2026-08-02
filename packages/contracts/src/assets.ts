import { z } from 'zod';

import { apiSuccessSchema } from './auth.js';

export const assetPurposeSchema = z.enum([
  'ARTICLE_COVER',
  'ARTICLE_INLINE',
  'CATEGORY_COVER',
  'ACTIVITY_IMAGE',
  'MUSIC_SOURCE',
  'MUSIC_COVER',
]);

export type AssetPurpose = z.infer<typeof assetPurposeSchema>;

export const assetMediaTypeSchema = z.enum(['IMAGE', 'AUDIO']);

export type AssetMediaType = z.infer<typeof assetMediaTypeSchema>;

export const assetStatusSchema = z.enum([
  'AVAILABLE',
  'PENDING_CLEANUP',
  'DELETED',
]);

export type AssetStatus = z.infer<typeof assetStatusSchema>;

const assetSize = z.number().int().min(0);
const dimensions = z.number().int().positive().optional();

export const assetDtoSchema = z
  .object({
    id: z.number().int().positive(),
    purpose: assetPurposeSchema,
    mediaType: assetMediaTypeSchema,
    status: assetStatusSchema,
    mimeType: z.string().min(1),
    byteSize: assetSize,
    width: dimensions,
    height: dimensions,
    durationMs: z.number().int().positive().optional(),
    storageKey: z.string().min(1),
    deliveryUrl: z.url(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export type AssetDto = z.infer<typeof assetDtoSchema>;

export const assetReferenceCountsSchema = z
  .object({
    articleCovers: assetSize,
    articleInlineAssets: assetSize,
    categoryCovers: assetSize,
    musicSources: assetSize,
    musicCovers: assetSize,
    activityImages: assetSize,
    total: assetSize,
  })
  .strict();

export type AssetReferenceCounts = z.infer<typeof assetReferenceCountsSchema>;

export const assetListQuerySchema = z
  .object({
    mediaType: assetMediaTypeSchema.optional(),
    purpose: assetPurposeSchema.optional(),
    status: assetStatusSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type AssetListQuery = z.infer<typeof assetListQuerySchema>;

export const assetListDataSchema = z
  .object({
    items: z.array(assetDtoSchema),
    total: assetSize,
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
  })
  .strict();

export const assetListResponseSchema = apiSuccessSchema(assetListDataSchema);

export type AssetListData = z.infer<typeof assetListDataSchema>;
export type AssetListResponse = z.infer<typeof assetListResponseSchema>;

export const assetDetailDataSchema = z
  .object({
    asset: assetDtoSchema,
    references: assetReferenceCountsSchema,
  })
  .strict();

export const assetDetailResponseSchema = apiSuccessSchema(
  assetDetailDataSchema,
);

export type AssetDetailData = z.infer<typeof assetDetailDataSchema>;
export type AssetDetailResponse = z.infer<typeof assetDetailResponseSchema>;

export const assetUploadResponseSchema = apiSuccessSchema(assetDtoSchema);

export type AssetUploadData = z.infer<typeof assetUploadResponseSchema>;
export type AssetUploadResponse = z.infer<typeof assetUploadResponseSchema>;

export const assetSetStatusInputSchema = z
  .object({
    status: z.enum(['PENDING_CLEANUP', 'AVAILABLE']),
  })
  .strict();

export type AssetSetStatusInput = z.infer<typeof assetSetStatusInputSchema>;

export const assetSetStatusResponseSchema = apiSuccessSchema(assetDtoSchema);

export type AssetSetStatusData = z.infer<typeof assetSetStatusResponseSchema>;
export type AssetSetStatusResponse = z.infer<
  typeof assetSetStatusResponseSchema
>;

export const assetDeleteResponseSchema = apiSuccessSchema(assetDtoSchema);

export type AssetDeleteData = z.infer<typeof assetDeleteResponseSchema>;
export type AssetDeleteResponse = z.infer<typeof assetDeleteResponseSchema>;
