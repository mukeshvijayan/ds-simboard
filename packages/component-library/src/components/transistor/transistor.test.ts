import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateTransistor } from "./transistor";

const params = {
  polarity: "NPN" as const,
  hFE: 100,
  vceSatVolts: 0.2,
  maxCollectorCurrentAmps: 0.5,
};

describe("evaluateTransistor — amplifier region (unsaturated)", () => {
  it("amplifies base current by hFE when the collector circuit can supply it", () => {
    // Ic_sat ceiling = (12 - 0.2) / 100 = 0.118A; hFE*Ib = 100*0.0005 = 0.05A, well under the ceiling.
    const result = evaluateTransistor(
      params,
      { baseCurrentAmps: 0.0005, supplyVoltageVolts: 12, collectorResistanceOhms: 100 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.collectorCurrentAmps).toBeCloseTo(0.05);
    expect(result.visual.isSaturated).toBe(false);
    expect(result.visual.isConducting).toBe(true);
  });

  it("is off (not conducting) at 0 base current", () => {
    const result = evaluateTransistor(
      params,
      { baseCurrentAmps: 0, supplyVoltageVolts: 12, collectorResistanceOhms: 100 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.collectorCurrentAmps).toBe(0);
    expect(result.visual.isConducting).toBe(false);
    expect(result.visual.isSaturated).toBe(false);
  });
});

describe("evaluateTransistor — saturation region (switch fully on)", () => {
  it("caps collector current at what the collector circuit can supply", () => {
    // hFE*Ib = 100*0.01 = 1A "wanted", but (12-0.2)/100 = 0.118A is all the circuit can give.
    const result = evaluateTransistor(
      params,
      { baseCurrentAmps: 0.01, supplyVoltageVolts: 12, collectorResistanceOhms: 100 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.collectorCurrentAmps).toBeCloseTo((12 - 0.2) / 100);
    expect(result.visual.isSaturated).toBe(true);
  });
});

describe("evaluateTransistor — over-current failure", () => {
  it("fails once collector current exceeds the max rating", () => {
    const result = evaluateTransistor(
      { ...params, maxCollectorCurrentAmps: 0.05 },
      { baseCurrentAmps: 0.01, supplyVoltageVolts: 12, collectorResistanceOhms: 10 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
  });

  it("latches failed", () => {
    const failed = { status: "failed" as const, reason: "over-current" };
    const result = evaluateTransistor(
      params,
      { baseCurrentAmps: 0, supplyVoltageVolts: 12, collectorResistanceOhms: 100 },
      { health: failed }
    );
    expect(result.health).toBe(failed);
  });
});

describe("evaluateTransistor — validation", () => {
  it("throws for a non-positive hFE", () => {
    expect(() =>
      evaluateTransistor(
        { ...params, hFE: 0 },
        { baseCurrentAmps: 0.001, supplyVoltageVolts: 12, collectorResistanceOhms: 100 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a negative vceSatVolts", () => {
    expect(() =>
      evaluateTransistor(
        { ...params, vceSatVolts: -1 },
        { baseCurrentAmps: 0.001, supplyVoltageVolts: 12, collectorResistanceOhms: 100 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive maxCollectorCurrentAmps", () => {
    expect(() =>
      evaluateTransistor(
        { ...params, maxCollectorCurrentAmps: 0 },
        { baseCurrentAmps: 0.001, supplyVoltageVolts: 12, collectorResistanceOhms: 100 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a negative base current", () => {
    expect(() =>
      evaluateTransistor(
        params,
        { baseCurrentAmps: -0.001, supplyVoltageVolts: 12, collectorResistanceOhms: 100 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a negative supply voltage", () => {
    expect(() =>
      evaluateTransistor(
        params,
        { baseCurrentAmps: 0.001, supplyVoltageVolts: -1, collectorResistanceOhms: 100 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive collector resistance", () => {
    expect(() =>
      evaluateTransistor(
        params,
        { baseCurrentAmps: 0.001, supplyVoltageVolts: 12, collectorResistanceOhms: 0 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });
});
