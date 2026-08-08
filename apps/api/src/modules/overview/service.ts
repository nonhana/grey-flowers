import type {
  OverviewCalendarData,
  OverviewData,
  OverviewTrendData,
  OverviewTrendDays,
  OverviewTrendMetric,
} from '@grey-flowers/contracts';
import type { PrismaClient } from '@grey-flowers/db';

import { OVERVIEW_CALENDAR_DAYS } from '@grey-flowers/contracts';

import {
  RANK_TAKE,
  toOverviewCalendar,
  toOverviewComposition,
  toOverviewData,
  toOverviewStorage,
  toOverviewTrend,
  TREND_TARGET,
  type TrendFetchArgs,
} from './contracts.js';

interface TrendRow {
  createdAt?: Date;
  publishedAt?: Date;
}

/**
 * 概览用例。纯只读投影：所有指标/待处理仅来自既有字段
 * （published / level / status / mediaType / createdAt / publishedAt /
 * wordCount / seconds / artist / album 空串），无写入、无事务、无跨资源操作。
 */
export class OverviewService {
  constructor(private readonly prisma: PrismaClient) {}

  /** 6 组读数 + 3 项待处理；全部并行只读查询，不开事务。 */
  async get(): Promise<OverviewData> {
    const now = new Date();
    // 本地 now-30d 零点：与评论列表 startDate 的本地解析语义一致。
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 30,
    );

