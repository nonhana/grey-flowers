# Testing

## Current automation

This repository has no test framework, `test` script, test-file convention, watch command, or coverage threshold. No `*.test.*` or `*.spec.*` files are present.

Use the existing regression gate for every code change:

```sh
pnpm typecheck && pnpm lint && pnpm build
```

For a focused check, run `pnpm typecheck` or `pnpm lint`. The lint configuration intentionally ignores `prisma/**/*`, so generated Prisma code is not linted by this command.

## Prerequisites

`pnpm build` imports the server environment and needs the complete `.env` described in [BUILD.md](./BUILD.md). Do not report a test suite as passing when only these static checks have run.

## Change-specific smoke checks

- For an API change, use the development server and verify the response envelope's `success`, `payload`, and error fields.
- For a UI change, check both color modes and a narrow viewport; the site is SSR-rendered and uses responsive UnoCSS utilities.
- For Prisma changes, run `pnpm prisma:generate` before type checking.
