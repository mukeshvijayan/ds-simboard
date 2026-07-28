# ADR 0018: A general nodal-analysis (MNA) solver, replacing the series-only ceiling flagged in ADR 0004

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

ADR 0004 explicitly scoped `circuit-engine`'s Phase 2 solver to series loops
only and flagged general resistive-network analysis as "not a permanent
ceiling" — a deliberate deferral, not a rejection. Phase A2's planning
(ADR 0017) hit that ceiling directly: transistor-as-switch, relay,
RGB LED, and several other real components need a branch point (a node
touched by 3+ elements) that `walkSeriesLoop`'s degree-2-everywhere
requirement rejects by design. Rather than keep deferring components one
ADR at a time as each hits the same wall, the decision (made by the
project owner, not discovered mid-build this time) is to build the real
general solver now, once, and re-open every component ADR 0017 deferred
for that reason.

Real SPICE-family tools solve arbitrary resistive/nonlinear networks via
**Modified Nodal Analysis (MNA)**: assemble a conductance matrix from
Kirchhoff's current law at every node, augment it with one equation per
independent voltage source (since a voltage source fixes a voltage
difference rather than contributing a conductance), and solve the
resulting linear system for node voltages and source branch currents.
This milestone (A-Engine M1) implements exactly that, scoped to purely
resistive networks plus independent voltage sources — nonlinear elements
(diodes/LEDs) are M2's job, explicitly deferred here the same way ADR
0005 added `solveSeriesLoop` alongside (not instead of) `solveSeriesCircuit`.

## Decision

New `packages/circuit-engine/src/mna/` module:

1. **`linearSystem.ts` — `solveLinearSystem(a, b)`**: dense Gaussian
   elimination with partial pivoting over `number[][]`. Returns
   `{ kind: "solved", solution }` or `{ kind: "singular" }` (pivot
   magnitude below a fixed epsilon at every remaining candidate row).
   Chosen over LU decomposition or an iterative method because it's the
   simplest algorithm to implement _correctly_ and verify by hand — spec
   Part 1's "real physics, not scripted" standard demands the math be
   trustworthy far more than it demands speed, and circuit sizes here
   (a breadboard's worth of components) are at most a few dozen
   unknowns, nowhere near where O(n³) elimination cost would matter.

2. **`mna.ts` — `solveMna(network)`**: builds the augmented
   `[[G, B], [C, 0]]` system from `MnaResistor[]` and
   `MnaVoltageSource[]`, referenced to a caller-supplied `groundNodeId`
   (0V by definition), and solves it. Three deliberate edge-case
   decisions, each chosen to keep every number that comes out
   physically honest rather than silently wrong:
   - **A 0Ω resistor is modeled as a synthetic 0V voltage source**, the
     standard MNA trick for representing an ideal wire/closed-switch —
     a literal 0Ω conductance is undefined (1/0), not just large.
   - **An infinite-resistance resistor (an open switch) is omitted from
     the matrix entirely** — zero conductance contributes nothing, and
     this correctly reports 0A through that branch without needing any
     special-cased handling downstream.
   - **A branch (resistor or synthetic wire) entirely disconnected from
     the ground-containing component reports 0A** for its own elements —
     correct when the disconnected piece has no independent source of
     its own (e.g. a dangling chain hanging off an open switch). But
     **an independent voltage source found in a component disconnected
     from `groundNodeId` throws `RangeError`** rather than silently
     reporting 0A for it — a second, ground-disconnected battery is a
     genuinely different circuit this single-reference-node solver
     cannot honestly represent (its voltages have no defined relationship
     to the chosen ground), and spec Part 1 rules out reporting a
     plausible-looking wrong number for that case. This mirrors
     `walkSeriesLoop`'s existing precedent of throwing on a disconnected
     extra loop rather than silently ignoring it.

3. **`mnaGraphBridge.ts` — `solveMnaFromGraph(graph, groundNodeId,
describeElement)`**: the `CircuitGraph` → `solveMna` bridge, the
   direct MNA analogue of ADR 0005's `solveSeriesLoopFromGraph`. Unlike
   `walkSeriesLoop`, it does **not** require every node to have degree
   exactly 2 — arbitrary topology (branch points, parallel paths,
   multiple loops) is the entire point of this milestone. A
   `MnaElementDescriptor` distinguishes `"resistive"` from
   `"voltage-source"`; for a voltage source, `CircuitElement.nodeA` is
   defined as the positive terminal, matching the existing
   `leadZeroIsPositive`-style convention already used elsewhere in this
   codebase for polarity-sensitive components.

All three currents/voltages returned use one consistent sign convention:
`elementCurrentsAmps.get(id)` is the current that would be measured
flowing from `nodeA` to `nodeB` through that element — the same
orientation for resistors (`(V(nodeA) − V(nodeB)) / R`, standard Ohm's
law) and voltage sources (the standard MNA branch-current variable),
documented explicitly in `mna.ts` since it's easy to get backwards for a
source (a battery's branch current is the _negative_ of the current it
delivers to the external circuit it powers, since current enters the
source at its negative terminal).

## Alternatives considered

- **LU decomposition instead of plain Gaussian elimination** — mathematically
  equivalent for a one-shot solve like this (no repeated solves against
  the same matrix with different right-hand sides, which is where LU's
  reused-factorization advantage would actually pay off). Rejected as
  unnecessary complexity for no real benefit at this scale.
- **An iterative solver (Gauss-Seidel, conjugate gradient)** — standard
  for very large sparse systems; rejected as solving a problem this
  project doesn't have (dozens of unknowns, not thousands) while adding
  real convergence-criteria complexity Gaussian elimination doesn't need.
- **Silently treating a ground-disconnected voltage source as 0A** instead
  of throwing — rejected per spec Part 1: a second isolated battery isn't
  "no current," it's a circuit this solver's single-ground-reference
  design can't represent, and reporting 0A would be indistinguishable
  from a genuinely idle branch, hiding a real modeling gap behind a
  plausible-looking number.

## Consequences

- `circuit-engine` now has three solvers: `solveSeriesCircuit` (Phase 2,
  resistive-only series), `solveSeriesLoop` (Phase 3, mixed
  resistive/fixed-drop series), and `solveMna` (this ADR, general
  topology, resistive/voltage-source only for now). This is a real
  discoverability cost, same one ADR 0005 already accepted for its own
  addition — flagged here rather than silently left implicit.
  **A-Engine M3 will resolve this**: once M2 makes `solveMna` handle
  nonlinear elements too (a strict superset of what `solveSeriesLoop`
  can do), every existing series-loop call site migrates to it and the
  two series-only solvers are either deleted or explicitly kept with a
  documented reason — that decision belongs to M3, not this ADR.
- `solveMna`/`solveMnaFromGraph` are not yet wired into
  `apps/web/features/breadboard-lab` — that's A-Engine M4's job. Nothing
  in the shipped product changes behavior as a result of this milestone;
  it adds a new, fully tested capability in `circuit-engine` without
  touching any existing consumer.
- Nonlinear elements (a forward-biased diode/LED's exponential V-I curve)
  are explicitly out of scope here — `solveMna` today only accepts
  resistors and independent voltage sources. Feeding it a component that
  needs a nonlinear model (without M2's companion-model/Newton-Raphson
  extension) would require the caller to approximate it as a fixed
  resistance, which is exactly the "physically wrong but plausible"
  shortcut ADR 0005 already rejected once for the series case — so no
  caller should do this, and none does yet since nothing calls this code
  in production until M4.
