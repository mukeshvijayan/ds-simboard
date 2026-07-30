# ADR 0037: Catalog expansion — new presets reusing existing electrical models

- **Date:** 2026-07-30
- **Status:** Accepted for the presets added here (diode rectifier/
  Schottky, the digital-sensor family, soil/water, rain/flame, sound/
  gas). A zener diode variant was deliberately **not** added — see
  below. Genuinely new component types (servo, ultrasonic distance
  sensor, 16×2 LCD) are separate, larger follow-up work, not attempted
  here.

## Context

The validated prototype's catalog included several presets this app's
component library didn't yet offer — some are just new _variants_ of a
type this app already models accurately (a different diode's real
forward-voltage/reverse-breakdown numbers, a different sensor's label
on the same simple resistive/digital abstraction), and some are
genuinely new component types with no existing physics at all (a
servo's angle, an ultrasonic sensor's distance, an LCD's character
display). The standing instruction was explicit that anything not yet
real needs the same `ElectricalModel`/`VisualState`/`HealthState`
treatment as everything else, not just a visual add — this ADR covers
the former group; the latter is out of scope here specifically because
it _isn't_ just a preset.

## Decision

### Diode: rectifier and Schottky, not zener

`evaluateDiode`'s `reverseBreakdownVoltageVolts` models reverse voltage
past that rating as a **failure** (the diode is damaged) — checked
directly in `component-library/src/components/diode/diode.ts` before
relying on it. This is an accurate model for an ordinary rectifier
diode (1N4007) or a Schottky diode (1N5819, lower forward drop, lower
reverse rating) — both real parts _are_ permanently damaged past their
rated reverse voltage, so both are added as presets using the existing
model with just different real numbers.

A zener diode is not: its entire purpose is controlled, **non-
destructive** reverse conduction at its rated voltage (voltage
regulation) — the opposite of "damaged past this voltage." Reusing the
existing model for a "Zener (5.1V)" preset would have taught backwards
physics — a real, checked-before-assuming distinction, not a guess. A
correct zener needs its own regulation-modeling electrical behavior
(new `component-library` work), so it's left out entirely rather than
shipped wrong.

### Sensor families: real reuse, not just relabeling

- **`motionSensor`'s own params are genuinely empty**
  (`Record<string, never>` — a user-toggled digital trigger only,
  confirmed in the model source before relying on it), so every simple
  digital on/off sensor in the prototype's list (PIR, tilt, vibration,
  touch, IR obstacle, hall effect) is _exactly_ the same physics as the
  PIR preset already shipped — different real part, identical
  electrical behavior, not a simplification that drops anything real.
- **Soil moisture ↔ water level**: both are simple resistive analog
  sensors in this app's existing model; reused directly.
- **Rain ↔ flame**: both use the same "externally-set analog level
  changes a resistance" abstraction this app's rain sensor already
  models — real flame sensors are more commonly IR-photodiode-based in
  practice, but this app's existing rain-sensor model was _already_ an
  abstraction at that same level of simplification, not a
  first-principles simulation of rain detection either, so this reuse
  doesn't introduce a new or worse simplification than the one already
  shipped.
- **Sound ↔ gas (MQ-2)**: real MQ-series gas sensors genuinely _are_
  resistive analog sensors (their resistance changes with gas
  concentration) — this reuse is accurate, not merely convenient.

## Consequences

- New presets: `diode-rectifier`, `diode-schottky` (replacing the
  single generic "Diode" preset); `motion-sensor-{pir,tilt,vibration,
touch,ir-obstacle,hall}`; `water-level-sensor`; `flame-sensor`;
  `gas-sensor` — all reusing existing, unchanged `component-library`
  models.
- No `component-library` changes at all — every addition here is a
  `constants.ts` preset with real-world parameter values, verified
  against each model's actual behavior before being added, not a new
  electrical model.
- Palette grouping (this session's earlier commit) automatically picked
  up every expanded family as a dropdown group, since grouping keys off
  `type`, not individual preset ids — no palette-side change needed
  beyond the new presets themselves.
- Servo, ultrasonic distance sensor, and 16×2 LCD remain unimplemented —
  each is a real new component type (new `ElectricalModel`/
  `VisualState`/`HealthState`, a new `Placed*` type, glyph, pin layout,
  Inspector controls, grade-tier assignment), not addressable as a
  preset-only change, and deliberately left for separate, dedicated
  work rather than rushed in alongside this lower-risk catalog
  expansion.
