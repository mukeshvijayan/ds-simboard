import { POSITIVE_RAIL, NEGATIVE_RAIL } from "./circuitGraph";
import { resolveCircuit } from "./resolveCircuit";
import type { PlacedComponent, PlacedLed, PlacedResistor } from "./types";

const STRIP_1 = { kind: "strip" as const, row: "a" as const, column: 1 };

const resistorParams = { resistanceOhms: 220, ratedPowerWatts: 0.25 };
const ledParams = {
  forwardVoltageVolts: 2,
  ratedCurrentAmps: 0.02,
  maxCurrentAmps: 0.03,
  color: "red" as const,
};

function resistor(id: string, leads: PlacedResistor["leads"]): PlacedResistor {
  return {
    id,
    type: "resistor",
    params: resistorParams,
    leads,
    health: { status: "nominal" },
  };
}

function led(
  id: string,
  leads: PlacedLed["leads"],
  leadZeroIsPositive: boolean
): PlacedLed {
  return {
    id,
    type: "led",
    params: ledParams,
    leads,
    leadZeroIsPositive,
    health: { status: "nominal" },
  };
}

describe("resolveCircuit — the golden path (LED + resistor + supply)", () => {
  // supply(+rail) -> r1 -> STRIP_1 -> led1 (anode toward STRIP_1) -> supply(-rail)
  const components: PlacedComponent[] = [
    resistor("r1", [POSITIVE_RAIL, STRIP_1]),
    led("led1", [STRIP_1, NEGATIVE_RAIL], true),
  ];

  it("lights up and stays nominal with a correctly-sized resistor", () => {
    const result = resolveCircuit(30, components, [], 5);
    expect(result.status).toBe("conducting");
    if (result.status !== "conducting") return;
    expect(result.currentAmps).toBeCloseTo((5 - 2) / 220);
    expect(result.componentResults.get("led1")?.health.status).toBe("nominal");
    expect(
      (result.componentResults.get("led1")?.visual as { brightness: number }).brightness
    ).toBeGreaterThan(0);
    expect(result.componentResults.get("r1")?.health.status).toBe("nominal");
  });

  it("burns out when the resistor is removed (LED wired directly across the supply)", () => {
    const noResistor: PlacedComponent[] = [
      led("led1", [POSITIVE_RAIL, NEGATIVE_RAIL], true),
    ];
    const result = resolveCircuit(30, noResistor, [], 5);
    expect(result.status).toBe("short-circuit");
    expect(result.componentResults.get("led1")?.health.status).toBe("failed");
  });

  it("does nothing (stays nominal, unlit) when the LED is wired backwards", () => {
    const backwards: PlacedComponent[] = [
      resistor("r1", [POSITIVE_RAIL, STRIP_1]),
      led("led1", [STRIP_1, NEGATIVE_RAIL], false), // anode on the wrong side
    ];
    const result = resolveCircuit(30, backwards, [], 5);
    expect(result.status).toBe("non-conducting");
    expect(result.componentResults.get("led1")?.health.status).toBe("nominal");
    expect(
      (result.componentResults.get("led1")?.visual as { brightness: number }).brightness
    ).toBe(0);
  });
});

describe("resolveCircuit — pushbutton gating the loop", () => {
  const buildComponents = (pressed: boolean): PlacedComponent[] => [
    {
      id: "sw1",
      type: "pushbutton",
      params: { isMomentary: true },
      leads: [POSITIVE_RAIL, STRIP_1],
      pressed,
      health: { status: "nominal" },
    },
    resistor("r1", [STRIP_1, NEGATIVE_RAIL]),
  ];

  it("is non-conducting when released", () => {
    const result = resolveCircuit(30, buildComponents(false), [], 5);
    expect(result.status).toBe("non-conducting");
  });

  it("conducts when pressed", () => {
    const result = resolveCircuit(30, buildComponents(true), [], 5);
    expect(result.status).toBe("conducting");
    if (result.status !== "conducting") return;
    expect(result.currentAmps).toBeCloseTo(5 / 220);
  });
});

describe("resolveCircuit — potentiometer as a variable resistor", () => {
  it("changes current with wiper position", () => {
    const components: PlacedComponent[] = [
      {
        id: "pot1",
        type: "potentiometer",
        params: { totalResistanceOhms: 10_000, ratedPowerWatts: 0.2 },
        leads: [POSITIVE_RAIL, NEGATIVE_RAIL],
        wiperPosition: 0.5,
        health: { status: "nominal" },
      },
    ];
    const result = resolveCircuit(30, components, [], 5);
    expect(result.status).toBe("conducting");
    if (result.status !== "conducting") return;
    expect(result.currentAmps).toBeCloseTo(5 / 5000);
  });
});

describe("resolveCircuit — wires merging holes", () => {
  it("solves correctly when a component lead is connected to a rail via a wire instead of directly", () => {
    const farHole = { kind: "strip" as const, row: "a" as const, column: 10 };
    const components: PlacedComponent[] = [
      resistor("r1", [farHole, STRIP_1]),
      led("led1", [STRIP_1, NEGATIVE_RAIL], true),
    ];
    const wires = [{ id: "w1", from: POSITIVE_RAIL, to: farHole }];
    const result = resolveCircuit(30, components, wires, 5);
    expect(result.status).toBe("conducting");
  });
});

