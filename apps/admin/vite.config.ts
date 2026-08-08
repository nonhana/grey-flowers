import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

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
      // react-compiler 的唯一注入通道：plugin-react 6 的 react() 只负责 JSX(oxc)，
      // compiler 需经 reactCompilerPreset + @rolldown/plugin-babel 应用（无重复转换）。
      babel({
        presets: [reactCompilerPreset()],
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
