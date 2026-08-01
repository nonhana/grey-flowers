# Architecture

## Workspace shape

Grey Flowers is a pnpm workspace with one public Nuxt 4 SSR application and one reusable database-infrastructure package. Browser pages fetch Nitro APIs. The public application's server owns authentication, Markdown parsing, email integration, query policy, and business mutations.

- `apps/main` (`@grey-flowers/main`) is the public Nuxt renderer.
- `packages/db` (`@grey-flowers/db`) provides Prisma infrastructure only.
- The workspace root owns orchestration commands, repository tooling, and deployment workflow configuration. It has no application runtime dependencies.

## Directory responsibilities

- `apps/main/app/` — Nuxt 4 source directory. It contains `app.vue`, the application shell, routes, layouts, components, composables, plugins, stores, browser-only utilities, and curated client data.
- `apps/main/app/pages/` — file-based routes; article detail is `app/pages/articles/[article].vue`, while `[...slug].vue` is the 404 page.
- `apps/main/app/components/` — feature UI. `hana/` is the shared component set; `prose/` overrides MDC elements globally.
- `apps/main/app/stores/` — Pinia modules for client application state.
- `apps/main/shared/` — runtime-neutral code used by both the Vue application and Nitro: site metadata, API/view-model types, and shared utilities. It must not import Vue or server-only modules. It remains Nuxt-local; do not create a generic workspace shared package for this single caller.
- `apps/main/server/api/` — HTTP API endpoints; the filename determines the route and HTTP method.
- `apps/main/server/composables/`, `apps/main/server/middleware/`, and `apps/main/server/utils/` — validation, authentication, Prisma composition, OG-image URL generation, and other server-only behavior.
- `apps/main/public/` — shipped static assets, including the two static MDC pages described in [CONTENT.md](./CONTENT.md).
- `packages/db/prisma/` — Prisma schema, committed migrations, generated client, and Prisma configuration.
- `packages/db/src/` — the narrow public database package interface.

## Boundaries

- Keep browser code out of `server/` and do not import server-only modules into pages, components, stores, or client composables.
- In `apps/main`, use `~` for `app/`, `#shared` for `shared/`, `#server` for `server/`, and `~~` for application-root resources. Do not use `~~` to reach Prisma internals.
- Access the database through `#server/utils/prisma`, the public application's singleton composition root. It validates the application environment and calls `createPrismaClient` from `@grey-flowers/db`; keep reusable select objects and serializers in `apps/main/server/utils/`.
- `packages/db` contains no application environment validation, request handling, authorization, query policy, or business mutation logic. Applications import Prisma types and `createPrismaClient` only from `@grey-flowers/db`, never from `prisma/generated` by a filesystem path.
- Do not hand-edit `packages/db/prisma/generated/` or `packages/db/prisma/migrations/migration_lock.toml`; regenerate client output and commit intentional migration SQL instead.
- Server environment validation is eager. Modules importing `#server/env` require all values from `.env.example`, including when imported indirectly by `#server/utils/prisma`.

## Deployment boundary

Pushing `master` invokes `.github/workflows/deploy.yml`, which builds the workspace and reloads the PM2 process from `apps/main/.output/`. The workflow copies that directory to the VPS deployment root as `.output/`. It does not run `pnpm prisma:migrate:deploy`; apply a reviewed migration separately before relying on a schema change in production.

## Future application boundary

A future `apps/admin` and `apps/api` must be separate workspace packages. Neither exists yet. Hono is not a database writer today, and the Nuxt application's route, authentication, and database behavior remains unchanged by this workspace foundation.
