import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateServo, servoAngleFromPulseWidth, servoSeriesElement } from "./servo";

const PARAMS = { ratedVoltageVolts: 5, ratedCurrentAmps: 0.1, maxCurrentAmps: 0.6 };

describe("servoAngleFromPulseWidth", () => {
  it("maps 1000us to 0 degrees", () => {
    expect(servoAngleFromPulseWidth(1000)).toBe(0);
  });

  it("maps 1500us to 90 degrees (center)", () => {
    expect(servoAngleFromPulseWidth(1500)).toBe(90);
  });

  it("maps 2000us to 180 degrees", () => {
    expect(servoAngleFromPulseWidth(2000)).toBe(180);
  });

  it("rejects a pulse width outside 1000-2000us", () => {
    expect(() => servoAngleFromPulseWidth(999)).toThrow(RangeError);
    expect(() => servoAngleFromPulseWidth(2001)).toThrow(RangeError);
  });
});

describe("evaluateServo", () => {
  it("stays nominal under its rated current, angle reflects pulse width", () => {
    const result = evaluateServo(
      PARAMS,
      { currentAmps: 0.05, pulseWidthMicroseconds: 1750 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.angleDegrees).toBe(135);
  });

  it("fails once current exceeds its max rating", () => {
    const result = evaluateServo(
      PARAMS,
      { currentAmps: 0.8, pulseWidthMicroseconds: 1500 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
  });

  it("rejects a non-positive rated voltage", () => {
    expect(() =>
      evaluateServo(
        { ...PARAMS, ratedVoltageVolts: 0 },
        { currentAmps: 0.05, pulseWidthMicroseconds: 1500 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });
});

describe("servoSeriesElement", () => {
  it("presents its fixed rated resistance while healthy", () => {
    expect(servoSeriesElement(PARAMS, NOMINAL_HEALTH)).toEqual({
      kind: "resistive",
      resistanceOhms: 50,
    });
  });

  it("opens permanently once failed", () => {
    expect(
      servoSeriesElement(PARAMS, { status: "failed", reason: "overcurrent" })
    ).toEqual({ kind: "resistive", resistanceOhms: Infinity });
  });

  it("rejects a non-positive rated current", () => {
    expect(() =>
      servoSeriesElement({ ...PARAMS, ratedCurrentAmps: 0 }, NOMINAL_HEALTH)
    ).toThrow(RangeError);
  });

  it("rejects a maxCurrentAmps below ratedCurrentAmps", () => {
    expect(() =>
      servoSeriesElement({ ...PARAMS, maxCurrentAmps: 0.01 }, NOMINAL_HEALTH)
    ).toThrow(RangeError);
  });
});
