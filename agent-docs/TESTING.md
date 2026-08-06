# Testing

## Current automation

There is no test framework, `test` script, test-file convention, watch command, or coverage threshold. No `*.test.*` / `*.spec.*` files exist. Validation is static checks plus manual/scripted smoke tests.

Use the regression gate for every code change:

```sh
pnpm typecheck && pnpm lint && pnpm build
```

- `pnpm typecheck` = root `tsc -p tsconfig.json --noEmit` (root `*.ts` only) + per-package `typecheck`. Nuxt `nuxt typecheck` for `apps/main`, `tsc --noEmit` for the others.
- `pnpm lint` = ESLint (Antfu) for `apps/main`; oxlint for `apps/api`, `apps/admin`, `packages/contracts`, `packages/db`. Generated Prisma code under `packages/db/prisma/generated/` is not linted.
- Do not report a suite as passing when only static checks have run.

## Prerequisites

`pnpm build` and `pnpm dev` import application environments and need the complete root `.env` described in [BUILD.md](./BUILD.md) (`HANA_DATABASE_URL`, API/auth/R2 secrets, mail). The API process exits at startup if the environment is invalid.

## 测试数据

测试数据库数据由 `packages/db/prisma/seed.mts` 提供（见 [BUILD.md](./BUILD.md) 的
「测试数据库种子」）。运行 `pnpm prisma:reset` 即可获得覆盖全部表的真实分页/检索
数据。管理后台唯一管理员：

| Role | Username | Email | Password |
| --- | --- | --- | --- |
| Admin | `nonhana` | `nonhana@outlook.com` | `20021209xiang` |

用邮箱 `nonhana@outlook.com` 在管理后台登录界面登入。

## Change-specific smoke checks

- **API change** — run `pnpm dev:api`, then verify the envelope: `{ success: true, data, requestId }` on success, `{ success: false, error: { code, message, fields? }, requestId }` on failure, with the correct HTTP status for the code (see [API_CONVENTIONS.md](./API_CONVENTIONS.md)). Admin calls additionally need a valid bearer token and an allowed origin.
- **Admin UI change** — run `pnpm dev:admin`, exercise the flow at desktop and narrow viewport widths, and in both App color modes. The admin is a React 19 + TanStack Router SPA; check the failure and empty states, not just the happy path.
- **Main UI change** — the site is SSR-rendered; verify both color modes and a narrow viewport, and that unpublished articles stay hidden from public routes except the token-gated preview.
- **Prisma change** — run `pnpm prisma:generate` before type checking. Do not run `pnpm prisma:push` or `pnpm prisma:migrate:deploy` as a validation shortcut.
- **Cross-workspace / contract change** — change `packages/contracts`, then `pnpm build` and check that consumers in `apps/api`, `apps/admin`, and `apps/main` all compile against the new DTOs.

## Runtime regression check for database-backed routes

Start the built main app from `apps/main/.output/` with the complete environment (plus a running `apps/api`), then request a Prisma-backed page and `/rss.xml`. This verifies Nitro included the required packages and the deployed route wiring without mutating data. `rss.xml.ts` currently reads Prisma directly, so it needs no running API.
