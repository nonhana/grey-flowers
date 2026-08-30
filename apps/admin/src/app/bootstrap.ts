import { apiClient } from '@/app/api/index.js';
import { useAuthStore } from '@/store/auth.js';

let bootstrapped = false;

/**
 * 一次性 app bootstrap：session-expired handler 注册 + 会话恢复启动。
 * 在 React render 之前由 main.tsx 调用；幂等 guard 使重复调用
 * （HMR / StrictMode / 测试）不会重复注册 handler 或重复发起恢复。
 */
export const bootstrapAdminApp = () => {
  if (bootstrapped) return;
  bootstrapped = true;
  apiClient.setSessionExpiredHandler(() =>
    useAuthStore.getState().decideSessionExpired(),
  );
  void useAuthStore.getState().restoreSession();
};
