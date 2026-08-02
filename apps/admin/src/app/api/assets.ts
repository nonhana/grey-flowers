import type {
  AssetDetailData,
  AssetDto,
  AssetListData,
  AssetListQuery,
  AssetPurpose,
} from '@grey-flowers/contracts';

import {
  assetDeleteResponseSchema,
  assetDetailResponseSchema,
  assetListResponseSchema,
  assetSetStatusResponseSchema,
  assetUploadResponseSchema,
} from '@grey-flowers/contracts';

import type { Http } from './http.js';

function listSearchParams(query: AssetListQuery) {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.mediaType !== undefined) params.set('mediaType', query.mediaType);
  if (query.purpose !== undefined) params.set('purpose', query.purpose);
  if (query.status !== undefined) params.set('status', query.status);
  return params;
}

export function createAssetsApi(http: Http) {
  return {
    list: (query: AssetListQuery): Promise<AssetListData> =>
      http.get('/assets', {
        authenticated: true,
        schema: assetListResponseSchema,
        searchParams: listSearchParams(query),
      }),
    detail: (id: number): Promise<AssetDetailData> =>
      http.get(`/assets/${id}`, {
        authenticated: true,
        schema: assetDetailResponseSchema,
      }),
    upload: (
      input: { file: File; purpose: AssetPurpose },
      onUploadProgress?: (progress: number) => void,
    ): Promise<AssetDto> => {
      const form = new FormData();
      form.append('file', input.file);
      form.append('purpose', input.purpose);
      return http.upload('/assets/upload', {
        authenticated: true,
        body: form,
        onUploadProgress,
        schema: assetUploadResponseSchema,
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
}

export type AssetsApi = ReturnType<typeof createAssetsApi>;
