# Build

## Prerequisites

- Node `>=24.18.0 <25.0.0` (root `engines`, also in `.node-version`) and the pinned package manager `pnpm@11.18.0`.
- Copy `.env.example` to the workspace-root `.env`. Every package loads it via `--env-file-if-exists=../../.env`; the main application's `server/env` and the API's `env.ts` exit the process when required values are absent.

Required environment groups (root `.env`):

- `HANA_DATABASE_URL` — PostgreSQL URL; required by `packages/db`, `apps/api`, and `apps/main`.
- Ports — `API_PORT` (default 2408), `ADMIN_PORT` (default 2409), `MAIN_PORT` (default 2410). Admin and main derive browser origins from `API_PORT`/`MAIN_PORT`; in production they are hardcoded to `https://api.caelum.moe` / `https://caelum.moe` and the admin/main ports become optional.
- Auth (API) — `AUTH_ACCESS_TOKEN_SECRET`, `AUTH_REFRESH_TOKEN_PEPPER`: base64url, decode to ≥32 bytes, and must differ from each other.
- Object storage (API) — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.
- Mail (main only) — `HANA_MAIL_ENABLE`, `RESEND_API_KEY`, `RESEND_FROM`.
- `NODE_ENV` — validated by both `apps/api/src/env.ts` and `apps/main/server/env/index.ts`.

There is no separate `.env` inside the apps; run `pnpm dev:admin` from the repo root so it finds the root `.env`.

## Commands (run from the repository root)

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Development (main Nuxt) | `pnpm dev` (alias `pnpm dev:main`) |
| Development (API) | `pnpm dev:api` (`tsx --watch src/main.ts`, listens on `API_PORT`) |
| Development (admin) | `pnpm dev:admin` (Vite, listens on `ADMIN_PORT`) |
| Production build (whole workspace) | `pnpm build` |
| Serve built main artifact | `pnpm -F @grey-flowers/main run preview` |
| Type check | `pnpm typecheck` (root `tsc --noEmit` + per-package) |
| Lint / fix | `pnpm lint` / `pnpm lint:fix` |
| Format / check | `pnpm fmt` / `pnpm fmt:check` |
| Prisma regeneration | `pnpm prisma:generate` |
| Local schema sync (no migration) | `pnpm prisma:push` |
| Apply committed migrations | `pnpm prisma:migrate:deploy` |

`pnpm install` runs `postinstall` hooks: the main app runs `nuxt prepare`, and `packages/db` runs Prisma `generate`.

## Build order and artifacts

`pnpm build` runs `pnpm -r --workspace-concurrency=1 run build` (topological order: contracts → db → api, with admin and main after their deps):

- `packages/contracts` → `dist/` (tsc, `tsc -p tsconfig.json`).
- `packages/db` → `dist/` (tsc) after Prisma `generate` has produced `packages/db/prisma/generated/`.
- `apps/api` → `dist/` via `tsdown` (`dist/main.mjs`, `dist/app.mjs`, `.d.ts`). Prisma and `@grey-flowers/db` stay external to the bundle.
- `apps/main` → `apps/main/.output/` via Nuxt Nitro.
- `apps/admin` → `dist/` via Vite; `VITE_API_ORIGIN`/`VITE_MAIN_ORIGIN` are defined by `apps/admin/vite.config.ts` from the root `.env`, not from a separate admin env file.

## Deployment

Pushing `master` (or the `article_published` repository dispatch) invokes `.github/workflows/deploy.yml`: it builds the workspace with `pnpm build`, copies only `apps/main/.output/` and `apps/main/ecosystem.config.cjs` to the VPS, then PM2 reloads `grey-flowers` running `.output/server/index.mjs` on port `2408` (`ecosystem.config.cjs` `port: 2408`).

The workflow does not run `pnpm prisma:migrate:deploy`; apply a reviewed migration separately before relying on a schema change in production. The API and admin apps are built but not deployed by this workflow.

## API CLI

pnpm does not forward a `--` separator correctly to these scripts; call tsx directly instead:

```sh
cd apps/api && node --env-file-if-exists=../../.env --import tsx src/cli/register-user.ts -- --username <name> --email <user> --password <pw> [--site <url>]
cd apps/api && node --env-file-if-exists=../../.env --import tsx src/cli/promote-admin.ts -- --email <user>
```
