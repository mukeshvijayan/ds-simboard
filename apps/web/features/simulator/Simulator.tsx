"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BREADBOARD_COLUMNS,
  DEFAULT_SUPPLY_VOLTAGE,
  NOMINAL_HEALTH,
  PART_PRESETS,
  presetLeadNames,
} from "./constants";
import { DesktopOnlyNotice } from "@/components/shared/DesktopOnlyNotice";
import { CanvasSurface } from "./components/CanvasSurface";
import { BreadboardGlyph } from "./components/BreadboardGlyph";
import { PartsPalette } from "./components/PartsPalette";
import { Inspector } from "./components/Inspector";
import { StatusBanner } from "./components/StatusBanner";
import type { InteractionMode } from "./model/interactionMode";
import type { ConnectionPointRef } from "./model/connectionPoint";
import { componentHealthEquals, resolveCircuit } from "./model/resolveCircuit";
import { SEVEN_SEGMENT_NAMES } from "./model/types";
import type {
  CanvasWireModel,
  PlacedBreadboard,
  PlacedComponent,
  SevenSegmentName,
} from "./model/types";
import { INITIAL_VIEWPORT, type CanvasViewport } from "./model/viewport";

let nextId = 1;

const DEFAULT_BREADBOARD: PlacedBreadboard = {
  id: "bb-1",
  position: { x: 60, y: 60 },
  columns: BREADBOARD_COLUMNS,
  pixelWidth: 720,
  pixelHeight: 360,
};

function createComponent(
  presetId: string,
  points: ConnectionPointRef[]
): PlacedComponent {
  const preset = PART_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new RangeError(`no palette preset with id "${presetId}"`);
  }
  const id = `${preset.type}-${nextId++}`;
  const health = NOMINAL_HEALTH;

  if (preset.type === "rgbLed") {
    const [commonLead, redLead, greenLead, blueLead] = points;
    return {
      id,
      type: preset.type,
      params: preset.params,
      commonLead,
      redLead,
      greenLead,
      blueLead,
      health: { red: health, green: health, blue: health },
    };
  }
  if (preset.type === "sevenSegmentDisplay") {
    const [commonLead, ...segmentPoints] = points;
    const segmentLeads = {} as Record<SevenSegmentName, ConnectionPointRef>;
    const segmentHealth = {} as Record<SevenSegmentName, typeof health>;
    SEVEN_SEGMENT_NAMES.forEach((name, index) => {
      segmentLeads[name] = segmentPoints[index];
      segmentHealth[name] = health;
    });
    return {
      id,
      type: preset.type,
      params: preset.params,
      commonLead,
      segmentLeads,
      health: segmentHealth,
    };
  }

  const leads = points as [ConnectionPointRef, ConnectionPointRef];
  switch (preset.type) {
    case "resistor":
      return { id, type: preset.type, params: preset.params, leads, health };
    case "led":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        leadZeroIsPositive: true,
        health,
      };
    case "diode":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        leadZeroIsPositive: true,
        health,
      };
    case "pushbutton":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        pressed: false,
        health,
      };
    case "potentiometer":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        wiperPosition: 0.5,
        health,
      };
    case "buzzer":
      return { id, type: preset.type, params: preset.params, leads, health };
    case "dcMotor":
      return { id, type: preset.type, params: preset.params, leads, health };
    case "ldr":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        lightLevel: 0.5,
        health,
      };
    case "batteryHolder":
      return { id, type: preset.type, params: preset.params, leads, health };
    case "motionSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        motionDetected: false,
        health,
      };
    case "soilMoistureSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        wetness: 0.5,
        health,
      };
    case "rainSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        rainLevel: 0.5,
        health,
      };
    case "soundSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        loudness: 0.5,
        health,
      };
    case "dht11":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        simulatedTemperatureCelsius: 24,
        simulatedHumidityPercent: 50,
        health,
      };
  }
}

