# ADR 0035: Context-aware right panel (+ verifying delete already clears it)

- **Date:** 2026-07-30
- **Status:** Accepted.

## Context

The right-side panel had two possible views (`BoardInspector` for a
selected board, `Inspector` for a selected component/nothing selected),
chosen by a simple `selectedBoardId ? <BoardInspector/> : <Inspector/>`.
There was no way to select a breadboard itself as a distinct entity —
clicking its background did nothing beyond potentially starting a drag —
so there was no way to see circuit-wide health/current information
without individually inspecting one component at a time.

Separately, the standing task list asked for a delete-behavior fix:
verify a removed component/board/breadboard's stale details never linger
in the panel after deletion.

## Decision

### Delete: verified already correct, no fix needed

Read `handleRemove`/`handleBoardRemove` in `Simulator.tsx` and confirmed
both already clear the matching selection id (`if (selectedComponentId
=== id) setSelectedComponentId(null)`, and the board equivalent) in the
same event handler that removes the item — then verified live (not just
by reading the code) with a Playwright script: place a component, select
it, click its Inspector's "Remove" button, confirm the panel falls back
to the "Select a component to see its details" placeholder immediately,
same for a board. Both passed on the first try. Breadboards have no
delete control at all yet (they're not addable/removable — only a
single fixed default breadboard exists today), so there's nothing to
verify there until that capability exists (Part 2 scope).

### Three-way selection, one priority order

A new `selectedBreadboardId` state joins the existing
`selectedComponentId`/`selectedBoardId`, kept as three separate
`useState<string | null>` values rather than refactored into one
discriminated-union selection type — lower-risk than restructuring
already-working state that a dozen call sites read/write directly, for
the same benefit.

**Mutual exclusivity, enforced at every selection site, not assumed:**
selecting a breadboard clears the other two; selecting a component
clears the other two; selecting a board clears the other two; clicking
the canvas background clears all three; loading a saved project (which
replaces every breadboard/component/board with a new set, invalidating
any old id) clears all three. There is deliberately no separate
"deselect" action distinct from "select something else" — a click always
lands on exactly one target (background, a hole/component's own button,
or a board/breadboard's own body), so there's exactly one state
transition to make per click, not a set of independent toggles that
could disagree.

**Render priority, for defensive clarity even though the states are
kept mutually exclusive:** breadboard → board → component/nothing, i.e.
`selectedBreadboardId ? <CircuitHealthPanel/> : selectedBoardId ?
<BoardInspector/> : <Inspector/>`. `Inspector` already handles both "a
component is selected" and "nothing is selected" internally (unchanged),
so nothing-selected doesn't need its own branch here.

### What each selection shows

- **Breadboard selected** → `CircuitHealthPanel` (new): every placed
  component's live health status (nominal/stressed/failed, color-coded)
  and failure reason if any, plus the resolved supply current once the
  circuit actually solves. This is the "zoom out and see the whole
  circuit" view — distinct from `StatusBanner` (one-line overall status,
  always shown in the toolbar regardless of what's selected) and from
  the per-component `Inspector` (one component's own detail).
- **Board selected** → `BoardInspector` (unchanged): the board's
  run/stop control and code editor (Arduino Uno's fixed demo picker, or
  ESP32's free-typed sketch).
- **Component selected** → `Inspector` (unchanged): that component's own
  value/pin-assignment/health detail, plus whatever live control it
  exposes (pushbutton press, potentiometer wiper, etc.).
- **Nothing selected** → `Inspector`'s existing placeholder text.

### Clicking a breadboard's own body vs. a hole/component on it

`BreadboardGlyph` already had a `handleMouseDown` guard
(`if (event.target !== event.currentTarget) return`) so dragging only
starts when the mousedown lands on the breadboard's own background, not
on a child hole/component button (those handle their own clicks and
don't stop propagation). The new selection click handler reuses the
exact same guard, so clicking a hole or a component glyph never
also selects the breadboard as a side effect — verified live: selecting
a component while the breadboard was already selected correctly swaps
the panel to `Inspector`, not both/neither.

## Consequences

- New file: `components/CircuitHealthPanel.tsx`.
- `BreadboardGlyph` gained `isSelected`/`onSelect` props and a selection
  ring (`ring-2 ring-navy`, matching every other selectable canvas
  item's existing convention).
- Verified live end-to-end, not just by reading the code: breadboard
  click → health panel; component click → inspector (health panel
  gone); board click → code editor; background click → default
  placeholder. All four transitions confirmed via Playwright against a
  real running build, plus the full existing e2e suite (12/12,
  including the breadboard-drag test, which also exercises the new
  click handler's guard) still green.
