# ADR 0036: Free-floating component placement + explicit lead-to-lead wiring

- **Date:** 2026-07-30
- **Status:** Accepted for the core architecture (placement, per-lead
  wiring, dragging, wire auto-coloring, breadboard add). Palette
  grouping, expanded component catalog, and breadboard rail styling are
  deliberately separate follow-up work, not folded into this change.

## Context

Every component's position used to be _derived from_ the breadboard
holes its leads were placed into — there was no independent `position`
field, and placing a part meant clicking N holes in sequence (one per
lead), with the component's glyph centered at the average of those
holes' positions afterward. A validated prototype (`Simulator.dc.html`)
demonstrated a different, deliberately chosen model: components drop
anywhere on the open canvas as free-floating items with their own
position, and get wired to holes/pins/other components' leads via an
explicit second step — the same "Draw wire" mode already used for
hole-to-hole and pin-to-hole connections, just now able to target a
component's own lead too.

This is a genuine architecture fork, not a UI-only change, and was
confirmed with the user before starting: keep the hole-anchored model
(no risk, but doesn't match the validated prototype), or rebuild
around free placement + explicit wiring (matches the prototype exactly,
but touches the placement model, circuit-graph construction, every
component glyph, and the full e2e suite). The user chose the rebuild.

## Decision

### The existing `ConnectionPointRef` model already had the right shape

`model/connectionPoint.ts` already defined a `"componentLead"` kind
(`{kind: "componentLead", componentItemId, leadName}`) — forward-declared
by ADR 0024 for "a bare component lead, not snapped into a breadboard,"
but never actually reachable through the UI, and never produced by
`createComponent`. `buildCircuit.ts` was _already_ completely agnostic
to which kind of `ConnectionPointRef` it was building a graph node from
— it only ever calls `connectionPointId()` (a generic string id) and
resolves connectivity through the `wires` array — so the core electrical
graph-building logic needed **zero changes** to support this. This is
the single biggest reason this was tractable in one pass rather than a
much larger rewrite: the data model had already generalized past the
old hole-only assumption; only the _placement UI_ and _rendering_ had
not caught up to it yet.

### A component's leads are permanent self-references, not reassigned by wiring

`createComponent(presetId, position)` gives every lead a
**self-referencing** `componentLead` point
(`{kind: "componentLead", componentItemId: <this component's own id>, leadName}`)
at creation time, and this never changes for the component's lifetime —
matching a real component fresh out of a parts bin: it exists, at a
real position, before anything is connected to it. A wire's `from`/`to`
(already a generic `ConnectionPointRef`, `CanvasWireModel` unchanged)
is where the "this lead connects to that hole/pin/other lead" fact
actually lives, resolved through the _existing_ `resolveConnectivity`
union-find logic — not a property of the component itself. This means
`componentElements.ts`'s `componentGraphElements`/`componentLeadPoints`
(which just read `component.leads[0]`/`component.commonLead`/etc. as
opaque `ConnectionPointRef`s) needed **no changes at all**.

### Where a lead actually is: `model/componentPinLayouts.ts`

Every component glyph built for ADR 0032/0033 already exported a
`*_PIN_POSITIONS` constant — hand-placed pin coordinates in that glyph's
own SVG viewBox, originally described as "not consumed anywhere yet,
exported for future use." This is that future use: `componentPinLayouts.ts`
maps each `BreadboardComponentType` to its own rendered pixel box
(`COMPONENT_BOX_SIZE`) and its lead-name → local-pixel-position table
(reusing the existing `*_PIN_POSITIONS` exports directly, not a second
copy of the same coordinates), plus the canonical lead-name order per
type (`COMPONENT_LEAD_NAMES` — the same order `presetLeadNames`, now
removed, used to prompt for during the old click-sequence flow).

**A real, caught-during-verification bug this surfaced:** two glyphs
(`LedGlyph`, `SevenSegmentGlyph`) had a rendered `width`/`height` that
didn't match their own SVG viewBox's aspect ratio. That was invisible
before (nothing depended on the exact mapping between viewBox units and
rendered pixels), but converting a pin's viewBox position into a
percentage of the rendered box assumes a uniform scale — with a
mismatched aspect ratio, the browser's default `preserveAspectRatio`
letterboxes the content, and the naive percentage math lands the
invisible lead-click-target dot measurably off from the actual drawn
lead. Fixed by correcting both glyphs' default render dimensions to
match their viewBox aspect ratio exactly (`docs/architecture/0033-*.md`
already flagged a related but distinct bug in the same family — a
label's _position_, not a lead's).

### `model/canvasPositions.ts`: resolving any point to an absolute canvas pixel

A wire (or a global wire-rendering layer) needs to draw a line between
two points that may belong to _any_ combination of a breadboard hole, a
board pin, or a free-floating component's lead — items that no longer
share a single local coordinate space the way "every component lives
inside one breadboard" used to guarantee. `connectionPointCanvasPosition`
resolves any `ConnectionPointRef` to an absolute canvas-space pixel
position by finding the owning entity (breadboard/board/component) and
combining its own `position` with the point's percentage offset within
its own rendered box — the same percentage-based math `model/layout.ts`
and `model/boardPins.ts` already used locally, just now composed with
an entity's absolute position instead of assumed to be the only
coordinate space in play.

### The wire layer moved from per-breadboard-local to canvas-wide-global

`BreadboardGlyph.tsx` used to draw every wire and every component's own
internal lead-to-lead connection line in its own local percentage-space
SVG — correct only because every component used to live inside exactly
one breadboard's coordinate space. `GlobalWireLayer.tsx` (new) replaces
this with one absolute-positioned SVG spanning the whole canvas
(`CANVAS_SIZE`, a fixed logical size the canvas pans/zooms as a whole,
not an infinite canvas), drawing every wire via
`connectionPairCanvasPositions`. **A real bug caught during verification:**
the layer's own `<svg>` root, sized to cover the entire canvas, was
capturing clicks across its whole bounding box even where nothing was
drawn — confirmed via `document.elementFromPoint()` returning the `<svg>`
itself at a point with no visible wire — silently swallowing every
click-to-place and click-to-select interaction underneath it. Fixed
with `pointer-events: none` on the SVG root, keeping `pointer-events: auto`
on each individual wire's own click-to-remove hit-line (a child can
still opt back in to pointer events even when its parent has opted out).

