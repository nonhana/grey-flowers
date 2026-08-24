import { z } from 'zod';

import {
  apiSuccessSchema,
  nonNegativeIntSchema,
  positiveIntSchema,
} from './common.js';
import { musicTrackSchema } from './music.js';

export const activityImageItemSchema = z
  .union([
    z.object({ assetId: positiveIntSchema }).strict(),
    z.object({ url: z.url() }).strict(),
  ])
  .describe('受管资产或外部 URL，条目顺序即展示顺序');

export type ActivityImageItem = z.infer<typeof activityImageItemSchema>;

export const activityCreateInputSchema = z
  .object({
    content: z.string().max(8192, '动态内容不能超过 8192 个字符').default(''),
    images: z.array(activityImageItemSchema).max(9, '最多 9 张图片').optional(),
    musicIds: z.array(positiveIntSchema).max(12, '最多 12 首音乐').optional(),
  })
  .strict();

export type ActivityCreateInput = z.infer<typeof activityCreateInputSchema>;

export const activityUpdateInputSchema = z
  .object({
    content: z.string().max(8192, '动态内容不能超过 8192 个字符').optional(),
    images: z.array(activityImageItemSchema).max(9, '最多 9 张图片').optional(),
    musicIds: z.array(positiveIntSchema).max(12, '最多 12 首音乐').optional(),
  })
  .strict();

export type ActivityUpdateInput = z.infer<typeof activityUpdateInputSchema>;

export const activityImageOutputSchema = z
  .object({
    assetId: positiveIntSchema.nullable(),
    url: z.url(),
  })
  .strict();

export type ActivityImageOutput = z.infer<typeof activityImageOutputSchema>;

export const activityAdminSchema = z
  .object({
    id: positiveIntSchema,
    content: z.string(),
    images: z.array(activityImageOutputSchema),
    /** 顺序 = music.id asc */
    music: z.array(musicTrackSchema),
    publishedAt: z.iso.datetime(),
    editedAt: z.iso.datetime(),
  })
  .strict();

export type ActivityAdmin = z.infer<typeof activityAdminSchema>;

export const activityListQuerySchema = z
  .object({
    /** 匹配 content（insensitive） */
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;

export const activityListDataSchema = z
  .object({
    items: z.array(activityAdminSchema),
    total: nonNegativeIntSchema,
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
  })
  .strict();

export const activityListResponseSchema = apiSuccessSchema(
  activityListDataSchema,
);

export type ActivityListData = z.infer<typeof activityListDataSchema>;
export type ActivityListResponse = z.infer<typeof activityListResponseSchema>;

export const activityAdminResponseSchema =
  apiSuccessSchema(activityAdminSchema);

export type ActivityAdminData = z.infer<typeof activityAdminSchema>;
export type ActivityAdminResponse = z.infer<typeof activityAdminResponseSchema>;

export const activityPublicSchema = z
  .object({
    id: positiveIntSchema,
    content: z.string(),
    contentMarkdown: z.any().nullable(),
    images: z.array(z.url()),
    music: z.array(musicTrackSchema),
    commentCount: nonNegativeIntSchema,
    publishedAt: z.iso.datetime(),
    editedAt: z.iso.datetime(),
  })
  .strict();

export type ActivityPublic = z.infer<typeof activityPublicSchema>;

export const activityPublicListDataSchema = z
  .object({
    items: z.array(activityPublicSchema),
    total: nonNegativeIntSchema,
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
  })
  .strict();

export const activityPublicListResponseSchema = apiSuccessSchema(
  activityPublicListDataSchema,
);

export type ActivityPublicListData = z.infer<
  typeof activityPublicListDataSchema
>;
export type ActivityPublicListResponse = z.infer<
  typeof activityPublicListResponseSchema
>;

export const activityPublicResponseSchema =
  apiSuccessSchema(activityPublicSchema);

export type ActivityPublicData = z.infer<typeof activityPublicSchema>;
export type ActivityPublicResponse = z.infer<
  typeof activityPublicResponseSchema
>;
