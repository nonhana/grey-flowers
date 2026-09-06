import { beforeEach, describe, expect, it, vi } from 'vitest';

const kyHandlers = vi.hoisted(() => ({
  get: vi.fn<(path: string, options?: unknown) => Promise<unknown>>(),
  post: vi.fn<(path: string, options?: unknown) => Promise<unknown>>(),
  patch: vi.fn<(path: string, options?: unknown) => Promise<unknown>>(),
  delete: vi.fn<(path: string, options?: unknown) => Promise<unknown>>(),
}));

const delayModule = vi.hoisted(() => ({ readApiDelayMs: vi.fn(() => 0) }));

vi.mock('ky', () => ({ default: { create: vi.fn(() => kyHandlers) } }));

vi.mock('./delay', () => delayModule);

import { createSession } from './session';
import { createTransport } from './transport';

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

/** 全拒绝 schema：把 body 交给真实 apiFailureSchema 解析。 */
const rejectingSchema = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: () => ({
      issues: [{ message: 'rejected' }],
    }),
  },
} as const;

let accessToken: string | null = 'at-1';

const buildSession = () => {
  const transport = createTransport({
    prefixUrl: 'http://api.test',
    getAccessToken: () => accessToken,
  });
  return createSession({
    transport,
    getAccessToken: () => accessToken,
    setAccessToken: (next) => {
      accessToken = next;
    },
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  delayModule.readApiDelayMs.mockReturnValue(0);
});

describe('createSession auth retry', () => {
  it('refresh 期间已取消的请求跳过重试', async () => {
    const refreshGate = Promise.withResolvers();
    kyHandlers.get.mockResolvedValue(okResponse(AUTH_REQUIRED_FAILURE));
    kyHandlers.post.mockReturnValue(refreshGate.promise);
    const controller = new AbortController();
    const session = buildSession();

    const pending = session.auth.get('/probe', rejectingSchema, {
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
    const session = buildSession();

    const firstPending = session.auth.get('/a', rejectingSchema, {
      signal: first.signal,
    });
    const secondPending = session.auth.get('/b', rejectingSchema, {
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
