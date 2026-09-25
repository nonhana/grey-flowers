import type { AssetMediaType, AssetStatus } from '@grey-flowers/contracts';

import { apiErrorMessage } from '@/lib/error-message';

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
    ASSET_PAYLOAD_TOO_LARGE: '文件超过大小上限。',
    ASSET_REFERENCED: '该资产仍被引用，不能在当前状态执行此操作。',
    UNSUPPORTED_MEDIA_TYPE: '文件类型不受支持，或与声明的类型不一致。',
    UPLOAD_FAILED: '上传失败，请重试。',
  });
