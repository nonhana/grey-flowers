import type {
  AssetMediaType,
  AssetPurpose,
  AssetStatus,
} from '@grey-flowers/contracts';

import { isApiRequestError } from '@/app/api/errors.js';

export const purposeLabels: Record<AssetPurpose, string> = {
  ACTIVITY_IMAGE: '动态图片',
  ARTICLE_COVER: '文章封面',
  ARTICLE_INLINE: '正文插图',
  CATEGORY_COVER: '分类封面',
  MUSIC_COVER: '音乐封面',
  MUSIC_SOURCE: '音乐音源',
};

export const purposeOptions: readonly AssetPurpose[] = [
  'ARTICLE_COVER',
  'ARTICLE_INLINE',
  'CATEGORY_COVER',
  'ACTIVITY_IMAGE',
  'MUSIC_SOURCE',
  'MUSIC_COVER',
];

export const mediaTypeLabels: Record<AssetMediaType, string> = {
  AUDIO: '音频',
  IMAGE: '图片',
};

export const statusLabels: Record<AssetStatus, string> = {
  AVAILABLE: '可用',
  DELETED: '已删除',
  PENDING_CLEANUP: '待清理',
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'] as const;
  let value = bytes;
  let unit = 'B';

  for (const candidate of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = candidate;
  }

  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
};

export const formatDateTime = (iso: string) => {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
};

export const formatDurationMs = (durationMs: number) => {
  const seconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};

export const assetErrorMessage = (error: unknown) => {
  if (isApiRequestError(error)) {
    switch (error.code) {
      case 'ASSET_PAYLOAD_TOO_LARGE':
        return '文件超过该用途的大小上限。';
      case 'ASSET_REFERENCED':
        return '该资产仍被引用，不能在当前状态执行此操作。';
      case 'UNSUPPORTED_MEDIA_TYPE':
        return '文件类型不受支持，或与声明的类型不一致。';
      case 'UPLOAD_FAILED':
        return '上传失败，请重试。';
      case 'AUTH_FORBIDDEN':
        return '当前账户没有执行该操作的权限。';
      default:
        return error.message;
    }
  }

  return '暂时无法完成此操作。';
};
