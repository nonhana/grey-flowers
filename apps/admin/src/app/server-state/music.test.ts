import { beforeEach, describe, expect, it, vi } from 'vitest';

const musicApi = vi.hoisted(() => ({
  list: vi.fn<
    (
      query: Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ) => Promise<unknown>
  >(),
  detail:
    vi.fn<
      (id: number, options?: { signal?: AbortSignal }) => Promise<unknown>
    >(),
}));

vi.mock('@/app/api/index', () => ({ apiClient: { music: musicApi } }));

import { activityKeys } from './activities';
import { queryClient } from './client';
import {
  invalidateMusicAfterMutation,
  musicDetailOptions,
  musicKeys,
  musicListOptions,
  musicPickerOptions,
} from './music';
import { assetsRoot, musicRoot, overviewRoot } from './roots';

describe('musicKeys', () => {
  it('list/detail/picker 家族互不冲突', () => {
    const listQuery = { page: 1, pageSize: 12 };
    expect(musicKeys.list(listQuery)).toEqual([
      ...musicRoot,
      'list',
      listQuery,
    ]);
    expect(musicKeys.detail(3)).toEqual([...musicRoot, 'detail', 3]);
    expect(musicKeys.picker(1, listQuery)).toEqual([
      ...musicRoot,
      'picker',
      1,
      listQuery,
    ]);
    expect(musicKeys.picker(2, listQuery)).not.toEqual(
      musicKeys.picker(1, listQuery),
    );
  });
});

describe('music query options', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('list query 携带 search/incomplete 条件并消费 signal', async () => {
    musicApi.list.mockResolvedValue({ items: [], total: 0 });
    const query = {
      page: 2,
      pageSize: 12,
      search: 'hana',
      incomplete: 'true',
    } as const;

    await queryClient.query(musicListOptions(query));

    const [callQuery, callOptions] = musicApi.list.mock.calls[0] ?? [];
    expect(callQuery).toEqual(query);
    expect(callOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(queryClient.getQueryState(musicKeys.list(query))?.data).toEqual({
      items: [],
      total: 0,
    });
  });

  it('picker query 复用 list 读路径并消费 signal', async () => {
    musicApi.list.mockResolvedValue({ items: [], total: 0 });
    const query = { page: 1, pageSize: 20 } as const;

    await queryClient.query(musicPickerOptions(1, query));

    const [callQuery, callOptions] = musicApi.list.mock.calls[0] ?? [];
    expect(callQuery).toEqual(query);
    expect(callOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(queryClient.getQueryState(musicKeys.picker(1, query))?.data).toEqual(
      { items: [], total: 0 },
    );
  });

  it('detail query 消费 signal', async () => {
    musicApi.detail.mockResolvedValue({ id: 3 });

    await queryClient.query(musicDetailOptions(3));

    const [id, callOptions] = musicApi.detail.mock.calls[0] ?? [];
    expect(id).toBe(3);
    expect(callOptions?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('invalidateMusicAfterMutation', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('命中 music 全家族（含 picker）、overview counts 与 activities 家族，不扩散到其他域', async () => {
    const listQuery = { page: 1, pageSize: 12 };
    queryClient.setQueryData(musicKeys.list(listQuery), []);
    queryClient.setQueryData(musicKeys.picker(1, listQuery), []);
    queryClient.setQueryData(musicKeys.detail(3), {});
    queryClient.setQueryData([...overviewRoot, 'counts'], {});
    queryClient.setQueryData([...assetsRoot, 'list', { page: 1 }], []);
    queryClient.setQueryData(activityKeys.list({ page: 1, pageSize: 10 }), []);

    await invalidateMusicAfterMutation();

    expect(
      queryClient.getQueryState(musicKeys.list(listQuery))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(musicKeys.picker(1, listQuery))?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(musicKeys.detail(3))?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState([...overviewRoot, 'counts'])?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState([...assetsRoot, 'list', { page: 1 }])
        ?.isInvalidated,
    ).toBe(false);
    expect(
      queryClient.getQueryState(activityKeys.list({ page: 1, pageSize: 10 }))
        ?.isInvalidated,
    ).toBe(true);
  });
});
