import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PwaBridge = () => {
  const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) {
      toast.success('已可离线使用');
    }
  }, [offlineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast('新版本可用', {
      action: {
        label: '刷新',
        onClick: () => {
          void updateServiceWorker(true);
        },
      },
      duration: Infinity,
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
};
