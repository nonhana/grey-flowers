import { z } from 'zod';

import { apiSuccessSchema, nonNegativeIntSchema } from './common';

export const overviewCountsSchema = z
  .object({
    articles: z
      .object({
        published: nonNegativeIntSchema,
        drafts: nonNegativeIntSchema,
        wordTotal: nonNegativeIntSchema,
      })
      .strict(),
    activities: z
      .object({
        total: nonNegativeIntSchema,
        last30d: nonNegativeIntSchema,
      })
      .strict(),
    comments: z
      .object({
        total: nonNegativeIntSchema,
        parents: nonNegativeIntSchema,
        children: nonNegativeIntSchema,
      })
      .strict(),
    users: z
      .object({
        total: nonNegativeIntSchema,
        joined30d: nonNegativeIntSchema,
      })
      .strict(),
    assets: z
      .object({
        total: nonNegativeIntSchema, // status != 'DELETED'
        images: nonNegativeIntSchema,
        audio: nonNegativeIntSchema,
        pendingCleanup: nonNegativeIntSchema,
      })
      .strict(),
    music: z
      .object({
        total: nonNegativeIntSchema,
        missingMetadata: nonNegativeIntSchema, // artist='' OR album=''
        secondsTotal: nonNegativeIntSchema,
      })
      .strict(),
  })
  .strict();

export type OverviewCounts = z.infer<typeof overviewCountsSchema>;

// —— 待处理条目：key 是契约，label/深链映射在 Admin 展示层 ——

export const overviewPendingKeySchema = z.enum([
  'draft_articles',
  'pending_cleanup_assets',
  'incomplete_music',
]);

export type OverviewPendingKey = z.infer<typeof overviewPendingKeySchema>;

export const overviewPendingItemSchema = z
  .object({
    key: overviewPendingKeySchema,
    count: nonNegativeIntSchema,
  })
  .strict();

export type OverviewPendingItem = z.infer<typeof overviewPendingItemSchema>;

// 排行不设百分比：sum(tag.articleCount) > 文章总数，任何占比都没有分母意义
export const overviewRankItemSchema = z
  .object({
    name: z.string().min(1),
    count: nonNegativeIntSchema,
  })
  .strict();

export type OverviewRankItem = z.infer<typeof overviewRankItemSchema>;

export const overviewRankGroupSchema = z
  .object({
    items: z.array(overviewRankItemSchema),
    /** 维度全部项数，用于「其余 N 项」 */
    totalItems: nonNegativeIntSchema,
    restCount: nonNegativeIntSchema,
  })
  .strict();

export type OverviewRankGroup = z.infer<typeof overviewRankGroupSchema>;

export const overviewCompositionSchema = z
  .object({
    categories: overviewRankGroupSchema,
    tags: overviewRankGroupSchema,
    /** categoryId = null 的文章数——分类维度的「未分类」桶 */
    uncategorized: nonNegativeIntSchema,
  })
  .strict();

export type OverviewComposition = z.infer<typeof overviewCompositionSchema>;

// 存储构成：三段互斥，和为 status != DELETED 的总字节。
// byteSize 在库里是 BigInt；个人站总量远在 2^53 以内，映射层收敛为 number。
export const overviewStorageSchema = z
  .object({
    imageBytes: nonNegativeIntSchema,
    audioBytes: nonNegativeIntSchema,
    pendingBytes: nonNegativeIntSchema,
    totalBytes: nonNegativeIntSchema,
  })
  .strict();

export type OverviewStorage = z.infer<typeof overviewStorageSchema>;

export const overviewDataSchema = z
  .object({
    counts: overviewCountsSchema,
    composition: overviewCompositionSchema,
    storage: overviewStorageSchema,
    pending: z.array(overviewPendingItemSchema),
  })
  .strict();

export type OverviewData = z.infer<typeof overviewDataSchema>;
export const overviewResponseSchema = apiSuccessSchema(overviewDataSchema);
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;

export const overviewTrendMetricSchema = z.enum([
  'articles',
  'comments',
  'activities',
  'users',
]);

export type OverviewTrendMetric = z.infer<typeof overviewTrendMetricSchema>;

export const overviewTrendDaysSchema = z.enum(['7', '14', '30']);

export type OverviewTrendDays = z.infer<typeof overviewTrendDaysSchema>;

export const overviewTrendQuerySchema = z
  .object({
    metric: overviewTrendMetricSchema.default('articles'),
    days: overviewTrendDaysSchema.default('14'),
  })
  .strict();

export type OverviewTrendQuery = z.infer<typeof overviewTrendQuerySchema>;

// 逐日点：date 为服务端本地日 'YYYY-MM-DD'；含零值，前端直绘。
export const overviewTrendPointSchema = z
  .object({
    date: z.string(),
    count: nonNegativeIntSchema,
  })
  .strict();

export type OverviewTrendPoint = z.infer<typeof overviewTrendPointSchema>;

export const overviewTrendDataSchema = z
  .object({
    metric: overviewTrendMetricSchema,
    days: overviewTrendDaysSchema,
    /** 窗口内每一天一个点，未命中填 0；长度恒等于 days */
    points: z.array(overviewTrendPointSchema),
    total: nonNegativeIntSchema,
  })
  .strict();

export type OverviewTrendData = z.infer<typeof overviewTrendDataSchema>;
export const overviewTrendResponseSchema = apiSuccessSchema(
  overviewTrendDataSchema,
);
export type OverviewTrendResponse = z.infer<typeof overviewTrendResponseSchema>;

// —— 发布节奏：近 365 天逐日发布量（日历热力） ——
// 窗口不做周对齐：周起始是本地化/呈现层的事，服务端只交付连续的日序列，
// 由前端按 locale 补齐首尾残周的占位格。窗口固定，无查询参数。

export const overviewCalendarDaySchema = z
  .object({
    /** 服务端本地日 'YYYY-MM-DD' */
    date: z.string(),
    /** published = true 的文章；草稿的 publishedAt 是建档时间，不算发布 */
    articles: nonNegativeIntSchema,
    activities: nonNegativeIntSchema,
  })
  .strict();

export type OverviewCalendarDay = z.infer<typeof overviewCalendarDaySchema>;

export const overviewCalendarDataSchema = z
  .object({
    /** 窗口内每一天一个点，含零值；长度恒为 365，末项为今天 */
    days: z.array(overviewCalendarDaySchema),
    articlesTotal: nonNegativeIntSchema,
    activitiesTotal: nonNegativeIntSchema,
    /** 单日 (articles + activities) 的最大值，供前端分档与角标 */
    peak: nonNegativeIntSchema,
  })
  .strict();

export type OverviewCalendarData = z.infer<typeof overviewCalendarDataSchema>;
export const overviewCalendarResponseSchema = apiSuccessSchema(
  overviewCalendarDataSchema,
);
export type OverviewCalendarResponse = z.infer<
  typeof overviewCalendarResponseSchema
>;

/** 日历窗口天数。服务端与前端共用一个数字，避免两边各写一个 365。 */
export const OVERVIEW_CALENDAR_DAYS = 365;
