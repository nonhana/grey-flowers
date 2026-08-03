import type {
  ArticleAdmin,
  ArticleCreateInput,
  ArticleListAdminData,
  ArticleListAdminQuery,
  ArticleSaveInput,
  ArticleSnapshotListData,
  PreviewTokenData,
} from '@grey-flowers/contracts';

import {
  articleAdminResponseSchema,
  articleListAdminResponseSchema,
  articleSnapshotListResponseSchema,
  previewTokenResponseSchema,
} from '@grey-flowers/contracts';

import type { Http } from './http.js';

export function createArticlesApi(http: Http) {
  return {
    list: (query: ArticleListAdminQuery): Promise<ArticleListAdminData> => {
      const params = new URLSearchParams();
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      if (query.status !== undefined) params.set('status', query.status);
      if (query.q !== undefined && query.q.trim() !== '') {
        params.set('q', query.q.trim());
      }
      return http.get('/articles', {
        authenticated: true,
        schema: articleListAdminResponseSchema,
        searchParams: params,
      });
    },
    detail: (id: number): Promise<ArticleAdmin> =>
      http.get(`/articles/${id}`, {
        authenticated: true,
        schema: articleAdminResponseSchema,
      }),
    create: (input: ArticleCreateInput): Promise<ArticleAdmin> =>
      http.post('/articles', {
        authenticated: true,
        json: input,
        schema: articleAdminResponseSchema,
      }),
    save: (id: number, input: ArticleSaveInput): Promise<ArticleAdmin> =>
      http.patch(`/articles/${id}`, {
        authenticated: true,
        json: input,
        schema: articleAdminResponseSchema,
      }),
    publish: (id: number): Promise<ArticleAdmin> =>
      http.post(`/articles/${id}/publish`, {
        authenticated: true,
        schema: articleAdminResponseSchema,
      }),
    unpublish: (id: number): Promise<ArticleAdmin> =>
      http.post(`/articles/${id}/unpublish`, {
        authenticated: true,
        schema: articleAdminResponseSchema,
      }),
    remove: (id: number): Promise<ArticleAdmin> =>
      http.delete(`/articles/${id}`, {
        authenticated: true,
        schema: articleAdminResponseSchema,
      }),
    snapshots: (id: number): Promise<ArticleSnapshotListData> =>
      http.get(`/articles/${id}/snapshots`, {
        authenticated: true,
        schema: articleSnapshotListResponseSchema,
      }),
    requestPreviewToken: (id: number): Promise<PreviewTokenData> =>
      http.post(`/articles/${id}/preview-token`, {
        authenticated: true,
        schema: previewTokenResponseSchema,
      }),
  };
}

export type ArticlesApi = ReturnType<typeof createArticlesApi>;
