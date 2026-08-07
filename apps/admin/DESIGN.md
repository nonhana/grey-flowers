---
name: Grey Flowers Admin
description: A composing room behind the garden — a type case and a sheet of paper, never blended.
colors:
  case: 'oklch(0.925 0.01 244)'
  case-raised: 'oklch(0.972 0.005 242)'
  canvas: 'oklch(0.955 0.006 242)'
  paper: 'oklch(0.997 0.004 92)'
  well: 'oklch(0.945 0.012 240)'
  rule: 'oklch(0.855 0.012 242)'
  edge: 'oklch(0.78 0.018 242)'
  edge-hover: 'oklch(0.66 0.045 244)'
  ink-strong: 'oklch(0.24 0.03 252)'
  ink: 'oklch(0.34 0.022 250)'
  ink-dim: 'oklch(0.44 0.019 248)'
  accent: 'oklch(0.46 0.116 250)'
  accent-hover: 'oklch(0.4 0.11 250)'
  accent-on: 'oklch(0.99 0.004 250)'
  accent-text: 'oklch(0.44 0.115 250)'
  accent-wash: 'oklch(0.93 0.03 240)'
  accent-wash-hover: 'oklch(0.9 0.04 240)'
  accent-rule: 'oklch(0.7 0.075 248)'
  danger: 'oklch(0.5 0.17 25)'
  danger-hover: 'oklch(0.44 0.165 25)'
  danger-on: 'oklch(0.99 0.004 25)'
  danger-text: 'oklch(0.45 0.17 25)'
  danger-wash: 'oklch(0.955 0.025 25)'
  danger-rule: 'oklch(0.72 0.11 25)'
  warn-text: 'oklch(0.45 0.1 70)'
  warn-wash: 'oklch(0.955 0.035 80)'
  warn-rule: 'oklch(0.74 0.085 75)'
  focus: 'oklch(0.5 0.13 250)'
  scrim: 'oklch(0.24 0.03 252 / 42%)'
typography:
  display:
    fontFamily: "'Noto Sans SC', 'Noto Sans', -apple-system, 'PingFang SC', sans-serif"
    fontSize: '1.75rem'
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "'Noto Sans SC', 'Noto Sans', -apple-system, 'PingFang SC', sans-serif"
    fontSize: '1rem'
    fontWeight: 700
    lineHeight: 1.6
  body:
    fontFamily: "'Noto Sans SC', 'Noto Sans', -apple-system, 'PingFang SC', sans-serif"
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.55
  manuscript:
    fontFamily: "'Noto Sans SC', 'Noto Sans', -apple-system, 'PingFang SC', sans-serif"
    fontSize: '17px'
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: "'JetBrains Mono', 'Noto Sans SC', ui-monospace, monospace"
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: '0'
  micro:
    fontFamily: "'JetBrains Mono', 'Noto Sans SC', ui-monospace, monospace"
    fontSize: '0.6875rem'
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: '0'
    fontFeature: 'tabular-nums'
rounded:
  control: '8px'
  panel: '14px'
  sheet: '18px'
  pill: '999px'
spacing:
  hair: '4px'
  xs: '6px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  2xl: '24px'
  3xl: '32px'
