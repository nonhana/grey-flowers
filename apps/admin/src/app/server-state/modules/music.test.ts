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

import { queryClient } from '../client';
import { assetsRoot, overviewRoot } from '../roots';
import { activityKeys } from './activities';
import { invalidateMusicAfterMutation, musicKeys } from './music';

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
