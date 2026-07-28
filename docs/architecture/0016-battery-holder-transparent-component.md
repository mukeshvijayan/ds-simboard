# ADR 0016: Battery holder as a transparent, placeable component — not a new EMF source

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

Phase A1's grade 3–5 component set explicitly includes "battery holder."
ADR 0006 (Breadboard Lab v1 scope) explicitly decided the opposite: **"no
Battery component"** — the board's power model is the rails, always live
at a user-settable supply voltage, specifically so the `CircuitGraph`
never has to reason about where a source's EMF actually sits or how
multiple sources would interact (`circuitGraph.ts`'s own comment restates
this: "a circuit needs one [power source] — see ADR 0006... modeled as
always live... rather than requiring a separate, undrawn 'Battery'
component").

This is a real conflict between an already-made architectural decision
and a new request, of exactly the kind the standing authorization asks to
be flagged and resolved with a documented decision rather than silently
picked one way or the other.

## Decision

**A `batteryHolder` component now exists, but it is electrically
transparent — a perfect (0Ω) pass-through — not an independent voltage
source.** It does not add its own EMF to the circuit graph; the board's
power rails remain the single source of truth for supply voltage, exactly
as ADR 0006 established. Placing a battery holder on the board is a
labeled, placeable _visual_ for "this is where the batteries physically
go" — its `BatteryHolderVisual.suppliedVoltageVolts` reads and displays
the board's actual configured supply voltage (passed in as an input, not
stored as the component's own parameter), so it can never show a number
that disagrees with the real supply.

This resolves the literal request (grade 3–5 students get a real,
placeable "battery" on their canvas, matching what they'd see on a
physical breadboard) without reopening ADR 0006's actual reasoning: the
solver still never has to handle multiple independent sources, series/
parallel source combination, or internal battery resistance — all the
complexity ADR 0006 deliberately avoided is still avoided.

## What this doesn't do

- It does not let a student wire _multiple_ battery holders for a higher
  combined voltage (e.g. two AA holders in series for 3V) — every battery
  holder placed shows the _same_ board-wide supply voltage, since there's
  still only one real voltage source (the rails). A student placing two
  battery holders would see them agree with each other but not "add up" —
  a real simplification worth knowing about, not a bug.
- It does not model a battery's own internal resistance or a
  running-down-over-time discharge curve — both real, both out of scope
  for the same reason ADR 0006 gave for the capacitor's RC curve: there's
  no time-stepped simulation loop in Breadboard Lab to drive either.

## Alternatives considered

- **A real EMF-source component** (the battery holder contributes its own
  voltage to whichever loop it's part of, and the rails are removed as a
  concept) — this is what ADR 0006 already rejected, and doing it now
  would mean rearchitecting `circuitGraph.ts`/`resolveCircuit.ts` to
  handle multi-source loops, series/parallel source combination, and
  ADR 0004's existing "series topology only" scoping — a much larger
  change than a grade 3–5 vocabulary/visual request calls for. If a
  future grade band genuinely needs multiple independent, addable power
  sources (e.g. teaching series vs. parallel battery wiring), that's a
  real future decision, not something to build speculatively now.
- **Skip the battery holder entirely, keep only the numeric supply-voltage
  input** — resolves the conflict by not building it, but fails the
  actual grade 3–5 goal: a text input labeled "Supply (V)" is more
  abstract than a recognizable battery icon a young student can place,
  which is the entire point of this grade band's "vocabulary and visuals
  a grade-3 student can follow" requirement.
