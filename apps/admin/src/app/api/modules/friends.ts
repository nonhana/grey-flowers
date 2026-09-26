import type {
  FriendCreateInput,
  FriendUpdateInput,
} from '@grey-flowers/contracts';

import {
  friendDeleteResponseSchema,
  friendListResponseSchema,
  friendReorderResponseSchema,
  friendResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

export const createFriendsApi = (channel: Channel) => ({
  list: (signal?: AbortSignal) =>
    channel.get('/friends', friendListResponseSchema, { signal }),
  create: (input: FriendCreateInput) =>
    channel.post('/friends', friendResponseSchema, { json: input }),
  update: (id: number, input: FriendUpdateInput) =>
    channel.patch(`/friends/${id}`, friendResponseSchema, { json: input }),
  reorder: (ids: number[]) =>
    channel.patch('/friends/reorder', friendReorderResponseSchema, {
      json: { ids },
    }),
  remove: (id: number) =>
    channel.delete(`/friends/${id}`, friendDeleteResponseSchema),
});

export type FriendsApi = ReturnType<typeof createFriendsApi>;
