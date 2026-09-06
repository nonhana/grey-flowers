import { beforeEach, describe, expect, it, vi } from 'vitest';

const assetsApi = vi.hoisted(() => ({
  list: vi.fn<
    (
      query: Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ) => Promise<unknown>
  >(),
}));

vi.mock('@/app/api/index', () => ({ apiClient: { assets: assetsApi } }));

import type { AssetListData } from '@grey-flowers/contracts';

import { queryClient } from '../client';
import { overviewRoot, usersRoot } from '../roots';
import {
  assetsKeys,
  assetsPickerOptions,
  invalidateAssetsAfterMutation,
  markAssetsStale,
} from './assets';

const pageOf = (count: number, total: number): AssetListData => ({
  items: Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    purpose: 'ARTICLE_COVER',
    mediaType: 'IMAGE',
    status: 'AVAILABLE',
    mimeType: 'image/webp',
    byteSize: 1024,
    storageKey: `k/${index}`,
    deliveryUrl: 'https://cdn.example.com/a.webp',
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  })),
  page: 1,
  pageSize: 12,
  total,
});

describe('assetsKeys', () => {
  it('picker key 携带 purpose/status/pageSize 且按 session 隔离', () => {
    expect(assetsKeys.picker('ARTICLE_COVER', 1)).toEqual([
      'admin',
      'assets',
      'picker',
      1,
      { pageSize: 12, purpose: 'ARTICLE_COVER', status: 'AVAILABLE' },
    ]);
    expect(assetsKeys.picker('ARTICLE_COVER', 2)).not.toEqual(
      assetsKeys.picker('ARTICLE_COVER', 1),
    );
    expect(assetsKeys.picker('MUSIC_COVER', 1)).not.toEqual(
      assetsKeys.picker('ARTICLE_COVER', 1),
    );
  });
});

describe('assetsPickerOptions getNextPageParam', () => {
  const options = assetsPickerOptions('ARTICLE_COVER', 1);

  it('未满一页且有总量时返回下一页', () => {
    const lastPage = pageOf(12, 30);
    const allPages = [lastPage];
    expect(options.getNextPageParam?.(lastPage, allPages, 1, [1])).toBe(2);
  });

  it('取满总量后返回 undefined', () => {
    const page1 = pageOf(12, 24);
    const page2 = pageOf(12, 24);
    expect(
      options.getNextPageParam?.(page2, [page1, page2], 2, [1, 2]),
    ).toBeUndefined();
  });

  it('空页返回 undefined 防止重复追加', () => {
    const lastPage = pageOf(0, 24);
    expect(
      options.getNextPageParam?.(lastPage, [lastPage], 1, [1]),
    ).toBeUndefined();
  });
});

describe('invalidation', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('mutation 失效命中 assets 全家族与 overview counts', async () => {
    queryClient.setQueryData(assetsKeys.list({ page: 1, pageSize: 12 }), []);
    queryClient.setQueryData(assetsKeys.detail(3), {});
    queryClient.setQueryData(assetsKeys.picker('ARTICLE_COVER', 1), []);
    queryClient.setQueryData([...overviewRoot, 'counts'], {});
    queryClient.setQueryData([...usersRoot, 'list'], []);

    await invalidateAssetsAfterMutation();

    expect(
      queryClient.getQueryState(assetsKeys.list({ page: 1, pageSize: 12 }))
        ?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(assetsKeys.detail(3))?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(assetsKeys.picker('ARTICLE_COVER', 1))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState([...overviewRoot, 'counts'])?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState([...usersRoot, 'list'])?.isInvalidated,
    ).toBe(false);
  });

  it('markAssetsStale 只标记失效，不触发 refetch', () => {
    queryClient.setQueryData(assetsKeys.list({ page: 1, pageSize: 12 }), []);

    markAssetsStale();

    expect(
      queryClient.getQueryState(assetsKeys.list({ page: 1, pageSize: 12 }))
        ?.isInvalidated,
    ).toBe(true);
    expect(assetsApi.list).not.toHaveBeenCalled();
  });
});
