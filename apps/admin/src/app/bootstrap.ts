import { apiClient } from '@/app/api/index.js';
import { useAuthStore } from '@/store/auth.js';

let bootstrapped = false;

export const bootstrapAdminApp = () => {
  if (bootstrapped) return;
  bootstrapped = true;
  const authStore = useAuthStore.getState();
  apiClient.setSessionExpiredHandler(() => authStore.decideSessionExpired());
  void authStore.restoreSession();
};
