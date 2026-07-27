import { NOMINAL_HEALTH } from "../../contract/types";
import { diodeSeriesElement, evaluateDiode } from "./diode";

const params = { forwardVoltageVolts: 0.7, reverseBreakdownVoltageVolts: 1000 };

describe("evaluateDiode — forward biased", () => {
  it("is nominal and conducting when forward-biased", () => {
    const result = evaluateDiode(
      params,
      { biased: "forward", currentAmps: 0.01 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.isConducting).toBe(true);
    expect(result.visual.isReverseBiased).toBe(false);
  });

  it("keeps a previously-failed diode failed even while forward-biased", () => {
    const failed = { status: "failed" as const, reason: "breakdown" };
    const result = evaluateDiode(
      params,
      { biased: "forward", currentAmps: 0.01 },
      { health: failed }
    );
    expect(result.health).toBe(failed);
  });
});

describe("evaluateDiode — reverse biased", () => {
  it("blocks current safely below the breakdown voltage — nominal, not damaged", () => {
    const result = evaluateDiode(
      params,
      { biased: "reverse", voltageVolts: -12 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.isConducting).toBe(false);
    expect(result.visual.isReverseBiased).toBe(true);
  });

  it("fails once the reverse voltage exceeds the breakdown rating", () => {
    const result = evaluateDiode(
      params,
      { biased: "reverse", voltageVolts: -1200 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
    expect(result.health.reason).toBeDefined();
  });

  it("latches failed", () => {
    const failed = { status: "failed" as const, reason: "breakdown" };
    const result = evaluateDiode(
      params,
      { biased: "reverse", voltageVolts: -1 },
      { health: failed }
    );
    expect(result.health).toBe(failed);
  });
});

describe("diodeSeriesElement", () => {
  it("presents a fixed voltage drop when healthy and forward-biased", () => {
    expect(diodeSeriesElement(params, "forward", NOMINAL_HEALTH)).toEqual({
      kind: "fixed-drop",
      forwardVoltageVolts: 0.7,
    });
  });

  it("presents an open circuit when healthy and reverse-biased", () => {
    expect(diodeSeriesElement(params, "reverse", NOMINAL_HEALTH)).toEqual({
      kind: "resistive",
      resistanceOhms: Infinity,
    });
  });

  it("presents a short circuit once failed, regardless of bias", () => {
    const failed = { status: "failed" as const, reason: "breakdown" };
    expect(diodeSeriesElement(params, "forward", failed)).toEqual({
      kind: "resistive",
      resistanceOhms: 0,
    });
    expect(diodeSeriesElement(params, "reverse", failed)).toEqual({
      kind: "resistive",
      resistanceOhms: 0,
    });
  });
});
