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
} from "./constants";
import { DesktopOnlyNotice } from "@/components/shared/DesktopOnlyNotice";
import { SketchEngine } from "@/lib/simulation/engine";
import { ESP32_DEFAULT_SKETCH } from "@/lib/simulation/boards";
import type { EngineEvent } from "@/lib/simulation/types";
import type { SerialLine } from "@/lib/simulation/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { api, ApiError } from "@/lib/api/client";
import type { Project } from "@ds-simboard/shared-types";
import { CanvasSurface } from "./components/CanvasSurface";
import { BreadboardGlyph } from "./components/BreadboardGlyph";
import { BoardGlyph } from "./components/BoardGlyph";
import { ComponentGlyph } from "./components/ComponentGlyph";
import { GlobalWireLayer, CANVAS_SIZE } from "./components/GlobalWireLayer";
import { PartsPalette } from "./components/PartsPalette";
import { Inspector } from "./components/Inspector";
import { BoardInspector } from "./components/BoardInspector";
import { CircuitHealthPanel } from "./components/CircuitHealthPanel";
import { StatusBanner } from "./components/StatusBanner";
import { AuthModal } from "./components/AuthModal";
import { ProjectsModal } from "./components/ProjectsModal";
import { PowerSupplyIcon } from "./components/glyphs/PowerSupplyIcon";
import type { InteractionMode } from "./model/interactionMode";
import type { ConnectionPointRef } from "./model/connectionPoint";
import { componentHealthEquals, resolveCircuit } from "./model/resolveCircuit";
import { boardPinElectricalStates } from "./model/boardBridge";
import { BOARD_DIGITAL_PINS, BOARD_LOGIC_VOLTAGE } from "./model/boardPins";
import { COMPONENT_LEAD_NAMES } from "./model/componentPinLayouts";
import { serializeCanvas, type CanvasSnapshot } from "./model/persistence";
import type { PaletteDragPayload } from "./model/dragPayload";
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

function selfLead(componentId: string, leadName: string): ConnectionPointRef {
  return { kind: "componentLead", componentItemId: componentId, leadName };
}

/**
 * Builds a freshly-placed component at `position` (Part 2, docs/
 * architecture/0036-*.md) — every lead starts wired to nothing but
 * itself (`selfLead`), exactly like a real part fresh out of a parts
 * bin: it physically exists, on the canvas, at a real position, but
 * carries no electrical connection until the user draws a wire from
 * one of its leads to a hole, a board pin, or another component's own
 * lead. Supersedes the old version, which took the *already-clicked*
 * hole/pin sequence as its leads — there's no such sequence any more,
 * since placing a component is now a single click/drop, not N clicks.
 */
