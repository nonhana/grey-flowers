import type { ArticleListAdminQuery } from '@grey-flowers/contracts';

import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index.js';

import { queryClient } from './client.js';
import { articlesRoot, overviewRoot, taxonomyRoot } from './roots.js';

export const articlesKeys = {
  list: (query: ArticleListAdminQuery) =>
    [...articlesRoot, 'list', query] as const,
  detail: (id: number) => [...articlesRoot, 'detail', id] as const,
};

export const articlesListOptions = (query: ArticleListAdminQuery) =>
  queryOptions({
    queryKey: articlesKeys.list(query),
    queryFn: ({ signal }) => apiClient.articles.list(query, { signal }),
  });

export const articlesDetailOptions = (id: number) =>
  queryOptions({
    queryKey: articlesKeys.detail(id),
    queryFn: ({ signal }) => apiClient.articles.detail(id, { signal }),
  });

/**
 * 文章 create/save/publish/unpublish/delete 后的规定失效：
 * article lists/workspace metadata（recent 即 list 一员）、taxonomy counts、
 * overview counts/trends/calendar。
 * 文章删除级联的资产引用计数由调用点另行 markAssetsStale 标记。
 */
export const invalidateArticlesAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: articlesRoot }),
    queryClient.invalidateQueries({ queryKey: taxonomyRoot }),
    queryClient.invalidateQueries({ queryKey: overviewRoot }),
  ]);
};
