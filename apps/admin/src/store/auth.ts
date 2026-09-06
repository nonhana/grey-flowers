import type { Principal } from '@grey-flowers/contracts';

import { toast } from 'sonner';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import {
  apiClient,
  getAccessToken,
  isApiNetworkError,
  isApiRequestError,
  setAccessToken,
} from '@/app/api/index';
import { queryClient } from '@/app/server-state/client';

type AuthenticationState =
  | { status: 'checking' }
  | { status: 'unauthenticated'; error?: string }
  | { status: 'forbidden' }
  | { status: 'network-error'; error: string }
  | {
      status: 'authenticated';
      principal: Principal;
      logoutError?: string;
    };

interface AuthState {
  state: AuthenticationState;
  isSubmitting: boolean;
  isSigningOut: boolean;
  restoreSession: () => Promise<void>;
  retry: () => Promise<void>;
  signIn: (input: { account: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  useAnotherAccount: () => void;
  /** 会话过期（401）时的兜底处理，供 apiClient 拦截器回调。 */
  decideSessionExpired: () => void;
}

const messageFor = (error: unknown) => {
  if (isApiRequestError(error)) {
    return error.message;
  }

  if (isApiNetworkError(error)) {
    return error.message;
  }

  return '暂时无法完成此操作。';
};

export const useAuthStore = create<AuthState>()((set, get) => {
  const moveToGuardedState = (principal: Principal) => {
    if (principal.role === 'ADMIN') {
      set({ state: { status: 'authenticated', principal } });
      return;
    }

    setAccessToken(null);
    queryClient.clear();
    set({ state: { status: 'forbidden' } });
  };

  const decideSessionExpired = () => {
    setAccessToken(null);
    queryClient.clear();
    set({ state: { status: 'unauthenticated' } });
    toast.error('登录已过期，请重新登录。');
  };
  const restoreSession = async () => {
    try {
      const accessToken = getAccessToken();
      if (accessToken) {
        const response = await apiClient.auth.session();
        moveToGuardedState(response.principal);
        return;
      }

      const response = await apiClient.refresh();
      setAccessToken(response.accessToken);
      moveToGuardedState(response.principal);
    } catch (error) {
      if (isApiRequestError(error, 'AUTH_FORBIDDEN')) {
        setAccessToken(null);
        queryClient.clear();
        set({ state: { status: 'forbidden' } });
        return;
      }

      if (isApiRequestError(error, 'AUTH_REQUIRED')) {
        setAccessToken(null);
        set({ state: { status: 'unauthenticated' } });
        return;
      }

      set({ state: { status: 'network-error', error: messageFor(error) } });
    }
  };

  const retry = async () => {
    set({ state: { status: 'checking' } });
    await restoreSession();
  };

  const signIn = async (input: { account: string; password: string }) => {
    // 登录前清掉上一主体可能残留的查询缓存。
    queryClient.clear();
    set({ isSubmitting: true });
    try {
      const response = await apiClient.auth.login(input);
      setAccessToken(response.accessToken);
      moveToGuardedState(response.principal);
    } catch (error) {
      if (isApiRequestError(error, 'AUTH_FORBIDDEN')) {
        setAccessToken(null);
        queryClient.clear();
        set({ state: { status: 'forbidden' } });
        return;
      }

      set({ state: { status: 'unauthenticated', error: messageFor(error) } });
    } finally {
      set({ isSubmitting: false });
    }
  };

  const signOut = async () => {
    const currentState = get().state;
    set({
      state:
        currentState.status === 'authenticated'
          ? { ...currentState, logoutError: undefined }
          : currentState,
    });
    set({ isSigningOut: true });

    try {
      await apiClient.auth.logout();
      setAccessToken(null);
      set({ state: { status: 'unauthenticated' } });
    } catch (error) {
      set({ state: { status: 'unauthenticated', error: messageFor(error) } });
    } finally {
      setAccessToken(null);
      queryClient.clear();
      set({ isSigningOut: false });
    }
  };

  const useAnotherAccount = () => {
    queryClient.clear();
    set({ state: { status: 'unauthenticated' } });
  };

  return {
    state: { status: 'checking' },
    isSubmitting: false,
    isSigningOut: false,
    restoreSession,
    retry,
    signIn,
    signOut,
    useAnotherAccount,
    decideSessionExpired,
  };
});

/** 认证状态与动作订阅（返回形状稳定，仅顶层字段变化时通知）。 */
export const useAuth = () =>
  useAuthStore(
    useShallow((s) => ({
      state: s.state,
      isSubmitting: s.isSubmitting,
      isSigningOut: s.isSigningOut,
      retry: s.retry,
      signIn: s.signIn,
      signOut: s.signOut,
      useAnotherAccount: s.useAnotherAccount,
    })),
  );
