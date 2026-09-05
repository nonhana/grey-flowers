import type {
  AssetConfirmInput,
  AssetDetailData,
  AssetDto,
  AssetListData,
  AssetListQuery,
  AssetPurpose,
  AssetUploadUrlData,
  AssetUploadUrlInput,
} from '@grey-flowers/contracts';
import type { PrismaClient } from '@grey-flowers/db';

import { randomUUID } from 'node:crypto';

import type {
  HeadObjectResult,
  ObjectStorage,
} from '@/adapters/object-storage/r2';
import type { ApiLogger } from '@/bootstrap/logger';
import type { ApiEnvironment } from '@/env';

import { ApiError } from '@/http/errors';
import { pagination } from '@/lib/pagination';

import {
  assetProjection,
  assetPurposeDirectory,
  assetPurposeFromDirectory,
  toAssetDto,
  toReferenceCounts,
} from './contracts';

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

export class AssetService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly environment: ApiEnvironment,
    private readonly objectStorage: ObjectStorage,
    private readonly logger: ApiLogger,
  ) {}

  /** MIME（normalize 后）→ 存储扩展名；presign 白名单校验保证命中。 */
  private readonly mimeToExt: Record<string, string> = {
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  /**
   * 直传第一步：服务端生成受管 key 并签发一次性 PUT URL。
   * 密钥不出服务端；浏览器随后直接 PUT 对象，全程可见真实上传进度。
   */
  async createUploadUrl(
    input: AssetUploadUrlInput,
  ): Promise<AssetUploadUrlData> {
    const profile = purposeProfiles[input.purpose];
    const declared = normalizeDeclaredMime(input.contentType);

    if (!profile.mimeTypes.has(declared)) {
      throw new ApiError('UNSUPPORTED_MEDIA_TYPE');
    }
    if (input.size !== undefined && input.size > profile.maxBytes) {
      throw new ApiError('ASSET_PAYLOAD_TOO_LARGE');
    }

    const ext = this.mimeToExt[declared];
    const key = `${assetPurposeDirectory[input.purpose]}/${currentMonthPrefix()}/${randomUUID()}.${ext}`;
    const uploadUrl = await this.objectStorage.presignUpload({
      contentType: declared,
      key,
    });

    return { uploadUrl, key, maxBytes: profile.maxBytes };
  }

  /**
   * 直传第三步：浏览器 PUT 完成后回执。HEAD 校验对象（存在、大小一致、
   * 类型在白名单内）后落库；失败补偿删除对象，防止孤儿残留。
   */
  async confirmUpload(
    createdById: number,
    input: AssetConfirmInput,
  ): Promise<AssetDto> {
    // 幂等：同 key 已落库（如前端重复回执）直接返回既有记录。
    const existing = await this.prisma.asset.findFirst({
      select: assetProjection,
      where: { storageKey: input.key },
    });
    if (existing) {
      return toAssetDto(existing, this.environment.ASSET_PUBLIC_URL);
    }

    const directory = input.key.split('/')[0] ?? '';
    const purpose = assetPurposeFromDirectory(directory);
    if (!purpose) {
      throw new ApiError('VALIDATION_FAILED', {
        fields: { key: ['存储路径不在受管目录内'] },
      });
    }
    const profile = purposeProfiles[purpose];

    let head: HeadObjectResult;
    try {
      head = await this.objectStorage.headObject(input.key);
    } catch (cause) {
      throw new ApiError('UPLOAD_FAILED', {
        cause,
        fields: { key: ['对象不存在或不可读'] },
      });
    }

    const contentType = normalizeDeclaredMime(head.contentType);
    if (!profile.mimeTypes.has(contentType)) {
      throw new ApiError('UNSUPPORTED_MEDIA_TYPE');
    }
    if (head.size !== input.size || head.size > profile.maxBytes) {
      throw new ApiError('ASSET_PAYLOAD_TOO_LARGE');
    }

    try {
      const record = await this.prisma.asset.create({
        data: {
          byteSize: BigInt(head.size),
          createdById,
          durationMs:
            profile.mediaType === 'AUDIO' ? (input.durationMs ?? null) : null,
          height:
            profile.mediaType === 'IMAGE' &&
            input.height !== undefined &&
            input.width !== undefined
              ? input.height
              : null,
          mediaType: profile.mediaType,
          mimeType: contentType,
          status: 'AVAILABLE',
          storageKey: input.key,
          width:
            profile.mediaType === 'IMAGE' &&
            input.height !== undefined &&
            input.width !== undefined
              ? input.width
              : null,
        },
        select: assetProjection,
      });
      return toAssetDto(record, this.environment.ASSET_PUBLIC_URL);
    } catch (cause) {
      try {
        await this.objectStorage.deleteObject(input.key);
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
