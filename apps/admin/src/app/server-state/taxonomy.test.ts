import { beforeEach, describe, expect, it, vi } from 'vitest';

const taxonomyApi = vi.hoisted(() => ({
  listCategories:
    vi.fn<(options?: { signal?: AbortSignal }) => Promise<unknown>>(),
  listTags:
    vi.fn<
      (unused?: boolean, options?: { signal?: AbortSignal }) => Promise<unknown>
    >(),
}));

vi.mock('@/app/api/index', () => ({ apiClient: { taxonomy: taxonomyApi } }));

import { queryClient } from './client';
import { overviewRoot, taxonomyRoot, usersRoot } from './roots';
import {
  invalidateTaxonomyAfterMutation,
  taxonomyCategoriesOptions,
  taxonomyKeys,
  taxonomyTagsOptions,
} from './taxonomy';

describe('taxonomyKeys', () => {
  it('category/tag list 家族互不冲突', () => {
    expect(taxonomyKeys.categories).toEqual([...taxonomyRoot, 'categories']);
    expect(taxonomyKeys.tags(false)).toEqual([
      ...taxonomyRoot,
      'tags',
      { unused: false },
    ]);
    expect(taxonomyKeys.tags(true)).not.toEqual(taxonomyKeys.tags(false));
    expect(taxonomyKeys.tags(true)).not.toEqual(taxonomyKeys.categories);
  });
});

describe('taxonomy query options', () => {
  it('categories query 消费 signal', async () => {
    taxonomyApi.listCategories.mockResolvedValue({ items: [] });
    await queryClient.query(taxonomyCategoriesOptions());

    const [callOptions] = taxonomyApi.listCategories.mock.calls[0] ?? [];
    expect(callOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(queryClient.getQueryState(taxonomyKeys.categories)?.data).toEqual({
      items: [],
    });
  });

  it('unused filter 直接进入 tags query key', async () => {
    taxonomyApi.listTags.mockResolvedValue({ items: [] });
    await queryClient.query(taxonomyTagsOptions(true));

    const [unused, callOptions] = taxonomyApi.listTags.mock.calls[0] ?? [];
    expect(unused).toBe(true);
    expect(callOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(queryClient.getQueryState(taxonomyKeys.tags(true))?.data).toEqual({
      items: [],
    });
  });
});

describe('invalidateTaxonomyAfterMutation', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('只失效 taxonomy 全家族与 overview counts', async () => {
    queryClient.setQueryData(taxonomyKeys.categories, [{ id: 1 }]);
    queryClient.setQueryData(taxonomyKeys.tags(false), [{ id: 1 }]);
    queryClient.setQueryData(taxonomyKeys.tags(true), []);
    queryClient.setQueryData([...overviewRoot, 'counts'], { counts: {} });
    queryClient.setQueryData([...overviewRoot, 'calendar'], { days: [] });
    queryClient.setQueryData([...usersRoot, 'list'], { items: [] });

    await invalidateTaxonomyAfterMutation();

    expect(
      queryClient.getQueryState(taxonomyKeys.categories)?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(taxonomyKeys.tags(false))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(taxonomyKeys.tags(true))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState([...overviewRoot, 'counts'])?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState([...overviewRoot, 'calendar'])?.isInvalidated,
    ).toBe(false);
    expect(
      queryClient.getQueryState([...usersRoot, 'list'])?.isInvalidated,
    ).toBe(false);
  });
});
