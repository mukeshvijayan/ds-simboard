import { CircuitGraph } from "../graph/circuitGraph";
import { walkSeriesLoop } from "../graph/seriesLoopBridge";
import { solveMnaFromGraph } from "./mnaGraphBridge";

describe("solveMnaFromGraph", () => {
  it("solves a plain series loop via the graph (parity with solveSeriesLoopFromGraph)", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "battery", nodeA: "positive", nodeB: "ground" });
    graph.addElement({ id: "r1", nodeA: "positive", nodeB: "ground" });

    const result = solveMnaFromGraph(graph, "ground", (id) =>
      id === "battery"
        ? { kind: "voltage-source", voltageVolts: 5 }
        : { kind: "resistive", resistanceOhms: 220 }
    );
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.elementCurrentsAmps.get("r1")).toBeCloseTo(5 / 220);
  });

  it("solves a genuine branch-point topology that walkSeriesLoop explicitly rejects", () => {
    // Two resistors both wired straight across the rails — a real
    // breadboard parallel branch. `positive` and `ground` each have
    // degree 3 here (battery + r1 + r2), which walkSeriesLoop rejects.
    const graph = new CircuitGraph();
    graph.addElement({ id: "battery", nodeA: "positive", nodeB: "ground" });
    graph.addElement({ id: "r1", nodeA: "positive", nodeB: "ground" });
    graph.addElement({ id: "r2", nodeA: "positive", nodeB: "ground" });

    expect(() => walkSeriesLoop(graph, "battery")).toThrow(RangeError);

    const result = solveMnaFromGraph(graph, "ground", (id) =>
      id === "battery"
        ? { kind: "voltage-source", voltageVolts: 9 }
        : { kind: "resistive", resistanceOhms: id === "r1" ? 1000 : 3000 }
    );
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.elementCurrentsAmps.get("r1")).toBeCloseTo(9 / 1000);
    expect(result.elementCurrentsAmps.get("r2")).toBeCloseTo(9 / 3000);
  });

  it("solves a bridge network (three branch points) built directly as a graph", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "battery", nodeA: "positive", nodeB: "ground" });
    graph.addElement({ id: "r1", nodeA: "positive", nodeB: "b" });
    graph.addElement({ id: "r2", nodeA: "b", nodeB: "ground" });
    graph.addElement({ id: "r3", nodeA: "positive", nodeB: "c" });
    graph.addElement({ id: "r4", nodeA: "c", nodeB: "ground" });
    graph.addElement({ id: "r5", nodeA: "b", nodeB: "c" });

    const resistances: Record<string, number> = {
      r1: 1000,
      r2: 2000,
      r3: 3000,
      r4: 4000,
      r5: 5000,
    };
    const result = solveMnaFromGraph(graph, "ground", (id) =>
      id === "battery"
        ? { kind: "voltage-source", voltageVolts: 10 }
        : { kind: "resistive", resistanceOhms: resistances[id] }
    );
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.nodeVoltages.get("b")).toBeCloseTo(6.580645161, 6);
    expect(result.nodeVoltages.get("c")).toBeCloseTo(5.935483871, 6);
    expect(result.elementCurrentsAmps.get("r5")).toBeCloseTo(0.000129032258, 8);
  });
});
