"use client";

import { useEffect, useRef } from "react";
import { SerialLine } from "@/lib/simulation/types";

export function SerialMonitor({ lines }: { lines: SerialLine[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  return (
    <div className="flex h-full flex-col border-t border-hairline bg-white">
      <div className="border-b border-hairline px-4 py-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-charcoal-muted">
          Serial monitor
        </p>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[12px] leading-relaxed text-charcoal"
      >
        {lines.length === 0 && (
          <p className="text-charcoal-faint">
            Output from Serial.print() appears here once the sketch runs.
          </p>
        )}
        {lines.map((line) => (
          <div key={line.id}>{line.text}</div>
        ))}
      </div>
    </div>
  );
}
