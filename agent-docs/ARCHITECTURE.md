# Architecture

## Application shape

Grey Flowers is a single Nuxt 4 SSR application. Browser pages fetch Nitro APIs, and the server owns Prisma, authentication, Markdown parsing, and email integration.

## Directory responsibilities

- `app/` — Nuxt 4 source directory. It contains `app.vue`, the application shell, routes, layouts, components, composables, plugins, stores, browser-only utilities, and curated client data.
- `app/pages/` — file-based routes; article detail is `app/pages/articles/[article].vue`, while `[...slug].vue` is the 404 page.
- `app/components/` — feature UI. `hana/` is the shared component set; `prose/` overrides MDC elements globally.
- `app/stores/` — Pinia modules for client application state.
- `shared/` — runtime-neutral code used by both the Vue application and Nitro: site metadata, API/view-model types, and shared utilities. It must not import Vue or server-only modules.
- `server/api/` — HTTP API endpoints; the filename determines the route and HTTP method.
- `server/composables/`, `server/middleware/`, and `server/utils/` — validation, authentication, Prisma access, OG-image URL generation, and other server-only behavior.
- `prisma/` — schema, committed migrations, and generated Prisma client.
- `public/` — shipped static assets, including the two static MDC pages described in [CONTENT.md](./CONTENT.md).

## Boundaries

- Keep browser code out of `server/` and do not import server-only modules into pages, components, stores, or client composables.
- Use `~` for `app/`, `#shared` for `shared/`, `#server` for `server/`, and `~~` for root-level resources such as `prisma/`.
- Access the database through `#server/utils/prisma`; keep reusable select objects and serializers in `server/utils/`.
- Do not hand-edit `prisma/generated/` or `prisma/migrations/migration_lock.toml`; regenerate client output and commit intentional migration SQL instead.
- Server environment validation is eager. Modules importing `#server/env` require all values from `.env.example`, including when imported indirectly by `#server/utils/prisma`.

## Deployment boundary

Pushing `master` invokes `.github/workflows/deploy.yml`, which builds and reloads the PM2 process from `.output/`. The workflow does not run `pnpm prisma:migrate:deploy`; apply a reviewed migration separately before relying on a schema change in production.
