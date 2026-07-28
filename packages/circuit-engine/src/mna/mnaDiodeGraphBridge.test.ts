import { CircuitGraph } from "../graph/circuitGraph";
import { walkSeriesLoop } from "../graph/seriesLoopBridge";
import { solveMnaFromGraphWithDiodes } from "./mnaDiodeGraphBridge";

describe("solveMnaFromGraphWithDiodes", () => {
  it("solves the golden-path LED+resistor+battery series loop via the graph", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "battery", nodeA: "positive", nodeB: "ground" });
    graph.addElement({ id: "r1", nodeA: "positive", nodeB: "node1" });
    graph.addElement({ id: "led1", nodeA: "node1", nodeB: "ground" });

    const result = solveMnaFromGraphWithDiodes(graph, "ground", (id) => {
      if (id === "battery") return { kind: "voltage-source", voltageVolts: 5 };
      if (id === "r1") return { kind: "resistive", resistanceOhms: 220 };
      return { kind: "diode", forwardVoltageVolts: 2, reverseResistanceOhms: Infinity };
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.elementCurrentsAmps.get("led1")).toBeCloseTo((5 - 2) / 220);
    expect(result.diodeStates.get("led1")).toBe("conducting");
  });

  it("solves two parallel LED branches — a branch-point topology walkSeriesLoop rejects", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "battery", nodeA: "positive", nodeB: "ground" });
    graph.addElement({ id: "rA", nodeA: "positive", nodeB: "midA" });
    graph.addElement({ id: "ledA", nodeA: "midA", nodeB: "ground" });
    graph.addElement({ id: "rB", nodeA: "positive", nodeB: "midB" });
    graph.addElement({ id: "ledB", nodeA: "midB", nodeB: "ground" });

    expect(() => walkSeriesLoop(graph, "battery")).toThrow(RangeError);

    const resistances: Record<string, number> = { rA: 220, rB: 1000 };
    const result = solveMnaFromGraphWithDiodes(graph, "ground", (id) => {
      if (id === "battery") return { kind: "voltage-source", voltageVolts: 9 };
      if (id in resistances)
        return { kind: "resistive", resistanceOhms: resistances[id] };
      return { kind: "diode", forwardVoltageVolts: 2, reverseResistanceOhms: Infinity };
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.elementCurrentsAmps.get("ledA")).toBeCloseTo((9 - 2) / 220);
    expect(result.elementCurrentsAmps.get("ledB")).toBeCloseTo((9 - 2) / 1000);
    expect(result.diodeStates.get("ledA")).toBe("conducting");
    expect(result.diodeStates.get("ledB")).toBe("conducting");
  });

  it("reports short-circuit for an LED with no series resistor, via the graph", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "battery", nodeA: "positive", nodeB: "ground" });
    graph.addElement({ id: "led1", nodeA: "positive", nodeB: "ground" });

    const result = solveMnaFromGraphWithDiodes(graph, "ground", (id) =>
      id === "battery"
        ? { kind: "voltage-source", voltageVolts: 9 }
        : { kind: "diode", forwardVoltageVolts: 2, reverseResistanceOhms: Infinity }
    );
    expect(result.kind).toBe("short-circuit");
  });
});
