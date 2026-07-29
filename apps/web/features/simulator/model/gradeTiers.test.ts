import { BOARD_TIER, COMPONENT_TIER, GRADE_TIER_LABELS, GRADE_TIERS } from "./gradeTiers";

describe("gradeTiers — every tier has a label", () => {
  it("labels every entry in GRADE_TIERS", () => {
    for (const tier of GRADE_TIERS) {
      expect(GRADE_TIER_LABELS[tier]).toBeDefined();
    }
  });
});

describe("gradeTiers — spot checks against the actual build-phase history", () => {
  it("puts Phase A1's grade 3-5 set in foundations", () => {
    expect(COMPONENT_TIER.resistor).toBe("foundations");
    expect(COMPONENT_TIER.led).toBe("foundations");
    expect(COMPONENT_TIER.batteryHolder).toBe("foundations");
  });

  it("puts Phase A2's grade 6-8 sensors in building", () => {
    expect(COMPONENT_TIER.motionSensor).toBe("building");
    expect(COMPONENT_TIER.dht11).toBe("building");
  });

  it("puts ADR 0017's deferred multi-lead/two-phase components in advanced", () => {
    expect(COMPONENT_TIER.rgbLed).toBe("advanced");
    expect(COMPONENT_TIER.sevenSegmentDisplay).toBe("advanced");
    expect(COMPONENT_TIER.transistor).toBe("advanced");
    expect(COMPONENT_TIER.relay).toBe("advanced");
  });

  it("puts both boards in advanced", () => {
    expect(BOARD_TIER.arduinoUno).toBe("advanced");
    expect(BOARD_TIER.esp32).toBe("advanced");
  });
});
