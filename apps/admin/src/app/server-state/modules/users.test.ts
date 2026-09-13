import { beforeEach, describe, expect, it, vi } from 'vitest';

const usersApi = vi.hoisted(() => ({
  list: vi.fn<
    (
      query: Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ) => Promise<unknown>
  >(),
  detail:
    vi.fn<
      (
        id: number,
        query: Record<string, unknown> | undefined,
        options?: { signal?: AbortSignal },
      ) => Promise<unknown>
    >(),
}));

vi.mock('@/app/api/index', () => ({ apiClient: { users: usersApi } }));

import { queryClient } from '../client';
import { assetsRoot, commentsRoot } from '../roots';
import { overviewKeys } from './overview';
import { invalidateUsersAfterMutation, usersKeys } from './users';

describe('invalidateUsersAfterMutation', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('命中 users、comments 与 overview counts/trends', async () => {
    const listQuery = { page: 1, pageSize: 20 };
    queryClient.setQueryData(usersKeys.list(listQuery), []);
    queryClient.setQueryData(usersKeys.detail(3, 1, 10), {});
    queryClient.setQueryData([...commentsRoot, 'list', listQuery], []);
    queryClient.setQueryData(overviewKeys.counts, {});
    queryClient.setQueryData([...assetsRoot, 'list', { page: 1 }], []);
    await invalidateUsersAfterMutation();

    expect(
      queryClient.getQueryState(usersKeys.list(listQuery))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(usersKeys.detail(3, 1, 10))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState([...commentsRoot, 'list', listQuery])
        ?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(overviewKeys.counts)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState([...assetsRoot, 'list', { page: 1 }])
        ?.isInvalidated,
    ).toBe(false);
  });
});
