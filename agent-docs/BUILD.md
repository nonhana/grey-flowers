# Build

## Prerequisites

- Use Node `>=24.18.0 <25.0.0` and the repository's pinned package manager: `pnpm@11.18.0`.
- Copy `.env.example` to the workspace-root `.env` and provide every listed value. `apps/main/server/env/index.ts` exits when any required value is absent; `HANA_DATABASE_URL` is also required by Prisma configuration.

## Commands

- Install: `pnpm install`
- Development server: `pnpm dev` (binds to `localhost:2408`)
- Production build: `pnpm build`
- Serve a built application: `pnpm --filter @grey-flowers/main run preview`
- Generate a static site: `pnpm --filter @grey-flowers/main run generate`
- Analyze the Nuxt bundle: `pnpm --filter @grey-flowers/main run analyze`

`pnpm install` runs the main application's Nuxt preparation and the database package's Prisma generation through package `postinstall` scripts.

## Database-related build steps

- Regenerate the checked-in Prisma client after schema changes: `pnpm prisma:generate`
- Synchronize a local development database without creating a migration: `pnpm prisma:push`
- Apply committed migrations to a target database: `pnpm prisma:migrate:deploy`

## Output and deployment artifact

`pnpm build` first compiles `packages/db`, then writes the Nuxt Nitro application to `apps/main/.output/`. The GitHub deployment workflow copies `apps/main/.output/` and `apps/main/ecosystem.config.cjs` into the VPS deployment layout, where PM2 runs `.output/server/index.mjs` on port `2408`.
