import type { HoleAddress } from "@ds-simboard/circuit-engine";

/**
 * Any wireable point on the unified canvas — a breadboard hole, a bare
 * component lead (for a part placed directly on the open canvas, not
 * snapped into a breadboard), or a board pin (Arduino/ESP32, P2-3). See
 * docs/architecture/0024-*.md: this supersedes the old
 * `HoleAddress`-only wiring model, where every wireable thing had to be
 * a hole on one specific breadboard.
 */
export type ConnectionPointRef =
  | { kind: "breadboardHole"; boardItemId: string; hole: HoleAddress }
  | { kind: "componentLead"; componentItemId: string; leadName: string }
  | { kind: "boardPin"; boardItemId: string; pinName: string };

function holeKey(hole: HoleAddress): string {
  return hole.kind === "rail" ? `rail:${hole.rail}` : `strip:${hole.row}:${hole.column}`;
}

/** A stable, globally-unique id for a connection point — used as wire
 * endpoints and as the key identifying "this exact physical point,"
 * independent of whatever electrical node it currently resolves to. */
export function connectionPointId(ref: ConnectionPointRef): string {
  switch (ref.kind) {
    case "breadboardHole":
      return `breadboard:${ref.boardItemId}:${holeKey(ref.hole)}`;
    case "componentLead":
      return `lead:${ref.componentItemId}:${ref.leadName}`;
    case "boardPin":
      return `pin:${ref.boardItemId}:${ref.pinName}`;
  }
}
