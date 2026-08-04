import type {
  MusicAdmin,
  MusicCreateInput,
  MusicListData,
  MusicListQuery,
  MusicParseData,
  MusicPublicListData,
  MusicTrack,
  MusicUpdateInput,
  Principal,
} from '@grey-flowers/contracts';
import type { Prisma, PrismaClient } from '@grey-flowers/db';

import { parseBuffer } from 'music-metadata';

import type { ObjectStorage } from '@/adapters/object-storage/r2.js';
import type { ApiEnvironment } from '@/env.js';

import { ApiError } from '@/http/errors.js';
import { concatUrl } from '@/lib/concat-url.js';
import { pagination } from '@/lib/pagination.js';

import type { AssetService } from '../assets/service.js';

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
 * 音乐库用例。`seconds` 服务端权威（优先音源资产 durationMs，缺失时重算）；
 * 封面/音源必须是 AVAILABLE 的受管资产；删 Music 不动资产（资产生命周期归切片 1）。
 */
export class MusicService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly environment: ApiEnvironment,
    private readonly objectStorage: ObjectStorage,
    private readonly assets: AssetService,
  ) {}

  // ==================== 管理写 ====================

  /** 解析音源对象：ID3 提取 + 内嵌封面落库；失败降级为文件名标题，绝不阻断。 */
  async parse(
    principal: Principal,
    sourceAssetId: number,
  ): Promise<MusicParseData> {
    const sourceAsset = await this.assertSourceAsset(
      this.prisma,
      sourceAssetId,
    );

    let bytes: Uint8Array;
    try {
      bytes = await this.objectStorage.getObject(sourceAsset.storageKey);
    } catch (cause) {
      throw new ApiError('VALIDATION_FAILED', {
        cause,
        fields: { sourceAssetId: ['无法读取音源对象，请确认对象存储可用'] },
      });
    }

    let metadata:
      | {
          album: string | undefined;
          artist: string | undefined;
          duration?: number;
          picture?: { data: Uint8Array; format: string };
          title: string | undefined;
        }
      | undefined;
    try {
      const { common, format } = await parseBuffer(bytes);
      const picture = common.picture?.[0];
      metadata = {
        album: common.album,
        artist: common.artist,
        duration: format.duration,
        picture: picture
          ? { data: new Uint8Array(picture.data), format: picture.format }
          : undefined,
        title: common.title,
      };
    } catch {
      // 不可解析：整体降级
    }

    const fallbackTitle =
      sourceAsset.storageKey
        .split('/')
        .pop()
        ?.replace(/\.[^/.]+$/, '') ?? '未命名';
    const title = metadata?.title?.trim() || fallbackTitle;
    const artist = metadata?.artist?.trim() || '';
    const album = metadata?.album?.trim() || '';
    const seconds =
      typeof metadata?.duration === 'number' && metadata.duration > 0
        ? Math.round(metadata.duration)
        : 0;

    let coverAssetId: number | null = null;
    let cover: string | null = null;
    if (metadata?.picture) {
      try {
        const coverAsset = await this.assets.createFromBuffer(
          'MUSIC_COVER',
          metadata.picture.data,
          metadata.picture.format,
          principal.userId,
        );
        coverAssetId = coverAsset.id;
        cover = coverAsset.deliveryUrl;
      } catch {
        // 内嵌封面写入失败不阻断：cover 留空，前端提示手动补传
      }
    }

    return {
      album,
      artist,
      cover,
      coverAssetId,
      seconds,
      sourceAssetId,
      src: concatUrl(this.environment.ASSET_PUBLIC_URL, sourceAsset.storageKey),
      title,
    };
  }

  async create(input: MusicCreateInput): Promise<MusicAdmin> {
    return await this.prisma.$transaction(async (tx) => {
      const sourceAsset = await this.assertSourceAsset(tx, input.sourceAssetId);
      const { cover, coverAssetId } = await this.resolveCoverInput(tx, input);
      if (!cover) {
        throw new ApiError('VALIDATION_FAILED', {
          fields: { cover: ['封面必填：选择受管封面或提供外部 URL'] },
        });
      }

      const seconds = await this.resolveSeconds(sourceAsset);

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
        seconds = await this.resolveSeconds(sourceAsset);
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
    const where = this.buildListWhere(input.search);
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
    const where = this.buildListWhere(query.search);
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

  /** seconds 服务端权威：优先 durationMs；缺失则 getObject + parseBuffer 重算。 */
  private async resolveSeconds(sourceAsset: SourceAssetView): Promise<number> {
    if (
      typeof sourceAsset.durationMs === 'number' &&
      sourceAsset.durationMs > 0
    ) {
      return Math.round(sourceAsset.durationMs / 1000);
    }
    try {
      const bytes = await this.objectStorage.getObject(sourceAsset.storageKey);
      const { format } = await parseBuffer(bytes);
      if (typeof format.duration === 'number' && format.duration > 0) {
        return Math.round(format.duration);
      }
    } catch (cause) {
      throw new ApiError('VALIDATION_FAILED', {
        cause,
        fields: {
          sourceAssetId: ['无法确定音源时长，请改用可解析的音频'],
        },
      });
    }
    throw new ApiError('VALIDATION_FAILED', {
      fields: { sourceAssetId: ['无法确定音源时长，请改用可解析的音频'] },
    });
  }

  private buildListWhere(search: string | undefined): Prisma.MusicWhereInput {
    if (!search) return {};
    return {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
        { album: { contains: search, mode: 'insensitive' } },
      ],
    };
  }
}
