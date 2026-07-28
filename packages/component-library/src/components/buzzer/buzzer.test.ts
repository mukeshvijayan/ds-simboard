import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateBuzzer, buzzerSeriesElement } from "./buzzer";

const activeParams = {
  kind: "active" as const,
  ratedVoltageVolts: 5,
  ratedCurrentAmps: 0.03,
  maxCurrentAmps: 0.05,
};
const passiveParams = { ...activeParams, kind: "passive" as const };

describe("evaluateBuzzer — active buzzer", () => {
  it("buzzes once current flows", () => {
    const result = evaluateBuzzer(
      activeParams,
      { currentAmps: 0.03 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.isBuzzing).toBe(true);
  });

  it("stays silent at 0 current", () => {
    const result = evaluateBuzzer(
      activeParams,
      { currentAmps: 0 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.isBuzzing).toBe(false);
  });

  it("goes stressed between rated and max current", () => {
    const result = evaluateBuzzer(
      activeParams,
      { currentAmps: 0.04 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("stressed");
    expect(result.visual.isBuzzing).toBe(true);
  });

  it("burns out past max current and stops buzzing", () => {
    const result = evaluateBuzzer(
      activeParams,
      { currentAmps: 1 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
    expect(result.visual.isBuzzing).toBe(false);
  });
});

describe("evaluateBuzzer — passive buzzer", () => {
  it("never buzzes from plain DC current — it needs a signal this breadboard can't drive", () => {
    const result = evaluateBuzzer(
      passiveParams,
      { currentAmps: 0.03 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.isBuzzing).toBe(false);
  });

  it("still burns out from over-current even while silent", () => {
    const result = evaluateBuzzer(
      passiveParams,
      { currentAmps: 1 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
  });
});

describe("evaluateBuzzer — validation", () => {
  it("throws for a non-positive rated voltage", () => {
    expect(() =>
      evaluateBuzzer(
        { ...activeParams, ratedVoltageVolts: 0 },
        { currentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive rated current", () => {
    expect(() =>
      evaluateBuzzer(
        { ...activeParams, ratedCurrentAmps: 0 },
        { currentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws when maxCurrentAmps is below ratedCurrentAmps", () => {
    expect(() =>
      evaluateBuzzer(
        { ...activeParams, maxCurrentAmps: 0.01 },
        { currentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });
});

describe("buzzerSeriesElement", () => {
  it("presents a fixed resistance derived from rated voltage/current when healthy", () => {
    expect(buzzerSeriesElement(activeParams, NOMINAL_HEALTH)).toEqual({
      kind: "resistive",
      resistanceOhms: 5 / 0.03,
    });
  });

  it("presents an open circuit once failed", () => {
    const failed = { status: "failed" as const, reason: "burned out" };
    expect(buzzerSeriesElement(activeParams, failed)).toEqual({
      kind: "resistive",
      resistanceOhms: Infinity,
    });
  });
});
