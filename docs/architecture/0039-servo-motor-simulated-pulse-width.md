# ADR 0039: Servo motor — simulated pulse width, not sensed PWM

- **Date:** 2026-07-31
- **Status:** Accepted

## Context

ADR 0037 deferred the servo as "genuinely new component-library work,"
not a preset. Before implementing, the real signal a servo responds to
was researched, and what this simulator can actually sense from it was
checked directly in the code, not assumed.

**The real signal (researched):** a standard hobby RC servo is
position-controlled by a 50Hz PWM signal (20ms period) whose **pulse
width**, not voltage level, encodes the commanded angle. The
widely-used simplified mapping (matching the Arduino `Servo` library's
common tutorial range, and how most beginner servo wiring diagrams
describe it) is linear: **1000µs → 0°, 1500µs → 90° (center), 2000µs →
180°**. (The `Servo` library's own default full-range constants are
544–2400µs; 1000–2000µs is the commonly-taught simplified range and the
one used here, since it's what nearly every beginner tutorial and
servo datasheet "typical" spec actually documents.) Critically, a
servo does **not** respond to a steady DC voltage the way an LED or
motor does — holding its signal pin at a fixed voltage doesn't move it
to a proportional angle; only the pulse _timing_ does.

**What this simulator can actually sense from a running board, checked
directly:** `packages/chip-emulation`'s `AtmegaRuntime` exposes only
`digitalPinMode` (`"input"`/`"output"`) and `digitalPinValue` (`0 | 1`)
— a static boolean per tick, driven by whatever the real AVR CPU's
current pin state is. Grepping the whole package for `pwm`/`PWM`/
`dutyCycle`/`analogWrite`/`Timer` returns nothing — there is no timer/
PWM hardware emulation at all. `boardBridge.ts`'s
`BoardPinElectricalState` is correspondingly just `{kind: "driving",
isHigh: boolean} | {kind: "open"}`. There is no way today to measure a
pulse's _width_ from a real running sketch — only its instantaneous
high/low state once per animation-frame tick, with no timestamp
attached to when it last changed.

This is the same category of gap ADR 0038 named for protocol-dependent
parts (a real capability this simulator's engine doesn't have), just
for PWM timing instead of a communication bus.

## Decision

**The servo's angle is driven by a simulated pulse-width input, the
same "the human provides the input this simulator can't sense/derive"
pattern every environmental sensor (LDR, PIR, DHT11, rain/soil/sound)
already uses — applied here to an actuator's control signal instead of
a sensor's environmental reading.** The Inspector exposes a slider
labeled by the real signal parameter itself — "Simulated pulse width
(µs)," range 1000–2000 — not an abstracted "angle" slider a student
could set arbitrarily with no connection to the real signal. This is a
deliberate choice: it keeps the pedagogical link to the actual thing
that controls a real servo, while being explicit (not silent) that the
_sensing_ of that pulse width from real running code isn't something
this simulator can do without timer/PWM emulation it doesn't have.

**Wiring stays real and three-lead**, matching a real servo's
connector (`power`, `ground`, `signal`) — this is not skipped just
because the signal's _value_ is simulated:

- `power`/`ground` form the real current-carrying branch — a fixed
  resistance derived from rated voltage/current (the same `dcMotor`/
  `buzzer` shape), with the standard overcurrent/overvoltage health
  check. A servo genuinely draws real current and can genuinely be
  damaged by overvoltage; that part is not simulated-away.
- `signal`/`ground` form a second, high-impedance (1MΩ) branch — real
  enough that the lead participates in the circuit graph like every
  other component's lead (so wiring it to the wrong board pin, or
  leaving it unconnected, behaves like a real high-impedance control
  input), but without asserting a false claim that this simulator reads
  a meaningful voltage/timing off it. The angle comes from the
  simulated pulse-width input regardless of what's electrically wired
  to `signal` — the same relationship a DHT11's simulated readings have
  to its own (separately real) power leads.

## Alternatives considered

- **Map a steady DC voltage on the signal lead directly to angle** —
  rejected: this is the "backwards physics" mistake ADR 0037's Zener
  exclusion and ADR 0038's TVS exclusion both avoided, just for a
  different part. A real servo does not move to a proportional angle
  under a steady DC voltage; teaching that would be actively wrong, not
  a simplification.
- **Sense the board's real digital pin toggling and compute an actual
  duty cycle from consecutive tick states** — rejected for now: the
  simulation loop samples a board's pin state once per animation frame
  (`resolveCircuit.ts`'s tick loop), with no sub-tick timestamp of _when_
  within that frame the pin last changed. Approximating a duty cycle
  from once-per-frame samples of a 50Hz/20ms signal would be either
  wildly inaccurate or would require chip-emulation to grow real
  timer/PWM hardware emulation — a genuine, separate engine capability
  (closer in scope to avr8js's own timer peripherals), not something to
  bolt on inside a single component's build.
- **Give the servo only power/ground leads, drop the signal lead
  entirely** — rejected: every real servo has three wires, and a
  student should see and wire all three to learn the real connector,
  even though this simulator can't yet derive the angle from what's
  wired to it.

## Consequences

- New `component-library` model: `servoModel` (angle from simulated
  pulse width; health from real power-lead current/voltage).
- If chip-emulation ever grows real PWM/timer emulation, this ADR is
  the one to revisit — the model's shape (separate power branch +
  high-impedance signal branch) doesn't need to change, only the
  _source_ of the angle would move from "simulated input" to "sensed
  from the signal lead's real duty cycle."
