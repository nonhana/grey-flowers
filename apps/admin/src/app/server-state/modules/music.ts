import type { MusicListQuery } from '@grey-flowers/contracts';

import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from '../client';
import { activitiesRoot, musicRoot } from '../roots';
import { overviewKeys } from './overview';

export const musicKeys = {
  list: (query: MusicListQuery) => [...musicRoot, 'list', query] as const,
  picker: (session: number, query: MusicListQuery) =>
    [...musicRoot, 'picker', session, query] as const,
  detail: (id: number) => [...musicRoot, 'detail', id] as const,
};

export const musicListOptions = (query: MusicListQuery) =>
  queryOptions({
    queryKey: musicKeys.list(query),
    queryFn: ({ signal }) => apiClient.music.list(query, signal),
  });

export const musicPickerOptions = (session: number, query: MusicListQuery) =>
  queryOptions({
    queryKey: musicKeys.picker(session, query),
    queryFn: ({ signal }) => apiClient.music.list(query, signal),
  });

export const musicDetailOptions = (id: number) =>
  queryOptions({
    queryKey: musicKeys.detail(id),
    queryFn: ({ signal }) => apiClient.music.detail(id, signal),
  });

/** 音乐增删改后的规定失效：music 全家族、activities（metadata 内嵌进动态投影）、overview counts。 */
export const invalidateMusicAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: musicRoot }),
    queryClient.invalidateQueries({ queryKey: activitiesRoot }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.counts }),
  ]);
};
