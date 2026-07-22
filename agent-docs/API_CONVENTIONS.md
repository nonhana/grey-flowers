# API Conventions

## Handler contract

Every `server/api/` endpoint is wrapped with `formattedEventHandler`:

```ts
export default formattedEventHandler(async (event) => {
  return { payload: data }
})
```

The JSON envelope always has `statusCode`, `statusMessage`, `success`, `payload`, and `error`. Omitted success fields default to a successful `200` response; missing payload and error values become `null`. Return `{ success: false, statusCode, statusMessage, error? }` for an expected failure, and let the wrapper format unexpected thrown errors.

## Input and output

- Read queries with `getQuery(event)` and bodies with `readBody(event)`.
- Validate body input with a colocated Zod schema and `useZodVerify` before database writes.
- Convert database values to the response shape used by the caller. Existing article and activity endpoints serialize dates and relation data before returning them.
- Client code checks `success` before using `payload`; do not change an endpoint to return bare data.

## Authentication

`server/middleware/auth.ts` verifies `Authorization: Bearer <JWT>` only for paths in `server/utils/blackList.ts`. On success it places the token data at `event.context.jwtPayload`; protected handlers read the user ID from that context.

When adding a protected endpoint, add its exact `/api/...` path to that list and retain the bearer-token contract. The current protected operations are posting or deleting comments and sending a user message.

## User Markdown

Comment content must pass through `parseCommentMarkdown`. It limits input to 2048 characters, rejects headings, HTML, images, and tables, and sanitizes the parsed result before it is stored as JSON. Do not bypass this path for comment creation.
