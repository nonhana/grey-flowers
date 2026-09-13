import type {
  MusicCreateInput,
  MusicListQuery,
  MusicUpdateInput,
} from '@grey-flowers/contracts';

import {
  musicAdminResponseSchema,
  musicListResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

import { toSearchParams } from '../shared';

export const createMusicApi = (channel: Channel) => ({
  list: (query: MusicListQuery, signal?: AbortSignal) =>
    channel.get('/music', musicListResponseSchema, {
      searchParams: toSearchParams(query),
      signal,
    }),
  detail: (id: number, signal?: AbortSignal) =>
    channel.get(`/music/${id}`, musicAdminResponseSchema, { signal }),
  create: (input: MusicCreateInput) =>
    channel.post('/music', musicAdminResponseSchema, { json: input }),
  update: (id: number, input: MusicUpdateInput) =>
    channel.patch(`/music/${id}`, musicAdminResponseSchema, { json: input }),
  remove: (id: number) =>
    channel.delete(`/music/${id}`, musicAdminResponseSchema),
});

export type MusicApi = ReturnType<typeof createMusicApi>;
