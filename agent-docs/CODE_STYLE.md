# Code Style

- Keep a change limited to the requested behavior. Do not reformat, rename, or add defensive fallbacks outside that scope.
- Do not extract a helper, class, or interface for a single caller; extract only after at least three callers need the same abstraction.
- Prefer the existing feature component, composable, Pinia store, or server utility over a new layer.
- Never duplicate a utility: any helper needed by two or more files belongs in `lib/` or its owning domain module — search the existing ones first.
- Always use functionality provided by the framework or an installed library when it meets the need; never reimplement it with project-local code.
- When writing TypeScript code, redundant type definitions are strictly prohibited for types that can be automatically inferred. For example:

  ```ts
  const server = serve({}, (info: AddressInfo) => {});
  ```

  prefer to:

  ```ts
  const server = serve({}, (info) => {});
  ```

- Unless absolutely necessary, use arrow functions rather than regular functions for function definitions.
- When writing React code, you must adhere to `react-compiler` best practices: do not hand-memoize with `useCallback`; `useMemo` is reserved for the article editor store factory identity. React Compiler owns function identity.
- Server state goes through TanStack Query (`app/server-state/`); never rebuild `data/loading/error → load → reload → fetchSeq` request state machines in pages, and never call `queryClient.invalidateQueries` outside the per-domain server-state modules (auth cache clearing in `store/auth.ts` is the only exception).
- `useEffect` is allowed only to synchronize an external system. The standing whitelist: debounce timer cleanup, document paste subscription, overlay exit-signal cleanup, the two PWA effects, CodeMirror action registration, calendar DOM scroll sync, object-URL revoke, compose-menu global Escape, the article editor's initial server reload, and the in-flight upload lifecycle guards (abort-on-unmount in the upload dialog shell and asset picker, dispose flag in the activity composer). Anything that merely mirrors one React state into another (render-time resets included) must be expressed as derivation, `useEffectEvent`, `useSyncExternalStore`, or Query keys instead.
