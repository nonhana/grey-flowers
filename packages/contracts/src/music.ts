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
    /** 被多少条动态引用（多对多 ActivityMusic）。 */
    activityCount: z.number().int().min(0),
    createdAt: z.iso.datetime(),
    /** activityCount > 0 的派生。 */
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
    /** 管理端：仅返回 artist='' OR album='' 的曲目（缺元数据）；公开读忽略。 */
    incomplete: z.enum(['true']).optional(),
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

// ============ 创建/更新 —— seconds 由前端解析后上报（解析唯一一次，发生在客户端） ============

export const musicCreateInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    artist: z.string().trim().max(200).optional(),
    album: z.string().trim().max(200).optional(),
    /** 时长（秒），前端 music-metadata 解析结果；0 表示未知。 */
    seconds: z.number().int().min(0).max(86_400),
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
