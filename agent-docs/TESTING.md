# Testing

## Current automation

This repository has no test framework, `test` script, test-file convention, watch command, or coverage threshold. No `*.test.*` or `*.spec.*` files are present.

Use the existing regression gate for every code change:

```sh
pnpm typecheck && pnpm lint && pnpm build
```

For a focused check, run `pnpm typecheck` or `pnpm lint`. The database package lints its source interface only; generated Prisma code under `packages/db/prisma/generated/` is not linted.

## Prerequisites

`pnpm build` imports the main application server environment and needs the complete workspace-root `.env` described in [BUILD.md](./BUILD.md). Do not report a test suite as passing when only these static checks have run.

## Change-specific smoke checks

- For an API change, use the development server and verify the response envelope's `success`, `payload`, and error fields.
- For a UI change, check both color modes and a narrow viewport; the site is SSR-rendered and uses responsive UnoCSS utilities.
- For Prisma changes, run `pnpm prisma:generate` before type checking. Do not run `pnpm prisma:push` or `pnpm prisma:migrate:deploy` as a validation shortcut.
- For a workspace or database-package change, start the built application from `apps/main/.output/` with the complete environment, then request a Prisma-backed page and `/rss.xml`. This verifies that Nitro included `@grey-flowers/db` in the deployable artifact without mutating data.
