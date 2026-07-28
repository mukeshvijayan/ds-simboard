# ADR 0024: Unified canvas — viewport, generalized connection points, route collapse

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

Phase 2 collapses Breadboard Lab, Arduino Lab, and ESP32 Lab into one
simulator route with an open, pannable/zoomable canvas where the
breadboard is a draggable item like any other, and wiring generalizes
from "hole to hole" to "any connection point to any connection point"
(a breadboard hole, a bare component lead, or a board pin).

**A repo-wide search turned up no trace of a previously-scoped
"breadboard-canvas pilot"** — no ADR, doc, git branch, stash, or scratch
file references one. If that work happened, it isn't in this
repository in any form. This ADR proceeds from the current message's
own detailed spec, which is self-contained and sufficient to build from;
flagging the discrepancy here rather than silently pretending prior
context exists.

Three things already exist and matter for this design:

- **`/simulator`** (`app/simulator/page.tsx`) is a separate, older,
  unlinked route with generic drag-and-drop component placement
  (`components/simulator/BoardCanvas.tsx` — native HTML5 DnD to add
  parts, manual pointer tracking to reposition them, percentage-of-
  container coordinates) onto a single fixed Uno/ESP32 board image, with
  a per-part `<select>` for pin assignment. No breadboard, no wiring
  between parts, no pan/zoom. This route is retired by this ADR — its
  drag-and-drop _pattern_ (not its code) informs the new canvas.
- **Breadboard Lab's connection model is hardcoded to breadboard holes.**
  `PlacedComponent.leads: [HoleAddress, HoleAddress]` and
  `Wire.{from,to}: HoleAddress` — every wireable thing must be a hole on
  one specific breadboard. `model/circuitGraph.ts` builds a `Breadboard`
  (hole→node union-find via wires) then a `CircuitGraph` from it.
- **ADR 0014 rejected a mobile wiring canvas outright** ("fine-motor
  wiring... doesn't work well with a fingertip") — this remains true for
  a pannable/zoomable canvas with even finer-grained interaction, so the
  unified canvas stays desktop-only, same as today's three labs
  (`DesktopOnlyNotice`).

## Decision

### 1. Viewport: hand-rolled pan/zoom, no new dependency

A `useCanvasViewport` hook holds `{ translateX, translateY, scale }` and
exposes pure coordinate transforms (`screenToCanvas`, `canvasToScreen`).
Panning is click-drag on empty canvas background; zooming is the mouse
wheel, centered on the cursor position (scale changes without the point
under the cursor visibly moving) and clamped to a sane range (e.g.
0.25×–3×). Desktop-only (mouse + wheel; no pinch/touch gesture handling),
consistent with ADR 0014's existing scope boundary. Hand-rolled rather
than a library (`react-zoom-pan-pinch`, `d3-zoom`, etc.) because the
actual requirement is simple (no pinch, no rotation, no inertia) and this
codebase's existing interaction code (`BoardCanvas.tsx`'s manual pointer
tracking) already establishes hand-rolled-over-dependency as the house
style — but the coordinate math itself gets full unit test coverage
(screen↔canvas round-trips, zoom-to-cursor invariant, clamping) precisely
_because_ pan/zoom transform bugs are a classic, easy-to-get-subtly-wrong
source of UI defects, and "well-trodden but still needs real tests" is
the same standard A-Engine's own math held itself to.

### 2. Generalized connection points supersede `HoleAddress`-only wiring

A new `ConnectionPoint` concept: `{ id: string; canvasX: number; canvasY:
number }`. Three sources of connection points, all producing the same
shape:

- **Breadboard holes** — `` `breadboard:${boardItemId}:${row}:${column}` ``
  or `` `breadboard:${boardItemId}:rail:${railId}` ``; canvas coordinates
  = the breadboard item's own canvas position + the existing percentage-
  based `holePosition()` math (`model/layout.ts`, unchanged) scaled into
  the breadboard's rendered size.
- **Bare component leads** — `` `lead:${componentItemId}:${leadName}` ``
  for a component placed directly on the open canvas, not snapped into a
  breadboard. Canvas coordinates = the component's own canvas position +
  a small fixed per-lead offset the component's glyph defines.
