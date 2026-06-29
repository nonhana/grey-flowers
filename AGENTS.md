# Grey Flowers

A personal publishing garden — documents technical learning, software practice, and everyday traces.
The writing is the center of gravity; the interface supports reading, not competition with content.

## Commands

- Dev: `pnpm dev`
- Build: `pnpm build`
- Type check: `pnpm typecheck`
- Lint: `pnpm lint` (@antfu/eslint-config)
- DB: `pnpm prisma:generate` (after schema changes), `pnpm prisma:push` (no migrations)
- Full verify: `pnpm typecheck && pnpm lint && pnpm build`

## Stack

- **Runtime**: Nuxt 4 + Vue 3 (SSR)
- **CSS**: UnoCSS (presetWind3 + presetMini + custom DESIGN.md tokens)
- **Content**: Nuxt Content 3 (MDC — Markdown Components)
- **DB**: Prisma + PostgreSQL
- **Auth**: JWT (jose library)
- **Email**: Resend
- **Package**: pnpm (corepack, pnpm-workspace.yaml)
- **Plugins**: @nuxt/image, @nuxtjs/seo, nuxt-og-image, @nuxtjs/color-mode

## Project Structure

```txt
pages/             — File-based routing (Nuxt 4). `[...slug].vue` renders MDC articles
server/api/        — Nitro REST endpoints (auth, articles, comments, activity, tags, categories)
server/utils/      — Shared server utilities (formattedEventHandler, prismaShortcut, mailer)
server/middleware/  — Auth middleware
components/        — Vue components grouped by feature (article/, comment/, hana/, prose/, …)
composables/       — Shared Vue composables (useRoutesArr, useRouterOptions, …)
lib/               — Shared utilities (prisma client, audioPlayer)
store/             — Pinia stores
types/             — Shared TypeScript types
prisma/            — Schema (PostgreSQL)
public/markdown/   — Article source files (MDC), served via Nuxt Content
```

## Server Convention

All API handlers use `formattedEventHandler` from `~/server/utils`:

```ts
// Response shape: { statusCode, statusMessage, success, payload, error }
export default formattedEventHandler(async (event) => {
  const data = await prisma.article.findMany(/* ... */)
  return { statusCode: 200, payload: data }
})
```

Environment variables are validated in `server/env/index.ts` (zod schema).

## Architecture Constraints

- **Content is king**: The site is a reading experience first, not a tech demo. UI decisions must serve readability, navigation, and atmosphere — not spectacle.
- **Dark/light mode**: All components must work in both themes. Use DESIGN.md color tokens through UnoCSS `@apply` rather than hardcoded colors.
- **Design system**: Visual tokens live in `DESIGN.md` + `DESIGN.json` (Ungoogled Design System format). Do not scatter magic values in components — reference tokens from the design spec.
- **API response shape**: Every endpoint returns `{ success, payload, error }` via `formattedEventHandler`. Do not return bare data.

## Simplicity Rules

- **WRITE THE MINIMAL SOLUTION.** A feature should be implemented in the simplest way that works. Do not add abstractions, configurability, or indirection that is not needed right now.
- **ONE CALLER = NO ABSTRACTION.** Do not extract a function/class/interface until there is at least 3+ callers requiring it.
- **NO DEFENSIVE CODING BEYOND THE SPEC.** Do not add null checks, type guards, error recovery, or fallback logic for cases not described in the requirements.
- **NO UNREQUESTED FEATURES.** Every line of code must be justified by the current task. Do not "future-proof".
- **NO REFORMATTING / RENAMING SIDE EFFECTS.** Only touch the lines that need to change.
- **TARGET DIFF SIZE: < 50 lines per feature.** If the diff is larger, you are over-engineering.
- **BEFORE CODING:** State your plan in 2-3 sentences. If it sounds like too much, it is.