components:
  button-solid:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-on}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 14px'
    height: '40px'
  button-solid-hover:
    backgroundColor: '{colors.accent-hover}'
    textColor: '{colors.accent-on}'
  button-quiet:
    backgroundColor: '{colors.case-raised}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 14px'
    height: '40px'
  button-quiet-hover:
    backgroundColor: '{colors.accent-wash}'
    textColor: '{colors.accent-text}'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-dim}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 14px'
    height: '40px'
  button-danger:
    backgroundColor: '{colors.danger}'
    textColor: '{colors.danger-on}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 14px'
    height: '40px'
  button-warnish:
    backgroundColor: 'transparent'
    textColor: '{colors.danger-text}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 14px'
    height: '40px'
  input-field:
    backgroundColor: '{colors.well}'
    textColor: '{colors.ink-strong}'
    typography: '{typography.title}'
    rounded: '{rounded.control}'
    padding: '8px 12px'
    height: '44px'
  filter-chip:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-dim}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: '0 14px'
    height: '36px'
  filter-chip-selected:
    backgroundColor: '{colors.accent-wash}'
    textColor: '{colors.accent-text}'
    rounded: '{rounded.pill}'
  status-readout-ok:
    backgroundColor: '{colors.accent-wash}'
    textColor: '{colors.accent-text}'
    typography: '{typography.micro}'
    rounded: '{rounded.pill}'
    padding: '0 10px'
    height: '28px'
  panel:
    backgroundColor: '{colors.case-raised}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
  dialog-surface:
    backgroundColor: '{colors.case-raised}'
    textColor: '{colors.ink}'
    rounded: '{rounded.sheet}'
    padding: '16px 20px'
  nav-row-active:
    backgroundColor: '{colors.accent-wash}'
    textColor: '{colors.accent-text}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 10px'
    height: '40px'
  tooltip:
    backgroundColor: '{colors.ink-strong}'
    textColor: '{colors.canvas}'
    typography: '{typography.micro}'
    rounded: '{rounded.control}'
    padding: '4px 8px'
---

# Design System: Grey Flowers Admin

## Overview

**Creative North Star: "The Composing Room"**

The console behind Grey Flowers is a room with two materials in it, and they are never mixed. There is a **type case** — the metal drawer of sorts, cool and gridded, where navigation, lists, filters, controls, metadata and state live, aligned to cells, set tight, with Latin data on monospace and numerals that stack. And there is **paper** — warm, uncut, set in the sans, one measure wide, where writing and long-form reading happen. An operator should be able to tell which material she is touching before she reads a single word on it.

What this world refuses is the homogenising paste: navigation, a data table, a form control and a paragraph of prose all poured into the same rounded-grey-bordered-soft-shadowed card until the interface has one texture and no hierarchy. The type case is dense because density is honest about what it holds; the paper is generous because a sentence needs room. Neither borrows the other's manners.

The admin inherits the Grey Flowers identity unchanged — petal-blue as the only accent, Noto Sans SC with JetBrains Mono, misted neutrals, rounded but never toy-like — and adds one thing the public site does not need: a register split. The site performs a little; the console reports. Type is a fixed rem ramp with no fluid clamping. Motion states a fact in under a quarter second and stops. The faint two-axis grid that carries the brand on the public site survives here only on the auth stage, and only by day, because inside the console a grid showing through a layout gap reads as unfinished work rather than atmosphere.

**Key Characteristics:**

- Two materials, distinguished by temperature as well as by value.
- One accent family; "published" is blue, not green.
- Three ink levels, the palest of which is a contrast floor rather than a decorative grey.
- Monospace carries measurement; the sans carries meaning.
- Density in the chrome, generosity on the page, and a visible seam between them.

## Colors

Two misted neutral ramps at slightly different temperatures, one petal-blue that does all the pointing, and two state hues that are allowed to exist only because errors and warnings are not opinions.

### Primary

- **Petal Ink** (`{colors.accent}` light / `oklch(0.63 0.115 248)` dark): The single interaction colour. Solid buttons, the create action in the rail, the caret and selection in the manuscript, the active dot on a published badge. Everything the operator can act on is this blue or is not coloured at all.
- **Petal Read** (`{colors.accent-text}`): The text-weight sibling, used wherever blue has to be _read_ rather than pressed — active navigation labels, link syntax in the editor, the text inside a wash.
- **Petal Wash** (`{colors.accent-wash}`): The pale fill under hover, selection, active navigation rows, selected filter chips, and the "ok" status readout. This is where most of the blue in a screen actually lives.
- **Petal Rule** (`{colors.accent-rule}`): The 1px border that accompanies a wash so that state never rides on fill alone.

### Secondary

There is none, and inventing one is the fastest way to break this world. Danger and warn below are **states**, not a secondary palette.

### Tertiary

