import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // 纯函数单测：不连接数据库、不发起网络请求。
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
