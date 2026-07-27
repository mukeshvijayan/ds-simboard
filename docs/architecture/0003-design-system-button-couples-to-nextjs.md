# ADR 0003: `design-system`'s `Button` depends on `next/link` (accepted coupling)

- **Date:** 2026-07-27
- **Status:** Accepted — flagged as a deliberate trade-off, not silently
  carried over

## Context

`packages/design-system/src/components/Button.tsx` renders `<Link
href={...}>` from `next/link` when given an `href` prop, falling back to a
plain `<button>` otherwise. This was moved as-is from
`apps/web/components/ui/Button.tsx` during the Phase 1 extraction.
Part 4 of `docs/MASTER_BUILD_SPEC.md` describes `design-system` as
"shared by every product in the family," which is normally a signal that
a package shouldn't depend on one consumer's framework.

## Decision

Keep the `next/link` dependency as-is for now rather than introducing a
`LinkComponent` injection prop or a router-agnostic abstraction. `next` is
declared as a `peerDependency` of `@ds-simboard/design-system`.

## Alternatives considered

- **Accept a `linkComponent` prop** (defaulting to a plain `<a>`) so the
  package has no hard framework dependency. This is the "correct" answer
  for a package meant to work outside Next.js, but it's speculative
  generality right now: every known and planned consumer of this
  design system (this repo's `apps/web`, and DS BlockCode per the brand
  reference this package inherited) is a Next.js app. Building the
  abstraction before a second, non-Next consumer exists would be gold-
  plating against a requirement nobody has yet.
- **Fork Button into a Next-specific and a framework-agnostic version** —
  unnecessary duplication for the same reason.

## Consequences

- `@ds-simboard/design-system` is not usable, as-is, from a non-Next.js
  React app. If DS BlockCode (or any future product) is confirmed to run
  on something other than Next.js, this ADR should be revisited and the
  `linkComponent` prop (or equivalent) added at that point — this is
  flagged here specifically so that future decision isn't made by
  accident.
