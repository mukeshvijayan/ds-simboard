# ADR 0034: Arduino Uno / ESP32 board artwork — real layout accuracy without trademarked branding

- **Date:** 2026-07-30
- **Status:** Accepted. Completes the SVG rollout for the two remaining
  component types (Arduino Uno, ESP32) that ADR 0033 deliberately
  deferred, folded together with Part 3's board-accuracy research so
  this is one real pass, not a rough one now and a second one later.

## Context

`ArduinoUno.tsx`/`ESP32.tsx` (kept from the retired Arduino/ESP32 Labs)
were plain schematic placeholders: a colored rectangle, a header row of
tick marks, and a text wordmark ("ARDUINO UNO R3" / "ESP32 DEVKIT") —
not researched against real board layout, and in the Uno's case
carrying the actual Arduino brand wordmark, which is out of scope to
reproduce.

## Decision

### Real layout, researched, original artwork

Both boards were rebuilt against real Uno R3 / ESP32 DevKit reference
photos for proportions, component placement, and pin layout — a
factual/technical reference, same as any other component in this
library, not a copy of any vendor's specific artwork. Real elements now
present: USB port, DC barrel jack, reset button, crystal oscillator,
ICSP header, and onboard ON/L/TX/RX indicator LEDs on the Uno; USB port,
EN/BOOT buttons, an RF-shielded module can with a printed antenna trace,
and an onboard status LED on the ESP32.

### No wordmark, no logo — a plain functional label instead

"ARDUINO UNO R3" (the actual brand wordmark) is replaced with "UNO," a
plain generic label — the board's functional name, not a reproduction of
Arduino's distinctive logotype or its infinity-symbol mark. "ESP32" on
the ESP32 board (and "ATmega328P" on the Uno) are kept as-is: these are
the chip's/module's own generic technical part numbers, printed on every
manufacturer's board that uses that part — factual identification, not
a brand mark to avoid, unlike "ARDUINO."

**Flagged rather than guessed:** Arduino's boards are closely associated
with a specific teal/turquoise PCB color, which has occasionally been
discussed as having some brand-identity weight beyond pure function.
The instruction driving this work explicitly named "color" alongside
layout as accurate reference material to research and match, which this
ADR treats as the relevant call already made — but it's worth recording
that this was a real, considered question, not an unexamined default:
teal/cyan solder mask is also a common, non-Arduino-specific PCB color
broadly associated with open-source hardware generally, unlike a single
enterprise's specific brand palette, which weighed toward treating it as
safe factual reference. The ESP32's black PCB carries no such question —
black is a generic, near-universal PCB color with no single-vendor
association.

### Real elements, kept legible, without silently expanding the electrical model

The Uno's full real power header (IOREF/RESET/3.3V/5V/GND/GND/VIN) and
AREF/GND-next-to-digital-header are drawn for visual/pedagogical
completeness per Part 4, but only 5V and GND are wired as actual
clickable connection points — matching `model/boardPins.ts`'s existing,
unexpanded electrical model. Turning every drawn silkscreen pin into a
real interactive one would be a much larger change (new board-pin
electrical roles, `boardBridge.ts`/`resolveCircuit.ts` wiring) than this
art-accuracy pass intends; that's future scope if/when it's actually
needed, not a side effect of making the artwork look right.

### A real bug, caught only by looking at the rendered result

Placing a pin's text label directly under its own clickable button
circle — same coordinates, since both were naively derived from "the
pin's position" — made the label invisible in practice: the button
(rendered after the artwork, so painted on top) visually swallowed its
own text whole. This hit precisely the pins most worth labeling (5V,
GND on the Uno; 3V3, GND on the ESP32 — the ones a student actually
clicks), while the _un_-clickable neighboring labels (IOREF, RESET,
etc., with no button drawn over them) were fine. Neither `tsc` nor any
existing test could have caught this — it's a paint-order/visual-overlap
property, invisible to a type checker and untested by the existing
suite. Caught only because the standing rule is to look at the actual
rendered result, not just green tests. Fixed by drawing each label
_above_ its tick (mirroring the pattern the digital header already used
successfully) rather than at the same coordinates as the interactive
button sitting on the tick itself.

### A second false alarm, also worth recording

Early screenshots appeared to show large parts of each board's own
artwork missing — pins, chip labels, buttons just not there. Real cause,
confirmed via direct SVG element inspection: nothing wrong with the
artwork at all. Both boards spawn at a fixed default canvas position
that sits close to the canvas viewport's own right edge (the canvas
container is `overflow-hidden`), so at a normal browser window width,
part of a freshly-added board's own bounding box already extends past
the visible canvas and gets clipped by that container — nothing to do
with the SVG. Confirmed by widening the test viewport (giving the canvas
more room) with no code changes: the "missing" content was there the
whole time. Recorded here since it cost real time to track down and is
exactly the kind of thing worth a paragraph so it isn't rediscovered.

## Consequences

- All sixteen component types (fourteen from ADR 0032/0033 plus these
  two boards) now render original hand-authored SVG artwork; no
  component in the currently-shipped library still uses a raw
  placeholder or a photo-based image.
- `model/boardPins.ts`'s Uno analog/power pin _button_ y-coordinates
  moved from `252` to `237` (Uno) — the tick position, not the label
  position — a deliberate, tested change (full e2e suite, including the
  GND-position-dependent Blink test, passes against the new position).
- The default board-spawn-position-near-the-canvas-edge behavior that
  caused the false-alarm clipping above is a pre-existing UX rough edge,
  not something this ADR's scope covers fixing — noted here as a
  candidate for Part 2's free-drag-and-drop work, which touches board
  placement directly.
