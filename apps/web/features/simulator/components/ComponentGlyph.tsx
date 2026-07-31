"use client";

import type { ReactNode } from "react";
import { overallHealthStatus, type ComponentResult } from "../model/resolveCircuit";
import {
  COMPONENT_BOX_SIZE,
  COMPONENT_LEAD_NAMES,
  componentPinPercent,
} from "../model/componentPinLayouts";
import { useCanvasDrag } from "../model/useCanvasDrag";
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
import { InductorGlyph } from "./glyphs/InductorGlyph";
import { FerriteBeadGlyph } from "./glyphs/FerriteBeadGlyph";
import { FastBlowFuseGlyph } from "./glyphs/FastBlowFuseGlyph";
import { ResettableFuseGlyph } from "./glyphs/ResettableFuseGlyph";
import { IdealConnectorGlyph } from "./glyphs/IdealConnectorGlyph";
import { LiIonCellGlyph } from "./glyphs/LiIonCellGlyph";
import { UsbPowerBreakoutGlyph } from "./glyphs/UsbPowerBreakoutGlyph";
import { SolarPanelGlyph } from "./glyphs/SolarPanelGlyph";
import { BridgeRectifierGlyph } from "./glyphs/BridgeRectifierGlyph";
import { PhotodiodeGlyph } from "./glyphs/PhotodiodeGlyph";
import { ServoGlyph } from "./glyphs/ServoGlyph";

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

/**
 * A free-floating placed component (Part 2, docs/architecture/
 * 0036-*.md) — positioned at its own `component.position`, independent
 * of whatever its leads are (or aren't) wired to, the same
 * draggable-canvas-item pattern `BoardGlyph`/`BreadboardGlyph` already
 * use. Each lead renders as its own small clickable point (via
 * `model/componentPinLayouts.ts`'s per-type registry) so `onLeadClick`
 * can be wired to the same generic wiring-mode handler every other
 * connection point already uses — a component's lead is just one more
 * kind of `ConnectionPointRef`, not a special case.
 */
