"use client";

import { useEffect, useMemo, useState } from "react";
import type { HoleAddress } from "@ds-simboard/circuit-engine";
import {
  BREADBOARD_COLUMNS,
  DEFAULT_SUPPLY_VOLTAGE,
  NOMINAL_HEALTH,
  PART_PRESETS,
} from "./constants";
import { DesktopOnlyNotice } from "@/components/shared/DesktopOnlyNotice";
import { BreadboardGrid } from "./components/BreadboardGrid";
import { PartsPalette } from "./components/PartsPalette";
import { Inspector } from "./components/Inspector";
import { StatusBanner } from "./components/StatusBanner";
import type { InteractionMode } from "./model/interactionMode";
import { resolveCircuit } from "./model/resolveCircuit";
import type { PlacedComponent, Wire } from "./model/types";
import type { UIHoleRef } from "./model/layout";

let nextId = 1;

function createComponent(
  presetId: string,
  leads: [HoleAddress, HoleAddress]
): PlacedComponent {
  const preset = PART_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new RangeError(`no palette preset with id "${presetId}"`);
  }
  const id = `${preset.type}-${nextId++}`;
  const health = NOMINAL_HEALTH;
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

export function BreadboardLab() {
  const [components, setComponents] = useState<PlacedComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [supplyVoltage, setSupplyVoltage] = useState(DEFAULT_SUPPLY_VOLTAGE);
  const [mode, setMode] = useState<InteractionMode>({ kind: "idle" });
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  const result = useMemo(
    () => resolveCircuit(BREADBOARD_COLUMNS, components, wires, supplyVoltage),
    [components, wires, supplyVoltage]
  );

  // Health latches inside resolveCircuit's per-tick output, but that output
  // is derived fresh each render — persist any newly-changed health back
  // into component state so it survives the *next* resolve (matching the
  // "failed stays failed until replaced" contract from component-library).
  // Returning the same `prev` array reference when nothing changed makes
  // this converge after one extra render instead of looping.
  useEffect(() => {
    setComponents((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const updated = result.componentResults.get(c.id);
        if (updated && updated.health.status !== c.health.status) {
          changed = true;
          return { ...c, health: updated.health } as PlacedComponent;
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [result]);

  function handleHoleClick(hole: UIHoleRef) {
    if (mode.kind === "idle") return;

    if (mode.kind === "placing") {
      if (!mode.firstHole) {
        setMode({ ...mode, firstHole: hole.address });
        return;
      }
      setComponents((prev) => [
        ...prev,
        createComponent(mode.presetId, [mode.firstHole as HoleAddress, hole.address]),
      ]);
      setMode({ kind: "idle" });
      return;
    }

    if (!mode.firstHole) {
      setMode({ ...mode, firstHole: hole.address });
      return;
    }
    setWires((prev) => [
      ...prev,
      { id: `wire-${nextId++}`, from: mode.firstHole as HoleAddress, to: hole.address },
    ]);
    setMode({ kind: "idle" });
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

  const pendingHole: UIHoleRef | null =
    (mode.kind === "placing" || mode.kind === "wiring") && mode.firstHole
      ? {
          address: mode.firstHole,
          visualColumn: mode.firstHole.kind === "strip" ? mode.firstHole.column : 1,
        }
      : null;

  const selectedComponent = components.find((c) => c.id === selectedComponentId) ?? null;

  return (
    <>
      <DesktopOnlyNotice labName="Breadboard Lab" />
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
            onStartPlacing={(presetId) => setMode({ kind: "placing", presetId })}
            onStartWiring={() => setMode({ kind: "wiring" })}
            onCancel={() => setMode({ kind: "idle" })}
          />

          <div className="flex-1 overflow-auto p-6">
            <BreadboardGrid
              columns={BREADBOARD_COLUMNS}
              components={components}
              wires={wires}
              componentResults={result.componentResults}
              pendingHole={pendingHole}
              selectedComponentId={selectedComponentId}
              onHoleClick={handleHoleClick}
              onComponentClick={setSelectedComponentId}
            />
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
