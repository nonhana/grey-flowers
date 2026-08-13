import { beforeEach, describe, expect, it, vi } from 'vitest';

const pwa = vi.hoisted(() => ({
  needRefresh: false,
  offlineReady: false,
  setNeedRefresh: vi.fn(),
  setOfflineReady: vi.fn(),
  updateServiceWorker: vi.fn(),
}));

const sonner = vi.hoisted(() => {
  const toast = Object.assign(vi.fn(), { success: vi.fn() });
  return { toast };
});

vi.mock('react', () => ({
  useEffect: (effect: () => void) => effect(),
}));

vi.mock('sonner', () => sonner);

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [pwa.needRefresh, pwa.setNeedRefresh],
    offlineReady: [pwa.offlineReady, pwa.setOfflineReady],
    updateServiceWorker: pwa.updateServiceWorker,
  }),
}));

import { PwaBridge } from './pwa.js';

beforeEach(() => {
  vi.resetAllMocks();
  pwa.needRefresh = false;
  pwa.offlineReady = false;
});

describe('PwaBridge', () => {
  it('只有 Hook 报告等待中的新版本时才显示刷新提示', () => {
    PwaBridge();

    expect(sonner.toast).not.toHaveBeenCalled();
    expect(sonner.toast.success).not.toHaveBeenCalled();
  });

  it('Hook 报告离线就绪时显示离线提示', () => {
    pwa.offlineReady = true;

    PwaBridge();

    expect(sonner.toast.success).toHaveBeenCalledWith('已可离线使用');
  });

  it('Hook 报告等待中的新版本时显示刷新提示', () => {
    pwa.needRefresh = true;

    PwaBridge();

    expect(sonner.toast).toHaveBeenCalledOnce();
    expect(sonner.toast).toHaveBeenCalledWith('新版本可用', expect.anything());
  });
});
