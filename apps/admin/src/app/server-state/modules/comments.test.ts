import { beforeEach, describe, expect, it, vi } from 'vitest';

const commentsApi = vi.hoisted(() => ({
  list: vi.fn<
    (
      query: Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ) => Promise<unknown>
  >(),
}));

vi.mock('@/app/api/index', () => ({ apiClient: { comments: commentsApi } }));

import { queryClient } from '../client';
import { commentsRoot, musicRoot } from '../roots';
import {
  commentsKeys,
  commentsListOptions,
  invalidateCommentsAfterMutation,
} from './comments';
import { overviewKeys } from './overview';
import { usersKeys } from './users';

describe('commentsKeys', () => {
  it('list key 由规范化 query 对象组成且互不冲突', () => {
    const a = commentsKeys.list({ page: 1, pageSize: 20 });
    const b = commentsKeys.list({ page: 2, pageSize: 20 });
    expect(a).toEqual([...commentsRoot, 'list', { page: 1, pageSize: 20 }]);
    expect(a).not.toEqual(b);
    expect(
      commentsKeys.list({ page: 1, pageSize: 20, search: 'x' }),
    ).not.toEqual(a);
  });
});

describe('comments query options', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('list query 携带筛选条件并消费 signal', async () => {
    commentsApi.list.mockResolvedValue({ items: [], total: 0 });
    const query = { page: 1, pageSize: 20, search: 'hana' } as const;

    await queryClient.query(commentsListOptions(query));

    const [callQuery, callSignal] = commentsApi.list.mock.calls[0] ?? [];
    expect(callQuery).toEqual(query);
    expect(callSignal).toBeInstanceOf(AbortSignal);
  });
});

describe('invalidateCommentsAfterMutation', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('命中 comments、users 计数与 overview counts/trends', async () => {
    const listQuery = { page: 1, pageSize: 20 };
    queryClient.setQueryData(commentsKeys.list(listQuery), []);
    queryClient.setQueryData(usersKeys.list({ page: 1, pageSize: 20 }), []);
    queryClient.setQueryData(overviewKeys.counts, {});
    queryClient.setQueryData(
      overviewKeys.trend({ metric: 'comments', days: '7' }),
      [],
    );
    queryClient.setQueryData([...musicRoot, 'list', { page: 1 }], []);

    await invalidateCommentsAfterMutation();

    expect(
      queryClient.getQueryState(commentsKeys.list(listQuery))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(usersKeys.list({ page: 1, pageSize: 20 }))
        ?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(overviewKeys.counts)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(
        overviewKeys.trend({ metric: 'comments', days: '7' }),
      )?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState([...musicRoot, 'list', { page: 1 }])
        ?.isInvalidated,
    ).toBe(false);
  });
});
