import type {
  OverviewCalendarData,
  OverviewCalendarDay,
  OverviewComposition,
  OverviewData,
  OverviewRankGroup,
  OverviewStorage,
  OverviewTrendData,
  OverviewTrendDays,
  OverviewTrendMetric,
  OverviewTrendPoint,
} from '@grey-flowers/contracts';

import { OVERVIEW_CALENDAR_DAYS } from '@grey-flowers/contracts';

// ==================== 概览（只读投影，管理端） ====================
// 口径集中在 service 的只读查询，这里只做「原始计数 → DTO」的纯映射；
// 注释标明来源字段（见 wiki/plans/2026-08-07-overview-slice.md §四）。

/** 排行取前 N：分类通常个位数，标签是长尾，故给标签多一格。
    再多就把「内容构成」这张卡撑得比旁边的趋势图高出一大截。 */
export const RANK_TAKE = { categories: 5, tags: 6 } as const;

interface RankRow {
  name: string;
  articleCount: number;
}

/**
 * 排行组：前 N 项 + 「其余」的两个数。
 * restCount 由 (全量之和 - 前 N 之和) 得出，而不是再查一次尾部——
 * 尾部可能有几百个标签，为了一个数把它们全拉回来不划算。
 */
const toRankGroup = (
  rows: RankRow[],
  totalItems: number,
  countSum: number,
): OverviewRankGroup => {
  const items = rows.map((row) => ({
    count: row.articleCount,
    name: row.name,
  }));
  const shown = items.reduce((sum, item) => sum + item.count, 0);
  return {
    items,
    restCount: Math.max(0, countSum - shown),
    totalItems,
  };
};

interface CompositionInput {
  categoryRows: RankRow[];
  categoryCountSum: number;
  categoryTotalItems: number;
  tagRows: RankRow[];
  tagCountSum: number;
  tagTotalItems: number;
  uncategorized: number;
}

export const toOverviewComposition = (
  input: CompositionInput,
): OverviewComposition => ({
  // Category.articleCount / Tag.articleCount 都是物化列，由 taxonomy 事务维护，
  // 口径是「全部文章」（含草稿），不是已发布 —— 展示层需如实标注。
  categories: toRankGroup(
    input.categoryRows,
    input.categoryTotalItems,
    input.categoryCountSum,
  ),
  tags: toRankGroup(input.tagRows, input.tagTotalItems, input.tagCountSum),
  uncategorized: input.uncategorized,
});

interface StorageInput {
  /** _sum.byteSize where status = AVAILABLE，按 mediaType 分组 */
  availableImage: bigint | null;
  availableAudio: bigint | null;
  /** _sum.byteSize where status = PENDING_CLEANUP */
  pending: bigint | null;
}

/** BigInt → number。个人站总量远在 Number.MAX_SAFE_INTEGER（~9 PB）以内。 */
const bytes = (value: bigint | null) => Number(value ?? 0n);

export const toOverviewStorage = (input: StorageInput): OverviewStorage => {
  const imageBytes = bytes(input.availableImage);
  const audioBytes = bytes(input.availableAudio);
  const pendingBytes = bytes(input.pending);
  return {
    audioBytes,
    imageBytes,
    pendingBytes,
    totalBytes: imageBytes + audioBytes + pendingBytes,
  };
};

interface OverviewCountInput {
  articleDrafts: number;
  articlePublished: number;
  articleWordTotal: number;
  activityLast30d: number;
  activityTotal: number;
  assetAudio: number;
  assetImages: number;
  assetPendingCleanup: number;
  assetTotal: number;
  commentChildren: number;
  commentParents: number;
  commentTotal: number;
  musicMissingMetadata: number;
  musicSecondsTotal: number;
  musicTotal: number;
  userJoined30d: number;
  userTotal: number;
}

