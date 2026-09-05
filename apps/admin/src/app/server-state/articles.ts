import type { ArticleListAdminQuery } from '@grey-flowers/contracts';

import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from './client';
import { articlesRoot, overviewRoot, taxonomyRoot } from './roots';

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
 * 文章 create/publish/unpublish/delete 后的规定失效（全量，new-article-page
 * 与 store 的 publish/unpublish/delete 调用）：article lists/workspace
 * metadata（recent 即 list 一员）、taxonomy counts、overview
 * counts/trends/calendar。
 * 文章删除级联的资产引用计数由调用点另行 markAssetsStale 标记。
 */
export const invalidateArticlesAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: articlesRoot }),
    queryClient.invalidateQueries({ queryKey: taxonomyRoot }),
    queryClient.invalidateQueries({ queryKey: overviewRoot }),
  ]);
};

/**
 * 自动保存落盘后的窄失效（saveOnce 专用）：仅 article lists/workspace
 * metadata —— 计数与发布态不受 save 影响，避免自动保存期间的
 * overview/taxonomy refetch 风暴。
 */
export const invalidateArticlesAfterContentSave = async () => {
  await queryClient.invalidateQueries({ queryKey: articlesRoot });
};
