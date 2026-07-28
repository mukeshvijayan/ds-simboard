import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateRelayCoil, evaluateRelayContact, relayIsEnergized } from "./relay";

const params = {
  coilResistanceOhms: 400,
  pullInCurrentAmps: 0.02,
  contactOnResistanceOhms: 0.1,
  maxCoilCurrentAmps: 0.05,
  maxContactCurrentAmps: 2,
};

describe("relayIsEnergized", () => {
  it("is de-energized below the pull-in current", () => {
    expect(relayIsEnergized(params, 0.01)).toBe(false);
  });

  it("is energized at or above the pull-in current", () => {
    expect(relayIsEnergized(params, 0.02)).toBe(true);
    expect(relayIsEnergized(params, 0.03)).toBe(true);
  });
});

describe("evaluateRelayCoil", () => {
  it("reports energized from real coil current", () => {
    const result = evaluateRelayCoil(
      params,
      { currentAmps: 0.03 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.isEnergized).toBe(true);
    expect(result.health.status).toBe("nominal");
  });

  it("fails once coil current exceeds the max rating", () => {
    const result = evaluateRelayCoil(
      params,
      { currentAmps: 0.06 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
    expect(result.visual.isEnergized).toBe(false);
  });

  it("latches failed", () => {
    const failed = { status: "failed" as const, reason: "burned coil" };
    const result = evaluateRelayCoil(params, { currentAmps: 0 }, { health: failed });
    expect(result.health).toBe(failed);
  });

  it("throws for a non-positive coilResistanceOhms", () => {
    expect(() =>
      evaluateRelayCoil(
        { ...params, coilResistanceOhms: 0 },
        { currentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a negative currentAmps", () => {
    expect(() =>
      evaluateRelayCoil(params, { currentAmps: -0.01 }, { health: NOMINAL_HEALTH })
    ).toThrow(RangeError);
  });
});

describe("evaluateRelayContact — closed state driven by the coil's decision", () => {
  it("is closed when energized, even at zero contact current (no load wired yet)", () => {
    const result = evaluateRelayContact(
      params,
      { currentAmps: 0 },
      { health: NOMINAL_HEALTH },
      true
    );
    expect(result.visual.isClosed).toBe(true);
  });

  it("is open when not energized, regardless of any contact current reading", () => {
    const result = evaluateRelayContact(
      params,
      { currentAmps: 0 },
      { health: NOMINAL_HEALTH },
      false
    );
    expect(result.visual.isClosed).toBe(false);
  });

  it("fails once contact current exceeds the max rating, even while energized", () => {
    const result = evaluateRelayContact(
      params,
      { currentAmps: 3 },
      { health: NOMINAL_HEALTH },
      true
    );
    expect(result.health.status).toBe("failed");
    expect(result.visual.isClosed).toBe(false);
  });

  it("latches failed", () => {
    const failed = { status: "failed" as const, reason: "welded contact" };
    const result = evaluateRelayContact(
      params,
      { currentAmps: 0 },
      { health: failed },
      true
    );
    expect(result.health).toBe(failed);
  });
});

describe("evaluateRelayContact/evaluateRelayCoil — validation", () => {
  it("throws for a non-positive pullInCurrentAmps", () => {
    expect(() =>
      evaluateRelayCoil(
        { ...params, pullInCurrentAmps: 0 },
        { currentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws when maxCoilCurrentAmps is below pullInCurrentAmps", () => {
    expect(() =>
      evaluateRelayCoil(
        { ...params, maxCoilCurrentAmps: 0.01 },
        { currentAmps: 0.01 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive contactOnResistanceOhms", () => {
    expect(() =>
      evaluateRelayContact(
        { ...params, contactOnResistanceOhms: 0 },
        { currentAmps: 0 },
        { health: NOMINAL_HEALTH },
        true
      )
    ).toThrow(RangeError);
  });

  it("throws for a non-positive maxContactCurrentAmps", () => {
    expect(() =>
      evaluateRelayContact(
        { ...params, maxContactCurrentAmps: 0 },
        { currentAmps: 0 },
        { health: NOMINAL_HEALTH },
        true
      )
    ).toThrow(RangeError);
  });

  it("throws for a negative contact currentAmps", () => {
    expect(() =>
      evaluateRelayContact(
        params,
        { currentAmps: -0.1 },
        { health: NOMINAL_HEALTH },
        true
      )
    ).toThrow(RangeError);
  });
});
