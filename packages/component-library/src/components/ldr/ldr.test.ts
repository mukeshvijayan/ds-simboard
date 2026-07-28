import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateLdr, ldrSeriesElement, effectiveLdrResistance } from "./ldr";

const params = { minResistanceOhms: 500, maxResistanceOhms: 1_000_000 };

describe("evaluateLdr", () => {
  it("presents its bright-light floor resistance at full light", () => {
    const result = evaluateLdr(params, { lightLevel: 1 }, { health: NOMINAL_HEALTH });
    expect(result.health.status).toBe("nominal");
    expect(result.visual.effectiveResistanceOhms).toBe(500);
  });

  it("presents its dark-condition ceiling resistance at zero light", () => {
    const result = evaluateLdr(params, { lightLevel: 0 }, { health: NOMINAL_HEALTH });
    expect(result.visual.effectiveResistanceOhms).toBe(1_000_000);
  });

  it("interpolates linearly at a mid light level", () => {
    const result = evaluateLdr(params, { lightLevel: 0.5 }, { health: NOMINAL_HEALTH });
    expect(result.visual.effectiveResistanceOhms).toBeCloseTo(500_250);
  });

  it("has no failure mode — always nominal, like a potentiometer", () => {
    const result = evaluateLdr(params, { lightLevel: 0.3 }, { health: NOMINAL_HEALTH });
    expect(result.health).toBe(NOMINAL_HEALTH);
  });
});

describe("effectiveLdrResistance — validation", () => {
  it("throws for a negative minResistanceOhms", () => {
    expect(() =>
      effectiveLdrResistance({ ...params, minResistanceOhms: -1 }, 0.5)
    ).toThrow(RangeError);
  });

  it("throws when maxResistanceOhms is not greater than minResistanceOhms", () => {
    expect(() =>
      effectiveLdrResistance({ minResistanceOhms: 500, maxResistanceOhms: 500 }, 0.5)
    ).toThrow(RangeError);
  });

  it("throws for a light level below 0", () => {
    expect(() => effectiveLdrResistance(params, -0.1)).toThrow(RangeError);
  });

  it("throws for a light level above 1", () => {
    expect(() => effectiveLdrResistance(params, 1.1)).toThrow(RangeError);
  });
});

describe("ldrSeriesElement", () => {
  it("presents its light-level-derived resistance", () => {
    expect(ldrSeriesElement(params, 1)).toEqual({
      kind: "resistive",
      resistanceOhms: 500,
    });
  });
});