- **Alarm Red** (`{colors.danger}` / `{colors.danger-text}` / `{colors.danger-wash}` / `{colors.danger-rule}`): Destructive confirmation and error reporting only. The entry to a destructive action is outlined (`button-warnish`); only the confirming end is filled.
- **Caution Amber** (`{colors.warn-text}` / `{colors.warn-wash}` / `{colors.warn-rule}`): Recoverable trouble — an unsaved local draft, an offline save, a state the operator can still walk back from.

### Neutral

The five surface tokens are the spine of the system. Every background in the console resolves to one of them.

- **Type Case** (`{colors.case}`): The cool structural plane — the rail, the mobile tab bar, editor chrome, the desktop inspector column. In light it is a deliberately deepened `0.925`, so the case reads as a substance and not as "slightly off-white".
- **Case Raised** (`{colors.case-raised}`): Lifted chrome — panels, row stacks, popovers, dialogs, sheets, the auth card. The type case with something set on top of it.
- **Canvas** (`{colors.canvas}`): The page plane behind list-and-form pages, and the body default.
- **Paper** (`{colors.paper}`): The warm writing surface. `92°` hue against the case's `242–244°`; in dark it holds only a trace of warmth (`oklch(0.269 0.004 84)`, aligned to the brand's Night Soil) because any more turns it into a second colour family.
- **Well** (`{colors.well}`): The recessed plane — input fills, the failed-thumbnail placeholder, the "busy" readout. Things you put something _into_.
- **Hairline** (`{colors.rule}`): The divider inside the case: between rows in a stack, between chrome and chrome, under a dialog header.
- **Edge** (`{colors.edge}` / `{colors.edge-hover}`): The interactive stroke — input borders, quiet-button borders, unselected chips, the scrollbar thumb.
- **Ink Strong / Ink / Ink Dim** (`{colors.ink-strong}` / `{colors.ink}` / `{colors.ink-dim}`): Titles and values / default reading text / labels, hints, and metadata.

### Named Rules

**The Two Materials Rule.** Every surface in this console is either type case or paper, and the component must know which it is before it picks a background. There is no third material, and there is no blend. The two ramps differ in _temperature_ as well as in value — a cool case against warm paper — because a pure lightness ramp made them read as one substance at three brightnesses.

**The One Accent Rule.** Petal-blue carries interaction, selection, emphasis, and success. "Published" is blue. Do not introduce a success green, a second accent, or a decorative hue. Danger and warn are the only other families and they only speak when something is wrong.

**The Three Inks Rule.** `ink-strong`, `ink`, `ink-dim`. There is no fourth level, and `ink-dim` is not a "quieter grey" to be dialled down further — it sits at `oklch(0.44 …)` in light specifically to hold 4.5:1 against the deepened case. That number is a legibility floor. If a label needs to recede further, change its size or its position, not its ink.

**The Colour Is Never Alone Rule.** Every stateful object changes at least two of {fill, border, text} together. A published badge changes wash, rule, and text; a selected filter chip does the same. State that rides on hue alone is not state.

## Typography

**Display / Body Font:** Noto Sans SC (with Noto Sans, Noto Sans JP, PingFang SC, Microsoft YaHei, sans-serif)
**Label / Mono Font:** JetBrains Mono (with Noto Sans SC, ui-monospace, monospace)

**Character:** The sans is the same voice as the public garden — it is what makes this a room in the same building rather than a vendor dashboard bolted on the side. JetBrains Mono is the case: it appears wherever the interface is _measuring_ something rather than saying something, and it brings tabular numerals with it so a column of counts, revisions, and timestamps stacks straight.

### Hierarchy

