"use client";

import { ComponentType } from "@/lib/simulation/types";

const PALETTE: { type: ComponentType; label: string }[] = [
  { type: "led", label: "LED" },
  { type: "servo", label: "Micro servo" },
  { type: "ultrasonic", label: "Ultrasonic sensor" },
  { type: "lcd1602", label: "16×2 LCD" },
];

export function ComponentPalette({
  onAdd,
}: {
  onAdd: (type: ComponentType) => void;
}) {
  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-hairline bg-ivory">
      <div className="border-b border-hairline px-4 py-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-charcoal-muted">
          Components
        </p>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {PALETTE.map((item) => (
          <button
            key={item.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/component-type", item.type);
            }}
            onClick={() => onAdd(item.type)}
            className="flex items-center justify-between rounded-sm border border-hairline bg-white px-3 py-2.5 text-left text-[13.5px] text-charcoal transition-colors hover:border-charcoal/25"
          >
            {item.label}
            <span className="text-[11px] text-charcoal-faint">+ Add</span>
          </button>
        ))}
      </div>

      <p className="mt-auto border-t border-hairline px-4 py-3 text-[12px] leading-relaxed text-charcoal-faint">
        Drag a component onto the board, or click "+ Add" to place it near
        the center.
      </p>
    </aside>
  );
}
