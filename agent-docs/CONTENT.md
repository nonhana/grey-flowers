# Content

## Article content model

Long-form articles are database records. `Article.content` is the raw Markdown/MDC text and the SSOT for authoring — editors, preview, and migrations must never rewrite, drop, or degrade MDC directives. The API stores and returns the raw text; the main site renders it.

- Public article endpoints (`apps/api` `/public/articles/*`) expose published articles only. `Article.title`/`Article.alt` unique constraints used to exist; they were relaxed with article versioning, so uniqueness today is governed by business logic in `apps/api`, not DB constraints.
- `published` starts `false`; publishing sets `publishedAt = now()` on first publish. Unpublishing hides it from all public routes.
- `to` (the slug, e.g. `/articles/foo-bar`) is unique and validated by a lowercase-dash regex in `packages/contracts`.

## Editing and versioning semantics (slice 2 workflow)

- Save (`PATCH /articles/:id`) is revision-guarded. The client sends the `revision` it based on; a mismatch returns `ARTICLE_STALE` (409). `createSnapshot` / `preserveServerSnapshot` booleans drive snapshot creation and conflict loss-avoidance; snapshots are per-revision (`ArticleSnapshot`, unique `[articleId, revision]`).
- Snapshots are listed via `GET /articles/:id/snapshots` and can restore earlier versions (restore semantics negotiated with `ARTICLE_STALE`).
- `wordCount` is computed server-side (MDC-stripped, CJK per char + ASCII per word) and is stored per article and snapshot — do not compute or send it from the client.

## Managed assets inside Markdown

`ArticleInlineAsset` links assets referenced from the article body. At save time the API extracts managed references from the MDC text (via `@nuxtjs/mdc`), validates their delivery `URL`s, and reconciles the `ArticleInlineAsset` rows. Ordinary external image URLs remain expressible and are not silently rewritten to managed assets. Covers (`coverAssetId`) are normalized server-side to the asset delivery URL.

## Preview

The admin mints a short-lived preview token (`POST /articles/:id/preview-token`) and opens the main site detail URL with it. `apps/main/server/api/articles/detail.get.ts` first tries the public detail; on `NOT_FOUND` with a token it falls back to `GET /public/articles/preview`. 防泄密由两层组成（都落在**最终页面响应**上，内部 API 路由上设置的 header 不会冒泡到最终 HTML）：`apps/main/server/middleware/preview-headers.ts` 按「文章路径 + `?preview=`」写入 `Cache-Control: no-store` 与 `Referrer-Policy: no-referrer`（防缓存、防 token 进 Referer）；`noindex` 则由 `[article].vue` 在 preview 时注入 `<meta name="robots" content="noindex, nofollow">`（`@nuxtjs/seo` 会在响应末段改写 `X-Robots-Tag`，header 方案在那里会被覆盖）。token 刻意放在 query —— SSR 必须在服务端读取它 —— 因此它保持 15 分钟、单版本约束。

## Rendered markdown (main site)

- `apps/main/server/utils/markdown.ts` (`parseAppMarkdown`) generates a depth-two table of contents and returns the MDC renderer payload; `components/prose/` overrides MDC element rendering globally and `components/hana/` provides shared feature components. Article detail SSR composes these for reading pages.
- Static Markdown pages are not articles. `apps/main/public/markdown/about.md` and `friends.md` are served by `/api/markdown/:slug`, gated by an explicit `about`/`friends` whitelist (the `StaticMarkdownPageSlug` type in `apps/main/shared/types/markdown.d.ts` plus the whitelist in `server/utils/markdown.ts`). Adding a static page requires updating both places and its consumer.
- Comments do not use this path. Comment and activity Markdown both use the restricted sanitizer factory `apps/api/src/lib/restricted-markdown.ts` (comments: `apps/api/src/modules/comments/comment-markdown.ts`, activities: `apps/api/src/modules/activities/activity-markdown.ts`); raw HTML is off, heading/html/image/table are rejected, and `href` protocols are whitelisted.

## Content constraints

- Treat article and static-page Markdown as trusted authored content.
- Preserve the reading experience: content changes must stay legible in both color modes and on narrow screens; keep `prose/` and `hana/` semantics intact when touching renderers.
