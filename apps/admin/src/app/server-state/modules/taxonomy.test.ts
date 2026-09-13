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

import { queryClient } from '../client';
import { overviewRoot, usersRoot } from '../roots';
import { invalidateTaxonomyAfterMutation, taxonomyKeys } from './taxonomy';

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
