import type {
  AssetDetailData,
  AssetDto,
  AssetListData,
  AssetListQuery,
  AssetPurpose,
} from '@grey-flowers/contracts';

import {
  assetConfirmResponseSchema,
  assetDeleteResponseSchema,
  assetDetailResponseSchema,
  assetListResponseSchema,
  assetSetStatusResponseSchema,
  assetUploadUrlResponseSchema,
} from '@grey-flowers/contracts';

import type { Http, HttpReadOptions } from './http.js';

const listSearchParams = (query: AssetListQuery) => {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.mediaType !== undefined) params.set('mediaType', query.mediaType);
  if (query.purpose !== undefined) params.set('purpose', query.purpose);
  if (query.status !== undefined) params.set('status', query.status);
  return params;
};

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

export const createAssetsApi = (http: Http) => {
  return {
    list: (
      query: AssetListQuery,
      options?: HttpReadOptions,
    ): Promise<AssetListData> =>
      http.get('/assets', {
        authenticated: true,
        schema: assetListResponseSchema,
        searchParams: listSearchParams(query),
        signal: options?.signal,
      }),
    detail: (id: number, options?: HttpReadOptions): Promise<AssetDetailData> =>
      http.get(`/assets/${id}`, {
        authenticated: true,
        schema: assetDetailResponseSchema,
        signal: options?.signal,
      }),
    /**
     * 受管资产直传：presign 签发 URL → 浏览器 PUT 到 R2（进度真实）→
     * confirm 回执落库。密钥不出服务端；100% 即 R2 接收完成。
     */
    upload: async (
      input: { file: File; purpose: AssetPurpose },
      onUploadProgress?: (progress: number) => void,
      metadata?: { durationMs?: number; width?: number; height?: number },
    ): Promise<AssetDto> => {
      const contentType = contentTypeOf(input.file);
      const { uploadUrl, key } = await http.post('/assets/upload-url', {
        authenticated: true,
        json: {
          contentType,
          purpose: input.purpose,
          size: input.file.size,
        },
        schema: assetUploadUrlResponseSchema,
      });

      await http.putUpload(
        uploadUrl,
        input.file,
        contentType,
        onUploadProgress,
      );

      // 图片尺寸由前端解码上报（服务端不再解析媒体）。
      const imageSize =
        input.purpose === 'MUSIC_SOURCE'
          ? undefined
          : await readImageSize(input.file);

      return http.post('/assets/confirm', {
        authenticated: true,
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
        schema: assetConfirmResponseSchema,
      });
    },
    setStatus: (
      id: number,
      status: 'AVAILABLE' | 'PENDING_CLEANUP',
    ): Promise<AssetDto> =>
      http.patch(`/assets/${id}`, {
        authenticated: true,
        json: { status },
        schema: assetSetStatusResponseSchema,
      }),
    remove: (id: number): Promise<AssetDto> =>
      http.delete(`/assets/${id}`, {
        authenticated: true,
        schema: assetDeleteResponseSchema,
      }),
  };
};

export type AssetsApi = ReturnType<typeof createAssetsApi>;
