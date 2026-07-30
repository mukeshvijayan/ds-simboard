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

  // Rail holes get a real-breadboard tint (red-tinted positive rail,
  // dark-tinted negative rail) even unselected — a plain strip hole
  // stays neutral. Part 2's rail-labeling polish, matching a real
  // breadboard's own printed +/− stripe convention.
  const restBorder =
    hole.address.kind === "rail"
      ? hole.address.rail === "top-positive"
        ? "border-[#b23b3b]/50 hover:border-navy hover:bg-navy/10"
        : "border-charcoal/40 hover:border-navy hover:bg-navy/10"
      : "border-charcoal/25 hover:border-navy hover:bg-navy/10";

  return (
    <button
      type="button"
      onClick={() => onClick(hole)}
      aria-label={`Breadboard hole, ${label}`}
      aria-pressed={isSelected}
      className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white transition-colors focus-visible:z-10 ${
        isSelected ? "border-navy bg-navy ring-2 ring-navy ring-offset-1" : restBorder
      }`}
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
    />
  );
}
