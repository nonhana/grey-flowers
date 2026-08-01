# Database

## Prisma client

`packages/db` is the exclusive owner of Prisma configuration, package versions, schema, migrations, and generated client output. `packages/db/prisma/schema.prisma` defines the PostgreSQL schema, and Prisma generates its client into `packages/db/prisma/generated/`.

Applications consume Prisma infrastructure only through `@grey-flowers/db`. The public interface re-exports the required Prisma types and exposes `createPrismaClient(connectionString)`. `apps/main/server/utils/prisma.ts` remains the public site's singleton composition root: it validates `HANA_DATABASE_URL` through the main application's environment module, then calls that factory.

Never edit `packages/db/prisma/generated/` directly. After a schema change, regenerate it with:

```sh
pnpm prisma:generate
```

## Local synchronization and migrations

- `pnpm prisma:push` is a local schema-sync shortcut. It does not create a migration.
- `pnpm prisma:migrate:deploy` applies the committed SQL under `packages/db/prisma/migrations/` to the configured database.
- Production schema work needs an intentional, committed migration; do not rely on `prisma:push` to ship it.

The article search migration creates the `pg_trgm` extension plus partial GIN indexes, including a manually written full-text document index. Preserve that SQL when evolving article search.

## Environment and safety

Prisma configuration reads `HANA_DATABASE_URL` from the environment. Use a disposable local database for schema experiments, and inspect the target before running any schema-mutating command. `packages/db/prisma/migrations/migration_lock.toml` is Prisma-managed and explicitly must not be edited manually.

Do not import `packages/db/prisma/generated/*` by a filesystem path from an application. Do not put application environment validation, request handling, authorization, query policy, or business mutation logic in `packages/db`.
