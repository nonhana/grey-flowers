import type { ApiFailure } from '@grey-flowers/contracts';

import { describe, expect, it } from 'vitest';

import { ApiNetworkError, ApiRequestError } from '@/app/api/errors.js';

import {
  apiErrorMessage,
  AUTH_FORBIDDEN_MESSAGE,
  GENERIC_FALLBACK,
} from './error-message.js';

const requestError = (
  code: ApiFailure['error']['code'],
  message: string,
  status = 400,
) =>
  new ApiRequestError(
    { success: false, error: { code, message }, requestId: 'test' },
    status,
  );

describe('apiErrorMessage', () => {
  it('非请求错误退到通用兜底，不把内部异常抛给用户', () => {
    expect(apiErrorMessage(new Error('stack trace'))).toBe(GENERIC_FALLBACK);
    expect(apiErrorMessage(new ApiNetworkError(new Error('x')))).toBe(
      GENERIC_FALLBACK,
    );
    expect(apiErrorMessage(undefined)).toBe(GENERIC_FALLBACK);
  });

  it('自定义 fallback 覆盖通用兜底', () => {
    expect(apiErrorMessage(null, {}, '删除失败。')).toBe('删除失败。');
  });

  it('未命中查表时使用服务端返回的 message', () => {
    expect(apiErrorMessage(requestError('NOT_FOUND', '文章不存在'))).toBe(
      '文章不存在',
    );
  });

  it('AUTH_FORBIDDEN 走公共文案，不透出服务端英文原文', () => {
    expect(
      apiErrorMessage(
        requestError('AUTH_FORBIDDEN', 'Access is forbidden', 403),
      ),
    ).toBe(AUTH_FORBIDDEN_MESSAGE);
  });

  it('按码定制的文案优先于公共表', () => {
    expect(
      apiErrorMessage(requestError('AUTH_FORBIDDEN', 'x', 403), {
        AUTH_FORBIDDEN: '这篇文章不归你管。',
      }),
    ).toBe('这篇文章不归你管。');
  });

  it('定制项可以是函数，拿得到原始错误', () => {
    expect(
      apiErrorMessage(requestError('ARTICLE_STALE', 'stale', 409), {
        ARTICLE_STALE: (error) => `冲突（HTTP ${error.status}）`,
      }),
    ).toBe('冲突（HTTP 409）');
  });
});
