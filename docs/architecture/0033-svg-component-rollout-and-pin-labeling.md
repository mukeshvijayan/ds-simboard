# ADR 0033: SVG artwork rollout to the remaining components, with universal pin labeling

- **Date:** 2026-07-29
- **Status:** Accepted for the twelve components covered here (diode,
  pushbutton, potentiometer, PIR motion sensor, soil moisture sensor,
  rain sensor, sound sensor, DHT11, RGB LED, 7-segment display,
  transistor, relay). Arduino Uno and ESP32 are deliberately deferred to
  a follow-up ADR that folds their SVG treatment together with real
  board-accuracy research, rather than doing a rough pass here and a
  second accurate pass later.

## Context

ADR 0032 piloted hand-authored SVG artwork for four components
(breadboard, LED, resistor, power supply) and was approved for rollout
to the rest of the already-shipped library, together with a new,
standing requirement: every component's functionally-distinct pins get
a visible label on the glyph itself, not only in the side Inspector
panel — the audience is grade 3-10 students, and a pin without a label
is a pin they can't learn from by looking at it.

## Decision

### Same pattern, twelve more components

Each of the twelve components gets its own `components/glyphs/*.tsx`
file, following ADR 0032's pattern exactly: hand-placed pin-position
constants, props-driven `fill`/`opacity`/`transform` for visual state, no
image files. `ComponentGlyph.tsx` grew a `wrap()` helper (the same
button/positioning JSX every branch needs) to avoid repeating it twelve
times.

### Labeling: legible in practice, not just present in the DOM

The labeling requirement surfaced a real, non-obvious bug during visual
verification (per the standing rule that automated tests don't judge
whether something actually looks right): the LED's newly-added "+"/"−"
labels and the transistor's "B"/"C"/"E" labels were technically present
in the rendered SVG but **invisible at normal screen resolution** — the
LED's for being sized far too small relative to its viewBox (confirmed
by rendering at 4x device-pixel-ratio, where the same markup became
legible), and the transistor's for a second, more basic reason: the text
was colored near-white and positioned over the light canvas background
rather than the component's dark body — invisible regardless of size.
Both are fixed: labels now use high-contrast, deliberately bold colors
appropriate to what's actually behind them, and font sizes are picked
relative to each glyph's own viewBox to render at a genuinely readable
screen size (confirmed with un-scaled screenshots at normal DPI, not
just zoomed-in crops).

### Enlarging a glyph's render box has a real cost: it can steal clicks

The first attempt at fixing legibility enlarged several glyphs' overall
width/height (more screen pixels for the same viewBox proportionally
means bigger text). For two-lead components (LED, diode, RGB LED, relay)
this was safe — confirmed by the full e2e suite still passing. For the
**transistor** specifically, it broke a real test: its 3-lead glyph is
positioned at the _average_ of leads that can be far apart (e.g. base
and collector on the breadboard strip, emitter on a distant supply rail
per the existing e2e scenario), so its glyph already sits over open
canvas space between them — enlarging the render box pushed its
invisible click-catching area over a neighboring breadboard hole and
silently intercepted a `click()` meant for that hole
(`element intercepts pointer events`, caught by the existing e2e suite,
not assumed away). The fix keeps the transistor's render footprint at
its original size and gets legibility purely from the color-contrast fix
plus a still-larger-but-footprint-neutral font size — proof that
"more visual space for labels" (the standing instruction) has to be
weighed against a real, testable cost on a densely-clickable canvas, not
applied uniformly without checking each component's actual layout
behavior.

### 7-segment display: one label, not nine

A 7-segment display has nine leads (common + seven segments + decimal
point). Labeling all nine individually at this glyph's scale would be
unreadable clutter, and unlike an unmarked transistor pin, a segment
lead's function _is_ self-evident once wired — connect "segment a," the
top bar lights, the mapping is learned experientially. The one pin that
genuinely isn't self-evident this way — the shared common leg, which
determines cathode-vs-anode wiring for the whole part — gets an explicit
"COM" label; the eight segment/dp leads don't.

### Relay: "COIL" spans a symmetric pair, "COM"/"NO" label distinct ones

A relay's two coil leads have no real polarity to distinguish (either
orientation energizes the coil identically), so one "COIL" label spans
both rather than repeating itself per-lead. Its two contact leads _are_
functionally distinct (common vs. normally-open) and each gets its own
label — initially placed close enough together to visually run into each
other ("COMNO"), caught in the same visual-verification pass and fixed
by widening the glyph and spacing the two labels further apart.

## Consequences

- All fourteen non-board component types now render original SVG
  artwork (the four from ADR 0032 plus these twelve); only the board
  types (Arduino Uno, ESP32) and four lower-priority types not in this
  rollout's scope (buzzer, DC motor, LDR, battery holder) still use the
  plain generic colored-box glyph.
- The "verify visually, not just via passing tests" discipline caught
  two real, otherwise-shipped-broken-and-unnoticed bugs (invisible LED/
  transistor labels; a transistor-glyph size regression that silently
  ate a board-adjacent click) that neither `tsc` nor the existing test
  suite would have caught on their own, since both are rendering/layout
  properties no type checker or unit test inspects.
- Arduino Uno and ESP32 SVG artwork is intentionally deferred to the
  next ADR, which does real-board-accuracy research (color, layout,
  pinout, trademark handling) once, rather than a placeholder pass here
  followed by a second real pass later.
