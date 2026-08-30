import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ setSessionExpiredHandler: vi.fn() }));

const restoreSession = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@/app/api/index.js', () => ({ apiClient: api }));

vi.mock('@/store/auth.js', () => ({
  useAuthStore: {
    getState: () => ({
      decideSessionExpired: vi.fn(),
      restoreSession,
    }),
  },
}));

import { bootstrapAdminApp } from './bootstrap.js';

describe('bootstrapAdminApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('重复调用是幂等的：handler 只注册一次、会话恢复只启动一次', () => {
    bootstrapAdminApp();
    bootstrapAdminApp();
    bootstrapAdminApp();

    expect(api.setSessionExpiredHandler).toHaveBeenCalledTimes(1);
    expect(restoreSession).toHaveBeenCalledTimes(1);
  });
});
