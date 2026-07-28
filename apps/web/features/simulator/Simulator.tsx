"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AtmegaRuntime,
  BLINK_PROGRAM,
  DIGITAL_PASSTHROUGH_PROGRAM,
} from "@ds-simboard/chip-emulation";
import {
  BREADBOARD_COLUMNS,
  DEFAULT_SUPPLY_VOLTAGE,
  NOMINAL_HEALTH,
  PART_PRESETS,
  presetLeadNames,
} from "./constants";
import { DesktopOnlyNotice } from "@/components/shared/DesktopOnlyNotice";
import { SketchEngine } from "@/lib/simulation/engine";
import { ESP32_DEFAULT_SKETCH } from "@/lib/simulation/boards";
import type { EngineEvent } from "@/lib/simulation/types";
import type { SerialLine } from "@/lib/simulation/types";
import { CanvasSurface } from "./components/CanvasSurface";
import { BreadboardGlyph } from "./components/BreadboardGlyph";
import { BoardGlyph } from "./components/BoardGlyph";
import { PartsPalette } from "./components/PartsPalette";
import { Inspector } from "./components/Inspector";
import { BoardInspector } from "./components/BoardInspector";
import { StatusBanner } from "./components/StatusBanner";
import type { InteractionMode } from "./model/interactionMode";
import type { ConnectionPointRef } from "./model/connectionPoint";
import { componentHealthEquals, resolveCircuit } from "./model/resolveCircuit";
import { boardPinElectricalStates } from "./model/boardBridge";
import { BOARD_DIGITAL_PINS, BOARD_LOGIC_VOLTAGE } from "./model/boardPins";
import { SEVEN_SEGMENT_NAMES } from "./model/types";
import type {
  BoardPinElectricalState,
  CanvasWireModel,
  PlacedArduinoUno,
  PlacedBoard,
  PlacedBreadboard,
  PlacedComponent,
  SevenSegmentName,
} from "./model/types";
import { INITIAL_VIEWPORT, type CanvasViewport } from "./model/viewport";

let nextId = 1;

const DEFAULT_BREADBOARD: PlacedBreadboard = {
  id: "bb-1",
  position: { x: 60, y: 60 },
  columns: BREADBOARD_COLUMNS,
  pixelWidth: 720,
  pixelHeight: 360,
};

function createComponent(
  presetId: string,
  points: ConnectionPointRef[]
): PlacedComponent {
  const preset = PART_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new RangeError(`no palette preset with id "${presetId}"`);
  }
  const id = `${preset.type}-${nextId++}`;
  const health = NOMINAL_HEALTH;

  if (preset.type === "rgbLed") {
    const [commonLead, redLead, greenLead, blueLead] = points;
    return {
      id,
      type: preset.type,
      params: preset.params,
      commonLead,
      redLead,
      greenLead,
      blueLead,
      health: { red: health, green: health, blue: health },
    };
  }
  if (preset.type === "sevenSegmentDisplay") {
    const [commonLead, ...segmentPoints] = points;
    const segmentLeads = {} as Record<SevenSegmentName, ConnectionPointRef>;
    const segmentHealth = {} as Record<SevenSegmentName, typeof health>;
    SEVEN_SEGMENT_NAMES.forEach((name, index) => {
      segmentLeads[name] = segmentPoints[index];
      segmentHealth[name] = health;
    });
    return {
      id,
      type: preset.type,
      params: preset.params,
      commonLead,
      segmentLeads,
      health: segmentHealth,
    };
  }
  if (preset.type === "transistor") {
    const [baseLead, collectorLead, emitterLead] = points;
    return {
      id,
      type: preset.type,
      params: preset.params,
      baseLead,
      collectorLead,
      emitterLead,
      health,
    };
  }
  if (preset.type === "relay") {
    const [coilLeadA, coilLeadB, contactLeadA, contactLeadB] = points;
    return {
      id,
      type: preset.type,
      params: preset.params,
      coilLeadA,
      coilLeadB,
      contactLeadA,
      contactLeadB,
      health: { coil: health, contact: health },
    };
  }

  const leads = points as [ConnectionPointRef, ConnectionPointRef];
  switch (preset.type) {
    case "resistor":
      return { id, type: preset.type, params: preset.params, leads, health };
    case "led":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        leadZeroIsPositive: true,
        health,
      };
    case "diode":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        leadZeroIsPositive: true,
        health,
      };
    case "pushbutton":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        pressed: false,
        health,
      };
    case "potentiometer":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        wiperPosition: 0.5,
        health,
      };
    case "buzzer":
      return { id, type: preset.type, params: preset.params, leads, health };
    case "dcMotor":
      return { id, type: preset.type, params: preset.params, leads, health };
    case "ldr":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        lightLevel: 0.5,
        health,
      };
    case "batteryHolder":
      return { id, type: preset.type, params: preset.params, leads, health };
    case "motionSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        motionDetected: false,
        health,
      };
    case "soilMoistureSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        wetness: 0.5,
        health,
      };
    case "rainSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        rainLevel: 0.5,
        health,
      };
    case "soundSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        loudness: 0.5,
        health,
      };
    case "dht11":
      return {
        id,
        type: preset.type,
        params: preset.params,
        leads,
        simulatedTemperatureCelsius: 24,
        simulatedHumidityPercent: 50,
        health,
      };
  }
}

