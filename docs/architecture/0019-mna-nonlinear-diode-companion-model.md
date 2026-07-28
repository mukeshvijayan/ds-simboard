# ADR 0019: Nonlinear diode/LED solving in general MNA — iterative piecewise-linear companion model

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

A-Engine M1 (ADR 0018) solves arbitrary-topology networks of resistors and
independent voltage sources. A real diode/LED is neither: its forward
voltage is only approximately fixed once conducting, and — critically for
general topology — **which state a diode is in (forward-conducting or
reverse-blocking) is not knowable from wiring alone once branch points
exist.** In the old series-only solver, `bias.ts` could determine a
diode's orientation purely from how it was wired into the one loop
(`physicalEntryNode`), because a series loop has exactly one current
path. In a general network (e.g. a diode inside a bridge, or one of
several parallel branches), whether a given diode ends up forward- or
reverse-biased depends on the circuit's actual operating point — which
itself depends on which diodes are conducting. This circularity is
exactly why real SPICE-family tools solve diodes iteratively rather than
in one linear pass.

Research done before writing any code (per the standing instruction not
to invent a novel numerical method here): real SPICE tools handle
nonlinear devices via a **companion model** — at each iteration, replace
the nonlinear device with a linear stand-in (for a smooth exponential
diode, a conductance + current source from linearizing the Shockley
equation at the current voltage guess; **Newton-Raphson** on the full
circuit is exactly repeated re-linearization-and-resolve until the
guess stops changing). This project's diode/LED model is **not** the
smooth Shockley exponential, though — ADR 0005 deliberately chose a fixed
forward-voltage-drop approximation ("the standard, textbook-correct way
to analyze an LED in a series loop") over the exponential curve, and
nothing here reopens that choice. A fixed-`Vf` diode is a genuine
**piecewise-linear (PWL) device model**: exactly two linear regimes
(conducting at a fixed voltage drop, or blocking as an open circuit),
switching between them at a threshold. For a PWL device, full
Newton-Raphson over a smooth curve is unnecessary machinery — the
well-known simplification (sometimes called diode-state iteration or
limiting) is to **guess which regime each diode is in, solve the
resulting fully linear network, check whether the result is
self-consistent with the guess, and flip the guess for any diode where
it isn't, repeating until stable.** This is still "iterative
linearization to convergence," the same family of technique as
Newton-Raphson, just specialized to a device with exactly two linear
segments instead of a continuous curve.

## Decision

New `solveMnaWithDiodes(network, options?)` in
`packages/circuit-engine/src/mna/mnaDiode.ts`:

1. **Each diode is described as** `{ id, nodeA (anode), nodeB (cathode),
forwardVoltageVolts, reverseResistanceOhms }` — `reverseResistanceOhms`
   defaults to `Infinity` for an ideal diode but is exposed so a
   near-ideal or leaky-diode model could set a finite value later without
   an API change.
2. **Initial guess: every diode starts "blocking."** Standard SPICE
   practice starts from an "off" operating point and lets iteration turn
   devices on as the solved voltages justify it, which avoids seeding a
   spurious short-circuit read on the very first pass.
3. **Each iteration**: convert every diode's current guessed state into a
   plain M1 element — `"conducting"` becomes an `MnaVoltageSource` at
   `forwardVoltageVolts` (nodeA positive, reusing M1's existing
   fixed-voltage-source machinery unchanged), `"blocking"` becomes an
   `MnaResistor` at `reverseResistanceOhms` (reusing M1's existing
   open-branch handling unchanged) — merge with the network's real
   resistors/sources, and call **`solveMna` completely unmodified**. M1's
   solver is the linear engine for every iteration; M2 adds no new linear
   algebra, only the state-guessing loop around it.
4. **Self-consistency check, one diode at a time**: a diode assumed
   `"conducting"` is consistent only if the solved current through it
   (nodeA→nodeB, the same orientation convention M1 already documents)
   is ≥ 0 — a real diode cannot carry reverse current while "on." A diode
   assumed `"blocking"` is consistent only if the solved voltage across
   it (`V(nodeA) − V(nodeB)`) does not exceed `forwardVoltageVolts` — more
   available forward bias than that means it should have turned on.
   **Exactly one inconsistent diode is flipped per iteration** (first
   found, in the order the caller listed them), not all inconsistent
   diodes at once — flipping one at a time is closer to a proper
   relaxation/Newton step and measurably reduces the chance of two
   coupled diodes' flips fighting each other into an oscillation, at the
   cost of possibly a few more iterations for circuits with several
   diodes. Given this project's circuit sizes (a handful of diodes on one
   breadboard), that trade is free.
