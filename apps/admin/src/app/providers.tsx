import type { PropsWithChildren } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';

import { PwaBridge } from './pwa';
import { queryClient } from './server-state/client';

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : null;

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="data-theme" storageKey="gf-admin-theme">
        <PwaBridge />
        {children}
        <Toaster closeButton duration={3000} position="top-center" richColors />
        {ReactQueryDevtools ? (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        ) : null}
      </ThemeProvider>
    </QueryClientProvider>
  );
};
