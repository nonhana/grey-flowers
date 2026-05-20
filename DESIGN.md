---
name: Grey Flowers
description: Even in a grey world, flowers bloom as ever.
colors:
  garden-mist: "oklch(0.95 0.0059 239.82)"
  grid-lilac: "oklch(0.73 0.0336 251.22)"
  petal-blue-soft: "oklch(0.93 0.0305 212.05)"
  petal-blue: "oklch(0.5 0.1102 250.04)"
  ink-fog: "oklch(0.16 0.0413 254.41 / 53.33%)"
  night-soil: "oklch(0.27 0 0)"
  paper-bloom: "oklch(0.98 0 0)"
typography:
  display:
    fontFamily: "\"Noto Serif\", \"Noto Serif SC\", \"Noto Serif JP\", serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "\"Noto Serif\", \"Noto Serif SC\", \"Noto Serif JP\", serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "\"Noto Serif\", \"Noto Serif SC\", \"Noto Serif JP\", serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "\"Noto Serif\", \"Noto Serif SC\", \"Noto Serif JP\", serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "\"JetBrains Mono\", monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  lg: "8px"
  xl: "12px"
  xxl: "16px"
  card: "24px"
  feature: "28px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "32px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.petal-blue-soft}"
    textColor: "{colors.petal-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 10px"
  button-primary-hover:
    backgroundColor: "{colors.garden-mist}"
    textColor: "{colors.petal-blue}"
    rounded: "{rounded.pill}"
  button-dark:
    backgroundColor: "{colors.petal-blue}"
    textColor: "{colors.paper-bloom}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 10px"
  input-field:
    backgroundColor: "{colors.petal-blue-soft}"
    textColor: "{colors.ink-fog}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  article-card:
    backgroundColor: "{colors.paper-bloom}"
    textColor: "{colors.ink-fog}"
    rounded: "{rounded.card}"
    padding: "16px"
  dialog-surface:
    backgroundColor: "{colors.paper-bloom}"
    textColor: "{colors.ink-fog}"
    rounded: "{rounded.xxl}"
    padding: "20px"
---

# Design System: Grey Flowers

## Overview

**Creative North Star: "The Quiet Digital Garden"**

Grey Flowers should feel like a personal study garden translated into interface form. The site is not trying to sell urgency. It is trying to hold writing, code, memory, and self-description inside one calm, authored atmosphere. The visual system should make room for browsing and reading, with gentle rhythm, soft contrast shifts, and just enough motion to suggest care.

This is an editorial brand surface with a technical backbone. Serif text carries the voice because the words matter, while monospaced labels and metadata keep navigation, code, and interface controls precise. Light mode should feel like paper laid over a faint grid. Dark mode should feel like the same garden after sunset, still legible, still calm, never neon.

This system explicitly rejects Generic AI SaaS landing-page cliches, Neon cyberpunk dev-blog dark mode, Glassmorphism-heavy personal portfolio, and Hard-edged enterprise dashboard chrome. The site should read as quietly cultivated, not optimized for attention extraction.

**Key Characteristics:**

- Reading-first layout with soft editorial pacing.
- Blue used as a signal color, not a constant flood.
- Dark mode as a nocturnal companion, not a separate brand.
- Rounded surfaces that feel gentle, not toy-like.
- Technical details rendered with restraint and clarity.

## Colors

The palette is restrained and atmospheric: misted neutrals hold the page, one clear blue directs attention, and dark mode shifts to charcoal rather than theatrical black.

### Primary

- **Blue Petal** (`oklch(0.5 0.1102 250.04)`): The main action and orientation color. Use it for active navigation, links, sliders, key icons, and moments where the interface needs to guide the reader's eye.

### Secondary

- **Blue Vapor** (`oklch(0.93 0.0305 212.05)`): The supporting blue wash for hover states, quiet badges, lightweight button fills, and selected surfaces that need emphasis without shouting.

### Neutral

- **Garden Mist** (`oklch(0.95 0.0059 239.82)`): The grid-tinted paper background. Use it for light surfaces, subtle bands, and the atmosphere behind content.
- **Grid Lilac** (`oklch(0.73 0.0336 251.22)`): The pale structural neutral for borders, separators, and background transitions where plain gray would feel too dry.
- **Ink Fog** (`oklch(0.16 0.0413 254.41 / 53.33%)`): The default light-theme text color. It stays softer than pure black so dense reading never feels harsh.
- **Night Soil** (`oklch(0.27 0 0)`): The default dark surface. Use it for drawers, dialogs, dark cards, and dark page chrome.
- **Paper Bloom** (`oklch(0.98 0 0)`): The lifted light surface for cards, dialogs, and content that should feel slightly brighter than the page plane.

### Named Rules

**The One Accent Rule.** Blue carries interaction, selection, and emphasis. Do not invent a second accent family for decoration.

**The Shared Weather Rule.** Light mode and dark mode must feel like the same place under different light. Do not turn dark mode into a neon remix.

## Typography

**Display Font:** Noto Serif / Noto Serif SC / Noto Serif JP (with serif fallback)
**Body Font:** Noto Serif / Noto Serif SC / Noto Serif JP (with serif fallback)
**Label/Mono Font:** JetBrains Mono (with monospace fallback)

**Character:** The serif family gives the site literary weight and cross-language consistency, while JetBrains Mono marks interface metadata, code, and utility language with developer precision. The pairing feels like a notebook written by an engineer who still cares about cadence.

### Hierarchy

