import type {
  AssetDetailData,
  AssetDto,
  AssetListData,
  AssetListQuery,
  AssetPurpose,
} from '@grey-flowers/contracts';
import type { PrismaClient } from '@grey-flowers/db';

import { fileTypeFromBuffer } from 'file-type';
import { parseBuffer } from 'music-metadata';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

import type { ObjectStorage } from '@/adapters/object-storage/r2.js';
import type { ApiEnvironment } from '@/env.js';

import { ApiError } from '@/http/errors.js';
import type { ApiLogger } from '@/bootstrap/logger.js';
import { pagination } from '@/lib/pagination.js';

import {
  assetProjection,
  assetPurposeDirectory,
  toAssetDto,
  toReferenceCounts,
} from './contracts.js';

export const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/flac',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
]);

interface PurposeProfile {
  maxBytes: number;
  mediaType: 'AUDIO' | 'IMAGE';
  mimeTypes: ReadonlySet<string>;
}

const purposeProfiles: Record<AssetPurpose, PurposeProfile> = {
  ACTIVITY_IMAGE: {
    maxBytes: MAX_IMAGE_BYTES,
    mediaType: 'IMAGE',
    mimeTypes: IMAGE_MIME_TYPES,
  },
  ARTICLE_COVER: {
    maxBytes: MAX_IMAGE_BYTES,
    mediaType: 'IMAGE',
    mimeTypes: IMAGE_MIME_TYPES,
  },
  ARTICLE_INLINE: {
    maxBytes: MAX_IMAGE_BYTES,
    mediaType: 'IMAGE',
    mimeTypes: IMAGE_MIME_TYPES,
  },
  CATEGORY_COVER: {
    maxBytes: MAX_IMAGE_BYTES,
    mediaType: 'IMAGE',
    mimeTypes: IMAGE_MIME_TYPES,
  },
  MUSIC_COVER: {
    maxBytes: MAX_IMAGE_BYTES,
    mediaType: 'IMAGE',
    mimeTypes: IMAGE_MIME_TYPES,
  },
  MUSIC_SOURCE: {
    maxBytes: MAX_UPLOAD_BYTES,
    mediaType: 'AUDIO',
    mimeTypes: AUDIO_MIME_TYPES,
  },
};

const normalizeDeclaredMime = (value: string) => {
  switch (value) {
    case 'application/ogg':
      return 'audio/ogg';
    case 'audio/wave':
    case 'audio/x-wav':
      return 'audio/wav';
    case 'audio/x-flac':
      return 'audio/flac';
    default:
      return value;
  }
};

const currentMonthPrefix = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

interface MediaMetadata {
  durationMs?: number;
  height?: number;
  width?: number;
}

const readImageDimensions = async (
  buffer: Uint8Array,
): Promise<MediaMetadata> => {
  try {
    const { height, width } = await sharp(buffer).metadata();
    return { height: height ?? undefined, width: width ?? undefined };
  } catch {
    return { height: undefined, width: undefined };
  }
};

const readAudioDuration = async (
  buffer: Uint8Array,
): Promise<MediaMetadata> => {
  try {
    const { format } = await parseBuffer(buffer);
    return {
      durationMs:
        typeof format.duration === 'number'
          ? Math.round(format.duration * 1000)
          : undefined,
    };
  } catch {
    return { durationMs: undefined };
  }
};

