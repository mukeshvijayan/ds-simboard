import type { ConnectionPointRef } from "./connectionPoint";

/**
 * What the canvas is currently doing (Part 2, docs/architecture/
 * 0036-*.md — supersedes the old click-a-sequence-of-holes placement
 * flow this replaced).
 *
 * `"placingFree"`: a palette preset is "armed" — the next click
 * anywhere on the open canvas drops one new, fully free-floating
 * instance of it there, both leads unwired (matches a real component
 * fresh out of a parts bin: it exists, but nothing has wired it to
 * anything yet). The same preset can also be dragged from the palette
 * straight onto the canvas (native HTML5 drag-and-drop) — this mode is
 * the click-then-click-canvas *fallback* for that, not a replacement,
 * since a keyboard/non-mouse user can't perform a drag.
 *
 * `"wiring"`: click any two connection points — a breadboard hole, a
 * board pin, or (new) a placed component's own lead, in any
 * combination — to connect them with a wire. Unchanged in spirit from
 * before; the only change is that a component's lead is now itself a
 * clickable point, alongside holes and pins, rather than something
 * only *defined* by which hole it was placed into.
 */
export type InteractionMode =
  | { kind: "idle" }
  | { kind: "placingFree"; presetId: string }
  | { kind: "wiring"; firstPoint?: ConnectionPointRef };
