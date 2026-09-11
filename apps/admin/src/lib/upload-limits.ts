import type { AssetPurpose } from '@grey-flowers/contracts';

/** 上传大小上限的客户端镜像。SSOT：apps/api/src/modules/assets/service.ts:33-34（音源 150 MB 仅 MUSIC_SOURCE，其余图片用途 20 MB）；presign/confirm 以服务端为准，这里让明显超限/空文件在选入瞬间被拒；客户端不能跨包 import 服务端代码 */
export const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_UPLOAD_BYTES = 150 * 1024 * 1024;

export const maxUploadBytes = (purpose: AssetPurpose): number =>
  purpose === 'MUSIC_SOURCE' ? MAX_AUDIO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;

/** 选入即校验：0 字节与超限文件直接拒绝，返回给用户的错误文案；通过返回 null */
export const uploadSizeError = (
  file: File,
  purpose: AssetPurpose,
): string | null => {
  if (file.size === 0) return '不能上传空文件。';
  if (file.size > maxUploadBytes(purpose)) {
    return purpose === 'MUSIC_SOURCE'
      ? '音频文件超出大小上限（150 MB）。'
      : '图片文件超出大小上限（20 MB）。';
  }
  return null;
};
