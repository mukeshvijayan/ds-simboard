# ADR 0017: Phase A2 scope — what fits the single-series-loop solver, what needs real new architecture

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

Phase A2's grade 6–8 component list (~16 named parts) was audited against
`circuit-engine`'s actual constraints before building anything, per the
standing instruction to write an ADR before building a component that
needs real new engine capability rather than discovering the gap mid-way.
Two constraints turned out to matter, one of them only becoming clear
partway through this audit (see the correction noted below):

- `CircuitGraph.CircuitElement` is hardwired to exactly two terminals
  (`nodeA`/`nodeB`) — load-bearing, not incidental.
- **The solver only walks a single loop where every node has degree
  exactly 2** (`seriesLoopBridge.ts`'s `walkSeriesLoop` throws otherwise:
  `"a series loop requires exactly 2 [elements] at every node"`). ADR
  0004 flagged this as "not a permanent ceiling," anticipating exactly
  this kind of future decision point.
- Several A2 parts aren't analog/resistive at all — they carry digital
  protocol traffic (I2C, single-wire timing) with no representation in a
  DC series-loop solver regardless of terminal count.

**A correction made during this same phase's planning, before anything
was built on the wrong premise:** the first draft of this ADR reasoned
that a transistor-as-switch could fit the existing solver by treating its
base terminal as a side-channel "gate" that never needs its own current
path solved. That's wrong. A real transistor switch circuit has a base
current and a collector current that are genuinely two different values
(related by hFE, not equal) flowing through two different loops that
share only the emitter/ground node — exactly the branch-point topology
`walkSeriesLoop`'s degree-2 requirement rejects. A relay has the identical
problem for the identical reason (coil circuit and contact circuit are
two separate loops by design — isolating them is the whole point of a
relay). Both were moved from "built now" to "deferred" once this became
clear, rather than shipping a transistor/relay that silently produces
wrong current values or crashes on the one topology that actually
demonstrates what either part is for.

## Decision

**Built now** (fits honestly within the existing single 2-terminal-per-
node series loop, the same kind of modeling A1's buzzer/motor/LDR already
established — a user-adjustable simulated input standing in for
something this simulator has no way to sense, exactly as LDR's simulated
light level already does):

- **PIR motion sensor** — a 2-terminal digital presence switch (same
  shape as a pushbutton), gated by a user-toggled "motion detected" state.
- **Soil moisture sensor, rain sensor, sound sensor** — each the same
  shape as A1's LDR: a variable resistor driven by a user-adjustable
  simulated environmental input (0–1 wetness/rain/loudness).
- **DHT11 temperature/humidity** — modeled as a small **fixed**-current
  digital sensor load electrically (a real DHT11 doesn't change its
  electrical draw based on what it's reading, so modeling it as a
  variable resistor the way the sensors above are would misrepresent how
  the part actually works, not just simplify it); its simulated
  temperature/humidity readings are clearly-labeled, user-adjustable
  display values, entirely separate from its (fixed) electrical model.

**Deferred, a real future architecture decision — not built now:**

- **NPN/PNP transistor-as-switch** and **relay module** — both need two
  genuinely separate current loops (control/coil vs. load/contact)
  sharing one node, i.e. a branch point `walkSeriesLoop`'s degree-2 rule
  rejects today. `component-library`'s `transistor` model (Phase 3) stays
  exactly as-is and fully tested; it's still not wireable in Breadboard
  Lab, for the same underlying reason it never was, now root-caused
  precisely instead of attributed to "it's 3-terminal."
- **RGB LED, addressable RGB LED, 7-segment display** — the same
  degree-2/branch-point problem: an RGB LED's R/G/B dies share a common
  leg but are three independent parallel current paths. Addressable RGB
  additionally needs a real single-wire timing protocol (WS2812-style)
  with no representation here at all.
- **Rotary encoder** — outputs quadrature pulses as it turns; no
  rotation/time-series input this simulator can drive that with.
- **Membrane keypad** — a scanned matrix of many pins; neither the
  terminal count nor the row/column scanning behavior fits a DC
  series-loop model.
- **I2C LCD backpack, OLED (SSD1306)** — need a real bus protocol (I2C)
  this simulator doesn't implement, plus a display-rendering concept
  `component-library`'s visual model has no precedent for.
- **DC motor driver (L298N-style)** — an H-bridge is a direction-control
  abstraction over the _existing_ `dcMotor`, not a new load itself;
  building it honestly needs a signal-level "which way is the bridge
  switched" input this simulator has no equivalent of yet.
- **Servo** — fundamentally PWM-position-controlled, not a simple
  current-drawing load; already exists, more honestly, in the separate
  sketch-code-driven `lib/simulation` simulator
  (`components/simulator/boards/Servo.tsx`), which can actually show
  angle control since it interprets real sketch code. That's the right
  home for it, not `component-library`.

## What this unblocks vs. defers

- **Unblocked**: PIR, soil moisture/rain/sound sensors, and DHT11 — five
  new, fully wireable components, all honestly within what a single
  series loop can represent.
- **Deferred to one real future decision**: general branch-point/
  parallel-loop circuit solving (in full generality, nodal/mesh analysis)
  is what transistor-as-switch, relay, RGB LED, and 7-segment all
  actually need. This is a substantial, multi-day-scale engineering
  effort in its own right (matrix assembly, a linear solve, rewriting how
  `resolveCircuit` walks a circuit at all) that deserves to be its own
  dedicated, carefully-tested piece of work — not rushed inside a
  component-catalog phase on a premise (transistor "just needs a third
  terminal") that turned out to be wrong on closer inspection. Real bus
  protocols (I2C) are a second, separate deferred effort, picked up more
  fully in A3 where the original request already anticipated needing it.

## Alternatives considered

- **Ship the transistor/relay anyway, accepting the degree-2 exception as
  a known limitation** — rejected: the only topology in which either part
  demonstrates its actual purpose (an isolated control circuit switching
  a separate load circuit) is exactly the topology that would be
  rejected or mis-solved. Shipping either would mean the component either
  refuses to work in its own canonical use case, or — worse — silently
  produces a plausible-looking but physically wrong current, which spec
  Part 1's "every visual must be derived from actual solved current,
  never scripted" standard exists specifically to prevent.
