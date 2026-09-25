import type { AssetMediaType } from '@grey-flowers/contracts';

import { assetMediaTypeProfiles } from '@grey-flowers/contracts';

/** 上限与 MIME 白名单 SSOT 在 contracts（assetMediaTypeProfiles）；此处只做选入瞬间的预检与文案。 */
export const maxUploadBytes = (mediaType: AssetMediaType): number =>
  assetMediaTypeProfiles[mediaType].maxBytes;

export const maxUploadMb = (mediaType: AssetMediaType): number =>
  Math.round(maxUploadBytes(mediaType) / (1024 * 1024));

const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

/** 选入即校验：0 字节与超限文件直接拒绝，返回给用户的错误文案；通过返回 null */
export const uploadSizeError = (
  file: File,
  mediaType: AssetMediaType,
): string | null => {
  if (file.size === 0) return '不能上传空文件。';
  const { maxBytes } = assetMediaTypeProfiles[mediaType];
  if (file.size > maxBytes) {
    return mediaType === 'AUDIO'
      ? `音频文件超出大小上限（${mb(maxBytes)} MB）。`
      : `图片文件超出大小上限（${mb(maxBytes)} MB）。`;
  }
  return null;
};
