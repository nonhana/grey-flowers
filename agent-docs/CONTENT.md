# Content

## Two Markdown sources

Long-form articles are database records: `Article.content` is parsed by `server/api/articles/detail.get.ts` and only published articles are exposed by the public article APIs.

`public/markdown/` is not the article store. It contains only the static MDC sources for the About and Friends pages:

- `public/markdown/about.md` is served by `/api/markdown/about`.
- `public/markdown/friends.md` is served by `/api/markdown/friends`.

The allowed static slugs are an explicit `about`/`friends` whitelist in `server/utils/markdown.ts` and the `StaticMarkdownPageSlug` type in `types/markdown.d.ts`. Adding another static page requires updating both places as well as its route or consumer.

## Rendering path

Pages request static Markdown through `/api/markdown/:slug`; they do not read these files in the browser. The server uses `parseAppMarkdown`, which generates a depth-two table of contents and returns the MDC renderer payload.

At runtime, the loader checks `.output/public/markdown` first and `public/markdown` second. Keep static Markdown under `public/` so it is included in a built artifact.

## Content constraints

- Treat article and static-page Markdown as trusted authored content; comment Markdown follows the separate restrictive path in [API_CONVENTIONS.md](./API_CONVENTIONS.md).
- Preserve the reading experience: content changes must remain legible in both color modes and work on narrow screens.