- **Display** (700, `1.75rem`, `1.25`): The page title and the auth-stage headline. There is nothing larger in the console — the title has to be the biggest thing on the screen so a 264px blue action button cannot steal the page's subject.
- **Title** (700, `1rem`, `1.6`): Dialog headings, empty-state titles, and the label on a control that must not shrink below 16px.
- **Body** (400, `0.875rem`, `1.55`): The console's default text — descriptions, list rows, alert copy, menu items, and button text.
- **Manuscript** (400, `17px`, `1.9`): The editor's paper. Measure is capped by a `72ch` border-box with `1.25rem` side padding, which lands the actual measure at roughly 68 characters. Headings inside the manuscript scale relatively (`1.4em` / `1.22em` / `1.1em`) so the ramp belongs to the document, not to the chrome.
- **Label** (mono, 400, `0.75rem`, `1.45`): Field labels, section labels, rail sub-navigation, spinner text. The name of a thing.
- **Micro** (mono, 400, `0.6875rem`, `1.45`, tabular): Metadata lines, badges, status readouts, tooltips, mobile tab labels. The measurement of a thing.

### Named Rules

**The Sans Carries Meaning Rule.** Inherited from Grey Flowers and unchanged: if it is meant to be read, the sans carries it. Mono is for signals, metadata, identifiers, and code — never a substitute for the reading voice.

**The Mono Is Data Rule.** Monospace marks measurement: labels, identifiers, counts, revisions, timestamps, filenames, and control text. Any element set in mono inherits `font-variant-numeric: tabular-nums` and zero letter-spacing so that numbers in adjacent rows line up. Mono is never decoration and never a "techy" texture.

**The Mixed Run Rule.** JetBrains Mono ships no CJK, so Chinese inside a mono run falls through to the sans (Noto Sans SC). Latin and digits in that same label are monospaced and aligned; the Chinese beside them is a sans. This is the intended result, not a fallback bug — do not "fix" it by adding a CJK monospace face.

**The Weight Follows the Face Rule.** `font-synthesis: none` is set globally, so a weight that is not loaded simply does not render. The sans has 400/500/700; the self-hosted mono has 400/500 only. Emphasis on a mono run therefore tops out at `font-medium` (500) — the rail's sans rows go bold on active, its mono sub-rows go medium. Never reach for `font-bold` on monospace.

**The Fixed Ramp Rule.** The type scale is fixed rem with no fluid clamping and no viewport-relative sizing. Operate register: a label must be the same size on every screen so the operator never re-reads it.

## Layout

**The shell.** Desktop is a full-height flex row: a 264px type-case rail (brand block, a create action visually separated from navigation, grouped navigation, an account block pinned to the bottom), then the content column. The height chain is unbroken from `html` / `body` / `#root` down, so the rail reaches the floor rather than ending where its content ends.

**One hinge.** `768px` (`md`) is the only structural breakpoint, and it is mirrored in `useIsDesktop()` so JS and CSS agree. Below it the rail is replaced by a bottom tab bar (56px tall, three equal navigation targets, safe-area padded), with article creation promoted to its own fixed right-bottom FAB above the bar; the inspector switches from a layout column to a draggable bottom sheet. `sm` (640px) and `lg` (1024px) only adjust page gutters and grid density.

**Page rhythm.** Page bodies are centred with a width contract — narrow `42rem`, default `56rem`, wide `72rem` — and gutters of `16px` / `24px` (sm) / `32px` (lg). Vertical padding is safe-area-aware on both ends: the top clears a notch, the bottom reserves `6rem` plus the inset so the last row is never parked under the thumb bar. Internal rhythm sits on the 4px grid and lives almost entirely at `8px` (the default gap between siblings) and `12px` (between groups); `16px`–`24px` separate sections.

**The viewport contract.** The authenticated console is exactly `100dvh`: `html`, `body`, `#root`, and the shell never own a scrollbar. Each route declares one interior scroll owner. Ordinary content pages use the centred `PageBody`; list pages delegate to their items region, which is `flex: 1`, `min-height: 0`, vertically scrollable, and overscroll-contained. Their header, filters, and pagination stay visible while the items fill every remaining pixel.

**The workspace.** The manuscript pane and the inspector are siblings in a flex row. The inspector is a fixed-width `380px` column whose _outer_ width animates while its inner content stays pinned to full width — so opening it squeezes the paper's margins without reflowing a single line of prose. On mobile the same content is a bottom sheet capped at `88dvh` with a real drag-to-dismiss handle, and the editor toolbar pins to the bottom and rides the software keyboard, because a toolbar the thumb cannot reach is not a toolbar.

