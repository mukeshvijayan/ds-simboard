"use client";

import { PART_LABELS } from "../constants";
import type { ComponentResult } from "../model/resolveCircuit";
import type { PlacedComponent } from "../model/types";

export function Inspector({
  component,
  result,
  onTogglePressed,
  onWiperChange,
  onRemove,
}: {
  component: PlacedComponent | null;
  result: ComponentResult | undefined;
  onTogglePressed: (id: string) => void;
  onWiperChange: (id: string, wiperPosition: number) => void;
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
          <dd className={result?.health.status === "failed" ? "text-[#8a3b3b]" : ""}>
            {result?.health.status ?? component.health.status}
          </dd>
        </div>
        {result?.health.reason && (
          <p className="text-[12px] text-[#8a3b3b]">{result.health.reason}</p>
        )}

        {component.type === "resistor" && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Resistance</dt>
            <dd>{component.params.resistanceOhms}Ω</dd>
          </div>
        )}

        {component.type === "led" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Brightness</dt>
            <dd>
              {Math.round(
                ((result.visual as { brightness: number }).brightness ?? 0) * 100
              )}
              %
            </dd>
          </div>
        )}

        {component.type === "diode" && result && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Conducting</dt>
            <dd>
              {(result.visual as { isConducting: boolean }).isConducting ? "Yes" : "No"}
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
          {component.pressed ? "Pressed (click to release)" : "Released (click to press)"}
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
