import { describe, expect, it } from 'vitest';

import { ApiNetworkError, ApiRequestError } from '@/app/api/errors';

import { queryClient } from './client';

describe('queryClient', () => {
  it('默认不聚焦刷新、staleTime 0、mutation 不重试', () => {
    const { queries, mutations } = queryClient.getDefaultOptions();

    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(queries?.staleTime).toBe(0);
    expect(mutations?.retry).toBe(false);
  });

  it('查询仅对网络错误自动重试至多 2 次,API 错误立即失败', () => {
    const retry = queryClient.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;

    const networkError = new ApiNetworkError(new Error('offline'));
    expect(retry(0, networkError)).toBe(true);
    expect(retry(1, networkError)).toBe(true);
    expect(retry(2, networkError)).toBe(false);

    const requestError = new ApiRequestError(
      {
        success: false,
        error: { code: 'AUTH_REQUIRED', message: '请重新登录。' },
        requestId: '',
      },
      401,
    );
    expect(retry(0, requestError)).toBe(false);
  });
});