export const toOverviewData = (
  input: OverviewCountInput,
  composition: OverviewComposition,
  storage: OverviewStorage,
): OverviewData => ({
  composition,
  storage,
  counts: {
    // Article.published = true / false；_sum.wordCount where published = true
    articles: {
      published: input.articlePublished,
      drafts: input.articleDrafts,
      wordTotal: input.articleWordTotal,
    },
    // Activity 计数；publishedAt >= 本地 now-30d 零点
    activities: {
      total: input.activityTotal,
      last30d: input.activityLast30d,
    },
    // Comment 计数；level = PARENT / CHILD
    comments: {
      total: input.commentTotal,
      parents: input.commentParents,
      children: input.commentChildren,
    },
    // User 计数；createdAt >= 本地 now-30d 零点
    users: {
      total: input.userTotal,
      joined30d: input.userJoined30d,
    },
    // Asset 计数 where status != 'DELETED'；PENDING_CLEANUP 计数
    assets: {
      total: input.assetTotal,
      images: input.assetImages,
      audio: input.assetAudio,
      pendingCleanup: input.assetPendingCleanup,
    },
    // Music 计数；artist='' OR album=''；_sum.seconds
    music: {
      total: input.musicTotal,
      missingMetadata: input.musicMissingMetadata,
      secondsTotal: input.musicSecondsTotal,
    },
  },
  // 待处理 key 是契约，label/深链映射在 Admin 展示层
  pending: [
    { key: 'draft_articles', count: input.articleDrafts },
    { key: 'pending_cleanup_assets', count: input.assetPendingCleanup },
    { key: 'incomplete_music', count: input.musicMissingMetadata },
  ],
});

interface TrendRow {
  createdAt?: Date;
  publishedAt?: Date;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** 服务端本地日键 'YYYY-MM-DD'（getFullYear/getMonth/getDate）。
    与评论列表 startDate 的本地解析语义一致；不引 raw SQL。 */
const localDayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// 窗口起点（today-(days-1) 00:00）+ rows（窗口内全部时间戳），
// 桶化为逐日点（含零值），长度恒等于 days。
export const toOverviewTrend = (
  metric: OverviewTrendMetric,
  days: OverviewTrendDays,
  start: Date,
  rows: TrendRow[],
): OverviewTrendData => {
  const field = metric === 'users' ? 'createdAt' : 'publishedAt';
  const dayCount = Number(days);

  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[field];
    if (!(value instanceof Date)) continue;
    const key = localDayKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const points: OverviewTrendPoint[] = [];
  let total = 0;
  for (let offset = 0; offset < dayCount; offset += 1) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + offset,
    );
    const key = localDayKey(date);
    const count = counts.get(key) ?? 0;
    total += count;
    points.push({ count, date: key });
  }

  return { days, metric, points, total };
};

/**
 * 近 365 天逐日发布量。两个来源各自桶化后合并，含零值，末项是今天。
 * 与 toOverviewTrend 共用 localDayKey，因此日历与趋势图对同一天的归属完全一致。
 */
export const toOverviewCalendar = (
  start: Date,
  articleDates: Date[],
  activityDates: Date[],
): OverviewCalendarData => {
  const bucket = (dates: Date[]) => {
    const counts = new Map<string, number>();
    for (const date of dates) {
      const key = localDayKey(date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };

  const articleCounts = bucket(articleDates);
  const activityCounts = bucket(activityDates);

  const days: OverviewCalendarDay[] = [];
  let articlesTotal = 0;
  let activitiesTotal = 0;
  let peak = 0;

  for (let offset = 0; offset < OVERVIEW_CALENDAR_DAYS; offset += 1) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + offset,
    );
    const key = localDayKey(date);
    const articles = articleCounts.get(key) ?? 0;
    const activities = activityCounts.get(key) ?? 0;

    articlesTotal += articles;
    activitiesTotal += activities;
    peak = Math.max(peak, articles + activities);
    days.push({ activities, articles, date: key });
  }

  return { activitiesTotal, articlesTotal, days, peak };
};

/** 逐日查询的目标：metric → 模型委托 + 时间字段。 */
export const TREND_TARGET = {
  articles: { field: 'publishedAt', model: 'article' },
  comments: { field: 'publishedAt', model: 'comment' },
  activities: { field: 'publishedAt', model: 'activity' },
  users: { field: 'createdAt', model: 'user' },
} as const satisfies Record<
  OverviewTrendMetric,
  {
    field: 'createdAt' | 'publishedAt';
    model: 'article' | 'comment' | 'activity' | 'user';
  }
>;

/** 逐日窗口内拉取时间戳的最小查询面（各模型委托的结构都满足）。 */
export interface TrendFetchArgs {
  select: { createdAt?: boolean; publishedAt?: boolean };
  where: {
    createdAt?: { gte: Date; lt: Date };
    publishedAt?: { gte: Date; lt: Date };
  };
}