export class AssetService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly environment: ApiEnvironment,
    private readonly objectStorage: ObjectStorage,
    private readonly logger: ApiLogger,
  ) {}

  async upload(
    createdById: number,
    purpose: AssetPurpose,
    file: File,
  ): Promise<AssetDto> {
    const profile = purposeProfiles[purpose];
    if (file.size > profile.maxBytes)
      throw new ApiError('ASSET_PAYLOAD_TOO_LARGE');

    const buffer = new Uint8Array(await file.arrayBuffer());
    const detected = await fileTypeFromBuffer(buffer);
    const declared = normalizeDeclaredMime(file.type);

    if (
      !detected ||
      !profile.mimeTypes.has(detected.mime) ||
      !profile.mimeTypes.has(declared)
    ) {
      throw new ApiError('UNSUPPORTED_MEDIA_TYPE');
    }

    return await this.persistBuffer(
      createdById,
      purpose,
      buffer,
      declared,
      detected.ext,
    );
  }

  /**
   * 受管媒体提取用的写入路径（音乐模块封面提取调用）：复跑 purpose 校验与
   * 媒体元数据抽取后走同一单写入尾段。对象写入、key 命名与孤儿补偿全部
   * 收敛在资产用例内，不泄露给业务模块。
   */
  async createFromBuffer(
    purpose: AssetPurpose,
    buffer: Uint8Array,
    contentType: string,
    createdById: number,
  ): Promise<AssetDto> {
    const profile = purposeProfiles[purpose];
    if (buffer.byteLength > profile.maxBytes)
      throw new ApiError('ASSET_PAYLOAD_TOO_LARGE');

    const detected = await fileTypeFromBuffer(buffer);
    const declared = normalizeDeclaredMime(contentType);

    if (
      !detected ||
      !profile.mimeTypes.has(detected.mime) ||
      !profile.mimeTypes.has(declared)
    ) {
      throw new ApiError('UNSUPPORTED_MEDIA_TYPE');
    }

    return await this.persistBuffer(
      createdById,
      purpose,
      buffer,
      declared,
      detected.ext,
    );
  }

  /** 单写入尾段：媒体元数据抽取 → key 命名 → putObject → asset.create → 孤儿补偿。 */
  private async persistBuffer(
    createdById: number,
    purpose: AssetPurpose,
    buffer: Uint8Array,
    contentType: string,
    ext: string,
  ): Promise<AssetDto> {
    const profile = purposeProfiles[purpose];
    const metadata =
      profile.mediaType === 'IMAGE'
        ? await readImageDimensions(buffer)
        : await readAudioDuration(buffer);

    const key = `${assetPurposeDirectory[purpose]}/${currentMonthPrefix()}/${randomUUID()}.${ext}`;

    try {
      await this.objectStorage.putObject({
        body: buffer,
        contentType,
        key,
        size: buffer.byteLength,
      });
    } catch (cause) {
      throw new ApiError('UPLOAD_FAILED', { cause });
    }

    try {
      const record = await this.prisma.asset.create({
        data: {
          byteSize: BigInt(buffer.byteLength),
          createdById,
          durationMs: metadata.durationMs,
          height: metadata.height,
          mediaType: profile.mediaType,
          mimeType: contentType,
          status: 'AVAILABLE',
          storageKey: key,
          width: metadata.width,
        },
        select: assetProjection,
      });
      return toAssetDto(record, this.environment.ASSET_PUBLIC_URL);
    } catch (cause) {
      try {
        await this.objectStorage.deleteObject(key);
      } catch {
        // best-effort 孤儿补偿：对象残留可留待保留策略兜底
      }
      throw new ApiError('UPLOAD_FAILED', { cause });
    }
  }

  async list(input: AssetListQuery): Promise<AssetListData> {
    const where = {
      ...(input.mediaType === undefined ? {} : { mediaType: input.mediaType }),
      ...(input.purpose === undefined
        ? {}
        : {
            storageKey: {
              startsWith: `${assetPurposeDirectory[input.purpose]}/`,
            },
          }),
      ...(input.status === undefined ? {} : { status: input.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        orderBy: { createdAt: 'desc' },
        select: assetProjection,
        ...pagination(input.page, input.pageSize),
        where,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      items: items.map((item) =>
        toAssetDto(item, this.environment.ASSET_PUBLIC_URL),
      ),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }

  async detail(id: number): Promise<AssetDetailData> {
    const record = await this.prisma.asset.findUnique({
      select: {
        ...assetProjection,
        _count: {
          select: {
            activityImages: true,
            articleCovers: true,
            articleInlineAssets: true,
            categoryCovers: true,
            musicCovers: true,
            musicSources: true,
          },
        },
      },
      where: { id },
    });
    if (!record) throw new ApiError('NOT_FOUND');

    const { _count, ...asset } = record;
    return {
      asset: toAssetDto(asset, this.environment.ASSET_PUBLIC_URL),
      references: toReferenceCounts(_count),
    };
  }

  async setStatus(
    id: number,
    status: 'AVAILABLE' | 'PENDING_CLEANUP',
  ): Promise<AssetDto> {
    const existing = await this.prisma.asset.findUnique({
      select: { id: true, status: true },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');
    if (existing.status === 'DELETED') throw new ApiError('CONFLICT');

    if (existing.status === status) return this.resolveDto(id);

    if (status === 'PENDING_CLEANUP') await this.assertUnreferenced(id);

    const updated = await this.prisma.asset.update({
      data: { status },
      select: assetProjection,
      where: { id },
    });
    return toAssetDto(updated, this.environment.ASSET_PUBLIC_URL);
  }

  async remove(id: number): Promise<AssetDto> {
    const existing = await this.prisma.asset.findUnique({
      select: assetProjection,
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');

    if (existing.status === 'DELETED') {
      return toAssetDto(existing, this.environment.ASSET_PUBLIC_URL);
    }

    if (existing.status !== 'PENDING_CLEANUP') {
      throw new ApiError('CONFLICT');
    }

    await this.assertUnreferenced(id);

    // 先标 DB，再删对象：若 DB 更新失败，对象还在而记录仍 AVAILABLE → 404 交付；
    // 若对象删除失败，记录已是 DELETED，删除侧可恢复（对象残留不会让交付 404）。
    const deleted = await this.prisma.asset.update({
      data: { deletedAt: new Date(), status: 'DELETED' },
      select: assetProjection,
      where: { id },
    });

    try {
      await this.objectStorage.deleteObject(existing.storageKey);
    } catch (error) {
      // 对象残留可恢复（DELETED 记录 + 定时清扫），不要因外部存储抖动回滚交付状态。
      this.logger.warn(
        { error, storageKey: existing.storageKey },
        'Asset marked DELETED but object removal failed; left for cleanup',
      );
    }

    return toAssetDto(deleted, this.environment.ASSET_PUBLIC_URL);
  }

  private async resolveDto(id: number): Promise<AssetDto> {
    const record = await this.prisma.asset.findUnique({
      select: assetProjection,
      where: { id },
    });
    if (!record) throw new ApiError('NOT_FOUND');
    return toAssetDto(record, this.environment.ASSET_PUBLIC_URL);
  }

  private async assertUnreferenced(id: number) {
    const counts = await this.prisma.asset.findUnique({
      select: {
        _count: {
          select: {
            activityImages: true,
            articleCovers: true,
            articleInlineAssets: true,
            categoryCovers: true,
            musicCovers: true,
            musicSources: true,
          },
        },
      },
      where: { id },
    });
    if (!counts) throw new ApiError('NOT_FOUND');

    const references = toReferenceCounts(counts._count);
    if (references.total > 0) throw new ApiError('ASSET_REFERENCED');
  }
}
