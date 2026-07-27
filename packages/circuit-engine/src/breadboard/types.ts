/** The four continuous power rails running the full length of the board. */
export type RailId =
  "top-positive" | "top-negative" | "bottom-positive" | "bottom-negative";

/** The ten terminal-strip rows, five on each side of the center gap. */
export type StripRow = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j";

/** A hole in one of the four power rails. Rails have no notion of position:
 * per spec Part 2.1 a rail is one continuous node along its full length, so
 * every hole in a given rail resolves to the same electrical node. */
export interface RailHole {
  kind: "rail";
  rail: RailId;
}

/** A hole in the terminal-strip area, addressed by row letter and column. */
export interface StripHole {
  kind: "strip";
  row: StripRow;
  /** 1-indexed column number. */
  column: number;
}

/** A single physical hole on the breadboard, electrical purposes only —
 * this package models topology, not visual layout/pixel position. */
export type HoleAddress = RailHole | StripHole;

const UPPER_STRIP_ROWS = new Set<StripRow>(["a", "b", "c", "d", "e"]);

/** Which side of the center gap a terminal-strip row is on. Rows on
 * opposite sides of the same column are NOT electrically connected. */
export function stripSideOf(row: StripRow): "upper" | "lower" {
  return UPPER_STRIP_ROWS.has(row) ? "upper" : "lower";
}
