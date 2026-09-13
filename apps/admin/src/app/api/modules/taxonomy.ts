import type { CategorySaveInput } from '@grey-flowers/contracts';

import {
  categoryDeleteResponseSchema,
  categoryListResponseSchema,
  categoryResponseSchema,
  tagDeleteResponseSchema,
  tagListResponseSchema,
  tagResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

import { toSearchParams } from '../shared';

export const createTaxonomyApi = (channel: Channel) => ({
  listCategories: (signal?: AbortSignal) =>
    channel.get('/categories', categoryListResponseSchema, { signal }),
  createCategory: (input: CategorySaveInput) =>
    channel.post('/categories', categoryResponseSchema, { json: input }),
  updateCategory: (id: number, input: CategorySaveInput) =>
    channel.patch(`/categories/${id}`, categoryResponseSchema, {
      json: input,
    }),
  deleteCategory: (id: number) =>
    channel.delete(`/categories/${id}`, categoryDeleteResponseSchema),
  listTags: (unused?: boolean, signal?: AbortSignal) =>
    channel.get('/tags', tagListResponseSchema, {
      searchParams: toSearchParams({
        unused: unused ? 'true' : undefined,
      }),
      signal,
    }),
  createTag: (name: string) =>
    channel.post('/tags', tagResponseSchema, { json: { name } }),
  deleteTag: (id: number) =>
    channel.delete(`/tags/${id}`, tagDeleteResponseSchema),
});

export type TaxonomyApi = ReturnType<typeof createTaxonomyApi>;
