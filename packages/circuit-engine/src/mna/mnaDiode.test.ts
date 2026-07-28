import { solveMnaWithDiodes } from "./mnaDiode";

describe("solveMnaWithDiodes — golden path (LED + resistor + battery, in series)", () => {
  it("ends up conducting, matching (V - Vf) / R", () => {
    const result = solveMnaWithDiodes({
      resistors: [{ id: "r1", nodeA: "positive", nodeB: "node1", resistanceOhms: 220 }],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 5 },
      ],
      diodes: [
        {
          id: "led1",
          nodeA: "node1",
          nodeB: "ground",
          forwardVoltageVolts: 2,
          reverseResistanceOhms: Infinity,
        },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    const expectedCurrent = (5 - 2) / 220;
    expect(result.elementCurrentsAmps.get("r1")).toBeCloseTo(expectedCurrent);
    expect(result.elementCurrentsAmps.get("led1")).toBeCloseTo(expectedCurrent);
    expect(result.diodeStates.get("led1")).toBe("conducting");
  });
});

describe("solveMnaWithDiodes — a diode wired backwards blocks all current", () => {
  it("ends up blocking, carrying 0A", () => {
    const result = solveMnaWithDiodes({
      resistors: [{ id: "r1", nodeA: "positive", nodeB: "node1", resistanceOhms: 220 }],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 5 },
      ],
      diodes: [
        // Anode/cathode swapped relative to the golden-path test above.
        {
          id: "led1",
          nodeA: "ground",
          nodeB: "node1",
          forwardVoltageVolts: 2,
          reverseResistanceOhms: Infinity,
        },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.elementCurrentsAmps.get("r1")).toBeCloseTo(0);
    expect(result.elementCurrentsAmps.get("led1")).toBeCloseTo(0);
    expect(result.diodeStates.get("led1")).toBe("blocking");
  });
});

describe("solveMnaWithDiodes — insufficient forward bias stays off", () => {
  it("stays blocking when the supply can't exceed the forward-voltage threshold", () => {
    const result = solveMnaWithDiodes({
      resistors: [{ id: "r1", nodeA: "positive", nodeB: "node1", resistanceOhms: 220 }],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 1 },
      ],
      diodes: [
        {
          id: "led1",
          nodeA: "node1",
          nodeB: "ground",
          forwardVoltageVolts: 2,
          reverseResistanceOhms: Infinity,
        },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.elementCurrentsAmps.get("led1")).toBeCloseTo(0);
    expect(result.diodeStates.get("led1")).toBe("blocking");
  });
});

describe("solveMnaWithDiodes — two coupled diodes where one's initial guess must be corrected", () => {
  it("converges after flipping a diode conducting->blocking once the other diode's state changes", () => {
    // A bridge-shaped network (found by search, then hand-verified
    // independently via nodal analysis — see conversation notes) where
    // d2's provisional "conducting" guess (from iteration 1) turns out
    // wrong once d4 also turns on at iteration 2, requiring d2 to flip
    // back to blocking at iteration 3 before the network is
    // self-consistent. This is the "conducting -> blocking" transition
    // the simpler single-diode tests above never need.
    const result = solveMnaWithDiodes({
      resistors: [
        { id: "r1", nodeA: "positive", nodeB: "b", resistanceOhms: 3000 },
        { id: "r3", nodeA: "positive", nodeB: "c", resistanceOhms: 1200 },
        { id: "r5", nodeA: "b", nodeB: "c", resistanceOhms: 2400 },
      ],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 5.2 },
      ],
      diodes: [
        {
          id: "d2",
          nodeA: "b",
          nodeB: "ground",
          forwardVoltageVolts: 4,
          reverseResistanceOhms: Infinity,
        },
        {
          id: "d4",
          nodeA: "c",
          nodeB: "ground",
          forwardVoltageVolts: 2,
          reverseResistanceOhms: Infinity,
        },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.diodeStates.get("d2")).toBe("blocking");
    expect(result.diodeStates.get("d4")).toBe("conducting");
    expect(result.nodeVoltages.get("b")).toBeCloseTo(3.422222222222222, 9);
    expect(result.elementCurrentsAmps.get("d2")).toBe(0);
    expect(result.elementCurrentsAmps.get("r1")).toBeCloseTo(0.0005925925925925926, 9);
    expect(result.elementCurrentsAmps.get("r5")).toBeCloseTo(0.0005925925925925926, 9);
    expect(result.elementCurrentsAmps.get("r3")).toBeCloseTo(0.0026666666666666666, 9);
    expect(result.elementCurrentsAmps.get("d4")).toBeCloseTo(0.003259259259259259, 9);
  });
});

describe("solveMnaWithDiodes — spec Part 2.3's canonical short circuit", () => {
  it("reports short-circuit for an LED with no series resistor", () => {
    const result = solveMnaWithDiodes({
      resistors: [],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 9 },
      ],
      diodes: [
        {
          id: "led1",
          nodeA: "positive",
          nodeB: "ground",
          forwardVoltageVolts: 2,
          reverseResistanceOhms: Infinity,
        },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("short-circuit");
  });
});

describe("solveMnaWithDiodes — two diodes in independent parallel branches (genuine branch-point topology)", () => {
  it("solves each branch correctly in one pass: one conducts, the other blocks", () => {
    const result = solveMnaWithDiodes({
      resistors: [
        { id: "rA", nodeA: "positive", nodeB: "midA", resistanceOhms: 220 },
        { id: "rB", nodeA: "positive", nodeB: "midB", resistanceOhms: 1000 },
      ],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 9 },
      ],
      diodes: [
        {
          id: "ledA",
          nodeA: "midA",
          nodeB: "ground",
          forwardVoltageVolts: 2,
          reverseResistanceOhms: Infinity,
        },
        // Wired backwards in its branch — should block regardless of ledA.
        {
          id: "ledB",
          nodeA: "ground",
          nodeB: "midB",
          forwardVoltageVolts: 2,
          reverseResistanceOhms: Infinity,
        },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    const expectedCurrentA = (9 - 2) / 220;
    expect(result.elementCurrentsAmps.get("rA")).toBeCloseTo(expectedCurrentA);
    expect(result.elementCurrentsAmps.get("ledA")).toBeCloseTo(expectedCurrentA);
    expect(result.diodeStates.get("ledA")).toBe("conducting");
    expect(result.elementCurrentsAmps.get("rB")).toBeCloseTo(0);
    expect(result.elementCurrentsAmps.get("ledB")).toBeCloseTo(0);
    expect(result.diodeStates.get("ledB")).toBe("blocking");
  });
});

describe("solveMnaWithDiodes — non-convergence guard", () => {
  it("reports non-convergent when the iteration cap is exhausted before reaching a fixed point", () => {
    // The golden-path circuit needs at least one flip (blocking -> conducting)
    // to reach its fixed point; capping iterations at 1 forces that flip to
    // never be followed by a re-check.
    const result = solveMnaWithDiodes(
      {
        resistors: [{ id: "r1", nodeA: "positive", nodeB: "node1", resistanceOhms: 220 }],
        voltageSources: [
          { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 5 },
        ],
        diodes: [
          {
            id: "led1",
            nodeA: "node1",
            nodeB: "ground",
            forwardVoltageVolts: 2,
            reverseResistanceOhms: Infinity,
          },
        ],
        groundNodeId: "ground",
      },
      { maxIterations: 1 }
    );
    expect(result.kind).toBe("non-convergent");
  });
});
