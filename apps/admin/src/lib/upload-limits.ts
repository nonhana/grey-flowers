import type { AssetPurpose } from '@grey-flowers/contracts';

import { assetUploadProfiles } from '@grey-flowers/contracts';

/** 上限与 MIME 白名单 SSOT 在 contracts（assetUploadProfiles）；此处只做选入瞬间的预检与文案。 */
export const maxUploadBytes = (purpose: AssetPurpose): number =>
  assetUploadProfiles[purpose].maxBytes;

export const maxUploadMb = (purpose: AssetPurpose): number =>
  Math.round(maxUploadBytes(purpose) / (1024 * 1024));

const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

/** 选入即校验：0 字节与超限文件直接拒绝，返回给用户的错误文案；通过返回 null */
export const uploadSizeError = (
  file: File,
  purpose: AssetPurpose,
): string | null => {
  if (file.size === 0) return '不能上传空文件。';
  const { maxBytes, mediaType } = assetUploadProfiles[purpose];
  if (file.size > maxBytes) {
    return mediaType === 'AUDIO'
      ? `音频文件超出大小上限（${mb(maxBytes)} MB）。`
      : `图片文件超出大小上限（${mb(maxBytes)} MB）。`;
  }
  return null;
};
