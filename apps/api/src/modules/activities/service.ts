import type {
  ActivityAdmin,
  ActivityCreateInput,
  ActivityImageItem,
  ActivityListData,
  ActivityListQuery,
  ActivityPublic,
  ActivityPublicListData,
  ActivityUpdateInput,
} from '@grey-flowers/contracts';

import { Prisma, type PrismaClient } from '@grey-flowers/db';

import type { ApiEnvironment } from '@/env';

import { ApiError } from '@/http/errors';
import { concatUrl } from '@/lib/concat-url';
import { pagination } from '@/lib/pagination';

import { assetPurposeFromStorageKey } from '../assets/contracts';
import { parseActivityMarkdown } from './activity-markdown';
import {
  activityAdminSelect,
  activityPublicSelect,
  toActivityAdmin,
  toActivityPublic,
} from './contracts';

type Client = PrismaClient | Prisma.TransactionClient;

const COMMENT_PATH_PATTERN = /\/recently\?id=(\d+)/;

const activityCommentPath = (id: number) => `/recently?id=${id}`;

/**
 * 动态用例。正文走受限 Markdown（禁 heading/html/image/table + 15 标签白名单）；
 * 图片是受管资产/外部 URL 的混合有序数组；音乐关联是多对多 ActivityMusic，
 * 展示按 music.id asc。删除只断连接 + 删记录，图片/音源资产留库（资产生命周期归切片 1）。
 */
