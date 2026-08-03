# Database

## Ownership

`packages/db` exclusively owns Prisma: schema, committed migrations, generated client, `prisma.config.ts`, and Prisma package versions. `packages/db/prisma/schema.prisma` defines the PostgreSQL schema; Prisma generates its client into `packages/db/prisma/generated/` (driver adapter `@prisma/adapter-pg`; preview feature `partialIndexes`).

Applications consume infrastructure only through `@grey-flowers/db` — `createPrismaClient(connectionString)` plus re-exported Prisma types. Never import `packages/db/prisma/generated/*` by filesystem path, and never hand-edit `prisma/generated/` or `prisma/migrations/migration_lock.toml`.

The design contract allows only `apps/api` to depend on `@grey-flowers/db` at runtime. **Current code still diverges**: `apps/main/server/utils/prisma.ts` is a legacy singleton still used by `server/api/{activity,comments,user,auth}/*` and `server/routes/rss.xml.ts`. Do not add new database access to `apps/main`; per-resource migration removes these (see [ARCHITECTURE.md](./ARCHITECTURE.md)).

## Domain map (schema.prisma)

- **Authoring:** `Article` (raw `content`, slug `to` unique, `revision`, `published`, `publishedAt`, `categoryId`, `coverAssetId`), `Tag`, `Category` (both unique `name`, `articleCount`), `ArticleSnapshot` (per-revision, `@@unique([articleId, revision])`).
- **Interaction:** `User` (`email`/`username` unique, `role` default `USER`), `Session` (refresh-hash sessions), `Comment` (path tree with `level` PARENT/CHILD), `UserMessage` (comment → receiver notification).
- **Media/activity:** `Asset` (object-storage record: `storageKey` unique, `mediaType`, `byteSize` BigInt, `status`, `deletedAt`), `ArticleInlineAsset` (`@@id([articleId, assetId])`), `Activity`, `ActivityImageAsset` (ordered images, `@@unique([activityId, position])`), `Music` (`sourceAssetId`/`coverAssetId` nullable).

Enums: `UserRole` (USER/ADMIN), `SessionRevokeReason`, `CommentLevel`, `AssetMediaType` (IMAGE/AUDIO), `AssetStatus` (AVAILABLE / PENDING_CLEANUP / DELETED).

Asset lifecycle rules belong to `apps/api` (`modules/assets/service.ts`): deletion is soft with reference checks — an asset that is still referenced (by article covers, inline assets, category covers, music) returns `ASSET_REFERENCED` (409); relations on `Asset` use `onDelete: Restrict`.

The Prisma domain reference with field detail is in [prisma-domain-model-reference.md](../wiki/design/prisma-domain-model-reference.md).

## Local synchronization and migrations

- `pnpm prisma:generate` — regenerates the checked-in client after a schema change (also runs on `pnpm install`).
- `pnpm prisma:migrate:dev` — create/apply a migration locally against a disposable database (inspected before running).
- `pnpm prisma:push` — local schema-sync shortcut; does **not** create a migration and is not the shipping path.
- `pnpm prisma:migrate:deploy` — applies the committed SQL under `packages/db/prisma/migrations/` to the configured db. Production schema work needs an intentional, committed migration with reviewed SQL.

The article-search migration creates the `pg_trgm` extension plus partial GIN indexes, including a manually written full-text document index and the expression index on `Article.title (gin_trgm_ops)`. Preserve that SQL when evolving article search; `Prisma` warns that expression indexes need manual handling in migrations.

## Environment and safety

Prisma configuration reads `HANA_DATABASE_URL` from the environment (`prisma.config.ts`, always available because every package loads the root `.env`). Use a disposable local database for schema experiments and inspect the target before any schema-mutating command.

`packages/db` contains no application environment validation, request handling, authorization, query policy, or business mutation logic. Business rules, transactions, and projection-to-DTO maps live in `apps/api` modules; the API builds its client through `createDependencies` in `apps/api/src/bootstrap/dependencies.ts`, never per-request.
