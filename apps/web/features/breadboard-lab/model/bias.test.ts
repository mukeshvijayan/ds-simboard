import { Breadboard, CircuitGraph } from "@ds-simboard/circuit-engine";
import { physicalEntryNode, resolveBias, sharedNode } from "./bias";
import type { PlacedLed } from "./types";

const ledParams = {
  forwardVoltageVolts: 2,
  ratedCurrentAmps: 0.02,
  maxCurrentAmps: 0.03,
};

function buildLoop() {
  // supply(+rail=P, -rail=N) -> r1(N,X) -> led1(X,P) -> back to supply.
  const breadboard = new Breadboard();
  const graph = new CircuitGraph();
  const P = breadboard.nodeIdFor({ kind: "rail", rail: "top-positive" });
  const N = breadboard.nodeIdFor({ kind: "rail", rail: "top-negative" });
  const X = breadboard.nodeIdFor({ kind: "strip", row: "a", column: 1 });
  graph.addElement({ id: "supply", nodeA: P, nodeB: N });
  graph.addElement({ id: "r1", nodeA: N, nodeB: X });
  graph.addElement({ id: "led1", nodeA: X, nodeB: P });
  return { breadboard, graph, P, N, X };
}

describe("sharedNode", () => {
  it("finds the node two adjacent elements share", () => {
    const a = { id: "a", nodeA: "n1", nodeB: "n2" };
    const b = { id: "b", nodeA: "n2", nodeB: "n3" };
    expect(sharedNode(a, b)).toBe("n2");
  });

  it("works regardless of which side each element's shared node is on", () => {
    const a = { id: "a", nodeA: "n2", nodeB: "n1" };
    const b = { id: "b", nodeA: "n3", nodeB: "n2" };
    expect(sharedNode(a, b)).toBe("n2");
  });
});

describe("physicalEntryNode", () => {
  it("computes the correct physical entry node for every element in a known loop", () => {
    const { graph, P, N, X } = buildLoop();
    const walked = [
      graph.getElement("supply")!,
      graph.getElement("r1")!,
      graph.getElement("led1")!,
    ];

    // Physical current flows P -(led1)-> X -(r1)-> N -(supply)-> P.
    expect(physicalEntryNode(walked, 0)).toBe(N); // supply: current "enters" at nodeB, closing the loop
    expect(physicalEntryNode(walked, 1)).toBe(X); // r1: current enters at X, exits at N
    expect(physicalEntryNode(walked, 2)).toBe(P); // led1: current enters at P (its anode side, if wired correctly)
  });
});

describe("resolveBias", () => {
  it("is forward-biased when the anode faces the physical entry node (correct polarity)", () => {
    const { breadboard, graph, P, X } = buildLoop();
    const walked = [
      graph.getElement("supply")!,
      graph.getElement("r1")!,
      graph.getElement("led1")!,
    ];
    const entryNode = physicalEntryNode(walked, 2); // P

    const led: PlacedLed = {
      id: "led1",
      type: "led",
      params: ledParams,
      leads: [
        { kind: "strip", row: "a", column: 1 }, // resolves to X — this is leads[0]
        { kind: "rail", rail: "top-positive" }, // resolves to P — this is leads[1]
      ],
      leadZeroIsPositive: false, // the anode is leads[1] (P) — correct orientation
      health: { status: "nominal" },
    };

    expect(entryNode).toBe(P);
    expect(resolveBias(entryNode, led, breadboard)).toBe("forward");
  });

  it("is reverse-biased when the anode faces away from the physical entry node (backwards)", () => {
    const { breadboard, graph } = buildLoop();
    const walked = [
      graph.getElement("supply")!,
      graph.getElement("r1")!,
      graph.getElement("led1")!,
    ];
    const entryNode = physicalEntryNode(walked, 2); // P

    const led: PlacedLed = {
      id: "led1",
      type: "led",
      params: ledParams,
      leads: [
        { kind: "strip", row: "a", column: 1 }, // X
        { kind: "rail", rail: "top-positive" }, // P
      ],
      leadZeroIsPositive: true, // anode is leads[0] (X) — backwards relative to entry node P
      health: { status: "nominal" },
    };

    expect(resolveBias(entryNode, led, breadboard)).toBe("reverse");
  });
});
