# Packages

## Workspace shape

Grey Flowers is a pnpm monorepo (`pnpm@11.19.0`, `pnpm-workspace.yaml`, `catalogMode: prefer`). There are five workspace packages + the root operator shell:

| Package                                          | Identity                                    | Exclusive ownership                                                                     | Build                              |
| ------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------- |
| `apps/main` (`@grey-flowers/main`)               | Public Nuxt 4 SSR rendering layer           | Pages, layouts, MDC rendering, SEO, static markdown pages                               | Nitro → `apps/main/.output/`       |
| `apps/api` (`@grey-flowers/api`)                 | Sole business data access & operation entry | Hono routes, auth/authorization, Zod validation, error mapping, use cases, transactions | `tsdown` → `dist/`                 |
| `apps/admin` (`@grey-flowers/admin`)             | Sole blog operations console                | React UI, article editor, asset/media management                                        | `vite build` → `dist/`             |
| `packages/contracts` (`@grey-flowers/contracts`) | Cross-process transport contract            | Zod DTOs, error codes, envelope types                                                   | `tsc` → `dist/`                    |
| `packages/db` (`@grey-flowers/db`)               | Prisma persistence infrastructure           | Schema, migrations, generated client, `createPrismaClient`                              | `tsc` → `dist/` + generated client |

The root `package.json` owns orchestration (`pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm fmt`, `pnpm prisma:*`) and deployment workflow config. It has no application runtime dependencies.

Authoritative design decisions: [四个项目的身份定位](../wiki/design/2026-08-01-four-project-roles.md), [Hono Backend 架构设计](../wiki/design/2026-08-01-hono-backend-architecture.md).

## Allowed dependencies

```text
apps/admin  → apps/api (HTTP), packages/contracts
apps/main   → apps/api (HTTP), packages/contracts
apps/api    → packages/contracts, packages/db
packages/db → Prisma + pg driver only
```

Prohibited:

- `apps/admin` or `apps/main` importing `@grey-flowers/db`;
- browser code reaching PostgreSQL or Prisma;
- `apps/main` keeping business `server/api` → Prisma paths outside the per-resource migration;
- `apps/admin` holding its own business rules, second MDC renderer, or publishing logic;
- `packages/contracts` or `packages/db` importing Hono, Node, or any app module.

**Migration state:** the target matrix is now fully enforced. `apps/main` has no `@grey-flowers/db` dependency; every `server/api` route proxies the API through `apiGet`/`apiMutate` (`apps/main/server/utils/api-gateway.ts`). Extend business capabilities in `apps/api` only.

## Dependency direction rules in practice

- Add a cross-package dependency only when a stable, cross-runtime reuse is proven. Do not create a generic `shared`, `ui`, or state package for anticipated reuse with a single caller.
- Public reads and management operations are different Interfaces under the same module (see [API_CONVENTIONS.md](./API_CONVENTIONS.md)); callers never filter sensitive fields client-side.
- `apps/api` exports `AppType` as a type convenience for Hono integration tests/tooling; no workspace consumer currently imports it. Never pull `apps/api` runtime code or Prisma types into a browser bundle.

## Version and dependency management

- Add shared versions to the root `catalog:` block; per-app catalogs exist for `admin`, `api`, `main`, `db`. Use `catalog:name` in package manifests, never a bare version.
- Node is pinned to `>=24.18.0 <25.0.0` (root `engines`) and `.node-version`. Pure ESM everywhere (`"type": "module"`).
- `apps/main` is the only package using ESLint (Antfu `@antfu/eslint-config`) and is excluded from `oxfmt` (`.oxfmtrc.json` `ignorePatterns: apps/main/**`). `apps/api`, `apps/admin`, `packages/contracts`, and `packages/db` use `oxlint` + `oxfmt` with the root config.
