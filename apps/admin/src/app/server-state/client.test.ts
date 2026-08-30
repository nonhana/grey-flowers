import { describe, expect, it } from 'vitest';

import {
  clearAdminQueryCache,
  createQueryClient,
  queryClient,
} from './client.js';

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

describe('clearAdminQueryCache', () => {
  it('清空单例缓存的全部查询数据', () => {
    queryClient.setQueryData(['admin', 'probe'], { n: 1 });
    expect(queryClient.getQueryData(['admin', 'probe'])).toEqual({ n: 1 });

    clearAdminQueryCache();

    expect(queryClient.getQueryData(['admin', 'probe'])).toBeUndefined();
  });
});
