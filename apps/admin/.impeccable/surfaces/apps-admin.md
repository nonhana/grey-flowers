---
version: 1
slug: 'apps-admin'
primary_target: 'apps/admin'
related_targets: []
---

# Admin console (Operate)

## Scope & visitor mode

Operate register. The whole authenticated console: the auth gate, the shell,
articles (list / create / workspace), taxonomy (categories, tags), and the
asset library (list, detail, upload). One operator, any device.

Supersedes the earlier auth-only brief for this target; the gate is now one
state of the console, not a surface of its own.

## Audience & job

Sole operator, developer, reads Markdown fluently, already knows the domain.
Works at a desk with a wide viewport and on a phone in transit — both for
long-form writing, not just triage. The job: get writing and media onto the
site and keep them tidy, then get out.

## Chosen direction

**The Composing Room.** Two materials that never blend:

- **Type case** — console chrome: navigation, lists, filters, metadata,
  controls, state. Gridded, cell-aligned, tabular numerals, dense but ordered.
  JetBrains Mono carries labels, identifiers, and measurement per the brand's
  committed Serif Carries Meaning Rule.
- **Paper** — the writing surface and any long-form reading. Noto Serif SC,
  65–72ch measure, 1.9 line height, lifted plane with no border cutting it.

Topology is Rail + Sheet (concept-seed surface roll, key `e201f6c7`, assigned
index 4 of the resonance-ordered candidate list): a full-height type-case rail
on desktop with grouped sections and a create action visually separated from
navigation; an inspector that is a recallable sheet at every breakpoint rather
than a resizable pane that can collapse to a stripe; a thumb action bar and
keyboard-aware full-height paper on mobile.

Inherits the Grey Flowers identity unchanged: petal-blue as the single accent,
Noto Serif SC + JetBrains Mono, misted neutrals, rounded-but-not-toy surfaces,
and the same four anti-references.

## Deliberate divergences from the public site

- **No grid texture inside the console.** The faint two-axis grid is kept only
  on the auth stage, where the brand is speaking, and only in light mode —
  the site's rule is "paper over a faint grid by day, charcoal by night", and
  an exception that borrows a rule has to borrow all of it. Task surfaces are
  plain, because a grid showing through is what made every layout gap read as
  broken.
- **Fixed rem type scale, no fluid clamping.** Operate register.
- **Elevation declared once** per surface — border or shadow, never both.
- **The two materials differ in temperature, not only in value.** Light theme
  runs a cool type case (`oklch(0.925 0.010 244)`) against warm paper
  (`oklch(0.997 0.004 92)`); dark keeps the same relationship at
  `0.19 0.012 252` against `0.269 0.004 84`. A pure lightness ramp had them
  reading as one substance at three brightnesses.
- **Case-meets-paper is a shadow, never a rule.** `--shadow-case-down` /
  `--shadow-case-up` exist so the paper stays an uncut plane wherever chrome
  sits on it. Rules are still used _within_ the case, between chrome and chrome.

## Fonts

JetBrains Mono is self-hosted (`@fontsource/jetbrains-mono`, latin subset,
weights 400/500, ~43 kB total) so the type case keeps its character on a cold
offline load.

Noto Serif SC is **not** self-hosted, and that is measured rather than lazy:
`@fontsource/noto-serif-sc` ships the whole simplified-Chinese range as a single
1.3 MB woff2 per weight, so 400/500/700 would be ~4 MB pushed at a phone, while
Google slices the same face into ~100 unicode-range shards of which a Chinese
screen fetches three or four. "Mobile is a writing device" is an argument about
bytes and first paint, so it argues against self-hosting here. Offline the stack
falls to Songti SC / SimSun / Noto Serif CJK — still a serif; the paper does not
become a system sans. Revisit only if the sliced shards get vendored properly.

## Memorable moment

The inspector sheet: it pushes the paper's margins in rather than shrinking its
measure, so the writing never reflows when metadata is consulted. Paired with
the single status readout that reports one value at a time.

## Constraints

Vite + React 19 + TanStack Router + react-aria-components + Tailwind v4 +
CodeMirror 6. Webfonts must be loaded explicitly (no `@nuxt/fonts` here).
Theme is tri-state (system / light / dark), persisted, applied before paint.

## Unresolved

Preview rendering is delegated to the main site via `requestPreview()`; the
console does not reproduce MDC rendering. If in-console preview is ever wanted,
it needs its own decision.
