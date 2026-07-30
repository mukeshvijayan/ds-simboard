import type { PlacedBoard } from "./types";

/** What's being dragged from the palette onto the canvas — carried as
 * JSON in the native HTML5 drag event's `dataTransfer`, since that's
 * the only channel a drag-and-drop interaction has between the palette
 * (a different DOM subtree) and the canvas's drop handler. */
export type PaletteDragPayload =
  | { kind: "preset"; presetId: string }
  | { kind: "breadboard" }
  | { kind: "board"; boardType: PlacedBoard["boardType"] };
