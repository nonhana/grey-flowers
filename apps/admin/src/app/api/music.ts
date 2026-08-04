import type {
  MusicAdmin,
  MusicCreateInput,
  MusicListData,
  MusicListQuery,
  MusicParseData,
  MusicUpdateInput,
} from '@grey-flowers/contracts';

import {
  musicAdminResponseSchema,
  musicListResponseSchema,
  musicParseResponseSchema,
} from '@grey-flowers/contracts';

import type { Http } from './http.js';

const listSearchParams = (query: MusicListQuery) => {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.search !== undefined) params.set('search', query.search);
  return params;
};

export const createMusicApi = (http: Http) => {
  return {
    list: (query: MusicListQuery): Promise<MusicListData> =>
      http.get('/music', {
        authenticated: true,
        schema: musicListResponseSchema,
        searchParams: listSearchParams(query),
      }),
    detail: (id: number): Promise<MusicAdmin> =>
      http.get(`/music/${id}`, {
        authenticated: true,
        schema: musicAdminResponseSchema,
      }),
    parse: (sourceAssetId: number): Promise<MusicParseData> =>
      http.post('/music/parse', {
        authenticated: true,
        json: { sourceAssetId },
        schema: musicParseResponseSchema,
      }),
    create: (input: MusicCreateInput): Promise<MusicAdmin> =>
      http.post('/music', {
        authenticated: true,
        json: input,
        schema: musicAdminResponseSchema,
      }),
    update: (id: number, input: MusicUpdateInput): Promise<MusicAdmin> =>
      http.patch(`/music/${id}`, {
        authenticated: true,
        json: input,
        schema: musicAdminResponseSchema,
      }),
    remove: (id: number): Promise<MusicAdmin> =>
      http.delete(`/music/${id}`, {
        authenticated: true,
        schema: musicAdminResponseSchema,
      }),
  };
};

export type MusicApi = ReturnType<typeof createMusicApi>;
