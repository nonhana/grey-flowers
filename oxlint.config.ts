export default {
  ignorePatterns: [
    'apps/main/**',
    '**/dist/**',
    '**/node_modules/**',
    'packages/db/prisma/generated/**',
    'packages/db/prisma/migrations/**',
  ],
  overrides: [
    {
      files: ['apps/admin/**/*.{ts,tsx}', 'apps/api/**/*.ts', 'packages/contracts/**/*.ts', 'packages/db/src/**/*.ts'],
    },
  ],
}
