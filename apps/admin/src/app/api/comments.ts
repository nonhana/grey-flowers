import type {
  CommentAdmin,
  CommentDeleteResult,
  CommentListData,
  CommentListQuery,
  CommentReplyInput,
} from '@grey-flowers/contracts';

import {
  commentAdminResponseSchema,
  commentDeleteResponseSchema,
  commentListResponseSchema,
} from '@grey-flowers/contracts';

import type { Http, HttpReadOptions } from './http.js';

const listSearchParams = (query: CommentListQuery) => {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.search !== undefined) params.set('search', query.search);
  if (query.path !== undefined) params.set('path', query.path);
  if (query.authorId !== undefined) {
    params.set('authorId', String(query.authorId));
  }
  if (query.startDate !== undefined) params.set('startDate', query.startDate);
  if (query.endDate !== undefined) params.set('endDate', query.endDate);
  return params;
};

export interface CommentsApi {
  list(
    query: CommentListQuery,
    options?: HttpReadOptions,
  ): Promise<CommentListData>;
  reply(id: number, input: CommentReplyInput): Promise<CommentAdmin>;
  remove(id: number): Promise<CommentDeleteResult>;
  removeBatch(ids: number[]): Promise<CommentDeleteResult>;
}

export const createCommentsApi = (http: Http): CommentsApi => {
  return {
    list: (
      query: CommentListQuery,
      options?: HttpReadOptions,
    ): Promise<CommentListData> =>
      http.get('/comments', {
        authenticated: true,
        schema: commentListResponseSchema,
        searchParams: listSearchParams(query),
        signal: options?.signal,
      }),
    reply: (id: number, input: CommentReplyInput): Promise<CommentAdmin> =>
      http.post(`/comments/${id}/reply`, {
        authenticated: true,
        json: input,
        schema: commentAdminResponseSchema,
      }),
    remove: (id: number): Promise<CommentDeleteResult> =>
      http.delete(`/comments/${id}`, {
        authenticated: true,
        schema: commentDeleteResponseSchema,
      }),
    removeBatch: (ids: number[]): Promise<CommentDeleteResult> =>
      http.delete('/comments', {
        authenticated: true,
        json: { ids },
        schema: commentDeleteResponseSchema,
      }),
  };
};
