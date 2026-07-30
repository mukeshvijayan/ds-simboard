import { holePosition } from "./layout";
import { COMPONENT_BOX_SIZE, componentPinPercent } from "./componentPinLayouts";
import { BOARD_PIN_LAYOUTS, BOARD_PIXEL_SIZE } from "./boardPins";
import type { ConnectionPointRef } from "./connectionPoint";
import type { PlacedBoard, PlacedBreadboard, PlacedComponent } from "./types";

export interface CanvasEntities {
  breadboards: PlacedBreadboard[];
  boards: PlacedBoard[];
  components: PlacedComponent[];
}

/**
 * Resolves any `ConnectionPointRef` to an absolute canvas-space pixel
 * position (Part 2, docs/architecture/0036-*.md) — the one thing every
 * placed item's own local rendering (percent-of-its-own-box) doesn't
 * give you, and exactly what a canvas-wide wire layer needs to draw a
 * line between two points that don't share a coordinate space (a
 * breadboard hole and a free-floating component's lead, say). A rail
 * hole has no single fixed column of its own (`model/layout.ts`'s
 * `resolveVisualColumn` — a rail is one electrical node regardless of
 * x-position), so `columnHint` (typically the *other* endpoint's own
 * column, when it has one) borrows a sensible one, same trick the old
 * per-breadboard wire drawing already used.
 */
export function connectionPointCanvasPosition(
  point: ConnectionPointRef,
  entities: CanvasEntities,
  columnHint = 1
): { x: number; y: number } {
  if (point.kind === "breadboardHole") {
    const bb = entities.breadboards.find((b) => b.id === point.boardItemId);
    if (!bb) return { x: 0, y: 0 };
    const visualColumn = point.hole.kind === "strip" ? point.hole.column : columnHint;
    const percent = holePosition({ address: point.hole, visualColumn }, bb.columns);
    return {
      x: bb.position.x + (percent.xPercent / 100) * bb.pixelWidth,
      y: bb.position.y + (percent.yPercent / 100) * bb.pixelHeight,
    };
  }
  if (point.kind === "boardPin") {
    const board = entities.boards.find((b) => b.id === point.boardItemId);
    if (!board) return { x: 0, y: 0 };
    const size = BOARD_PIXEL_SIZE[board.boardType];
    const pin = BOARD_PIN_LAYOUTS[board.boardType].find((p) => p.name === point.pinName);
    if (!pin) return { x: board.position.x, y: board.position.y };
    return {
      x: board.position.x + (pin.xPercent / 100) * size.width,
      y: board.position.y + (pin.yPercent / 100) * size.height,
    };
  }
  // componentLead
  const component = entities.components.find((c) => c.id === point.componentItemId);
  if (!component) return { x: 0, y: 0 };
  const percent = componentPinPercent(component.type, point.leadName);
  const box = COMPONENT_BOX_SIZE[component.type];
  return {
    x: component.position.x + (percent.xPercent / 100) * box.width,
    y: component.position.y + (percent.yPercent / 100) * box.height,
  };
}

/** Both ends of one wire/element, resolved together so a hole-to-hole
 * connection can still borrow each other's visual column (the same
 * trick `model/layout.ts`'s doc comment describes) even when the two
 * ends live on different breadboards, boards, or components. */
export function connectionPairCanvasPositions(
  a: ConnectionPointRef,
  b: ConnectionPointRef,
  entities: CanvasEntities
): { x1: number; y1: number; x2: number; y2: number } {
  const columnOf = (point: ConnectionPointRef): number | undefined =>
    point.kind === "breadboardHole" && point.hole.kind === "strip"
      ? point.hole.column
      : undefined;
  const hintForA = columnOf(b) ?? 1;
  const hintForB = columnOf(a) ?? 1;
  const posA = connectionPointCanvasPosition(a, entities, hintForA);
  const posB = connectionPointCanvasPosition(b, entities, hintForB);
  return { x1: posA.x, y1: posA.y, x2: posB.x, y2: posB.y };
}
