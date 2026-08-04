import { z } from 'zod';

import { apiSuccessSchema } from './auth.js';

const musicTotal = z.number().int().min(0);
const musicPage = z.number().int().min(1);
const musicPageSize = z.number().int().min(1).max(100);

// ============ 公开读 DTO —— 与主站 `Track`（activity.d.ts）一字不差 ============

export const musicTrackSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string().min(1),
    artist: z.string(),
    album: z.string(),
    src: z.url(),
    seconds: z.number().int().min(0),
    cover: z.url(),
  })
  .strict();

export type MusicTrack = z.infer<typeof musicTrackSchema>;

// ============ 资产摘要 —— 供 Admin 跳资产详情 ============

export const musicAssetSummarySchema = z
  .object({
    id: z.number().int().positive(),
    storageKey: z.string().min(1),
    deliveryUrl: z.url(),
  })
  .strict();

export type MusicAssetSummary = z.infer<typeof musicAssetSummarySchema>;

// ============ 管理 DTO ============

export const musicAdminSchema = musicTrackSchema
  .extend({
    sourceAssetId: z.number().int().positive().nullable(),
    coverAssetId: z.number().int().positive().nullable(),
    /** 只读；关联 UI 在切片 4。 */
    activityId: z.number().int().positive().nullable(),
    createdAt: z.iso.datetime(),
    /** activityId 非空的派生。 */
    inActivity: z.boolean(),
    sourceAsset: musicAssetSummarySchema.nullable(),
    coverAsset: musicAssetSummarySchema.nullable(),
  })
  .strict();

export type MusicAdmin = z.infer<typeof musicAdminSchema>;

export const musicListQuerySchema = z
  .object({
    /** 匹配 title/artist/album，不区分大小写。 */
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type MusicListQuery = z.infer<typeof musicListQuerySchema>;

export const musicListDataSchema = z
  .object({
    items: z.array(musicAdminSchema),
    total: musicTotal,
    page: musicPage,
    pageSize: musicPageSize,
  })
  .strict();

export const musicListResponseSchema = apiSuccessSchema(musicListDataSchema);

export type MusicListData = z.infer<typeof musicListDataSchema>;
export type MusicListResponse = z.infer<typeof musicListResponseSchema>;

export const musicAdminResponseSchema = apiSuccessSchema(musicAdminSchema);

export type MusicAdminData = z.infer<typeof musicAdminSchema>;
export type MusicAdminResponse = z.infer<typeof musicAdminResponseSchema>;

// ============ 创建/更新 —— seconds 不在输入内（服务端权威） ============

export const musicCreateInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    artist: z.string().trim().max(200).optional(),
    album: z.string().trim().max(200).optional(),
    /** 受管音源（MUSIC_SOURCE），必填。 */
    sourceAssetId: z.number().int().positive(),
    /** 受管封面（MUSIC_COVER）。 */
    coverAssetId: z.number().int().positive().optional(),
    /** 外部封面 URL；与 coverAssetId 互斥归一。 */
    cover: z.url().optional(),
  })
  .strict();

export type MusicCreateInput = z.infer<typeof musicCreateInputSchema>;

export const musicUpdateInputSchema = musicCreateInputSchema.partial();

export type MusicUpdateInput = z.infer<typeof musicUpdateInputSchema>;

// ============ 解析端点 ============

export const musicParseInputSchema = z
  .object({
    sourceAssetId: z.number().int().positive(),
  })
  .strict();

export type MusicParseInput = z.infer<typeof musicParseInputSchema>;

export const musicParseDataSchema = z
  .object({
    title: z.string().min(1),
    artist: z.string(),
    album: z.string(),
    seconds: z.number().int().min(0),
    src: z.url(),
    sourceAssetId: z.number().int().positive(),
    cover: z.url().nullable(),
    coverAssetId: z.number().int().positive().nullable(),
  })
  .strict();

export type MusicParseData = z.infer<typeof musicParseDataSchema>;

export const musicParseResponseSchema = apiSuccessSchema(musicParseDataSchema);

export type MusicParseResponse = z.infer<typeof musicParseResponseSchema>;

// ============ 公开读 —— 同 Track 形状 ============

export const musicPublicListDataSchema = z
  .object({
    items: z.array(musicTrackSchema),
    total: musicTotal,
    page: musicPage,
    pageSize: musicPageSize,
  })
  .strict();

export const musicPublicListResponseSchema = apiSuccessSchema(
  musicPublicListDataSchema,
);

export type MusicPublicListData = z.infer<typeof musicPublicListDataSchema>;
export type MusicPublicListResponse = z.infer<
  typeof musicPublicListResponseSchema
>;

export const musicPublicDetailResponseSchema =
  apiSuccessSchema(musicTrackSchema);

export type MusicPublicDetailResponse = z.infer<
  typeof musicPublicDetailResponseSchema
>;
