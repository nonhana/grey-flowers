import type {
  ActivityAdmin,
  ActivityImageOutput,
  ActivityPublic,
} from '@grey-flowers/contracts';
import type { Prisma } from '@grey-flowers/db';

import { musicTrackSelect, toMusicTrack } from '../music/contracts';

export const activityImageAssetSelect = {
  asset: { select: { id: true, storageKey: true } },
  position: true,
} satisfies Prisma.ActivityImageAssetSelect;

export const activityMusicSelect = {
  music: { select: musicTrackSelect },
} satisfies Prisma.ActivityMusicSelect;

/** 管理读：Admin 不渲染 AST → 不含 contentMarkdown。music 按 id asc 稳定排序。 */
export const activityAdminSelect = {
  content: true,
  editedAt: true,
  id: true,
  images: true,
  imageAssets: { select: activityImageAssetSelect },
  music: { select: activityMusicSelect, orderBy: { music: { id: 'asc' } } },
  publishedAt: true,
} satisfies Prisma.ActivitySelect;

/** 公开读：追加 contentMarkdown 原样透传（主站渲染需要）。 */
export const activityPublicSelect = {
  ...activityAdminSelect,
  contentMarkdown: true,
} satisfies Prisma.ActivitySelect;

interface ActivityAdminRecord extends Prisma.ActivityGetPayload<{
  select: typeof activityAdminSelect;
}> {}

interface ActivityImageAssetRecord {
  asset: { id: number; storageKey: string };
  position: number;
}

/** images 列是有序 URL 数组（position = 下标）；imageAssets 行把受管资产的 position 回映射成 assetId。 */
const toActivityImages = (
  images: string[],
  rows: ActivityImageAssetRecord[],
): ActivityImageOutput[] =>
  images.map((url, position) => {
    const row = rows.find((item) => item.position === position);
    return { assetId: row?.asset.id ?? null, url };
  });

export const toActivityAdmin = (
  record: ActivityAdminRecord,
): ActivityAdmin => ({
  content: record.content,
  editedAt: record.editedAt.toISOString(),
  id: record.id,
  images: toActivityImages(record.images, record.imageAssets),
  music: record.music.map((row) => toMusicTrack(row.music)),
  publishedAt: record.publishedAt.toISOString(),
});

interface ActivityPublicRecord extends Prisma.ActivityGetPayload<{
  select: typeof activityPublicSelect;
}> {}

export const toActivityPublic = (
  record: ActivityPublicRecord,
  commentCount: number,
): ActivityPublic => ({
  commentCount,
  content: record.content,
  contentMarkdown: record.contentMarkdown,
  editedAt: record.editedAt.toISOString(),
  id: record.id,
  images: record.images,
  music: record.music.map((row) => toMusicTrack(row.music)),
  publishedAt: record.publishedAt.toISOString(),
});
