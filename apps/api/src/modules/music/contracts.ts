import type {
  MusicAdmin,
  MusicAssetSummary,
  MusicTrack,
} from '@grey-flowers/contracts';
import type { Prisma } from '@grey-flowers/db';

import { concatUrl } from '@/lib/concat-url';

/** 管理读：含 sourceAsset/coverAsset 摘要与 activityCount（多对多引用计数）。 */
export const musicAdminSelect = {
  _count: { select: { activities: true } },
  album: true,
  artist: true,
  cover: true,
  coverAssetId: true,
  coverAsset: { select: { id: true, storageKey: true } },
  createdAt: true,
  id: true,
  seconds: true,
  sourceAssetId: true,
  sourceAsset: { select: { id: true, storageKey: true } },
  src: true,
  title: true,
} satisfies Prisma.MusicSelect;

/** 公开读：与主站 `Track` 一字不差。 */
export const musicTrackSelect = {
  album: true,
  artist: true,
  cover: true,
  id: true,
  seconds: true,
  src: true,
  title: true,
} satisfies Prisma.MusicSelect;

interface MusicAdminRecord extends Prisma.MusicGetPayload<{
  select: typeof musicAdminSelect;
}> {}

interface MusicAssetSummaryRecord {
  id: number;
  storageKey: string;
}

export const toMusicAssetSummary = (
  record: MusicAssetSummaryRecord,
  assetPublicUrl: string,
): MusicAssetSummary => ({
  id: record.id,
  storageKey: record.storageKey,
  deliveryUrl: concatUrl(assetPublicUrl, record.storageKey),
});

export const toMusicAdmin = (
  record: MusicAdminRecord,
  assetPublicUrl: string,
): MusicAdmin => ({
  activityCount: record._count.activities,
  album: record.album,
  artist: record.artist,
  cover: record.cover,
  coverAssetId: record.coverAssetId,
  coverAsset: record.coverAsset
    ? toMusicAssetSummary(record.coverAsset, assetPublicUrl)
    : null,
  createdAt: record.createdAt.toISOString(),
  id: record.id,
  inActivity: record._count.activities > 0,
  seconds: record.seconds,
  sourceAsset: record.sourceAsset
    ? toMusicAssetSummary(record.sourceAsset, assetPublicUrl)
    : null,
  sourceAssetId: record.sourceAssetId,
  src: record.src,
  title: record.title,
});

interface MusicTrackRecord extends Prisma.MusicGetPayload<{
  select: typeof musicTrackSelect;
}> {}

export const toMusicTrack = (record: MusicTrackRecord): MusicTrack => ({
  album: record.album,
  artist: record.artist,
  cover: record.cover,
  id: record.id,
  seconds: record.seconds,
  src: record.src,
  title: record.title,
});
