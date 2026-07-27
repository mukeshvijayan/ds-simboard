# ADR 0006: Breadboard Lab v1 scope — power rails, topology limits, part coverage

- **Date:** 2026-07-27
- **Status:** Accepted

## Context

Phase 4 wires `packages/circuit-engine` and `packages/component-library`
into a real UI for the first time (`apps/web/features/breadboard-lab`).
Three things came up during that wiring that spec Part 6 doesn't fully
resolve on its own, and per standing instructions for this run, get
flagged here rather than decided silently.

## Decisions

### 1. No separate "Battery" component

`component-library`'s 7 parts (spec Part 2.2) don't include a power
source. The Breadboard Lab models the board's power rails as always live
at a user-settable supply voltage (a toolbar number input,
`resolveCircuit`'s `supplyVoltageVolts` parameter) rather than requiring a
draggable Battery part. `buildCircuitGraph` adds a synthetic supply edge
directly between the resolved positive- and negative-rail nodes.

**Alternative considered:** add an 8th component type, `Battery`, with a
voltage parameter, wired like any other 2-terminal part. Rejected for v1 —
it's not in spec Part 2.2's list, and the rails-as-supply model is simpler
and matches how a real beginner breadboard circuit is usually powered (an
external supply feeding the rails, not a component sitting on the board
itself). If a later phase wants multiple independent voltage sources on
one board, this decision needs revisiting.

### 2. Free-form wiring, with an explicit "not a supported shape" state

A real breadboard lets you wire anything to anything, including parallel
branches — which `circuit-engine`'s series-only solver (ADR 0004,
reconfirmed for this phase) correctly rejects. Rather than constraining
the UI to only allow topologies the solver can handle, `resolveCircuit`
lets the user wire freely and returns a `"unsupported-topology"` status
(with the underlying reason from `walkSeriesLoop` included) whenever the
graph isn't a valid single series loop, instead of crashing or silently
producing a wrong answer. An `"empty"` status is reported separately for a
bare board (no components placed) — that path hits the same "not
degree-2 everywhere" condition in the solver, but it isn't a topology
problem the user created, so it gets its own honest label rather than the
same "unsupported wiring" message.

**Alternative considered:** restrict the UI itself to only ever produce
valid series loops (e.g. a guided "next in the chain" placement flow).
Rejected — it would feel less like a real breadboard, and free-form wiring
with a clear "not supported yet" state is more honest about what this
version can and can't solve than hiding the constraint behind a
restrictive UI.

**Not resolved here:** whether/when to build general nodal analysis so
parallel branches work. Still an open question for whichever phase first
needs it, per ADR 0004.

### 3. `capacitor` and `transistor` aren't wireable on the canvas yet

Both have fully tested `ElectricalModel`s in `component-library` already,
but neither is included in the Breadboard Lab's placeable parts
(`BreadboardComponentType` in `model/types.ts` only lists resistor, LED,
diode, pushbutton, potentiometer):

- `transistor` is a 3-terminal device; `CircuitGraph` only models
  2-terminal elements (per its own Phase 2 design). Wiring a 3-terminal
  part into a 2-terminal graph model wasn't decided in Phase 2 or 3 and
  isn't decided here either — it's an open question for whichever later
  phase needs it.
- `capacitor`'s `ElectricalModel` needs a real elapsed-time input
  (`deltaTimeSeconds`) to do anything meaningful — the RC charge/discharge
  curve is inherently time-stepped, and there's no continuous
  simulation-tick loop built yet in this phase (`resolveCircuit` is a
  point-in-time, on-interaction resolve, not a running clock). Wiring a
  capacitor in without real time-stepping would mean either faking a
  `deltaTimeSeconds` value (producing a number that isn't derived from
  anything real — exactly what spec Part 1 says not to do) or making the
  capacitor an inert placeholder, which seemed worse than just being
  upfront that it isn't on the canvas yet.

**Consequence:** a future phase that wants real-time capacitor charging or
transistor circuits needs a running tick loop (for elapsed time) and a
3-terminal-aware graph model (or an adapter) respectively — both flagged
here as prerequisites, not solved.
