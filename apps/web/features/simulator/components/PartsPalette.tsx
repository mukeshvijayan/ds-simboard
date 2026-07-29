"use client";

import { useState } from "react";
import { PART_PRESETS, presetLeadNames } from "../constants";
import {
  BOARD_TIER,
  COMPONENT_TIER,
  GRADE_TIER_LABELS,
  GRADE_TIER_RANGES,
  GRADE_TIERS,
  type GradeTier,
} from "../model/gradeTiers";
import type { InteractionMode } from "../model/interactionMode";
import type { PlacedBoard } from "../model/types";

type TierFilter = GradeTier | "all";

export function PartsPalette({
  mode,
  onStartPlacing,
  onStartWiring,
  onCancel,
  onAddBoard,
}: {
  mode: InteractionMode;
  onStartPlacing: (presetId: string) => void;
  onStartWiring: () => void;
  onCancel: () => void;
  onAddBoard: (boardType: PlacedBoard["boardType"]) => void;
}) {
  // Grade-tier filtering (P2-6) is a palette-only concern — it narrows
  // what's *offered* for new placement, it never hides or disables an
  // already-placed part regardless of which filter is active.
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

  const activePreset =
    mode.kind === "placing"
      ? PART_PRESETS.find((p) => p.id === mode.presetId)
      : undefined;

  const visiblePresets = PART_PRESETS.filter(
    (preset) => tierFilter === "all" || COMPONENT_TIER[preset.type] === tierFilter
  );
  const showArduinoUno = tierFilter === "all" || BOARD_TIER.arduinoUno === tierFilter;
  const showEsp32 = tierFilter === "all" || BOARD_TIER.esp32 === tierFilter;

  return (
    <aside
      aria-label="Parts palette"
      className="flex w-[220px] shrink-0 flex-col gap-3 border-r border-hairline bg-ivory p-4"
    >
      <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-charcoal-muted">
        Parts
      </p>

      <div
        role="group"
        aria-label="Filter parts by grade level"
        className="flex flex-wrap gap-1.5"
      >
        <button
          type="button"
          onClick={() => setTierFilter("all")}
          aria-pressed={tierFilter === "all"}
          className={`rounded-sm border px-2 py-1 text-[12px] transition-colors ${
            tierFilter === "all"
              ? "border-navy bg-navy text-ivory"
              : "border-hairline bg-white text-charcoal-muted hover:border-charcoal/25"
          }`}
        >
          All
        </button>
        {GRADE_TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => setTierFilter(tier)}
            aria-pressed={tierFilter === tier}
            title={GRADE_TIER_RANGES[tier]}
            className={`rounded-sm border px-2 py-1 text-[12px] transition-colors ${
              tierFilter === tier
                ? "border-navy bg-navy text-ivory"
                : "border-hairline bg-white text-charcoal-muted hover:border-charcoal/25"
            }`}
          >
            {GRADE_TIER_LABELS[tier]}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {visiblePresets.map((preset) => (
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
        {visiblePresets.length === 0 && (
          <p className="text-[12px] text-charcoal-muted">No parts in this tier yet.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-hairline pt-3">
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
        {showArduinoUno && (
          <button
            type="button"
            onClick={() => onAddBoard("arduinoUno")}
            className="w-full rounded-sm border border-hairline bg-white px-3 py-2 text-left text-[13.5px] text-charcoal hover:border-charcoal/25"
          >
            + Arduino Uno
          </button>
        )}
        {showEsp32 && (
          <button
            type="button"
            onClick={() => onAddBoard("esp32")}
            className="w-full rounded-sm border border-hairline bg-white px-3 py-2 text-left text-[13.5px] text-charcoal hover:border-charcoal/25"
          >
            + ESP32
          </button>
        )}
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
