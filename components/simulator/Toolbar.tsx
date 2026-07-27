"use client";

import Link from "next/link";
import { Play, Square, RotateCcw } from "lucide-react";
import { BoardId, EngineStatus } from "@/lib/simulation/types";
import { BOARDS } from "@/lib/simulation/boards";

interface ToolbarProps {
  boardId: BoardId;
  status: EngineStatus;
  onBoardChange: (id: BoardId) => void;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
}

export function Toolbar({
  boardId,
  status,
  onBoardChange,
  onRun,
  onStop,
  onReset,
}: ToolbarProps) {
  const isRunning = status === "running";

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-ivory px-4">
      <div className="flex items-center gap-4">
        <Link href="/" className="font-serif text-[16px] font-semibold text-charcoal">
          DS SimBoard
        </Link>
        <select
          value={boardId}
          onChange={(e) => onBoardChange(e.target.value as BoardId)}
          disabled={isRunning}
          className="rounded-sm border border-hairline bg-white px-2.5 py-1.5 text-[13px] text-charcoal focus-visible:outline-none"
        >
          {Object.values(BOARDS).map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <StatusDot status={status} />
        <button
          onClick={onReset}
          disabled={isRunning}
          aria-label="Reset"
          className="rounded-sm p-2 text-charcoal-muted hover:text-charcoal disabled:opacity-30"
        >
          <RotateCcw size={16} />
        </button>
        {isRunning ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-sm bg-charcoal px-4 py-2 text-[13.5px] font-medium text-ivory"
          >
            <Square size={13} /> Stop
          </button>
        ) : (
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 rounded-sm bg-navy px-4 py-2 text-[13.5px] font-medium text-ivory hover:bg-navy-dark"
          >
            <Play size={13} /> Run
          </button>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: EngineStatus }) {
  const color =
    status === "running"
      ? "bg-navy"
      : status === "error"
      ? "bg-[#8a3b3b]"
      : "bg-charcoal-faint";

  const label =
    status === "running" ? "Running" : status === "error" ? "Error" : "Idle";

  return (
    <span className="mr-2 flex items-center gap-1.5 text-[12px] text-charcoal-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
