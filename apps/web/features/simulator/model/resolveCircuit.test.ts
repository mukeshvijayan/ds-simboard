import { overallHealthStatus, resolveCircuit } from "./resolveCircuit";
import type {
  CanvasWireModel,
  PlacedBoard,
  PlacedBreadboard,
  PlacedComponent,
} from "./types";
import type { ConnectionPointRef } from "./connectionPoint";

const resistorParams = { resistanceOhms: 220, ratedPowerWatts: 0.25 };
const ledParams = {
  forwardVoltageVolts: 2,
  ratedCurrentAmps: 0.02,
  maxCurrentAmps: 0.03,
  color: "red" as const,
};

function breadboard(id = "bb1"): PlacedBreadboard {
  return { id, position: { x: 0, y: 0 }, columns: 30, pixelWidth: 600, pixelHeight: 300 };
}

const positiveRail = (boardItemId = "bb1"): ConnectionPointRef => ({
  kind: "breadboardHole",
  boardItemId,
  hole: { kind: "rail", rail: "top-positive" },
});
const negativeRail = (boardItemId = "bb1"): ConnectionPointRef => ({
  kind: "breadboardHole",
  boardItemId,
  hole: { kind: "rail", rail: "top-negative" },
});
const strip = (
  row: "a" | "b",
  column: number,
  boardItemId = "bb1"
): ConnectionPointRef => ({
  kind: "breadboardHole",
  boardItemId,
  hole: { kind: "strip", row, column },
});

function resistor(
  id: string,
  leads: [ConnectionPointRef, ConnectionPointRef]
): PlacedComponent {
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
  leads: [ConnectionPointRef, ConnectionPointRef],
  leadZeroIsPositive: boolean
): PlacedComponent {
  return {
    id,
    type: "led",
    params: ledParams,
    leads,
    leadZeroIsPositive,
    health: { status: "nominal" },
  };
}

describe("resolveCircuit — the golden path (LED + resistor + a placed breadboard)", () => {
  it("lights up with a correctly-sized resistor", () => {
    const components: PlacedComponent[] = [
      resistor("r1", [positiveRail(), strip("a", 1)]),
      led("led1", [strip("a", 1), negativeRail()], true),
    ];
    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeCloseTo((5 - 2) / 220);
    expect(
      (result.componentResults.get("led1")?.visual as { brightness: number }).brightness
    ).toBeGreaterThan(0);
  });

  it("burns out when wired directly across the rails with no resistor", () => {
    const components: PlacedComponent[] = [
      led("led1", [positiveRail(), negativeRail()], true),
    ];
    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("short-circuit");
    expect(overallHealthStatus(result.componentResults.get("led1")!.health)).toBe(
      "failed"
    );
  });

  it("stays dark, unharmed, when wired backwards", () => {
    const components: PlacedComponent[] = [
      resistor("r1", [positiveRail(), strip("a", 1)]),
      led("led1", [strip("a", 1), negativeRail()], false),
    ];
    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeCloseTo(0);
    expect(overallHealthStatus(result.componentResults.get("led1")!.health)).toBe(
      "nominal"
    );
  });
});

describe("resolveCircuit — no breadboard placed", () => {
  it("reports 'no-power' for a component with nothing to power it", () => {
    const components: PlacedComponent[] = [
      resistor("r1", [
        { kind: "componentLead", componentItemId: "r1", leadName: "a" },
        { kind: "componentLead", componentItemId: "r1", leadName: "b" },
      ]),
    ];
    const result = resolveCircuit([], components, [], 5);
    expect(result.status).toBe("no-power");
  });

  it("reports 'empty' for a bare canvas", () => {
    const result = resolveCircuit([], [], [], 5);
    expect(result.status).toBe("empty");
  });
});

describe("resolveCircuit — parallel branches (the general MNA solver's whole point)", () => {
  it("solves two independent resistor branches off one breadboard's rails in a single resolve", () => {
    const components: PlacedComponent[] = [
      resistor("r1", [positiveRail(), negativeRail()]),
      resistor("r2", [positiveRail(), negativeRail()]),
    ];
    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeCloseTo(2 * (5 / 220));
  });
});

