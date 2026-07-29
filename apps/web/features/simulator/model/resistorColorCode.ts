/**
 * The real electronic color code for a 4-band resistor
 * (https://en.wikipedia.org/wiki/Electronic_color_code#Resistors) —
 * verified against this app's own resistor presets (220Ω, 330Ω, 1kΩ,
 * 10kΩ) before relying on it. Used by `ResistorGlyph`'s hand-authored
 * SVG artwork (P2-4b, closing ADR 0031/0032) so a resistor's drawn
 * bands always match its real `resistanceOhms` value, for every value,
 * not just the ones already in the palette.
 */
const DIGIT_COLORS = [
  "#1a1a1a", // 0 black
  "#7a4a2e", // 1 brown
  "#d6342c", // 2 red
  "#e8791f", // 3 orange
  "#f0d419", // 4 yellow
  "#3a9c4a", // 5 green
  "#2a6fd6", // 6 blue
  "#8e3fb0", // 7 violet
  "#8a8a8a", // 8 gray
  "#f5f5f0", // 9 white
];
const GOLD = "#c9a349";

/** Reduces an ohm value to its two significant digits + power-of-ten
 * multiplier — the same reduction a real 4-band resistor's printed code
 * represents. */
export function resistorBandColors(ohms: number): [string, string, string, string] {
  let value = Math.round(ohms);
  let exponent = 0;
  while (value >= 100) {
    value = Math.round(value / 10);
    exponent++;
  }
  const digit1 = Math.floor(value / 10);
  const digit2 = value % 10;
  return [
    DIGIT_COLORS[digit1] ?? GOLD,
    DIGIT_COLORS[digit2] ?? GOLD,
    DIGIT_COLORS[exponent] ?? GOLD,
    GOLD,
  ];
}
