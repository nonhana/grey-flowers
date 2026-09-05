import { apiClient } from '@/app/api/index';
import { useAuthStore } from '@/store/auth';

let bootstrapped = false;

export const bootstrapAdminApp = () => {
  if (bootstrapped) return;
  bootstrapped = true;
  const authStore = useAuthStore.getState();
  apiClient.setSessionExpiredHandler(() => authStore.decideSessionExpired());
  void authStore.restoreSession();
};
