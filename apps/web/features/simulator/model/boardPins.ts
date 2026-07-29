export type BoardType = "arduinoUno" | "esp32";

/** A board's fixed pin layout — static per board type, not per-tick state.
 * Percentages are of the board glyph's own bounding box, the same
 * percent-space convention `model/layout.ts` already uses for breadboard
 * holes, so a pin button and its board's rendered SVG artwork share one
 * coordinate system. */
export interface BoardPinLayout {
  name: string;
  xPercent: number;
  yPercent: number;
}

/** The board's own logic-level voltage — what a HIGH output pin drives,
 * and the threshold (half of this) an input pin reads against. */
export const BOARD_LOGIC_VOLTAGE: Record<BoardType, number> = {
  arduinoUno: 5,
  esp32: 3.3,
};

export const BOARD_LABELS: Record<BoardType, string> = {
  arduinoUno: "Arduino Uno",
  esp32: "ESP32 Dev Board",
};

/** Every digital pin's Arduino-style number/name a board exposes —
 * matches `lib/simulation/boards.ts`'s existing `BOARDS` table so the
 * kept board SVGs and this canvas layer agree on what pins exist. */
export const BOARD_DIGITAL_PINS: Record<BoardType, number[]> = {
  arduinoUno: Array.from({ length: 14 }, (_, i) => i),
  esp32: [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33],
};

const UNO_VIEWBOX = { width: 420, height: 260 };
const ESP32_VIEWBOX = { width: 300, height: 420 };

function pct(value: number, total: number): number {
  return (value / total) * 100;
}

/** Digital pin header positions mirror `ArduinoUno.tsx`'s own inline SVG
 * math exactly (`x = 33 + i*26`, `y = 18`) so a pin's clickable overlay
 * lines up with its drawn header pad. */
const UNO_DIGITAL_PINS: BoardPinLayout[] = BOARD_DIGITAL_PINS.arduinoUno.map(
  (pin, i) => ({
    name: `D${pin}`,
    xPercent: pct(33 + i * 26, UNO_VIEWBOX.width),
    yPercent: pct(18, UNO_VIEWBOX.height),
  })
);

/** Mirrors `ArduinoUno.tsx`'s own analog header tick position exactly
 * (`x = 252 + i*26`, `y = 232`) — the button sits *on the tick*, not on
 * the label, which is drawn above it (see that file's comment: a button
 * centered on its own label swallows the label visually). */
const UNO_ANALOG_PINS: BoardPinLayout[] = ["A0", "A1", "A2", "A3", "A4", "A5"].map(
  (name, i) => ({
    name,
    xPercent: pct(255 + i * 26, UNO_VIEWBOX.width),
    yPercent: pct(237, UNO_VIEWBOX.height),
  })
);

/** Real Uno power-header order is IOREF/RESET/3.3V/5V/GND/GND/VIN
 * (`ArduinoUno.tsx` draws the full row as silkscreen); only 5V and GND
 * (positions 3 and 4) are modeled as real connection points, matching
 * that same drawn tick position exactly (`x = 40 + i*26`, `y = 232`) —
 * not the label position, drawn separately above the tick. */
const UNO_POWER_PINS: BoardPinLayout[] = [
  {
    name: "5V",
    xPercent: pct(43 + 3 * 26, UNO_VIEWBOX.width),
    yPercent: pct(237, UNO_VIEWBOX.height),
  },
  {
    name: "GND",
    xPercent: pct(43 + 4 * 26, UNO_VIEWBOX.width),
    yPercent: pct(237, UNO_VIEWBOX.height),
  },
];

const half = Math.ceil(BOARD_DIGITAL_PINS.esp32.length / 2);
const ESP32_LEFT_PINS: BoardPinLayout[] = BOARD_DIGITAL_PINS.esp32
  .slice(0, half)
  .map((pin, i) => ({
    name: `D${pin}`,
    xPercent: pct(17, ESP32_VIEWBOX.width),
    yPercent: pct(73 + i * 18, ESP32_VIEWBOX.height),
  }));

const ESP32_RIGHT_PINS: BoardPinLayout[] = BOARD_DIGITAL_PINS.esp32
  .slice(half)
  .map((pin, i) => ({
    name: `D${pin}`,
    xPercent: pct(283, ESP32_VIEWBOX.width),
    yPercent: pct(73 + i * 18, ESP32_VIEWBOX.height),
  }));

const ESP32_POWER_PINS: BoardPinLayout[] = [
  {
    name: "3V3",
    xPercent: pct(40, ESP32_VIEWBOX.width),
    yPercent: pct(400, ESP32_VIEWBOX.height),
  },
  {
    name: "GND",
    xPercent: pct(260, ESP32_VIEWBOX.width),
    yPercent: pct(400, ESP32_VIEWBOX.height),
  },
];

export const BOARD_PIN_LAYOUTS: Record<BoardType, BoardPinLayout[]> = {
  arduinoUno: [...UNO_DIGITAL_PINS, ...UNO_ANALOG_PINS, ...UNO_POWER_PINS],
  esp32: [...ESP32_LEFT_PINS, ...ESP32_RIGHT_PINS, ...ESP32_POWER_PINS],
};

/** Every board's digital pins are named `D<n>` on the canvas (matching
 * the labels drawn on the board art) — this maps that name back to the
 * plain Arduino-style pin number `AtmegaRuntime`/`SketchEngine` expect. */
export function digitalPinNumber(pinName: string): number | null {
  const match = pinName.match(/^D(\d+)$/);
  return match ? Number(match[1]) : null;
}
