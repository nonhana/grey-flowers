import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from '../client';
import { articlesRoot, taxonomyRoot } from '../roots';
import { overviewKeys } from './overview';

export const taxonomyKeys = {
  categories: [...taxonomyRoot, 'categories'] as const,
  tags: (unused: boolean) => [...taxonomyRoot, 'tags', { unused }] as const,
};

export const taxonomyCategoriesOptions = () =>
  queryOptions({
    queryKey: taxonomyKeys.categories,
    queryFn: ({ signal }) => apiClient.taxonomy.listCategories(signal),
  });

export const taxonomyTagsOptions = (unused: boolean) =>
  queryOptions({
    queryKey: taxonomyKeys.tags(unused),
    queryFn: ({ signal }) => apiClient.taxonomy.listTags(unused, signal),
  });

/**
 * 分类/标签增删改后的规定失效：taxonomy 全家族、article lists/workspace
 * metadata、overview composition。
 */
export const invalidateTaxonomyAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: taxonomyRoot }),
    queryClient.invalidateQueries({ queryKey: articlesRoot }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.counts }),
  ]);
};
