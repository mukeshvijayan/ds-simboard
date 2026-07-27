# ADR 0005: A second series-loop solver (mixed R + fixed-drop), and why the graph bridge lives in `circuit-engine`

- **Date:** 2026-07-27
- **Status:** Accepted

## Context

Phase 3 asks for "the `CircuitGraph` → `solveSeriesCircuit` bridge deferred
from Phase 2" so the component library's flagship example — spec Part 5.4's
"place LED + resistor + battery → it lights up; remove resistor → it burns
out" — can actually be solved end-to-end through a real graph, not asserted
by hand.

Phase 2's `solveSeriesCircuit` (already reviewed and committed) only
handles purely resistive elements: `V = I·R_total`. An LED is not a
resistor — its forward voltage is approximately fixed once conducting (its
real V-I curve is exponential, but a fixed-`Vf` approximation is the
standard, textbook-correct way to analyze an LED in a series loop). Feeding
an LED into `solveSeriesCircuit` as if it had some fixed "resistance" would
produce a physically wrong current — which would silently violate the
"real physics, not scripted animation" requirement stated in spec Part 1
and Part 2.3's core promise (an LED with no series resistor is supposed to
compute a current that exceeds its max, not an arbitrary made-up number).

## Decision

1. **Added `solveSeriesLoop`** (`circuit-engine/src/physics/seriesLoop.ts`)
   alongside — not instead of — Phase 2's `solveSeriesCircuit`.
   `solveSeriesCircuit` is untouched: still committed, still tested, still
   used wherever a loop is purely resistive. `solveSeriesLoop` additionally
   accepts fixed-voltage-drop elements (`{ kind: "fixed-drop",
forwardVoltageVolts }`) alongside resistive ones
   (`{ kind: "resistive", resistanceOhms }`), computing
   `current = (supply − Σ forwardDrops) / Σ resistances`. It returns a
   3-way outcome (`"conducting" | "non-conducting" | "short-circuit"`)
   instead of throwing, so a genuinely common state (an LED that isn't lit
   because the supply doesn't forward-bias it) isn't modeled as an
   exception, while a real short circuit (Σ resistance ≤ 0 with enough
   voltage to drive current) is distinguished from that non-conducting
   case rather than conflated with it.
2. **The `CircuitGraph` → solver bridge (`walkSeriesLoop` +
   `solveSeriesLoopFromGraph`) lives in `circuit-engine`, not
   `component-library`**, even though Phase 3's task list mentions it
   under "component library." Both functions only touch `CircuitGraph`
   and `SeriesLoopElement` — neither one has to know what a resistor or an
   LED _is_. `solveSeriesLoopFromGraph` takes a `describeElement` callback
   that `component-library` supplies (asking each placed component how it
   currently presents itself electrically); the graph-walking and solving
   logic itself has zero component-specific knowledge, so it belongs with
   the rest of the graph/physics code, not the components that happen to
   be its first caller.

## Alternatives considered

- **Extend `solveSeriesCircuit`'s existing signature to accept fixed-drop
  elements instead of adding a new function.** Rejected: it's already
  committed and tested against a resistor-only shape; changing its
  signature would be an unannounced breaking change to reviewed code. A
  second, explicitly-named function is one file, doesn't touch anything
  already shipped, and its relationship to the original is documented
  here.
- **Model an LED as a very large but finite "equivalent resistance"** so
  it could go straight into the existing `solveSeriesCircuit`. Rejected:
  an LED's dynamic resistance is not fixed — it changes with current — so
  any single chosen "equivalent resistance" is only correct at one
  operating point and wrong everywhere else, which is exactly the kind of
  physically-wrong-but-plausible-looking number spec Part 1 warns against
  ("derive every visual from the actual computed current and voltage, not
  from a scripted animation").
- **Put the graph-walking bridge in `component-library`** since that's
  where spec Part 6 lists it. Rejected per the reasoning above — it would
  create a dependency in the wrong direction if anything _other_ than a
  component ever needs to walk a series loop (unlikely soon, but the
  function's own implementation gives no reason to couple it to
  component-library). `component-library` depends on `circuit-engine`
  (the natural direction — components need graph/physics primitives, not
  the other way around), and supplies the per-component glue via
  `describeElement`.

## Consequences

- `component-library` takes `@ds-simboard/circuit-engine` as a workspace
  dependency.
- Two series-loop solvers now exist in `circuit-engine`
  (`solveSeriesCircuit` and `solveSeriesLoop`). This is a real
  discoverability cost — a future reader has to know which one to reach
  for. `solveSeriesCircuit` stays only because Phase 2 already shipped and
  tested it standalone; new code (starting with `component-library`) should
  prefer `solveSeriesLoop`, which is the strict superset in capability.
- This still does not address parallel branches or multiple sources — see
  ADR 0004. Nothing here changes that scope decision.
