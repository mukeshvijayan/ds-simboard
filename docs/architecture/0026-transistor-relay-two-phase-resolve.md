# ADR 0026: Transistor-as-switch and relay module — a two-phase graph resolve (P2-2, part 2)

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

ADR 0022/0025 closed two of the four multi-lead components deferred by
ADR 0017 (RGB LED, 7-segment display) — both were "free" once multi-lead
placement existed, since each is just N ordinary LED branches sharing a
node, evaluated from real solved current the same way a plain LED is.

The remaining two, transistor-as-switch and relay module, are a genuine
step up: **one branch's on/off state depends on a _different_ branch's
current**, not on its own voltage/current the way every other component
here (including a diode) decides its own behavior. `solveMnaFromGraphWithDiodes`
already handles a diode's own conducting-vs-blocking self-consistency
internally (M2's iterative companion model) — but it has no concept of
"branch X's resistance depends on branch Y's current," because that's not
a per-element property, it's a cross-branch, cross-component one. This ADR
is the concrete mechanism for that, since it's new solving architecture,
not a new physics model reusing existing solving architecture.

## Decision

**Two solves of the same graph, not one, whenever a transistor or relay is
present:**

1. **Phase 1 — solve with every switched branch assumed open.** The
   transistor's collector-emitter branch and the relay's contact branch
   are both described as `{ kind: "resistive", resistanceOhms: Infinity }`
   (an ordinary open branch — same convention `dcMotorSeriesElement`/etc.
   already use for a burned-out part). Every other branch (base-emitter,
   coil, and everything else on the canvas) solves normally in this same
   pass. This is a safe assumption to solve _from_, not a hack: the base
   circuit and coil circuit are, in every circuit this simulator can
   express, physically independent of whatever the collector/contact
   branch is doing (they don't share a node with it in the transistor's
   case, only with the _emitter_, whose voltage a many-times-higher-
   resistance open branch has negligible effect on).
2. **Decide switch state from Phase 1's real current.** Read the actual
   solved base-emitter current (transistor) or coil current (relay) from
   Phase 1's result, and decide on/off via `transistorIsOn`/`relayIsEnergized`
   (`component-library`) — a plain threshold comparison, the same
   "textbook transistor switch" and "relay pull-in current" reasoning
   used in the original ADR 0017 `transistorModel`, just fed a real
   solved current instead of a value the caller had to supply directly.
3. **Phase 2 — re-solve the whole graph once, with that decision baked
   in.** The switched branch now describes itself as a small
   `onResistanceOhms`/`contactOnResistanceOhms` (closed) or stays
   `Infinity` (still open), and every component's final health/visual —
   not just the transistor/relay's own — is evaluated from _this_ solve.
   This matters because turning a switch on can change current elsewhere
   (a relay closing a lamp circuit changes what that lamp actually draws;
   two relays sharing a rail interact) — Phase 1 alone would report stale
   numbers for anything downstream of the switch.

**No iteration loop.** Unlike M2's diode solver (which repeatedly flips
one inconsistent guess at a time until the whole network agrees with
itself), there is no feedback path here for the decision to need
revisiting: the control branch's current in Phase 2 is the same current
that decided Phase 2's switch state, by construction — nothing downstream
of the switch can feed back into whether the switch should be on, since
this simulator has no component whose electrical behavior depends on
another component's node voltages except through the graph the MNA solver
already fully accounts for. Two solves, always exactly two when a switch
is present, is the whole algorithm.

**`resolveCircuit.ts`'s existing short-circuit/non-convergent handling
runs identically after either phase**, factored into one small
`solveGraphOrReport` helper reused by both — a short found even with
every switch assumed open is a real problem unrelated to the switch
decision (Phase 1 alone reports it); a short that only appears once a
relay closes is equally real and reported from Phase 2. When no
transistor/relay is on the canvas, Phase 2 is skipped entirely (there is
nothing for it to decide differently) and Phase 1's result is used
directly — same single-solve cost as every prior resolve.

**Transistor is single-health, relay is per-channel (coil/contact)** —
same reasoning as ADR 0025's RGB LED: a relay's coil winding and its
contact points are physically separate failure modes (a burned coil
doesn't weld the contacts), so `PlacedRelay.health = { coil, contact }`,
reusing the same `overallHealthStatus`/`firstHealthReason`/
`componentHealthEquals` helpers (they're already structural/duck-typed,
so a third two-channel shape needs no changes there). A transistor has
one physical junction that fails, so it stays a plain `HealthState`, like
every 2-lead component.

**No new `component-library` MNA-descriptor helper functions** —
following the LED/diode precedent (not the resistor/motor one): `led.ts`/
`diode.ts` have no `xSeriesElement()` exporting an MNA descriptor, because
their descriptor depends on wiring-time facts (`leadZeroIsPositive`) the
apps/web layer already resolves; `resolveCircuit.ts` builds their
`MnaDiodeElementDescriptor` inline from `params` directly. Transistor's
base-emitter branch is diode-shaped for the same reason, so it follows
suit — `transistor.ts`/`relay.ts` export only `evaluate*`/`transistorIsOn`/
`relayIsEnergized` (real physics, given a real current), and
`resolveCircuit.ts` builds all four descriptors (`:be`, `:ce`, `:coil`,
`:contact`) itself, exactly like it already does for `led`/`diode`/`rgbLed`/
`sevenSegmentDisplay`.

## Alternatives considered

- **Model the switch decision as an extra diode-like element inside
  `solveMnaWithDiodes` itself** (extending M2's own iteration to also
  flip a "switch" element based on another element's current) — rejected:
  that couples `circuit-engine` (deliberately generic, no notion of
  "component" at all) to an app-specific concept ("this branch's owner is
  a different component than that branch's owner, and they're linked").
  Two solves at the `apps/web` layer, where `PlacedComponent` ownership
  already lives, is simpler and keeps `circuit-engine` untouched — same
  reasoning ADR 0025 used to avoid touching `circuit-engine` for RGB LED.
- **A single solve with the switch always at its decided on-resistance
  guessed from typical circuit values** — rejected: right most of the
  time is not the standing bar here ("never a scripted stand-in, per spec
  Part 1" — `resolveCircuit.ts`'s own docstring); a wrongly-guessed switch
  state would report a plausible-looking but false brightness/speed for
  whatever the switch controls.

## Consequences

- Placing a transistor as a switch (driving an LED+resistor or a DC
  motor from the collector, with a base resistor sized so the base
  current clears `baseThresholdCurrentAmps`) now shows the _actual_
  collector current from a real second solve, not an estimate.
- A relay's coil and contact can be wired anywhere on the canvas, even
  across separate breadboards, and the two-phase resolve still finds the
  right answer — the mechanism doesn't assume they're near each other.
- The two-phase resolve is `apps/web`-only, generic within that layer
  (keyed off `PlacedComponent.type`, not hardcoded to exactly these two
  components) — a later component needing the same "decide from one
  branch, apply to another" shape reuses `solveGraphOrReport` rather than
  inventing a new resolve path.
- ADR 0022's four deferred components are now all delivered: RGB LED and
  7-segment (ADR 0025), transistor-as-switch and relay module (this ADR).
