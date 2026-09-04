import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PwaBridge = () => {
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // 外部系统同步：service worker 的离线就绪状态 → toast。
  useEffect(() => {
    if (offlineReady) {
      toast.success('已可离线使用');
    }
  }, [offlineReady]);

  // 外部系统同步：service worker 等待中的新版本 → 可刷新 toast。
  useEffect(() => {
    if (!needRefresh) return;

    const refreshApp = () => {
      void navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg || !reg.waiting) {
          window.location.reload();
          return;
        }
        void updateServiceWorker(true);
      });
    };

    toast('新版本可用', {
      id: 'pwa-need-refresh',
      action: {
        label: '刷新',
        onClick: refreshApp,
      },
      duration: Infinity,
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
};
