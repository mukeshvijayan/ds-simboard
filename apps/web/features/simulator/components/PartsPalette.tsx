"use client";

import { useState } from "react";
import {
  PART_PRESETS,
  PART_GROUP_LABELS,
  presetShortLabel,
  type PartPreset,
} from "../constants";
import {
  BOARD_TIER,
  COMPONENT_TIER,
  GRADE_TIER_LABELS,
  GRADE_TIER_RANGES,
  GRADE_TIERS,
  type GradeTier,
} from "../model/gradeTiers";
import type { InteractionMode } from "../model/interactionMode";
import type { BreadboardComponentType, PlacedBoard } from "../model/types";
import type { PaletteDragPayload } from "../model/dragPayload";

type TierFilter = GradeTier | "all";

/** One palette entry per `BreadboardComponentType` present in
 * `visiblePresets`, in first-encountered order — a type with more than
 * one preset (and a `PART_GROUP_LABELS` entry) becomes one button plus
 * a variant dropdown (Part 2); a type with exactly one preset stays a
 * single plain button, unchanged from before grouping existed. */
function groupPresets(
  presets: PartPreset[]
): { type: BreadboardComponentType; variants: PartPreset[] }[] {
  const order: BreadboardComponentType[] = [];
  const byType = new Map<BreadboardComponentType, PartPreset[]>();
  for (const preset of presets) {
    if (!byType.has(preset.type)) {
      byType.set(preset.type, []);
      order.push(preset.type);
    }
    byType.get(preset.type)!.push(preset);
  }
  return order.map((type) => ({ type, variants: byType.get(type)! }));
}

export function PartsPalette({
  mode,
  onStartPlacing,
  onStartWiring,
  onCancel,
  onAddBoard,
  onAddBreadboard,
}: {
  mode: InteractionMode;
  onStartPlacing: (presetId: string) => void;
  onStartWiring: () => void;
  onCancel: () => void;
  onAddBoard: (boardType: PlacedBoard["boardType"]) => void;
  onAddBreadboard: () => void;
}) {
  // Grade-tier filtering (P2-6) is a palette-only concern — it narrows
  // what's *offered* for new placement, it never hides or disables an
  // already-placed part regardless of which filter is active.
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  // Which variant a multi-preset group's dropdown currently shows —
  // keyed by type, defaulting to that group's first preset until the
  // user picks a different one.
  const [selectedVariant, setSelectedVariant] = useState<
    Partial<Record<BreadboardComponentType, string>>
  >({});

  const visiblePresets = PART_PRESETS.filter(
    (preset) => tierFilter === "all" || COMPONENT_TIER[preset.type] === tierFilter
  );
  const groups = groupPresets(visiblePresets);
  const showArduinoUno = tierFilter === "all" || BOARD_TIER.arduinoUno === tierFilter;
  const showEsp32 = tierFilter === "all" || BOARD_TIER.esp32 === tierFilter;

  function dragStart(payload: PaletteDragPayload) {
    return (event: React.DragEvent) => {
      event.dataTransfer.setData("application/json", JSON.stringify(payload));
      event.dataTransfer.effectAllowed = "copy";
    };
  }

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
        {groups.map(({ type, variants }) => {
          const groupLabel = PART_GROUP_LABELS[type];
          const hasVariants = variants.length > 1 && !!groupLabel;
          if (!hasVariants) {
            const preset = variants[0];
            return (
              <button
                key={preset.id}
                type="button"
                draggable
                onDragStart={dragStart({ kind: "preset", presetId: preset.id })}
                onClick={() => onStartPlacing(preset.id)}
                aria-pressed={mode.kind === "placingFree" && mode.presetId === preset.id}
                className={`cursor-grab rounded-sm border px-3 py-2 text-left text-[13.5px] transition-colors active:cursor-grabbing ${
                  mode.kind === "placingFree" && mode.presetId === preset.id
                    ? "border-navy bg-navy text-ivory"
                    : "border-hairline bg-white text-charcoal hover:border-charcoal/25"
                }`}
              >
                {preset.label}
              </button>
            );
          }
          const selectedId = selectedVariant[type] ?? variants[0].id;
          const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
          const isActive = mode.kind === "placingFree" && mode.presetId === selected.id;
          return (
            <div key={type} className="flex flex-col gap-1">
              <button
                type="button"
                draggable
                onDragStart={dragStart({ kind: "preset", presetId: selected.id })}
                onClick={() => onStartPlacing(selected.id)}
                aria-pressed={isActive}
                className={`w-full cursor-grab rounded-sm border px-3 py-2 text-left text-[13.5px] transition-colors active:cursor-grabbing ${
                  isActive
                    ? "border-navy bg-navy text-ivory"
                    : "border-hairline bg-white text-charcoal hover:border-charcoal/25"
                }`}
              >
                {groupLabel} ({presetShortLabel(selected, groupLabel!)})
              </button>
              <select
                aria-label={`${groupLabel} variant`}
                value={selectedId}
                onChange={(e) =>
                  setSelectedVariant((prev) => ({ ...prev, [type]: e.target.value }))
                }
                className="rounded-sm border border-hairline bg-white px-1.5 py-1 text-[12.5px] text-charcoal"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {presetShortLabel(v, groupLabel!)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        {groups.length === 0 && (
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
        <button
          type="button"
          draggable
          onDragStart={dragStart({ kind: "breadboard" })}
          onClick={onAddBreadboard}
          className="w-full cursor-grab rounded-sm border border-hairline bg-white px-3 py-2 text-left text-[13.5px] text-charcoal hover:border-charcoal/25 active:cursor-grabbing"
        >
          + Breadboard
        </button>
        {showArduinoUno && (
          <button
            type="button"
            draggable
            onDragStart={dragStart({ kind: "board", boardType: "arduinoUno" })}
            onClick={() => onAddBoard("arduinoUno")}
            className="w-full cursor-grab rounded-sm border border-hairline bg-white px-3 py-2 text-left text-[13.5px] text-charcoal hover:border-charcoal/25 active:cursor-grabbing"
          >
            + Arduino Uno
          </button>
        )}
        {showEsp32 && (
          <button
            type="button"
            draggable
            onDragStart={dragStart({ kind: "board", boardType: "esp32" })}
            onClick={() => onAddBoard("esp32")}
            className="w-full cursor-grab rounded-sm border border-hairline bg-white px-3 py-2 text-left text-[13.5px] text-charcoal hover:border-charcoal/25 active:cursor-grabbing"
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
        {mode.kind === "placingFree" &&
          "Click anywhere on the canvas to drop it (or just drag it there)."}
        {mode.kind === "wiring" &&
          (mode.firstPoint
            ? "Click a second hole, pin, or lead to connect them."
            : "Click a hole, pin, or component lead, then another, to wire them.")}
        {mode.kind === "idle" &&
          "Drag a part onto the canvas, or click it then click the canvas to drop it."}
      </p>
    </aside>
  );
}
