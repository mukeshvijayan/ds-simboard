import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateDcMotor, dcMotorSeriesElement } from "./dcMotor";

const params = {
  ratedVoltageVolts: 6,
  ratedCurrentAmps: 0.1,
  stallCurrentAmps: 0.4,
};

describe("evaluateDcMotor — healthy operation", () => {
  it("spins at full speed at the rated current", () => {
    const result = evaluateDcMotor(
      params,
      { currentAmps: 0.1 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.speedFraction).toBeCloseTo(1);
  });

  it("spins at half speed at half the rated current", () => {
    const result = evaluateDcMotor(
      params,
      { currentAmps: 0.05 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.speedFraction).toBeCloseTo(0.5);
  });

  it("is stopped at 0 current", () => {
    const result = evaluateDcMotor(
      params,
      { currentAmps: 0 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.speedFraction).toBe(0);
  });

  it("goes stressed between rated and stall current", () => {
    const result = evaluateDcMotor(
      params,
      { currentAmps: 0.25 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("stressed");
  });
});

describe("evaluateDcMotor — stalled-rotor burnout", () => {
  it("burns out past stallCurrentAmps", () => {
    const result = evaluateDcMotor(
      params,
      { currentAmps: 1 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
    expect(result.health.reason).toMatch(/exceeds max rating/);
    expect(result.visual.speedFraction).toBe(0);
  });

  it("latches burned out even if current later drops to a safe level", () => {
    const failed = { status: "failed" as const, reason: "burned out" };
    const result = evaluateDcMotor(params, { currentAmps: 0.01 }, { health: failed });
    expect(result.health).toBe(failed);
    expect(result.visual.speedFraction).toBe(0);
  });
});

describe("evaluateDcMotor — validation", () => {
  it("throws for a non-positive rated voltage", () => {
    expect(() =>
      evaluateDcMotor(
        { ...params, ratedVoltageVolts: 0 },
        { currentAmps: 0.05 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive rated current", () => {
    expect(() =>
      evaluateDcMotor(
        { ...params, ratedCurrentAmps: 0 },
        { currentAmps: 0.05 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws when stallCurrentAmps is below ratedCurrentAmps", () => {
    expect(() =>
      evaluateDcMotor(
        { ...params, stallCurrentAmps: 0.01 },
        { currentAmps: 0.05 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });
});

describe("dcMotorSeriesElement", () => {
  it("presents a fixed winding resistance derived from rated voltage/current when healthy", () => {
    expect(dcMotorSeriesElement(params, NOMINAL_HEALTH)).toEqual({
      kind: "resistive",
      resistanceOhms: 6 / 0.1,
    });
  });

  it("presents an open circuit once failed", () => {
    const failed = { status: "failed" as const, reason: "burned out" };
    expect(dcMotorSeriesElement(params, failed)).toEqual({
      kind: "resistive",
      resistanceOhms: Infinity,
    });
  });
});
