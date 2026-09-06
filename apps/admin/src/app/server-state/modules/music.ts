import type { MusicListQuery } from '@grey-flowers/contracts';

import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from '../client';
import { activitiesRoot, musicRoot } from '../roots';
import { overviewKeys } from './overview';

export const musicKeys = {
  list: (query: MusicListQuery) => [...musicRoot, 'list', query] as const,
  /** Picker 每次打开用独立 session：重开永远全新列表，不闪旧结果。 */
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

/**
 * 音乐增删改后的规定失效：music 全家族 + overview 计数。
 * music metadata 同时内嵌进 activity 投影，activities 家族一并失效。
 */
export const invalidateMusicAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: musicRoot }),
    queryClient.invalidateQueries({ queryKey: activitiesRoot }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.counts }),
  ]);
};
