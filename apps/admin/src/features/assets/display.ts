import type {
  AssetMediaType,
  AssetPurpose,
  AssetStatus,
} from '@grey-flowers/contracts';

import { apiErrorMessage } from '@/lib/error-message.js';

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

export const assetErrorMessage = (error: unknown) =>
  apiErrorMessage(error, {
    ASSET_PAYLOAD_TOO_LARGE: '文件超过该用途的大小上限。',
    ASSET_REFERENCED: '该资产仍被引用，不能在当前状态执行此操作。',
    UNSUPPORTED_MEDIA_TYPE: '文件类型不受支持，或与声明的类型不一致。',
    UPLOAD_FAILED: '上传失败，请重试。',
  });
