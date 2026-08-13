import type {
  MusicAdmin,
  MusicCreateInput,
  MusicListData,
  MusicListQuery,
  MusicPublicListData,
  MusicTrack,
  MusicUpdateInput,
} from '@grey-flowers/contracts';
import type { Prisma, PrismaClient } from '@grey-flowers/db';

import type { ApiEnvironment } from '@/env.js';

import { ApiError } from '@/http/errors.js';
import { concatUrl } from '@/lib/concat-url.js';
import { pagination } from '@/lib/pagination.js';

import { assetPurposeFromStorageKey } from '../assets/contracts.js';
import {
  musicAdminSelect,
  musicTrackSelect,
  toMusicAdmin,
  toMusicTrack,
} from './contracts.js';

type Client = PrismaClient | Prisma.TransactionClient;

interface SourceAssetView {
  durationMs: number | null;
  storageKey: string;
}

/**
 * 音乐库用例。`seconds` 由客户端解析上报（解析只发生一次，在浏览器）；
 * 音源资产 durationMs（直传 confirm 上报）存在时优先。封面/音源必须是
 * AVAILABLE 的受管资产；删 Music 不动资产（资产生命周期归切片 1）。
 */
export class MusicService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly environment: ApiEnvironment,
  ) {}

  // ==================== 管理写 ====================

  async create(input: MusicCreateInput): Promise<MusicAdmin> {
    return await this.prisma.$transaction(async (tx) => {
      const sourceAsset = await this.assertSourceAsset(tx, input.sourceAssetId);
      const { cover, coverAssetId } = await this.resolveCoverInput(tx, input);
      if (!cover) {
        throw new ApiError('VALIDATION_FAILED', {
          fields: { cover: ['封面必填：选择受管封面或提供外部 URL'] },
        });
      }

      const seconds = this.resolveSeconds(sourceAsset, input.seconds);

      const record = await tx.music.create({
        data: {
          album: input.album ?? '',
          artist: input.artist ?? '',
          cover,
          coverAssetId,
          seconds,
          sourceAssetId: input.sourceAssetId,
          src: concatUrl(
            this.environment.ASSET_PUBLIC_URL,
            sourceAsset.storageKey,
          ),
          title: input.title.trim(),
        },
        select: musicAdminSelect,
      });
      return toMusicAdmin(record, this.environment.ASSET_PUBLIC_URL);
    });
  }

  async update(id: number, input: MusicUpdateInput): Promise<MusicAdmin> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.music.findUnique({
        select: musicAdminSelect,
        where: { id },
      });
      if (!existing) throw new ApiError('NOT_FOUND');

      const title =
        input.title !== undefined ? input.title.trim() : existing.title;

      let sourceAssetId = existing.sourceAssetId;
      let src = existing.src;
      let seconds = existing.seconds;
      if (input.sourceAssetId !== undefined) {
        const sourceAsset = await this.assertSourceAsset(
          tx,
          input.sourceAssetId,
        );
        sourceAssetId = input.sourceAssetId;
        src = concatUrl(
          this.environment.ASSET_PUBLIC_URL,
          sourceAsset.storageKey,
        );
        seconds = this.resolveSeconds(sourceAsset, input.seconds ?? 0);
      }

      let cover = existing.cover;
      let coverAssetId = existing.coverAssetId;
      if (input.coverAssetId !== undefined && input.coverAssetId !== null) {
        const normalized = await this.assertCoverAsset(tx, input.coverAssetId);
        cover = normalized.cover;
        coverAssetId = normalized.coverAssetId;
      } else if (input.cover !== undefined) {
        cover = input.cover.trim();
        coverAssetId = null;
      }
      if (!cover) {
        throw new ApiError('VALIDATION_FAILED', {
          fields: { cover: ['封面必填：选择受管封面或提供外部 URL'] },
        });
      }

      const record = await tx.music.update({
        data: {
          album: input.album !== undefined ? input.album : existing.album,
          artist: input.artist !== undefined ? input.artist : existing.artist,
          cover,
          coverAssetId,
          seconds,
          sourceAssetId,
          src,
          title,
        },
        select: musicAdminSelect,
        where: { id },
      });
      return toMusicAdmin(record, this.environment.ASSET_PUBLIC_URL);
    });
  }

  /** 删记录不动资产；解引用后资产回到资产库可清理状态（Restrict 语义自动解除）。 */
  async remove(id: number): Promise<MusicAdmin> {
    const existing = await this.prisma.music.findUnique({
      select: musicAdminSelect,
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');
    await this.prisma.music.delete({ where: { id } });
    return toMusicAdmin(existing, this.environment.ASSET_PUBLIC_URL);
  }

  // ==================== 管理读 ====================

  async list(input: MusicListQuery): Promise<MusicListData> {
    const where = this.buildListWhere(
      input.search,
      input.incomplete !== undefined,
    );
    const [items, total] = await Promise.all([
      this.prisma.music.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: musicAdminSelect,
        ...pagination(input.page, input.pageSize),
        where,
      }),
      this.prisma.music.count({ where }),
    ]);
    return {
      items: items.map((record) =>
        toMusicAdmin(record, this.environment.ASSET_PUBLIC_URL),
      ),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }

  async detail(id: number): Promise<MusicAdmin> {
    const record = await this.prisma.music.findUnique({
      select: musicAdminSelect,
      where: { id },
    });
    if (!record) throw new ApiError('NOT_FOUND');
    return toMusicAdmin(record, this.environment.ASSET_PUBLIC_URL);
  }

  // ==================== 公开读 ====================

  async listPublic(query: MusicListQuery): Promise<MusicPublicListData> {
    // 公开读忽略 incomplete（管理端筛选项）。
    const where = this.buildListWhere(query.search, false);
    const [items, total] = await Promise.all([
      this.prisma.music.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: musicTrackSelect,
        ...pagination(query.page, query.pageSize),
        where,
      }),
      this.prisma.music.count({ where }),
    ]);
    return {
      items: items.map(toMusicTrack),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async detailPublic(id: number): Promise<MusicTrack> {
    const record = await this.prisma.music.findUnique({
      select: musicTrackSelect,
      where: { id },
    });
    if (!record) throw new ApiError('NOT_FOUND');
    return toMusicTrack(record);
  }

  // ==================== 私有 ====================

  private async resolveCoverInput(
    tx: Client,
    input: Pick<MusicCreateInput, 'cover' | 'coverAssetId'>,
  ): Promise<{ cover: string; coverAssetId: number | null }> {
    if (input.coverAssetId !== undefined && input.coverAssetId !== null) {
      return await this.assertCoverAsset(tx, input.coverAssetId);
    }
    if (input.cover !== undefined && input.cover.trim().length > 0) {
      return { cover: input.cover.trim(), coverAssetId: null };
    }
    return { cover: '', coverAssetId: null };
  }

  /** 音源必须是 AVAILABLE 的 AUDIO 且 purpose=MUSIC_SOURCE；否则 VALIDATION_FAILED。 */
  private async assertSourceAsset(
    client: Client,
    sourceAssetId: number,
  ): Promise<SourceAssetView> {
    const asset = await client.asset.findUnique({
      where: { id: sourceAssetId },
    });
    if (
      !asset ||
      asset.status !== 'AVAILABLE' ||
      asset.mediaType !== 'AUDIO' ||
      assetPurposeFromStorageKey(asset.storageKey, asset.mediaType) !==
        'MUSIC_SOURCE'
    ) {
      throw new ApiError('VALIDATION_FAILED', {
        fields: { sourceAssetId: ['该音源不是可用的受管音乐音频'] },
      });
    }
    return { durationMs: asset.durationMs, storageKey: asset.storageKey };
  }

  /** 封面必须是 AVAILABLE 的 IMAGE 且 purpose=MUSIC_COVER；否则 VALIDATION_FAILED。 */
  private async assertCoverAsset(
    client: Client,
    coverAssetId: number,
  ): Promise<{ cover: string; coverAssetId: number }> {
    const asset = await client.asset.findUnique({
      where: { id: coverAssetId },
    });
    if (
      !asset ||
      asset.status !== 'AVAILABLE' ||
      asset.mediaType !== 'IMAGE' ||
      assetPurposeFromStorageKey(asset.storageKey, asset.mediaType) !==
        'MUSIC_COVER'
    ) {
      throw new ApiError('VALIDATION_FAILED', {
        fields: { coverAssetId: ['该封面不是可用的受管音乐封面'] },
      });
    }
    return {
      cover: concatUrl(this.environment.ASSET_PUBLIC_URL, asset.storageKey),
      coverAssetId,
    };
  }

  /**
   * 时长决策：音源资产 durationMs（直传 confirm 上报）优先，
   * 否则用客户端解析上报的声明值（0 = 未知）。服务端不再解析媒体。
   */
  private resolveSeconds(
    sourceAsset: SourceAssetView,
    declaredSeconds: number,
  ): number {
    if (
      typeof sourceAsset.durationMs === 'number' &&
      sourceAsset.durationMs > 0
    ) {
      return Math.round(sourceAsset.durationMs / 1000);
    }
    return declaredSeconds;
  }

  private buildListWhere(
    search: string | undefined,
    incomplete: boolean,
  ): Prisma.MusicWhereInput {
    const clauses: Prisma.MusicWhereInput[] = [];
    if (search) {
      clauses.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { artist: { contains: search, mode: 'insensitive' } },
          { album: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (incomplete) {
      clauses.push({ OR: [{ artist: '' }, { album: '' }] });
    }
    return clauses.length === 1
      ? clauses[0]
      : clauses.length > 1
        ? { AND: clauses }
        : {};
  }
}
