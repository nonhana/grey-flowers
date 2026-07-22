# Build

## Prerequisites

- Use the repository's pinned package manager: `pnpm@11.15.1`.
- Copy `.env.example` to `.env` and provide every listed value. `server/env/index.ts` exits when any required value is absent; `HANA_DATABASE_URL` is also required by Prisma configuration.

## Commands

- Install: `pnpm install`
- Development server: `pnpm dev` (binds to `localhost:2408`)
- Production build: `pnpm build`
- Serve a built application: `pnpm preview`
- Generate a static site: `pnpm generate`
- Analyze the Nuxt bundle: `pnpm analyze`

`pnpm install` runs `nuxt prepare` and `prisma generate` through `postinstall`.

## Database-related build steps

- Regenerate the checked-in Prisma client after schema changes: `pnpm prisma:generate`
- Synchronize a local development database without creating a migration: `pnpm prisma:push`
- Apply committed migrations to a target database: `pnpm prisma:migrate:deploy`

## Output and deployment artifact

`pnpm build` writes the Nitro application to `.output/`. The GitHub deployment workflow copies `.output/` and `ecosystem.config.cjs` to the VPS, where PM2 runs `.output/server/index.mjs` on port `2408`.
