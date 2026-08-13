import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PwaBridge = () => {
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) {
      toast.success('已可离线使用');
    }
  }, [offlineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast('新版本可用', {
      id: 'pwa-need-refresh',
      action: {
        label: '刷新',
        onClick: () => {
          void navigator.serviceWorker.getRegistration().then((reg) => {
            if (!reg || !reg.waiting) {
              window.location.reload();
              return;
            }
            void updateServiceWorker(true);
          });
        },
      },
      duration: Infinity,
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
};
