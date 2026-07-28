"use client";

import { PART_PRESETS, presetLeadNames } from "../constants";
import type { InteractionMode } from "../model/interactionMode";

export function PartsPalette({
  mode,
  onStartPlacing,
  onStartWiring,
  onCancel,
}: {
  mode: InteractionMode;
  onStartPlacing: (presetId: string) => void;
  onStartWiring: () => void;
  onCancel: () => void;
}) {
  const activePreset =
    mode.kind === "placing"
      ? PART_PRESETS.find((p) => p.id === mode.presetId)
      : undefined;

  return (
    <aside
      aria-label="Parts palette"
      className="flex w-[220px] shrink-0 flex-col gap-3 border-r border-hairline bg-ivory p-4"
    >
      <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-charcoal-muted">
        Parts
      </p>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {PART_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onStartPlacing(preset.id)}
            aria-pressed={mode.kind === "placing" && mode.presetId === preset.id}
            className={`rounded-sm border px-3 py-2 text-left text-[13.5px] transition-colors ${
              mode.kind === "placing" && mode.presetId === preset.id
                ? "border-navy bg-navy text-ivory"
                : "border-hairline bg-white text-charcoal hover:border-charcoal/25"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="border-t border-hairline pt-3">
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
          className="text-left text-[12px] text-charcoal-muted hover:text-charcoal"
        >
          Cancel
        </button>
      )}

      <p className="border-t border-hairline pt-3 text-[12px] leading-relaxed text-charcoal-muted">
        {mode.kind === "placing" &&
          activePreset &&
          (() => {
            const names = presetLeadNames(activePreset);
            const next = names[mode.collectedPoints.length];
            return next
              ? `Click the ${next} hole (${mode.collectedPoints.length + 1} of ${names.length}).`
              : "Placing…";
          })()}
        {mode.kind === "wiring" && "Click two holes to connect them."}
        {mode.kind === "idle" &&
          "Pick a part or draw a wire, then click holes on the board."}
      </p>
    </aside>
  );
}
