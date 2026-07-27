import { current, resistance, voltage } from "./ohmsLaw";

describe("voltage (V = I × R)", () => {
  it("computes voltage from current and resistance", () => {
    expect(voltage(2, 100)).toBe(200);
  });

  it("returns 0 for 0 resistance (a wire)", () => {
    expect(voltage(2, 0)).toBe(0);
  });

  it("returns 0 for 0 current", () => {
    expect(voltage(0, 100)).toBe(0);
  });

  it("throws for negative resistance", () => {
    expect(() => voltage(1, -1)).toThrow(RangeError);
  });
});

describe("current (I = V / R)", () => {
  it("computes current from voltage and resistance", () => {
    expect(current(5, 1000)).toBeCloseTo(0.005);
  });

  it("throws for 0 resistance (short circuit)", () => {
    expect(() => current(5, 0)).toThrow(RangeError);
  });

  it("throws for negative resistance", () => {
    expect(() => current(5, -10)).toThrow(RangeError);
  });
});

describe("resistance (R = V / I)", () => {
  it("computes resistance from voltage and current", () => {
    expect(resistance(5, 0.005)).toBeCloseTo(1000);
  });

  it("throws for 0 current (open circuit)", () => {
    expect(() => resistance(5, 0)).toThrow(RangeError);
  });

  it("round-trips with voltage()/current() for a known example", () => {
    const r = 220;
    const i = current(5, r);
    expect(resistance(5, i)).toBeCloseTo(r);
    expect(voltage(i, r)).toBeCloseTo(5);
  });
});
