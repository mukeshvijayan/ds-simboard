import type { HoleAddress, RailId, StripRow } from "@ds-simboard/circuit-engine";

/**
 * A hole reference for rendering purposes: the real electrical
 * `HoleAddress` (from `circuit-engine`) plus a `visualColumn` — a purely
 * cosmetic position. `circuit-engine`'s `RailHole` deliberately carries no
 * column (a rail is one electrical node regardless of position, per spec
 * Part 2.1), but the UI still needs *some* x-position to draw a rail
 * connection at, since a real rail has many physically distinct holes that
 * are all the same electrical node. `visualColumn` is never sent to
 * `circuit-engine` or `resolveCircuit` — only `address` is.
 */
export interface UIHoleRef {
  address: HoleAddress;
  visualColumn: number;
}

const ROW_SLOT: Record<RailId | StripRow, number> = {
  "top-positive": 0,
  "top-negative": 1,
  a: 3,
  b: 4,
  c: 5,
  d: 6,
  e: 7,
  f: 9,
  g: 10,
  h: 11,
  i: 12,
  j: 13,
  // Bottom rails aren't rendered by this feature's UI yet (v1 only uses
  // the top rails as the circuit's supply — see docs/architecture/0006-*.md),
  // but RailId includes them, so they need a (currently unused) slot too.
  "bottom-positive": 15,
  "bottom-negative": 16,
};

export const TOTAL_ROW_SLOTS = 17;

/** Percentage-based position (0–100) for a hole, for absolute-positioned rendering. */
export function holePosition(
  ref: UIHoleRef,
  columns: number
): { xPercent: number; yPercent: number } {
  const rowKey = ref.address.kind === "rail" ? ref.address.rail : ref.address.row;
  const xPercent = ((ref.visualColumn - 0.5) / columns) * 100;
  const yPercent = (ROW_SLOT[rowKey] / (TOTAL_ROW_SLOTS - 1)) * 100;
  return { xPercent, yPercent };
}

/**
 * A `Wire`/`PlacedComponent` endpoint only ever stores a bare
 * `HoleAddress` (no column for rail holes — see the `UIHoleRef` doc
 * comment above). To render a connection line to a rail without adding
 * extra UI-only state to remember exactly which rail dot was clicked, its
 * visual column is instead borrowed from whichever column *the other end*
 * of the same wire/component is at — this always draws a clean, aligned
 * line and is electrically indistinguishable from any other point on the
 * same rail.
 */
export function resolveVisualColumn(address: HoleAddress, otherEnd: HoleAddress): number {
  if (address.kind === "strip") {
    return address.column;
  }
  return otherEnd.kind === "strip" ? otherEnd.column : 1;
}
