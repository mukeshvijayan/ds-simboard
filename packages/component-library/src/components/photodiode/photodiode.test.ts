import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluatePhotodiode, effectivePhotodiodeResistance } from "./photodiode";

const PARAMS = {
  forwardVoltageVolts: 0.7,
  reverseBreakdownVoltageVolts: 60,
  darkResistanceOhms: 10_000_000,
  litResistanceOhms: 1_000,
};

describe("effectivePhotodiodeResistance", () => {
  it("is near its floor in full light", () => {
    expect(effectivePhotodiodeResistance(PARAMS, 1)).toBe(1_000);
  });

  it("is at its ceiling in darkness", () => {
    expect(effectivePhotodiodeResistance(PARAMS, 0)).toBe(10_000_000);
  });

  it("rejects a lightLevel outside 0-1", () => {
    expect(() => effectivePhotodiodeResistance(PARAMS, -0.1)).toThrow(RangeError);
    expect(() => effectivePhotodiodeResistance(PARAMS, 1.1)).toThrow(RangeError);
  });

  it("rejects litResistanceOhms not below darkResistanceOhms", () => {
    expect(() =>
      effectivePhotodiodeResistance(
        { ...PARAMS, litResistanceOhms: PARAMS.darkResistanceOhms },
        0.5
      )
    ).toThrow(RangeError);
  });

  it("rejects a negative darkResistanceOhms", () => {
    expect(() =>
      effectivePhotodiodeResistance({ ...PARAMS, darkResistanceOhms: -1 }, 0.5)
    ).toThrow(RangeError);
  });
});

describe("evaluatePhotodiode", () => {
  it("conducts normally when forward-biased, like a plain diode", () => {
    const result = evaluatePhotodiode(
      PARAMS,
      { biased: "forward", currentAmps: 0.01 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.isConducting).toBe(true);
  });

  it("reports a light-dependent resistance when safely reverse-biased", () => {
    const result = evaluatePhotodiode(
      PARAMS,
      { biased: "reverse", voltageVolts: -5, lightLevel: 1 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.isReverseBiased).toBe(true);
    expect(result.visual.effectiveResistanceOhms).toBe(1_000);
  });

  it("fails once reverse voltage exceeds its breakdown rating", () => {
    const result = evaluatePhotodiode(
      PARAMS,
      { biased: "reverse", voltageVolts: -70, lightLevel: 0.5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
  });

  it("a failed photodiode stays failed even once forward-biased again", () => {
    const failed = evaluatePhotodiode(
      PARAMS,
      { biased: "reverse", voltageVolts: -70, lightLevel: 0.5 },
      { health: NOMINAL_HEALTH }
    );
    const after = evaluatePhotodiode(
      PARAMS,
      { biased: "forward", currentAmps: 0.01 },
      { health: failed.health }
    );
    expect(after.health.status).toBe("failed");
  });
});
