"use client";

import { holePosition, resolveVisualColumn } from "../model/layout";
import type { ComponentResult } from "../model/resolveCircuit";
import type { LedColor } from "@ds-simboard/component-library";
import type { PlacedComponent } from "../model/types";
import { PART_LABELS } from "../constants";

const LED_LIT_COLORS: Record<LedColor, string> = {
  red: "#D64545",
  green: "#4CAF6D",
  blue: "#3B6FD6",
  yellow: "#F4C542",
  white: "#F4F1E8",
};

function glyphColor(
  component: PlacedComponent,
  result: ComponentResult | undefined
): string {
  if (result?.health.status === "failed") return "#8a3b3b";
  if (result?.health.status === "stressed") return "#b8862f";

  if (component.type === "led" && result) {
    const brightness = (result.visual as { brightness?: number }).brightness ?? 0;
    return brightness > 0 ? LED_LIT_COLORS[component.params.color] : "#A7A59D";
  }
  if (component.type === "buzzer" && result) {
    const isBuzzing = (result.visual as { isBuzzing?: boolean }).isBuzzing ?? false;
    return isBuzzing ? "#8A6FC0" : "#6B4FA0";
  }
  if (component.type === "dcMotor" && result) {
    const speedFraction =
      (result.visual as { speedFraction?: number }).speedFraction ?? 0;
    return speedFraction > 0 ? "#3FA6A6" : "#2E7373";
  }
  if (component.type === "ldr") {
    // Brighter simulated light -> a lighter, more yellow glyph.
    const lightLevel = component.lightLevel;
    return lightLevel > 0.5 ? "#C9A63B" : "#6B6350";
  }
  if (component.type === "batteryHolder") {
    return "#2F6E4F";
  }
  return "#3B4C70";
}

export function ComponentGlyph({
  component,
  result,
  columns,
  isSelected,
  onSelect,
}: {
  component: PlacedComponent;
  result: ComponentResult | undefined;
  columns: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [leadA, leadB] = component.leads;
  const colA = resolveVisualColumn(leadA, leadB);
  const colB = resolveVisualColumn(leadB, leadA);
  const posA = holePosition({ address: leadA, visualColumn: colA }, columns);
  const posB = holePosition({ address: leadB, visualColumn: colB }, columns);
  const midX = (posA.xPercent + posB.xPercent) / 2;
  const midY = (posA.yPercent + posB.yPercent) / 2;
  const color = glyphColor(component, result);
  const failed = result?.health.status === "failed";

  return (
    <button
      type="button"
      onClick={() => onSelect(component.id)}
      aria-label={`${PART_LABELS[component.type]} ${component.id}${failed ? ", failed" : ""}`}
      className={`absolute flex h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border px-1 text-[9px] font-medium text-ivory shadow-sm transition-transform hover:scale-105 ${
        isSelected ? "ring-2 ring-navy ring-offset-1" : ""
      }`}
      style={{
        left: `${midX}%`,
        top: `${midY}%`,
        backgroundColor: color,
        borderColor: "rgba(28,27,24,0.3)",
      }}
    >
      {PART_LABELS[component.type]}
    </button>
  );
}
