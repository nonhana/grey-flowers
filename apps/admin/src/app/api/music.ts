import type {
  MusicAdmin,
  MusicCreateInput,
  MusicListData,
  MusicListQuery,
  MusicUpdateInput,
} from '@grey-flowers/contracts';

import { musicAdminResponseSchema, musicListResponseSchema } from '@grey-flowers/contracts';

import type { Http } from './http.js';

const listSearchParams = (query: MusicListQuery) => {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.search !== undefined) params.set('search', query.search);
  if (query.incomplete !== undefined)
    params.set('incomplete', query.incomplete);
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
