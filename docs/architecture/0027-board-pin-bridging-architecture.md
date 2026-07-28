# ADR 0027: Boards as canvas components — bridging real pin state into the circuit graph

- **Date:** 2026-07-29
- **Status:** Accepted

## Context

P2-3 asks for Arduino Uno and ESP32 to become draggable canvas components
whose pins are real electrical nodes in the same circuit graph as every
other component (breadboard holes, component leads), bridged
bidirectionally with the board's actual running program — not a scripted
stand-in, the same standing rule `resolveCircuit.ts` already holds every
other component to.

This is genuinely new architecture, not a new component on the existing
model, for one reason: every component built so far is a pure function of
its own static params plus the graph's per-tick solve. A board's pin state
is **time-varying, driven by code executing continuously** (`avr8js`
stepping real AVR instructions for Arduino Uno; `SketchEngine`'s
already-async interpreter loop for ESP32) — independent of any user
interaction. `resolveCircuit` has never needed to run more than once per
state change before; a board on the canvas means the graph needs
re-resolving on a timer even when nothing else changed.

**What already exists to build on:**

- `packages/chip-emulation`'s `AtmegaRuntime` wraps a real `avr8js` CPU
  running a precompiled machine-code image (ADR 0007's scope: no live
  sketch compilation) and exposes `digitalPinValue(pin)` — the CPU's
  actual GPIO state.
- `apps/web/lib/simulation/engine.ts`'s `SketchEngine` is a line-stepping
  interpreter for ESP32 sketches (ADR 0008: no real Xtensa emulator
  exists), already running its own real-time async loop
  (`delay()`-driven, not stepped externally) and emitting `pin-change`
  events on `digitalWrite`/`analogWrite`.
- `ConnectionPointRef` already has a `{kind: "boardPin", boardItemId,
pinName}` variant, stubbed in P2-1 for exactly this phase.

## Decision

### 1. A board is a new placed-item kind, alongside breadboards

`PlacedBoard` (`{id, boardType: "arduinoUno" | "esp32", position,
running}`) joins `breadboards`/`components`/`wires` as its own array in
canvas state — not a `PlacedComponent`, since it has no `ElectricalModel`/
`HealthState` (a board doesn't "burn out" the way a resistor does; an
over-driven pin is the _component wired to it_ that fails, using the
exact same health machinery already in place). Each board type declares
a fixed pin layout (name, canvas position) and its logic voltage (5V for
Uno, 3.3V for ESP32) — static data, not per-tick state.

### 2. Two new capabilities on `AtmegaRuntime`, extending ADR 0007's scope (not reopening it)

- `setDigitalInput(pin, value)`: wraps `avr8js`'s own, already-public
  `AVRIOPort.setPin()` — genuinely injects an external logic level that a
  real `sbic`/`sbis`/`in` instruction reads back. This was unused
  plumbing until now because `BLINK_PROGRAM` never reads a pin.
- `digitalPinMode(pin): "input" | "output"`: reads `AVRIOPort.pinState()`
  to report whether the running program has configured a pin as input or
  output via its DDR register — needed so the bridge knows which
  direction to push data for a given pin, each tick.
- **A second precompiled demo, `DIGITAL_PASSTHROUGH_PROGRAM`**
  (`pinMode(13, OUTPUT); pinMode(2, INPUT); digitalWrite(13,
digitalRead(2));`, busy-looped): added because `BLINK_PROGRAM` alone
  cannot demonstrate genuine bidirectionality — it never reads a pin, so
  a claim of "bidirectional bridging" resting only on Blink would be
  asserted, not shown. Hand-assembled the same dev-time way as Blink
  (`avr8js`'s bundled assembler, `sbi`/`cbi`/`sbic`/`rjmp` — all
  supported by that assembler; confirmed by reading its `OPTABLE`
  directly rather than assuming), verified against the real CPU: setting
  pin 2 externally via `setDigitalInput` and reading pin 13 back out
  shows the real instruction-level passthrough, not a mocked response.

### 3. ESP32 stays output-only — an inherited limitation, not a new gap

`SketchEngine` doesn't evaluate expressions or conditionals for _any_
statement (ADR 0008), so it has no `digitalRead`-in-a-decision capability
to bridge from the graph at all — this was already true before P2-3 and
isn't reopened here. An ESP32 board on the canvas can drive pins (real
`pin-change` events → graph) but cannot receive a wired sensor's state
back into sketch logic. The unified canvas UI says this plainly rather
than hiding it.

### 4. The live bridge: a per-frame tick loop, not a new `resolveCircuit`

