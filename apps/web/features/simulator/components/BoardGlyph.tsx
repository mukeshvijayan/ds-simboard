"use client";

import { useRef } from "react";
import { ArduinoUno } from "@/components/simulator/boards/ArduinoUno";
import { ESP32 } from "@/components/simulator/boards/ESP32";
import { BOARD_LABELS, BOARD_PIN_LAYOUTS } from "../model/boardPins";
import type { ConnectionPointRef } from "../model/connectionPoint";
import type { PlacedBoard } from "../model/types";

const BOARD_PIXEL_SIZE: Record<
  PlacedBoard["boardType"],
  { width: number; height: number }
> = {
  arduinoUno: { width: 320, height: 200 },
  esp32: { width: 220, height: 300 },
};

/**
 * A board placed on the canvas (P2-3, closing ADR 0027) — a draggable
 * item like a breadboard, whose pins are real, individually clickable
 * `{kind: "boardPin"}` connection points laid out over the kept board art
 * (`ArduinoUno`/`ESP32`, from the retired Arduino/ESP32 Labs) at the exact
 * same percentage positions that art already draws its headers at
 * (`model/boardPins.ts`).
 */
export function BoardGlyph({
  board,
  isPending,
  isSelected,
  viewportScale,
  onPinClick,
  onSelect,
  onPositionChange,
}: {
  board: PlacedBoard;
  isPending: (pinName: string) => boolean;
  isSelected: boolean;
  viewportScale: number;
  onPinClick: (point: ConnectionPointRef) => void;
  onSelect: (id: string) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
}) {
  const dragStart = useRef<{
    clientX: number;
    clientY: number;
    position: { x: number; y: number };
  } | null>(null);
  const { width, height } = BOARD_PIXEL_SIZE[board.boardType];
  const pins = BOARD_PIN_LAYOUTS[board.boardType];

  function handleMouseDown(event: React.MouseEvent) {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    dragStart.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      position: board.position,
    };
  }

  function handleMouseMove(event: React.MouseEvent) {
    if (!dragStart.current) return;
    event.stopPropagation();
    const dx = (event.clientX - dragStart.current.clientX) / viewportScale;
    const dy = (event.clientY - dragStart.current.clientY) / viewportScale;
    onPositionChange(board.id, {
      x: dragStart.current.position.x + dx,
      y: dragStart.current.position.y + dy,
    });
  }

  function endDrag() {
    dragStart.current = null;
  }

  return (
    <div
      role="group"
      aria-label={`${BOARD_LABELS[board.boardType]} — drag to move`}
      className={`absolute cursor-grab rounded-sm p-1 active:cursor-grabbing ${
        isSelected ? "ring-2 ring-navy ring-offset-1" : ""
      }`}
      style={{ left: board.position.x, top: board.position.y, width, height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onClick={() => onSelect(board.id)}
    >
      <div className="pointer-events-none absolute inset-0">
        {board.boardType === "arduinoUno" ? <ArduinoUno /> : <ESP32 />}
      </div>
      {pins.map((pin) => (
        <button
          key={pin.name}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPinClick({ kind: "boardPin", boardItemId: board.id, pinName: pin.name });
          }}
          aria-label={`${BOARD_LABELS[board.boardType]} pin ${pin.name}`}
          aria-pressed={isPending(pin.name)}
          className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors focus-visible:z-10 ${
            isPending(pin.name)
              ? "border-navy bg-navy ring-2 ring-navy ring-offset-1"
              : "border-charcoal/40 bg-white/70 hover:border-navy hover:bg-navy/10"
          }`}
          style={{ left: `${pin.xPercent}%`, top: `${pin.yPercent}%` }}
        />
      ))}
      {board.running && (
        <span
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#4CAF6D]"
          aria-label="Running"
          title="Running"
        />
      )}
    </div>
  );
}
