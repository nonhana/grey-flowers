import type { AssetPurpose } from '@grey-flowers/contracts';

/**
 * 上传大小上限的客户端镜像。SSOT：apps/api/src/modules/assets/service.ts:33-34
 * —— MAX_UPLOAD_BYTES = 150 MB 仅用于 MUSIC_SOURCE 音源，其余五个图片用途
 * 一律 MAX_IMAGE_BYTES = 20 MB；presign 与 confirm 双重校验仍以服务端为准，
 * 这里只是让明显超限/空文件在客户端选入瞬间就被拒绝，不必等一次必败请求。
 * 客户端不能跨包 import 服务端代码，故以此镜像并注明来源。
 */
export const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_UPLOAD_BYTES = 150 * 1024 * 1024;

export const maxUploadBytes = (purpose: AssetPurpose): number =>
  purpose === 'MUSIC_SOURCE' ? MAX_AUDIO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;

/** 选入即校验：0 字节与超限文件直接拒绝，返回给用户的错误文案；通过返回 null。 */
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