5. **A singular linear solve (from M1) at any iteration maps directly to
   `{ kind: "short-circuit" }`.** This is not a new interpretation — a
   diode assumed conducting whose fixed `Vf` directly contradicts another
   independent voltage source on the same two nodes (e.g. spec Part
   2.3's canonical "LED with no series resistor" example: the diode's 2V
   companion source directly across a 5V battery, no resistance between
   them) is precisely M1's existing "two independent sources make
   contradictory demands" singular case. Spec Part 2.3 calls this
   scenario a short circuit; M1 already calls it singular; this ADR
   simply confirms the two are the same thing and are reported as such.
6. **A capped iteration count (`options.maxIterations`, default 100)
   guards against a genuinely oscillating configuration** (a diode
   flip-flopping between two other diodes' states indefinitely — possible
   in principle for pathological coupled topologies, though not expected
   for realistic breadboard-scale circuits). Exceeding it returns
   `{ kind: "non-convergent" }` — an honest, explicit failure, the same
   "don't guess, say so" pattern M1 already uses for `"singular"`, rather
   than looping forever or returning a plausible-looking wrong answer.
   The cap is exposed as an option specifically so tests can force it
   low and prove the non-convergent path is real and reachable, not
   dead code.

`solveMnaFromGraphWithDiodes` (`mnaDiodeGraphBridge.ts`) is the
`CircuitGraph` bridge, added **alongside** M1's `solveMnaFromGraph`
rather than changing it — same reasoning ADR 0005 already used for
adding `solveSeriesLoop` next to `solveSeriesCircuit`: the working, tested
function stays untouched, and the relationship between the two is
documented here instead of silently discovered later.

## Alternatives considered

- **Full Shockley-equation Newton-Raphson** (the "textbook SPICE" answer
  the prompt raised) — rejected because this project's diode/LED model is
  deliberately the fixed-`Vf` PWL approximation per ADR 0005, not the
  exponential curve; implementing true Newton-Raphson over a curve this
  codebase doesn't otherwise model would add real numerical complexity
  (derivative computation, damping/limiting to prevent divergence) to
  solve a smoothness problem that doesn't exist here. The iterative
  state-guessing approach is the direct, standard PWL-model analogue of
  the same underlying idea (iterative re-linearization to convergence)
  and matches the level of physical detail everywhere else in this
  codebase already commits to.
- **Flip all inconsistent diodes simultaneously each iteration** (a
  Jacobi-style update) instead of one at a time — rejected: simpler to
  implement, but more prone to two or more diodes' state changes
  interacting badly and oscillating (a well-documented failure mode of
  Jacobi-style nonlinear iteration vs. Gauss-Seidel-style one-at-a-time
  updates). One-at-a-time costs at most a few extra iterations for the
  circuit sizes this project has, which is free.
- **Treat every singular-while-conducting result as a distinct outcome
  from a singular-while-no-diodes-conducting result** — rejected: both
  are the identical mathematical condition (a rank-deficient system from
  contradictory fixed-voltage constraints) and spec Part 1 doesn't ask for
  a difference in how they're reported; collapsing both into
  `"short-circuit"` is simpler and loses no information a consumer needs.

## Consequences

- `solveMnaWithDiodes` calls `solveMna` up to `maxIterations` times per
  resolve. For this project's circuit sizes (single digits of diodes,
  each solve itself an at-most-a-few-dozen-unknown linear system), this
  is not a performance concern — consistent with M1's "correctness over
  speed" framing.
- Component-library's existing `diode`/`led` models
  (`forwardVoltageVolts`, `reverseBreakdownVoltageVolts`,
  `applyMagnitudeThresholdHealth` for reverse breakdown) are **untouched**
  by this milestone — M2 is purely a `circuit-engine`-layer capability.
  The old `bias.ts`-style "figure out forward/reverse from wiring
  topology" approach becomes unnecessary once a consumer switches to this
  solver (the iteration determines bias from the actual solved operating
  point instead), but retiring `bias.ts` and wiring
  `resolveCircuit.ts` over to this path is explicitly **A-Engine M3/M4's
  job**, not this one — nothing in the shipped product changes as a
  result of this ADR.
- `circuit-engine` now has four solve-adjacent capabilities
  (`solveSeriesCircuit`, `solveSeriesLoop`, `solveMna`,
  `solveMnaWithDiodes`). M3 is where the series-only solvers get
  migrated away from or explicitly kept — flagged again here, not
  resolved.
