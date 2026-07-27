import { solveSeriesCircuit } from "./seriesCircuit";

describe("solveSeriesCircuit", () => {
  it("solves a single resistor against a supply (the LED-series-resistor case)", () => {
    // A 5V supply through a 220Ω resistor — the canonical LED-current-limiting example.
    const result = solveSeriesCircuit(5, [{ id: "r1", resistanceOhms: 220 }]);
    expect(result.totalResistanceOhms).toBe(220);
    expect(result.currentAmps).toBeCloseTo(5 / 220);
    expect(result.voltageDropsByElementId.r1).toBeCloseTo(5);
  });

  it("sums resistances in series and splits current the same way through each", () => {
    const result = solveSeriesCircuit(9, [
      { id: "r1", resistanceOhms: 100 },
      { id: "r2", resistanceOhms: 200 },
    ]);
    expect(result.totalResistanceOhms).toBe(300);
    expect(result.currentAmps).toBeCloseTo(9 / 300);
  });

  it("splits voltage drops proportionally to each element's resistance", () => {
    const result = solveSeriesCircuit(9, [
      { id: "r1", resistanceOhms: 100 },
      { id: "r2", resistanceOhms: 200 },
    ]);
    expect(result.voltageDropsByElementId.r1).toBeCloseTo(3);
    expect(result.voltageDropsByElementId.r2).toBeCloseTo(6);
  });

  it("keeps voltage drops summing to the supply voltage (Kirchhoff's voltage law)", () => {
    const supply = 12;
    const result = solveSeriesCircuit(supply, [
      { id: "r1", resistanceOhms: 47 },
      { id: "r2", resistanceOhms: 330 },
      { id: "r3", resistanceOhms: 1000 },
    ]);
    const totalDrop = Object.values(result.voltageDropsByElementId).reduce(
      (a, b) => a + b,
      0
    );
    expect(totalDrop).toBeCloseTo(supply);
  });

  it("throws for an empty circuit", () => {
    expect(() => solveSeriesCircuit(5, [])).toThrow(RangeError);
  });

  it("throws when total resistance is 0 (no series resistor at all — a short circuit)", () => {
    expect(() => solveSeriesCircuit(5, [{ id: "wire", resistanceOhms: 0 }])).toThrow(
      RangeError
    );
  });

  it("throws for a negative resistance value", () => {
    expect(() => solveSeriesCircuit(5, [{ id: "r1", resistanceOhms: -10 }])).toThrow(
      RangeError
    );
  });
});
