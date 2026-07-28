import { BOARD_DIGITAL_PINS } from "./boardPins";
import type { BoardPinElectricalState, PlacedBoard } from "./types";

/** Reads a running Arduino Uno's real `avr8js` GPIO state — the shape
 * `AtmegaRuntime` already exposes, kept as its own interface here so this
 * module (and its tests) don't need to depend on `@ds-simboard/chip-emulation`
 * or construct a real CPU just to prove the bridging logic. */
export interface UnoPinReader {
  digitalPinMode(pin: number): "input" | "output";
  digitalPinValue(pin: number): 0 | 1;
}

/** The line-stepping `SketchEngine` has no formal notion of "this pin is
 * configured as input" (ADR 0008 — it doesn't evaluate `digitalRead` in a
 * decision at all); the only meaningful signal is whether `digitalWrite`/
 * `analogWrite` has ever targeted a pin. */
export interface Esp32PinReader {
  lastWrittenValue(pinName: string): number | undefined;
}

/**
 * One simulation tick's electrical role for every digital pin a board
 * declares (docs/architecture/0027-*.md): `"open"` for every pin while
 * the board isn't running (no power at all), or for whichever pins are
 * genuinely input-configured (Uno) / never written (ESP32) while it is —
 * `"driving"` for the rest, at the program's real current output level.
 */
export function boardPinElectricalStates(
  board: PlacedBoard,
  reader: UnoPinReader | Esp32PinReader
): Map<string, BoardPinElectricalState> {
  const states = new Map<string, BoardPinElectricalState>();
  const pins = BOARD_DIGITAL_PINS[board.boardType];

  if (!board.running) {
    for (const pin of pins) {
      states.set(`D${pin}`, { kind: "open" });
    }
    return states;
  }

  if (board.boardType === "arduinoUno") {
    const unoReader = reader as UnoPinReader;
    for (const pin of pins) {
      const name = `D${pin}`;
      states.set(
        name,
        unoReader.digitalPinMode(pin) === "output"
          ? { kind: "driving", isHigh: unoReader.digitalPinValue(pin) === 1 }
          : { kind: "open" }
      );
    }
    return states;
  }

  const esp32Reader = reader as Esp32PinReader;
  for (const pin of pins) {
    const name = `D${pin}`;
    const lastValue = esp32Reader.lastWrittenValue(name);
    states.set(
      name,
      lastValue === undefined
        ? { kind: "open" }
        : { kind: "driving", isHigh: lastValue > 0 }
    );
  }
  return states;
}
