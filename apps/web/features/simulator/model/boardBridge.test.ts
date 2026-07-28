import { boardPinElectricalStates } from "./boardBridge";
import type { PlacedArduinoUno, PlacedEsp32 } from "./types";

function unoBoard(running: boolean): PlacedArduinoUno {
  return {
    id: "uno-1",
    boardType: "arduinoUno",
    position: { x: 0, y: 0 },
    program: "blink",
    running,
  };
}

function esp32Board(running: boolean): PlacedEsp32 {
  return {
    id: "esp32-1",
    boardType: "esp32",
    position: { x: 0, y: 0 },
    sketch: "",
    running,
  };
}

describe("boardPinElectricalStates — a board that isn't running", () => {
  it("reports every digital pin open, for either board type", () => {
    const unoStates = boardPinElectricalStates(unoBoard(false), {
      digitalPinMode: () => "output",
      digitalPinValue: () => 1,
    });
    expect(unoStates.get("D13")).toEqual({ kind: "open" });

    const esp32States = boardPinElectricalStates(esp32Board(false), {
      lastWrittenValue: () => 1,
    });
    expect(esp32States.get("D2")).toEqual({ kind: "open" });
  });
});

describe("boardPinElectricalStates — Arduino Uno, running", () => {
  it("reports an output-configured pin as driving, at its real level", () => {
    const states = boardPinElectricalStates(unoBoard(true), {
      digitalPinMode: (pin) => (pin === 13 ? "output" : "input"),
      digitalPinValue: () => 1,
    });
    expect(states.get("D13")).toEqual({ kind: "driving", isHigh: true });
  });

  it("reports an input-configured pin as open, regardless of its PIN register value", () => {
    const states = boardPinElectricalStates(unoBoard(true), {
      digitalPinMode: () => "input",
      digitalPinValue: () => 1,
    });
    expect(states.get("D2")).toEqual({ kind: "open" });
  });

  it("reports a driving LOW pin distinctly from a driving HIGH pin", () => {
    const states = boardPinElectricalStates(unoBoard(true), {
      digitalPinMode: () => "output",
      digitalPinValue: () => 0,
    });
    expect(states.get("D13")).toEqual({ kind: "driving", isHigh: false });
  });
});

describe("boardPinElectricalStates — ESP32, running", () => {
  it("reports a never-written pin as open", () => {
    const states = boardPinElectricalStates(esp32Board(true), {
      lastWrittenValue: () => undefined,
    });
    expect(states.get("D2")).toEqual({ kind: "open" });
  });

  it("reports a written pin as driving, at its last written level", () => {
    const states = boardPinElectricalStates(esp32Board(true), {
      lastWrittenValue: (name) => (name === "D2" ? 1 : undefined),
    });
    expect(states.get("D2")).toEqual({ kind: "driving", isHigh: true });
    expect(states.get("D4")).toEqual({ kind: "open" });
  });

  it("treats a written 0 as driving LOW, not open", () => {
    const states = boardPinElectricalStates(esp32Board(true), {
      lastWrittenValue: (name) => (name === "D2" ? 0 : undefined),
    });
    expect(states.get("D2")).toEqual({ kind: "driving", isHigh: false });
  });
});
