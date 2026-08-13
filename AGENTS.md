# Grey Flowers

Grey Flowers is a personal publishing garden for technical learning, software practice, self-exploration, and everyday traces.

It is a pnpm monorepo: a Nuxt 4 public site (`apps/main`), a Hono business API (`apps/api`), a React operations console (`apps/admin`), and shared contract + Prisma infrastructure (`packages/contracts`, `packages/db`). Design and decision records live in `wiki/` (Chinese).

## Agent Docs

Read the matching guide before changing that area:

- [PACKAGES.md](./agent-docs/PACKAGES.md) — before choosing which package owns a capability, or adding/importing across package boundaries
- [BUILD.md](./agent-docs/BUILD.md) — before installing, running, building, or preparing an artifact
- [TESTING.md](./agent-docs/TESTING.md) — before choosing validation or changing tests
- [CODE_STYLE.md](./agent-docs/CODE_STYLE.md) — before writing Vue, TypeScript, UnoCSS, or React code
- [ARCHITECTURE.md](./agent-docs/ARCHITECTURE.md) — before changing module boundaries, routes, or shared modules
- [API_CONVENTIONS.md](./agent-docs/API_CONVENTIONS.md) — before adding or changing API endpoints, DTOs, or error handling
- [CONTENT.md](./agent-docs/CONTENT.md) — before editing MDC pages or article rendering
- [DATABASE.md](./agent-docs/DATABASE.md) — before changing Prisma models, generated client code, or migrations
