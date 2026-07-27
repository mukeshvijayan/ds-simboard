import { CircuitGraph } from "./circuitGraph";
import { solveSeriesLoopFromGraph, walkSeriesLoop } from "./seriesLoopBridge";

function buildLoop(graph: CircuitGraph) {
  graph.addElement({ id: "supply", nodeA: "n0", nodeB: "n1" });
  graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n2" });
  graph.addElement({ id: "r2", nodeA: "n2", nodeB: "n0" });
}

describe("walkSeriesLoop", () => {
  it("returns elements starting at the supply, in loop order", () => {
    const graph = new CircuitGraph();
    buildLoop(graph);
    const order = walkSeriesLoop(graph, "supply").map((el) => el.id);
    expect(order).toEqual(["supply", "r1", "r2"]);
  });

  it("walks correctly regardless of which direction the supply's terminals point", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "supply", nodeA: "n1", nodeB: "n0" }); // reversed vs buildLoop
    graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n2" });
    graph.addElement({ id: "r2", nodeA: "n2", nodeB: "n0" });
    const order = walkSeriesLoop(graph, "supply").map((el) => el.id);
    expect(order[0]).toBe("supply");
    expect(new Set(order)).toEqual(new Set(["supply", "r1", "r2"]));
  });

  it("throws if the supply id doesn't exist in the graph", () => {
    const graph = new CircuitGraph();
    buildLoop(graph);
    expect(() => walkSeriesLoop(graph, "does-not-exist")).toThrow(RangeError);
  });

  it("throws on a branch (a node touched by 3 elements)", () => {
    const graph = new CircuitGraph();
    buildLoop(graph);
    graph.addElement({ id: "extra", nodeA: "n1", nodeB: "n9" }); // n1 now has degree 3
    expect(() => walkSeriesLoop(graph, "supply")).toThrow(RangeError);
  });

  it("throws on a dead end (a node touched by only 1 element)", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "supply", nodeA: "n0", nodeB: "n1" });
    graph.addElement({ id: "dangling", nodeA: "n1", nodeB: "n2" });
    expect(() => walkSeriesLoop(graph, "supply")).toThrow(RangeError);
  });

  it("throws when the graph has a disconnected extra loop", () => {
    const graph = new CircuitGraph();
    buildLoop(graph);
    graph.addElement({ id: "x1", nodeA: "m0", nodeB: "m1" });
    graph.addElement({ id: "x2", nodeA: "m1", nodeB: "m0" });
    expect(() => walkSeriesLoop(graph, "supply")).toThrow(RangeError);
  });
});

describe("solveSeriesLoopFromGraph", () => {
  it("solves a plain resistive loop via the graph", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "supply", nodeA: "n0", nodeB: "n1" });
    graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n0" });

    const outcome = solveSeriesLoopFromGraph(graph, "supply", 5, () => ({
      kind: "resistive",
      resistanceOhms: 220,
    }));

    expect(outcome.kind).toBe("conducting");
    if (outcome.kind === "conducting") {
      expect(outcome.currentAmps).toBeCloseTo(5 / 220);
    }
  });

  it("solves an LED + resistor loop via the graph, describing each element by id", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "supply", nodeA: "n0", nodeB: "n1" });
    graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n2" });
    graph.addElement({ id: "led1", nodeA: "n2", nodeB: "n0" });

    const outcome = solveSeriesLoopFromGraph(graph, "supply", 5, (id) =>
      id === "r1"
        ? { kind: "resistive", resistanceOhms: 220 }
        : { kind: "fixed-drop", forwardVoltageVolts: 2 }
    );

    expect(outcome.kind).toBe("conducting");
    if (outcome.kind === "conducting") {
      expect(outcome.currentAmps).toBeCloseTo((5 - 2) / 220);
    }
  });

  it("reports a short circuit for an LED with no series resistor", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "supply", nodeA: "n0", nodeB: "n1" });
    graph.addElement({ id: "led1", nodeA: "n1", nodeB: "n0" });

    const outcome = solveSeriesLoopFromGraph(graph, "supply", 5, () => ({
      kind: "fixed-drop",
      forwardVoltageVolts: 2,
    }));

    expect(outcome.kind).toBe("short-circuit");
  });
});
