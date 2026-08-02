---
version: 1
slug: 'shell-admin'
primary_target: 'apps/admin'
related_targets: []
---

# Admin shell (Operate)

## Scope & visitor mode

Operate register — an internal management surface for the Grey Flowers garden, not
a public page. The task is symmetric across every state: confirm or reject an
operator's identity in seconds, then land them in a calm, legible workspace.

## Audience & job

Primary user is Hana 酱 herself (site owner / sole operator) acting as an admin.
The job on this surface right now is **gated access**: prove `ADMIN` role via the
identity service, then show a quiet "you are in" state. Future operator modules
(article, note, comment, media management) attach here.

## States handled

1. **checking** — restoring a session, brief.
2. **unauthenticated** — the login form (account + password).
3. **forbidden** — a valid account with a non-ADMIN role.
4. **network-error** — identity service unreachable, with retry.
5. **authenticated** — the empty shell awaiting operational modules.

Every state must be legible in light and dark and keep WCAG AA focus/contrast.

## Chosen direction

Inherit the established Grey Flowers garden world (DESIGN.md): misted neutrals on
a faint grid, one petal-blue family carrying interaction, serif reading voice with
JetBrains Mono for labels and controls. Expression stays restrained — this is an
Operate surface, so scanability and native admin expectations outrank decoration.

## Memorable moment

The brand marks (Flower2 + `GREY FLOWERS / ADMIN` in mono) and the circular status
mark with its long-running spin or calm check, giving correct operators a
recognizably "in the garden" confirmation.

## Unresolved

Operational modules and their compositions are not yet specified; they will be
built as separate surface work once their workflows land.
