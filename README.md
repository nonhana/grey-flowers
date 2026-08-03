![grey-flowers](https://static-r2.caelum.moe/grey-flowers.webp)

# Grey Flowers

Even in a gray world, flowers bloom as usual.

## Tech Stack

Built with:

- [Nuxt4](https://nuxt.com)
- [Vue3](https://vuejs.org)
- [MDC](https://mdc.unjs.io/)
- [Hono](https://hono.dev)
- [React 19](https://react.dev)
- [UnoCSS](https://unocss.dev)
- [Prisma](https://prisma.io)
- [PostgreSQL](https://postgresql.org)

## Workspace

- `apps/main` contains the public Nuxt SSR application.
- `apps/api` is the Hono backend and the only entry to business data.
- `apps/admin` is the React console for managing content and media.
- `packages/contracts` holds the shared Zod DTOs and error codes.
- `packages/db` exclusively owns the Prisma schema, migrations, generated client, configuration, and database package versions.
- Run the site and workspace checks from the repository root: `pnpm dev`, `pnpm dev:api`, `pnpm dev:admin`, `pnpm build`, `pnpm typecheck`, and `pnpm lint`.
