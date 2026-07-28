import { NOMINAL_HEALTH } from "../../contract/types";
import {
  evaluateSoundSensor,
  soundSensorSeriesElement,
  effectiveSoundResistance,
} from "./soundSensor";

const params = { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 };

describe("evaluateSoundSensor", () => {
  it("presents its loud floor resistance at maximum loudness", () => {
    const result = evaluateSoundSensor(
      params,
      { loudness: 1 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health).toBe(NOMINAL_HEALTH);
    expect(result.visual.effectiveResistanceOhms).toBe(1_000);
  });

  it("presents its silent ceiling resistance at zero loudness", () => {
    const result = evaluateSoundSensor(
      params,
      { loudness: 0 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.effectiveResistanceOhms).toBe(100_000);
  });
});

describe("effectiveSoundResistance — validation", () => {
  it("throws for a negative minResistanceOhms", () => {
    expect(() =>
      effectiveSoundResistance({ ...params, minResistanceOhms: -1 }, 0.5)
    ).toThrow(RangeError);
  });

  it("throws when maxResistanceOhms is not greater than minResistanceOhms", () => {
    expect(() =>
      effectiveSoundResistance({ minResistanceOhms: 1000, maxResistanceOhms: 1000 }, 0.5)
    ).toThrow(RangeError);
  });

  it("throws for a loudness below 0", () => {
    expect(() => effectiveSoundResistance(params, -0.1)).toThrow(RangeError);
  });

  it("throws for a loudness above 1", () => {
    expect(() => effectiveSoundResistance(params, 1.1)).toThrow(RangeError);
  });
});

describe("soundSensorSeriesElement", () => {
  it("presents its loudness-derived resistance", () => {
    expect(soundSensorSeriesElement(params, 1)).toEqual({
      kind: "resistive",
      resistanceOhms: 1_000,
    });
  });
});
