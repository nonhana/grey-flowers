import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('HANA_DATABASE_URL'),
  },
  migrations: {
    seed: 'node --env-file-if-exists=../../.env --import tsx prisma/seed.mts',
  },
});
