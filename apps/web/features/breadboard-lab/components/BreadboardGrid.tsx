"use client";

import type { StripRow } from "@ds-simboard/circuit-engine";
import { holePosition, resolveVisualColumn, type UIHoleRef } from "../model/layout";
import type { ComponentResult } from "../model/resolveCircuit";
import type { PlacedComponent, Wire } from "../model/types";
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

function sameAddress(a: UIHoleRef["address"], b: UIHoleRef["address"]): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "rail" && b.kind === "rail") return a.rail === b.rail;
  if (a.kind === "strip" && b.kind === "strip")
    return a.row === b.row && a.column === b.column;
  return false;
}

export function BreadboardGrid({
  columns,
  components,
  wires,
  componentResults,
  pendingHole,
  selectedComponentId,
  onHoleClick,
  onComponentClick,
}: {
  columns: number;
  components: PlacedComponent[];
  wires: Wire[];
  componentResults: Map<string, ComponentResult>;
  pendingHole: UIHoleRef | null;
  selectedComponentId: string | null;
  onHoleClick: (hole: UIHoleRef) => void;
  onComponentClick: (id: string) => void;
}) {
  const columnRange = Array.from({ length: columns }, (_, i) => i + 1);
  const isPending = (hole: UIHoleRef) =>
    pendingHole !== null && sameAddress(pendingHole.address, hole.address);

  const lineFor = (a: UIHoleRef["address"], b: UIHoleRef["address"]) => {
    const colA = resolveVisualColumn(a, b);
    const colB = resolveVisualColumn(b, a);
    const posA = holePosition({ address: a, visualColumn: colA }, columns);
    const posB = holePosition({ address: b, visualColumn: colB }, columns);
    return { x1: posA.xPercent, y1: posA.yPercent, x2: posB.xPercent, y2: posB.yPercent };
  };

  return (
    <div className="relative aspect-[2/1] w-full rounded-sm border border-hairline bg-ivory p-3">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {wires.map((wire) => {
          const { x1, y1, x2, y2 } = lineFor(wire.from, wire.to);
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
          const { x1, y1, x2, y2 } = lineFor(component.leads[0], component.leads[1]);
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
          isSelected={isPending(railHole("top-positive", c))}
          onClick={onHoleClick}
        />
      ))}
      {columnRange.map((c) => (
        <Hole
          key={`n-${c}`}
          hole={railHole("top-negative", c)}
          columns={columns}
          isSelected={isPending(railHole("top-negative", c))}
          onClick={onHoleClick}
        />
      ))}
      {STRIP_ROWS_UPPER.flatMap((row) =>
        columnRange.map((c) => (
          <Hole
            key={`${row}-${c}`}
            hole={stripHole(row, c)}
            columns={columns}
            isSelected={isPending(stripHole(row, c))}
            onClick={onHoleClick}
          />
        ))
      )}
      {STRIP_ROWS_LOWER.flatMap((row) =>
        columnRange.map((c) => (
          <Hole
            key={`${row}-${c}`}
            hole={stripHole(row, c)}
            columns={columns}
            isSelected={isPending(stripHole(row, c))}
            onClick={onHoleClick}
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
