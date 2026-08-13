import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/app.ts', 'src/main.ts'],
  deps: {
    neverBundle: [
      '@aws-sdk/client-s3',
      '@grey-flowers/contracts',
      '@grey-flowers/db',
      '@prisma/adapter-pg',
      '@prisma/client',
      '@nuxtjs/mdc',
      'file-type',
      'music-metadata',
      'pg',
      'pinyin-pro',
      'sharp',
    ],
  },
  format: 'esm',
});
