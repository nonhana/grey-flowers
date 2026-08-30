import { beforeEach, describe, expect, it, vi } from 'vitest';

const kyHandlers = vi.hoisted(() => ({
  get: vi.fn<(path: string, options?: unknown) => Promise<unknown>>(),
  post: vi.fn<(path: string, options?: unknown) => Promise<unknown>>(),
  patch: vi.fn<(path: string, options?: unknown) => Promise<unknown>>(),
  delete: vi.fn<(path: string, options?: unknown) => Promise<unknown>>(),
}));

const delayModule = vi.hoisted(() => ({ readApiDelayMs: vi.fn(() => 0) }));

vi.mock('ky', () => ({ default: { create: vi.fn(() => kyHandlers) } }));

vi.mock('./delay.js', () => delayModule);

import { createHttp } from './http.js';

const requestId = '11111111-1111-4111-8111-111111111111';

const AUTH_REQUIRED_FAILURE = {
  success: false,
  error: { code: 'AUTH_REQUIRED', message: '需要登录' },
  requestId,
};

const REFRESH_OK = {
  success: true,
  requestId,
  data: {
    accessToken: 'at-2',
    expiresIn: 900,
    principal: {
      userId: 1,
      sessionId: 's1',
      role: 'ADMIN',
      email: 'admin@example.com',
      username: 'admin',
      avatar: '',
      site: null,
    },
  },
};

const okResponse = (body: unknown) => ({
  json: () => Promise.resolve(body),
});

/** 全接受 schema：任何 body 都按成功数据返回。 */
const permissiveSchema = {
  safeParse: (value: unknown) => ({
    success: true as const,
    data: { data: value },
  }),
};

/** 全拒绝 schema：把 body 交给真实 apiFailureSchema 解析。 */
const rejectingSchema = { safeParse: () => ({ success: false as const }) };

let accessToken: string | null = 'at-1';
const buildHttp = () =>
  createHttp({
    prefixUrl: 'http://api.test',
    getAccessToken: () => accessToken,
    setAccessToken: (next) => {
      accessToken = next;
    },
  });

const abortError = () => new DOMException('aborted', 'AbortError');

beforeEach(() => {
  vi.resetAllMocks();
  delayModule.readApiDelayMs.mockReturnValue(0);
  accessToken = 'at-1';
});

describe('createHttp signal', () => {
  it('把 signal 透传给底层请求', async () => {
    kyHandlers.get.mockResolvedValue(okResponse({ ok: true }));
    const controller = new AbortController();
    const http = buildHttp();

    await http.get('/probe', {
      schema: permissiveSchema,
      signal: controller.signal,
    });

    expect(kyHandlers.get).toHaveBeenCalledWith(
      '/probe',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('AbortError 原样上抛，不包装为网络错误', async () => {
    const abort = abortError();
    kyHandlers.get.mockRejectedValue(abort);
    const http = buildHttp();

    await expect(
      http.get('/probe', {
        schema: permissiveSchema,
        signal: new AbortController().signal,
      }),
    ).rejects.toBe(abort);
  });

  it('调试延迟期间取消：请求不再发出', async () => {
    delayModule.readApiDelayMs.mockReturnValue(10_000);
    const controller = new AbortController();
    const http = buildHttp();

    const pending = http.get('/probe', {
      schema: permissiveSchema,
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(kyHandlers.get).not.toHaveBeenCalled();
  });
});

describe('createHttp auth retry', () => {
  it('refresh 期间已取消的请求跳过重试', async () => {
    const refreshGate = Promise.withResolvers();
    kyHandlers.get.mockResolvedValue(okResponse(AUTH_REQUIRED_FAILURE));
    kyHandlers.post.mockReturnValue(refreshGate.promise);
    const controller = new AbortController();
    const http = buildHttp();

    const pending = http.get('/probe', {
      schema: rejectingSchema,
      authenticated: true,
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(kyHandlers.post).toHaveBeenCalledOnce());
    controller.abort();
    refreshGate.resolve(okResponse(REFRESH_OK));

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(kyHandlers.get).toHaveBeenCalledOnce();
  });

  it('两个请求共享一次 refresh；其一取消不影响另一个重试', async () => {
    const refreshGate = Promise.withResolvers();
    kyHandlers.get.mockResolvedValue(okResponse(AUTH_REQUIRED_FAILURE));
    kyHandlers.post.mockReturnValue(refreshGate.promise);
    const first = new AbortController();
    const second = new AbortController();
    const http = buildHttp();

    const firstPending = http.get('/a', {
      schema: rejectingSchema,
      authenticated: true,
      signal: first.signal,
    });
    const secondPending = http.get('/b', {
      schema: rejectingSchema,
      authenticated: true,
      signal: second.signal,
    });
    await vi.waitFor(() => expect(kyHandlers.post).toHaveBeenCalledOnce());
    first.abort();
    refreshGate.resolve(okResponse(REFRESH_OK));

    await expect(firstPending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(secondPending).rejects.toMatchObject({
      name: 'ApiRequestError',
      code: 'AUTH_REQUIRED',
    });
    // 共享 refresh 只发一次；被取消的请求不重试，未取消的重试了一次。
    expect(kyHandlers.post).toHaveBeenCalledOnce();
    expect(kyHandlers.get.mock.calls.map(([path]) => path)).toEqual([
      '/a',
      '/b',
      '/b',
    ]);
  });
});
