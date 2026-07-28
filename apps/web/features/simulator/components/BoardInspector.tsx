"use client";

import { CodeEditor } from "@/components/simulator/CodeEditor";
import { SerialMonitor } from "@/components/simulator/SerialMonitor";
import type { SerialLine } from "@/lib/simulation/types";
import { BOARD_LABELS } from "../model/boardPins";
import type { PlacedArduinoUno, PlacedBoard } from "../model/types";

export function BoardInspector({
  board,
  serialLines,
  onRunToggle,
  onProgramChange,
  onSketchChange,
  onRemove,
}: {
  board: PlacedBoard | null;
  serialLines: SerialLine[];
  onRunToggle: (id: string) => void;
  onProgramChange: (id: string, program: PlacedArduinoUno["program"]) => void;
  onSketchChange: (id: string, sketch: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!board) {
    return (
      <aside
        aria-label="Board inspector"
        className="w-[280px] shrink-0 border-l border-hairline bg-ivory p-4"
      >
        <p className="text-[13px] text-charcoal-muted">
          Select a board to see its details.
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Board inspector"
      className="flex w-[280px] shrink-0 flex-col gap-3 border-l border-hairline bg-ivory p-4"
    >
      <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-charcoal-muted">
        {BOARD_LABELS[board.boardType]}
      </p>
      <p className="font-mono text-[12px] text-charcoal-muted">{board.id}</p>

      <button
        type="button"
        onClick={() => onRunToggle(board.id)}
        className={`rounded-sm border px-3 py-2 text-[13.5px] transition-colors ${
          board.running
            ? "border-navy bg-navy text-ivory"
            : "border-hairline bg-white text-charcoal"
        }`}
      >
        {board.running ? "Running (click to stop)" : "Stopped (click to run)"}
      </button>

      {board.boardType === "arduinoUno" && (
        <div className="flex flex-col gap-1.5 text-[13px] text-charcoal">
          <p className="text-charcoal-muted">
            Program (no live sketch compilation — see docs/architecture/0007-*.md)
          </p>
          <select
            value={board.program}
            disabled={board.running}
            onChange={(e) =>
              onProgramChange(board.id, e.target.value as PlacedArduinoUno["program"])
            }
            className="rounded-sm border border-hairline bg-white px-2 py-1.5 text-[13px] text-charcoal"
          >
            <option value="blink">Blink (pin 13)</option>
            <option value="digitalPassthrough">
              Digital passthrough (pin 2 in → pin 13 out)
            </option>
          </select>
        </div>
      )}

      {board.boardType === "esp32" && (
        <>
          <p className="text-[13px] text-charcoal-muted">Sketch</p>
          <div className="h-[220px] overflow-hidden rounded-sm border border-hairline">
            <CodeEditor
              value={board.sketch}
              onChange={(sketch) => onSketchChange(board.id, sketch)}
              readOnly={board.running}
            />
          </div>
          <div className="h-[160px] overflow-hidden rounded-sm border border-hairline">
            <SerialMonitor lines={serialLines} />
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => onRemove(board.id)}
        className="mt-auto rounded-sm border border-hairline px-3 py-2 text-[13px] text-charcoal-muted hover:border-charcoal/25 hover:text-charcoal"
      >
        Remove
      </button>
    </aside>
  );
}
