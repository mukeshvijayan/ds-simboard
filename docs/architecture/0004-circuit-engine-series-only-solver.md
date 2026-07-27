# ADR 0004: `circuit-engine`'s Phase 2 solver handles series loops only

- **Date:** 2026-07-27
- **Status:** Accepted — explicitly scoped, not a permanent ceiling

## Context

Spec Part 6 scopes Phase 2 ("Circuit engine core") as "node/graph model,
breadboard connectivity rules, **Ohm's law solver**, unit tests for every
formula" — not a full circuit solver. Spec Part 2.3's canonical example
(an LED with no/undersized series resistor drawing excess current) is a
single-loop circuit: one supply, one resistor, one LED in series. Real
breadboard circuits a user builds in Phase 4 (Breadboard Lab UI) can have
parallel branches (e.g. two LEDs off the same rail) and, in principle,
multiple sources — which requires general resistive-network analysis
(nodal/mesh analysis, i.e. solving a system of linear equations from
Kirchhoff's current/voltage laws), not just `V = I·R` applied once.

## Decision

`packages/circuit-engine/src/physics/seriesCircuit.ts`'s
`solveSeriesCircuit` only solves a single series loop: it sums resistances,
gets one current via Ohm's law, and derives each element's voltage drop
from that shared current. It does not attempt parallel branches or
multiple sources.

## Alternatives considered

- **Build general nodal analysis (MNA) now** — the "more correct" long-term
  answer, but it's a meaningfully bigger piece of engineering (matrix
  assembly, linear solve, handling arbitrary topologies) than "Ohm's law
  solver" asks for, and there's no consumer yet: `packages/component-library`
  (Phase 3) doesn't exist, and the Breadboard Lab UI that would let a user
  actually build a parallel-branch circuit is Phase 4. Building it now
  would be solving a problem before there's a real circuit graph (with
  real component electrical models) to feed it.
- **Wait until Phase 4 to build any solver at all** — rejected because
  Phase 2's explicit deliverable is "Ohm's law solver," and the series
  case is both genuinely useful on its own (it's exactly spec Part 2.3's
  LED-current example) and fully unit-testable in isolation now, which
  general nodal analysis over a not-yet-existent component graph wouldn't
  be.

## Consequences

- `CircuitGraph` (the generic node/element graph, also built in this
  phase) is intentionally solver-agnostic — it just stores topology. It
  does not currently have a method that converts its contents into
  `SeriesResistiveElement[]` for `solveSeriesCircuit`, because that
  conversion is only valid for a graph that happens to form a single loop,
  and nothing in Phase 2 constructs a `CircuitGraph` from real breadboard
  contents yet (there are no components to place). That wiring, and the
  general-network question below, both belong to whichever of Phase 3 or 4
  first needs to solve a circuit a user actually built.
- **Open decision for Phase 3/4**: whoever wires the Breadboard Lab UI's
  live solver feedback (spec Phase 4) needs to either (a) constrain what
  users can build to series-only loops for v1, or (b) implement general
  resistive-network solving before that UI ships. This ADR doesn't decide
  that — it's flagged here so the choice is made deliberately when that
  phase starts, not discovered as a gap partway through building the UI.
