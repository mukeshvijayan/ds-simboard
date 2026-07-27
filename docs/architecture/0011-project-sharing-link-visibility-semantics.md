# ADR 0011: Sharing-link semantics — visibility gates read access only

- **Date:** 2026-07-27
- **Status:** Accepted

## Context

The `projects.visibility` column (`private` | `unlisted` | `public`) has
existed since Phase 8 (ADR 0009), but its access-control meaning was
explicitly left undecided — schema without semantics. Spec Phase 9 asks
for "sharing via link (read-only vs. editable)"; the project owner
settled the _default_ (new projects are `private`) and asked this ADR to
settle the actual grant a link confers, since that's still a real product
decision even with the default fixed.

## Decision

**A project's visibility only ever gates read access for non-owners.
Mutating a project — renaming, deleting, saving a new circuit snapshot,
or changing its own visibility — always requires being authenticated as
the owner, regardless of visibility.**

Concretely (`canViewProject` in `services/projectsService.ts`):

| Visibility | Owner (authenticated) | Anyone else (incl. anonymous)  |
| ---------- | --------------------- | ------------------------------ |
| `private`  | full read + write     | 404 (see below on why not 403) |
| `unlisted` | full read + write     | read-only                      |
| `public`   | full read + write     | read-only                      |

There is no "editable link" tier. A link never grants write access to
anyone but the authenticated owner.

**A private project a non-owner requests returns 404, not 403.** A 403
would confirm the project exists at that id — leaking its existence to
someone who isn't allowed to know that, e.g. someone guessing/scanning
ids. 404 ("nothing here") reveals nothing about whether a private project
actually exists at that id. Deleting/updating someone else's project
_does_ return 403, not 404 — the requester already knows the project
exists at that point (they got its id from somewhere legitimate, e.g.
their own successful `GET`, or the project doesn't exist and 404 fires
first in that case anyway), so 403 there doesn't leak anything new.

## Why not grant write access via link

Granting _edit_ access to anyone holding an unlisted/public link (no
login required) was the other option Phase 9's instructions explicitly
asked to be decided, not defaulted silently. Rejected for this version:

- It's a materially larger security surface than what was asked for —
  anyone who obtains a "read-only" link (which can leak far more easily
  than a password: browser history, a screenshot, a forwarded chat
  message) would be able to vandalize the project, not just view it.
- Real collaborative multi-account editing (Google-Docs-style "anyone
  with the link can edit," or named collaborators with their own
  accounts) is a meaningfully different feature — it needs its own
  concurrency story (what happens when two people edit the same circuit
  at once?) that circuit-engine/the Breadboard Lab UI don't have an
  answer for yet. Building the access-control half of that without the
  actual collaborative-editing UX behind it would be scope creep, not a
  faithful reading of "decide the read-only-vs-editable question."
- The read-only-link pattern (Figma/Google Docs' "anyone with the link
  can view," separate from "can edit") is the closer, safer match to what
  was actually requested, and is trivial to loosen later — turning a
  link editable is a smaller, additive change than trying to walk back an
  editable link that already leaked.

## What this unblocks vs. defers

- **Built now**: `GET /projects/:id` and both snapshot-read endpoints
  respect `canViewProject`; `PATCH /projects/:id` (owner-only) is the
  "explicit action" that moves a project from the private default to
  `unlisted`/`public`.
- **Deferred, a real future decision, not silently ruled out forever**:
  actual multi-account collaborative editing with named collaborators;
  whether `public` projects should ever appear in some future discoverable
  gallery/listing (today `public` only means "viewable if you have the
  link," not "listed anywhere") — that would be a distinct, separate
  product decision if it comes up.

## Alternatives considered

- **Editable-by-link for `public` only, read-only for `unlisted`** — adds
  a third read/write tier for a distinction (public vs. unlisted) that's
  otherwise purely about discoverability, not permission; rejected as
  needless complexity that still doesn't resolve the "no login, no
  identity, arbitrary vandalism" problem above.
- **A `collaborators` join table (per-user, per-project write grants)** —
  the more complete real answer for "editable sharing," but a genuinely
  separate feature (invite flow, per-collaborator permission levels) that
  wasn't part of what was asked to be decided this phase. Left for a
  later, explicitly-scoped decision.
