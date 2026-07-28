import { NOMINAL_HEALTH } from "../../contract/types";
import {
  evaluateRainSensor,
  rainSensorSeriesElement,
  effectiveRainResistance,
} from "./rainSensor";

const params = { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 };

describe("evaluateRainSensor", () => {
  it("presents its wet floor resistance at heavy rain", () => {
    const result = evaluateRainSensor(
      params,
      { rainLevel: 1 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health).toBe(NOMINAL_HEALTH);
    expect(result.visual.effectiveResistanceOhms).toBe(1_000);
  });

  it("presents its dry ceiling resistance with no rain", () => {
    const result = evaluateRainSensor(
      params,
      { rainLevel: 0 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.effectiveResistanceOhms).toBe(100_000);
  });
});

describe("effectiveRainResistance — validation", () => {
  it("throws for a negative minResistanceOhms", () => {
    expect(() =>
      effectiveRainResistance({ ...params, minResistanceOhms: -1 }, 0.5)
    ).toThrow(RangeError);
  });

  it("throws when maxResistanceOhms is not greater than minResistanceOhms", () => {
    expect(() =>
      effectiveRainResistance({ minResistanceOhms: 1000, maxResistanceOhms: 1000 }, 0.5)
    ).toThrow(RangeError);
  });

  it("throws for a rain level below 0", () => {
    expect(() => effectiveRainResistance(params, -0.1)).toThrow(RangeError);
  });

  it("throws for a rain level above 1", () => {
    expect(() => effectiveRainResistance(params, 1.1)).toThrow(RangeError);
  });
});

describe("rainSensorSeriesElement", () => {
  it("presents its rain-level-derived resistance", () => {
    expect(rainSensorSeriesElement(params, 1)).toEqual({
      kind: "resistive",
      resistanceOhms: 1_000,
    });
  });
});
