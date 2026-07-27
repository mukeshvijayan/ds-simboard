# Onboarding

Read `docs/MASTER_BUILD_SPEC.md` first — it's the source of truth for the
electronics/physics model, the target architecture, and the ten-phase
roadmap this repo follows. This doc is just "how do I get the repo running
and find my way around today," and will be kept up to date as later phases
land.

## Prerequisites

- Node.js ≥ 20
- `corepack enable` (ships with Node) — this repo pins its package manager
  via `package.json#packageManager`, so `pnpm` doesn't need to be installed
  globally.

## Getting started

```bash
git clone <repo>
cd ds-simboard
corepack enable
pnpm install
pnpm dev
```

`pnpm dev` runs `turbo run dev`, which currently starts only
`apps/web` (the only app with a `dev` script) at `http://localhost:3000` —
`/` is the landing page, `/simulator` is the existing Arduino/ESP32
simulator shell, `/breadboard-lab` is the Phase 4 Breadboard Lab (the first
UI wired to `circuit-engine` + `component-library`).

## Common commands (run from the repo root)

| Command          | What it does                                                                                                                                                                                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`       | Start every app's dev server (today: just `apps/web`)                                                                                                                                                                                                                                                                                                    |
| `pnpm build`     | Production build of every workspace package/app                                                                                                                                                                                                                                                                                                          |
| `pnpm typecheck` | `tsc --noEmit` in every workspace package/app                                                                                                                                                                                                                                                                                                            |
| `pnpm lint`      | ESLint in every workspace package/app                                                                                                                                                                                                                                                                                                                    |
| `pnpm test`      | Unit tests in every workspace package/app (`packages/circuit-engine` and `packages/component-library` have full Jest suites at 100% coverage as of Phases 2–3; `apps/web` has a Jest suite scoped to `features/*/model/**` as of Phase 4 — not coverage-enforced, since it's UI-adjacent glue, not physics; `packages/design-system` still has no tests) |
| `pnpm format`    | Prettier `--write` across the repo                                                                                                                                                                                                                                                                                                                       |

All of the above are `turbo run <task>` under the hood: Turborepo looks at
every `package.json` in `apps/*` and `packages/*`, runs `<task>` in the
ones that define a matching script, and skips the rest — so adding a new
package with (say) a `test` script is enough to have it picked up by
`pnpm test` with no config changes.

## Repo layout (as of Phase 4 — Breadboard Lab UI)

```
ds-simboard/
├── apps/
│   └── web/                 Next.js app
│       ├── app/              Routes only: /, /simulator, /breadboard-lab
│       ├── components/       landing/, simulator/ — the *existing*
│       │                     Arduino/ESP32 simulator's feature UI, not
│       │                     yet split into apps/web/features/ (still
│       │                     deferred, per the Phase 1 report — but see
│       │                     features/breadboard-lab/ below, which *is*
│       │                     the Part 4 features/ pattern, for the new
│       │                     Phase 4 UI specifically)
│       ├── features/
│       │   └── breadboard-lab/   The Phase 4 UI — the first thing wired to
│       │                         circuit-engine + component-library:
│       │                         ├── model/       Pure, framework-agnostic
│       │                         │                logic (build the graph
│       │                         │                from placed components +
│       │                         │                wires, resolve bias
│       │                         │                direction from topology,
│       │                         │                solve, derive every
│       │                         │                component's health/
│       │                         │                visual) — has its own
│       │                         │                Jest suite, no DOM needed
│       │                         ├── components/  React pieces (holes,
│       │                         │                component glyphs,
│       │                         │                palette, inspector)
│       │                         └── BreadboardLab.tsx   Stateful container
│       │                         See docs/architecture/0006-*.md for the
│       │                         scope decisions made building this (no
│       │                         Battery component; free-form wiring with
│       │                         an explicit "not supported yet" state;
│       │                         capacitor/transistor not wireable yet).
│       └── lib/simulation/   The current sketch interpreter (SketchEngine)
│                             — a deliberately simple line-stepping
│                             interpreter, NOT the real chip emulator.
│                             Read lib/simulation/engine.ts's docstring
│                             before extending it. This becomes
│                             packages/chip-emulation in Phase 5. Still not
│                             wired to circuit-engine/component-library —
│                             the existing Arduino/ESP32 simulator and the
│                             new Breadboard Lab are separate UIs for now,
│                             matching spec Part 3's "three labs" framing.
├── packages/
│   ├── design-system/        DS Inventek tokens + Button/Container/
│   │                         ScrollReveal, shared by every app in the
│   │                         workspace. Ships TypeScript source directly
│   │                         (see docs/architecture/0002-*.md) — no build
│   │                         step, no watch process to run.
│   ├── circuit-engine/        Framework-agnostic circuit math:
│   │                         ├── graph/       UnionFind + CircuitGraph
│   │                         │                (generic node/element model),
│   │                         │                plus the CircuitGraph →
│   │                         │                solver bridge added in
│   │                         │                Phase 3 (seriesLoopBridge.ts)
│   │                         ├── breadboard/  The Part 2.1 physical model
│   │                         │                (rails + terminal-strip
│   │                         │                columns) built on UnionFind
│   │                         └── physics/     Ohm's law, the Phase 2
│   │                                          resistor-only series solver,
│   │                                          and the Phase 3 solver that
│   │                                          also handles LED/diode
│   │                                          fixed-voltage drops (see
│   │                                          docs/architecture/0004-*.md
│   │                                          and 0005-*.md)
│   └── component-library/    The "block contract" (spec Part 5.6):
│                             ├── contract/    ElectricalModel/VisualState/
│                             │                HealthState types, and the
│                             │                shared health-state-machine
│                             │                helpers (over-threshold,
│                             │                reverse-polarity, short-
│                             │                circuit) every component uses
│                             ├── components/  resistor, potentiometer,
│                             │                pushbutton, diode, led,
│                             │                capacitor, transistor — each
│                             │                its own folder, own params/
│                             │                input/visual types
│                             └── circuit/     The golden-path integration
│                                              test proving spec Part 5.4's
│                                              named example ("LED + resistor
│                                              + battery lights up; remove
│                                              resistor → burns out") through
│                                              the real circuit-engine graph
│                             Both circuit-engine and component-library
│                             enforce 100% branch/line/function coverage via
│                             jest.config.js's coverageThreshold.
├── docs/
│   ├── MASTER_BUILD_SPEC.md  The spec — read this first
│   ├── architecture/         ADRs — one file per non-obvious decision
│   └── onboarding.md         This file
├── pnpm-workspace.yaml       Declares apps/* and packages/* as workspaces
├── turbo.json                Task pipeline (build/dev/lint/typecheck/test)
└── tsconfig.base.json        Shared strict TS compiler options; every
                              package's tsconfig.json extends this
```

`packages/chip-emulation`, `packages/shared-types`, and `apps/api` from the
target architecture in spec Part 4 don't exist yet — they land in Phase 5,
(introduced alongside whichever package first needs shared types), and
Phase 8 respectively. Don't be surprised not to find them.

## Code style

- Strict TypeScript everywhere (`tsconfig.base.json` sets `strict: true`).
  No untyped `any` without a `// justified: ...` comment.
- ESLint (`next/core-web-vitals` in `apps/web`, a plain TS/React config in
  `packages/design-system`) and Prettier run via a Husky `pre-commit` hook
  (`lint-staged` formats staged files automatically — you don't need to
  run `pnpm format` by hand before committing, though CI still checks it).
- One ADR per non-obvious architectural decision, in `docs/architecture/`,
  using `docs/architecture/TEMPLATE.md`.

## CI

`.github/workflows/ci.yml` runs `pnpm install` → `pnpm format:check` →
`pnpm lint` → `pnpm typecheck` → `pnpm build` → `pnpm test` on every push
and PR.
