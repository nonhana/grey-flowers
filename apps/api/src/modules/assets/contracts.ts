import type {
  AssetDto,
  AssetMediaType,
  AssetPurpose,
  AssetStatus,
} from '@grey-flowers/contracts';

import { concatUrl } from '@/lib/concat-url';

/**
 * 六个消费 role 即存储目录（上传即定址，storage key 永不 re-key）。
 * purpose 未持久化为独立列（无迁移），由 storage key 前缀稳定推导。
 */
export const assetPurposeDirectory: Record<AssetPurpose, string> = {
  ACTIVITY_IMAGE: 'activity-images',
  ARTICLE_COVER: 'article-covers',
  ARTICLE_INLINE: 'article-inline',
  CATEGORY_COVER: 'category-covers',
  MUSIC_COVER: 'music-covers',
  MUSIC_SOURCE: 'music-sources',
};

const directoryAssetPurpose: Record<string, AssetPurpose> = {
  'activity-images': 'ACTIVITY_IMAGE',
  'article-covers': 'ARTICLE_COVER',
  'article-inline': 'ARTICLE_INLINE',
  'category-covers': 'CATEGORY_COVER',
  'music-covers': 'MUSIC_COVER',
  'music-sources': 'MUSIC_SOURCE',
};

export const assetPurposeFromStorageKey = (
  storageKey: string,
  mediaType: AssetMediaType,
): AssetPurpose => {
  const prefix = storageKey.split('/')[0] ?? '';
  return (
    directoryAssetPurpose[prefix] ??
    // 防御分支：本切片的上传总是写入已知前缀；异常行按 mediaType 回退，不中断列表。
    (mediaType === 'AUDIO' ? 'MUSIC_SOURCE' : 'ARTICLE_COVER')
  );
};

/** 目录前缀 → purpose；未知前缀返回 undefined（confirm 校验受管路径用）。 */
export const assetPurposeFromDirectory = (
  directory: string,
): AssetPurpose | undefined => directoryAssetPurpose[directory];

export interface AssetRecord {
  byteSize: bigint;
  createdAt: Date;
  durationMs: number | null;
  height: number | null;
  id: number;
  mediaType: AssetMediaType;
  mimeType: string;
  status: AssetStatus;
  storageKey: string;
  updatedAt: Date;
  width: number | null;
}

export const assetProjection = {
  byteSize: true,
  createdAt: true,
  durationMs: true,
  height: true,
  id: true,
  mediaType: true,
  mimeType: true,
  status: true,
  storageKey: true,
  updatedAt: true,
  width: true,
} as const;

export const toAssetDto = (
  record: AssetRecord,
  assetPublicUrl: string,
): AssetDto => {
  return {
    byteSize: Number(record.byteSize),
    createdAt: record.createdAt.toISOString(),
    deliveryUrl: concatUrl(assetPublicUrl, record.storageKey),
    durationMs: record.durationMs ?? undefined,
    height: record.height ?? undefined,
    id: record.id,
    mediaType: record.mediaType,
    mimeType: record.mimeType,
    purpose: assetPurposeFromStorageKey(record.storageKey, record.mediaType),
    status: record.status,
    storageKey: record.storageKey,
    updatedAt: record.updatedAt.toISOString(),
    width: record.width ?? undefined,
  };
};

export interface AssetReferenceCounts {
  activityImages: number;
  articleCovers: number;
  articleInlineAssets: number;
  categoryCovers: number;
  musicCovers: number;
  musicSources: number;
  total: number;
}

export const toReferenceCounts = (counts: {
  activityImages: number;
  articleCovers: number;
  articleInlineAssets: number;
  categoryCovers: number;
  musicCovers: number;
  musicSources: number;
}): AssetReferenceCounts => {
  const {
    activityImages,
    articleCovers,
    articleInlineAssets,
    categoryCovers,
    musicCovers,
    musicSources,
  } = counts;

  return {
    activityImages,
    articleCovers,
    articleInlineAssets,
    categoryCovers,
    musicCovers,
    musicSources,
    total:
      activityImages +
      articleCovers +
      articleInlineAssets +
      categoryCovers +
      musicCovers +
      musicSources,
  };
};
