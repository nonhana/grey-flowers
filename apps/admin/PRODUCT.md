# Product — Grey Flowers Admin

## Register

product

Grey Flowers Admin is the Operate half of the Grey Flowers world. The public
site (`apps/main`) is a brand surface people come to read; this is the workshop
behind it, and it is judged by how little it gets in the way.

## Users

One person: the site owner, acting as sole operator. There is no team, no role
matrix, no onboarding funnel, no seat to sell. Every screen may assume the
operator already knows what the site is and what the words mean.

She is a developer. She reads Markdown as fluently as prose, expects keyboard
affordances to exist, and notices when a control lies about its state. She does
not need to be taught the domain; she needs the domain to stay out of her way.

She works from whatever device is in reach. At the desk she writes long-form
with two hands and a wide viewport. On a phone, on a train, between other
things, she still writes long-form — and also uploads a screenshot, fixes a
typo, retitles a draft, publishes something that was waiting. Mobile is not a
degraded view of this product. It is the same product held differently.

## Product Purpose

Move writing and media from "in my head" to "on the site" with as little
friction as the medium allows.

Concretely: draft, edit, and publish articles; keep categories and tags tidy;
upload and reuse images and audio; recover from the ordinary accidents of
writing — a lost connection, a second open tab, a version you wish you had
back.

Success is that the operator stops noticing the tool. She should be able to
open it cold, do the one thing she came to do, and close it, without reading a
label twice or hunting for where an action moved to. A session that ends with
the writing further along than it started is the only metric.

Failure is any moment where she has to think about the software instead of the
work: a control whose state she cannot read at a glance, a save she cannot
trust, a layout that breaks when the keyboard opens, an action she has to
scroll to find.

## Brand Personality

The same person as the public site — reflective, disciplined, gentle — but at
work rather than in conversation.

The register shifts from authored to instrumental. Where the public site can
take its time, the workshop is precise, quiet, and quick. It keeps the garden's
manners: nothing shouts, nothing hurries her, nothing performs. But it does not
decorate. A workshop earns its warmth from being well-made and well-kept, not
from ornament laid on top.

The emotional goal is confidence. She should trust that what it says about
state is true.

## Anti-references

Inherits the public site's four, and adds two of its own:

- Generic AI SaaS landing-page cliches.
- Neon cyberpunk dev-blog dark mode.
- Glassmorphism-heavy personal portfolio.
- Hard-edged enterprise dashboard chrome.
- **The homogeneous card mush.** Every region wrapped in the same rounded,
  bordered, softly-shadowed box until nothing has rank and nothing has a
  material identity.
- **The dashboard nobody asked for.** Metric tiles, activity charts, and
  overview cards for a corpus one person can hold in their head.

## Design Principles

- **The task is the content.** Chrome exists to reach the task and report its
  state. Anything that is neither is cut.
- **Two materials, never blended.** Console surfaces (navigation, lists,
  controls, metadata, state) are gridded and precise. Writing and reading
  surfaces are paper: sans, generous, unruled. Every new component belongs to
  exactly one of them, and knowing which answers most of its design.
- **State must be legible without being loud.** Saved, saving, offline,
  conflicted, unsaved, published, draft — each has one unambiguous reading, in
  one place, and never depends on color alone.
- **Mobile is a writing device.** Thumb reach, keyboard-aware layout, safe
  areas, and full-height writing are requirements, not adaptations.
- **Familiarity over invention for standard affordances.** Buttons, fields,
  sheets, and menus behave the way the operator already expects. Character is
  spent on material and precision, not on reinventing a select.
- **Destructive actions are reversible or confirmed, never both silent.**
  Publish, unpublish, delete, restore, and overwrite each state their
  consequence in the operator's own language before they run.

## Accessibility & Inclusion

WCAG AA contrast and full keyboard operability across light and dark themes,
including every dialog, sheet, menu, and the editor's toolbar. Focus is always
visible and never trapped without an escape.

Touch targets are at least 44px in the primary flows. The interface is usable
one-handed on a phone, with the keyboard open, at the bottom of the screen.

Motion is functional only — state change, reveal, feedback — bounded to
150–250ms, and fully answerable to `prefers-reduced-motion`. Content is never
gated behind an animation.

Copy is zh-Hans. Latin metadata (identifiers, revisions, timestamps, file
sizes) stays in the monospaced layer so it never competes with the reading
voice.