### Named Rules

**The Single Scroll Owner Rule.** Never let overflow bubble from a route into the document or shell. A screen has exactly one scrolling region at a time. On a list screen it must be the items region, not the page container; on a writing workspace it is the paper; on a detail or form it is the centred content body. Every flex ancestor between the viewport and that region declares `min-height: 0`, so content never silently expands the viewport.

**The Uncut Measure Rule.** Consulting metadata must never reflow the writing. Any panel that appears beside the paper takes its space from the margins, at a fixed inner width, never from the measure.

**The Reachable Action Rule.** On mobile the primary action of a surface belongs at the bottom, above the safe-area inset, and follows the keyboard when the keyboard is up.

## Elevation & Depth

The system is tonally layered first and lifted second. Most depth comes from the five surface tokens and a hairline; shadows appear only where something genuinely floats above the plane, or where the type case sits directly on the paper. A surface declares its elevation exactly once — a panel is bordered, a popover is shadowed, and nothing is both.

### Shadow Vocabulary

- **Case Down** (`0 1px 3px var(--gf-shadow-near), 0 6px 14px -8px var(--gf-shadow-far)`): Chrome resting on top of paper — the workspace header on mobile, the editor toolbar on desktop. Downward-facing.
- **Case Up** (`0 -1px 3px var(--gf-shadow-near), 0 -6px 14px -8px var(--gf-shadow-far)`): The same seam inverted, for chrome that sits _below_ the paper — the keyboard-following editor toolbar on mobile.
- **Float** (`0 2px 6px var(--gf-shadow-near), 0 18px 44px -14px var(--gf-shadow-far)`): Anything that has genuinely left the page — dialogs, sheets, popovers, menus, tooltips, the auth card. These carry no border.

Shadow colour is theme-aware: a blue-tinted ink in light (`oklch(0.35 0.04 250 / 10%)` and `oklch(0.3 0.05 250 / 22%)`), neutral black in dark (30% / 45%).

### Named Rules

**The Declared Once Rule.** Border or shadow, never both, on a single surface. If a component needs to feel more separated, move it up the surface ramp — do not stack treatments.

**The Case-Meets-Paper Rule.** Where the type case touches the paper, the seam is a shadow, never a rule. The paper is a lifted plane and a 1px line cuts it. Hairlines are still correct _within_ the case — between chrome and chrome, between rows of a stack, under a dialog header.

**The Transparent Track Rule.** Scrollbar tracks are transparent everywhere (`scrollbar-color: var(--color-edge) transparent`, `::-webkit-scrollbar-track { background: transparent }`). A default pale track draws a full-height cold-grey line down the right edge of the paper, which is exactly what the Case-Meets-Paper Rule exists to prevent. The thumb is a 10px pill inset by a 3px transparent border, so it reads as floating on whatever surface it happens to cross.

## Shapes

Three radii and a pill, and each one means something.

- **Control** (`8px`): Everything you touch — buttons, icon buttons, inputs, textareas, selects, list items, menu items, navigation rows, alerts, tooltips, skeletons.
- **Panel** (`14px`): Grouped containers — panels, row stacks, popovers, empty states.
- **Sheet** (`18px`): Things that have left the page — dialogs, bottom sheets (top corners only, `rounded-t-sheet`, squaring off on desktop into a full `rounded-sheet`), the auth card.
- **Pill** (`999px`): Reserved for **status objects only** — filter chips, publish badges, status readouts, the empty-state icon medallion, the sheet's drag handle, the scrollbar thumb, the accent status dot.

Borders are always `1px`. `border-rule` separates chrome from chrome; `border-edge` marks an interactive boundary; `border-dashed border-edge` marks an empty state — a container that is waiting for content rather than holding it.

### Named Rules

**The Pill Is Not A Button Rule.** This is the console's clearest divergence from the public site, where navigation and utility buttons are pills. Here, a pill silhouette means "this is a state you are reading", and a `8px` rounded rectangle means "this is a thing you press". A pill-shaped button would make a chip and an action indistinguishable in a dense filter row.

