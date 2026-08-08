# API Conventions

The API is `apps/api`, a Hono application that is the sole business data access and operation entry. It is the only place where transport contracts, validation, auth/authorization, and transactions live. See [四个项目的身份定位](../wiki/design/2026-08-01-four-project-roles.md) and [Hono Backend 架构设计](../wiki/design/2026-08-01-hono-backend-architecture.md).

## Response envelope

Every endpoint returns one of two shapes with `requestId`:

```jsonc
// success (HTTP status 200 unless noted)
{ "success": true, "data": <DTO>, "requestId": "..." }

// failure
{ "success": false, "error": { "code": "VALIDATION_FAILED", "message": "...", "fields": { "<field>": ["..."] } }, "requestId": "..." }
```

- Rendered by `createSuccess` / `createFailure` and routed through `handleError` in `apps/api/src/http/errors.ts`. Do not invent a per-module response shape.
- `fields` appears only for validation failures (400); `code` is one of `ApiErrorCode` from `packages/contracts` (`@grey-flowers/contracts`, `auth.ts`).

## Error codes → HTTP status

| Code | Status | When |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400 | Zod/input failure, incl. `fields` map |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `AUTH_REQUIRED` | 401 | Missing/invalid bearer token or session |
| `AUTH_FORBIDDEN` | 403 | Authenticated but not `ADMIN`; also disallowed origin on origin-gated routes |
| `NOT_FOUND` | 404 | Resource not found; also the app's global `notFound` |
| `CONFLICT` | 409 | Name/slug/state conflict (e.g. `Tag.name` or `Category.name` already taken; suggestion text rides the `message` channel) |
| `ARTICLE_STALE` | 409 | Article was changed elsewhere; resolve the conflict first |
| `ASSET_REFERENCED` | 409 | Asset still referenced and cannot be changed/deleted |
| `ASSET_PAYLOAD_TOO_LARGE` | 413 | Upload exceeds the limit |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | File type not allowed |
| `UPLOAD_FAILED` | 502 | Object storage write failed |
| `RATE_LIMITED` | 429 | Auth endpoints rate-limited (IP/account window exceeded) |
| `INTERNAL_ERROR` | 500 | Unhandled error (logged with `requestId` and error detail via the injected pino logger) |

## Authentication & principal

- Header auth: `Authorization: Bearer <accessToken>`. Access token is a signed JWT, TTL 900 s, verified by `requirePrincipal` (`apps/api/src/http/middleware/require-principal.ts`), audience `grey-flowers-web`.
- Refresh: cookie `gf_refresh`. `POST /auth/refresh` **rotates** the refresh secret every call: the old hash moves to `previousRefreshSecretHash`, a new secret is written back to the cookie, and `lastUsedAt` slides forward within the 30-day session. Presenting an already-rotated (old) credential triggers reuse detection — the user's active sessions are revoked with `REUSE_DETECTED`, forcing re-login. Refresh secrets are hashed and stored in `Session`. Only the client's transport layer talks to `/auth/refresh`.
- `requireRole('ADMIN')` gates every management route (`AUTH_FORBIDDEN` otherwise). `requireAllowedOrigin` gates auth origin-sensitive endpoints.
- Admin session: `GET /auth/session` returns the `Principal`; `PATCH /auth/me` updates profile/credentials; `POST /auth/logout` revokes the session.
- CORS (`apps/api/src/app.ts`) allows only origins in the derived `AUTH_ALLOWED_ORIGINS` (production: `https://caelum.moe`, `https://admin.caelum.moe`), `credentials: true`, exposes `X-Request-Id`.

## Rate limiting

`/auth/register`, `/auth/login`, `/auth/refresh` are IP-window limited (`lib/rate-limit.ts`, in-memory sliding window, 15 min / 30 attempts per IP); `/auth/login` is additionally limited per account (15 min / 10 attempts) to blunt cross-IP credential stuffing. Exceeding a window returns `RATE_LIMITED` (429). Single-instance deployments only.

## Route map

Mounted in `createApp`; public reads and management operations are distinct route groups sharing module internals (public returns published data only):

