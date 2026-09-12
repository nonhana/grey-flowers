# Code Style

## General Rules

- Keep a change limited to the requested behavior. Do not reformat, rename, or add defensive fallbacks outside that scope.
- Do not extract a helper, class, or interface for a single caller; extract only after at least three callers need the same abstraction.
- Prefer the existing feature component, composable, Pinia store, or server utility over a new layer.
- Never duplicate a utility: any helper needed by two or more files belongs in `lib/` or its owning domain module — search the existing ones first.
- Always use functionality provided by the framework or an installed library when it meets the need; never reimplement it with project-local code.
- When writing TypeScript code, redundant type definitions are strictly prohibited for types that can be automatically inferred.
- Unless absolutely necessary, use arrow functions rather than regular functions for function definitions.
- Comments: code is the SSOT — a comment is one self-contained sentence for facts the code cannot express (timing contracts, `// 外部系统同步：` whitelist anchors, cross-module policy contracts, invariants/traps, fixture intent); never restate names/props, keep multi-line blocks only when business intent is too heavy for one line.

## apps/admin React Rules

- When writing React code, you must adhere to `react-compiler` best practices: do not hand-memoize with `useCallback`; `useMemo` is reserved for the article editor store factory identity. React Compiler owns function identity.
- Server state goes through TanStack Query (`app/server-state/`); never rebuild `data/loading/error → load → reload → fetchSeq` request state machines in pages, and never call `queryClient.invalidateQueries` outside the per-domain server-state modules (auth cache clearing in `store/auth.ts` is the only exception).
- `useEffect` is allowed only to synchronize an external system. The standing whitelist: debounce timer cleanup, document paste subscription, overlay exit-signal cleanup, the two PWA effects, CodeMirror action registration (editor imageActions install, activity editor submit slot), calendar DOM scroll sync, object-URL revoke, compose-menu global Escape, the article editor's initial server reload, the in-flight upload lifecycle guards (abort-on-unmount in the upload dialog shell and asset picker, dispose flag in the activity composer), the article editor's pagehide flush and online auto-resume (external systems: page lifecycle / network state driving the save chain). Anything that merely mirrors one React state into another (render-time resets included) must be expressed as derivation, `useEffectEvent`, `useSyncExternalStore` or refs — not another `useEffect`.
- Use `cn()` only when genuinely merging variables or conditional classes; calls whose arguments are all string literals must be plain `className` strings (or single-line string constants) and let tailwind lint order and wrap them.

## apps/main Nuxt Rules

- Rely on Nuxt auto-imports for framework values (Vue APIs, composables/utils exports, top-level stores, @vueuse functions) and never write them explicitly; explicit imports are reserved for what auto-imports cannot reach — type imports, non-preset runtime values (`createVNode`/`render`), component references used outside `<template>`, and symbols from unscanned locations (non-utils/types `#shared` files, `stores/modules/*`, `.d.ts` declarations, constants).
- When using `useTemplateRef`, rely on automatic inference instead of explicitly passing the generic type.
