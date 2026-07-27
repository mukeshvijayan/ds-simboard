import { NOMINAL_HEALTH } from "../../contract/types";
import {
  effectiveResistance,
  evaluatePotentiometer,
  potentiometerSeriesElement,
} from "./potentiometer";

const params = { totalResistanceOhms: 10_000, ratedPowerWatts: 0.2 };

describe("effectiveResistance", () => {
  it("is 0 at wiper position 0", () => {
    expect(effectiveResistance(params, 0)).toBe(0);
  });

  it("is the full resistance at wiper position 1", () => {
    expect(effectiveResistance(params, 1)).toBe(10_000);
  });

  it("is linear in between", () => {
    expect(effectiveResistance(params, 0.5)).toBe(5000);
  });

  it("throws for a wiper position outside [0, 1]", () => {
    expect(() => effectiveResistance(params, 1.5)).toThrow(RangeError);
    expect(() => effectiveResistance(params, -0.1)).toThrow(RangeError);
  });

  it("throws for a negative total resistance", () => {
    expect(() =>
      effectiveResistance({ totalResistanceOhms: -1, ratedPowerWatts: 0.2 }, 0.5)
    ).toThrow(RangeError);
  });

  it("throws for a non-positive rated power", () => {
    expect(() =>
      effectiveResistance({ totalResistanceOhms: 10_000, ratedPowerWatts: 0 }, 0.5)
    ).toThrow(RangeError);
  });
});

describe("evaluatePotentiometer", () => {
  it("reports the wiper-derived resistance and its power dissipation", () => {
    const result = evaluatePotentiometer(
      params,
      { wiperPosition: 0.5, currentAmps: 0.001 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.effectiveResistanceOhms).toBe(5000);
    expect(result.visual.powerDissipationWatts).toBeCloseTo(0.001 * 0.001 * 5000);
  });

  it("fails once dissipation exceeds rated power", () => {
    const result = evaluatePotentiometer(
      params,
      { wiperPosition: 1, currentAmps: 1 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
  });

  it("latches failed", () => {
    const failed = { status: "failed" as const, reason: "overloaded" };
    const result = evaluatePotentiometer(
      params,
      { wiperPosition: 0, currentAmps: 0 },
      { health: failed }
    );
    expect(result.health).toBe(failed);
  });
});

describe("potentiometerSeriesElement", () => {
  it("presents the wiper-derived resistance to the solver", () => {
    expect(potentiometerSeriesElement(params, 0.25)).toEqual({
      kind: "resistive",
      resistanceOhms: 2500,
    });
  });
});
