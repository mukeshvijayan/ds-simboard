import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateCapacitor } from "./capacitor";

const electrolytic = {
  capacitanceFarads: 100e-6,
  polarized: true,
  ratedVoltageVolts: 16,
};
const ceramic = { capacitanceFarads: 1e-6, polarized: false, ratedVoltageVolts: 50 };

describe("evaluateCapacitor — charging", () => {
  it("stays at 0V when no time has passed", () => {
    const result = evaluateCapacitor(
      electrolytic,
      { appliedVoltageVolts: 5, seriesResistanceOhms: 1000, deltaTimeSeconds: 0 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.storedVoltageVolts).toBe(0);
  });

  it("approaches the applied voltage after many time constants", () => {
    const timeConstant = 1000 * electrolytic.capacitanceFarads; // R*C
    const result = evaluateCapacitor(
      electrolytic,
      {
        appliedVoltageVolts: 5,
        seriesResistanceOhms: 1000,
        deltaTimeSeconds: timeConstant * 10,
      },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.storedVoltageVolts).toBeCloseTo(5, 2);
  });

  it("is at ~63% of the target after exactly one time constant (the textbook RC figure)", () => {
    const timeConstant = 1000 * electrolytic.capacitanceFarads;
    const result = evaluateCapacitor(
      electrolytic,
      {
        appliedVoltageVolts: 5,
        seriesResistanceOhms: 1000,
        deltaTimeSeconds: timeConstant,
      },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.storedVoltageVolts).toBeCloseTo(5 * (1 - Math.exp(-1)), 5);
  });

  it("continues charging correctly across successive ticks via threaded state", () => {
    const timeConstant = 1000 * electrolytic.capacitanceFarads;
    const first = evaluateCapacitor(
      electrolytic,
      {
        appliedVoltageVolts: 5,
        seriesResistanceOhms: 1000,
        deltaTimeSeconds: timeConstant,
      },
      { health: NOMINAL_HEALTH }
    );
    const second = evaluateCapacitor(
      electrolytic,
      {
        appliedVoltageVolts: 5,
        seriesResistanceOhms: 1000,
        deltaTimeSeconds: timeConstant,
      },
      { health: first.health, state: first.state }
    );
    // Two ticks of one time constant each should match one tick of two time constants.
    const oneShot = evaluateCapacitor(
      electrolytic,
      {
        appliedVoltageVolts: 5,
        seriesResistanceOhms: 1000,
        deltaTimeSeconds: timeConstant * 2,
      },
      { health: NOMINAL_HEALTH }
    );
    expect(second.visual.storedVoltageVolts).toBeCloseTo(
      oneShot.visual.storedVoltageVolts,
      5
    );
  });
});

describe("evaluateCapacitor — discharging", () => {
  it("decays toward 0 once the applied voltage is removed", () => {
    const timeConstant = 1000 * electrolytic.capacitanceFarads;
    const charged = evaluateCapacitor(
      electrolytic,
      {
        appliedVoltageVolts: 5,
        seriesResistanceOhms: 1000,
        deltaTimeSeconds: timeConstant * 10,
      },
      { health: NOMINAL_HEALTH }
    );
    const discharged = evaluateCapacitor(
      electrolytic,
      {
        appliedVoltageVolts: 0,
        seriesResistanceOhms: 1000,
        deltaTimeSeconds: timeConstant * 10,
      },
      { health: charged.health, state: charged.state }
    );
    expect(discharged.visual.storedVoltageVolts).toBeCloseTo(0, 2);
  });
});

describe("evaluateCapacitor — reverse polarity (spec Part 2.3)", () => {
  it("fails an electrolytic capacitor charged with reversed polarity", () => {
    const result = evaluateCapacitor(
      electrolytic,
      { appliedVoltageVolts: -5, seriesResistanceOhms: 1000, deltaTimeSeconds: 10 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
    expect(result.health.reason).toMatch(/reverse voltage/);
  });

  it("does not fail a non-polarized (ceramic) capacitor under the same reverse voltage", () => {
    const result = evaluateCapacitor(
      ceramic,
      { appliedVoltageVolts: -5, seriesResistanceOhms: 1000, deltaTimeSeconds: 10 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
  });

  it("latches failed even if the applied voltage later returns to correct polarity", () => {
    const failed = { status: "failed" as const, reason: "reversed" };
    const result = evaluateCapacitor(
      electrolytic,
      { appliedVoltageVolts: 5, seriesResistanceOhms: 1000, deltaTimeSeconds: 10 },
      { health: failed }
    );
    expect(result.health).toBe(failed);
  });
});

describe("evaluateCapacitor — over-voltage", () => {
  it("fails once stored voltage exceeds the rated voltage, even at correct polarity", () => {
    const result = evaluateCapacitor(
      electrolytic,
      { appliedVoltageVolts: 50, seriesResistanceOhms: 10, deltaTimeSeconds: 100 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
    expect(result.health.reason).toMatch(/exceeds rated/);
  });

  it("reports a chargeRatio of 1 once at or above the rated voltage", () => {
    const result = evaluateCapacitor(
      electrolytic,
      { appliedVoltageVolts: 50, seriesResistanceOhms: 10, deltaTimeSeconds: 100 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.chargeRatio).toBe(1);
  });
});

describe("evaluateCapacitor — validation", () => {
  it("throws for a non-positive capacitance", () => {
    expect(() =>
      evaluateCapacitor(
        { capacitanceFarads: 0, polarized: false, ratedVoltageVolts: 16 },
        { appliedVoltageVolts: 5, seriesResistanceOhms: 1000, deltaTimeSeconds: 1 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive rated voltage", () => {
    expect(() =>
      evaluateCapacitor(
        { capacitanceFarads: 1e-6, polarized: false, ratedVoltageVolts: 0 },
        { appliedVoltageVolts: 5, seriesResistanceOhms: 1000, deltaTimeSeconds: 1 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a negative series resistance", () => {
    expect(() =>
      evaluateCapacitor(
        electrolytic,
        { appliedVoltageVolts: 5, seriesResistanceOhms: -1, deltaTimeSeconds: 1 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a negative deltaTimeSeconds", () => {
    expect(() =>
      evaluateCapacitor(
        electrolytic,
        { appliedVoltageVolts: 5, seriesResistanceOhms: 1000, deltaTimeSeconds: -1 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });
});
