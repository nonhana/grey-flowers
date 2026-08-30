import type { ArticleListAdminQuery } from '@grey-flowers/contracts';

import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index.js';

import { queryClient } from './client.js';
import { overviewRoot } from './overview.js';
import { taxonomyRoot } from './taxonomy.js';

export const articlesRoot = ['admin', 'articles'] as const;

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
 * 删除级联评论/资产引用的 comments/users/assets 家族接入点见 removeArtifacts。
 */
export const invalidateArticlesAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: articlesRoot }),
    queryClient.invalidateQueries({ queryKey: taxonomyRoot }),
    queryClient.invalidateQueries({ queryKey: overviewRoot }),
  ]);
};

/** 仅文章删除：资产引用计数随之失效（只标记，避免当前页请求风暴）。 */
export const markAssetsStaleAfterArticleRemoval = () => {
  void queryClient.invalidateQueries({
    queryKey: ['admin', 'assets'],
    refetchType: 'none',
  });
};
