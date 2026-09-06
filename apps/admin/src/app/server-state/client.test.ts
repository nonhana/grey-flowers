import { describe, expect, it } from 'vitest';

import { createQueryClient } from './client';

describe('createQueryClient', () => {
  it('默认不重试、不聚焦刷新、staleTime 0', () => {
    const client = createQueryClient();
    const { queries, mutations } = client.getDefaultOptions();

    expect(queries?.retry).toBe(false);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(queries?.staleTime).toBe(0);
    expect(mutations?.retry).toBe(false);
  });
});
