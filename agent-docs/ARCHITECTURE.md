# Architecture

## Application shape

Grey Flowers is a single Nuxt 4 SSR application. Browser pages fetch Nitro APIs, and the server owns Prisma, authentication, Markdown parsing, and email integration.

## Directory responsibilities

- `app.vue` and `layouts/` — application shell and shared page chrome.
- `pages/` — file-based routes; article detail is `pages/articles/[article].vue`, while `[...slug].vue` is the 404 page.
- `components/` — feature UI. `hana/` is the shared component set; `prose/` overrides MDC elements globally.
- `composables/` — reusable client-side state and behavior.
- `store/` — Pinia modules for client application state.
- `data/` and `json/` — site metadata and curated links/works data.
- `server/api/` — HTTP API endpoints; the filename determines the route and HTTP method.
- `server/composables/`, `server/middleware/`, and `server/utils/` — validation, authentication, and shared server behavior.
- `lib/prisma.ts` — the only Prisma client instance; it uses the PostgreSQL adapter and validated environment.
- `prisma/` — schema, committed migrations, and generated Prisma client.
- `public/` — shipped static assets, including the two static MDC pages described in [CONTENT.md](./CONTENT.md).

## Boundaries

- Keep browser code out of `server/` and do not import server-only modules into pages, components, stores, or client composables.
- Access the database through `~/lib/prisma`; keep reusable select objects and serializers in `server/utils/`.
- Do not hand-edit `prisma/generated/` or `prisma/migrations/migration_lock.toml`; regenerate client output and commit intentional migration SQL instead.
- Server environment validation is eager. Modules importing `~/server/env` require all values from `.env.example`, including when imported indirectly by `~/lib/prisma`.

## Deployment boundary

Pushing `master` invokes `.github/workflows/deploy.yml`, which builds and reloads the PM2 process from `.output/`. The workflow does not run `pnpm prisma:migrate:deploy`; apply a reviewed migration separately before relying on a schema change in production.
