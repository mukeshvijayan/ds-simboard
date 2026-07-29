import { resistorBandColors } from "./resistorColorCode";

// Real 4-band color codes, verified against the electronic color code
// standard (https://en.wikipedia.org/wiki/Electronic_color_code#Resistors)
// before relying on them — same values this app's own resistor presets
// already use (constants.ts).
describe("resistorBandColors — matches the real electronic color code", () => {
  it("220 ohm -> red, red, brown, gold", () => {
    const [b1, b2, b3, b4] = resistorBandColors(220);
    const red = "#d6342c";
    const brown = "#7a4a2e";
    const gold = "#c9a349";
    expect(b1).toBe(red);
    expect(b2).toBe(red);
    expect(b3).toBe(brown);
    expect(b4).toBe(gold);
  });

  it("330 ohm -> orange, orange, brown, gold", () => {
    const [b1, b2, b3] = resistorBandColors(330);
    const orange = "#e8791f";
    const brown = "#7a4a2e";
    expect(b1).toBe(orange);
    expect(b2).toBe(orange);
    expect(b3).toBe(brown);
  });

  it("1000 ohm (1k) -> brown, black, red, gold", () => {
    const [b1, b2, b3] = resistorBandColors(1000);
    const brown = "#7a4a2e";
    const black = "#1a1a1a";
    const red = "#d6342c";
    expect(b1).toBe(brown);
    expect(b2).toBe(black);
    expect(b3).toBe(red);
  });

  it("10000 ohm (10k) -> brown, black, orange, gold", () => {
    const [b1, b2, b3] = resistorBandColors(10_000);
    const brown = "#7a4a2e";
    const black = "#1a1a1a";
    const orange = "#e8791f";
    expect(b1).toBe(brown);
    expect(b2).toBe(black);
    expect(b3).toBe(orange);
  });

  it("always returns a gold 4th (tolerance) band", () => {
    const gold = "#c9a349";
    expect(resistorBandColors(220)[3]).toBe(gold);
    expect(resistorBandColors(10_000)[3]).toBe(gold);
  });
});