export function Simulator() {
  const [breadboards, setBreadboards] = useState<PlacedBreadboard[]>([
    DEFAULT_BREADBOARD,
  ]);
  const [components, setComponents] = useState<PlacedComponent[]>([]);
  const [wires, setWires] = useState<CanvasWireModel[]>([]);
  const [boards, setBoards] = useState<PlacedBoard[]>([]);
  const [supplyVoltage, setSupplyVoltage] = useState(DEFAULT_SUPPLY_VOLTAGE);
  const [mode, setMode] = useState<InteractionMode>({ kind: "idle" });
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<CanvasViewport>(INITIAL_VIEWPORT);

  // Every board's real running engine and per-tick electrical state
  // (P2-3, docs/architecture/0027-*.md) — engines are stateful, non-
  // serializable class instances (a real `avr8js` CPU / `SketchEngine`
  // interpreter), so they live in refs, not React state.
  const unoRuntimes = useRef(new Map<string, AtmegaRuntime>());
  const esp32Engines = useRef(new Map<string, SketchEngine>());
  const esp32LastWritten = useRef(new Map<string, Map<string, number>>());
  const boardsRef = useRef(boards);
  boardsRef.current = boards;
  const [boardPinStates, setBoardPinStates] = useState<
    Map<string, BoardPinElectricalState>
  >(new Map());
  const [esp32SerialLines, setEsp32SerialLines] = useState<Map<string, SerialLine[]>>(
    new Map()
  );

  const result = useMemo(
    () =>
      resolveCircuit(
        breadboards,
        components,
        wires,
        supplyVoltage,
        boards,
        boardPinStates
      ),
    [breadboards, components, wires, supplyVoltage, boards, boardPinStates]
  );

  // The live simulation loop (P2-3): while any board is running, every
  // animation frame steps each running Arduino Uno's real avr8js CPU a
  // bounded instruction slice (ESP32's SketchEngine self-drives via its
  // own delay()-chained async loop — it needs no external stepping), then
  // recomputes every board's real per-tick pin states from that engine and
  // feeds them into React state so `resolveCircuit` re-resolves against
  // them. Only depends on which boards are running (not `boards` itself,
  // e.g. a drag-driven position change), so it doesn't restart on every
  // unrelated board-state change.
  const runningBoardsKey = boards
    .filter((b) => b.running)
    .map((b) => b.id)
    .join(",");
  useEffect(() => {
    if (!runningBoardsKey) return;
    let rafId: number;
    function tick() {
      for (const board of boardsRef.current) {
        if (board.boardType === "arduinoUno" && board.running) {
          unoRuntimes.current.get(board.id)?.runInstructions(26_000);
        }
      }

      const states = new Map<string, BoardPinElectricalState>();
      for (const board of boardsRef.current) {
        const reader =
          board.boardType === "arduinoUno"
            ? {
                digitalPinMode: (pin: number) =>
                  unoRuntimes.current.get(board.id)?.digitalPinMode(pin) ?? "input",
                digitalPinValue: (pin: number) =>
                  unoRuntimes.current.get(board.id)?.digitalPinValue(pin) ?? 0,
              }
            : {
                lastWrittenValue: (pinName: string) =>
                  esp32LastWritten.current.get(board.id)?.get(pinName),
              };
        for (const [pinName, state] of boardPinElectricalStates(board, reader)) {
          states.set(`${board.id}:${pinName}`, state);
        }
      }
      setBoardPinStates(states);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [runningBoardsKey]);

  // Closes the loop's input direction (Arduino Uno only, ADR 0027): after
  // each resolve, push every input-configured pin's real, just-solved
  // node voltage back into the CPU via `setDigitalInput`, so the *next*
  // frame's step genuinely reads it back out through a real instruction.
  useEffect(() => {
    if (result.status !== "solved") return;
    for (const board of boards) {
      if (board.boardType !== "arduinoUno" || !board.running) continue;
      const runtime = unoRuntimes.current.get(board.id);
      if (!runtime) continue;
      for (const pin of BOARD_DIGITAL_PINS.arduinoUno) {
        if (runtime.digitalPinMode(pin) !== "input") continue;
        const voltage = result.boardPinVoltages.get(`${board.id}:D${pin}`) ?? 0;
        runtime.setDigitalInput(pin, voltage > BOARD_LOGIC_VOLTAGE.arduinoUno / 2);
      }
    }
  }, [result, boards]);

  // Health latches inside resolveCircuit's per-tick output — persist any
  // newly-changed health back into component state so it survives the
  // *next* resolve, same "failed stays failed" contract as Breadboard Lab.
  // `componentHealthEquals` handles both a plain HealthState and a
  // multi-lead part's per-channel health record (P2-2).
  useEffect(() => {
    setComponents((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const updated = result.componentResults.get(c.id);
        if (updated && !componentHealthEquals(updated.health, c.health)) {
          changed = true;
          return { ...c, health: updated.health } as PlacedComponent;
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [result]);

  function handlePointClick(point: ConnectionPointRef) {
    if (mode.kind === "idle") return;

    if (mode.kind === "placing") {
      const preset = PART_PRESETS.find((p) => p.id === mode.presetId);
      const neededLeads = preset ? presetLeadNames(preset).length : 2;
      const collectedPoints = [...mode.collectedPoints, point];
      if (collectedPoints.length < neededLeads) {
        setMode({ ...mode, collectedPoints });
        return;
      }
      setComponents((prev) => [...prev, createComponent(mode.presetId, collectedPoints)]);
      setMode({ kind: "idle" });
      return;
    }

    if (!mode.firstPoint) {
      setMode({ ...mode, firstPoint: point });
      return;
    }
    setWires((prev) => [
      ...prev,
      { id: `wire-${nextId++}`, from: mode.firstPoint as ConnectionPointRef, to: point },
    ]);
    setMode({ kind: "idle" });
  }

  function handleBreadboardPositionChange(
    id: string,
    position: { x: number; y: number }
  ) {
    setBreadboards((prev) => prev.map((bb) => (bb.id === id ? { ...bb, position } : bb)));
  }

  function handleRemove(id: string) {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    if (selectedComponentId === id) setSelectedComponentId(null);
  }

  function handleTogglePressed(id: string) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "pushbutton" ? { ...c, pressed: !c.pressed } : c
      )
    );
  }

  function handleWiperChange(id: string, wiperPosition: number) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "potentiometer" ? { ...c, wiperPosition } : c
      )
    );
  }

  function handleLightLevelChange(id: string, lightLevel: number) {
    setComponents((prev) =>
      prev.map((c) => (c.id === id && c.type === "ldr" ? { ...c, lightLevel } : c))
    );
  }

  function handleMotionToggle(id: string) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "motionSensor"
          ? { ...c, motionDetected: !c.motionDetected }
          : c
      )
    );
  }

  function handleWetnessChange(id: string, wetness: number) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "soilMoistureSensor" ? { ...c, wetness } : c
      )
    );
  }

  function handleRainLevelChange(id: string, rainLevel: number) {
    setComponents((prev) =>
      prev.map((c) => (c.id === id && c.type === "rainSensor" ? { ...c, rainLevel } : c))
    );
  }

  function handleLoudnessChange(id: string, loudness: number) {
    setComponents((prev) =>
      prev.map((c) => (c.id === id && c.type === "soundSensor" ? { ...c, loudness } : c))
    );
  }

  function handleTemperatureChange(id: string, simulatedTemperatureCelsius: number) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "dht11" ? { ...c, simulatedTemperatureCelsius } : c
      )
    );
  }

  function handleHumidityChange(id: string, simulatedHumidityPercent: number) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "dht11" ? { ...c, simulatedHumidityPercent } : c
      )
    );
  }

  function handleReset() {
    setComponents([]);
    setWires([]);
    setMode({ kind: "idle" });
    setSelectedComponentId(null);
  }

  function handleAddBoard(boardType: PlacedBoard["boardType"]) {
    const id = `${boardType}-${nextId++}`;
    const position = { x: 800, y: 60 + boards.length * 60 };
    const board: PlacedBoard =
      boardType === "arduinoUno"
        ? { id, boardType, position, program: "blink", running: false }
        : { id, boardType, position, sketch: ESP32_DEFAULT_SKETCH, running: false };
    setBoards((prev) => [...prev, board]);
  }

  function handleBoardPositionChange(id: string, position: { x: number; y: number }) {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, position } : b)));
  }

  function stopBoardEngine(board: PlacedBoard) {
    if (board.boardType === "arduinoUno") {
      unoRuntimes.current.get(board.id)?.stop();
      unoRuntimes.current.delete(board.id);
    } else {
      esp32Engines.current.get(board.id)?.stop();
      esp32Engines.current.delete(board.id);
      esp32LastWritten.current.delete(board.id);
    }
  }

  function handleEsp32Event(boardId: string, event: EngineEvent) {
    if (
      event.type === "pin-change" &&
      event.pin !== undefined &&
      event.value !== undefined
    ) {
      const pinMap = esp32LastWritten.current.get(boardId) ?? new Map<string, number>();
      pinMap.set(`D${event.pin}`, event.value);
      esp32LastWritten.current.set(boardId, pinMap);
    }
    if (event.type === "serial" && event.text !== undefined) {
      setEsp32SerialLines((prev) => {
        const next = new Map(prev);
        const lines = next.get(boardId) ?? [];
        next.set(boardId, [
          ...lines,
          { id: lines.length, text: event.text as string, timestamp: Date.now() },
        ]);
        return next;
      });
    }
    if (
      event.type === "status" &&
      (event.status === "stopped" || event.status === "error")
    ) {
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, running: false } : b))
      );
    }
  }

  function handleBoardRunToggle(id: string) {
    const board = boards.find((b) => b.id === id);
    if (!board) return;

    if (board.running) {
      stopBoardEngine(board);
      setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, running: false } : b)));
      return;
    }

    if (board.boardType === "arduinoUno") {
      const program =
        board.program === "blink" ? BLINK_PROGRAM : DIGITAL_PASSTHROUGH_PROGRAM;
      const runtime = new AtmegaRuntime(program, () => {});
      runtime.start();
      unoRuntimes.current.set(id, runtime);
    } else {
      esp32LastWritten.current.set(id, new Map());
      setEsp32SerialLines((prev) => new Map(prev).set(id, []));
      const engine = new SketchEngine(board.sketch, (event) =>
        handleEsp32Event(id, event)
      );
      esp32Engines.current.set(id, engine);
      void engine.start();
    }
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, running: true } : b)));
  }

  function handleBoardProgramChange(id: string, program: PlacedArduinoUno["program"]) {
    setBoards((prev) =>
      prev.map((b) =>
        b.id === id && b.boardType === "arduinoUno" ? { ...b, program } : b
      )
    );
  }

  function handleBoardSketchChange(id: string, sketch: string) {
    setBoards((prev) =>
      prev.map((b) => (b.id === id && b.boardType === "esp32" ? { ...b, sketch } : b))
    );
  }

  function handleBoardRemove(id: string) {
    const board = boards.find((b) => b.id === id);
    if (board?.running) stopBoardEngine(board);
    setBoards((prev) => prev.filter((b) => b.id !== id));
    if (selectedBoardId === id) setSelectedBoardId(null);
  }

  const pendingPoints: ConnectionPointRef[] =
    mode.kind === "placing"
      ? mode.collectedPoints
      : mode.kind === "wiring" && mode.firstPoint
        ? [mode.firstPoint]
        : [];

  const selectedComponent = components.find((c) => c.id === selectedComponentId) ?? null;

  return (
    <>
      <DesktopOnlyNotice labName="Simulator" />
      <div className="hidden h-full flex-col lg:flex">
        <div className="flex items-center justify-between gap-4 border-b border-hairline bg-ivory px-4 py-3">
          <StatusBanner result={result} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] text-charcoal-muted">
              Supply
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={supplyVoltage}
                onChange={(e) => setSupplyVoltage(Number(e.target.value))}
                className="w-16 rounded-sm border border-hairline px-2 py-1 text-[13px] text-charcoal"
              />
              V
            </label>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-sm border border-hairline px-3 py-1.5 text-[13px] text-charcoal-muted hover:border-charcoal/25 hover:text-charcoal"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <PartsPalette
            mode={mode}
            onStartPlacing={(presetId) =>
              setMode({ kind: "placing", presetId, collectedPoints: [] })
            }
            onStartWiring={() => setMode({ kind: "wiring" })}
            onCancel={() => setMode({ kind: "idle" })}
            onAddBoard={handleAddBoard}
          />

          <div className="flex-1">
            <CanvasSurface
              viewport={viewport}
              onViewportChange={setViewport}
              onBackgroundClick={() => {
                setSelectedComponentId(null);
                setSelectedBoardId(null);
              }}
            >
              {breadboards.map((bb) => (
                <BreadboardGlyph
                  key={bb.id}
                  breadboard={bb}
                  components={components}
                  wires={wires}
                  componentResults={result.componentResults}
                  pendingPoints={pendingPoints}
                  selectedComponentId={selectedComponentId}
                  viewportScale={viewport.scale}
                  onHoleClick={handlePointClick}
                  onComponentClick={(id) => {
                    setSelectedComponentId(id);
                    setSelectedBoardId(null);
                  }}
                  onPositionChange={handleBreadboardPositionChange}
                />
              ))}
              {boards.map((board) => (
                <BoardGlyph
                  key={board.id}
                  board={board}
                  isPending={(pinName) =>
                    pendingPoints.some(
                      (p) =>
                        p.kind === "boardPin" &&
                        p.boardItemId === board.id &&
                        p.pinName === pinName
                    )
                  }
                  isSelected={selectedBoardId === board.id}
                  viewportScale={viewport.scale}
                  onPinClick={handlePointClick}
                  onSelect={(id) => {
                    setSelectedBoardId(id);
                    setSelectedComponentId(null);
                  }}
                  onPositionChange={handleBoardPositionChange}
                />
              ))}
            </CanvasSurface>
          </div>

          {selectedBoardId ? (
            <BoardInspector
              board={boards.find((b) => b.id === selectedBoardId) ?? null}
              serialLines={esp32SerialLines.get(selectedBoardId) ?? []}
              onRunToggle={handleBoardRunToggle}
              onProgramChange={handleBoardProgramChange}
              onSketchChange={handleBoardSketchChange}
              onRemove={handleBoardRemove}
            />
          ) : (
            <Inspector
              component={selectedComponent}
              result={
                selectedComponentId
                  ? result.componentResults.get(selectedComponentId)
                  : undefined
              }
              onTogglePressed={handleTogglePressed}
              onWiperChange={handleWiperChange}
              onLightLevelChange={handleLightLevelChange}
              onMotionToggle={handleMotionToggle}
              onWetnessChange={handleWetnessChange}
              onRainLevelChange={handleRainLevelChange}
              onLoudnessChange={handleLoudnessChange}
              onTemperatureChange={handleTemperatureChange}
              onHumidityChange={handleHumidityChange}
              onRemove={handleRemove}
            />
          )}
        </div>
      </div>
    </>
  );
}
