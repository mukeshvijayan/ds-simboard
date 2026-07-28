# ADR 0020: A-Engine M3 — golden-path equivalence proven; series-only solvers kept until M4

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

A-Engine M3's task (per the standing instruction) is to make sure every
existing test that currently passes against `solveSeriesCircuit`/
`walkSeriesLoop` still passes — producing the same results — once
`solveMna`/`solveMnaWithDiodes` (M1/M2) exist, and to decide, explicitly,
whether the old series-only solvers get deleted now or kept alongside
the new one with a documented reason.

An audit of every real call site (not test/definition files) found:

- `packages/component-library/src/circuit/ledResistorGoldenPath.test.ts`
  — component-library's own end-to-end proof of spec Part 5.4's named
  golden path ("place LED + resistor + battery → it lights up; remove
  resistor → it burns out"), built directly against `CircuitGraph` +
  `solveSeriesLoopFromGraph`.
- `apps/web/features/breadboard-lab/model/resolveCircuit.ts` and its
  helper `model/bias.ts` — the live, shipped Breadboard Lab UI. `bias.ts`
  exists _specifically_ because the old solver can't determine a
  diode/LED's forward/reverse orientation itself — it infers bias from
  `walkSeriesLoop`'s walk order (`physicalEntryNode`), a topological
  trick that only works because a series loop has exactly one current
  path. This is real, currently-shipped product code with its own
  passing test suite (`bias.test.ts`, `resolveCircuit.test.ts`, plus the
  Breadboard Lab e2e suite) — nothing about it is broken or stale, it is
  simply the system this whole A-Engine effort exists to eventually
  replace.

## Decision

1. **`ledResistorGoldenPath.test.ts` is migrated in place** to
   `solveMnaFromGraphWithDiodes` (M2), describing the LED as a
   `{ kind: "diode", forwardVoltageVolts, reverseResistanceOhms:
Infinity }` element instead of a pre-computed `"fixed-drop"`
   descriptor with a hardcoded `"forward"` bias. This is a meaningfully
   _stronger_ proof than the original test, not just a like-for-like
   swap: the old test had to be **told** the LED was forward-biased
   (`ledSeriesElement(ledParams, "forward", ...)`, bias supplied as an
   input); the migrated test gives the solver only the raw topology and
   lets the iterative companion-model solver **determine** forward bias
   and the resulting current itself — proving M1/M2 reach the identical
   answer (`(5−2)/220` conducting; short-circuit with no resistor)
   without being handed the answer's key precondition in advance, the
   same way a real breadboard doesn't tell you in advance which
   direction current will end up flowing.
2. **`resolveCircuit.ts`/`bias.ts` are NOT migrated in this milestone.**
   That is explicitly **A-Engine M4's job** per the original phase plan
   ("wire the new solver into Breadboard Lab... in place of the
   series-only path"), not M3's. Migrating the live UI is a separate,
   larger change (new `PlacedComponent` → `MnaDiodeElementDescriptor`
   mapping, retiring `bias.ts` entirely since the solver now determines
   bias itself, re-verifying the UI's `"unsupported-topology"` state per
   ADR 0006) that deserves its own dedicated verification pass, not to
   be bundled into "prove the old and new math agree."
3. **Therefore `solveSeriesCircuit`, `solveSeriesLoop`, `walkSeriesLoop`,
   and `solveSeriesLoopFromGraph` all stay, unchanged, with their
   existing test suites untouched.** This is the "keep both, document
   why" branch of M3's instructions, not an oversight: `resolveCircuit.ts`
   is real, currently-shipped, tested product code that still depends on
   them, and deleting a solver a live UI still calls before its
   replacement is wired in would be a self-inflicted regression — a
   worse outcome than a documented, temporary discoverability cost.
   **This is scheduled to be resolved in M4**: once `resolveCircuit.ts`
   is migrated to the general solver and its own tests re-verified
   green, `solveSeriesCircuit`/`solveSeriesLoop`/`walkSeriesLoop`/
   `solveSeriesLoopFromGraph` (and `bias.ts`, which becomes unnecessary
   once the solver determines bias itself) will be deleted as part of
   that same milestone, not left indefinitely.

## Alternatives considered

- **Migrate `resolveCircuit.ts` now, as part of M3** — rejected: the
  phase plan explicitly separates this into M4, and folding it into M3
  would conflate "prove the math is equivalent" with "replace the live
  UI's solving path," two changes with different risk profiles (the
  former is pure addition/proof, the latter touches shipped product
  behavior and needs its own full verification pass, including e2e).
- **Delete the series-only solvers now and let `resolveCircuit.ts`
  break until M4 fixes it** — rejected outright: this would leave the
  shipped Breadboard Lab broken for however long M4 takes, which is
  exactly the kind of self-inflicted regression the standing
  "verification must be green before commit" instruction exists to
  prevent.

## Consequences

- `circuit-engine` still has four solve-adjacent capabilities after M3
  (unchanged from M2's count) — this ADR is the explicit "why," due to
  expire at M4.
- `ledResistorGoldenPath.test.ts` now exercises `solveMnaWithDiodes`
  instead of `solveSeriesLoopFromGraph`, so component-library's own
  proof of spec Part 5.4's golden path is now backed by the general
  solver — a real, if narrow, step of the migration is already done
  ahead of M4.
- M4 inherits a concrete, scoped task list: migrate `resolveCircuit.ts`'s
  `describeElement` to `MnaDiodeElementDescriptor`, delete `bias.ts` and
  its topological bias inference, delete the four now-unused series-only
  exports and their test files, and re-verify the full Breadboard Lab
  test/e2e suite green against the new solving path.
