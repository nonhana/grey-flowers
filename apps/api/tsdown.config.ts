import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/app.ts', 'src/main.ts'],
  deps: {
    neverBundle: [
      '@grey-flowers/contracts',
      '@grey-flowers/db',
      '@prisma/adapter-pg',
      '@prisma/client',
      'pg',
    ],
  },
  format: 'esm',
  sourcemap: true,
});
