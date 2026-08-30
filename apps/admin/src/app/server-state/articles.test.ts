import { beforeEach, describe, expect, it, vi } from 'vitest';

const articlesApi = vi.hoisted(() => ({
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

vi.mock('@/app/api/index.js', () => ({ apiClient: { articles: articlesApi } }));

import {
  articlesKeys,
  invalidateArticlesAfterContentSave,
  invalidateArticlesAfterMutation,
} from './articles.js';
import { queryClient } from './client.js';
import { overviewKeys } from './overview.js';
import { musicRoot } from './roots.js';
import { taxonomyKeys } from './taxonomy.js';

describe('invalidateArticlesAfterContentSave', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('save 窄失效：只命中 articles 家族，不扩散到 taxonomy 与 overview', async () => {
    const listQuery = { status: 'all', page: 1, pageSize: 20 } as const;
    queryClient.setQueryData(articlesKeys.list(listQuery), []);
    queryClient.setQueryData(articlesKeys.detail(3), {});
    queryClient.setQueryData(taxonomyKeys.categories, []);
    queryClient.setQueryData(overviewKeys.counts, {});

    await invalidateArticlesAfterContentSave();

    expect(
      queryClient.getQueryState(articlesKeys.list(listQuery))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(articlesKeys.detail(3))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(taxonomyKeys.categories)?.isInvalidated,
    ).toBe(false);
    expect(queryClient.getQueryState(overviewKeys.counts)?.isInvalidated).toBe(
      false,
    );
  });
});

describe('invalidateArticlesAfterMutation', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('create/publish/unpublish/delete 全量失效：命中 articles、taxonomy 与 overview，不扩散到 music', async () => {
    const listQuery = { status: 'all', page: 1, pageSize: 20 } as const;
    queryClient.setQueryData(articlesKeys.list(listQuery), []);
    queryClient.setQueryData(taxonomyKeys.categories, []);
    queryClient.setQueryData(overviewKeys.counts, {});
    queryClient.setQueryData([...musicRoot, 'list', { page: 1 }], []);

    await invalidateArticlesAfterMutation();

    expect(
      queryClient.getQueryState(articlesKeys.list(listQuery))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(taxonomyKeys.categories)?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(overviewKeys.counts)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState([...musicRoot, 'list', { page: 1 }])
        ?.isInvalidated,
    ).toBe(false);
  });
});
