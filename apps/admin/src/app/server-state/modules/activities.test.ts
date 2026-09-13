import { beforeEach, describe, expect, it, vi } from 'vitest';

const activitiesApi = vi.hoisted(() => ({
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

vi.mock('@/app/api/index', () => ({
  apiClient: { activities: activitiesApi },
}));

import { queryClient } from '../client';
import { musicRoot } from '../roots';
import { activityKeys, invalidateActivitiesAfterMutation } from './activities';
import { overviewKeys } from './overview';

describe('invalidateActivitiesAfterMutation', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('命中 activities 全家族与 overview 全部三族', async () => {
    const listQuery = { page: 1, pageSize: 10 };
    queryClient.setQueryData(activityKeys.list(listQuery), []);
    queryClient.setQueryData(activityKeys.detail(7), {});
    queryClient.setQueryData(overviewKeys.counts, {});
    queryClient.setQueryData(
      overviewKeys.trend({ metric: 'articles', days: '14' }),
      [],
    );
    queryClient.setQueryData(overviewKeys.calendar, []);
    queryClient.setQueryData([...musicRoot, 'list', { page: 1 }], []);

    await invalidateActivitiesAfterMutation();

    expect(
      queryClient.getQueryState(activityKeys.list(listQuery))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(activityKeys.detail(7))?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(overviewKeys.counts)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(
        overviewKeys.trend({ metric: 'articles', days: '14' }),
      )?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(overviewKeys.calendar)?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState([...musicRoot, 'list', { page: 1 }])
        ?.isInvalidated,
    ).toBe(false);
  });
});
