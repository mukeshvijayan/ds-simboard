import { solveSeriesLoop } from "./seriesLoop";

describe("solveSeriesLoop — purely resistive", () => {
  it("matches plain Ohm's law for a single resistor", () => {
    const outcome = solveSeriesLoop(5, [
      { id: "r1", kind: "resistive", resistanceOhms: 220 },
    ]);
    expect(outcome.kind).toBe("conducting");
    if (outcome.kind === "conducting") {
      expect(outcome.currentAmps).toBeCloseTo(5 / 220);
      expect(outcome.voltageDropsByElementId.r1).toBeCloseTo(5);
    }
  });

  it("sums voltage drops back to the supply across multiple resistors", () => {
    const outcome = solveSeriesLoop(9, [
      { id: "r1", kind: "resistive", resistanceOhms: 100 },
      { id: "r2", kind: "resistive", resistanceOhms: 200 },
    ]);
    expect(outcome.kind).toBe("conducting");
    if (outcome.kind === "conducting") {
      const total = Object.values(outcome.voltageDropsByElementId).reduce(
        (a, b) => a + b,
        0
      );
      expect(total).toBeCloseTo(9);
    }
  });
});

describe("solveSeriesLoop — LED-style fixed-voltage-drop elements", () => {
  it("computes current as (supply - Vf) / R for an LED in series with a resistor", () => {
    const outcome = solveSeriesLoop(5, [
      { id: "r1", kind: "resistive", resistanceOhms: 220 },
      { id: "led1", kind: "fixed-drop", forwardVoltageVolts: 2 },
    ]);
    expect(outcome.kind).toBe("conducting");
    if (outcome.kind === "conducting") {
      expect(outcome.currentAmps).toBeCloseTo((5 - 2) / 220);
      expect(outcome.voltageDropsByElementId.led1).toBeCloseTo(2);
      expect(outcome.voltageDropsByElementId.r1).toBeCloseTo(3);
    }
  });

  it("flags a short circuit when an LED has no series resistor and enough supply to conduct", () => {
    const outcome = solveSeriesLoop(5, [
      { id: "led1", kind: "fixed-drop", forwardVoltageVolts: 2 },
    ]);
    expect(outcome.kind).toBe("short-circuit");
  });

  it("is non-conducting (not a short circuit) when supply can't forward-bias the LED at all", () => {
    const outcome = solveSeriesLoop(1, [
      { id: "led1", kind: "fixed-drop", forwardVoltageVolts: 2 },
    ]);
    expect(outcome.kind).toBe("non-conducting");
  });

  it("is non-conducting when a resistor is present but supply is below the LED's forward voltage", () => {
    const outcome = solveSeriesLoop(1, [
      { id: "r1", kind: "resistive", resistanceOhms: 220 },
      { id: "led1", kind: "fixed-drop", forwardVoltageVolts: 2 },
    ]);
    expect(outcome.kind).toBe("non-conducting");
    if (outcome.kind === "non-conducting") {
      expect(outcome.voltageDropsByElementId.r1).toBe(0);
      expect(outcome.voltageDropsByElementId.led1).toBeCloseTo(1);
    }
  });
});

describe("solveSeriesLoop — open elements", () => {
  it("is non-conducting when an element reports infinite resistance (an open switch)", () => {
    const outcome = solveSeriesLoop(5, [
      { id: "sw1", kind: "resistive", resistanceOhms: Infinity },
      { id: "r1", kind: "resistive", resistanceOhms: 220 },
    ]);
    expect(outcome.kind).toBe("non-conducting");
    if (outcome.kind === "non-conducting") {
      expect(outcome.voltageDropsByElementId.r1).toBe(0);
      expect(outcome.voltageDropsByElementId.sw1).toBeCloseTo(5);
    }
  });
});

describe("solveSeriesLoop — validation", () => {
  it("throws for an empty element list", () => {
    expect(() => solveSeriesLoop(5, [])).toThrow(RangeError);
  });

  it("throws for a negative resistance", () => {
    expect(() =>
      solveSeriesLoop(5, [{ id: "r1", kind: "resistive", resistanceOhms: -1 }])
    ).toThrow(RangeError);
  });

  it("throws for a NaN resistance", () => {
    expect(() =>
      solveSeriesLoop(5, [{ id: "r1", kind: "resistive", resistanceOhms: NaN }])
    ).toThrow(RangeError);
  });

  it("throws for a negative forward voltage", () => {
    expect(() =>
      solveSeriesLoop(5, [{ id: "d1", kind: "fixed-drop", forwardVoltageVolts: -1 }])
    ).toThrow(RangeError);
  });
});
