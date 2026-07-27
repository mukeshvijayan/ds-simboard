"use client";

import { holePosition, type UIHoleRef } from "../model/layout";

export function Hole({
  hole,
  columns,
  isSelected,
  onClick,
}: {
  hole: UIHoleRef;
  columns: number;
  isSelected: boolean;
  onClick: (hole: UIHoleRef) => void;
}) {
  const { xPercent, yPercent } = holePosition(hole, columns);
  const label =
    hole.address.kind === "rail"
      ? `${hole.address.rail} rail`
      : `row ${hole.address.row}, column ${hole.address.column}`;

  return (
    <button
      type="button"
      onClick={() => onClick(hole)}
      aria-label={`Breadboard hole, ${label}`}
      aria-pressed={isSelected}
      className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors focus-visible:z-10 ${
        isSelected
          ? "border-navy bg-navy ring-2 ring-navy ring-offset-1"
          : "border-charcoal/25 bg-white hover:border-navy hover:bg-navy/10"
      }`}
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
    />
  );
}
