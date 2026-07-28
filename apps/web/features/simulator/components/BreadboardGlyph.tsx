"use client";

import { useRef } from "react";
import type { HoleAddress, StripRow } from "@ds-simboard/circuit-engine";
import { holePosition, resolveVisualColumn, type UIHoleRef } from "../model/layout";
import type { ComponentResult } from "../model/resolveCircuit";
import type { CanvasWireModel, PlacedBreadboard, PlacedComponent } from "../model/types";
import type { ConnectionPointRef } from "../model/connectionPoint";
import { Hole } from "./Hole";
import { ComponentGlyph } from "./ComponentGlyph";

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
 * the fixed backdrop it used to be. Everything inside (holes, wires,
 * component glyphs) is positioned in the same percentage-based local
 * space Breadboard Lab already used (`model/layout.ts`, unchanged),
 * just rendered inside a fixed-pixel-size, canvas-positioned container
 * instead of a full-width page element.
 */
export function BreadboardGlyph({
  breadboard,
  components,
  wires,
  componentResults,
  pendingPoint,
  selectedComponentId,
  viewportScale,
  onHoleClick,
  onComponentClick,
  onPositionChange,
}: {
  breadboard: PlacedBreadboard;
  components: PlacedComponent[];
  wires: CanvasWireModel[];
  componentResults: Map<string, ComponentResult>;
  pendingPoint: ConnectionPointRef | null;
  selectedComponentId: string | null;
  viewportScale: number;
  onHoleClick: (point: ConnectionPointRef) => void;
  onComponentClick: (id: string) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
}) {
  const { columns } = breadboard;
  const columnRange = Array.from({ length: columns }, (_, i) => i + 1);
  const dragStart = useRef<{
    clientX: number;
    clientY: number;
    position: { x: number; y: number };
  } | null>(null);

  const pendingHoleAddress = pendingPoint ? holeOf(pendingPoint) : null;
  const isPending = (hole: HoleAddress) =>
    pendingHoleAddress !== null && sameAddress(pendingHoleAddress, hole);

  function toConnectionPoint(uiHole: UIHoleRef): ConnectionPointRef {
    return { kind: "breadboardHole", boardItemId: breadboard.id, hole: uiHole.address };
  }

  const lineFor = (a: HoleAddress, b: HoleAddress) => {
    const colA = resolveVisualColumn(a, b);
    const colB = resolveVisualColumn(b, a);
    const posA = holePosition({ address: a, visualColumn: colA }, columns);
    const posB = holePosition({ address: b, visualColumn: colB }, columns);
    return { x1: posA.xPercent, y1: posA.yPercent, x2: posB.xPercent, y2: posB.yPercent };
  };

  function handleMouseDown(event: React.MouseEvent) {
    if (event.target !== event.currentTarget) return; // a hole/component handles its own click
    event.stopPropagation(); // don't also start panning the whole canvas
    dragStart.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      position: breadboard.position,
    };
  }

  function handleMouseMove(event: React.MouseEvent) {
    if (!dragStart.current) return;
    event.stopPropagation();
    const dx = (event.clientX - dragStart.current.clientX) / viewportScale;
    const dy = (event.clientY - dragStart.current.clientY) / viewportScale;
    onPositionChange(breadboard.id, {
      x: dragStart.current.position.x + dx,
      y: dragStart.current.position.y + dy,
    });
  }

  function endDrag() {
    dragStart.current = null;
  }

  return (
    <div
      role="group"
      aria-label="Breadboard — drag to move"
      className="absolute cursor-grab rounded-sm border border-hairline bg-ivory p-3 shadow-sm active:cursor-grabbing"
      style={{
        left: breadboard.position.x,
        top: breadboard.position.y,
        width: breadboard.pixelWidth,
        height: breadboard.pixelHeight,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {wires.map((wire) => {
          const from = holeOf(wire.from);
          const to = holeOf(wire.to);
          if (!from || !to) return null;
          const { x1, y1, x2, y2 } = lineFor(from, to);
          return (
            <line
              key={wire.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#22314F"
              strokeWidth={0.4}
            />
          );
        })}
        {components.map((component) => {
          const from = holeOf(component.leads[0]);
          const to = holeOf(component.leads[1]);
          if (!from || !to) return null;
          const { x1, y1, x2, y2 } = lineFor(from, to);
          return (
            <line
              key={component.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(28,27,24,0.35)"
              strokeWidth={0.3}
            />
          );
        })}
      </svg>

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

      {components.map((component) => (
        <ComponentGlyph
          key={component.id}
          component={component}
          result={componentResults.get(component.id)}
          columns={columns}
          isSelected={selectedComponentId === component.id}
          onSelect={onComponentClick}
        />
      ))}
    </div>
  );
}
