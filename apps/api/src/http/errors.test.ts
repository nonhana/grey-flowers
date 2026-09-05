import type { ApiErrorCode, ApiFailure } from '@grey-flowers/contracts';

import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import {
  ApiError,
  createSuccess,
  handleError,
  validationError,
} from '@/http/errors';
import { requestId } from '@/http/middleware/request-id';

/** 只有 handleError 用得到 logger，其余依赖在本测试里不参与。 */
const createDependenciesStub = () => {
  const error = vi.fn();
  const dependencies = { logger: { error } } as unknown as AppDependencies;
  return { dependencies, error };
};

const createTestApp = (
  handler: () => unknown,
  dependencies: AppDependencies,
) => {
  const app = new Hono<ApiEnvironment>();
  app.use('*', requestId());
  app.use('*', async (context, next) => {
    context.set('dependencies', dependencies);
    await next();
  });
  app.onError(handleError);
  app.get('/probe', (context) => {
    const data = handler();
    return createSuccess(context, data);
  });
  return app;
};

const readFailure = async (response: Response) => {
  return (await response.json()) as ApiFailure;
};

describe('成功 envelope', () => {
  it('形如 { success: true, data, requestId }，并回带 X-Request-Id', async () => {
    const { dependencies } = createDependenciesStub();
    const app = createTestApp(() => ({ hello: 'world' }), dependencies);

    const response = await app.request('/probe');
    const body = (await response.json()) as {
      success: boolean;
      data: unknown;
      requestId: string;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toStrictEqual({ hello: 'world' });
    expect(body.requestId).toBe(response.headers.get('X-Request-Id'));
    expect(body.requestId).not.toBe('');
  });
});

describe('失败 envelope 与状态码映射', () => {
  const cases: [ApiErrorCode, number][] = [
    ['ARTICLE_STALE', 409],
    ['ASSET_PAYLOAD_TOO_LARGE', 413],
    ['ASSET_REFERENCED', 409],
    ['AUTH_FORBIDDEN', 403],
    ['AUTH_INVALID_CREDENTIALS', 401],
    ['AUTH_REQUIRED', 401],
    ['CONFLICT', 409],
    ['INTERNAL_ERROR', 500],
    ['NOT_FOUND', 404],
    ['RATE_LIMITED', 429],
    ['UNSUPPORTED_MEDIA_TYPE', 415],
    ['UPLOAD_FAILED', 502],
    ['VALIDATION_FAILED', 400],
  ];

  it.each(cases)('%s → HTTP %i', async (code, status) => {
    const { dependencies } = createDependenciesStub();
    const app = createTestApp(() => {
      throw new ApiError(code);
    }, dependencies);

    const response = await app.request('/probe');
    const body = await readFailure(response);

    expect(response.status).toBe(status);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(code);
    expect(body.error.message).not.toBe('');
    expect(body.requestId).toBe(response.headers.get('X-Request-Id'));
  });

  it('ApiError 不写日志（是预期内的业务失败）', async () => {
    const { dependencies, error } = createDependenciesStub();
    const app = createTestApp(() => {
      throw new ApiError('NOT_FOUND');
    }, dependencies);

    await app.request('/probe');
    expect(error).not.toHaveBeenCalled();
  });

  it('非 ApiError 一律 500，且带原始错误与 requestId 落日志（回归 S5）', async () => {
    const { dependencies, error } = createDependenciesStub();
    const boom = new Error('unexpected boom');
    const app = createTestApp(() => {
      throw boom;
    }, dependencies);

    const response = await app.request('/probe');
    const body = await readFailure(response);

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    // 对外不泄漏内部细节
    expect(body.error.message).not.toContain('boom');
    // 对内必须留全细节，否则排障只剩一句 500
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toMatchObject({
      err: boom,
      requestId: body.requestId,
    });
    expect(error.mock.calls[0]?.[1]).toBe('Unhandled API error');
  });
});

describe('validationError', () => {
  const schema = z.strictObject({
    page: z.number().int().positive(),
    title: z.string().min(1),
  });

  it('把 zod issue 按字段聚合进 fields', () => {
    const parsed = schema.safeParse({ page: 0, title: '' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const error = validationError(parsed.error);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(error.fields ?? {}).toSorted()).toStrictEqual([
      'page',
      'title',
    ]);
    expect(error.fields?.page?.length).toBeGreaterThan(0);
  });

  it('同一字段的多条 issue 合并到同一个数组', () => {
    const multi = z.object({
      title: z
        .string()
        .min(5)
        .regex(/^[a-z]+$/),
    });
    const parsed = multi.safeParse({ title: '1' });
    if (parsed.success) return;

    expect(validationError(parsed.error).fields?.title?.length).toBe(2);
  });

  it('未知键（unrecognized_keys）不产出字段级报错', () => {
    const parsed = schema.safeParse({ page: 1, title: 'ok', extra: 1 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(validationError(parsed.error).fields).toBeUndefined();
  });
});
