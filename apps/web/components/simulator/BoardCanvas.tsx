"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import {
  BoardId,
  ComponentType,
  PinStateMap,
  PlacedComponent,
} from "@/lib/simulation/types";
import { BOARDS } from "@/lib/simulation/boards";
import { ArduinoUno } from "@/components/simulator/boards/ArduinoUno";
import { ESP32 } from "@/components/simulator/boards/ESP32";
import { LED } from "@/components/simulator/boards/LED";
import { Servo } from "@/components/simulator/boards/Servo";
import { UltrasonicSensor } from "@/components/simulator/boards/UltrasonicSensor";
import { LCD1602 } from "@/components/simulator/boards/LCD1602";

interface BoardCanvasProps {
  boardId: BoardId;
  components: PlacedComponent[];
  pinStates: PinStateMap;
  onAdd: (type: ComponentType, x: number, y: number) => void;
  onMove: (instanceId: string, x: number, y: number) => void;
  onSetPin: (instanceId: string, pin: string) => void;
  onRemove: (instanceId: string) => void;
}

export function BoardCanvas({
  boardId,
  components,
  pinStates,
  onAdd,
  onMove,
  onSetPin,
  onRemove,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const board = BOARDS[boardId];
  const allPins = [...board.digitalPins.map(String), ...board.analogPins];

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/component-type") as ComponentType;
    if (!type || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAdd(type, clamp(x), clamp(y));
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onMove(draggingId, clamp(x), clamp(y));
  }

  return (
    <div
      ref={canvasRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDraggingId(null)}
      className="relative h-full w-full overflow-hidden bg-ivory"
      style={{
        backgroundImage: "radial-gradient(rgba(28,27,24,0.06) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="absolute left-1/2 top-1/2 h-[70%] w-[60%] -translate-x-1/2 -translate-y-1/2">
        {boardId === "uno" ? <ArduinoUno /> : <ESP32 />}
      </div>

      {components.map((component) => (
        <div
          key={component.instanceId}
          onPointerDown={() => setDraggingId(component.instanceId)}
          className="group absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center gap-1.5 active:cursor-grabbing"
          style={{ left: `${component.x}%`, top: `${component.y}%` }}
        >
          <ComponentVisual component={component} pinStates={pinStates} />

          <div className="flex items-center gap-1 rounded-sm border border-hairline bg-white px-1.5 py-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            <select
              value={component.pin ?? ""}
              onChange={(e) => onSetPin(component.instanceId, e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-transparent font-mono text-[10px] text-charcoal-muted focus-visible:outline-none"
            >
              <option value="">pin</option>
              {allPins.map((pin) => (
                <option key={pin} value={pin}>
                  {pin}
                </option>
              ))}
            </select>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRemove(component.instanceId)}
              aria-label="Remove component"
              className="text-charcoal-faint hover:text-charcoal"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ComponentVisual({
  component,
  pinStates,
}: {
  component: PlacedComponent;
  pinStates: PinStateMap;
}) {
  const value = component.pin !== null ? pinStates[String(component.pin)] : undefined;

  switch (component.type) {
    case "led":
      return <LED on={(value ?? 0) > 0} />;
    case "servo":
      return <Servo angle={Math.round(((value ?? 0) / 255) * 180)} />;
    case "ultrasonic":
      return <UltrasonicSensor distanceCm={undefined} />;
    case "lcd1602":
      return <LCD1602 lines={["Ready", ""]} />;
    default:
      return null;
  }
}

function clamp(n: number) {
  return Math.min(96, Math.max(4, n));
}
