# ADR 0032: Hand-authored SVG component artwork, replacing photo-based imagery (P2-4b pilot)

- **Date:** 2026-07-29
- **Status:** Accepted for the pilot scope (breadboard, LED, resistor, power
  supply). Stopped after this pilot per standing instruction, awaiting
  review before extending to any other component.

## Context

P2-4 tried three photo-based approaches for component imagery, in order:
AI generation via Gemini (real quota=0), AI generation via Pollinations.ai
(model structurally can't render precise grids or small-component
anatomy), and a Pexels + `rembg` stock-photo pipeline (ADR 0031 — worked
mechanically, but found zero usable candidates for breadboard/LED and a
wrong-value/wrong-crop result for the resistor after genuine multi-query
search effort).

All three share the same root problem: they produce a _finished raster
image_ that this app then has to reverse-engineer pin coordinates out of
after the fact (a calibration step), and none of them can represent
per-instance visual state (an LED that's off vs. lit vs. burned, a
resistor whose bands must match its actual `resistanceOhms`) without
swapping between separate pre-rendered files. Per the final P2-4
decision, photo-based component imagery (AI-generated or stock-photo-
sourced) is retired for this project.

## Decision

Each component is authored as an SVG directly in its own React component
file — no image files, no generation, no external fetching. The approach
is modeled on [@wokwi/elements](https://github.com/wokwi/wokwi-elements)
(MIT-licensed): a few of its component source files (`led-element.ts`,
`resistor-element.ts`, `potentiometer-element.ts`, `pin.ts`) were read to
understand the shape of the pattern only — **none of its actual SVG
paths or artwork are reused anywhere in this codebase.** The pattern,
adapted from wokwi-elements' Lit web-components into this codebase's
plain React function components:

1. **Pin positions are plain data, written at authoring time.** Each
   glyph file exports a `*_PIN_POSITIONS` constant (e.g.
   `LED_PIN_POSITIONS`, `RESISTOR_PIN_POSITIONS`) giving each lead's exact
   `{x, y}` in the component's own SVG viewBox coordinates — known
   directly because that's where the lead is drawn, removing the
   calibration step a raster image would need entirely.
2. **Visual state drives SVG attributes directly, never a file swap.**
   `LedGlyph`'s `status` prop (`"off" | "lit" | "burned"`) and
   `brightness` prop change `fill`/`opacity` on the same markup;
   `ResistorGlyph`'s band colors are computed live from its
   `resistanceOhms` prop via `resistorBandColors()`
   (`model/resistorColorCode.ts`) rather than picked from a fixed set of
   pre-rendered images — correct for every ohm value, not just the four
   presets this app ships.
3. **Real electronic/physical accuracy, not decorative choices.** The
   resistor's bands use the real 4-band electronic color code
   (verified by hand against all four existing presets — 220Ω→red-red-
   brown-gold, 330Ω→orange-orange-brown-gold, 1kΩ→brown-black-red-gold,
   10kΩ→brown-black-orange-gold — before trusting the generic algorithm).
   The LED's anode lead is drawn longer than its cathode, and its flange
   has a flat edge on the cathode side — both real polarity markers on an
   actual 5mm LED, not stylistic flourishes.
4. **The breadboard backdrop reuses the app's existing coordinate
   system**, not a new one. `BreadboardArt.tsx` calls the same
   `holePosition()` function `model/layout.ts` already uses for every
   real, interactive `Hole` button, so its drawn rail stripes and hole
   dimples land at the exact same percentage coordinates as the buttons
   rendered on top of them — no new calibration needed since the
   coordinates were already shared.
5. **Components keep their real-world functional colors** (resistor tan
   body + colored bands, LED red dome, power-supply white plastic) even
   though the surrounding UI stays in the DS Inventek ivory/charcoal/navy
   system — the same real-vs-house-style split the rest of the simulator
   already draws between component glyphs and chrome.

### Files

- `model/resistorColorCode.ts` — pure `resistorBandColors(ohms)` band-
  color function, unit-tested (`model/resistorColorCode.test.ts`); lives
  under `model/` specifically so jest's `testMatch` picks it up, since
  `components/` is not unit-tested in this codebase (verified via e2e
  instead, per existing convention).
- `components/glyphs/ResistorGlyph.tsx`, `LedGlyph.tsx`,
  `PowerSupplyIcon.tsx`, `BreadboardArt.tsx` — the four pilot glyphs.
- `ComponentGlyph.tsx` — two new early-return branches for `led` and
  `resistor` component types render the new glyphs; every other
  component type is untouched and still renders the original generic
  colored-box glyph until the same treatment extends to it.
- `BreadboardGlyph.tsx` — renders `BreadboardArt` as a backdrop layer
  beneath the existing interactive holes/wires.
- `Simulator.tsx` — renders `PowerSupplyIcon` in the toolbar next to the
  live supply-voltage control.
- `e2e/simulator.spec.ts` — the two board-integration tests that polled
  the LED glyph's `backgroundColor` (the old colored-box style) now poll
  its SVG's `aria-label` instead (`"red LED, lit"`), since the SVG glyph
  has no `backgroundColor` at all — status is legible from the
  accessible name of the drawn artwork itself.

## Alternatives considered

- **Keep the stock-photo pipeline and pre-crop/retry** — rejected per the
  explicit retirement decision; photo-based imagery of any kind (AI or
  stock) is out of scope for this project going forward, not just this
  pilot.
- **A shared generic `<ComponentGlyph>` SVG with per-type path variants**
  — rejected in favor of one file per component type, matching
  wokwi-elements' one-file-per-element granularity and keeping each
  component's pin data colocated with the artwork it describes.

## Consequences

- Four components (breadboard, LED, 220Ω resistor, power supply) now
  render original hand-authored SVG artwork instead of a plain colored
  box; every other already-shipped component (transistor, diode,
  pushbutton, potentiometer, PIR, DHT11, RGB LED, 7-segment, relay,
  Arduino Uno, ESP32) still uses the old generic glyph until this
  treatment is explicitly extended to it — a decision this ADR
  deliberately leaves to a future, separate pass per the pilot's scope.
- No new dependency, no external fetch, no calibration step, no image
  asset pipeline of any kind — pin coordinates and visual state live
  entirely in source alongside the artwork they describe.
- P2-4 (photo-based imagery) is now formally superseded by this ADR;
  `scripts/component-images/`, `docs/architecture/0031-*.md`, and the
  manifest remain in the repo unchanged as a documented record of what
  was tried and why it didn't scale — not deleted, not extended further.