### Wire auto-coloring by function

`model/wireColor.ts` derives a wire's color from what it actually
connects — black for a ground rail/pin, red for a supply rail/pin
(5V/3V3), amber for a plain signal connection — the same convention a
real kit's colored jumper wires follow, verified visually against a
real solved circuit (a rail-to-resistor wire renders red, resistor-to-
LED renders amber, LED-to-rail renders black).

### Dragging: a second real bug, general but only visible on small items

`Board`/`BreadboardGlyph`'s pre-existing drag pattern attaches
`onMouseMove`/`onMouseUp` to the dragged element itself, which only
keeps tracking the cursor _while the cursor stays over that element_.
For a board (320×200px) or breadboard (720×360px), an ordinary drag
distance rarely exits the element's own bounds, so this never
manifested. `ComponentGlyph`'s free-floating components are much
smaller (a resistor's whole box is 80×30px) — a completely normal drag
distance moves the cursor outside the box almost immediately, after
which no further `mousemove` reaches that element at all, and the drag
silently stalls partway. Caught by an e2e test that drags a resistor
100px and asserts on its exact landed position — first attempt landed
only ~20% of the intended distance away. Fixed with a shared
`useCanvasDrag` hook that attaches its listeners to `window` for the
duration of an active drag (the standard fix for this exact class of
bug), applied to all three draggable canvas items
(component/board/breadboard) for consistency, not just the one that
happened to fail a test.

### Breadboards: addable/removable, extending an already-multi-instance model

`breadboards` was already a plural array with full drag support (ADR 0024) — only a palette "+ Breadboard" button and a remove path were
missing. Both added following the exact same pattern boards already
established (`handleAddBreadboard`/`handleRemoveBreadboard`, mutual-
exclusive selection clearing).

### Native drag-and-drop, with click-then-click-canvas kept as the fallback

Every palette button (parts, breadboard, board-add) is now
`draggable`, carrying a JSON payload (`model/dragPayload.ts`) through
the browser's native HTML5 drag-and-drop `dataTransfer`, dropped via
`CanvasSurface`'s new `onDrop`. The existing click-a-preset-then-click-
the-canvas flow is kept as a deliberate fallback, not replaced — a
keyboard/non-mouse user can't perform a drag gesture at all.

## Consequences

- `PlacedComponent` (every variant) gained a `position: {x, y}` field;
  `BaseComponent`'s `leads` and the multi-lead types' individual lead
  fields are unchanged in _type_, just always self-referencing now.
- `CANVAS_SNAPSHOT_VERSION` bumped 1 → 2 — a version-1 saved project's
  components are missing `position` and use the old hole-based leads;
  loading one under the new model without a real migration would render
  broken rather than fail clearly, and this is pre-launch software with
  no real saved user data to migrate, so a clean version-mismatch error
  is the honest choice.
- `presetLeadNames` (the old "how many holes, prompted in what order"
  helper) is removed, superseded by `COMPONENT_LEAD_NAMES`.
- The full e2e suite was rewritten, not patched — every test's
  interaction sequence fundamentally changed from "click N holes in
  placement order" to "click-drop, then wire each lead separately."
  14/14 pass, including two new tests this architecture specifically
  needed (dragging a free-floating component; adding a breadboard from
  the palette).
- Deliberately **not** in this change: palette grouping for multi-
  variant parts (dropdown instead of one button per variant), the
  expanded component catalog from the prototype (diode variants, the
  wider digital-sensor family, servo, ultrasonic, 16×2 LCD), and
  breadboard rail visual styling (tinted holes, rail labels) — each is
  independent, additive work on top of this foundation, not required
  for it to function, and kept as separate follow-up commits so this
  architecture change could be verified and committed on its own first.
