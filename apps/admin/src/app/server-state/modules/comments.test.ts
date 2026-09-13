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
import { musicRoot } from '../roots';
import { commentsKeys, invalidateCommentsAfterMutation } from './comments';
import { overviewKeys } from './overview';
import { usersKeys } from './users';

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
