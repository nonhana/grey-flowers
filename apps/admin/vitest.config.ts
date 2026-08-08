import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // 纯逻辑单测（store / 纯函数）：不渲染组件、不连网络、不碰 IndexedDB。
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
