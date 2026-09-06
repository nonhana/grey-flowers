import type { AssetListQuery, AssetPurpose } from '@grey-flowers/contracts';

import {
  assetConfirmResponseSchema,
  assetDeleteResponseSchema,
  assetDetailResponseSchema,
  assetListResponseSchema,
  assetSetStatusResponseSchema,
  assetUploadUrlResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

import { toSearchParams } from '../shared';
import { putUpload } from '../upload';

const EXTENSION_MIME: Record<string, string> = {
  aac: 'audio/aac',
  flac: 'audio/flac',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  png: 'image/png',
  wav: 'audio/wav',
  webp: 'image/webp',
};

/** File.type 可能为空（扩展名识别型系统），按文件名回退推断；未知返回空串交服务端白名单拒绝。 */
export const contentTypeOf = (file: File): string => {
  if (file.type.trim().length > 0) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[ext] ?? '';
};

/** 图片直传前读取宽高（资产详情展示用）；解码失败静默跳过。 */
const readImageSize = async (
  file: File,
): Promise<{ height: number; width: number } | undefined> => {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { height: bitmap.height, width: bitmap.width };
    bitmap.close();
    return size;
  } catch {
    return undefined;
  }
};

export const createAssetsApi = (channel: Channel) => ({
  list: (query: AssetListQuery, signal?: AbortSignal) =>
    channel.get('/assets', assetListResponseSchema, {
      searchParams: toSearchParams(query),
      signal,
    }),
  detail: (id: number, signal?: AbortSignal) =>
    channel.get(`/assets/${id}`, assetDetailResponseSchema, { signal }),
  /**
   * 受管资产直传：presign 签发 URL → 浏览器 PUT 到 R2（进度真实）→
   * confirm 回执落库。密钥不出服务端；100% 即 R2 接收完成。
   */
  upload: async (
    input: { file: File; purpose: AssetPurpose },
    onUploadProgress?: (progress: number) => void,
    metadata?: { durationMs?: number; width?: number; height?: number },
    signal?: AbortSignal,
  ) => {
    const contentType = contentTypeOf(input.file);
    const { uploadUrl, key } = await channel.post(
      '/assets/upload-url',
      assetUploadUrlResponseSchema,
      {
        json: {
          contentType,
          purpose: input.purpose,
          size: input.file.size,
        },
        signal,
      },
    );

    await putUpload(
      uploadUrl,
      input.file,
      contentType,
      onUploadProgress,
      signal,
    );

    // 图片尺寸由前端解码上报（服务端不再解析媒体）。
    const imageSize =
      input.purpose === 'MUSIC_SOURCE'
        ? undefined
        : await readImageSize(input.file);

    return channel.post('/assets/confirm', assetConfirmResponseSchema, {
      json: {
        key,
        size: input.file.size,
        ...(metadata?.durationMs === undefined
          ? {}
          : { durationMs: metadata.durationMs }),
        ...((imageSize ?? metadata?.width !== undefined)
          ? {
              width: metadata?.width ?? imageSize?.width,
              height: metadata?.height ?? imageSize?.height,
            }
          : {}),
      },
      signal,
    });
  },
  setStatus: (id: number, status: 'AVAILABLE' | 'PENDING_CLEANUP') =>
    channel.patch(`/assets/${id}`, assetSetStatusResponseSchema, {
      json: { status },
    }),
  remove: (id: number) =>
    channel.delete(`/assets/${id}`, assetDeleteResponseSchema),
});

export type AssetsApi = ReturnType<typeof createAssetsApi>;
