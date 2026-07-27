"use client";

import { useCallback, useRef, useState } from "react";
import { Toolbar } from "@/components/simulator/Toolbar";
import { ComponentPalette } from "@/components/simulator/ComponentPalette";
import { BoardCanvas } from "@/components/simulator/BoardCanvas";
import { CodeEditor } from "@/components/simulator/CodeEditor";
import { SerialMonitor } from "@/components/simulator/SerialMonitor";
import { SketchEngine } from "@/lib/simulation/engine";
import { BOARDS } from "@/lib/simulation/boards";
import {
  BoardId,
  ComponentType,
  EngineStatus,
  PinStateMap,
  PlacedComponent,
  SerialLine,
} from "@/lib/simulation/types";

let nextInstanceId = 1;
let nextSerialId = 1;

export default function SimulatorPage() {
  const [boardId, setBoardId] = useState<BoardId>("uno");
  const [code, setCode] = useState(BOARDS.uno.defaultSketch);
  const [components, setComponents] = useState<PlacedComponent[]>([]);
  const [pinStates, setPinStates] = useState<PinStateMap>({});
  const [serialLines, setSerialLines] = useState<SerialLine[]>([]);
  const [status, setStatus] = useState<EngineStatus>("idle");
  const engineRef = useRef<SketchEngine | null>(null);

  const handleBoardChange = useCallback((id: BoardId) => {
    setBoardId(id);
    setCode(BOARDS[id].defaultSketch);
    setComponents([]);
    setPinStates({});
  }, []);

  const handleAdd = useCallback((type: ComponentType, x: number, y: number) => {
    setComponents((prev) => [
      ...prev,
      { instanceId: `c${nextInstanceId++}`, type, x, y, pin: null },
    ]);
  }, []);

  const handleAddDefault = useCallback(
    (type: ComponentType) => handleAdd(type, 50, 50),
    [handleAdd]
  );

  const handleMove = useCallback((instanceId: string, x: number, y: number) => {
    setComponents((prev) =>
      prev.map((c) => (c.instanceId === instanceId ? { ...c, x, y } : c))
    );
  }, []);

  const handleSetPin = useCallback((instanceId: string, pin: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.instanceId === instanceId ? { ...c, pin: pin || null } : c))
    );
  }, []);

  const handleRemove = useCallback((instanceId: string) => {
    setComponents((prev) => prev.filter((c) => c.instanceId !== instanceId));
  }, []);

  const handleRun = useCallback(() => {
    engineRef.current?.stop();
    setSerialLines([]);
    const engine = new SketchEngine(code, (event) => {
      if (event.type === "pin-change" && event.pin) {
        setPinStates((prev) => ({ ...prev, [event.pin as string]: event.value ?? 0 }));
      }
      if (event.type === "serial" && event.text !== undefined) {
        setSerialLines((prev) => [
          ...prev,
          { id: nextSerialId++, text: event.text as string, timestamp: Date.now() },
        ]);
      }
      if (event.type === "status" && event.status) {
        setStatus(event.status);
      }
      if (event.type === "error" && event.message) {
        setSerialLines((prev) => [
          ...prev,
          { id: nextSerialId++, text: `⚠ ${event.message}`, timestamp: Date.now() },
        ]);
      }
    });
    engineRef.current = engine;
    engine.start();
  }, [code]);

  const handleStop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.stop();
    setPinStates({});
    setSerialLines([]);
    setStatus("idle");
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        boardId={boardId}
        status={status}
        onBoardChange={handleBoardChange}
        onRun={handleRun}
        onStop={handleStop}
        onReset={handleReset}
      />

      <div className="flex flex-1 overflow-hidden">
        <ComponentPalette onAdd={handleAddDefault} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 border-r border-hairline">
              <BoardCanvas
                boardId={boardId}
                components={components}
                pinStates={pinStates}
                onAdd={handleAdd}
                onMove={handleMove}
                onSetPin={handleSetPin}
                onRemove={handleRemove}
              />
            </div>
            <div className="w-[420px] shrink-0">
              <CodeEditor value={code} onChange={setCode} readOnly={status === "running"} />
            </div>
          </div>
          <div className="h-[180px] shrink-0">
            <SerialMonitor lines={serialLines} />
          </div>
        </div>
      </div>
    </div>
  );
}