- **Display** (700, `3rem`, `1.1`): Reserved for major page titles, hero phrases, and authored moments that establish tone quickly.
- **Headline** (700, `1.875rem`, `1.2`): Used for article titles, dialogs with real gravity, and section anchors that need strong recall.
- **Title** (700, `1.25rem`, `1.3`): Used inside cards, panels, and compact summaries where hierarchy must stay clear without becoming loud.
- **Body** (400, `1rem`, `1.75`): The default reading text. Keep long-form measure within 65ch to 75ch whenever the layout allows.
- **Label** (400, `0.875rem`, `1.4`): Used for metadata, navigation cues, footer labels, and control text. This is the monospaced layer that keeps the interface technically legible.

### Named Rules

**The Serif Carries Meaning Rule.** If the content is meant to be read, let serif carry it. Mono is for signals, metadata, and code, not for replacing the reading voice.

## Elevation

Grey Flowers uses a hybrid depth model. Most surfaces are flat at rest and separated by tint, border, or background shift. Soft shadows appear when a component needs to lift above the reading plane, especially cards, dialogs, and hoverable link blocks. In dark mode, tonal separation matters more than heavy shadow.

### Shadow Vocabulary

- **Soft Lift** (`0 4px 6px -1px rgb(15 23 42 / 0.10), 0 2px 4px -2px rgb(15 23 42 / 0.10)`): Default card and header elevation. Use for components that need gentle independence from the page.
- **Hover Lift** (`0 10px 15px -3px rgb(15 23 42 / 0.10), 0 4px 6px -4px rgb(15 23 42 / 0.10)`): Reserved for interactive cards and promoted surfaces on hover.
- **Dialog Lift** (`0 10px 24px rgb(15 23 42 / 0.18)`): Use for modal surfaces that must clearly float above the page without becoming glassy.

### Named Rules

**The Lift On Purpose Rule.** Shadows appear when a surface needs separation or response. They are not ambient decoration.

## Components

For every component, the goal is the same: keep interaction gentle, clear, and slightly tactile while letting content remain the center of gravity.

### Buttons

- **Shape:** Pill by default (`999px`) for navigation and utility actions. Square actions use softly rounded corners (`8px`) when width or formality demands it.
- **Primary:** Light buttons use Blue Vapor with Blue Petal text. Confirm actions and programmatic dialog buttons invert to Blue Petal with Paper Bloom text.
- **Hover / Focus:** Hover shifts the fill, not the structure. Focus should be visible through color contrast or outline, never through abrupt size changes.
- **Secondary / Ghost:** Ghost buttons stay text-led until hover, then pick up a pale blue or dark charcoal wash depending on theme.

### Cards / Containers

- **Corner Style:** Standard cards use `24px`. Featured panels and activity blocks can stretch to `28px` when they need a softer, more poster-like presence.
- **Background:** Light cards sit on Paper Bloom. Dark cards use Night Soil or a slightly lighter charcoal step.
- **Shadow Strategy:** Soft Lift at rest, Hover Lift when the card is meant to feel clickable.
- **Border:** Use pale, low-contrast borders only when tonal separation is not enough.
- **Internal Padding:** `16px` to `20px` for compact cards, `20px` to `32px` for feature blocks.

### Inputs / Fields

- **Style:** Inputs use pale blue or charcoal-tinted fills with soft radii (`8px` or pill) and low visual noise.
- **Focus:** Focus is communicated by border-color shift toward Blue Petal and preserved contrast in both themes.
- **Error / Disabled:** Error states should move to the existing error family, not invent a new red system. Disabled states reduce contrast and pointer confidence without disappearing.

### Navigation

- **Style:** Header navigation uses pill controls, icon-led affordances, and a translucent top bar in light mode. Active state should read as selected but still lightweight.
- **Typography:** Navigation labels and footer labels belong to the monospaced layer.
- **Mobile Treatment:** The mobile drawer keeps the same tonal language as desktop and should feel like a revealed panel, not a separate product.

### Dialogs

- **Surface:** Dialogs use a lifted rounded panel (`16px`) on top of a simple dark overlay.
- **Header:** Titles carry serif weight and close controls stay visually light.
- **Actions:** Programmatic confirm/cancel actions should remain compact and aligned to the lower edge, with one clearly dominant action.

### Code Blocks

- **Frame:** Code blocks use a bordered, rounded editorial frame rather than a developer-tool slab.
- **Caption Row:** Language, filename, and copy affordance live in a sticky caption strip that can tint blue when pinned.
- **Collapse Behavior:** Long code collapses with a gradient fade cue so the interface suggests continuation without forcing it.

## Do's and Don'ts

### Do

- **Do** keep the page atmosphere lightly gridded in light mode and charcoal-toned in dark mode.
- **Do** reserve Blue Petal for interaction, selected state, and a few deliberate highlights.
- **Do** use serif for reading surfaces and JetBrains Mono for labels, metadata, and code-adjacent UI.
- **Do** let cards, drawers, and dialogs feel rounded and calm rather than sharp or glossy.
- **Do** preserve the same emotional weather across light and dark themes.

### Don't

- **Don't** build Generic AI SaaS landing-page cliches into hero sections, cards, or callouts.
- **Don't** turn dark mode into Neon cyberpunk dev-blog dark mode.
- **Don't** add Glassmorphism-heavy personal portfolio treatments to dialogs, nav, or cards.
- **Don't** harden the UI into Hard-edged enterprise dashboard chrome.
- **Don't** use pure black, pure white, or loud accent stacking when one blue family already carries the system.
