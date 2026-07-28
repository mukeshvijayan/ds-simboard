import { resolveCircuit } from "./resolveCircuit";
import type { CanvasWireModel, PlacedBreadboard, PlacedComponent } from "./types";
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
    expect(result.componentResults.get("led1")?.health.status).toBe("failed");
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
    expect(result.componentResults.get("led1")?.health.status).toBe("nominal");
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
    expect(result.componentResults.get("led1")?.health.status).toBe("failed");
    expect(result.componentResults.get("pot1")?.health.status).toBe("failed");
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
