import type { PropsWithChildren } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

import { PwaBridge } from './pwa.js';
import { queryClient } from './server-state/client.js';

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="data-theme" storageKey="gf-admin-theme">
        <PwaBridge />
        {children}
        <Toaster closeButton duration={3000} position="top-center" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
};
