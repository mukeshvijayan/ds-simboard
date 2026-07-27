# ADR 0002: `packages/design-system` ships TypeScript source, not a build

- **Date:** 2026-07-27
- **Status:** Accepted

## Context

`packages/design-system` now holds the DS Inventek tokens (colors, font
family, a Tailwind preset) plus the three cross-product components
(`Button`, `Container`, `ScrollReveal`) extracted out of the landing page
in Phase 1. Every workspace package needs a way to consume this package
from TypeScript/TSX source.

## Decision

`packages/design-system` has **no build step**. Its `package.json` points
`main`/`types`/the `exports` map directly at `./src/index.ts` (and
`./src/tailwindPreset.ts` for the Tailwind-specific subpath). Consumers
rely on:

- **Next.js's `transpilePackages`** (`apps/web/next.config.mjs`) to
  transpile the package's TSX straight from source when bundling the app.
- **Tailwind's bundled `jiti`** loader to execute
  `tailwindPreset.ts` (a TypeScript file) when `apps/web/tailwind.config.ts`
  imports `dsInventekPreset` from it.
- **`tsc --noEmit`** directly against `src/**/*.{ts,tsx}` for the
  package's own `typecheck` script — there's nothing to compile, only to
  check.

## Alternatives considered

- **Pre-build with `tsup`/`rollup`** into `dist/` and point `main` there.
  This is the more conventional setup for a package meant to be published
  externally, but this package is `"private": true` and consumed only by
  workspace siblings inside this monorepo. Adding a build step here would
  mean every design-system change requires a rebuild-and-relink cycle
  before `apps/web` picks it up in dev — pure friction with no consumer
  outside this repo to justify it.
- **Publish to a private npm registry** — relevant if DS BlockCode (a
  separate repository) needs to consume this same package; out of scope
  until that's an actual requirement, at which point this ADR should be
  revisited and a real build step added.

## Consequences

- Simpler DX today: editing `packages/design-system/src/*` and saving is
  immediately visible in `apps/web`'s dev server, no separate watch/build
  process to run.
- This only works because every current and near-term consumer is a
  Next.js app in the same pnpm workspace. If `packages/circuit-engine` or
  `packages/component-library` (Phases 2–3) end up needing to run in a
  non-bundled context (e.g. a plain Node test runner, or a future
  non-Next consumer), they may need their own build step — this decision
  applies to `design-system` specifically, not to every package in
  `packages/*` by default.
