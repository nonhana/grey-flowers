import type {
  AssetDto,
  AssetMediaType,
  AssetStatus,
} from '@grey-flowers/contracts';

import { concatUrl } from '@/lib/concat-url';

/**
 * 存量六前缀 key（article-covers/…）不 re-key、delivery URL 不变；
 * 新上传一律 `assets/{YYYY}/{MM}/{uuid}.{ext}`（见 managed-key.ts）。
 */

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
