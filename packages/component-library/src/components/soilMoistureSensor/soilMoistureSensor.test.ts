import { NOMINAL_HEALTH } from "../../contract/types";
import {
  evaluateSoilMoistureSensor,
  soilMoistureSensorSeriesElement,
  effectiveSoilMoistureResistance,
} from "./soilMoistureSensor";

const params = { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 };

describe("evaluateSoilMoistureSensor", () => {
  it("presents its wet floor resistance at full wetness", () => {
    const result = evaluateSoilMoistureSensor(
      params,
      { wetness: 1 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health).toBe(NOMINAL_HEALTH);
    expect(result.visual.effectiveResistanceOhms).toBe(1_000);
  });

  it("presents its dry ceiling resistance at zero wetness", () => {
    const result = evaluateSoilMoistureSensor(
      params,
      { wetness: 0 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.effectiveResistanceOhms).toBe(100_000);
  });
});

describe("effectiveSoilMoistureResistance — validation", () => {
  it("throws for a negative minResistanceOhms", () => {
    expect(() =>
      effectiveSoilMoistureResistance({ ...params, minResistanceOhms: -1 }, 0.5)
    ).toThrow(RangeError);
  });

  it("throws when maxResistanceOhms is not greater than minResistanceOhms", () => {
    expect(() =>
      effectiveSoilMoistureResistance(
        { minResistanceOhms: 1000, maxResistanceOhms: 1000 },
        0.5
      )
    ).toThrow(RangeError);
  });

  it("throws for a wetness below 0", () => {
    expect(() => effectiveSoilMoistureResistance(params, -0.1)).toThrow(RangeError);
  });

  it("throws for a wetness above 1", () => {
    expect(() => effectiveSoilMoistureResistance(params, 1.1)).toThrow(RangeError);
  });
});

describe("soilMoistureSensorSeriesElement", () => {
  it("presents its wetness-derived resistance", () => {
    expect(soilMoistureSensorSeriesElement(params, 1)).toEqual({
      kind: "resistive",
      resistanceOhms: 1_000,
    });
  });
});
