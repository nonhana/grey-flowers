import type { ArticleListAdminQuery } from '@grey-flowers/contracts';

import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from '../client';
import { articlesRoot, overviewRoot, taxonomyRoot } from '../roots';

/** q 空白等价于未搜索，键与请求共用同一份归一化结果。 */
const normalizeListQuery = (
  query: ArticleListAdminQuery,
): ArticleListAdminQuery => ({
  ...query,
  q: query.q?.trim() || undefined,
});

export const articlesKeys = {
  list: (query: ArticleListAdminQuery) =>
    [...articlesRoot, 'list', normalizeListQuery(query)] as const,
  detail: (id: number) => [...articlesRoot, 'detail', id] as const,
};

export const articlesListOptions = (query: ArticleListAdminQuery) => {
  const normalized = normalizeListQuery(query);
  return queryOptions({
    queryKey: articlesKeys.list(normalized),
    queryFn: ({ signal }) => apiClient.articles.list(normalized, signal),
  });
};

export const articlesDetailOptions = (id: number) =>
  queryOptions({
    queryKey: articlesKeys.detail(id),
    queryFn: ({ signal }) => apiClient.articles.detail(id, signal),
  });

/** 文章 create/publish/unpublish/delete 后的规定失效：articles、taxonomy、overview 全家族；删除级联的资产引用计数由调用点另行 markAssetsStale。 */
export const invalidateArticlesAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: articlesRoot }),
    queryClient.invalidateQueries({ queryKey: taxonomyRoot }),
    queryClient.invalidateQueries({ queryKey: overviewRoot }),
  ]);
};

/** 自动保存落盘后的窄失效：只刷 articles 家族，不动计数与发布态，避免自动保存期间的 overview/taxonomy refetch 风暴。 */
export const invalidateArticlesAfterContentSave = async () => {
  await queryClient.invalidateQueries({ queryKey: articlesRoot });
};