`resolveCircuit` itself doesn't change shape — a board's currently-driven
pins are just more voltage-source-like graph elements, described the
same `describeElement`-per-tick way the supply edges and switch branches
already are. What's new is _what drives the tick_:

- A `requestAnimationFrame` loop (only active while at least one board is
  `running`) does, each frame, in order:
  1. **Step.** Run a bounded instruction/time slice on each running
     board's engine (`AtmegaRuntime.runInstructions(N)` for Uno —
     `SketchEngine` needs no stepping, it's already real-time and
     self-driving via its own `delay()` chain).
  2. **Read outputs.** For each board pin currently configured as output
     (Uno: `digitalPinMode() === "output"`; ESP32: has received at least
     one `pin-change` event so far — the interpreter has no formal input
     mode, so "never written" is the only meaningful "not driving"
     state), record its real current value as a live voltage (0V or the
     board's logic voltage).
  3. **Resolve.** Build and solve the graph exactly as today, with those
     live values fed in as this tick's voltage-source descriptors for
     each such pin (keyed by `boardItemId:pinName`, a plain `Map`
     threaded alongside the existing static component list — mirroring
     how `SUPPLY_ELEMENT_PREFIX`'s edges are already just another
     `describeElement` case, not a special code path).
  4. **Write inputs (Uno only).** For every Uno pin `digitalPinMode()`
     reports as `"input"`, read that pin's just-resolved node voltage and
     call `setDigitalInput(pin, voltage > logicVoltage / 2)` — closing the
     loop back into the real CPU before the next frame's step.
- Each board's GND pin is an ordinary graph node (resolved through the
  same `resolveConnectivity` every other connection point goes through);
  its 5V/3.3V pin is an always-on supply edge to that GND node, deduped
  against other supplies exactly the way two wired-together breadboards'
  rails already are (`buildCircuit.ts`'s `poweredRailPairs`) — a board can
  power a circuit on its own, no breadboard required, the same way a
  battery holder already can.

### 5. Board glyph UI reuses, doesn't replace, the retired labs' board art

`ArduinoUno.tsx`/`ESP32.tsx` (kept from the deleted Arduino/ESP32 Labs
per P2-1) already render a board's pin layout as an SVG; they're adapted
into draggable `BreadboardGlyph`-style canvas items whose pins are real
`onHoleClick`-equivalent click targets producing `{kind: "boardPin", ...}`
points, not rebuilt from scratch. `CodeEditor.tsx`/`SerialMonitor.tsx`
(also kept) become a per-board panel shown when a board is selected.

## Alternatives considered

- **Make `resolveCircuit` itself own a timer/loop.** Rejected: it's a
  pure function everywhere else in this codebase (React `useMemo`s it off
  plain state) — giving it internal scheduling would make it the one
  stateful exception and complicate every existing test, which all call
  it as `resolveCircuit(breadboards, components, wires, voltage)` and
  expect one synchronous answer. A `requestAnimationFrame` loop that
  _calls_ the still-pure `resolveCircuit` every frame keeps that
  contract intact.
- **Model a board pin as a `PlacedComponent`** (reusing `health`,
  `componentGraphElements`, etc.) — rejected: a board pin's "value" isn't
  decided by Ohm's-law physics on its own params, it's dictated
  externally by a running CPU/interpreter every frame; forcing it through
  the same `evaluate*`/`describeElement` shape built for physical parts
  would need fake params for something that has none.
- **Give ESP32 a fabricated `digitalRead` returning some default** just so
  the UI looks symmetric with Uno — rejected outright: reporting a
  circuit-driven value that isn't actually reaching the sketch would be
  exactly the "scripted stand-in" the standing rule forbids, for no
  reason better than visual symmetry.

## Consequences

- Arduino Uno gets genuine, verified bidirectional bridging: an LED wired
  to pin 13 lights up in sync with the real `avr8js`-executed Blink
  program; a pushbutton wired to pin 2 genuinely changes pin 13's output
  through the real digital-passthrough program's own `sbic` instruction —
  proven in `chip-emulation`'s test suite before any UI exists to show it.
- ESP32 gets real output-direction bridging only, clearly presented as
  such — not a new limitation, the same one ADR 0008 already recorded.
- Raspberry Pi is **explicitly out of scope for this ADR and this pass** —
  a separate, short research ADR (0028) covers feasibility only, per the
  standing instruction that Raspberry Pi is a mandatory stop for user
  input before any building starts.
- A later phase adding a component whose behavior is genuinely
  time-driven rather than tick-static (a real clock/oscillator part) has
  a precedent to follow: the `requestAnimationFrame` loop this ADR adds,
  not a change to `resolveCircuit`'s own contract.
