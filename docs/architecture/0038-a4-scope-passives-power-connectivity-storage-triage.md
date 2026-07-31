# ADR 0038: New component families (passives/protection, diodes, power, connectivity, storage/connectors, memory) — full triage before building

- **Date:** 2026-07-31
- **Status:** Accepted

## Context

A new 34-part list — six categories never given a grade tier — was audited
against what `component-library`'s `ElectricalModel`/`HealthState`
contract and `circuit-engine`'s general MNA solver can actually represent,
before building anything, same discipline as ADR 0017/0022's A2 audits.

Two things are true about the engine today that shape every call below:

- `circuit-engine` is exclusively a **DC steady-state** Modified Nodal
  Analysis solver (A-Engine, ADRs 0018-0021): voltages, currents, fixed
  resistances, and piecewise-linear diode drops. There is no time-domain,
  frequency-domain, or AC analysis of any kind, and no digital-protocol
  (I2C/SPI/UART-framed/wireless) simulation anywhere in the codebase
  (confirmed again by grepping the whole repo — unchanged since ADR 0030
  made the same finding for Phase A3).
- A single physical component can already map to multiple graph elements
  sharing nodes (proven in production by the transistor's base-emitter/
  collector-emitter branches and the relay's coil/contact branches, ADR
  0026), and **an individual graph element can already independently
  declare itself a `"voltage-source"`**, not just `"resistive"`/`"diode"`
  — proven in production today by every board's power pin and every
  digital output pin (`resolveCircuit.ts`'s `makeDescribeElement`). This
  matters below: it means multiple independent voltage sources coexisting
  in one solve is not a hypothetical, it already ships.

That second point runs headlong into a **deliberate, documented product
decision**, not just an old solver limitation: ADR 0016 chose to make
`batteryHolder` an electrically transparent (0Ω) pass-through that reads
the board's one global supply voltage, explicitly **"not a second,
independent power source"** — reasoning that a single source of truth for
supply voltage keeps the whole model (and every student's mental model of
"what powers this circuit") simple, not that the solver couldn't handle
more sources. Several new parts in this list are, by their real-world
nature, sources or voltage-transforming blocks — so this audit had to
re-examine that boundary explicitly for each one, not just check "does a
graph element exist for this."

## Decision

### Buildable now (15 of 34) — real physics, fits the existing contract, no reversal of any documented decision

**Passives/protection (4 of 9):**

- **Inductor** — modeled by its real DC winding resistance (every real
  inductor has one) plus a rated-current health check (saturation/
  overheat). Honestly incomplete (no back-EMF/L·di/dt/AC behavior — this
  solver has no time domain), but not misleading: a small series
  resistance _is_ what an inductor actually presents at true DC.
- **Ferrite bead** — same shape as the inductor: a near-zero DC
  resistance with a current rating. Flagging explicitly, not silently:
  its actual job (high-frequency noise suppression) is invisible in a
  DC-only solver, so in this simulator it will be electrically
  indistinguishable from a very-low-value resistor. Worth building for
  the pedagogical value of recognizing the part and its rated current,
  not for demonstrating what it does.
- **Fast-blow fuse** — a near-0Ω pass-through that latches permanently
  open once current exceeds its rated value. This is a direct, exact fit
  for the existing `applyMagnitudeThresholdHealth` failed-latch pattern
  every other overcurrent-protected part already uses.
- **Resettable fuse (PTC)** — needs bespoke (not new-engine) logic: unlike
  every other component's health, a PTC's trip is _not_ permanent — it
  resets once current drops. Modeled with its own hysteresis (trips at
  `Itrip`, resets only below a lower `Ihold`, mirroring real PTC
  behavior) using the non-latching `"stressed"` status rather than
  `"failed"`, since the part isn't destroyed. No engine change, just a
  component that doesn't use the shared latch helper.

**Diodes (2 of 3):**

- **Bridge rectifier** — four diode graph elements in a bridge topology
  sharing two pairs of nodes, the same "one physical component, several
  graph branches" shape as the relay/transistor (ADR 0026), just a new
  topology shape (a mesh, not a shared-leg star) — general MNA already
  solves arbitrary topology, so this is no new engine capability, just a
  new wiring pattern in `componentGraphElements`.
- **Photodiode** — a diode whose reverse-bias leakage current scales with
  a simulated light-level input, the same "simulated environmental input"
  pattern LDR/soil/rain/sound already established, applied to a diode
  instead of a resistor.

**Power (3 of 6) — see the flagged exclusions below for the other 3:**

- **Li-ion/LiPo cell** — modeled exactly like `batteryHolder` (ADR 0016):
  an electrically transparent pass-through displaying the board's one
  real supply voltage, labeled as a Li-ion cell rather than a AA holder.
  This is not a new decision, it's the existing battery-holder decision
  applied to a different-looking battery.
- **USB power breakout** — same treatment again: a transparent,
  labeled pass-through for "power enters here," not a second source.
- **Solar panel** — modeled as a variable resistor gated by a simulated
  sunlight input (0–1), the same LDR-style shape as every other
  simulated-environmental-input part, riding on the existing single
  supply rather than injecting its own EMF. This is a deliberate choice
  to keep it inside ADR 0016's boundary rather than reopening it: a
  solar panel is, physically, a real independent source, so this is an
  explicit simplification (documented here, not silent), not a "solar
  panel is just a resistor" claim.

**Storage/connectors (6 of 7):**

- **Header pins, header sockets, JST connector, DC barrel jack, screw
  terminal, alligator clips** — all electrically identical: an ideal,
  near-0Ω pass-through with no realistic failure mode of its own, the
  same "one component type, several presets" reuse `motionSensor`
  already established across six sensor presets with
  `Record<string, never>` params. These are mechanical/wiring-vocabulary
  parts, not protective/active ones — their pedagogical value is
  learning to recognize and correctly use each connector shape, not
  demonstrating unique electrical behavior.

### Deferred — protocol-dependent, same bucket as every prior bus-simulation deferral (10 of 34)

**Connectivity (5): RFID reader, GPS module, GSM/GPRS module, LoRa
module, IR remote kit.** Every one of these is only useful via a real
communication protocol this simulator doesn't implement — SPI/I2C to a
microcontroller plus, for RFID/GSM/LoRa, an actual RF link; GPS's real
output is NMEA sentences over UART; IR remote is a timing-encoded serial
protocol (NEC/RC5-style), the same class of "single-wire timing protocol"
ADR 0017 already deferred for addressable RGB LEDs. None of these have a
meaningful DC electrical behavior to show on their own — the entire
reason to place one is to read data off it, which needs the protocol
layer.

**Storage (1): microSD module.** Same reasoning — real use needs SPI/SDIO
plus a filesystem concept, neither of which exists.

**Memory/data conversion (4): EEPROM, ADC module, DAC module, RTC
module.** Checked each individually, per the standing instruction not to
assume the whole category is blocked:

- **EEPROM** (24Cxx/25xxx-style) communicates over I2C or SPI; without
  it there's no way to read or write a byte, which is the entire point of
  the part. Electrically it's just "draws a small current when powered,"
  which would represent nothing about what an EEPROM actually is.
- **ADC module** (e.g. an ADS1115-style external ADC) exists specifically
  to hand a microcontroller a digital reading over I2C/SPI — without that
  bus, there's no way to get its conversion result anywhere.
- **DAC module** (e.g. MCP4725-style) is programmed over I2C/SPI to set
  its output voltage — without that, there's no way to tell it what to
  output.
- **RTC module** (DS1307/DS3231-style) reports the time over I2C — same
  gap.

All four are genuinely protocol-dependent, confirming rather than
assuming what was asked to be checked.

### Deferred — needs AC/frequency-domain or magnetic-coupling modeling, a distinct capability gap from protocol (3 of 34)

**Passives (3): step-down transformer, crystal oscillator, ceramic
resonator.** None of these have _any_ meaningful DC behavior:

- A transformer only transfers energy via a _changing_ flux; at true DC
  its secondary reads 0V regardless of the primary, full stop. Modeling
  a "step-down" ratio in a DC solver would mean inventing a magic DC
  voltage divider that isn't how a transformer works — the same
  misrepresentation risk the Zener exclusion (ADR 0037) was written to
  avoid, just for a different part.
- A crystal/ceramic resonator is an open circuit at DC; its only function
  is oscillating at a resonant frequency to clock digital logic — which,
  separately, this simulator also doesn't simulate. A DC circuit built
  around one would truthfully show "no current flows," which is correct
  but pedagogically empty (indistinguishable from an unconnected wire).

This is intentionally called out as its own category, not folded into
"protocol-dependent" — the missing capability here is AC/reactive/
magnetic simulation, not a communication bus. Both are real, separate,
future engine decisions.

### Deferred — physics-accuracy exclusion, same category as the Zener call (1 of 34)

**Diodes (1): TVS diode.** A TVS diode's whole job is non-destructively
clamping a transient overvoltage — but `evaluateDiode`'s
`reverseBreakdownVoltageVolts` (the only reverse-breakdown behavior that
exists) models permanent destruction, the exact same conflict ADR 0037
found and excluded a Zener diode over. Shipping a "TVS diode" that gets
permanently destroyed at the voltage it's rated to protect against would
teach the opposite of what the part is for. Deferred until/unless the
diode model grows a genuine non-destructive clamping mode — not a
protocol gap, a modeling-accuracy one.

### Deferred — architecturally leadless, doesn't fit the wireable-component shape at all (2 of 34)

**Passives (2): heat sink, clip-on ferrite core.** Every component this
simulator has ever placed — all 30-odd of them — has real electrical
leads a student wires (`COMPONENT_LEAD_NAMES`, one lead-click-target
button per lead, `ComponentGlyph`'s whole rendering model assumes this).
Both of these parts are physically different in kind: a heat sink clips
onto another component's package (e.g. a TO-220 regulator) and carries no
circuit current of its own; a clip-on ferrite core clamps around an
_existing_ wire/cable rather than being wired in itself. Neither has
terminals to wire, and neither has any DC-representable effect even if it
did (a heat sink is purely thermal; a ferrite core's effect is AC-only,
like the ferrite bead above, but without even the fallback of "well, it
has a small DC resistance" — a clamp-on core carries no DC resistance of
its own at all, since it doesn't touch the conductor). Building either
would mean inventing a new "leadless, decorative-attachment" component
shape this simulator has never needed before. Left deferred rather than
guessed at.

### Flagged — would require reversing ADR 0016's deliberate single-supply decision, a real product/architecture call, not made unilaterally (3 of 34)

**Power (3): buck converter, boost converter, LiPo charging module.**
Unlike the Li-ion cell/USB breakout/solar panel above, these three
**cannot be honestly modeled as a transparent pass-through** — a buck
converter that doesn't actually step its output down (because it's just
relaying the one global supply voltage unchanged) misrepresents the exact
concept the part exists to teach, the same category of problem as the
transformer above, except the missing capability here isn't AC — it's a
**second, independently-regulated voltage domain in the same circuit**,
which is precisely what ADR 0016 deliberately decided against, calling
battery holder "not a second, independent power source" _by design_, not
by solver limitation. The general MNA solver _can_ mechanically hold two
independent voltage sources today (proven by board pins) — but doing this
for a student-placed, student-wired component reopens a call ADR 0016
made on product/pedagogical grounds (one source of truth for "what powers
this circuit"), not an engineering one. That's a genuine architecture
decision, not an implementation detail I should resolve unilaterally the
way the Li-ion cell/solar panel modeling choices above were. Flagged here
for the same reason ADR 0028/0030 stopped rather than guessed — this
report surfaces it explicitly rather than either silently building a
voltage-changing block or silently declining to.

## What this unblocks vs. defers

- **Unblocked, building now:** 15 parts across passives/protection,
  diodes, power, and storage/connectors — see commits following this ADR.
- **Deferred, protocol-dependent (unchanged bucket from every prior bus
  deferral):** 10 parts.
- **Deferred, AC/magnetic-coupling gap (a distinct, separately-named
  capability gap from protocol):** 3 parts.
- **Deferred, physics-accuracy exclusion:** 1 part (TVS diode).
- **Deferred, architecturally leadless:** 2 parts (heat sink, clip-on
  ferrite core).
- **Flagged for the user, not decided unilaterally:** 3 parts (buck
  converter, boost converter, LiPo charging module) — building any of
  these as a genuine voltage-changing block means reopening ADR 0016.

## Alternatives considered

- **Treat "the solver can now hold multiple voltage sources" as blanket
  permission to build all 6 Power-bucket parts as independent sources** —
  rejected: conflates a mechanical solver capability with a deliberate,
  documented product decision (ADR 0016) that was never actually about
  the solver's limits. Applied narrowly instead: Li-ion cell/USB
  breakout/solar panel each have an honest way to fit _inside_ ADR 0016's
  existing boundary; buck/boost/charging module do not.
- **Build buck/boost/charging module as transparent pass-throughs anyway,
  just relaying the input voltage unchanged** — rejected for the same
  reason the Zener/TVS exclusions exist: it would ship a component that
  actively misrepresents the one thing it's named for.
- **Fold the AC/magnetic-coupling deferrals (transformer, crystal,
  ceramic resonator) into "protocol-dependent"** — rejected: the missing
  capability is genuinely different (frequency/reactive analysis, not a
  communication bus), and conflating them would misdiagnose which future
  engine investment actually unblocks them.

## Consequences

- 15 new components get real SVG art, pin/terminal labels, and
  `ElectricalModel`/`HealthState` implementations, verified visually and
  committed in small logical groups following this ADR.
- 19 parts remain unbuilt across five distinct, separately-reasoned
  deferral categories (protocol, AC/magnetic, physics-accuracy, leadless,
  and the flagged product-decision set) — whoever picks any of them back
  up should re-audit against whatever engine capability changed by then,
  the same way this ADR re-audited ADR 0017/0022's deferrals.
- The buck/boost converter/LiPo charging module question is left for the
  user to resolve before any of the three gets built, rather than guessed
  at either direction.
