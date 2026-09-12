import { z } from 'zod';

import {
  apiSuccessSchema,
  nonNegativeIntSchema,
  positiveIntSchema,
} from './common';

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

/** 上传约束 SSOT：presign/confirm（服务端）与选入预检（admin 客户端）共用本表。 */
export const ASSET_IMAGE_MIME_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ASSET_AUDIO_MIME_TYPES = [
  'audio/aac',
  'audio/flac',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
] as const;

export const ASSET_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const ASSET_AUDIO_MAX_BYTES = 150 * 1024 * 1024;

export interface AssetUploadProfile {
  maxBytes: number;
  mediaType: AssetMediaType;
  mimeTypes: readonly string[];
}

export const assetUploadProfiles: Record<AssetPurpose, AssetUploadProfile> = {
  ACTIVITY_IMAGE: {
    maxBytes: ASSET_IMAGE_MAX_BYTES,
    mediaType: 'IMAGE',
    mimeTypes: ASSET_IMAGE_MIME_TYPES,
  },
  ARTICLE_COVER: {
    maxBytes: ASSET_IMAGE_MAX_BYTES,
    mediaType: 'IMAGE',
    mimeTypes: ASSET_IMAGE_MIME_TYPES,
  },
  ARTICLE_INLINE: {
    maxBytes: ASSET_IMAGE_MAX_BYTES,
    mediaType: 'IMAGE',
    mimeTypes: ASSET_IMAGE_MIME_TYPES,
  },
  CATEGORY_COVER: {
    maxBytes: ASSET_IMAGE_MAX_BYTES,
    mediaType: 'IMAGE',
    mimeTypes: ASSET_IMAGE_MIME_TYPES,
  },
  MUSIC_COVER: {
    maxBytes: ASSET_IMAGE_MAX_BYTES,
    mediaType: 'IMAGE',
    mimeTypes: ASSET_IMAGE_MIME_TYPES,
  },
  MUSIC_SOURCE: {
    maxBytes: ASSET_AUDIO_MAX_BYTES,
    mediaType: 'AUDIO',
    mimeTypes: ASSET_AUDIO_MIME_TYPES,
  },
};

const assetSize = nonNegativeIntSchema;
const dimensions = positiveIntSchema.optional();

export const assetDtoSchema = z
  .object({
    id: positiveIntSchema,
    purpose: assetPurposeSchema,
    mediaType: assetMediaTypeSchema,
    status: assetStatusSchema,
    mimeType: z.string().min(1),
    byteSize: assetSize,
    width: dimensions,
    height: dimensions,
    durationMs: positiveIntSchema.optional(),
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

/** 直传第一步：向服务端申请受管 key + R2 presigned PUT URL。 */
export const assetUploadUrlInputSchema = z
  .object({
    purpose: assetPurposeSchema,
    /** 声明 MIME（normalize 后必须命中 purpose 白名单）。 */
    contentType: z.string().trim().min(1).max(100),
    /** 声明大小（字节）；可选，presign 阶段预检，confirm 阶段以对象实际大小为准。 */
    size: positiveIntSchema.optional(),
  })
  .strict();

export type AssetUploadUrlInput = z.infer<typeof assetUploadUrlInputSchema>;

export const assetUploadUrlDataSchema = z
  .object({
    uploadUrl: z.url(),
    /** 受管 storage key；confirm 阶段原样回传。 */
    key: z.string().min(1),
    maxBytes: positiveIntSchema,
  })
  .strict();

export const assetUploadUrlResponseSchema = apiSuccessSchema(
  assetUploadUrlDataSchema,
);

export type AssetUploadUrlData = z.infer<typeof assetUploadUrlDataSchema>;
export type AssetUploadUrlResponse = z.infer<
  typeof assetUploadUrlResponseSchema
>;

/** 直传第三步：PUT 完成后回执，服务端 HEAD 校验对象后落库。 */
export const assetConfirmInputSchema = z
  .object({
    key: z.string().min(1).max(500),
    /** 实际大小（字节）；必须与对象 ContentLength 一致。 */
    size: positiveIntSchema,
    /** 音频时长（ms），由前端解析后上报。 */
    durationMs: positiveIntSchema.optional(),
    width: positiveIntSchema.max(16384).optional(),
    height: positiveIntSchema.max(16384).optional(),
  })
  .strict();

export type AssetConfirmInput = z.infer<typeof assetConfirmInputSchema>;

export const assetConfirmResponseSchema = apiSuccessSchema(assetDtoSchema);

export type AssetConfirmData = z.infer<typeof assetDtoSchema>;
export type AssetConfirmResponse = z.infer<typeof assetConfirmResponseSchema>;

export const assetSetStatusInputSchema = z
  .object({
    status: z.enum(['PENDING_CLEANUP', 'AVAILABLE']),
  })
  .strict();

export type AssetSetStatusInput = z.infer<typeof assetSetStatusInputSchema>;

export const assetSetStatusResponseSchema = apiSuccessSchema(assetDtoSchema);

export type AssetSetStatusData = z.infer<typeof assetDtoSchema>;
export type AssetSetStatusResponse = z.infer<
  typeof assetSetStatusResponseSchema
>;

export const assetDeleteResponseSchema = apiSuccessSchema(assetDtoSchema);

export type AssetDeleteData = z.infer<typeof assetDtoSchema>;

export type AssetDeleteResponse = z.infer<typeof assetDeleteResponseSchema>;