function createComponent(
  presetId: string,
  position: { x: number; y: number }
): PlacedComponent {
  const preset = PART_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new RangeError(`no palette preset with id "${presetId}"`);
  }
  const id = `${preset.type}-${nextId++}`;
  const health = NOMINAL_HEALTH;
  const leadNames = COMPONENT_LEAD_NAMES[preset.type];
  const lead = (name: string) => selfLead(id, name);

  if (preset.type === "rgbLed") {
    return {
      id,
      type: preset.type,
      params: preset.params,
      position,
      commonLead: lead(leadNames[0]),
      redLead: lead(leadNames[1]),
      greenLead: lead(leadNames[2]),
      blueLead: lead(leadNames[3]),
      health: { red: health, green: health, blue: health },
    };
  }
  if (preset.type === "sevenSegmentDisplay") {
    const segmentLeads = {} as Record<SevenSegmentName, ConnectionPointRef>;
    const segmentHealth = {} as Record<SevenSegmentName, typeof health>;
    SEVEN_SEGMENT_NAMES.forEach((name) => {
      segmentLeads[name] = lead(name);
      segmentHealth[name] = health;
    });
    return {
      id,
      type: preset.type,
      params: preset.params,
      position,
      commonLead: lead("common"),
      segmentLeads,
      health: segmentHealth,
    };
  }
  if (preset.type === "transistor") {
    return {
      id,
      type: preset.type,
      params: preset.params,
      position,
      baseLead: lead("base"),
      collectorLead: lead("collector"),
      emitterLead: lead("emitter"),
      health,
    };
  }
  if (preset.type === "relay") {
    return {
      id,
      type: preset.type,
      params: preset.params,
      position,
      coilLeadA: lead("coilA"),
      coilLeadB: lead("coilB"),
      contactLeadA: lead("contactA"),
      contactLeadB: lead("contactB"),
      health: { coil: health, contact: health },
    };
  }

  const leads: [ConnectionPointRef, ConnectionPointRef] = [
    lead(leadNames[0]),
    lead(leadNames[1]),
  ];
  switch (preset.type) {
    case "resistor":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "led":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        leadZeroIsPositive: true,
        health,
      };
    case "diode":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        leadZeroIsPositive: true,
        health,
      };
    case "pushbutton":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        pressed: false,
        health,
      };
    case "potentiometer":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        wiperPosition: 0.5,
        health,
      };
    case "buzzer":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "dcMotor":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "ldr":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        lightLevel: 0.5,
        health,
      };
    case "batteryHolder":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "motionSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        motionDetected: false,
        health,
      };
    case "soilMoistureSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        wetness: 0.5,
        health,
      };
    case "rainSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        rainLevel: 0.5,
        health,
      };
    case "soundSensor":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        loudness: 0.5,
        health,
      };
    case "dht11":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        simulatedTemperatureCelsius: 24,
        simulatedHumidityPercent: 50,
        health,
      };
    case "inductor":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "ferriteBead":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "fastBlowFuse":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "resettableFuse":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "idealConnector":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "liIonCell":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "usbPowerBreakout":
      return { id, type: preset.type, params: preset.params, position, leads, health };
    case "solarPanel":
      return {
        id,
        type: preset.type,
        params: preset.params,
        position,
        leads,
        sunlightLevel: 0.5,
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
  const [selectedBreadboardId, setSelectedBreadboardId] = useState<string | null>(null);
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

  // Save/load against apps/api (P2-5, closing ADR 0029).
  const { user, loading: authLoading, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "saved" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

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

  /** Wiring mode only now — a hole/pin/lead click while `"placingFree"`
   * doesn't reach here at all; that's the canvas *background* click
   * (`handleCanvasBackgroundClick`), since placing is a single
   * click/drop, not a sequence of point clicks (Part 2). */
  function handlePointClick(point: ConnectionPointRef) {
    if (mode.kind !== "wiring") return;

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

  /** The canvas background's own click (Part 2) — drops a `"placingFree"`
   * component at the clicked canvas-space point, or (same as before)
   * just clears every selection. */
  function handleCanvasBackgroundClick(canvasPoint: { x: number; y: number }) {
    if (mode.kind === "placingFree") {
      setComponents((prev) => [...prev, createComponent(mode.presetId, canvasPoint)]);
      setMode({ kind: "idle" });
      return;
    }
    setSelectedComponentId(null);
    setSelectedBoardId(null);
    setSelectedBreadboardId(null);
  }

  /** The canvas's native HTML5 drop handler (Part 2) — dragging a
   * preset/breadboard/board straight from the palette onto the canvas,
   * the primary placement interaction; `handleCanvasBackgroundClick`'s
   * `"placingFree"` branch is the click-then-click-canvas fallback for
   * exactly the same action. */
  function handleCanvasDrop(payloadJson: string, canvasPoint: { x: number; y: number }) {
    let payload: PaletteDragPayload;
    try {
      payload = JSON.parse(payloadJson) as PaletteDragPayload;
    } catch {
      return;
    }
    if (payload.kind === "preset") {
      setComponents((prev) => [...prev, createComponent(payload.presetId, canvasPoint)]);
    } else if (payload.kind === "breadboard") {
      handleAddBreadboard(canvasPoint);
    } else if (payload.kind === "board") {
      handleAddBoard(payload.boardType, canvasPoint);
    }
  }

  function handleBreadboardPositionChange(
    id: string,
    position: { x: number; y: number }
  ) {
    setBreadboards((prev) => prev.map((bb) => (bb.id === id ? { ...bb, position } : bb)));
  }

  function handleComponentPositionChange(id: string, position: { x: number; y: number }) {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, position } : c)));
  }

  function handleAddBreadboard(position?: { x: number; y: number }) {
    const id = `bb-${nextId++}`;
    setBreadboards((prev) => [
      ...prev,
      {
        id,
        position: position ?? { x: 60 + prev.length * 40, y: 60 + prev.length * 40 },
        columns: BREADBOARD_COLUMNS,
        pixelWidth: 720,
        pixelHeight: 360,
      },
    ]);
  }

  function handleRemoveBreadboard(id: string) {
    setBreadboards((prev) => prev.filter((bb) => bb.id !== id));
    if (selectedBreadboardId === id) setSelectedBreadboardId(null);
  }

  function handleRemoveWire(id: string) {
    setWires((prev) => prev.filter((w) => w.id !== id));
  }

  function handleRemove(id: string) {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    setWires((prev) =>
      prev.filter(
        (w) =>
          !(w.from.kind === "componentLead" && w.from.componentItemId === id) &&
          !(w.to.kind === "componentLead" && w.to.componentItemId === id)
      )
    );
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

  function handleSunlightLevelChange(id: string, sunlightLevel: number) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.type === "solarPanel" ? { ...c, sunlightLevel } : c
      )
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

  function handleAddBoard(
    boardType: PlacedBoard["boardType"],
    // Staggered by more than either board type's own tallest dimension
    // (ESP32's 300px height is the largest) so a freshly-added board
    // never spawns overlapping an earlier one regardless of which
    // combination of board types is already placed — a real, visible
    // bug an earlier ADR (0034) flagged and deferred to Part 2's
    // drag-and-drop work, now that it exists.
    position: { x: number; y: number } = {
      x: 800 + boards.length * 40,
      y: 60 + boards.length * 340,
    }
  ) {
    const id = `${boardType}-${nextId++}`;
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

  async function handleSave() {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    let project = currentProject;
    if (!project) {
      const name = window.prompt("Name this project:");
      if (!name || !name.trim()) return;
      try {
        project = await api.createProject({ name: name.trim() });
        setCurrentProject(project);
      } catch (err) {
        setSaveStatus({
          kind: "error",
          message: err instanceof ApiError ? err.message : "Couldn't create the project.",
        });
        return;
      }
    }

    setSaveStatus({ kind: "saving" });
    try {
      const snapshot = serializeCanvas({
        breadboards,
        components,
        wires,
        boards,
        supplyVoltageVolts: supplyVoltage,
        viewport,
      });
      await api.createSnapshot(project.id, snapshot);
      setSaveStatus({ kind: "saved" });
    } catch (err) {
      setSaveStatus({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Couldn't save.",
      });
    }
  }

  function handleOpenProject(project: Project, snapshot: CanvasSnapshot | null) {
    // Stop every running board's engine before replacing canvas state —
    // otherwise a still-running avr8js/SketchEngine instance from the
    // *previous* project keeps ticking against boards that no longer
    // exist in React state.
    for (const board of boards) {
      if (board.running) stopBoardEngine(board);
    }

    setCurrentProject(project);
    setSaveStatus({ kind: "idle" });
    setSelectedComponentId(null);
    setSelectedBoardId(null);
    setSelectedBreadboardId(null);

    if (snapshot) {
      setBreadboards(snapshot.breadboards);
      setComponents(snapshot.components);
      setWires(snapshot.wires);
      setBoards(snapshot.boards);
      setSupplyVoltage(snapshot.supplyVoltageVolts);
      setViewport(snapshot.viewport);
    } else {
      setBreadboards([DEFAULT_BREADBOARD]);
      setComponents([]);
      setWires([]);
      setBoards([]);
      setSupplyVoltage(DEFAULT_SUPPLY_VOLTAGE);
      setViewport(INITIAL_VIEWPORT);
    }
  }

  async function handleSignOut() {
    for (const board of boards) {
      if (board.running) stopBoardEngine(board);
    }
    await logout();
    setCurrentProject(null);
    setSaveStatus({ kind: "idle" });
  }

  const pendingPoints: ConnectionPointRef[] =
    mode.kind === "wiring" && mode.firstPoint ? [mode.firstPoint] : [];

  const selectedComponent = components.find((c) => c.id === selectedComponentId) ?? null;

  return (
    <>
      <DesktopOnlyNotice labName="Simulator" />
      <div className="hidden h-full flex-col lg:flex">
        <div className="flex items-center justify-between gap-4 border-b border-hairline bg-ivory px-4 py-3">
          <StatusBanner result={result} />
          <div className="flex items-center gap-3">
            <PowerSupplyIcon supplyVoltageVolts={supplyVoltage} />
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
            <div className="flex items-center gap-2 border-l border-hairline pl-3">
              {saveStatus.kind === "saving" && (
                <span className="text-[12px] text-charcoal-muted">Saving…</span>
              )}
              {saveStatus.kind === "saved" && (
                <span className="text-[12px] text-[#2F6E4F]">Saved</span>
              )}
              {saveStatus.kind === "error" && (
                <span className="text-[12px] text-[#8a3b3b]">{saveStatus.message}</span>
              )}
              {currentProject && (
                <span className="text-[12px] text-charcoal-muted">
                  {currentProject.name}
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="rounded-sm border border-navy bg-navy px-3 py-1.5 text-[13px] text-ivory"
              >
                Save
              </button>
              {!authLoading && user && (
                <button
                  type="button"
                  onClick={() => setShowProjectsModal(true)}
                  className="rounded-sm border border-hairline px-3 py-1.5 text-[13px] text-charcoal-muted hover:border-charcoal/25 hover:text-charcoal"
                >
                  My Projects
                </button>
              )}
              {!authLoading && user && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-[12px] text-charcoal-muted hover:text-charcoal"
                >
                  Sign out ({user.email})
                </button>
              )}
              {!authLoading && !user && (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="rounded-sm border border-hairline px-3 py-1.5 text-[13px] text-charcoal-muted hover:border-charcoal/25 hover:text-charcoal"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <PartsPalette
            mode={mode}
            onStartPlacing={(presetId) => setMode({ kind: "placingFree", presetId })}
            onStartWiring={() => setMode({ kind: "wiring" })}
            onCancel={() => setMode({ kind: "idle" })}
            onAddBoard={handleAddBoard}
            onAddBreadboard={() => handleAddBreadboard()}
          />

          <div className="flex-1">
            <CanvasSurface
              viewport={viewport}
              onViewportChange={setViewport}
              onBackgroundClick={handleCanvasBackgroundClick}
              onDropPayload={handleCanvasDrop}
            >
              <GlobalWireLayer
                wires={wires}
                entities={{ breadboards, boards, components }}
                onRemoveWire={handleRemoveWire}
              />
              {breadboards.map((bb) => (
                <BreadboardGlyph
                  key={bb.id}
                  breadboard={bb}
                  pendingPoints={pendingPoints}
                  isSelected={selectedBreadboardId === bb.id}
                  viewportScale={viewport.scale}
                  onHoleClick={handlePointClick}
                  onPositionChange={handleBreadboardPositionChange}
                  onSelect={(id) => {
                    setSelectedBreadboardId(id);
                    setSelectedComponentId(null);
                    setSelectedBoardId(null);
                  }}
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
                    setSelectedBreadboardId(null);
                  }}
                  onPositionChange={handleBoardPositionChange}
                />
              ))}
              {components.map((component) => (
                <ComponentGlyph
                  key={component.id}
                  component={component}
                  result={result.componentResults.get(component.id)}
                  isSelected={selectedComponentId === component.id}
                  isPending={(leadName) =>
                    pendingPoints.some(
                      (p) =>
                        p.kind === "componentLead" &&
                        p.componentItemId === component.id &&
                        p.leadName === leadName
                    )
                  }
                  viewportScale={viewport.scale}
                  onSelect={(id) => {
                    setSelectedComponentId(id);
                    setSelectedBoardId(null);
                    setSelectedBreadboardId(null);
                  }}
                  onLeadClick={handlePointClick}
                  onPositionChange={handleComponentPositionChange}
                />
              ))}
            </CanvasSurface>
          </div>

          {selectedBreadboardId ? (
            <CircuitHealthPanel components={components} result={result} />
          ) : selectedBoardId ? (
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
              onSunlightLevelChange={handleSunlightLevelChange}
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

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showProjectsModal && (
        <ProjectsModal
          onClose={() => setShowProjectsModal(false)}
          onOpenProject={handleOpenProject}
          currentProjectId={currentProject?.id ?? null}
        />
      )}
    </>
  );
}
