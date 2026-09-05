import { describe, expect, it, vi } from 'vitest';

const overviewApi = vi.hoisted(() => ({
  get: vi.fn<(options?: { signal?: AbortSignal }) => Promise<unknown>>(),
  trends:
    vi.fn<
      (query: unknown, options?: { signal?: AbortSignal }) => Promise<unknown>
    >(),
  calendar: vi.fn<(options?: { signal?: AbortSignal }) => Promise<unknown>>(),
}));

vi.mock('@/app/api/index', () => ({ apiClient: { overview: overviewApi } }));

import { createQueryClient } from './client';
import {
  overviewCalendarOptions,
  overviewCountsOptions,
  overviewKeys,
  overviewTrendOptions,
} from './overview';
import { overviewRoot } from './roots';

describe('overviewKeys', () => {
  it('统一以 [admin, overview] 为前缀', () => {
    expect(overviewKeys.counts).toEqual([...overviewRoot, 'counts']);
    expect(overviewKeys.calendar).toEqual([...overviewRoot, 'calendar']);
  });

  it('trend key 由规范化 query 对象组成且互不冲突', () => {
    expect(overviewKeys.trend({ metric: 'articles', days: '14' })).toEqual([
      ...overviewRoot,
      'trend',
      { metric: 'articles', days: '14' },
    ]);

    expect(overviewKeys.trend({ metric: 'articles', days: '7' })).not.toEqual(
      overviewKeys.trend({ metric: 'articles', days: '14' }),
    );
    expect(overviewKeys.trend({ metric: 'users', days: '14' })).not.toEqual(
      overviewKeys.trend({ metric: 'articles', days: '14' }),
    );
  });
});

describe('overview query options', () => {
  it('counts query 通过 QueryClient 执行并消费 signal', async () => {
    const client = createQueryClient();
    overviewApi.get.mockResolvedValue({ counts: { n: 1 } });

    await client.query(overviewCountsOptions());
    const [callOptions] = overviewApi.get.mock.calls[0] ?? [];
    expect(callOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(client.getQueryState(overviewKeys.counts)?.data).toEqual({
      counts: { n: 1 },
    });
  });

  it('trend query 以 key 隔离执行并携带 query 参数', async () => {
    const client = createQueryClient();
    const query = { metric: 'comments', days: '7' } as const;
    overviewApi.trends.mockResolvedValue({ points: [] });

    await client.query(overviewTrendOptions(query));
    const [callQuery, callOptions] = overviewApi.trends.mock.calls[0] ?? [];
    expect(callQuery).toEqual(query);
    expect(callOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(client.getQueryState(overviewKeys.trend(query))?.data).toEqual({
      points: [],
    });
  });

  it('calendar query 通过 QueryClient 执行并消费 signal', async () => {
    const client = createQueryClient();
    overviewApi.calendar.mockResolvedValue({ days: [] });

    await client.query(overviewCalendarOptions());
    const [callOptions] = overviewApi.calendar.mock.calls[0] ?? [];
    expect(callOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(client.getQueryState(overviewKeys.calendar)?.data).toEqual({
      days: [],
    });
  });
});
