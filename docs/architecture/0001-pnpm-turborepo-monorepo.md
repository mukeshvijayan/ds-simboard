# ADR 0001: pnpm workspaces + Turborepo for the monorepo

- **Date:** 2026-07-27
- **Status:** Accepted

## Context

`docs/MASTER_BUILD_SPEC.md` Part 4 calls for a monorepo split into
`apps/*` (Next.js web app, later a backend API) and `packages/*`
(circuit-engine, chip-emulation, component-library, design-system,
shared-types), each independently testable and reusable across the DS
Inventek product family. The starting scaffold was a single flat
`package.json` with everything under `app/`, `components/`, `lib/`.

## Decision

Use **pnpm workspaces** for dependency management and **Turborepo** for
task orchestration (`pnpm run build/lint/typecheck/test` → `turbo run
<task>`, which runs the task in every workspace package that defines it
and skips the rest).

## Alternatives considered

- **npm workspaces** — works, but npm hoists dependencies into a single
  flat `node_modules`, which lets a package silently import a transitive
  dependency it never declared (a "phantom dependency"). This repo hit
  exactly that bug during the migration: `CodeEditor.tsx` imported
  `@codemirror/view` without declaring it, and it only worked under npm
  because `@uiw/react-codemirror` happened to pull it in as a transitive
  dependency. pnpm's strict, symlinked `node_modules` caught this
  immediately at typecheck time. That strictness is worth the switch on
  its own, independent of the workspace-linking benefit.
- **Yarn workspaces** — comparable to pnpm workspaces here, but pnpm's
  content-addressable store uses meaningfully less disk (a real
  constraint on this machine — see the disk-space note in the Phase 1
  report) and its phantom-dependency strictness is on by default rather
  than opt-in.
- **Nx** instead of Turborepo — more powerful (generators, dependency
  graph visualization) but a heavier tool than this project needs at
  Phase 1; Turborepo's task-pipeline model (`turbo.json`) is enough to
  express "typecheck/lint/build/test every package, respecting
  `dependsOn: ["^build"]` ordering" without introducing Nx's plugin
  ecosystem.
- **No monorepo tooling, just multiple `package.json`s run by hand** —
  doesn't scale past two packages; `packages/circuit-engine` needs to be
  typechecked and tested independently of `apps/web` starting in Phase 2,
  and CI needs one command that does the right thing repo-wide.

## Consequences

- Every workspace package needs its own `package.json` with explicit
  dependencies — no relying on hoisting. This is more verbose but is the
  point (see the phantom-dependency case above).
- `pnpm-workspace.yaml` (`apps/*`, `packages/*`) and `turbo.json`
  (`build`, `dev`, `lint`, `typecheck`, `test` tasks) are now the two
  files that define the repo's shape; any new app or package just needs
  a `package.json` with matching script names to be picked up
  automatically — no changes to `turbo.json` needed.
- The `test` task currently has nothing to run (no package defines a
  `test` script yet) and turbo correctly no-ops rather than failing —
  this activates automatically once Phase 2 adds `packages/circuit-engine`
  with real unit tests.
- Contributors need `corepack enable` (ships with Node ≥ 16.9) to get the
  pinned `pnpm` version from `package.json#packageManager` — documented in
  `docs/onboarding.md`.