export function Simulator() {
  const [breadboards, setBreadboards] = useState<PlacedBreadboard[]>([
    DEFAULT_BREADBOARD,
  ]);
  const [components, setComponents] = useState<PlacedComponent[]>([]);
  const [wires, setWires] = useState<CanvasWireModel[]>([]);
  const [supplyVoltage, setSupplyVoltage] = useState(DEFAULT_SUPPLY_VOLTAGE);
  const [mode, setMode] = useState<InteractionMode>({ kind: "idle" });
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<CanvasViewport>(INITIAL_VIEWPORT);

  const result = useMemo(
    () => resolveCircuit(breadboards, components, wires, supplyVoltage),
    [breadboards, components, wires, supplyVoltage]
  );

  // Health latches inside resolveCircuit's per-tick output — persist any
  // newly-changed health back into component state so it survives the
  // *next* resolve, same "failed stays failed" contract as Breadboard Lab.
  // `componentHealthEquals` handles both a plain HealthState and a
  // multi-lead part's per-channel health record (P2-2).
  useEffect(() => {
    setComponents((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const updated = result.componentResults.get(c.id);
        if (updated && !componentHealthEquals(updated.health, c.health)) {
          changed = true;
          return { ...c, health: updated.health } as PlacedComponent;
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [result]);

  function handlePointClick(point: ConnectionPointRef) {
    if (mode.kind === "idle") return;

    if (mode.kind === "placing") {
      const preset = PART_PRESETS.find((p) => p.id === mode.presetId);
      const neededLeads = preset ? presetLeadNames(preset).length : 2;
      const collectedPoints = [...mode.collectedPoints, point];
      if (collectedPoints.length < neededLeads) {
        setMode({ ...mode, collectedPoints });
        return;
      }
      setComponents((prev) => [...prev, createComponent(mode.presetId, collectedPoints)]);
      setMode({ kind: "idle" });
      return;
    }

    if (!mode.firstPoint) {
      setMode({ ...mode, firstPoint: point });
      return;
    }
    setWires((prev) => [
      ...prev,
      { id: `wire-${nextId++}`, from: mode.firstPoint as ConnectionPointRef, to: point },
    ]);
    setMode({ kind: "idle" });
  }

  function handleBreadboardPositionChange(
    id: string,
    position: { x: number; y: number }
  ) {
    setBreadboards((prev) => prev.map((bb) => (bb.id === id ? { ...bb, position } : bb)));
  }

  function handleRemove(id: string) {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    if (selectedComponentId === id) setSelectedComponentId(null);
  }

  function handleTogglePressed(id: string) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "pushbutton" ? { ...c, pressed: !c.pressed } : c
      )
    );
  }

  function handleWiperChange(id: string, wiperPosition: number) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "potentiometer" ? { ...c, wiperPosition } : c
      )
    );
  }

  function handleLightLevelChange(id: string, lightLevel: number) {
    setComponents((prev) =>
      prev.map((c) => (c.id === id && c.type === "ldr" ? { ...c, lightLevel } : c))
    );
  }

  function handleMotionToggle(id: string) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "motionSensor"
          ? { ...c, motionDetected: !c.motionDetected }
          : c
      )
    );
  }

  function handleWetnessChange(id: string, wetness: number) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "soilMoistureSensor" ? { ...c, wetness } : c
      )
    );
  }

  function handleRainLevelChange(id: string, rainLevel: number) {
    setComponents((prev) =>
      prev.map((c) => (c.id === id && c.type === "rainSensor" ? { ...c, rainLevel } : c))
    );
  }

  function handleLoudnessChange(id: string, loudness: number) {
    setComponents((prev) =>
      prev.map((c) => (c.id === id && c.type === "soundSensor" ? { ...c, loudness } : c))
    );
  }

  function handleTemperatureChange(id: string, simulatedTemperatureCelsius: number) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "dht11" ? { ...c, simulatedTemperatureCelsius } : c
      )
    );
  }

  function handleHumidityChange(id: string, simulatedHumidityPercent: number) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "dht11" ? { ...c, simulatedHumidityPercent } : c
      )
    );
  }

  function handleReset() {
    setComponents([]);
    setWires([]);
    setMode({ kind: "idle" });
    setSelectedComponentId(null);
  }

  const pendingPoints: ConnectionPointRef[] =
    mode.kind === "placing"
      ? mode.collectedPoints
      : mode.kind === "wiring" && mode.firstPoint
        ? [mode.firstPoint]
        : [];

  const selectedComponent = components.find((c) => c.id === selectedComponentId) ?? null;

  return (
    <>
      <DesktopOnlyNotice labName="Simulator" />
      <div className="hidden h-full flex-col lg:flex">
        <div className="flex items-center justify-between gap-4 border-b border-hairline bg-ivory px-4 py-3">
          <StatusBanner result={result} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] text-charcoal-muted">
              Supply
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={supplyVoltage}
                onChange={(e) => setSupplyVoltage(Number(e.target.value))}
                className="w-16 rounded-sm border border-hairline px-2 py-1 text-[13px] text-charcoal"
              />
              V
            </label>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-sm border border-hairline px-3 py-1.5 text-[13px] text-charcoal-muted hover:border-charcoal/25 hover:text-charcoal"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <PartsPalette
            mode={mode}
            onStartPlacing={(presetId) =>
              setMode({ kind: "placing", presetId, collectedPoints: [] })
            }
            onStartWiring={() => setMode({ kind: "wiring" })}
            onCancel={() => setMode({ kind: "idle" })}
          />

          <div className="flex-1">
            <CanvasSurface
              viewport={viewport}
              onViewportChange={setViewport}
              onBackgroundClick={() => setSelectedComponentId(null)}
            >
              {breadboards.map((bb) => (
                <BreadboardGlyph
                  key={bb.id}
                  breadboard={bb}
                  components={components}
                  wires={wires}
                  componentResults={result.componentResults}
                  pendingPoints={pendingPoints}
                  selectedComponentId={selectedComponentId}
                  viewportScale={viewport.scale}
                  onHoleClick={handlePointClick}
                  onComponentClick={setSelectedComponentId}
                  onPositionChange={handleBreadboardPositionChange}
                />
              ))}
            </CanvasSurface>
          </div>

          <Inspector
            component={selectedComponent}
            result={
              selectedComponentId
                ? result.componentResults.get(selectedComponentId)
                : undefined
            }
            onTogglePressed={handleTogglePressed}
            onWiperChange={handleWiperChange}
            onLightLevelChange={handleLightLevelChange}
            onMotionToggle={handleMotionToggle}
            onWetnessChange={handleWetnessChange}
            onRainLevelChange={handleRainLevelChange}
            onLoudnessChange={handleLoudnessChange}
            onTemperatureChange={handleTemperatureChange}
            onHumidityChange={handleHumidityChange}
            onRemove={handleRemove}
          />
        </div>
      </div>
    </>
  );
}
