"use client";

import type { ReactNode } from "react";
import type { HoleAddress } from "@ds-simboard/circuit-engine";
import { holePosition, resolveVisualColumn } from "../model/layout";
import { overallHealthStatus, type ComponentResult } from "../model/resolveCircuit";
import { componentLeadPoints } from "../model/componentElements";
import type { ConnectionPointRef } from "../model/connectionPoint";
import { SEVEN_SEGMENT_NAMES, type PlacedComponent } from "../model/types";
import { PART_LABELS } from "../constants";
import { LedGlyph, type LedVisualStatus } from "./glyphs/LedGlyph";
import { ResistorGlyph } from "./glyphs/ResistorGlyph";
import { TransistorGlyph } from "./glyphs/TransistorGlyph";
import { DiodeGlyph } from "./glyphs/DiodeGlyph";
import { PushbuttonGlyph } from "./glyphs/PushbuttonGlyph";
import { PotentiometerGlyph } from "./glyphs/PotentiometerGlyph";
import { PirGlyph } from "./glyphs/PirGlyph";
import { SoilMoistureGlyph } from "./glyphs/SoilMoistureGlyph";
import { RainSensorGlyph } from "./glyphs/RainSensorGlyph";
import { SoundSensorGlyph } from "./glyphs/SoundSensorGlyph";
import { Dht11Glyph } from "./glyphs/Dht11Glyph";
import { RgbLedGlyph } from "./glyphs/RgbLedGlyph";
import { SevenSegmentGlyph } from "./glyphs/SevenSegmentGlyph";
import { RelayGlyph } from "./glyphs/RelayGlyph";

/** This canvas slice only renders components whose leads are breadboard
 * holes (P2-1's scope, per ADR 0024) — bare/freestanding leads get their
 * own glyph rendering once P2-3 needs it. */
function holeOf(point: ConnectionPointRef): HoleAddress | null {
  return point.kind === "breadboardHole" ? point.hole : null;
}

/** Only the few types not yet given hand-authored SVG artwork fall
 * through to this plain colored-box glyph (buzzer, DC motor, LDR,
 * battery holder) — everything else has its own glyph below. */
function glyphColor(
  component: PlacedComponent,
  result: ComponentResult | undefined
): string {
  const status = result ? overallHealthStatus(result.health) : "nominal";
  if (status === "failed") return "#8a3b3b";
  if (status === "stressed") return "#b8862f";

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
  const status = result ? overallHealthStatus(result.health) : "nominal";
  const failed = status === "failed";

  // Hand-authored SVG artwork (P2-4b pilot + rollout, ADR 0032/0033) —
  // every type handled below renders its own original glyph; the few
  // types not yet covered keep the plain generic colored-box glyph at
  // the bottom of this function.
  const wrap = (children: ReactNode) => (
    <button
      type="button"
      onClick={() => onSelect(component.id)}
      aria-label={`${PART_LABELS[component.type]} ${component.id}${failed ? ", failed" : ""}`}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-sm transition-transform hover:scale-105 ${
        isSelected ? "ring-2 ring-navy ring-offset-1" : ""
      }`}
      style={{ left: `${midX}%`, top: `${midY}%` }}
    >
      {children}
    </button>
  );

  if (component.type === "led") {
    const brightness = (result?.visual as { brightness?: number })?.brightness ?? 0;
    const ledStatus: LedVisualStatus = failed ? "burned" : brightness > 0 ? "lit" : "off";
    return wrap(
      <LedGlyph
        color={component.params.color}
        status={ledStatus}
        brightness={brightness}
      />
    );
  }
  if (component.type === "resistor") {
    return wrap(<ResistorGlyph resistanceOhms={component.params.resistanceOhms} />);
  }
  if (component.type === "diode") {
    return wrap(<DiodeGlyph failed={failed} />);
  }
  if (component.type === "transistor") {
    const isOn = (result?.visual as { isOn?: boolean })?.isOn ?? false;
    return wrap(<TransistorGlyph isOn={isOn} />);
  }
  if (component.type === "pushbutton") {
    return wrap(
      <PushbuttonGlyph
        pressed={component.pressed}
        isMomentary={component.params.isMomentary}
      />
    );
  }
  if (component.type === "potentiometer") {
    return wrap(<PotentiometerGlyph wiperPosition={component.wiperPosition} />);
  }
  if (component.type === "motionSensor") {
    return wrap(<PirGlyph motionDetected={component.motionDetected} />);
  }
  if (component.type === "soilMoistureSensor") {
    return wrap(<SoilMoistureGlyph wetness={component.wetness} />);
  }
  if (component.type === "rainSensor") {
    return wrap(<RainSensorGlyph rainLevel={component.rainLevel} />);
  }
  if (component.type === "soundSensor") {
    return wrap(<SoundSensorGlyph loudness={component.loudness} />);
  }
  if (component.type === "dht11") {
    return wrap(
      <Dht11Glyph
        temperatureCelsius={component.simulatedTemperatureCelsius}
        humidityPercent={component.simulatedHumidityPercent}
      />
    );
  }
  if (component.type === "rgbLed") {
    const visual = result?.visual as
      | {
          red: { visual: { brightness: number } };
          green: { visual: { brightness: number } };
          blue: { visual: { brightness: number } };
        }
      | undefined;
    const r = Math.round((visual?.red.visual.brightness ?? 0) * 255);
    const g = Math.round((visual?.green.visual.brightness ?? 0) * 255);
    const b = Math.round((visual?.blue.visual.brightness ?? 0) * 255);
    const anyLit = r + g + b > 0;
    return wrap(
      <RgbLedGlyph
        mixedColor={anyLit ? `rgb(${r}, ${g}, ${b})` : "#A7A59D"}
        anyLit={anyLit}
      />
    );
  }
  if (component.type === "sevenSegmentDisplay") {
    const visual = result?.visual as
      { segments: Record<string, { visual: { brightness: number } }> } | undefined;
    const isLit = (name: string) => (visual?.segments[name]?.visual.brightness ?? 0) > 0;
    const segments = Object.fromEntries(
      SEVEN_SEGMENT_NAMES.filter((n) => n !== "dp").map((n) => [n, isLit(n)])
    ) as Record<"a" | "b" | "c" | "d" | "e" | "f" | "g", boolean>;
    return wrap(<SevenSegmentGlyph segments={segments} decimalPointLit={isLit("dp")} />);
  }
  if (component.type === "relay") {
    const isClosed =
      (result?.visual as { contact: { visual: { isClosed: boolean } } })?.contact.visual
        .isClosed ?? false;
    return wrap(<RelayGlyph contactClosed={isClosed} />);
  }

  const color = glyphColor(component, result);
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