export function ComponentGlyph({
  component,
  result,
  isSelected,
  isPending,
  viewportScale,
  onSelect,
  onLeadClick,
  onPositionChange,
}: {
  component: PlacedComponent;
  result: ComponentResult | undefined;
  isSelected: boolean;
  isPending: (leadName: string) => boolean;
  viewportScale: number;
  onSelect: (id: string) => void;
  onLeadClick: (point: ConnectionPointRef) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
}) {
  const status = result ? overallHealthStatus(result.health) : "nominal";
  const failed = status === "failed";
  const box = COMPONENT_BOX_SIZE[component.type];
  const leadNames = COMPONENT_LEAD_NAMES[component.type];
  const drag = useCanvasDrag(component.position, viewportScale, (position) =>
    onPositionChange(component.id, position)
  );

  const glyph = (() => {
    if (component.type === "led") {
      const brightness = (result?.visual as { brightness?: number })?.brightness ?? 0;
      const ledStatus: LedVisualStatus = failed
        ? "burned"
        : brightness > 0
          ? "lit"
          : "off";
      return (
        <LedGlyph
          color={component.params.color}
          status={ledStatus}
          brightness={brightness}
        />
      );
    }
    if (component.type === "resistor") {
      return <ResistorGlyph resistanceOhms={component.params.resistanceOhms} />;
    }
    if (component.type === "diode") {
      return <DiodeGlyph failed={failed} />;
    }
    if (component.type === "photodiode") {
      return <PhotodiodeGlyph lightLevel={component.lightLevel} failed={failed} />;
    }
    if (component.type === "transistor") {
      const isOn = (result?.visual as { isOn?: boolean })?.isOn ?? false;
      return <TransistorGlyph isOn={isOn} />;
    }
    if (component.type === "pushbutton") {
      return (
        <PushbuttonGlyph
          pressed={component.pressed}
          isMomentary={component.params.isMomentary}
        />
      );
    }
    if (component.type === "potentiometer") {
      return <PotentiometerGlyph wiperPosition={component.wiperPosition} />;
    }
    if (component.type === "motionSensor") {
      return <PirGlyph motionDetected={component.motionDetected} />;
    }
    if (component.type === "soilMoistureSensor") {
      return <SoilMoistureGlyph wetness={component.wetness} />;
    }
    if (component.type === "rainSensor") {
      return <RainSensorGlyph rainLevel={component.rainLevel} />;
    }
    if (component.type === "soundSensor") {
      return <SoundSensorGlyph loudness={component.loudness} />;
    }
    if (component.type === "dht11") {
      return (
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
      return (
        <RgbLedGlyph
          mixedColor={anyLit ? `rgb(${r}, ${g}, ${b})` : "#A7A59D"}
          anyLit={anyLit}
        />
      );
    }
    if (component.type === "sevenSegmentDisplay") {
      const visual = result?.visual as
        { segments: Record<string, { visual: { brightness: number } }> } | undefined;
      const isLit = (name: string) =>
        (visual?.segments[name]?.visual.brightness ?? 0) > 0;
      const segments = Object.fromEntries(
        SEVEN_SEGMENT_NAMES.filter((n) => n !== "dp").map((n) => [n, isLit(n)])
      ) as Record<"a" | "b" | "c" | "d" | "e" | "f" | "g", boolean>;
      return <SevenSegmentGlyph segments={segments} decimalPointLit={isLit("dp")} />;
    }
    if (component.type === "relay") {
      const isClosed =
        (result?.visual as { contact: { visual: { isClosed: boolean } } })?.contact.visual
          .isClosed ?? false;
      return <RelayGlyph contactClosed={isClosed} />;
    }
    if (component.type === "inductor") {
      return <InductorGlyph />;
    }
    if (component.type === "ferriteBead") {
      return <FerriteBeadGlyph />;
    }
    if (component.type === "fastBlowFuse") {
      return <FastBlowFuseGlyph blown={failed} />;
    }
    if (component.type === "resettableFuse") {
      return <ResettableFuseGlyph tripped={status === "stressed"} />;
    }
    if (component.type === "idealConnector") {
      return <IdealConnectorGlyph kind={component.params.kind} />;
    }
    if (component.type === "liIonCell") {
      const suppliedVoltageVolts =
        (result?.visual as { suppliedVoltageVolts?: number })?.suppliedVoltageVolts ?? 0;
      return <LiIonCellGlyph suppliedVoltageVolts={suppliedVoltageVolts} />;
    }
    if (component.type === "usbPowerBreakout") {
      const suppliedVoltageVolts =
        (result?.visual as { suppliedVoltageVolts?: number })?.suppliedVoltageVolts ?? 0;
      return <UsbPowerBreakoutGlyph suppliedVoltageVolts={suppliedVoltageVolts} />;
    }
    if (component.type === "solarPanel") {
      return <SolarPanelGlyph sunlightLevel={component.sunlightLevel} />;
    }
    if (component.type === "bridgeRectifier") {
      return <BridgeRectifierGlyph />;
    }
    if (component.type === "servo") {
      const angleDegrees =
        (result?.visual as { angleDegrees?: number })?.angleDegrees ?? 90;
      return <ServoGlyph angleDegrees={angleDegrees} failed={failed} />;
    }
    const color = glyphColor(component, result);
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-sm border px-1 text-[9px] font-medium text-ivory shadow-sm"
        style={{ backgroundColor: color, borderColor: "rgba(28,27,24,0.3)" }}
      >
        {PART_LABELS[component.type]}
      </div>
    );
  })();

  return (
    <div
      role="group"
      aria-label={`${PART_LABELS[component.type]} ${component.id}${failed ? ", failed" : ""} — drag to move`}
      className={`absolute cursor-grab rounded-sm active:cursor-grabbing ${
        isSelected ? "ring-2 ring-navy ring-offset-1" : ""
      }`}
      style={{
        left: component.position.x,
        top: component.position.y,
        width: box.width,
        height: box.height,
      }}
      onMouseDown={drag.onMouseDown}
      onClick={() => onSelect(component.id)}
    >
      <div className="pointer-events-none absolute inset-0">{glyph as ReactNode}</div>
      {leadNames.map((leadName) => {
        const percent = componentPinPercent(component.type, leadName);
        const pending = isPending(leadName);
        return (
          <button
            key={leadName}
            type="button"
            aria-label={`${PART_LABELS[component.type]} ${component.id} ${leadName} lead`}
            onClick={(event) => {
              event.stopPropagation();
              onLeadClick({
                kind: "componentLead",
                componentItemId: component.id,
                leadName,
              });
            }}
            className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors focus-visible:z-10 ${
              pending
                ? "border-navy bg-navy ring-2 ring-navy ring-offset-1"
                : "border-charcoal/40 bg-white/80 hover:border-navy hover:bg-navy/10"
            }`}
            style={{ left: `${percent.xPercent}%`, top: `${percent.yPercent}%` }}
          />
        );
      })}
    </div>
  );
}
