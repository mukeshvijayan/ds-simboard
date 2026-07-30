"use client";

import type { HoleAddress, StripRow } from "@ds-simboard/circuit-engine";
import { type UIHoleRef } from "../model/layout";
import type { ConnectionPointRef } from "../model/connectionPoint";
import type { PlacedBreadboard } from "../model/types";
import { useCanvasDrag } from "../model/useCanvasDrag";
import { Hole } from "./Hole";
import { BreadboardArt } from "./glyphs/BreadboardArt";

const STRIP_ROWS_UPPER: StripRow[] = ["a", "b", "c", "d", "e"];
const STRIP_ROWS_LOWER: StripRow[] = ["f", "g", "h", "i", "j"];

function railHole(
  rail: "top-positive" | "top-negative",
  visualColumn: number
): UIHoleRef {
  return { address: { kind: "rail", rail }, visualColumn };
}

function stripHole(row: StripRow, column: number): UIHoleRef {
  return { address: { kind: "strip", row, column }, visualColumn: column };
}

function sameAddress(a: HoleAddress, b: HoleAddress): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "rail" && b.kind === "rail") return a.rail === b.rail;
  if (a.kind === "strip" && b.kind === "strip")
    return a.row === b.row && a.column === b.column;
  return false;
}

function holeOf(point: ConnectionPointRef): HoleAddress | null {
  return point.kind === "breadboardHole" ? point.hole : null;
}

/**
 * A single placed breadboard — a draggable canvas item (ADR 0024), not
 * the fixed backdrop it used to be. Just the board itself and its
 * holes now (Part 2, docs/architecture/0036-*.md): components used to
 * be rendered *inside* this component, in its own local percentage
 * space, because a component's position was derived from which of this
 * breadboard's holes its leads were placed into. Now every component is
 * a free-floating, independently-positioned sibling on the canvas (they
 * can be wired to holes on *any* breadboard, not just whichever one
 * they happened to render inside of), so `Simulator.tsx` renders them
 * at the top level instead, alongside boards and breadboards — and
 * draws every wire (including a component's own internal lead-to-lead
 * connection) in one canvas-wide global layer instead of this
 * breadboard's own local SVG, since a wire now routinely spans between
 * items this component has no coordinate space in common with.
 */
export function BreadboardGlyph({
  breadboard,
  pendingPoints,
  isSelected,
  viewportScale,
  onHoleClick,
  onPositionChange,
  onSelect,
}: {
  breadboard: PlacedBreadboard;
  pendingPoints: ConnectionPointRef[];
  isSelected: boolean;
  viewportScale: number;
  onHoleClick: (point: ConnectionPointRef) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onSelect: (id: string) => void;
}) {
  const { columns } = breadboard;
  const columnRange = Array.from({ length: columns }, (_, i) => i + 1);
  const drag = useCanvasDrag(breadboard.position, viewportScale, (position) =>
    onPositionChange(breadboard.id, position)
  );

  const pendingHoleAddresses = pendingPoints
    .map(holeOf)
    .filter((h): h is HoleAddress => h !== null);
  const isPending = (hole: HoleAddress) =>
    pendingHoleAddresses.some((pending) => sameAddress(pending, hole));

  function toConnectionPoint(uiHole: UIHoleRef): ConnectionPointRef {
    return { kind: "breadboardHole", boardItemId: breadboard.id, hole: uiHole.address };
  }

  function handleClick(event: React.MouseEvent) {
    if (event.target !== event.currentTarget) return; // a hole handles its own click
    onSelect(breadboard.id);
  }

  return (
    <div
      role="group"
      aria-label="Breadboard — drag to move"
      className={`absolute cursor-grab rounded-sm border border-hairline bg-ivory p-3 shadow-sm active:cursor-grabbing ${
        isSelected ? "ring-2 ring-navy ring-offset-1" : ""
      }`}
      style={{
        left: breadboard.position.x,
        top: breadboard.position.y,
        width: breadboard.pixelWidth,
        height: breadboard.pixelHeight,
      }}
      onMouseDown={drag.onMouseDown}
      onClick={handleClick}
    >
      <BreadboardArt columns={columns} />

      {columnRange.map((c) => (
        <Hole
          key={`p-${c}`}
          hole={railHole("top-positive", c)}
          columns={columns}
          isSelected={isPending(railHole("top-positive", c).address)}
          onClick={(hole) => onHoleClick(toConnectionPoint(hole))}
        />
      ))}
      {columnRange.map((c) => (
        <Hole
          key={`n-${c}`}
          hole={railHole("top-negative", c)}
          columns={columns}
          isSelected={isPending(railHole("top-negative", c).address)}
          onClick={(hole) => onHoleClick(toConnectionPoint(hole))}
        />
      ))}
      {STRIP_ROWS_UPPER.flatMap((row) =>
        columnRange.map((c) => (
          <Hole
            key={`${row}-${c}`}
            hole={stripHole(row, c)}
            columns={columns}
            isSelected={isPending(stripHole(row, c).address)}
            onClick={(hole) => onHoleClick(toConnectionPoint(hole))}
          />
        ))
      )}
      {STRIP_ROWS_LOWER.flatMap((row) =>
        columnRange.map((c) => (
          <Hole
            key={`${row}-${c}`}
            hole={stripHole(row, c)}
            columns={columns}
            isSelected={isPending(stripHole(row, c).address)}
            onClick={(hole) => onHoleClick(toConnectionPoint(hole))}
          />
        ))
      )}
    </div>
  );
}
