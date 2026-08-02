import type { Principal } from '@grey-flowers/contracts';
import type { PropsWithChildren } from 'react';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

import {
  apiClient,
  getAccessToken,
  isApiNetworkError,
  isApiRequestError,
  setAccessToken,
} from './api/index.js';

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

interface AuthContextValue {
  state: AuthenticationState;
  isSubmitting: boolean;
  isSigningOut: boolean;
  retry: () => Promise<void>;
  signIn: (input: { account: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  useAnotherAccount: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFor(error: unknown) {
  if (isApiRequestError(error)) {
    return error.message;
  }

  if (isApiNetworkError(error)) {
    return error.message;
  }

  return '暂时无法完成此操作。';
}

export function AppProviders({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthenticationState>({
    status: 'checking',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const hasBootstrapped = useRef(false);

  const moveToGuardedState = (principal: Principal) => {
    if (principal.role === 'ADMIN') {
      setState({ status: 'authenticated', principal });
      return;
    }

    setAccessToken(null);
    setState({ status: 'forbidden' });
  };

  function handleAuthenticationRequired() {
    setAccessToken(null);
    setState({ status: 'unauthenticated' });
  }

  useEffect(() => {
    apiClient.setSessionExpiredHandler(handleAuthenticationRequired);
  }, []);

  async function restoreSession() {
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
        setState({ status: 'forbidden' });
        return;
      }

      if (isApiRequestError(error, 'AUTH_REQUIRED')) {
        setAccessToken(null);
        setState({ status: 'unauthenticated' });
        return;
      }

      setState({ status: 'network-error', error: messageFor(error) });
    }
  }

  async function retry() {
    setState({ status: 'checking' });
    await restoreSession();
  }

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;
    void restoreSession();
  }, []);

  async function signIn(input: { account: string; password: string }) {
    setIsSubmitting(true);

    try {
      const response = await apiClient.auth.login(input);
      setAccessToken(response.accessToken);
      moveToGuardedState(response.principal);
    } catch (error) {
      if (isApiRequestError(error, 'AUTH_FORBIDDEN')) {
        setAccessToken(null);
        setState({ status: 'forbidden' });
        return;
      }

      setState({ status: 'unauthenticated', error: messageFor(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    setState((current) =>
      current.status === 'authenticated'
        ? { ...current, logoutError: undefined }
        : current,
    );
    setIsSigningOut(true);

    try {
      await apiClient.auth.logout();
      setAccessToken(null);
      setState({ status: 'unauthenticated' });
    } catch (error) {
      setState({ status: 'unauthenticated', error: messageFor(error) });
    } finally {
      setAccessToken(null);
      setIsSigningOut(false);
    }
  }

  function useAnotherAccount() {
    setState({ status: 'unauthenticated' });
  }

  const value: AuthContextValue = {
    state,
    isSubmitting,
    isSigningOut,
    retry,
    signIn,
    signOut,
    useAnotherAccount,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AppProviders.');
  }

  return context;
}
