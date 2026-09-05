import type {
  CategoryAdmin,
  CategoryListData,
  CategorySaveInput,
  TagAdmin,
  TagListData,
} from '@grey-flowers/contracts';

import {
  categoryDeleteResponseSchema,
  categoryListResponseSchema,
  categoryResponseSchema,
  tagDeleteResponseSchema,
  tagListResponseSchema,
  tagResponseSchema,
} from '@grey-flowers/contracts';

import type { Http, HttpReadOptions } from './http';

export const createTaxonomyApi = (http: Http) => {
  return {
    listCategories: (options?: HttpReadOptions): Promise<CategoryListData> =>
      http.get('/categories', {
        authenticated: true,
        schema: categoryListResponseSchema,
        signal: options?.signal,
      }),
    createCategory: (input: CategorySaveInput): Promise<CategoryAdmin> =>
      http.post('/categories', {
        authenticated: true,
        json: input,
        schema: categoryResponseSchema,
      }),
    updateCategory: (
      id: number,
      input: CategorySaveInput,
    ): Promise<CategoryAdmin> =>
      http.patch(`/categories/${id}`, {
        authenticated: true,
        json: input,
        schema: categoryResponseSchema,
      }),
    deleteCategory: (id: number): Promise<{ id: number }> =>
      http.delete(`/categories/${id}`, {
        authenticated: true,
        schema: categoryDeleteResponseSchema,
      }),
    listTags: (
      unused?: boolean,
      options?: HttpReadOptions,
    ): Promise<TagListData> => {
      const params = new URLSearchParams();
      if (unused) params.set('unused', 'true');
      return http.get('/tags', {
        authenticated: true,
        schema: tagListResponseSchema,
        searchParams: params,
        signal: options?.signal,
      });
    },
    createTag: (name: string): Promise<TagAdmin> =>
      http.post('/tags', {
        authenticated: true,
        json: { name },
        schema: tagResponseSchema,
      }),
    deleteTag: (id: number): Promise<{ id: number }> =>
      http.delete(`/tags/${id}`, {
        authenticated: true,
        schema: tagDeleteResponseSchema,
      }),
  };
};

export type TaxonomyApi = ReturnType<typeof createTaxonomyApi>;
