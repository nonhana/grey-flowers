import type { PropsWithChildren } from 'react';

import { ThemeProvider } from 'next-themes';
import { useEffect, useRef } from 'react';
import { Toaster } from 'sonner';

import { useAuthStore } from '@/store/auth.js';

import { apiClient } from './api/index.js';
import { PwaBridge } from './pwa.js';

export const AppProviders = ({ children }: PropsWithChildren) => {
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    apiClient.setSessionExpiredHandler(() =>
      useAuthStore.getState().decideSessionExpired(),
    );
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    void useAuthStore.getState().restoreSession();
  }, []);

  return (
    <ThemeProvider attribute="data-theme" storageKey="gf-admin-theme">
      <PwaBridge />
      {children}
      <Toaster closeButton duration={3000} position="top-center" richColors />
    </ThemeProvider>
  );
};
