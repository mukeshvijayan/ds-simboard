import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateResettableFuse, resettableFuseSeriesElement } from "./resettableFuse";

const PARAMS = {
  restingResistanceOhms: 0.1,
  trippedResistanceOhms: 1000,
  tripCurrentAmps: 1,
  holdCurrentAmps: 0.3,
  destructiveCurrentAmps: 10,
};

describe("evaluateResettableFuse", () => {
  it("stays nominal under its trip current", () => {
    const result = evaluateResettableFuse(
      PARAMS,
      { currentAmps: 0.5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
  });

  it("trips (stressed, not failed) once current exceeds tripCurrentAmps", () => {
    const result = evaluateResettableFuse(
      PARAMS,
      { currentAmps: 1.5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("stressed");
  });

  it("stays tripped while current is between holdCurrentAmps and tripCurrentAmps (hysteresis)", () => {
    const tripped = evaluateResettableFuse(
      PARAMS,
      { currentAmps: 1.5 },
      { health: NOMINAL_HEALTH }
    );
    const still = evaluateResettableFuse(
      PARAMS,
      { currentAmps: 0.5 },
      { health: tripped.health }
    );
    expect(still.health.status).toBe("stressed");
  });

  it("resets once current drops below holdCurrentAmps", () => {
    const tripped = evaluateResettableFuse(
      PARAMS,
      { currentAmps: 1.5 },
      { health: NOMINAL_HEALTH }
    );
    const reset = evaluateResettableFuse(
      PARAMS,
      { currentAmps: 0.1 },
      { health: tripped.health }
    );
    expect(reset.health.status).toBe("nominal");
  });

  it("is permanently destroyed by a current far beyond its rating", () => {
    const result = evaluateResettableFuse(
      PARAMS,
      { currentAmps: 20 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
    const after = evaluateResettableFuse(
      PARAMS,
      { currentAmps: 0 },
      { health: result.health }
    );
    expect(after.health.status).toBe("failed");
  });
});

describe("resettableFuse param validation", () => {
  it("rejects a negative restingResistanceOhms", () => {
    expect(() =>
      resettableFuseSeriesElement(
        { ...PARAMS, restingResistanceOhms: -1 },
        NOMINAL_HEALTH
      )
    ).toThrow(RangeError);
  });

  it("rejects trippedResistanceOhms not greater than restingResistanceOhms", () => {
    expect(() =>
      resettableFuseSeriesElement(
        { ...PARAMS, trippedResistanceOhms: 0.1 },
        NOMINAL_HEALTH
      )
    ).toThrow(RangeError);
  });

  it("rejects a holdCurrentAmps that isn't below tripCurrentAmps", () => {
    expect(() =>
      resettableFuseSeriesElement({ ...PARAMS, holdCurrentAmps: 1 }, NOMINAL_HEALTH)
    ).toThrow(RangeError);
  });

  it("rejects a destructiveCurrentAmps not above tripCurrentAmps", () => {
    expect(() =>
      resettableFuseSeriesElement(
        { ...PARAMS, destructiveCurrentAmps: 1 },
        NOMINAL_HEALTH
      )
    ).toThrow(RangeError);
  });
});

describe("resettableFuseSeriesElement", () => {
  it("is near-0Ω while untripped", () => {
    expect(resettableFuseSeriesElement(PARAMS, NOMINAL_HEALTH)).toEqual({
      kind: "resistive",
      resistanceOhms: 0.1,
    });
  });

  it("is sharply higher while tripped", () => {
    expect(resettableFuseSeriesElement(PARAMS, { status: "stressed" })).toEqual({
      kind: "resistive",
      resistanceOhms: 1000,
    });
  });

  it("opens entirely once destroyed", () => {
    expect(
      resettableFuseSeriesElement(PARAMS, { status: "failed", reason: "destroyed" })
    ).toEqual({ kind: "resistive", resistanceOhms: Infinity });
  });
});