describe("resolveCircuit — empty board", () => {
  it("reports 'empty' rather than 'unsupported-topology' when nothing is placed yet", () => {
    // A bare board only has the synthetic supply edge, whose two rail
    // nodes each have degree 1 — that's not a real "unsupported topology"
    // the user built, it's just an empty board, and should say so.
    const result = resolveCircuit(30, [], [], 5);
    expect(result.status).toBe("empty");
  });
});

describe("resolveCircuit — buzzer as a resistive load", () => {
  it("conducts and reports buzzing for an active buzzer", () => {
    const components: PlacedComponent[] = [
      {
        id: "bz1",
        type: "buzzer",
        params: {
          kind: "active",
          ratedVoltageVolts: 5,
          ratedCurrentAmps: 0.03,
          maxCurrentAmps: 0.05,
        },
        leads: [POSITIVE_RAIL, NEGATIVE_RAIL],
        health: { status: "nominal" },
      },
    ];
    const result = resolveCircuit(30, components, [], 5);
    expect(result.status).toBe("conducting");
    if (result.status !== "conducting") return;
    expect(
      (result.componentResults.get("bz1")?.visual as { isBuzzing: boolean }).isBuzzing
    ).toBe(true);
  });

  it("stays silent for a passive buzzer even while current flows", () => {
    const components: PlacedComponent[] = [
      {
        id: "bz1",
        type: "buzzer",
        params: {
          kind: "passive",
          ratedVoltageVolts: 5,
          ratedCurrentAmps: 0.03,
          maxCurrentAmps: 0.05,
        },
        leads: [POSITIVE_RAIL, NEGATIVE_RAIL],
        health: { status: "nominal" },
      },
    ];
    const result = resolveCircuit(30, components, [], 5);
    expect(result.status).toBe("conducting");
    if (result.status !== "conducting") return;
    expect(
      (result.componentResults.get("bz1")?.visual as { isBuzzing: boolean }).isBuzzing
    ).toBe(false);
  });
});

describe("resolveCircuit — DC motor as a resistive load", () => {
  it("conducts and reports a nonzero speed", () => {
    const components: PlacedComponent[] = [
      {
        id: "m1",
        type: "dcMotor",
        params: { ratedVoltageVolts: 6, ratedCurrentAmps: 0.1, stallCurrentAmps: 0.4 },
        leads: [POSITIVE_RAIL, NEGATIVE_RAIL],
        health: { status: "nominal" },
      },
    ];
    const result = resolveCircuit(30, components, [], 5);
    expect(result.status).toBe("conducting");
    if (result.status !== "conducting") return;
    expect(
      (result.componentResults.get("m1")?.visual as { speedFraction: number })
        .speedFraction
    ).toBeGreaterThan(0);
  });
});

describe("resolveCircuit — LDR as a light-controlled variable resistor", () => {
  it("draws more current in bright simulated light than in darkness", () => {
    const buildComponents = (lightLevel: number): PlacedComponent[] => [
      {
        id: "ldr1",
        type: "ldr",
        params: { minResistanceOhms: 500, maxResistanceOhms: 1_000_000 },
        leads: [POSITIVE_RAIL, NEGATIVE_RAIL],
        lightLevel,
        health: { status: "nominal" },
      },
    ];
    const dark = resolveCircuit(30, buildComponents(0), [], 5);
    const bright = resolveCircuit(30, buildComponents(1), [], 5);
    expect(dark.status).toBe("conducting");
    expect(bright.status).toBe("conducting");
    if (dark.status !== "conducting" || bright.status !== "conducting") return;
    expect(bright.currentAmps).toBeGreaterThan(dark.currentAmps);
  });
});

describe("resolveCircuit — battery holder as a transparent pass-through", () => {
  it("conducts the same current as a plain wire would, and displays the real supply voltage", () => {
    const components: PlacedComponent[] = [
      resistor("r1", [POSITIVE_RAIL, STRIP_1]),
      {
        id: "batt1",
        type: "batteryHolder",
        params: {},
        leads: [STRIP_1, NEGATIVE_RAIL],
        health: { status: "nominal" },
      },
    ];
    const result = resolveCircuit(30, components, [], 9);
    expect(result.status).toBe("conducting");
    if (result.status !== "conducting") return;
    expect(result.currentAmps).toBeCloseTo(9 / 220);
    expect(
      (result.componentResults.get("batt1")?.visual as { suppliedVoltageVolts: number })
        .suppliedVoltageVolts
    ).toBe(9);
  });
});

describe("resolveCircuit — unsupported topology", () => {
  it("reports an explicit unsupported-topology status for a parallel branch, instead of crashing or mis-solving", () => {
    // Two resistors both wired straight across the rails — a branch, not a series loop.
    const components: PlacedComponent[] = [
      resistor("r1", [POSITIVE_RAIL, NEGATIVE_RAIL]),
      resistor("r2", [POSITIVE_RAIL, NEGATIVE_RAIL]),
    ];
    const result = resolveCircuit(30, components, [], 5);
    expect(result.status).toBe("unsupported-topology");
    if (result.status !== "unsupported-topology") return;
    expect(result.message).toMatch(/complete series loop yet/i);
  });
});
