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
- When writing React code, you must adhere to `react-compiler` best practices and avoid introducing `useCallback`, `useMemo`, and the like unless necessary.
