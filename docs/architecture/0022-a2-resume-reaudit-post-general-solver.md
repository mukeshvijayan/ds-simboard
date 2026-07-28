# ADR 0022: Phase A2-resume — re-auditing ADR 0017's deferred components against the general solver

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

ADR 0017 deferred nine components/families because `circuit-engine`'s
solver at the time only handled a single series loop (degree-2-everywhere).
A-Engine (ADRs 0018–0021) replaced that with a general Modified Nodal
Analysis solver handling arbitrary topology, plus an iterative
piecewise-linear diode/LED solver. This ADR re-audits every ADR 0017
deferral against what's actually buildable now, before writing any
component code.

`CircuitGraph.CircuitElement` is still hardwired to exactly two terminals
— A-Engine never touched this. What changed is that **a single physical
component can now correspond to more than one graph element**, as long
as those elements are allowed to share a node — which they now are,
since branch points are fully solved instead of rejected.

**A correction made during this same planning pass, before any code was
written on the wrong premise:** the first draft of this ADR sorted RGB
LED and 7-segment display into "fully unblocked, zero new capability" on
the reasoning that they're electrically just N parallel LED branches
sharing a node — true, but incomplete. Placing one on the canvas still
needs **N physical leads mapped to N-1 graph elements sharing a common
node**, exactly the same requirement as the transistor. Checking the
actual UI code confirmed this matters concretely, not just in theory:
`InteractionMode.placing` (`model/interactionMode.ts`) only ever tracks
one `firstHole` — the entire click-to-place flow is hardcoded for
exactly two holes per component. A 4-lead RGB LED or 8-lead 7-segment
display needs that interaction extended to "click N holes, in order,
before the component is placed," plus visual feedback for "N of M holes
selected so far." That is a real UI feature, not a data-model tweak, and
it is a **prerequisite for every one of ADR 0017's remaining deferred
parts**, not just the transistor and relay as the first draft assumed.

## Re-audit results

**All four of ADR 0017's electrically-solvable-but-deferred parts need
the same one new capability: multi-lead components.**

- **RGB LED (common cathode/anode)** — 4 leads (R, G, B, common) → 3
  diode graph elements sharing the common node.
- **7-segment display** — 8–9 leads (7–8 segments + common) → 7–8 diode
  graph elements sharing the common node.
- **NPN/PNP transistor-as-switch** — 3 leads (base, collector, emitter)
  → 2 graph elements (base-emitter, collector-emitter) sharing the
  emitter node, **plus** a two-phase resolve (solve the base-emitter
  diode branch first to get real `baseCurrentAmps` for
  `component-library`'s existing `transistorModel`, Phase 3; decide
  saturated-vs-off; resolve once more with that decision) — one
  increment beyond RGB LED/7-segment, but built on the same multi-lead
  foundation.
- **Relay module** — coil and contact are two separate branches (not
  sharing a node with each other, unlike the transistor) with the same
  two-phase shape: solve the coil branch, derive contact state from its
  real current, resolve again.

None of this needs any further change to `circuit-engine` itself —
M1/M2's solver already handles arbitrary branch points and diodes; the
gap is entirely in `apps/web/features/breadboard-lab`'s placement
interaction and graph-building, which currently assume exactly one
`CircuitElement` per `PlacedComponent` and exactly two holes per
placement gesture.

**Still genuinely blocked, unrelated to topology or lead count —
unchanged from ADR 0017:** addressable RGB LED (single-wire timing
protocol), rotary encoder (quadrature/rotation input), membrane keypad
(scanned matrix), I2C LCD/OLED (I2C bus + display rendering), L298N
motor driver (a direction-control signal this simulator has no
equivalent of), servo (stays in the sketch-interpreted simulator).

## Decision

**Multi-lead component support is scoped as its own dedicated
sub-phase, not built in this pass.** It touches the placement
interaction model (`InteractionMode`, `BreadboardLab.tsx`'s click
handling, new "N of M holes" UI feedback), the graph-building layer
(`buildCircuitGraph` mapping one component to multiple elements),
result aggregation (combining several sub-elements' health/visuals into
one `ComponentResult` per placed component, since the UI's glyph/
inspector model assumes one physical part has one displayed outcome),
and — for transistor/relay specifically — the two-phase resolve
described above. That is comparable in scope to a full A-Engine-style
milestone sequence, not a same-session extension of an existing model,
and rushing the placement-interaction change in particular (a real,
user-facing behavior change) without dedicated design attention would
risk exactly the kind of half-verified UI change the standing
instructions ask to avoid.

Given Phase B1 (rate limiting on `/auth/signup`/`/auth/login`) is
explicitly flagged as the highest-priority remaining item in this run —
"this closes a real, currently-live exposure" — this session moves to
B1 next rather than continuing further into A2-resume's newly-identified,
larger-than-expected scope. Phase A2-resume (multi-lead components) and
Phase A3 (grade 9–10 components, several of which will also need this
same capability for logic-gate/shift-register-style multi-pin parts)
both resume after Phase B is addressed.

## Alternatives considered

- **Build a minimal, special-cased multi-lead path just for the
  transistor** (skip RGB LED/7-segment for now) — considered, but
  rejected for this pass: the placement-interaction change is the
  expensive, correctness-sensitive part regardless of which component
  motivates it, and building it once, generically, for whichever
  component needs it first is better than a transistor-specific
  workaround that RGB LED/7-segment would need re-doing anyway.
- **Rush the full multi-lead feature now anyway** — rejected: real
  scope (placement UX, graph mapping, result aggregation, two-phase
  resolve) for four remaining components, versus a real, live security
  gap (B1) explicitly called out as this run's top priority. Sequencing
  B1 first is the correct call under the standing prioritization.

## Consequences

- RGB LED, 7-segment, transistor-as-switch, and relay module all remain
  deferred — but for a single, well-understood, scoped reason (multi-lead
  placement support), not four separate unresolved questions.
- This ADR is the concrete plan for whichever session picks up
  multi-lead components next: extend `InteractionMode`/placement click
  handling for N holes, extend `buildCircuitGraph` for one-component-to-
  many-elements, add a result-aggregation step, then build the four
  components (RGB LED/7-segment single-phase; transistor/relay
  two-phase) on top.
