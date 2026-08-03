# Grey Flowers

Grey Flowers is a personal publishing garden for technical learning, software practice, self-exploration, and everyday traces.

## Workspace

- The repository root is the pnpm workspace and operator entrypoint. Use its stable commands: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, and `pnpm prisma:*`.
- `apps/main` is the public Nuxt application. Its deployed Nitro artifact is `apps/main/.output/`.
- `packages/db` exclusively owns Prisma configuration, schema, migrations, generated client, and Prisma package versions. Applications consume `@grey-flowers/db`; do not import its generated client by filesystem path.

## Agent Docs

Read the matching guide before changing that area:

- [BUILD.md](./agent-docs/BUILD.md) — installing dependencies, running, building, or preparing an artifact
- [TESTING.md](./agent-docs/TESTING.md) — selecting validation for a change or adding test coverage
- [CODE_STYLE.md](./agent-docs/CODE_STYLE.md) — writing Vue, TypeScript, or UnoCSS
- [ARCHITECTURE.md](./agent-docs/ARCHITECTURE.md) — changing module boundaries, routes, or shared modules
- [CONTENT.md](./agent-docs/CONTENT.md) — editing MDC pages or article rendering
- [DATABASE.md](./agent-docs/DATABASE.md) — changing Prisma models, generated client code, or migrations

## wiki

The `wiki` directory contains the project's design and decision-making documents, which can be accessed as needed.
