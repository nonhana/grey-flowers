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

import { queryClient } from './client';
import { overviewKeys } from './overview';
import { assetsRoot, commentsRoot, usersRoot } from './roots';
import {
  invalidateUsersAfterMutation,
  usersDetailOptions,
  usersKeys,
  usersListOptions,
} from './users';

describe('usersKeys', () => {
  it('detail key 由用户 id 与评论分页组成', () => {
    expect(usersKeys.detail(3, 1, 10)).toEqual([
      ...usersRoot,
      'detail',
      3,
      { commentPage: 1, commentPageSize: 10 },
    ]);
    expect(usersKeys.detail(3, 2, 10)).not.toEqual(usersKeys.detail(3, 1, 10));
    expect(usersKeys.detail(4, 1, 10)).not.toEqual(usersKeys.detail(3, 1, 10));
  });
});

describe('users query options', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('list query 携带筛选并消费 signal', async () => {
    usersApi.list.mockResolvedValue({ items: [], total: 0 });
    const query = { page: 1, pageSize: 20, role: 'USER' } as const;

    await queryClient.query(usersListOptions(query));

    const [callQuery, callSignal] = usersApi.list.mock.calls[0] ?? [];
    expect(callQuery).toEqual(query);
    expect(callSignal).toBeInstanceOf(AbortSignal);
  });

  it('detail query 携带评论分页并消费 signal', async () => {
    usersApi.detail.mockResolvedValue({ user: {} });

    await queryClient.query(
      usersDetailOptions(3, { commentPage: 2, commentPageSize: 10 }),
    );

    const [id, callQuery, callSignal] = usersApi.detail.mock.calls[0] ?? [];
    expect(id).toBe(3);
    expect(callQuery).toEqual({ commentPage: 2, commentPageSize: 10 });
    expect(callSignal).toBeInstanceOf(AbortSignal);
  });
});

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
