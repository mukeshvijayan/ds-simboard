import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateLed, ledSeriesElement } from "./led";

const params = { forwardVoltageVolts: 2, ratedCurrentAmps: 0.02, maxCurrentAmps: 0.03 };

describe("evaluateLed — forward biased, healthy operation", () => {
  it("is fully bright at the rated current", () => {
    const result = evaluateLed(
      params,
      { biased: "forward", currentAmps: 0.02 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.brightness).toBeCloseTo(1);
  });

  it("is half bright at half the rated current", () => {
    const result = evaluateLed(
      params,
      { biased: "forward", currentAmps: 0.01 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.brightness).toBeCloseTo(0.5);
  });

  it("is off at 0 current", () => {
    const result = evaluateLed(
      params,
      { biased: "forward", currentAmps: 0 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.brightness).toBe(0);
  });

  it("goes stressed between the rated and max current", () => {
    const result = evaluateLed(
      params,
      { biased: "forward", currentAmps: 0.025 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("stressed");
  });
});

describe("evaluateLed — the canonical over-current burnout (spec Part 2.3)", () => {
  it("burns out once current exceeds maxCurrentAmps", () => {
    // Standing in for "an LED wired directly across a supply with no
    // series resistor at all" — a large current far past the max rating.
    const result = evaluateLed(
      params,
      { biased: "forward", currentAmps: 0.5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
    expect(result.health.reason).toMatch(/exceeds max rating/);
    expect(result.visual.brightness).toBe(0);
  });

  it("does not burn out when a properly sized series resistor limits current below the max", () => {
    // 5V supply, 2V LED, 220Ω resistor -> (5-2)/220 ≈ 13.6mA, safely under the 20mA rating.
    const currentAmps = (5 - params.forwardVoltageVolts) / 220;
    const result = evaluateLed(
      params,
      { biased: "forward", currentAmps },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.brightness).toBeGreaterThan(0);
  });

  it("latches burned out even if current later drops to a safe level", () => {
    const failed = { status: "failed" as const, reason: "burned out" };
    const result = evaluateLed(
      params,
      { biased: "forward", currentAmps: 0.001 },
      { health: failed }
    );
    expect(result.health).toBe(failed);
    expect(result.visual.brightness).toBe(0);
  });
});

describe("evaluateLed — reverse biased", () => {
  it("does nothing — stays nominal, off, not damaged", () => {
    const result = evaluateLed(params, { biased: "reverse" }, { health: NOMINAL_HEALTH });
    expect(result.health.status).toBe("nominal");
    expect(result.visual.brightness).toBe(0);
    expect(result.visual.isReverseBiased).toBe(true);
  });

  it("keeps a previously-burned-out LED failed even while reverse-biased", () => {
    const failed = { status: "failed" as const, reason: "burned out" };
    const result = evaluateLed(params, { biased: "reverse" }, { health: failed });
    expect(result.health).toBe(failed);
  });
});

describe("evaluateLed — validation", () => {
  it("throws for a negative forward voltage", () => {
    expect(() =>
      evaluateLed(
        { forwardVoltageVolts: -1, ratedCurrentAmps: 0.02, maxCurrentAmps: 0.03 },
        { biased: "forward", currentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive rated current", () => {
    expect(() =>
      evaluateLed(
        { forwardVoltageVolts: 2, ratedCurrentAmps: 0, maxCurrentAmps: 0.03 },
        { biased: "forward", currentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws when maxCurrentAmps is below ratedCurrentAmps", () => {
    expect(() =>
      evaluateLed(
        { forwardVoltageVolts: 2, ratedCurrentAmps: 0.03, maxCurrentAmps: 0.02 },
        { biased: "forward", currentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });
});

describe("ledSeriesElement", () => {
  it("presents a fixed forward-voltage drop when healthy and forward-biased", () => {
    expect(ledSeriesElement(params, "forward", NOMINAL_HEALTH)).toEqual({
      kind: "fixed-drop",
      forwardVoltageVolts: 2,
    });
  });

  it("presents an open circuit when reverse-biased", () => {
    expect(ledSeriesElement(params, "reverse", NOMINAL_HEALTH)).toEqual({
      kind: "resistive",
      resistanceOhms: Infinity,
    });
  });

  it("presents an open circuit once failed, even if forward-biased", () => {
    const failed = { status: "failed" as const, reason: "burned out" };
    expect(ledSeriesElement(params, "forward", failed)).toEqual({
      kind: "resistive",
      resistanceOhms: Infinity,
    });
  });
});
