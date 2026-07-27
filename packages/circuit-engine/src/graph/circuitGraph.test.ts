import { CircuitGraph } from "./circuitGraph";

describe("CircuitGraph", () => {
  it("starts empty", () => {
    const graph = new CircuitGraph();
    expect(graph.allElements).toEqual([]);
    expect(graph.nodeIds).toEqual([]);
  });

  it("adds and retrieves an element by id", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n2" });
    expect(graph.getElement("r1")).toEqual({ id: "r1", nodeA: "n1", nodeB: "n2" });
  });

  it("throws when adding a duplicate element id", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n2" });
    expect(() => graph.addElement({ id: "r1", nodeA: "n3", nodeB: "n4" })).toThrow(
      RangeError
    );
  });

  it("removes an element", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n2" });
    graph.removeElement("r1");
    expect(graph.getElement("r1")).toBeUndefined();
  });

  it("is a no-op to remove an element that isn't present", () => {
    const graph = new CircuitGraph();
    expect(() => graph.removeElement("does-not-exist")).not.toThrow();
  });

  it("derives distinct node ids from element endpoints", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n2" });
    graph.addElement({ id: "r2", nodeA: "n2", nodeB: "n3" });
    expect(new Set(graph.nodeIds)).toEqual(new Set(["n1", "n2", "n3"]));
  });

  it("finds every element touching a given node", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n2" });
    graph.addElement({ id: "r2", nodeA: "n2", nodeB: "n3" });
    graph.addElement({ id: "r3", nodeA: "n4", nodeB: "n5" });
    const atN2 = graph.elementsAtNode("n2").map((el) => el.id);
    expect(new Set(atN2)).toEqual(new Set(["r1", "r2"]));
  });

  it("returns no elements for a node nothing touches", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n2" });
    expect(graph.elementsAtNode("n99")).toEqual([]);
  });
});
