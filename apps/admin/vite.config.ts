import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { themeInitScript } from './vite/theme-script-plugin.js';

// PWA 安装图标白名单（D11）：与 pwaAssets preset 输出一一对应，均位于 dist 根。
// 静态字面量表 → Record；manifestTransforms 里的入口闭包集合才用 Set（动态构建）。
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
          integration: {
            // 源图位于 pwa-source/（public/ 之外，避免被 Vite 复制进产物）。
            // 生成器按「publicDir 相对源图」推导 dist 内图标输出目录；这里把
            // publicDir 指向源图所在目录，使图标仍落在 dist 根，URL 保持 /favicon.ico
            // /pwa-*.png 等（head links / manifest icons 由 basePath + preset 名决定）。
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
          // D11（见 wiki/plans/2026-08-10-admin-pwa-refactor.md）：
          // 预缓存 = 入口闭包 + CSS + html + 自托管 WOFF2 + 安装图标；
          // 懒路由 JS 首次访问后由 runtime CacheFirst 接管；API/外部字体不缓存。
          globPatterns: ['**/*.{js,css,html}', '**/*.{woff2,png,ico}'],
          manifestTransforms: [
            // 以 built index.html 的入口静态闭包为白名单，滤掉全部懒路由 JS。
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
                // workbox-window.prod.es5-*.js：PWA 注册/更新检测运行时模块，
                // 由入口动态 import（不在 index.html 静态闭包），但每次加载都要用，
                // 属 app shell，需随 shell 预缓存。
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
              // 同源 hashed 懒路由 JS：首次访问后 CacheFirst（内容寻址、不可变）。
              // API（跨域 api.caelum.moe）与外部字体不在同源 /assets/ 下，不被命中。
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
