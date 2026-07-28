import {
  CANVAS_SNAPSHOT_VERSION,
  deserializeCanvas,
  serializeCanvas,
} from "./persistence";
import { INITIAL_VIEWPORT } from "./viewport";
import type { PlacedArduinoUno, PlacedBreadboard } from "./types";

const breadboard: PlacedBreadboard = {
  id: "bb-1",
  position: { x: 60, y: 60 },
  columns: 20,
  pixelWidth: 720,
  pixelHeight: 360,
};

const runningBoard: PlacedArduinoUno = {
  id: "uno-1",
  boardType: "arduinoUno",
  position: { x: 800, y: 60 },
  program: "blink",
  running: true,
};

const baseState = {
  breadboards: [breadboard],
  components: [],
  wires: [],
  boards: [runningBoard],
  supplyVoltageVolts: 5,
  viewport: INITIAL_VIEWPORT,
};

describe("serializeCanvas / deserializeCanvas — round trip", () => {
  it("round-trips breadboards, components, wires, supply voltage, and viewport unchanged", () => {
    const snapshot = serializeCanvas(baseState);
    const result = deserializeCanvas(snapshot);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.snapshot.breadboards).toEqual([breadboard]);
    expect(result.snapshot.supplyVoltageVolts).toBe(5);
    expect(result.snapshot.viewport).toEqual(INITIAL_VIEWPORT);
    expect(result.snapshot.version).toBe(CANVAS_SNAPSHOT_VERSION);
  });

  it("forces every board's running state to false on load, regardless of what was saved", () => {
    const snapshot = serializeCanvas(baseState);
    expect(snapshot.boards[0].running).toBe(true); // saved as-is

    const result = deserializeCanvas(snapshot);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.snapshot.boards[0].running).toBe(false);
  });
});

describe("deserializeCanvas — malformed input", () => {
  it("rejects a non-object", () => {
    const result = deserializeCanvas("not an object");
    expect(result.status).toBe("error");
  });

  it("rejects null", () => {
    const result = deserializeCanvas(null);
    expect(result.status).toBe("error");
  });

  it("rejects an unsupported version", () => {
    const snapshot = serializeCanvas(baseState);
    const result = deserializeCanvas({ ...snapshot, version: 999 });
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.message).toContain("unsupported version");
  });

  it("rejects a payload missing a required array field", () => {
    const snapshot = serializeCanvas(baseState);
    const { components: _components, ...withoutComponents } = snapshot;
    const result = deserializeCanvas(withoutComponents);
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.message).toContain("components");
  });

  it("rejects a payload missing supplyVoltageVolts", () => {
    const snapshot = serializeCanvas(baseState);
    const { supplyVoltageVolts: _supplyVoltageVolts, ...withoutVoltage } = snapshot;
    const result = deserializeCanvas(withoutVoltage);
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.message).toContain("supplyVoltageVolts");
  });

  it("rejects a payload missing viewport", () => {
    const snapshot = serializeCanvas(baseState);
    const { viewport: _viewport, ...withoutViewport } = snapshot;
    const result = deserializeCanvas(withoutViewport);
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.message).toContain("viewport");
  });
});