describe("resolveCircuit — a component spanning two breadboards via a wire", () => {
  it("lights an LED whose resistor leg sits on a second breadboard, wired across", () => {
    const boards = [breadboard("bb1"), breadboard("bb2")];
    const components: PlacedComponent[] = [
      resistor("r1", [positiveRail("bb2"), strip("a", 1, "bb2")]),
      led("led1", [strip("a", 1, "bb2"), negativeRail("bb1")], true),
    ];
    const wires: CanvasWireModel[] = [
      { id: "w1", from: positiveRail("bb1"), to: positiveRail("bb2") },
      { id: "w2", from: negativeRail("bb1"), to: negativeRail("bb2") },
    ];
    const result = resolveCircuit(boards, components, wires, 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeCloseTo((5 - 2) / 220);
  });
});

describe("resolveCircuit — a second, unconnected breadboard reports 'unresolved'", () => {
  it("does not crash on a genuinely disconnected second supply", () => {
    const result = resolveCircuit([breadboard("bb1"), breadboard("bb2")], [], [], 5);
    expect(result.status).toBe("unresolved");
  });
});

describe("resolveCircuit — short-circuit marks every placed component failed", () => {
  it("fails the LED and every other component sharing the shorted circuit", () => {
    const components: PlacedComponent[] = [
      led("led1", [positiveRail(), negativeRail()], true),
      {
        id: "pot1",
        type: "potentiometer",
        params: { totalResistanceOhms: 10_000, ratedPowerWatts: 0.2 },
        leads: [positiveRail(), negativeRail()],
        wiperPosition: 0.5,
        health: { status: "nominal" },
      },
    ];
    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("short-circuit");
    expect(overallHealthStatus(result.componentResults.get("led1")!.health)).toBe(
      "failed"
    );
    expect(overallHealthStatus(result.componentResults.get("pot1")!.health)).toBe(
      "failed"
    );
  });
});

describe("resolveCircuit — RGB LED (P2-2, closing ADR 0022)", () => {
  const channelParams = (
    forwardVoltageVolts: number,
    color: "red" | "green" | "blue"
  ) => ({
    forwardVoltageVolts,
    ratedCurrentAmps: 0.02,
    maxCurrentAmps: 0.03,
    color,
  });

  it("lights each channel independently through its own resistor", () => {
    const components: PlacedComponent[] = [
      resistor("rR", [positiveRail(), strip("a", 1)]),
      resistor("rG", [positiveRail(), strip("a", 2)]),
      resistor("rB", [positiveRail(), strip("a", 3)]),
      {
        id: "rgb1",
        type: "rgbLed",
        params: {
          commonTerminal: "cathode",
          red: channelParams(2.0, "red"),
          green: channelParams(2.1, "green"),
          blue: channelParams(3.2, "blue"),
        },
        commonLead: negativeRail(),
        redLead: strip("a", 1),
        greenLead: strip("a", 2),
        blueLead: strip("a", 3),
        health: {
          red: { status: "nominal" },
          green: { status: "nominal" },
          blue: { status: "nominal" },
        },
      },
    ];
    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;

    const rgb = result.componentResults.get("rgb1");
    const visual = rgb?.visual as {
      red: { visual: { brightness: number } };
      green: { visual: { brightness: number } };
      blue: { visual: { brightness: number } };
    };
    expect(visual.red.visual.brightness).toBeGreaterThan(0);
    expect(visual.green.visual.brightness).toBeGreaterThan(0);
    expect(visual.blue.visual.brightness).toBeGreaterThan(0);
  });

  it("fails only the shorted channel, leaving the others nominal", () => {
    const components: PlacedComponent[] = [
      resistor("rG", [positiveRail(), strip("a", 2)]),
      {
        id: "rgb1",
        type: "rgbLed",
        params: {
          commonTerminal: "cathode",
          red: channelParams(2.0, "red"),
          green: channelParams(2.1, "green"),
          blue: channelParams(3.2, "blue"),
        },
        commonLead: negativeRail(),
        // Red wired directly across the rails — no resistor, a short.
        redLead: positiveRail(),
        greenLead: strip("a", 2),
        blueLead: positiveRail(),
        health: {
          red: { status: "nominal" },
          green: { status: "nominal" },
          blue: { status: "nominal" },
        },
      },
    ];
    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("short-circuit");

    const rgb = result.componentResults.get("rgb1");
    const health = rgb?.health as {
      red: { status: string };
      green: { status: string };
      blue: { status: string };
    };
    expect(health.red.status).toBe("failed");
    expect(health.green.status).toBe("failed");
    expect(health.blue.status).toBe("failed");
  });
});

describe("resolveCircuit — 7-segment display (P2-2, closing ADR 0022)", () => {
  it("lights only the wired-and-resistor-protected segments", () => {
    const segmentParams = {
      forwardVoltageVolts: 2,
      ratedCurrentAmps: 0.02,
      maxCurrentAmps: 0.03,
      color: "red" as const,
    };
    const components: PlacedComponent[] = [
      resistor("rA", [positiveRail(), strip("a", 1)]),
      resistor("rB", [positiveRail(), strip("a", 2)]),
      {
        id: "seg1",
        type: "sevenSegmentDisplay",
        params: { commonTerminal: "cathode", segment: segmentParams },
        commonLead: negativeRail(),
        segmentLeads: {
          a: strip("a", 1),
          b: strip("a", 2),
          c: strip("a", 3), // unwired dead-end elsewhere — stays dark
          d: strip("a", 3),
          e: strip("a", 3),
          f: strip("a", 3),
          g: strip("a", 3),
          dp: strip("a", 3),
        },
        health: {
          a: { status: "nominal" },
          b: { status: "nominal" },
          c: { status: "nominal" },
          d: { status: "nominal" },
          e: { status: "nominal" },
          f: { status: "nominal" },
          g: { status: "nominal" },
          dp: { status: "nominal" },
        },
      },
    ];
    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;

    const seg = result.componentResults.get("seg1");
    const visual = seg?.visual as {
      segments: Record<string, { visual: { brightness: number } }>;
    };
    expect(visual.segments.a.visual.brightness).toBeGreaterThan(0);
    expect(visual.segments.b.visual.brightness).toBeGreaterThan(0);
    expect(visual.segments.c.visual.brightness).toBe(0);
  });
});

describe("resolveCircuit — a resistive sensor placed directly on the rails", () => {
  it("solves an LDR the same way it would on a single breadboard", () => {
    const components: PlacedComponent[] = [
      {
        id: "ldr1",
        type: "ldr",
        params: { minResistanceOhms: 500, maxResistanceOhms: 1_000_000 },
        leads: [positiveRail(), negativeRail()],
        lightLevel: 1,
        health: { status: "nominal" },
      },
    ];
    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBeGreaterThan(0);
  });
});

describe("resolveCircuit — transistor-as-switch, two-phase resolve (P2-2 part 2, closing ADR 0022/0026)", () => {
  const transistorParams = {
    baseEmitterVoltageDropVolts: 0.7,
    baseThresholdCurrentAmps: 0.0005,
    onResistanceOhms: 1,
    maxCollectorCurrentAmps: 0.5,
  };

  it("saturates on and lights the collector-side LED when base current clears the threshold", () => {
    // Base current = (5 - 0.7) / 4700 ~= 0.915mA, above the 0.5mA threshold.
    const components: PlacedComponent[] = [
      {
        id: "rb",
        type: "resistor",
        params: { resistanceOhms: 4700, ratedPowerWatts: 0.25 },
        leads: [positiveRail(), strip("a", 1)],
        health: { status: "nominal" },
      },
      {
        id: "q1",
        type: "transistor",
        params: transistorParams,
        baseLead: strip("a", 1),
        collectorLead: strip("a", 2),
        emitterLead: negativeRail(),
        health: { status: "nominal" },
      },
      resistor("rc", [positiveRail(), strip("a", 3)]),
      led("led1", [strip("a", 3), strip("a", 2)], true),
    ];

    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;

    const transistorResult = result.componentResults.get("q1");
    const visual = transistorResult?.visual as {
      isOn: boolean;
      collectorCurrentAmps: number;
    };
    expect(visual.isOn).toBe(true);
    expect(visual.collectorCurrentAmps).toBeGreaterThan(0);

    const ledResult = result.componentResults.get("led1");
    expect((ledResult?.visual as { brightness: number }).brightness).toBeGreaterThan(0);
  });

  it("stays off, and the collector-side LED stays dark, when base current is below the threshold", () => {
    const components: PlacedComponent[] = [
      // Same 4700Ω base resistor (~0.915mA), but now below a deliberately
      // high 10mA threshold — the switch shouldn't saturate.
      {
        id: "rb",
        type: "resistor",
        params: { resistanceOhms: 4700, ratedPowerWatts: 0.25 },
        leads: [positiveRail(), strip("a", 1)],
        health: { status: "nominal" },
      },
      {
        id: "q1",
        type: "transistor",
        params: { ...transistorParams, baseThresholdCurrentAmps: 0.01 },
        baseLead: strip("a", 1),
        collectorLead: strip("a", 2),
        emitterLead: negativeRail(),
        health: { status: "nominal" },
      },
      resistor("rc", [positiveRail(), strip("a", 3)]),
      led("led1", [strip("a", 3), strip("a", 2)], true),
    ];

    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;

    const transistorResult = result.componentResults.get("q1");
    expect((transistorResult?.visual as { isOn: boolean }).isOn).toBe(false);
    expect(
      (transistorResult?.visual as { collectorCurrentAmps: number }).collectorCurrentAmps
    ).toBe(0);

    const ledResult = result.componentResults.get("led1");
    expect((ledResult?.visual as { brightness: number }).brightness).toBe(0);
  });

  it("fails the transistor once collector current exceeds its rating, without harming the LED", () => {
    const components: PlacedComponent[] = [
      resistor("rb", [positiveRail(), strip("a", 1)]),
      {
        id: "q1",
        type: "transistor",
        params: { ...transistorParams, maxCollectorCurrentAmps: 0.001 },
        baseLead: strip("a", 1),
        collectorLead: strip("a", 2),
        emitterLead: negativeRail(),
        health: { status: "nominal" },
      },
      resistor("rc", [positiveRail(), strip("a", 3)]),
      led("led1", [strip("a", 3), strip("a", 2)], true),
    ];

    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;

    const transistorResult = result.componentResults.get("q1");
    expect(transistorResult?.health).toEqual({
      status: "failed",
      reason: expect.stringContaining("collector current"),
    });
  });
});

describe("resolveCircuit — relay module, two-phase resolve (P2-2 part 2, closing ADR 0022/0026)", () => {
  const relayParams = {
    coilResistanceOhms: 400,
    pullInCurrentAmps: 0.01,
    contactOnResistanceOhms: 0.05,
    maxCoilCurrentAmps: 0.05,
    maxContactCurrentAmps: 2,
  };

  it("energizes and closes the contact, lighting an independent load circuit", () => {
    // Coil current = 5 / 400 = 12.5mA, above the 10mA pull-in threshold.
    const components: PlacedComponent[] = [
      {
        id: "k1",
        type: "relay",
        params: relayParams,
        coilLeadA: positiveRail(),
        coilLeadB: negativeRail(),
        contactLeadA: positiveRail(),
        contactLeadB: strip("a", 1),
        health: { coil: { status: "nominal" }, contact: { status: "nominal" } },
      },
      resistor("rload", [strip("a", 1), negativeRail()]),
    ];

    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;

    const relayResult = result.componentResults.get("k1");
    const visual = relayResult?.visual as {
      coil: { visual: { isEnergized: boolean } };
      contact: { visual: { isClosed: boolean; currentAmps: number } };
    };
    expect(visual.coil.visual.isEnergized).toBe(true);
    expect(visual.contact.visual.isClosed).toBe(true);
    expect(visual.contact.visual.currentAmps).toBeGreaterThan(0);
  });

  it("stays de-energized and open when coil current is below the pull-in threshold", () => {
    const components: PlacedComponent[] = [
      {
        id: "k1",
        type: "relay",
        params: { ...relayParams, pullInCurrentAmps: 1, maxCoilCurrentAmps: 2 },
        coilLeadA: positiveRail(),
        coilLeadB: negativeRail(),
        contactLeadA: positiveRail(),
        contactLeadB: strip("a", 1),
        health: { coil: { status: "nominal" }, contact: { status: "nominal" } },
      },
      resistor("rload", [strip("a", 1), negativeRail()]),
    ];

    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;

    const relayResult = result.componentResults.get("k1");
    const visual = relayResult?.visual as {
      coil: { visual: { isEnergized: boolean } };
      contact: { visual: { isClosed: boolean; currentAmps: number } };
    };
    expect(visual.coil.visual.isEnergized).toBe(false);
    expect(visual.contact.visual.isClosed).toBe(false);
    expect(visual.contact.visual.currentAmps).toBe(0);
  });

  it("fails only the coil, not the contact, on coil over-current", () => {
    const components: PlacedComponent[] = [
      {
        id: "k1",
        type: "relay",
        params: { ...relayParams, pullInCurrentAmps: 0.0005, maxCoilCurrentAmps: 0.001 },
        coilLeadA: positiveRail(),
        coilLeadB: negativeRail(),
        contactLeadA: positiveRail(),
        contactLeadB: strip("a", 1),
        health: { coil: { status: "nominal" }, contact: { status: "nominal" } },
      },
      resistor("rload", [strip("a", 1), negativeRail()]),
    ];

    const result = resolveCircuit([breadboard()], components, [], 5);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;

    const relayResult = result.componentResults.get("k1");
    const health = relayResult?.health as {
      coil: { status: string };
      contact: { status: string };
    };
    expect(health.coil.status).toBe("failed");
    expect(health.contact.status).toBe("nominal");
  });
});

describe("resolveCircuit — boards as canvas components (P2-3, closing ADR 0027)", () => {
  const unoBoard = (running: boolean): PlacedBoard => ({
    id: "uno-1",
    boardType: "arduinoUno",
    position: { x: 0, y: 0 },
    program: "blink",
    running,
  });

  const boardPin = (boardItemId: string, pinName: string): ConnectionPointRef => ({
    kind: "boardPin",
    boardItemId,
    pinName,
  });

  const bareLead = (leadName: string): ConnectionPointRef => ({
    kind: "componentLead",
    componentItemId: "junction",
    leadName,
  });

  it("powers a circuit on its own — no breadboard required — from its own 5V/GND pins", () => {
    const components: PlacedComponent[] = [
      resistor("r1", [boardPin("uno-1", "5V"), boardPin("uno-1", "GND")]),
    ];
    const result = resolveCircuit([], components, [], 5, [unoBoard(true)]);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.supplyCurrentAmps).toBe(0); // the breadboard-rail-only tally; board supply isn't counted there
    expect(
      (result.componentResults.get("r1")?.visual as { powerDissipationWatts: number })
        .powerDissipationWatts
    ).toBeCloseTo((5 / 220) * (5 / 220) * 220);
  });

  it("draws no current from an idle (not-running) board — it has no live 5V/GND", () => {
    const components: PlacedComponent[] = [
      resistor("r1", [boardPin("uno-1", "5V"), boardPin("uno-1", "GND")]),
    ];
    const result = resolveCircuit([], components, [], 5, [unoBoard(false)]);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(
      (result.componentResults.get("r1")?.visual as { powerDissipationWatts: number })
        .powerDissipationWatts
    ).toBeCloseTo(0);
  });

  it("drives a live D13 pin HIGH into an LED, lighting it", () => {
    const components: PlacedComponent[] = [
      resistor("r1", [boardPin("uno-1", "D13"), bareLead("j1")]),
      led("led1", [bareLead("j1"), boardPin("uno-1", "GND")], true),
    ];
    const result = resolveCircuit(
      [],
      components,
      [],
      5,
      [unoBoard(true)],
      new Map([["uno-1:D13", { kind: "driving", isHigh: true }]])
    );
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(
      (result.componentResults.get("led1")?.visual as { brightness: number }).brightness
    ).toBeGreaterThan(0);
  });

  it("stays dark when the same pin drives LOW", () => {
    const components: PlacedComponent[] = [
      resistor("r1", [boardPin("uno-1", "D13"), bareLead("j1")]),
      led("led1", [bareLead("j1"), boardPin("uno-1", "GND")], true),
    ];
    const result = resolveCircuit(
      [],
      components,
      [],
      5,
      [unoBoard(true)],
      new Map([["uno-1:D13", { kind: "driving", isHigh: false }]])
    );
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(
      (result.componentResults.get("led1")?.visual as { brightness: number }).brightness
    ).toBe(0);
  });

  it("reports an open (input-configured) pin's real resolved voltage for the live loop to read back", () => {
    // A pull-up-style divider: 5V -[r1]- D2 -[r2]- GND, with D2 left open
    // (not driving) — the real, physically-determined voltage at D2 is
    // what an input-configured pin's `digitalRead` should genuinely see.
    const components: PlacedComponent[] = [
      resistor("r1", [boardPin("uno-1", "5V"), boardPin("uno-1", "D2")]),
      resistor("r2", [boardPin("uno-1", "D2"), boardPin("uno-1", "GND")]),
    ];
    const result = resolveCircuit([], components, [], 5, [unoBoard(true)]);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.boardPinVoltages.get("uno-1:D2")).toBeCloseTo(2.5);
  });
});
