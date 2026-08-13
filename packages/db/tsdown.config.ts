import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  format: 'esm',
  unbundle: true,
  deps: {
    neverBundle: ['@prisma/adapter-pg', '@prisma/client', 'pg'],
  },
});
