![grey-flowers](https://static-r2.caelum.moe/grey-flowers.webp)

# Grey Flowers

Even in a gray world, flowers bloom as usual.

## Tech Stack

Built with:

- [Nuxt4](https://nuxt.com)
- [Vue3](https://vuejs.org)
- [Nuxt Content3](https://content.nuxt.com)
- [UnoCSS](https://unocss.dev)
- [Prisma](https://prisma.io)
- [PostgreSQL](https://postgresql.org)

## Workspace

- `apps/main` contains the public Nuxt SSR application.
- `packages/db` exclusively owns the Prisma schema, migrations, generated client, configuration, and database package versions.
- Run the public site and workspace checks from the repository root: `pnpm dev`, `pnpm build`, `pnpm typecheck`, and `pnpm lint`.

## Database Workflow

- `pnpm prisma:generate` regenerates the checked-in client in `packages/db/prisma/generated/`.
- `pnpm prisma:migrate:deploy` applies committed SQL migrations from `packages/db/prisma/migrations/`, including the article-search DDL.
- `pnpm prisma:push` remains a local schema-sync shortcut and is not the shipping path for search migrations.