export class ActivityService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly environment: ApiEnvironment,
  ) {}

  // ==================== 管理写 ====================

  async create(input: ActivityCreateInput): Promise<ActivityAdmin> {
    return await this.prisma.$transaction(async (tx) => {
      const content = input.content ?? '';
      const contentMarkdown = await this.resolveContentMarkdown(content);

      const { images, imageRows } = await this.normalizeImages(
        tx,
        input.images,
      );
      const musicIds = [...new Set(input.musicIds ?? [])];
      await this.assertMusicExists(tx, musicIds);

      const record = await tx.activity.create({
        data: {
          content,
          contentMarkdown,
          images,
          ...(imageRows.length > 0
            ? {
                imageAssets: {
                  create: imageRows.map((row) => ({
                    assetId: row.assetId,
                    position: row.position,
                  })),
                },
              }
            : {}),
          ...(musicIds.length > 0
            ? {
                music: { create: musicIds.map((musicId) => ({ musicId })) },
              }
            : {}),
        },
        select: activityAdminSelect,
      });
      return toActivityAdmin(record);
    });
  }

  async update(id: number, input: ActivityUpdateInput): Promise<ActivityAdmin> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        select: { id: true },
        where: { id },
      });
      if (!existing) throw new ApiError('NOT_FOUND');

      const data: Prisma.ActivityUpdateInput = {};
      if (input.content !== undefined) {
        data.content = input.content;
        data.contentMarkdown = await this.resolveContentMarkdown(input.content);
      }

      if (input.images !== undefined) {
        const { images, imageRows } = await this.normalizeImages(
          tx,
          input.images,
        );
        await tx.activityImageAsset.deleteMany({ where: { activityId: id } });
        if (imageRows.length > 0) {
          await tx.activityImageAsset.createMany({
            data: imageRows.map((row) => ({
              activityId: id,
              assetId: row.assetId,
              position: row.position,
            })),
          });
        }
        data.images = images;
      }

      if (input.musicIds !== undefined) {
        const musicIds = [...new Set(input.musicIds)];
        await this.assertMusicExists(tx, musicIds);
        await tx.activityMusic.deleteMany({ where: { activityId: id } });
        if (musicIds.length > 0) {
          await tx.activityMusic.createMany({
            data: musicIds.map((musicId) => ({ activityId: id, musicId })),
          });
        }
      }

      const record = await tx.activity.update({
        data,
        select: activityAdminSelect,
        where: { id },
      });
      return toActivityAdmin(record);
    });
  }

  /** 删除语义：删记录 + 断音乐连接；图片/音源资产留库（级联清 ActivityImageAsset）。 */
  async remove(id: number): Promise<ActivityAdmin> {
    const record = await this.prisma.activity.findUnique({
      select: activityAdminSelect,
      where: { id },
    });
    if (!record) throw new ApiError('NOT_FOUND');
    await this.prisma.activity.delete({ where: { id } });
    return toActivityAdmin(record);
  }

  // ==================== 管理读 ====================

  async list(input: ActivityListQuery): Promise<ActivityListData> {
    const where = input.search
      ? { content: { contains: input.search, mode: 'insensitive' as const } }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        select: activityAdminSelect,
        ...pagination(input.page, input.pageSize),
        where,
      }),
      this.prisma.activity.count({ where }),
    ]);
    return {
      items: items.map(toActivityAdmin),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }

  async detail(id: number): Promise<ActivityAdmin> {
    const record = await this.prisma.activity.findUnique({
      select: activityAdminSelect,
      where: { id },
    });
    if (!record) throw new ApiError('NOT_FOUND');
    return toActivityAdmin(record);
  }

  // ==================== 公开读 ====================

  async listPublic(query: ActivityListQuery): Promise<ActivityPublicListData> {
    const where = query.search
      ? { content: { contains: query.search, mode: 'insensitive' as const } }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        select: activityPublicSelect,
        ...pagination(query.page, query.pageSize),
        where,
      }),
      this.prisma.activity.count({ where }),
    ]);

    const counts = await this.commentCounts(
      this.prisma,
      items.map((record) => activityCommentPath(record.id)),
    );

    return {
      items: items.map((record) =>
        toActivityPublic(record, counts.get(record.id) ?? 0),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async detailPublic(id: number): Promise<ActivityPublic> {
    const record = await this.prisma.activity.findUnique({
      select: activityPublicSelect,
      where: { id },
    });
    if (!record) throw new ApiError('NOT_FOUND');

    const counts = await this.commentCounts(this.prisma, [
      activityCommentPath(id),
    ]);
    return toActivityPublic(record, counts.get(id) ?? 0);
  }

  // ==================== 私有 ====================

  /** 正文受限 Markdown 解析；内容规则拒绝 → VALIDATION_FAILED（中文文案），意外异常 → INTERNAL_ERROR（透传 cause）。空正文 → SQL NULL。 */
  private async resolveContentMarkdown(
    content: string,
  ): Promise<Prisma.InputJsonValue | typeof Prisma.DbNull> {
    const parsed = await parseActivityMarkdown(content);
    if (!parsed.success) {
      const message = parsed.statusMessage;
      if (parsed.statusCode >= 500) {
        throw new ApiError('INTERNAL_ERROR', {
          message,
          cause: parsed.cause,
        });
      }
      throw new ApiError('VALIDATION_FAILED', { message });
    }
    return parsed.payload === null
      ? Prisma.DbNull
      : (parsed.payload as unknown as Prisma.InputJsonValue);
  }

  /** images 归一：受管资产 → position 行 + deliveryUrl；外部 URL → 原样保留、无连接行。 */
  private async normalizeImages(
    client: Client,
    items: ActivityImageItem[] | undefined,
  ): Promise<{
    images: string[];
    imageRows: Array<{ assetId: number; position: number }>;
  }> {
    const entries: Array<
      | { assetId: number; kind: 'asset'; position: number }
      | { kind: 'url'; position: number; url: string }
    > = [];
    for (const [position, item] of (items ?? []).entries()) {
      if ('assetId' in item) {
        entries.push({
          assetId: item.assetId,
          kind: 'asset',
          position,
        });
      } else {
        entries.push({ kind: 'url', position, url: item.url });
      }
    }

    const resolved = await Promise.all(
      entries.map(async (entry) => {
        if (entry.kind === 'asset') {
          const url = await this.assertActivityImage(client, entry.assetId);
          return {
            imageRow: { assetId: entry.assetId, position: entry.position },
            url,
          };
        }
        return { imageRow: null, url: entry.url };
      }),
    );

    return {
      images: resolved.map(({ url }) => url),
      imageRows: resolved.flatMap(({ imageRow }) =>
        imageRow ? [imageRow] : [],
      ),
    };
  }

  /** 图片必须是 AVAILABLE 的 IMAGE 且 purpose=ACTIVITY_IMAGE；否则 VALIDATION_FAILED。 */
  private async assertActivityImage(
    client: Client,
    assetId: number,
  ): Promise<string> {
    const asset = await client.asset.findUnique({ where: { id: assetId } });
    if (
      !asset ||
      asset.status !== 'AVAILABLE' ||
      asset.mediaType !== 'IMAGE' ||
      assetPurposeFromStorageKey(asset.storageKey, asset.mediaType) !==
        'ACTIVITY_IMAGE'
    ) {
      throw new ApiError('VALIDATION_FAILED', {
        fields: { images: ['图片必须是可用的受管「动态图片」资产'] },
      });
    }
    return concatUrl(this.environment.ASSET_PUBLIC_URL, asset.storageKey);
  }

  private async assertMusicExists(client: Client, musicIds: number[]) {
    if (musicIds.length === 0) return;
    const found = await client.music.findMany({
      select: { id: true },
      where: { id: { in: musicIds } },
    });
    if (found.length !== musicIds.length) {
      throw new ApiError('VALIDATION_FAILED', {
        fields: { musicIds: ['存在不存在的音乐'] },
      });
    }
  }

  /** commentCount 只读投影：与主站既有一字不差（Comment groupBy path，正则提取缺省 0）。 */
  private async commentCounts(
    client: Client,
    paths: string[],
  ): Promise<Map<number, number>> {
    if (paths.length === 0) return new Map();
    const rows = await client.comment.groupBy({
      by: ['path'],
      where: { path: { in: paths } },
      _count: { _all: true },
    });
    const counts = new Map<number, number>();
    for (const row of rows) {
      const match = row.path.match(COMMENT_PATH_PATTERN);
      const id = match ? Number(match[1]) : NaN;
      if (Number.isInteger(id)) counts.set(id, row._count._all);
    }
    return counts;
  }
}