| Mount | Auth | Notes |
| --- | --- | --- |
| `/auth/*` | mixed | register/login/refresh/logout (origin-gated + rate-limited), session, me |
| `/assets*` | `ADMIN` | upload (multipart), list, detail, `PATCH /:id` set status, `DELETE /:id` |
| `/articles*` | `ADMIN` | create, list, detail, `PATCH /:id` save, publish/unpublish, delete, snapshots, preview-token |
| `/activities*` | `ADMIN` | CRUD for activity feed |
| `/comments*` | `ADMIN` | comment moderation |
| `/music*` | `ADMIN` | music library CRUD |
| `/users*` | `ADMIN` | user management |
| `/overview*` | `ADMIN` | ops dashboard aggregates |
| `/categories*`, `/tags*` | `ADMIN` | CRUD for taxonomy |
| `/public/*` | none | `public/articles/*` (list/detail/search/neighbors/dates/count/preview), `public/activities`, `public/comments`, `public/music`, `public/users`, `public/tags`, `public/categories` |

## DTO rules (`packages/contracts`)

- All schemas are `.strict()` (unknown key is a validation error) and never expose Prisma model/file types.
- Response contracts are built with `apiSuccessSchema(dataSchema)`; failure with `apiFailureSchema`. Consumers decode with the matching schema.
- Input is validated at the HTTP boundary (`@hono/zod-validator` or `parseBody` + `zod-validator`); DB records are mapped to DTOs in each module's `contracts.ts` — never returned raw.
- Conventions already settled in modules:
  - `Article` slug (`to`): lowercase letters/digits/hyphens, `regex` in `articleCreateInputSchema`. Slug collisions surface a suggested suffix via the failure `message`, not new fields.
  - Save input carries `createSnapshot` / `preserveServerSnapshot` booleans; out-of-date `revision` → `ARTICLE_STALE` (409). The save's optimistic lock is atomic: `UPDATE ... WHERE id = ? AND revision = ?` (a stale concurrent save fails with `ARTICLE_STALE`).
  - Publishing an unpublished article sets `publishedAt = now()`; `PATCH /articles/:id/publish` and `/unpublish` are bodyless operations.
  - `wordCount` is computed server-side from MDC-stripped text (CJK per character, ASCII letters/numbers per word) — never sent by the client.
  - Cover consistency: when `coverAssetId` is set, the server normalizes `cover` to the asset's delivery URL (applies to articles and `categorySaveInputSchema`).
  - Preview: `POST /articles/:id/preview-token` mints a short-lived (15 min) token; `GET /public/articles/preview?path=&token=` serves a draft one-shot under `noindex`, `Cache-Control: no-store` and `Referrer-Policy: no-referrer` for the main site's SSR. The token rides the query intentionally — SSR must read it server-side.

## Admin client conventions

`apps/admin/src/app/api/` is the reference HTTP client:

- `createHttp` wraps `ky` with `credentials: 'include'`, `retry: 0`, `throwHttpErrors: false`; every request decodes the body through a `*ResponseSchema` then falls back to `apiFailureSchema`.
- Authenticated calls attach the bearer token; on `AUTH_REQUIRED` the transport runs a single-flight `/auth/refresh` and retries once (`refreshOnce`). Refresh failure clears the token and notifies the app (see `setSessionExpiredHandler`).
- The short-lived access token lives only in memory (`getAccessToken`/`setAccessToken` in `index.ts`), never `localStorage`; a page reload re-establishes it from the httpOnly refresh cookie.
- Uploads (multipart) go through an XHR path (`upload`) so `onUploadProgress` gets real progress (0..1) and the same envelope/refresh semantics apply; a `Content-Length` guard in `apps/api` rejects oversize uploads early (`ASSET_PAYLOAD_TOO_LARGE`).
- The main site consumes public endpoints with the read-only `apiGet` adapter (`apps/main/server/utils/api-gateway.ts`); it is transport-only, no business rules.

## Logging

Each request gets a `requestId` (`http/middleware/request-id.ts`) surfaced in the envelope and the pino logs (`requestLogger`, `bootstrap/logger.ts`). `handleError` logs the full unhandled error (message/stack via `err` field) with the `requestId` so 500s are debuggable.
