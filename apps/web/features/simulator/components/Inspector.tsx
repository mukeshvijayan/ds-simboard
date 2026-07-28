"use client";

import { PART_LABELS } from "../constants";
import {
  firstHealthReason,
  overallHealthStatus,
  type ComponentResult,
} from "../model/resolveCircuit";
import { SEVEN_SEGMENT_NAMES } from "../model/types";
import type { PlacedComponent } from "../model/types";

export function Inspector({
  component,
  result,
  onTogglePressed,
  onWiperChange,
  onLightLevelChange,
  onMotionToggle,
  onWetnessChange,
  onRainLevelChange,
  onLoudnessChange,
  onTemperatureChange,
  onHumidityChange,
  onRemove,
}: {
  component: PlacedComponent | null;
  result: ComponentResult | undefined;
  onTogglePressed: (id: string) => void;
  onWiperChange: (id: string, wiperPosition: number) => void;
  onLightLevelChange: (id: string, lightLevel: number) => void;
  onMotionToggle: (id: string) => void;
  onWetnessChange: (id: string, wetness: number) => void;
  onRainLevelChange: (id: string, rainLevel: number) => void;
  onLoudnessChange: (id: string, loudness: number) => void;
  onTemperatureChange: (id: string, simulatedTemperatureCelsius: number) => void;
  onHumidityChange: (id: string, simulatedHumidityPercent: number) => void;
  onRemove: (id: string) => void;
}) {
  if (!component) {
    return (
      <aside
        aria-label="Component inspector"
        className="w-[240px] shrink-0 border-l border-hairline bg-ivory p-4"
      >
        <p className="text-[13px] text-charcoal-muted">
          Select a component to see its details.
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Component inspector"
      className="flex w-[240px] shrink-0 flex-col gap-3 border-l border-hairline bg-ivory p-4"
    >
      <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-charcoal-muted">
        {PART_LABELS[component.type]}
      </p>
      <p className="font-mono text-[12px] text-charcoal-muted">{component.id}</p>

      <dl className="flex flex-col gap-1.5 text-[13px] text-charcoal">
        <div className="flex justify-between">
          <dt className="text-charcoal-muted">Health</dt>
          <dd
            className={
              (result
                ? overallHealthStatus(result.health)
                : overallHealthStatus(component.health)) === "failed"
                ? "text-[#8a3b3b]"
                : ""
            }
          >
            {result
              ? overallHealthStatus(result.health)
              : overallHealthStatus(component.health)}
          </dd>
        </div>
        {result && firstHealthReason(result.health) && (
          <p className="text-[12px] text-[#8a3b3b]">{firstHealthReason(result.health)}</p>
        )}

        {component.type === "resistor" && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Resistance</dt>
            <dd>{component.params.resistanceOhms}Ω</dd>
          </div>
        )}

        {component.type === "led" && result && (
          <>
            <div className="flex justify-between">
              <dt className="text-charcoal-muted">Color</dt>
              <dd className="capitalize">{component.params.color}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal-muted">Brightness</dt>
              <dd>
                {Math.round(
                  ((result.visual as { brightness: number }).brightness ?? 0) * 100
                )}
                %
              </dd>
            </div>
          </>
        )}

        {component.type === "diode" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Conducting</dt>
            <dd>
              {(result.visual as { isConducting: boolean }).isConducting ? "Yes" : "No"}
            </dd>
          </div>
        )}

        {component.type === "buzzer" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Sound</dt>
            <dd>
              {(result.visual as { isBuzzing: boolean }).isBuzzing
                ? "Buzzing"
                : component.params.kind === "passive"
                  ? "Silent (needs a signal, not just power)"
                  : "Silent"}
            </dd>
          </div>
        )}

        {component.type === "dcMotor" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Speed</dt>
            <dd>
              {Math.round(
                ((result.visual as { speedFraction: number }).speedFraction ?? 0) * 100
              )}
              %
            </dd>
          </div>
        )}

        {component.type === "ldr" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Resistance</dt>
            <dd>
              {Math.round(
                (result.visual as { effectiveResistanceOhms: number })
                  .effectiveResistanceOhms
              ).toLocaleString()}
              Ω
            </dd>
          </div>
        )}

        {component.type === "batteryHolder" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Supplying</dt>
            <dd>
              {(result.visual as { suppliedVoltageVolts: number }).suppliedVoltageVolts}V
            </dd>
          </div>
        )}

        {component.type === "motionSensor" && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Motion</dt>
            <dd>{component.motionDetected ? "Detected" : "None"}</dd>
          </div>
        )}

        {component.type === "soilMoistureSensor" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Resistance</dt>
            <dd>
              {Math.round(
                (result.visual as { effectiveResistanceOhms: number })
                  .effectiveResistanceOhms
              ).toLocaleString()}
              Ω
            </dd>
          </div>
        )}

        {component.type === "rainSensor" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Resistance</dt>
            <dd>
              {Math.round(
                (result.visual as { effectiveResistanceOhms: number })
                  .effectiveResistanceOhms
              ).toLocaleString()}
              Ω
            </dd>
          </div>
        )}

        {component.type === "soundSensor" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Resistance</dt>
            <dd>
              {Math.round(
                (result.visual as { effectiveResistanceOhms: number })
                  .effectiveResistanceOhms
              ).toLocaleString()}
              Ω
            </dd>
          </div>
        )}

        {component.type === "dht11" && (
          <>
            <div className="flex justify-between">
              <dt className="text-charcoal-muted">Temperature</dt>
              <dd>{component.simulatedTemperatureCelsius}°C</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal-muted">Humidity</dt>
              <dd>{component.simulatedHumidityPercent}%</dd>
            </div>
          </>
        )}

        {component.type === "rgbLed" && result && (
          <>
            {(["red", "green", "blue"] as const).map((channel) => (
              <div key={channel} className="flex justify-between">
                <dt className="text-charcoal-muted capitalize">{channel}</dt>
                <dd>
                  {Math.round(
                    (
                      result.visual as {
                        red: { visual: { brightness: number } };
                        green: { visual: { brightness: number } };
                        blue: { visual: { brightness: number } };
                      }
                    )[channel].visual.brightness * 100
                  )}
                  %
                </dd>
              </div>
            ))}
          </>
        )}

        {component.type === "transistor" && result && (
          <>
            <div className="flex justify-between">
              <dt className="text-charcoal-muted">Switch</dt>
              <dd>
                {(result.visual as { isOn: boolean }).isOn ? "On (saturated)" : "Off"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal-muted">Collector current</dt>
              <dd>
                {(
                  (result.visual as { collectorCurrentAmps: number })
                    .collectorCurrentAmps * 1000
                ).toFixed(1)}
                mA
              </dd>
            </div>
          </>
        )}

        {component.type === "relay" && result && (
          <>
            <div className="flex justify-between">
              <dt className="text-charcoal-muted">Coil</dt>
              <dd>
                {(
                  result.visual as {
                    coil: { visual: { isEnergized: boolean } };
                  }
                ).coil.visual.isEnergized
                  ? "Energized"
                  : "De-energized"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal-muted">Contact</dt>
              <dd>
                {(
                  result.visual as {
                    contact: { visual: { isClosed: boolean } };
                  }
                ).contact.visual.isClosed
                  ? "Closed"
                  : "Open"}
              </dd>
            </div>
          </>
        )}

        {component.type === "sevenSegmentDisplay" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Segments lit</dt>
            <dd>
              {
                Object.values(
                  (
                    result.visual as {
                      segments: Record<string, { visual: { brightness: number } }>;
                    }
                  ).segments
                ).filter((s) => s.visual.brightness > 0).length
              }
              {" / "}
              {SEVEN_SEGMENT_NAMES.length}
            </dd>
          </div>
        )}
      </dl>

      {component.type === "pushbutton" && (
        <button
          type="button"
          onClick={() => onTogglePressed(component.id)}
          className={`rounded-sm border px-3 py-2 text-[13.5px] transition-colors ${
            component.pressed
              ? "border-navy bg-navy text-ivory"
              : "border-hairline bg-white text-charcoal"
          }`}
        >
          {component.params.isMomentary
            ? component.pressed
              ? "Pressed (click to release)"
              : "Released (click to press)"
            : component.pressed
              ? "On (click to turn off)"
              : "Off (click to turn on)"}
        </button>
      )}

      {component.type === "potentiometer" && (
        <label className="flex flex-col gap-1 text-[13px] text-charcoal">
          Wiper position
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={component.wiperPosition}
            onChange={(e) => onWiperChange(component.id, Number(e.target.value))}
          />
        </label>
      )}

      {component.type === "ldr" && (
        <label className="flex flex-col gap-1 text-[13px] text-charcoal">
          Simulated light level
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={component.lightLevel}
            onChange={(e) => onLightLevelChange(component.id, Number(e.target.value))}
          />
        </label>
      )}

      {component.type === "motionSensor" && (
        <button
          type="button"
          onClick={() => onMotionToggle(component.id)}
          className={`rounded-sm border px-3 py-2 text-[13.5px] transition-colors ${
            component.motionDetected
              ? "border-navy bg-navy text-ivory"
              : "border-hairline bg-white text-charcoal"
          }`}
        >
          {component.motionDetected
            ? "Motion detected (click to clear)"
            : "No motion (click to trigger)"}
        </button>
      )}

      {component.type === "soilMoistureSensor" && (
        <label className="flex flex-col gap-1 text-[13px] text-charcoal">
          Simulated soil wetness
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={component.wetness}
            onChange={(e) => onWetnessChange(component.id, Number(e.target.value))}
          />
        </label>
      )}

      {component.type === "rainSensor" && (
        <label className="flex flex-col gap-1 text-[13px] text-charcoal">
          Simulated rain level
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={component.rainLevel}
            onChange={(e) => onRainLevelChange(component.id, Number(e.target.value))}
          />
        </label>
      )}

      {component.type === "soundSensor" && (
        <label className="flex flex-col gap-1 text-[13px] text-charcoal">
          Simulated loudness
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={component.loudness}
            onChange={(e) => onLoudnessChange(component.id, Number(e.target.value))}
          />
        </label>
      )}

      {component.type === "dht11" && (
        <>
          <label className="flex flex-col gap-1 text-[13px] text-charcoal">
            Simulated temperature (°C)
            <input
              type="range"
              min={-10}
              max={50}
              step={1}
              value={component.simulatedTemperatureCelsius}
              onChange={(e) => onTemperatureChange(component.id, Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-charcoal">
            Simulated humidity (%)
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={component.simulatedHumidityPercent}
              onChange={(e) => onHumidityChange(component.id, Number(e.target.value))}
            />
          </label>
        </>
      )}

      <button
        type="button"
        onClick={() => onRemove(component.id)}
        className="mt-auto rounded-sm border border-hairline px-3 py-2 text-[13px] text-charcoal-muted hover:border-charcoal/25 hover:text-charcoal"
      >
        Remove
      </button>
    </aside>
  );
}
