# Database

## Prisma client

`prisma/schema.prisma` defines the PostgreSQL schema. Prisma generates its client into `prisma/generated/`, and application code imports that client and its model types through `~/prisma/generated/...`. `~/lib/prisma` creates the single client with `PrismaPg` and `HANA_DATABASE_URL`.

Never edit `prisma/generated/` directly. After a schema change, regenerate it with:

```sh
pnpm prisma:generate
```

## Local synchronization and migrations

- `pnpm prisma:push` is a local schema-sync shortcut. It does not create a migration.
- `pnpm prisma:migrate:deploy` applies the committed SQL under `prisma/migrations/` to the configured database.
- Production schema work needs an intentional, committed migration; do not rely on `prisma:push` to ship it.

The article search migration creates the `pg_trgm` extension plus partial GIN indexes, including a manually written full-text document index. Preserve that SQL when evolving article search.

## Environment and safety

Prisma configuration reads `HANA_DATABASE_URL` from the environment. Use a disposable local database for schema experiments, and inspect the target before running any schema-mutating command. `prisma/migrations/migration_lock.toml` is Prisma-managed and explicitly must not be edited manually.
