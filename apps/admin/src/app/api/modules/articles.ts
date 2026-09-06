import type {
  ArticleCreateInput,
  ArticleListAdminQuery,
  ArticleSaveInput,
} from '@grey-flowers/contracts';

import {
  articleAdminResponseSchema,
  articleListAdminResponseSchema,
  articleSnapshotListResponseSchema,
  previewTokenResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

import { toSearchParams } from '../shared';

export const createArticlesApi = (channel: Channel) => ({
  list: (query: ArticleListAdminQuery, signal?: AbortSignal) =>
    channel.get('/articles', articleListAdminResponseSchema, {
      searchParams: toSearchParams({
        ...query,
        q: query.q?.trim() || undefined,
      }),
      signal,
    }),
  detail: (id: number, signal?: AbortSignal) =>
    channel.get(`/articles/${id}`, articleAdminResponseSchema, { signal }),
  create: (input: ArticleCreateInput) =>
    channel.post('/articles', articleAdminResponseSchema, { json: input }),
  save: (id: number, input: ArticleSaveInput) =>
    channel.patch(`/articles/${id}`, articleAdminResponseSchema, {
      json: input,
    }),
  publish: (id: number) =>
    channel.post(`/articles/${id}/publish`, articleAdminResponseSchema),
  unpublish: (id: number) =>
    channel.post(`/articles/${id}/unpublish`, articleAdminResponseSchema),
  remove: (id: number) =>
    channel.delete(`/articles/${id}`, articleAdminResponseSchema),
  snapshots: (id: number) =>
    channel.get(`/articles/${id}/snapshots`, articleSnapshotListResponseSchema),
  requestPreviewToken: (id: number) =>
    channel.post(`/articles/${id}/preview-token`, previewTokenResponseSchema),
});

export type ArticlesApi = ReturnType<typeof createArticlesApi>;