## Components

The whole vocabulary is seven files: `button`, `form`, `surface`, `feedback`, `overlay`, `image`, and the editor's paper pane. Nothing outside it should be invented without a reason.

### Buttons

- **Shape:** `8px` rounded rectangle, always. Heights are `32px` (sm) / `40px` (md) / `44px` (lg); text is monospace at `0.75rem` (sm) or `0.875rem` (md, lg) with `leading-none` so the glyphs sit on the optical centre.
- **Five tones, no sixth.** `solid` (accent fill, accent-on text) is submission. `quiet` (case-raised fill, edge border) is the default and covers every secondary action. `ghost` (transparent, ink-dim text) is for toolbars and icon actions. `danger` (filled red) is the confirming end of a destructive action. `warnish` (transparent with a `danger-rule` border and `danger-text`) is its _entry_, outlined rather than filled so it cannot be pressed by reflex.
- **Hover / Focus:** Hover moves colour only — `solid` deepens its fill; `quiet` and `ghost` both pick up `accent-wash` with `accent-text`. Transitions are `transition-colors 150ms`; nothing scales, lifts, or translates. Focus is the global 2px ring; buttons never define their own.
- **Disabled:** 45% opacity and `cursor: not-allowed`, with hover suppressed. A loading button is disabled and swaps its leading icon for a spinner.
- **Icon buttons:** Square (`32` / `40` / `44px`), default tone `ghost`, and the `label` prop is mandatory — it is simultaneously the `aria-label` and the tooltip text, so an icon action cannot ship nameless.

### Chips

- **Filter chip:** Pill, `36px` tall, mono `0.75rem`. Unselected is transparent with an `edge` border and `ink-dim` text; selected switches fill, border, and text together to the accent wash family.
- **Publish badge:** Pill, micro mono, with a 6px status dot. Published is the accent family; draft is a plain `edge` border with `ink-dim`. The words 已发布 / 草稿 carry the meaning; colour only reinforces them.
- **Status readout:** The workspace's signature — a single pill that reports **one** value at a time (saving / saved + revision / conflict / offline / unsaved) in one of four tones, with `aria-live="polite"` on the label. It replaced a row of chips that each answered a different question.

### Cards / Containers

- **Panel:** `14px` radius, `case-raised` fill, `1px rule` border, no shadow. Border _is_ the elevation.
- **Row stack:** The type case's real list primitive — one bordered `14px` container that clips its children and draws hairlines _between_ them (`[&>*+*]:border-t`), rather than a stack of identical floating cards. Dense lists in this console are cells in a drawer, not a deck.
- **Empty state:** Dashed `edge` border on a `14px` container, a `44px` accent-wash medallion, a title, one sentence of instruction, an action, and an optional mono footnote. It teaches the surface rather than announcing that the surface is empty.
- **Skeletons:** Match the real row's height and internal rhythm exactly so nothing jumps when content lands.

### Inputs / Fields

- **Style:** `well` fill, `edge` border, `8px` radius, `44px` minimum height, `8px 12px` padding, `ink-strong` value text on an `ink-dim` placeholder.
- **The 16px floor:** Control text is locked to `1rem`. Below 16px, iOS Safari zooms the page on focus, which ruins long-form writing on the device this console treats as first-class. Do not shrink a control's font-size to fit a layout.
- **Focus:** Border shifts to `accent` _and_ the global focus ring is drawn at `outline-offset: 1px` — the one place in the system where a component adds to the global treatment rather than replacing it.
- **Invalid / Disabled:** `data-invalid` swaps the border to `danger-rule` and the message renders in `danger-text`; disabled drops to 55% opacity.
- **Label:** Mono `0.75rem` `ink-dim`, above the field. When a filter row hides its visible label to stay on one line, the selected value must re-state the dimension (`类型 · 图片`), never the bare value.

### Navigation

