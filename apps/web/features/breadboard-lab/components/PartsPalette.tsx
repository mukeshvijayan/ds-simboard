"use client";

import { PART_LABELS } from "../constants";
import type { BreadboardComponentType } from "../model/types";
import type { InteractionMode } from "../model/interactionMode";

const PART_TYPES: BreadboardComponentType[] = [
  "resistor",
  "led",
  "diode",
  "pushbutton",
  "potentiometer",
];

export function PartsPalette({
  mode,
  onStartPlacing,
  onStartWiring,
  onCancel,
}: {
  mode: InteractionMode;
  onStartPlacing: (type: BreadboardComponentType) => void;
  onStartWiring: () => void;
  onCancel: () => void;
}) {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col gap-3 border-r border-hairline bg-ivory p-4">
      <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-charcoal-muted">
        Parts
      </p>
      <div className="flex flex-col gap-2">
        {PART_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onStartPlacing(type)}
            aria-pressed={mode.kind === "placing" && mode.type === type}
            className={`rounded-sm border px-3 py-2 text-left text-[13.5px] transition-colors ${
              mode.kind === "placing" && mode.type === type
                ? "border-navy bg-navy text-ivory"
                : "border-hairline bg-white text-charcoal hover:border-charcoal/25"
            }`}
          >
            {PART_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="mt-2 border-t border-hairline pt-3">
        <button
          type="button"
          onClick={onStartWiring}
          aria-pressed={mode.kind === "wiring"}
          className={`w-full rounded-sm border px-3 py-2 text-left text-[13.5px] transition-colors ${
            mode.kind === "wiring"
              ? "border-navy bg-navy text-ivory"
              : "border-hairline bg-white text-charcoal hover:border-charcoal/25"
          }`}
        >
          Draw wire
        </button>
      </div>

      {mode.kind !== "idle" && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-1 text-left text-[12px] text-charcoal-faint hover:text-charcoal"
        >
          Cancel
        </button>
      )}

      <p className="mt-auto border-t border-hairline pt-3 text-[12px] leading-relaxed text-charcoal-faint">
        {mode.kind === "placing" &&
          (mode.type === "led" || mode.type === "diode") &&
          "Click the anode (+) hole first, then the cathode (−) hole."}
        {mode.kind === "placing" &&
          mode.type !== "led" &&
          mode.type !== "diode" &&
          "Click two holes to place it."}
        {mode.kind === "wiring" && "Click two holes to connect them."}
        {mode.kind === "idle" &&
          "Pick a part or draw a wire, then click holes on the board."}
      </p>
    </aside>
  );
}
