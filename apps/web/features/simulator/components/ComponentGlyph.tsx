"use client";

import type { HoleAddress } from "@ds-simboard/circuit-engine";
import { holePosition, resolveVisualColumn } from "../model/layout";
import { overallHealthStatus, type ComponentResult } from "../model/resolveCircuit";
import { componentLeadPoints } from "../model/componentElements";
import type { LedColor } from "@ds-simboard/component-library";
import type { ConnectionPointRef } from "../model/connectionPoint";
import type { PlacedComponent } from "../model/types";
import { PART_LABELS } from "../constants";
import { LedGlyph, type LedVisualStatus } from "./glyphs/LedGlyph";
import { ResistorGlyph } from "./glyphs/ResistorGlyph";

const LED_LIT_COLORS: Record<LedColor, string> = {
  red: "#D64545",
  green: "#4CAF6D",
  blue: "#3B6FD6",
  yellow: "#F4C542",
  white: "#F4F1E8",
};

/** This canvas slice only renders components whose leads are breadboard
 * holes (P2-1's scope, per ADR 0024) — bare/freestanding leads get their
 * own glyph rendering once P2-3 needs it. */
function holeOf(point: ConnectionPointRef): HoleAddress | null {
  return point.kind === "breadboardHole" ? point.hole : null;
}

function glyphColor(
  component: PlacedComponent,
  result: ComponentResult | undefined
): string {
  const status = result ? overallHealthStatus(result.health) : "nominal";
  if (status === "failed") return "#8a3b3b";
  if (status === "stressed") return "#b8862f";

  if (component.type === "led" && result) {
    const brightness = (result.visual as { brightness?: number }).brightness ?? 0;
    return brightness > 0 ? LED_LIT_COLORS[component.params.color] : "#A7A59D";
  }
  if (component.type === "rgbLed" && result) {
    const visual = result.visual as {
      red: { visual: { brightness: number } };
      green: { visual: { brightness: number } };
      blue: { visual: { brightness: number } };
    };
    const r = Math.round(visual.red.visual.brightness * 255);
    const g = Math.round(visual.green.visual.brightness * 255);
    const b = Math.round(visual.blue.visual.brightness * 255);
    return r + g + b > 0 ? `rgb(${r}, ${g}, ${b})` : "#A7A59D";
  }
  if (component.type === "sevenSegmentDisplay" && result) {
    const visual = result.visual as {
      segments: Record<string, { visual: { brightness: number } }>;
    };
    const anyLit = Object.values(visual.segments).some((s) => s.visual.brightness > 0);
    return anyLit ? "#D64545" : "#A7A59D";
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
    const lightLevel = component.lightLevel;
    return lightLevel > 0.5 ? "#C9A63B" : "#6B6350";
  }
  if (component.type === "batteryHolder") {
    return "#2F6E4F";
  }
  if (component.type === "motionSensor") {
    return component.motionDetected ? "#C9A63B" : "#6B6350";
  }
  if (component.type === "soilMoistureSensor") {
    return component.wetness > 0.5 ? "#3B6FD6" : "#8A7A5C";
  }
  if (component.type === "rainSensor") {
    return component.rainLevel > 0.5 ? "#3B6FD6" : "#8A7A5C";
  }
  if (component.type === "soundSensor") {
    return component.loudness > 0.5 ? "#C9A63B" : "#6B6350";
  }
  if (component.type === "dht11") {
    return "#4C7A8A";
  }
  if (component.type === "transistor" && result) {
    const isOn = (result.visual as { isOn?: boolean }).isOn ?? false;
    return isOn ? "#3FA6A6" : "#3B4C70";
  }
  if (component.type === "relay" && result) {
    const isClosed = (result.visual as { contact: { visual: { isClosed: boolean } } })
      .contact.visual.isClosed;
    return isClosed ? "#3FA6A6" : "#3B4C70";
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
  const holes = componentLeadPoints(component)
    .map(holeOf)
    .filter((hole): hole is HoleAddress => hole !== null);
  const others = holes.slice(1);
  const positions = holes.map((hole, index) => {
    const other = others[index] ?? others[0] ?? hole;
    const col = resolveVisualColumn(hole, other);
    return holePosition({ address: hole, visualColumn: col }, columns);
  });
  const midX = positions.reduce((sum, p) => sum + p.xPercent, 0) / positions.length;
  const midY = positions.reduce((sum, p) => sum + p.yPercent, 0) / positions.length;
  const color = glyphColor(component, result);
  const status = result ? overallHealthStatus(result.health) : "nominal";
  const failed = status === "failed";

  // Hand-authored SVG artwork (P2-4b, closing ADR 0031/0032) — only LED
  // and resistor so far; every other type keeps the plain colored-box
  // rendering until the same treatment extends to it.
  if (component.type === "led") {
    const brightness = (result?.visual as { brightness?: number })?.brightness ?? 0;
    const ledStatus: LedVisualStatus = failed ? "burned" : brightness > 0 ? "lit" : "off";
    return (
      <button
        type="button"
        onClick={() => onSelect(component.id)}
        aria-label={`${PART_LABELS[component.type]} ${component.id}${failed ? ", failed" : ""}`}
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-sm transition-transform hover:scale-105 ${
          isSelected ? "ring-2 ring-navy ring-offset-1" : ""
        }`}
        style={{ left: `${midX}%`, top: `${midY}%` }}
      >
        <LedGlyph
          color={component.params.color}
          status={ledStatus}
          brightness={brightness}
        />
      </button>
    );
  }
  if (component.type === "resistor") {
    return (
      <button
        type="button"
        onClick={() => onSelect(component.id)}
        aria-label={`${PART_LABELS[component.type]} ${component.id}${failed ? ", failed" : ""}`}
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-sm transition-transform hover:scale-105 ${
          isSelected ? "ring-2 ring-navy ring-offset-1" : ""
        }`}
        style={{ left: `${midX}%`, top: `${midY}%` }}
      >
        <ResistorGlyph resistanceOhms={component.params.resistanceOhms} />
      </button>
    );
  }

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
