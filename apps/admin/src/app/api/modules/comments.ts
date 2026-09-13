import type {
  CommentListQuery,
  CommentReplyInput,
} from '@grey-flowers/contracts';

import {
  commentAdminResponseSchema,
  commentDeleteResponseSchema,
  commentListResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

import { toSearchParams } from '../shared';

export const createCommentsApi = (channel: Channel) => ({
  list: (query: CommentListQuery, signal?: AbortSignal) =>
    channel.get('/comments', commentListResponseSchema, {
      searchParams: toSearchParams(query),
      signal,
    }),
  reply: (id: number, input: CommentReplyInput) =>
    channel.post(`/comments/${id}/reply`, commentAdminResponseSchema, {
      json: input,
    }),
  remove: (id: number) =>
    channel.delete(`/comments/${id}`, commentDeleteResponseSchema),
  removeBatch: (ids: number[]) =>
    channel.delete('/comments', commentDeleteResponseSchema, {
      json: { ids },
    }),
});

export type CommentsApi = ReturnType<typeof createCommentsApi>;
