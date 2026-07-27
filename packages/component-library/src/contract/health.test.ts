import { NOMINAL_HEALTH } from "./types";
import {
  applyMagnitudeThresholdHealth,
  applyReversePolarityHealth,
  applyShortCircuitHealth,
} from "./health";

describe("applyMagnitudeThresholdHealth", () => {
  it("is nominal under every threshold", () => {
    const result = applyMagnitudeThresholdHealth({
      previousHealth: NOMINAL_HEALTH,
      measuredValue: 1,
      maxValue: 10,
      stressedThreshold: 5,
      failureReason: "too high",
    });
    expect(result.status).toBe("nominal");
  });

  it("is stressed between the stressed threshold and the max", () => {
    const result = applyMagnitudeThresholdHealth({
      previousHealth: NOMINAL_HEALTH,
      measuredValue: 7,
      maxValue: 10,
      stressedThreshold: 5,
      failureReason: "too high",
    });
    expect(result.status).toBe("stressed");
  });

  it("fails above the max", () => {
    const result = applyMagnitudeThresholdHealth({
      previousHealth: NOMINAL_HEALTH,
      measuredValue: 11,
      maxValue: 10,
      stressedThreshold: 5,
      failureReason: "too high",
    });
    expect(result.status).toBe("failed");
    expect(result.reason).toBe("too high");
  });

  it("uses the magnitude, so a large negative value also fails", () => {
    const result = applyMagnitudeThresholdHealth({
      previousHealth: NOMINAL_HEALTH,
      measuredValue: -11,
      maxValue: 10,
      failureReason: "too high",
    });
    expect(result.status).toBe("failed");
  });

  it("works without a stressedThreshold (jumps straight from nominal to failed)", () => {
    const nominal = applyMagnitudeThresholdHealth({
      previousHealth: NOMINAL_HEALTH,
      measuredValue: 9,
      maxValue: 10,
      failureReason: "too high",
    });
    expect(nominal.status).toBe("nominal");
  });

  it("latches: once failed, stays failed regardless of a later safe reading", () => {
    const failed = { status: "failed" as const, reason: "original failure" };
    const result = applyMagnitudeThresholdHealth({
      previousHealth: failed,
      measuredValue: 0,
      maxValue: 10,
      failureReason: "too high",
    });
    expect(result).toBe(failed);
  });
});

describe("applyReversePolarityHealth", () => {
  it("is nominal when not reverse-biased", () => {
    const result = applyReversePolarityHealth({
      previousHealth: NOMINAL_HEALTH,
      isReverseBiased: false,
      failureReason: "reversed",
    });
    expect(result.status).toBe("nominal");
  });

  it("fails immediately when reverse-biased", () => {
    const result = applyReversePolarityHealth({
      previousHealth: NOMINAL_HEALTH,
      isReverseBiased: true,
      failureReason: "reversed",
    });
    expect(result.status).toBe("failed");
    expect(result.reason).toBe("reversed");
  });

  it("latches", () => {
    const failed = { status: "failed" as const, reason: "original failure" };
    const result = applyReversePolarityHealth({
      previousHealth: failed,
      isReverseBiased: false,
      failureReason: "reversed",
    });
    expect(result).toBe(failed);
  });
});

describe("applyShortCircuitHealth", () => {
  it("fails a nominal component", () => {
    const result = applyShortCircuitHealth(NOMINAL_HEALTH);
    expect(result.status).toBe("failed");
    expect(result.reason).toMatch(/short circuit/);
  });

  it("latches an already-failed component", () => {
    const failed = { status: "failed" as const, reason: "original failure" };
    expect(applyShortCircuitHealth(failed)).toBe(failed);
  });
});
