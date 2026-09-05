import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { themeInitScript } from './vite/theme-script-plugin';

const PWA_ICONS: Record<string, true> = {
  'favicon.ico': true,
  'pwa-64x64.png': true,
  'pwa-192x192.png': true,
  'pwa-512x512.png': true,
  'maskable-icon-512x512.png': true,
  'apple-touch-icon-180x180.png': true,
};

const envPath = path.join(process.cwd(), '../../');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envPath, '');

  const enableLocalApi = env.ENABLE_LOCAL_API === 'true';

  const adminPort = Number.parseInt(env.ADMIN_PORT);
  const apiPort = Number.parseInt(env.API_PORT);
  const mainPort = Number.parseInt(env.MAIN_PORT);

  const apiOrigin =
    mode === 'production' || !enableLocalApi
      ? 'https://api.caelum.moe'
      : `http://localhost:${apiPort}`;

  const mainOrigin =
    mode === 'production'
      ? 'https://caelum.moe'
      : `http://localhost:${mainPort}`;

  return {
    define: {
      'import.meta.env.VITE_API_ORIGIN': JSON.stringify(apiOrigin),
      'import.meta.env.VITE_MAIN_ORIGIN': JSON.stringify(mainOrigin),
    },
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routeFileIgnorePattern: 'router\\.ts$',
      }),
      react(),
      themeInitScript(),
      tailwindcss(),
      babel({
        presets: [reactCompilerPreset()],
      }),
      VitePWA({
        registerType: 'prompt',
        pwaAssets: {
          config: true,
          integration: {
            publicDir: path.join(import.meta.dirname, 'pwa-source'),
          },
        },
        manifest: {
          name: 'Grey Flowers Admin',
          short_name: 'Grey Admin',
          description: 'Grey Flowers 运营工作台',
          lang: 'zh-CN',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          theme_color: '#175A96',
          background_color: '#EDF1F4',
        },
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html}', '**/*.{woff2,png,ico}'],
          manifestTransforms: [
            (manifestEntries) => {
              const html = readFileSync(
                path.join(import.meta.dirname, 'dist', 'index.html'),
                'utf8',
              );
              const closure = [
                ...html.matchAll(/\/assets\/[^"'>]+\.(?:js|css)/g),
              ].map((m) => m[0].replace(/^\//, ''));
              const keep = new Set(['index.html', ...closure]);
              const seen = new Set<string>();
              const manifest = manifestEntries.filter((entry) => {
                if (seen.has(entry.url)) return false;
                seen.add(entry.url);
                if (keep.has(entry.url) || PWA_ICONS[entry.url]) return true;
                if (
                  entry.url.startsWith('assets/workbox-window.') &&
                  entry.url.endsWith('.js')
                )
                  return true;
                return entry.url.endsWith('.woff2');
              });
              return { manifest };
            },
          ],
          runtimeCaching: [
            {
              urlPattern: ({ url, request }) =>
                url.origin === self.location.origin &&
                request.destination === 'script' &&
                url.pathname.startsWith('/assets/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'grey-flowers-lazy-js',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: adminPort,
    },
  };
});
