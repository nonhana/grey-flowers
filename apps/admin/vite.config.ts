import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { themeInitScript } from './vite/theme-script-plugin.js';

const envPath = path.join(process.cwd(), '../../');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envPath, '');
  const adminPort = Number.parseInt(env.ADMIN_PORT);
  const apiPort = Number.parseInt(env.API_PORT);
  const mainPort = Number.parseInt(env.MAIN_PORT);
  const apiOrigin =
    mode === 'production'
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
