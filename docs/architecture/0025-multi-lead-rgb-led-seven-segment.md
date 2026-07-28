# ADR 0025: Multi-lead placement, RGB LED, and 7-segment display (P2-2, part 1 of ADR 0022)

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

ADR 0022 scoped multi-lead component support as its own sub-phase and
identified four components blocked on it: RGB LED, 7-segment display,
transistor-as-switch, and relay module. This ADR covers the first two —
purely electrical (N independent LED branches sharing a common leg, no
new solving behavior needed) — and the shared placement-UI capability all
four depend on. Transistor-as-switch/relay additionally need a two-phase
resolve (base current decides the collector branch's state) and are a
separate follow-up commit, not covered here.

## Decision

1. **Placement generalizes from "click 2 points" to "click N points, in
   order."** `InteractionMode.placing` now carries `collectedPoints:
ConnectionPointRef[]` instead of a single optional `firstPoint`; a new
   `presetLeadNames(preset)` (`constants.ts`) says how many clicks a
   preset needs and what to call each one ("common leg," "red lead," …),
   driving both the finalization check and the palette's step-by-step
   prompt ("Click the red lead hole (2 of 4)."). Every existing 2-lead
   preset works unchanged — `presetLeadNames` defaults to
   `["first lead", "second lead"]` (or `["anode (+)", "cathode (−)"]` for
   LED/diode) without needing any of the 20 existing presets edited.
2. **RGB LED and 7-segment display need zero new `component-library`
   models.** Each channel/segment is described to the solver as an
   ordinary `evaluateLed`/diode-descriptor branch — `componentGraphElements()`
   (new, `model/componentElements.ts`) maps one placed component to
   however many graph branches it actually has (one for the 14 plain
   types, three or eight+one sharing a common leg for the two new ones),
   oriented by `commonTerminal` ("cathode": common leg is every channel's
   cathode, so its own lead is the anode; "anode": reversed). Both
   `buildCircuit.ts` and `resolveCircuit.ts` consume this same function,
   so the graph-building and the per-tick evaluate/describe logic can't
   drift apart on what a multi-lead component's branches are.
3. **Health and visuals are per-channel, not per-component.** A real LED
   die inside an RGB LED or 7-segment package can burn out independently
   of its neighbors — `PlacedRgbLed.health` is `{red, green, blue}`, not
   one `HealthState`; `ComponentResult.health`/`ComponentVisual` widen to
   a union covering this. Three small helpers generalize the places that
   used to assume a flat `HealthState`: `overallHealthStatus` (worst
   status across channels, for a glyph's color or the Inspector's one-line
   summary), `firstHealthReason` (the first failed channel's reason, for
   the same summary), and `componentHealthEquals` (structural comparison,
   replacing the old `.status !==` check in the health-persistence
   effect).
4. **A component's canvas position generalizes to the centroid of all its
   leads** (`componentLeadPoints()`), replacing the old fixed "midpoint of
   leads[0]/[1]." Wire-line rendering in `BreadboardGlyph.tsx` similarly
   iterates `componentGraphElements()` instead of assuming exactly two
   leads, so a multi-lead part's several branches each draw their own
   line to the shared common leg.

## Alternatives considered

- **A generic `leads: ConnectionPointRef[]` array on every `PlacedComponent`**
  instead of keeping the 14 existing types' `leads: [A, B]` tuple and
  adding named fields (`commonLead`/`redLead`/etc.) only to the two new
  types — rejected: named fields for RGB LED/7-segment are clearer and
  remove any off-by-index risk (which lead is "the common one" is
  semantic, not positional), and this avoids touching the 14 already-
  working types' shape at all.
- **A single shared `component-library` model for "RGB LED"/"7-segment"**
  — rejected: neither is new physics, just more instances of the exact
  LED model already fully tested; adding a wrapper model would duplicate
  logic `evaluateLed` already provides correctly.

## Consequences

- Real, verified behavior: placing an RGB LED now takes exactly 4 clicks
  (common, red, green, blue) with a live step counter, and each channel
  lights independently based on its own wiring — proven via a real
  browser e2e test, not just unit tests of the model layer.
- Two of ADR 0022's four deferred components remain: transistor-as-switch
  and relay module, needing the two-phase resolve described there. That
  work builds directly on `componentGraphElements`/multi-lead placement,
  landing as its own commit next.
- A genuine, unrelated e2e flake was caught and fixed while verifying
  this: a stepped `page.mouse.move(..., { steps: 5 })` in the pan test
  raced `mouse.up` under parallel CI-style load (Playwright dispatching
  the up-event before the page processed the last move). Since the pan
  math is computed fresh from a fixed drag-start snapshot each event
  (not accumulated), stepping added no test value — removed it,
  confirmed stable across several full parallel runs.
