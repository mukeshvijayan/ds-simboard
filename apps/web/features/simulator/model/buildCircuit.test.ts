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

describe("buildCircuit — multi-lead components (P2-2)", () => {
  const ledParams = {
    forwardVoltageVolts: 2,
    ratedCurrentAmps: 0.02,
    maxCurrentAmps: 0.03,
    color: "red" as const,
  };

  it("orients a common-cathode RGB LED's channels anode-toward-the-channel-lead", () => {
    const bb = breadboard("bb1");
    const rgbLed: PlacedComponent = {
      id: "rgb1",
      type: "rgbLed",
      params: {
        commonTerminal: "cathode",
        red: ledParams,
        green: ledParams,
        blue: ledParams,
      },
      commonLead: {
        kind: "breadboardHole",
        boardItemId: "bb1",
        hole: { kind: "rail", rail: "top-negative" },
      },
      redLead: {
        kind: "breadboardHole",
        boardItemId: "bb1",
        hole: { kind: "strip", row: "a", column: 1 },
      },
      greenLead: {
        kind: "breadboardHole",
        boardItemId: "bb1",
        hole: { kind: "strip", row: "a", column: 2 },
      },
      blueLead: {
        kind: "breadboardHole",
        boardItemId: "bb1",
        hole: { kind: "strip", row: "a", column: 3 },
      },
      health: {
        red: { status: "nominal" },
        green: { status: "nominal" },
        blue: { status: "nominal" },
      },
    };
    const result = buildCircuit([bb], [rgbLed], []);
    expect(result.status).toBe("built");
    if (result.status !== "built") return;

    const redElement = result.graph.getElement("rgb1:red");
    const commonNode = result.graph.getElement(`${SUPPLY_ELEMENT_PREFIX}bb1`)?.nodeB;
    expect(redElement?.nodeB).toBe(commonNode); // cathode is the shared common leg
    expect(redElement?.nodeA).not.toBe(commonNode); // anode is the channel's own lead
  });

  it("orients a common-anode RGB LED's channels the opposite way", () => {
    const bb = breadboard("bb1");
    const rgbLed: PlacedComponent = {
      id: "rgb1",
      type: "rgbLed",
      params: {
        commonTerminal: "anode",
        red: ledParams,
        green: ledParams,
        blue: ledParams,
      },
      commonLead: {
        kind: "breadboardHole",
        boardItemId: "bb1",
        hole: { kind: "rail", rail: "top-positive" },
      },
      redLead: {
        kind: "breadboardHole",
        boardItemId: "bb1",
        hole: { kind: "strip", row: "a", column: 1 },
      },
      greenLead: {
        kind: "breadboardHole",
        boardItemId: "bb1",
        hole: { kind: "strip", row: "a", column: 2 },
      },
      blueLead: {
        kind: "breadboardHole",
        boardItemId: "bb1",
        hole: { kind: "strip", row: "a", column: 3 },
      },
      health: {
        red: { status: "nominal" },
        green: { status: "nominal" },
        blue: { status: "nominal" },
      },
    };
    const result = buildCircuit([bb], [rgbLed], []);
    expect(result.status).toBe("built");
    if (result.status !== "built") return;

    const redElement = result.graph.getElement("rgb1:red");
    const commonNode = result.graph.getElement(`${SUPPLY_ELEMENT_PREFIX}bb1`)?.nodeA;
    expect(redElement?.nodeA).toBe(commonNode); // anode is the shared common leg
    expect(redElement?.nodeB).not.toBe(commonNode); // cathode is the channel's own lead
  });

  it("contributes one graph element per segment for a 7-segment display", () => {
    const bb = breadboard("bb1");
    const segmentLeads = {
      a: {
        kind: "breadboardHole" as const,
        boardItemId: "bb1",
        hole: { kind: "strip" as const, row: "a" as const, column: 1 },
      },
      b: {
        kind: "breadboardHole" as const,
        boardItemId: "bb1",
        hole: { kind: "strip" as const, row: "a" as const, column: 2 },
      },
      c: {
        kind: "breadboardHole" as const,
        boardItemId: "bb1",
        hole: { kind: "strip" as const, row: "a" as const, column: 3 },
      },
      d: {
        kind: "breadboardHole" as const,
        boardItemId: "bb1",
        hole: { kind: "strip" as const, row: "a" as const, column: 4 },
      },
      e: {
        kind: "breadboardHole" as const,
        boardItemId: "bb1",
        hole: { kind: "strip" as const, row: "a" as const, column: 5 },
      },
      f: {
        kind: "breadboardHole" as const,
        boardItemId: "bb1",
        hole: { kind: "strip" as const, row: "a" as const, column: 6 },
      },
      g: {
        kind: "breadboardHole" as const,
        boardItemId: "bb1",
        hole: { kind: "strip" as const, row: "a" as const, column: 7 },
      },
      dp: {
        kind: "breadboardHole" as const,
        boardItemId: "bb1",
        hole: { kind: "strip" as const, row: "a" as const, column: 8 },
      },
    };
    const display: PlacedComponent = {
      id: "seg1",
      type: "sevenSegmentDisplay",
      params: { commonTerminal: "cathode", segment: ledParams },
      commonLead: {
        kind: "breadboardHole",
        boardItemId: "bb1",
        hole: { kind: "rail", rail: "top-negative" },
      },
      segmentLeads,
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
    };
    const result = buildCircuit([bb], [display], []);
    expect(result.status).toBe("built");
    if (result.status !== "built") return;
    for (const name of ["a", "b", "c", "d", "e", "f", "g", "dp"]) {
      expect(result.graph.getElement(`seg1:${name}`)).toBeDefined();
    }
    // 1 supply edge + 8 segments
    expect(result.graph.allElements).toHaveLength(9);
  });
});
