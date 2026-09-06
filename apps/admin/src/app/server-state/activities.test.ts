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

import {
  activityDetailOptions,
  activityKeys,
  activityListOptions,
  invalidateActivitiesAfterMutation,
} from './activities';
import { queryClient } from './client';
import { overviewKeys } from './overview';
import { activitiesRoot, musicRoot } from './roots';

describe('activityKeys', () => {
  it('list 与 detail 家族互不冲突', () => {
    const listQuery = { page: 1, pageSize: 10 };
    expect(activityKeys.list(listQuery)).toEqual([
      ...activitiesRoot,
      'list',
      listQuery,
    ]);
    expect(activityKeys.detail(7)).toEqual([...activitiesRoot, 'detail', 7]);
    expect(activityKeys.list(listQuery)).not.toEqual(activityKeys.detail(7));
  });
});

describe('activity query options', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('list query 携带 search 条件并消费 signal', async () => {
    activitiesApi.list.mockResolvedValue({ items: [], total: 0 });
    const query = { page: 1, pageSize: 10, search: 'hana' } as const;

    await queryClient.query(activityListOptions(query));

    const [callQuery, callSignal] = activitiesApi.list.mock.calls[0] ?? [];
    expect(callQuery).toEqual(query);
    expect(callSignal).toBeInstanceOf(AbortSignal);
  });

  it('detail query 消费 signal', async () => {
    activitiesApi.detail.mockResolvedValue({ id: 7 });

    await queryClient.query(activityDetailOptions(7));

    const [id, callSignal] = activitiesApi.detail.mock.calls[0] ?? [];
    expect(id).toBe(7);
    expect(callSignal).toBeInstanceOf(AbortSignal);
  });
});

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