    const [
      // 文章
      articlePublished,
      articleDrafts,
      articleWord,
      // 动态
      activityTotal,
      activityLast30d,
      // 评论
      commentTotal,
      commentParents,
      commentChildren,
      // 用户
      userTotal,
      userJoined30d,
      // 资产
      assetTotal,
      assetImages,
      assetAudio,
      assetPendingCleanup,
      // 音乐
      musicTotal,
      musicMissing,
      musicSeconds,
      // 内容构成：articleCount 是 taxonomy 事务维护的物化列，排行只是 orderBy + take
      categoryRows,
      categoryAgg,
      tagRows,
      tagAgg,
      uncategorized,
      // 存储构成：AVAILABLE 按 mediaType 分组求和 + PENDING_CLEANUP 单独求和
      availableBytes,
      pendingBytes,
    ] = await Promise.all([
      this.prisma.article.count({ where: { published: true } }),
      this.prisma.article.count({ where: { published: false } }),
      this.prisma.article.aggregate({
        _sum: { wordCount: true },
        where: { published: true },
      }),
      this.prisma.activity.count(),
      this.prisma.activity.count({
        where: { publishedAt: { gte: monthStart } },
      }),
      this.prisma.comment.count(),
      this.prisma.comment.count({ where: { level: 'PARENT' } }),
      this.prisma.comment.count({ where: { level: 'CHILD' } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.asset.count({ where: { status: { not: 'DELETED' } } }),
      this.prisma.asset.count({
        where: { mediaType: 'IMAGE', status: { not: 'DELETED' } },
      }),
      this.prisma.asset.count({
        where: { mediaType: 'AUDIO', status: { not: 'DELETED' } },
      }),
      this.prisma.asset.count({ where: { status: 'PENDING_CLEANUP' } }),
      this.prisma.music.count(),
      this.prisma.music.count({
        where: { OR: [{ artist: '' }, { album: '' }] },
      }),
      this.prisma.music.aggregate({ _sum: { seconds: true } }),
      this.prisma.category.findMany({
        orderBy: [{ articleCount: 'desc' }, { name: 'asc' }],
        select: { articleCount: true, name: true },
        take: RANK_TAKE.categories,
      }),
      this.prisma.category.aggregate({
        _count: { _all: true },
        _sum: { articleCount: true },
      }),
      this.prisma.tag.findMany({
        orderBy: [{ articleCount: 'desc' }, { name: 'asc' }],
        select: { articleCount: true, name: true },
        take: RANK_TAKE.tags,
      }),
      this.prisma.tag.aggregate({
        _count: { _all: true },
        _sum: { articleCount: true },
      }),
      this.prisma.article.count({ where: { categoryId: null } }),
      this.prisma.asset.groupBy({
        _sum: { byteSize: true },
        by: ['mediaType'],
        where: { status: 'AVAILABLE' },
      }),
      this.prisma.asset.aggregate({
        _sum: { byteSize: true },
        where: { status: 'PENDING_CLEANUP' },
      }),
    ]);

    const bytesOf = (mediaType: 'IMAGE' | 'AUDIO') =>
      availableBytes.find((row) => row.mediaType === mediaType)?._sum
        .byteSize ?? null;

    return toOverviewData(
      {
        activityLast30d,
        activityTotal,
        articleDrafts,
        articlePublished,
        articleWordTotal: articleWord._sum.wordCount ?? 0,
        assetAudio,
        assetImages,
        assetPendingCleanup,
        assetTotal,
        commentChildren,
        commentParents,
        commentTotal,
        musicMissingMetadata: musicMissing,
        musicSecondsTotal: musicSeconds._sum.seconds ?? 0,
        musicTotal,
        userJoined30d,
        userTotal,
      },
      toOverviewComposition({
        categoryCountSum: categoryAgg._sum.articleCount ?? 0,
        categoryRows,
        categoryTotalItems: categoryAgg._count._all,
        tagCountSum: tagAgg._sum.articleCount ?? 0,
        tagRows,
        tagTotalItems: tagAgg._count._all,
        uncategorized,
      }),
      toOverviewStorage({
        availableAudio: bytesOf('AUDIO'),
        availableImage: bytesOf('IMAGE'),
        pending: pendingBytes._sum.byteSize,
      }),
    );
  }

  /**
   * 发布节奏：近 365 天逐日发布量（文章 + 动态）。
   *
   * 只统计 published = true —— 草稿的 publishedAt 是建档时间的默认值，
   * 把它算成「那天发布了」会让节奏图凭空多出一批从未上线的日子。
   */
  async getCalendar(): Promise<OverviewCalendarData> {
    const now = new Date();
    // 本地日窗口：[today-(365-1) 00:00, tomorrow 00:00)，与趋势图同一套语义。
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (OVERVIEW_CALENDAR_DAYS - 1),
    );
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const window = { gte: start, lt: end };

    const [articles, activities] = await Promise.all([
      this.prisma.article.findMany({
        select: { publishedAt: true },
        where: { published: true, publishedAt: window },
      }),
      this.prisma.activity.findMany({
        select: { publishedAt: true },
        where: { publishedAt: window },
      }),
    ]);

    return toOverviewCalendar(
      start,
      articles.map((row) => row.publishedAt),
      activities.map((row) => row.publishedAt),
    );
  }

  /** 逐日新增：全窗口含零值；PRISMA 委托按 metric 分支取时间字段。 */
  async getTrends(
    metric: OverviewTrendMetric,
    days: OverviewTrendDays,
  ): Promise<OverviewTrendData> {
    const target = TREND_TARGET[metric];
    const dayCount = Number(days);
    const now = new Date();
    // 本地日窗口：[today-(days-1) 00:00, tomorrow 00:00)
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (dayCount - 1),
    );
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const rows = await this.fetchRows(target.model, target.field, {
      end,
      start,
    });

    return toOverviewTrend(metric, days, start, rows);
  }

  private async fetchRows(
    model: 'article' | 'comment' | 'activity' | 'user',
    field: 'createdAt' | 'publishedAt',
    window: { end: Date; start: Date },
  ): Promise<TrendRow[]> {
    const args: TrendFetchArgs = {
      select: { [field]: true },
      where: { [field]: { gte: window.start, lt: window.end } },
    };
    const delegate = this.prisma[model] as unknown as {
      findMany: (args: TrendFetchArgs) => Promise<TrendRow[]>;
    };
    return await delegate.findMany(args);
  }
}
