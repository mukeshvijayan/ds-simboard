import {
  buildBreadboard,
  buildCircuitGraph,
  NEGATIVE_RAIL,
  POSITIVE_RAIL,
  SUPPLY_ELEMENT_ID,
} from "./circuitGraph";
import type { PlacedResistor } from "./types";

describe("buildBreadboard", () => {
  it("applies every wire to a fresh board", () => {
    const board = buildBreadboard(30, [
      {
        id: "w1",
        from: { kind: "strip", row: "a", column: 1 },
        to: { kind: "strip", row: "a", column: 5 },
      },
    ]);
    expect(
      board.areConnected(
        { kind: "strip", row: "a", column: 1 },
        { kind: "strip", row: "a", column: 5 }
      )
    ).toBe(true);
  });

  it("starts fresh each call — a wire from a previous call never lingers", () => {
    buildBreadboard(30, [
      {
        id: "w1",
        from: { kind: "strip", row: "a", column: 1 },
        to: { kind: "strip", row: "a", column: 5 },
      },
    ]);
    const second = buildBreadboard(30, []);
    expect(
      second.areConnected(
        { kind: "strip", row: "a", column: 1 },
        { kind: "strip", row: "a", column: 5 }
      )
    ).toBe(false);
  });
});

describe("buildCircuitGraph", () => {
  it("adds a synthetic supply edge across the positive and negative rails", () => {
    const board = buildBreadboard(30, []);
    const graph = buildCircuitGraph(board, []);
    const supply = graph.getElement(SUPPLY_ELEMENT_ID);
    expect(supply).toEqual({
      id: SUPPLY_ELEMENT_ID,
      nodeA: board.nodeIdFor(POSITIVE_RAIL),
      nodeB: board.nodeIdFor(NEGATIVE_RAIL),
    });
  });

  it("adds one element per placed component, resolved to its leads' nodes", () => {
    const board = buildBreadboard(30, []);
    const resistor: PlacedResistor = {
      id: "r1",
      type: "resistor",
      params: { resistanceOhms: 220, ratedPowerWatts: 0.25 },
      leads: [
        { kind: "strip", row: "a", column: 1 },
        { kind: "strip", row: "a", column: 2 },
      ],
      health: { status: "nominal" },
    };
    const graph = buildCircuitGraph(board, [resistor]);
    expect(graph.getElement("r1")).toEqual({
      id: "r1",
      nodeA: board.nodeIdFor(resistor.leads[0]),
      nodeB: board.nodeIdFor(resistor.leads[1]),
    });
  });
});
