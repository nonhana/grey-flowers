# Build

## Prerequisites

- Node `>=24.18.0 <25.0.0` (root `engines`, also in `.node-version`) and the pinned package manager `pnpm@11.19.0`.
- Copy `.env.example` to the workspace-root `.env`. Every package loads it via `--env-file-if-exists=../../.env`; the API's `env.ts` exits the process when required values are absent.

Required environment groups (root `.env`):

- `HANA_DATABASE_URL` — PostgreSQL URL; required by `packages/db` and `apps/api`.
- Ports — `API_PORT` (default 2408), `ADMIN_PORT` (default 2409), `MAIN_PORT` (default 2410). Admin and main derive browser origins from `API_PORT`/`MAIN_PORT`; in production they are hardcoded to `https://api.caelum.moe` / `https://caelum.moe` and the admin/main ports become optional.
- Auth (API) — `AUTH_ACCESS_TOKEN_SECRET`, `AUTH_REFRESH_TOKEN_PEPPER`: base64url, decode to ≥32 bytes, and must differ from each other.
- `API_TRUSTED_PROXY_HOPS` — optional integer 0–8: how many trusted reverse proxies sit in front of `apps/api`. Defaults to 1 in production (nginx) and 0 in development (direct). Only affects which `X-Forwarded-For` segment the auth rate limiter treats as the client IP; set it explicitly when the chain changes (CDN + nginx → 2).
- Object storage (API) — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.
- Mail — `HANA_MAIL_ENABLE`, `RESEND_API_KEY`, `RESEND_FROM`. Consumed by `apps/api` (comment-reply mail); the main site no longer sends mail.
- `NODE_ENV` — validated by `apps/api/src/env.ts`.

There is no separate `.env` inside the apps; run `pnpm dev:admin` from the repo root so it finds the root `.env`.

## Commands (run from the repository root)

| Task                               | Command                                                                |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Install                            | `pnpm install`                                                         |
| Development (main Nuxt)            | `pnpm dev:main`                                                        |
| Development (API)                  | `pnpm dev:api` (`tsx --watch src/main.ts`, listens on `API_PORT`)      |
| Development (admin)                | `pnpm dev:admin` (Vite, listens on `ADMIN_PORT`)                       |
| Production build (whole workspace) | `pnpm build`                                                           |
| Serve built main artifact          | `pnpm -F @grey-flowers/main run preview`                               |
| Type check                         | `pnpm typecheck` (root `tsc --noEmit` + per-package)                   |
| Unit tests                         | `pnpm test` (vitest for `apps/api` + `apps/admin`, no DB / no network) |
| Lint / fix                         | `pnpm lint` / `pnpm lint:fix`                                          |
| Format / check                     | `pnpm fmt` / `pnpm fmt:check`                                          |
| Prisma regeneration                | `pnpm prisma:generate`                                                 |
| Local schema sync (no migration)   | `pnpm prisma:push`                                                     |
| Apply committed migrations         | `pnpm prisma:migrate:deploy`                                           |

There is no root `pnpm dev` script — use the per-app `dev:main` / `dev:api` / `dev:admin`.

`pnpm install` runs `postinstall` hooks: the main app runs `nuxt prepare`, and `packages/db` runs Prisma `generate`.

## Build order and artifacts

`pnpm build` runs `pnpm -r --workspace-concurrency=1 run build` (topological order: contracts → db → api, with admin and main after their deps):

- `packages/contracts` → `dist/` via `tsdown` (unbundle ESM, `dist/index.mjs` + `.d.mts`). Zod 保持外部依赖。
- `packages/db` → `dist/` via `tsdown` (unbundle ESM, `dist/index.mjs` + `.d.mts`) after Prisma `generate` has produced `packages/db/prisma/generated/`; tsdown 将 generated client 编译进 `dist/prisma/generated/`（dist 自包含）。
- `apps/api` → `dist/` via `tsdown` (`dist/main.mjs`, `dist/app.mjs`, `.d.mts`). Prisma and `@grey-flowers/db` stay external to the bundle.
- `apps/main` → `apps/main/.output/` via Nuxt Nitro. No longer depends on `@grey-flowers/db` at runtime.
- `apps/admin` → `dist/` via Vite; `VITE_API_ORIGIN`/`VITE_MAIN_ORIGIN` are defined by `apps/admin/vite.config.ts` from the root `.env`, not from a separate admin env file.

## Deployment

Server-side deploy logic lives in `scripts/deploy-api.sh` / `scripts/deploy-main.sh`: each is shipped inside the deploy bundle and invoked by the workflow as `bash <file>`, so the VPS login shell (e.g. fish) never parses the deploy logic — sshd executes remote commands with the user's login shell.

All deploys are gated: each of `.github/workflows/deploy-{api,admin,main}.yml` starts a `gate` job invoking the reusable `.github/workflows/gate.yml` (install → `pnpm fmt:check` → `pnpm lint` → `pnpm typecheck` → `pnpm test`), and only builds when it passes. `.github/workflows/ci.yml` runs the same gate on PRs only.

- **api** (`deploy-api.yml`): builds `@grey-flowers/api` (topological), then `pnpm deploy` (injected workspace deps, no `--legacy`) produces a self-contained bundle — `dist/` + production `node_modules/` + `package.json` — which is scp'd to `API_DEPLOY_PATH` on the server and swapped in by the SSH step before `pm2 startOrReload` with a curl health check.
- **admin** (`deploy-admin.yml`): `vite build` → `rsync --delete` of `apps/admin/dist/` to `ADMIN_DEPLOY_PATH` (static files, served by the VPS web server).
- **main** (`deploy-main.yml`): Nuxt build → only `apps/main/.output/` is scp'd to `MAIN_DEPLOY_PATH`, then PM2 reloads `grey-flowers`. Runs on `master` pushes touching `apps/main`/`packages/contracts` (or the `article_published` repository dispatch).

`ecosystem.config.cjs` and `.env` are **not shipped from the repo and are not in the repository** — they live only on the server, hand-maintained per app directory (the historical in-repo copies are still reachable via `git history` if you need a starting template). The API's server-side config may reference a `wait_ready` mode — `apps/api/src/main.ts` emits the PM2 `ready` signal after listen.

No workflow runs `pnpm prisma:migrate:deploy`; the SSH steps only move artifacts and reload PM2. Apply a reviewed migration separately before relying on a schema change in production (notably the session refresh-rotation column).

## 测试数据库种子

```sh
pnpm prisma:reset   # 一键清空 + 重建迁移 + 自动灌入 seed 数据
pnpm prisma:seed    # 在既有库上重灌（幂等，先逆序清空全表）
```

seed 位于 `packages/db/scripts/seed.mts`，覆盖全部 14 个模型并造出大规模、差异化的
测试数据（文章标题 trgm 检索、评论内容/路径/作者/日期区间筛选、资产 purpose 目录/
媒体类型/状态、音乐/用户/活动检索等）。唯一管理员：`nonhana / nonhana@outlook.com`
密码 `20021209xiang`。`pnpm prisma:reset` 会先重放迁移再跑 seed，一条命令到位。
seed 仅应在本地/测试库上运行（脚本会对非开发目标环境提前退出）。
