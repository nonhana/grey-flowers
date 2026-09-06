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

import { createTransport } from './transport';

const okResponse = (body: unknown) => ({
  json: () => Promise.resolve(body),
});

/** 全接受 schema：任何 body 都按成功数据返回（Standard Schema validate 形态）。 */
const permissiveSchema = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value: unknown) => ({
      value: { data: value },
    }),
  },
} as const;

const buildTransport = () =>
  createTransport({
    prefixUrl: 'http://api.test',
    getAccessToken: () => 'at-1',
  });

const abortError = () => new DOMException('aborted', 'AbortError');

beforeEach(() => {
  vi.resetAllMocks();
  delayModule.readApiDelayMs.mockReturnValue(0);
});

describe('createTransport signal', () => {
  it('把 signal 透传给底层请求', async () => {
    kyHandlers.get.mockResolvedValue(okResponse({ ok: true }));
    const controller = new AbortController();
    const transport = buildTransport();

    await transport.open.get('/probe', permissiveSchema, {
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
    const transport = buildTransport();

    await expect(
      transport.open.get('/probe', permissiveSchema, {
        signal: new AbortController().signal,
      }),
    ).rejects.toBe(abort);
  });

  it('调试延迟期间取消：请求不再发出', async () => {
    delayModule.readApiDelayMs.mockReturnValue(10_000);
    const controller = new AbortController();
    const transport = buildTransport();

    const pending = transport.open.get('/probe', permissiveSchema, {
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(kyHandlers.get).not.toHaveBeenCalled();
  });
});