- **Rail (desktop):** 264px, `case` fill, `1px rule` right border. Brand block, then the create action, then grouped sections, then the account block above a hairline. Rows are `40px`, `8px` radius, sans body, `ink-dim` at rest, `accent-wash` + `accent-text` on hover and active — active additionally goes bold. Sub-rows (the article status filters) are mono `0.75rem`, indented, and go `font-medium` on active because mono has no 700.
- **Active state is an attribute, not a class.** Selection is expressed through TanStack Router's `data-status="active"`, compiled to an attribute selector, so it out-specifies the base colour deterministically. Appending an active class of equal specificity loses to source order and silently produces a navigation with no selected state.
- **The create action is not a place.** It is a full-width `solid` button sitting above the navigation groups, deliberately unlike every row beneath it, because it performs an action rather than naming a location.
- **Tab bar (mobile):** 56px, `case` fill, hairline top border, three equal navigation targets (文章、资产、更多) in micro mono with 20px icons, safe-area padded. Create is not navigation: a fixed right-bottom `solid` FAB with `SquarePen` and the visible label 新建文章 sits at least 16px above the bar and safe-area inset, has a 44px minimum touch target, and uses `float` elevation without a border.

### Dialogs & Sheets

- **Dialog:** `case-raised` on `float`, no border. Full-width and bottom-anchored with sheet-in motion below `sm`; centred, max-width-capped (`md` / `lg` / `2xl`), and dialog-in motion above it. A hairline header carries a `1rem` bold title and a close icon button; body scrolls with safe-area bottom padding; `max-height: 88dvh`.
- **Non-dismissable dialogs** (content conflict) hide the close button and disable escape — if a choice must be made, there is no exit that isn't a choice.
- **Bottom sheet:** Real drag-to-dismiss. The handle tracks the pointer, the panel follows it, and releasing past `96px` closes. It exposes `--gf-surface` so anything sticky inside it knows which material it is painting against.
- **Tooltip:** Inverted — `ink-strong` fill with `canvas` text, micro mono, `350ms` delay, `pop-in`.

### The Paper (editor)

The signature surface. `paper` fill, sans, `17px` / `1.9`, measure capped at a `72ch` border box, `2.25rem` of top padding and `45vh` of bottom padding so the last line can still scroll to the centre of vision. **No line numbers** — a line number is a code editor's measurement and here it only pushes the first character three cells to the right.

Syntax colouring is deliberately near-monochrome: headings are carried by size and weight, `strong` by weight, `emphasis` by italic, inline code by the mono face at `0.9em`. Only links and list markers take `accent-text`, and Markdown's own punctuation (`#`, `**`, backticks) is pushed down to `ink-dim` so the content floats above its notation. Caret and selection are accent.

`theme="none"` on the CodeMirror component is load-bearing. `@uiw/react-codemirror` defaults to `theme="light"`, which injects a hardcoded `backgroundColor: #fff` that overrides the paper token and turns the dark-mode writing surface into a white sheet with near-invisible text. The paper's value belongs to `--color-paper` and to nothing else.

### The Auth Stage

The one place the brand speaks. A centred `416px` `case-raised` card on `float`, on a `32px` two-axis grid drawn in `oklch(0.73 0.034 251 / 20%)` — and only in light mode, because the public site's rule is "paper over a faint grid by day, charcoal by night" and an exception that borrows a rule has to borrow all of it. Its four states (checking / login / forbidden / network error) share one layout: a bordered `44px` status medallion tinted by tone, a display headline, one muted sentence, and at most one action.

### Motion

Durations run `140ms`–`240ms`. Entrances use `--ease-out-quint` (`cubic-bezier(0.22, 1, 0.36, 1)`), exits use `ease-in` and are always shorter than their entrance: scrim `180` / `140`, sheet `240` / `160`, dialog `200` / `140`, popover pop-in `140`. Colour transitions are a flat `150ms`; the inspector's width transition is `200ms ease-out`. `prefers-reduced-motion: reduce` collapses every transition, animation, **and animation delay** to `0.01ms` globally — zeroing duration without zeroing delay turns a staggered entrance into a string of near-instant pops, which is worse than the animation it was meant to suppress.