- **Board pins** — `` `pin:${boardItemId}:${pinName}` `` for a placed
  Arduino/ESP32 (P2-3) — same shape, coordinates from the board's own
  static pin layout.

**Electrical node resolution generalizes accordingly**: a canvas-level
`resolveConnectivity` builds one `UnionFind` (`circuit-engine`, already
generic over string keys — unchanged) seeded with (a) each breadboard
item's _internal_ strip-row/rail connectivity (the same fact
`Breadboard` already encodes, re-expressed as connection-point unions
rather than hole-address unions) and (b) every user-drawn wire, now
between any two `ConnectionPoint` ids rather than only `HoleAddress`
pairs. This lives entirely in `apps/web` (a generalization of
`model/circuitGraph.ts`'s existing bridge) — **no change to
`circuit-engine`** (`UnionFind`/`CircuitGraph`/the MNA solver are already
fully agnostic to what a node id "means").

A breadboard becomes **one canvas item among many** (its own `x`/`y` on
the canvas, draggable like everything else) instead of the fixed
backdrop the whole feature was built around — components can be placed
either _on_ a breadboard (their leads resolve to that breadboard's hole
connection points) or directly on the open canvas with their own bare-
lead connection points, for boards/parts that were never meant to plug
into strip rows in the first place (an Arduino Uno doesn't have "holes").

### 3. Route collapse

- `/simulator` becomes the one unified canvas route (reusing the path,
  replacing its old content — not adding a fourth route next to it).
- `/breadboard-lab`, `/arduino-lab`, `/esp32-lab` are deleted and
  redirect (not 404) to `/simulator`, for anyone with an old bookmark or
  external link — "don't leave dead routes around" means resolving them
  usefully, not erasing them into a broken link.
- Site nav (`components/landing/Header.tsx`) becomes exactly: Home, Docs,
  Open Simulator.
- A new `/docs` route: a plain-language "how to use the simulator" page
  for the grades 3–10 audience.

### 4. What's preserved unchanged

`circuit-engine` (MNA/diode solver), `component-library` (every
`ElectricalModel`/`evaluate*`/`*SeriesElement` function),
`resolveCircuit.ts`'s per-tick evaluate logic, and `model/layout.ts`'s
percentage-based hole math are **all reused as-is** — this phase changes
how connection points are discovered and how the canvas is navigated, not
the physics or the per-component electrical evaluation, which A-Engine
already made general-topology-correct.

## Alternatives considered

- **A pan/zoom library** (`react-zoom-pan-pinch`, `d3-zoom`) — rejected
  per decision 1: no real need this project has (pinch, inertia,
  rotation) that a library earns its dependency weight for, given the
  desktop-only, mouse+wheel-only actual requirement.
- **Keep `HoleAddress` as the only connection-point shape and give
  non-breadboard parts a synthetic fake breadboard hole** — rejected:
  would misrepresent what a bare component lead or board pin _is_
  (spec Part 1's "derive every visual from what's real" standard extends
  to the data model, not just the physics), and would leave the
  multi-lead/N-terminal question (ADR 0022) solved by a hack rather than
  a real generalization.
- **A fourth route alongside the existing `/simulator`** instead of
  replacing it — rejected: the goal is one simulator destination, and
  the old route's content becomes fully redundant once the unified
  canvas exists; keeping both would leave two things claiming to be "the
  simulator."

## Consequences

- This is the foundation P2-2 (multi-lead components), P2-3 (boards as
  real components), and P2-5 (save/load) all build on directly — get the
  `ConnectionPoint`/canvas-item model right here or every later sub-phase
  inherits the cost of a wrong abstraction.
- `apps/web/components/simulator/*` (the old `/simulator` route's
  `BoardCanvas`/`ComponentPalette`/board SVGs) and `lib/simulation/*`
  (`SketchEngine`, `BOARDS`) are not deleted in this sub-phase — `SketchEngine`
  is still the real interpreter P2-3 bridges into the circuit graph, and
  the static board SVGs are reused as the new canvas's board glyphs. Only
  the old route's _page_/`BoardCanvas`-as-the-whole-UI is retired.
- A future phase that wants touch/mobile support would need to revisit
  ADR 0014's scope boundary before revisiting this one's desktop-only
  pan/zoom choice — noted here so that's a deliberate future decision,
  not a discovered gap.
