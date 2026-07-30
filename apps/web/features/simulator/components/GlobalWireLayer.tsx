"use client";

import {
  connectionPairCanvasPositions,
  type CanvasEntities,
} from "../model/canvasPositions";
import { wireColor } from "../model/wireColor";
import type { CanvasWireModel } from "../model/types";

/** The canvas's fixed logical size (Part 2, docs/architecture/
 * 0036-*.md) — every placed item's `position` lives in this same
 * pixel space, panned/zoomed as a whole by `CanvasSurface`'s transform,
 * not an infinite canvas. Generous headroom over the default single-
 * breadboard layout so a class's more elaborate builds have room. */
export const CANVAS_SIZE = { width: 2400, height: 1400 };

/**
 * Every user-drawn wire, in one canvas-wide absolute-positioned SVG
 * layer — replaces the old per-breadboard local wire rendering
 * (removed from `BreadboardGlyph.tsx`), since a wire now routinely
 * connects two points that don't share any single item's local
 * coordinate space (a breadboard hole to a free-floating component's
 * lead, a board pin to a hole on a different breadboard, etc.).
 * Color-coded by function (`model/wireColor.ts`) — black for ground,
 * red for a supply rail, amber for a plain signal connection, the same
 * convention a real kit's jumper wires follow.
 */
export function GlobalWireLayer({
  wires,
  entities,
  onRemoveWire,
}: {
  wires: CanvasWireModel[];
  entities: CanvasEntities;
  onRemoveWire: (id: string) => void;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={CANVAS_SIZE.width}
      height={CANVAS_SIZE.height}
      aria-hidden="true"
    >
      {wires.map((wire) => {
        const { x1, y1, x2, y2 } = connectionPairCanvasPositions(
          wire.from,
          wire.to,
          entities
        );
        const color = wireColor(wire.from, wire.to);
        return (
          <g key={wire.id}>
            {/* wide, invisible hit-target — a 2px line is too thin to
             * reliably click to remove */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="transparent"
              strokeWidth={12}
              style={{ pointerEvents: "auto", cursor: "pointer" }}
              onClick={() => onRemoveWire(wire.id)}
            />
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={2}
              style={{ pointerEvents: "none" }}
            />
          </g>
        );
      })}
    </svg>
  );
}
