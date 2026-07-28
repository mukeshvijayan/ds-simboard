import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateTransistor, transistorIsOn } from "./transistor";

const params = {
  baseEmitterVoltageDropVolts: 0.7,
  baseThresholdCurrentAmps: 0.002,
  onResistanceOhms: 1,
  maxCollectorCurrentAmps: 0.5,
};

describe("transistorIsOn", () => {
  it("is off below the base current threshold", () => {
    expect(transistorIsOn(params, 0.001)).toBe(false);
  });

  it("is on at or above the base current threshold", () => {
    expect(transistorIsOn(params, 0.002)).toBe(true);
    expect(transistorIsOn(params, 0.01)).toBe(true);
  });
});

describe("evaluateTransistor — switching on real solved current", () => {
  it("reports on with the collector current the solver actually found", () => {
    const result = evaluateTransistor(
      params,
      { baseCurrentAmps: 0.005, collectorCurrentAmps: 0.12 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.isOn).toBe(true);
    expect(result.visual.collectorCurrentAmps).toBe(0.12);
    expect(result.health.status).toBe("nominal");
  });

  it("reports off when base current is below threshold, regardless of collector current", () => {
    const result = evaluateTransistor(
      params,
      { baseCurrentAmps: 0, collectorCurrentAmps: 0 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.isOn).toBe(false);
    expect(result.visual.collectorCurrentAmps).toBe(0);
  });
});

describe("evaluateTransistor — over-current failure", () => {
  it("fails once collector current exceeds the max rating", () => {
    const result = evaluateTransistor(
      { ...params, maxCollectorCurrentAmps: 0.05 },
      { baseCurrentAmps: 0.01, collectorCurrentAmps: 0.12 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
    expect(result.visual.isOn).toBe(false);
    expect(result.visual.collectorCurrentAmps).toBe(0);
  });

  it("latches failed", () => {
    const failed = { status: "failed" as const, reason: "over-current" };
    const result = evaluateTransistor(
      params,
      { baseCurrentAmps: 0, collectorCurrentAmps: 0 },
      { health: failed }
    );
    expect(result.health).toBe(failed);
  });
});

describe("evaluateTransistor — validation", () => {
  it("throws for a negative baseEmitterVoltageDropVolts", () => {
    expect(() =>
      evaluateTransistor(
        { ...params, baseEmitterVoltageDropVolts: -1 },
        { baseCurrentAmps: 0.005, collectorCurrentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive baseThresholdCurrentAmps", () => {
    expect(() =>
      evaluateTransistor(
        { ...params, baseThresholdCurrentAmps: 0 },
        { baseCurrentAmps: 0.005, collectorCurrentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive onResistanceOhms", () => {
    expect(() =>
      evaluateTransistor(
        { ...params, onResistanceOhms: 0 },
        { baseCurrentAmps: 0.005, collectorCurrentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive maxCollectorCurrentAmps", () => {
    expect(() =>
      evaluateTransistor(
        { ...params, maxCollectorCurrentAmps: 0 },
        { baseCurrentAmps: 0.005, collectorCurrentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a negative base current", () => {
    expect(() =>
      evaluateTransistor(
        params,
        { baseCurrentAmps: -0.001, collectorCurrentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a negative collector current", () => {
    expect(() =>
      evaluateTransistor(
        params,
        { baseCurrentAmps: 0.005, collectorCurrentAmps: -0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });
});
