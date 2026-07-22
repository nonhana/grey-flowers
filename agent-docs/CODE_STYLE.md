# Code Style

These rules supplement the Antfu ESLint configuration and `.editorconfig`.

## Scope and simplicity

- Keep a change limited to the requested behavior. Do not reformat, rename, or add defensive fallbacks outside that scope.
- Do not extract a helper, class, or interface for a single caller; extract only after at least three callers need the same abstraction.
- Prefer the existing feature component, composable, Pinia store, or server utility over a new layer.

## Vue and UnoCSS

- Use `~` for `app/` imports, `#shared` for runtime-neutral shared code, `#server` for server-only code, and `~~` for root-level resources. Rely on Nuxt auto-imports and component auto-registration where the surrounding code does.
- Keep components in their existing feature group. `app/components/hana/` holds reusable UI primitives, while `app/components/prose/*.global.vue` supplies global MDC element renderers.
- For new UI, start with `DESIGN.md`, `DESIGN.json`, and existing UnoCSS `hana-*` shortcuts. Do not introduce scattered color tokens or a light-only treatment; every component must work in light and dark mode.
- Preserve the reading-first product direction: typography, navigation, and article content take priority over decorative motion or controls.

## Server code

- Use `formattedEventHandler` for `server/api/` handlers and return its partial response object. Read [API_CONVENTIONS.md](./API_CONVENTIONS.md) before altering endpoint behavior.
- Validate request bodies with the local Zod pattern (`useZodVerify`) before using them in a Prisma operation.
