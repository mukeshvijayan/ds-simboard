import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateFastBlowFuse, fastBlowFuseSeriesElement } from "./fastBlowFuse";

const PARAMS = { restingResistanceOhms: 0.05, ratedCurrentAmps: 1 };

describe("evaluateFastBlowFuse", () => {
  it("stays nominal under its rated current", () => {
    const result = evaluateFastBlowFuse(
      PARAMS,
      { currentAmps: 0.5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
  });

  it("blows (fails) once current exceeds its rated current", () => {
    const result = evaluateFastBlowFuse(
      PARAMS,
      { currentAmps: 1.5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
  });

  it("stays blown even once current drops back down", () => {
    const blown = evaluateFastBlowFuse(
      PARAMS,
      { currentAmps: 1.5 },
      { health: NOMINAL_HEALTH }
    );
    const after = evaluateFastBlowFuse(
      PARAMS,
      { currentAmps: 0 },
      { health: blown.health }
    );
    expect(after.health.status).toBe("failed");
  });
});

describe("fastBlowFuseSeriesElement", () => {
  it("is near-0Ω while intact", () => {
    expect(fastBlowFuseSeriesElement(PARAMS, NOMINAL_HEALTH)).toEqual({
      kind: "resistive",
      resistanceOhms: 0.05,
    });
  });

  it("opens permanently once blown", () => {
    expect(
      fastBlowFuseSeriesElement(PARAMS, { status: "failed", reason: "blown" })
    ).toEqual({ kind: "resistive", resistanceOhms: Infinity });
  });

  it("rejects a negative resting resistance", () => {
    expect(() =>
      fastBlowFuseSeriesElement(
        { restingResistanceOhms: -1, ratedCurrentAmps: 1 },
        NOMINAL_HEALTH
      )
    ).toThrow(RangeError);
  });

  it("rejects a non-positive rated current", () => {
    expect(() =>
      fastBlowFuseSeriesElement(
        { restingResistanceOhms: 0.05, ratedCurrentAmps: 0 },
        NOMINAL_HEALTH
      )
    ).toThrow(RangeError);
  });
});
