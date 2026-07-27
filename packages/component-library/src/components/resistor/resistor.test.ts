import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateResistor, resistorSeriesElement } from "./resistor";

const params = { resistanceOhms: 220, ratedPowerWatts: 0.25 };

describe("evaluateResistor", () => {
  it("computes power dissipation via P = I²R", () => {
    const result = evaluateResistor(
      params,
      { currentAmps: 0.01 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.powerDissipationWatts).toBeCloseTo(0.01 * 0.01 * 220);
  });

  it("stays nominal well under the rated power", () => {
    const result = evaluateResistor(
      params,
      { currentAmps: 0.01 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
  });

  it("goes stressed above 80% of rated power", () => {
    // I²R = 0.25*0.9 = 0.225W at this current, which is 90% of the 0.25W rating.
    const current = Math.sqrt((params.ratedPowerWatts * 0.9) / params.resistanceOhms);
    const result = evaluateResistor(
      params,
      { currentAmps: current },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("stressed");
  });

  it("fails once dissipation exceeds the rated power", () => {
    const current = Math.sqrt((params.ratedPowerWatts * 2) / params.resistanceOhms);
    const result = evaluateResistor(
      params,
      { currentAmps: current },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
    expect(result.health.reason).toBeDefined();
  });

  it("latches failed even if current later drops back to a safe level", () => {
    const failed = { status: "failed" as const, reason: "overheated" };
    const result = evaluateResistor(params, { currentAmps: 0 }, { health: failed });
    expect(result.health).toBe(failed);
  });

  it("throws for a negative resistance", () => {
    expect(() =>
      evaluateResistor(
        { resistanceOhms: -1, ratedPowerWatts: 0.25 },
        { currentAmps: 0 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive rated power", () => {
    expect(() =>
      evaluateResistor(
        { resistanceOhms: 220, ratedPowerWatts: 0 },
        { currentAmps: 0 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });
});

describe("resistorSeriesElement", () => {
  it("reports its fixed resistance regardless of health", () => {
    expect(resistorSeriesElement(params)).toEqual({
      kind: "resistive",
      resistanceOhms: 220,
    });
  });
});
