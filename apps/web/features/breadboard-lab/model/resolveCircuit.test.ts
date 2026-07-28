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
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeCloseTo((5 - 2) / 220);
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
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeCloseTo(0);
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

  it("carries no current when released", () => {
    const result = resolveCircuit(30, buildComponents(false), [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeCloseTo(0);
  });

  it("conducts when pressed", () => {
    const result = resolveCircuit(30, buildComponents(true), [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeCloseTo(5 / 220);
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
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeCloseTo(5 / 5000);
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
    expect(result.status).toBe("solved");
  });
});

describe("resolveCircuit — empty board", () => {
  it("reports 'empty' rather than solving a bare supply edge", () => {
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
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
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
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
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
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
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
    expect(dark.status).toBe("solved");
    expect(bright.status).toBe("solved");
    if (dark.status !== "solved" || bright.status !== "solved") return;
    expect(bright.supplyCurrentAmps).toBeGreaterThan(dark.supplyCurrentAmps);
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
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeCloseTo(9 / 220);
    expect(
      (result.componentResults.get("batt1")?.visual as { suppliedVoltageVolts: number })
        .suppliedVoltageVolts
    ).toBe(9);
  });
});

describe("resolveCircuit — PIR motion sensor as a digital presence switch", () => {
  it("conducts only when motion is detected, exactly like a closed pushbutton", () => {
    const buildComponents = (motionDetected: boolean): PlacedComponent[] => [
      resistor("r1", [POSITIVE_RAIL, STRIP_1]),
      {
        id: "pir1",
        type: "motionSensor",
        params: {},
        leads: [STRIP_1, NEGATIVE_RAIL],
        motionDetected,
        health: { status: "nominal" },
      },
    ];
    const noMotion = resolveCircuit(30, buildComponents(false), [], 5);
    const motion = resolveCircuit(30, buildComponents(true), [], 5);
    expect(noMotion.status).toBe("solved");
    expect(motion.status).toBe("solved");
    if (noMotion.status !== "solved" || motion.status !== "solved") return;
    expect(noMotion.supplyCurrentAmps).toBeCloseTo(0);
    expect(motion.supplyCurrentAmps).toBeCloseTo(5 / 220);
  });
});

describe("resolveCircuit — soil moisture sensor as a wetness-controlled variable resistor", () => {
  it("draws more current when simulated soil is wetter", () => {
    const buildComponents = (wetness: number): PlacedComponent[] => [
      {
        id: "soil1",
        type: "soilMoistureSensor",
        params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
        leads: [POSITIVE_RAIL, NEGATIVE_RAIL],
        wetness,
        health: { status: "nominal" },
      },
    ];
    const dry = resolveCircuit(30, buildComponents(0), [], 5);
    const wet = resolveCircuit(30, buildComponents(1), [], 5);
    expect(dry.status).toBe("solved");
    expect(wet.status).toBe("solved");
    if (dry.status !== "solved" || wet.status !== "solved") return;
    expect(wet.supplyCurrentAmps).toBeGreaterThan(dry.supplyCurrentAmps);
  });
});

describe("resolveCircuit — rain sensor as a rainfall-controlled variable resistor", () => {
  it("draws more current in simulated heavy rain than when dry", () => {
    const buildComponents = (rainLevel: number): PlacedComponent[] => [
      {
        id: "rain1",
        type: "rainSensor",
        params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
        leads: [POSITIVE_RAIL, NEGATIVE_RAIL],
        rainLevel,
        health: { status: "nominal" },
      },
    ];
    const dry = resolveCircuit(30, buildComponents(0), [], 5);
    const raining = resolveCircuit(30, buildComponents(1), [], 5);
    expect(dry.status).toBe("solved");
    expect(raining.status).toBe("solved");
    if (dry.status !== "solved" || raining.status !== "solved") return;
    expect(raining.supplyCurrentAmps).toBeGreaterThan(dry.supplyCurrentAmps);
  });
});

describe("resolveCircuit — sound sensor as a loudness-controlled variable resistor", () => {
  it("draws more current when simulated loudness is higher", () => {
    const buildComponents = (loudness: number): PlacedComponent[] => [
      {
        id: "sound1",
        type: "soundSensor",
        params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
        leads: [POSITIVE_RAIL, NEGATIVE_RAIL],
        loudness,
        health: { status: "nominal" },
      },
    ];
    const quiet = resolveCircuit(30, buildComponents(0), [], 5);
    const loud = resolveCircuit(30, buildComponents(1), [], 5);
    expect(quiet.status).toBe("solved");
    expect(loud.status).toBe("solved");
    if (quiet.status !== "solved" || loud.status !== "solved") return;
    expect(loud.supplyCurrentAmps).toBeGreaterThan(quiet.supplyCurrentAmps);
  });
});

describe("resolveCircuit — DHT11 as a fixed-current digital sensor load", () => {
  it("draws the same fixed current regardless of its simulated temperature/humidity readings", () => {
    const buildComponents = (
      simulatedTemperatureCelsius: number,
      simulatedHumidityPercent: number
    ): PlacedComponent[] => [
      {
        id: "dht1",
        type: "dht11",
        params: { operatingCurrentAmps: 0.0025 },
        leads: [POSITIVE_RAIL, NEGATIVE_RAIL],
        simulatedTemperatureCelsius,
        simulatedHumidityPercent,
        health: { status: "nominal" },
      },
    ];
    const cool = resolveCircuit(30, buildComponents(10, 20), [], 5);
    const hot = resolveCircuit(30, buildComponents(40, 90), [], 5);
    expect(cool.status).toBe("solved");
    expect(hot.status).toBe("solved");
    if (cool.status !== "solved" || hot.status !== "solved") return;
    expect(cool.supplyCurrentAmps).toBeCloseTo(hot.supplyCurrentAmps);
    expect(
      (hot.componentResults.get("dht1")?.visual as { temperatureCelsius: number })
        .temperatureCelsius
    ).toBe(40);
    expect(
      (hot.componentResults.get("dht1")?.visual as { humidityPercent: number })
        .humidityPercent
    ).toBe(90);
  });
});

describe("resolveCircuit — parallel branches (A-Engine: previously unsupported, now genuinely solved)", () => {
  it("solves two resistors wired straight across the rails as a real parallel branch, not a rejected topology", () => {
    // Before A-Engine (docs/architecture/0018-0021), this exact wiring hit
    // walkSeriesLoop's degree-2 requirement and reported
    // "unsupported-topology". The general MNA solver handles it directly.
    const components: PlacedComponent[] = [
      resistor("r1", [POSITIVE_RAIL, NEGATIVE_RAIL]),
      resistor("r2", [POSITIVE_RAIL, NEGATIVE_RAIL]),
    ];
    const result = resolveCircuit(30, components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    // Two 220Ω resistors in parallel: each carries 5/220, combined 10/220.
    expect(result.supplyCurrentAmps).toBeCloseTo(2 * (5 / 220));
  });

  it("solves two independent LED+resistor branches off the same rails in one resolve", () => {
    const components: PlacedComponent[] = [
      resistor("rA", [POSITIVE_RAIL, STRIP_1]),
      led("ledA", [STRIP_1, NEGATIVE_RAIL], true),
      resistor("rB", [POSITIVE_RAIL, { kind: "strip", row: "a", column: 2 }]),
      led("ledB", [{ kind: "strip", row: "a", column: 2 }, NEGATIVE_RAIL], false), // wired backwards
    ];
    const result = resolveCircuit(30, components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(
      (result.componentResults.get("ledA")?.visual as { brightness: number }).brightness
    ).toBeGreaterThan(0);
    expect(
      (result.componentResults.get("ledB")?.visual as { brightness: number }).brightness
    ).toBe(0);
  });
});
