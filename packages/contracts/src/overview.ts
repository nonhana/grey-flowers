import { z } from 'zod';

import { apiSuccessSchema } from './auth.js';

// ============ 概览（只读投影，管理端） ============

// —— 读数卡计数 ——

export const overviewCountsSchema = z
  .object({
    articles: z
      .object({
        published: z.number().int().min(0), // published = true
        drafts: z.number().int().min(0), // published = false
        wordTotal: z.number().int().min(0), // _sum.wordCount, published = true
      })
      .strict(),
    activities: z
      .object({
        total: z.number().int().min(0),
        last30d: z.number().int().min(0), // publishedAt >= now-30d
      })
      .strict(),
    comments: z
      .object({
        total: z.number().int().min(0),
        parents: z.number().int().min(0), // level = PARENT
        children: z.number().int().min(0), // level = CHILD
      })
      .strict(),
    users: z
      .object({
        total: z.number().int().min(0),
        joined30d: z.number().int().min(0), // createdAt >= now-30d
      })
      .strict(),
    assets: z
      .object({
        total: z.number().int().min(0), // status != 'DELETED'
        images: z.number().int().min(0),
        audio: z.number().int().min(0),
        pendingCleanup: z.number().int().min(0), // status = PENDING_CLEANUP
      })
      .strict(),
    music: z
      .object({
        total: z.number().int().min(0),
        missingMetadata: z.number().int().min(0), // artist='' OR album=''
        secondsTotal: z.number().int().min(0), // _sum.seconds
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
    count: z.number().int().min(0),
  })
  .strict();

export type OverviewPendingItem = z.infer<typeof overviewPendingItemSchema>;

// —— 内容构成：分类 / 标签排行 ——
// 条宽用 count / max(items) 表达排名，不给标签算「占比」：一篇文章可挂多个标签，
// sum(tag.articleCount) > 文章总数，任何以它为分母的百分比都是假的。

export const overviewRankItemSchema = z
  .object({
    name: z.string().min(1),
    count: z.number().int().min(0),
  })
  .strict();

export type OverviewRankItem = z.infer<typeof overviewRankItemSchema>;

export const overviewRankGroupSchema = z
  .object({
    /** 按 count 降序、同分按 name 升序的前 N 项 */
    items: z.array(overviewRankItemSchema),
    /** 该维度的全部项数，用于「其余 N 项」 */
    totalItems: z.number().int().min(0),
    /** 未进入 items 的项的计数之和 */
    restCount: z.number().int().min(0),
  })
  .strict();

export type OverviewRankGroup = z.infer<typeof overviewRankGroupSchema>;

export const overviewCompositionSchema = z
  .object({
    categories: overviewRankGroupSchema,
    tags: overviewRankGroupSchema,
    /** categoryId = null 的文章数——分类维度的「未分类」桶 */
    uncategorized: z.number().int().min(0),
  })
  .strict();

export type OverviewComposition = z.infer<typeof overviewCompositionSchema>;

// —— 存储构成：三段互斥，和为 status != DELETED 的总字节 ——
// byteSize 在库里是 BigInt；个人站的总量远在 2^53 以内，映射层收敛为 number。

export const overviewStorageSchema = z
  .object({
    /** status = AVAILABLE 且 mediaType = IMAGE */
    imageBytes: z.number().int().min(0),
    /** status = AVAILABLE 且 mediaType = AUDIO */
    audioBytes: z.number().int().min(0),
    /** status = PENDING_CLEANUP（横切状态，不再分媒体类型） */
    pendingBytes: z.number().int().min(0),
    /** 上面三段之和 */
    totalBytes: z.number().int().min(0),
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

// —— 趋势查询：metric/days 是查询串，经 z.enum 严格校验 ——

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
    count: z.number().int().min(0),
  })
  .strict();

export type OverviewTrendPoint = z.infer<typeof overviewTrendPointSchema>;

export const overviewTrendDataSchema = z
  .object({
    metric: overviewTrendMetricSchema,
    days: overviewTrendDaysSchema,
    /** 窗口内每一天一个点，未命中填 0；长度恒等于 days */
    points: z.array(overviewTrendPointSchema),
    /** 窗口内合计（调试/角标用） */
    total: z.number().int().min(0),
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
    articles: z.number().int().min(0),
    activities: z.number().int().min(0),
  })
  .strict();

export type OverviewCalendarDay = z.infer<typeof overviewCalendarDaySchema>;

export const overviewCalendarDataSchema = z
  .object({
    /** 窗口内每一天一个点，含零值；长度恒为 365，末项为今天 */
    days: z.array(overviewCalendarDaySchema),
    articlesTotal: z.number().int().min(0),
    activitiesTotal: z.number().int().min(0),
    /** 单日 (articles + activities) 的最大值，供前端分档与角标 */
    peak: z.number().int().min(0),
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
