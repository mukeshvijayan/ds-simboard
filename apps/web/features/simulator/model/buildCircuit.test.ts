import { buildCircuit, SUPPLY_ELEMENT_PREFIX } from "./buildCircuit";
import type { CanvasWireModel, PlacedBreadboard, PlacedComponent } from "./types";

const resistorParams = { resistanceOhms: 220, ratedPowerWatts: 0.25 };

function breadboard(id: string): PlacedBreadboard {
  return { id, position: { x: 0, y: 0 }, columns: 30, pixelWidth: 600, pixelHeight: 300 };
}

describe("buildCircuit — empty and no-power states", () => {
  it("reports 'empty' with nothing placed at all", () => {
    expect(buildCircuit([], [], [])).toEqual({ status: "empty" });
  });

  it("reports 'no-power' for a component placed with no breadboard anywhere", () => {
    const component: PlacedComponent = {
      id: "r1",
      type: "resistor",
      params: resistorParams,
      leads: [
        { kind: "componentLead", componentItemId: "r1", leadName: "a" },
        { kind: "componentLead", componentItemId: "r1", leadName: "b" },
      ],
      health: { status: "nominal" },
    };
    const result = buildCircuit([], [component], []);
    expect(result.status).toBe("no-power");
  });
});

describe("buildCircuit — a single breadboard", () => {
  it("builds just the supply edge with no components placed", () => {
    const bb = breadboard("bb1");
    const result = buildCircuit([bb], [], []);
    expect(result.status).toBe("built");
    if (result.status !== "built") return;
    expect(result.graph.getElement(`${SUPPLY_ELEMENT_PREFIX}bb1`)).toBeDefined();
    expect(result.graph.allElements).toHaveLength(1);
  });

  it("gives a resistor wired straight across the rails the same nodes as the supply", () => {
    const bb = breadboard("bb1");
    const component: PlacedComponent = {
      id: "r1",
      type: "resistor",
      params: resistorParams,
      leads: [
        {
          kind: "breadboardHole",
          boardItemId: "bb1",
          hole: { kind: "rail", rail: "top-positive" },
        },
        {
          kind: "breadboardHole",
          boardItemId: "bb1",
          hole: { kind: "rail", rail: "top-negative" },
        },
      ],
      health: { status: "nominal" },
    };
    const result = buildCircuit([bb], [component], []);
    expect(result.status).toBe("built");
    if (result.status !== "built") return;

    const supply = result.graph.getElement(`${SUPPLY_ELEMENT_PREFIX}bb1`);
    const resistor = result.graph.getElement("r1");
    expect(resistor?.nodeA).toBe(supply?.nodeA);
    expect(resistor?.nodeB).toBe(supply?.nodeB);
    expect(resistor?.nodeB).toBe(result.groundNodeId);
  });

  it("wires a bare freestanding lead to a breadboard hole", () => {
    const bb = breadboard("bb1");
    const component: PlacedComponent = {
      id: "r1",
      type: "resistor",
      params: resistorParams,
      leads: [
        { kind: "componentLead", componentItemId: "r1", leadName: "a" },
        { kind: "componentLead", componentItemId: "r1", leadName: "b" },
      ],
      health: { status: "nominal" },
    };
    const wires: CanvasWireModel[] = [
      {
        id: "w1",
        from: component.leads[0],
        to: {
          kind: "breadboardHole",
          boardItemId: "bb1",
          hole: { kind: "rail", rail: "top-positive" },
        },
      },
      {
        id: "w2",
        from: component.leads[1],
        to: {
          kind: "breadboardHole",
          boardItemId: "bb1",
          hole: { kind: "rail", rail: "top-negative" },
        },
      },
    ];
    const result = buildCircuit([bb], [component], wires);
    expect(result.status).toBe("built");
    if (result.status !== "built") return;

    const supply = result.graph.getElement(`${SUPPLY_ELEMENT_PREFIX}bb1`);
    const resistor = result.graph.getElement("r1");
    expect(resistor?.nodeA).toBe(supply?.nodeA);
    expect(resistor?.nodeB).toBe(supply?.nodeB);
  });
});

describe("buildCircuit — two breadboards", () => {
  it("keeps two unwired breadboards as independent supply edges with distinct nodes", () => {
    const result = buildCircuit([breadboard("bb1"), breadboard("bb2")], [], []);
    expect(result.status).toBe("built");
    if (result.status !== "built") return;
    const supply1 = result.graph.getElement(`${SUPPLY_ELEMENT_PREFIX}bb1`);
    const supply2 = result.graph.getElement(`${SUPPLY_ELEMENT_PREFIX}bb2`);
    expect(supply1?.nodeA).not.toBe(supply2?.nodeA);
  });

  it("joins two breadboards' rails once wired together, without adding a second redundant supply", () => {
    // Two independent voltage sources demanding the exact same voltage
    // across the exact same (now-unified) two nodes is a redundant, not
    // contradictory, constraint — but `solveMna` can't distinguish that
    // from a real short circuit (see ADR 0018's singular-system
    // reasoning), so only one supply edge should exist once the two
    // boards' rails are unified.
    const wires: CanvasWireModel[] = [
      {
        id: "w1",
        from: {
          kind: "breadboardHole",
          boardItemId: "bb1",
          hole: { kind: "rail", rail: "top-positive" },
        },
        to: {
          kind: "breadboardHole",
          boardItemId: "bb2",
          hole: { kind: "rail", rail: "top-positive" },
        },
      },
      {
        id: "w2",
        from: {
          kind: "breadboardHole",
          boardItemId: "bb1",
          hole: { kind: "rail", rail: "top-negative" },
        },
        to: {
          kind: "breadboardHole",
          boardItemId: "bb2",
          hole: { kind: "rail", rail: "top-negative" },
        },
      },
    ];
    const result = buildCircuit([breadboard("bb1"), breadboard("bb2")], [], wires);
    expect(result.status).toBe("built");
    if (result.status !== "built") return;
    expect(result.graph.getElement(`${SUPPLY_ELEMENT_PREFIX}bb1`)).toBeDefined();
    expect(result.graph.getElement(`${SUPPLY_ELEMENT_PREFIX}bb2`)).toBeUndefined();
    expect(result.graph.allElements).toHaveLength(1);
  });
});