**The one staggered entrance.** The trend plot's bars rise from the zero axis left to right (`--animate-bar-rise`, `scaleY(0)` → `1`, `transform-origin: bottom`), replayed whenever the metric or the day window changes. Each bar stays inside the `200ms` band; only the start times are spread, and the spread is hard-capped at `160ms` across the whole series regardless of whether the window holds 7 days or 30 — so the last bar always settles by roughly `360ms`. This is the console's single sanctioned choreography and it is not a licence for a second one: it exists because a bar chart's shape is the fact being reported, and a series that assembles in reading order says "this is a sequence in time" in a way a simultaneous fade cannot. Anything else that wants to stagger must instead resolve in one gesture.

### Named Rules

**The One Solid Rule.** At most one `solid` button per screen. It is what the operator came to that screen to do. A second one means the screen has two purposes and should be two screens.

**The One Value Rule.** A status area reports one value at a time. Several chips each answering a different question is not a status area, it is a legend the operator has to learn.

**The Report Don't Perform Rule.** State transitions and enter/exit animations live in the `140`–`240ms` band and change opacity, colour, transform, or width only. This band governs _transitions_; indeterminate progress is exempt and continuous by nature — the button spinner (`1s`), the auth-stage waiting mark (`1.4s`), and skeleton pulses report ongoing work rather than a change of state. The band binds each animated element, not the wall clock: the trend plot's staggered bar rise (see The One Staggered Entrance) keeps every bar at `200ms` and only offsets their starts, within a capped window.

**The One Focus Ring Rule.** Focus is defined once, in the base layer, at zero specificity via `:where()`: `2px solid var(--color-focus)` at `2px` offset, on every anchor, button, input, textarea, select, summary, and `[tabindex]`. Components do not redefine it; at most they add to it, as inputs do.

## Do's and Don'ts

### Do

- **Do** decide which material a new surface belongs to — type case or paper — before choosing anything else about it, and take its background from the five surface tokens.
- **Do** set every label, identifier, count, revision, and timestamp in monospace, so numbers in adjacent rows align on tabular figures.
- **Do** give a stateful object at least two simultaneous changes (fill, border, text) so it never depends on hue alone.
- **Do** keep the manuscript at roughly a 68-character measure, `17px` / `1.9`, and take panel space out of its margins rather than out of its measure.
- **Do** keep control text at `1rem` or larger; anything smaller makes iOS Safari zoom on focus.
- **Do** express router-driven selection through `data-[status=active]` rather than an appended active class.
- **Do** reserve `solid` for the one action a screen exists for, and give a destructive action an outlined entry and a filled confirmation.
- **Do** keep light and dark as the same room under different light — the case/paper temperature relationship holds in both.

### Don't

- **Don't** blend the two materials: no long-form measure inside the type case, and no gridded tabular chrome poured onto the paper.
- **Don't** give one surface both a border and a shadow.
- **Don't** draw a hairline where the type case meets the paper — that seam is `case-down` or `case-up`, always.
- **Don't** introduce a success green, a second accent, or any decorative hue. Published is blue.
- **Don't** add a fourth ink level, and don't lighten `ink-dim` past `oklch(0.44 …)` in light — it is holding 4.5:1 against the case.
- **Don't** tile the grid texture anywhere inside the console, or in dark mode at all. It belongs to the auth stage by day.
- **Don't** put a kicker or eyebrow above a page title; the title is the largest thing on the screen and carries itself.
- **Don't** use `font-bold` on a monospace run — `font-synthesis: none` means the weight simply will not exist. Use `font-medium`.
- **Don't** make a button a pill; the pill silhouette is reserved for status objects you read, not controls you press.
- **Don't** give a scrollbar a visible track, and don't let a scroller draw a line down the edge of the paper.
- **Don't** clamp type to the viewport or introduce fluid sizing; the ramp is fixed rem.
- **Don't** let a hardcoded background reach a CodeMirror instance — the paper's value comes from `--color-paper` only.
