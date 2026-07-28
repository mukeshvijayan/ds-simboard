import { solveMna } from "./mna";

describe("solveMna — series resistors (sanity check against the series-loop formula)", () => {
  it("matches V/(R1+R2) for two resistors in series across a battery", () => {
    const result = solveMna({
      resistors: [
        { id: "r1", nodeA: "positive", nodeB: "mid" },
        { id: "r2", nodeA: "mid", nodeB: "ground" },
      ].map((r) => ({ ...r, resistanceOhms: r.id === "r1" ? 100 : 220 })),
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 5 },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    const expectedCurrent = 5 / (100 + 220);
    expect(result.elementCurrentsAmps.get("r1")).toBeCloseTo(expectedCurrent);
    expect(result.elementCurrentsAmps.get("r2")).toBeCloseTo(expectedCurrent);
    expect(result.nodeVoltages.get("positive")).toBeCloseTo(5);
    expect(result.nodeVoltages.get("mid")).toBeCloseTo(5 - expectedCurrent * 100);
  });
});

describe("solveMna — parallel resistors (a topology the series-only solver rejects)", () => {
  it("gives each resistor the full source voltage and sums their currents at the source", () => {
    const result = solveMna({
      resistors: [
        { id: "r1", nodeA: "positive", nodeB: "ground", resistanceOhms: 1000 },
        { id: "r2", nodeA: "positive", nodeB: "ground", resistanceOhms: 2000 },
      ],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 10 },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.nodeVoltages.get("positive")).toBeCloseTo(10);
    expect(result.elementCurrentsAmps.get("r1")).toBeCloseTo(10 / 1000);
    expect(result.elementCurrentsAmps.get("r2")).toBeCloseTo(10 / 2000);
    // Source current flows opposite to the external-circuit convention
    // (see mna.ts's TSDoc) — negative of the total current it delivers.
    expect(result.elementCurrentsAmps.get("battery")).toBeCloseTo(
      -(10 / 1000 + 10 / 2000)
    );
  });
});

describe("solveMna — an unbalanced Wheatstone bridge (genuine branch-point topology)", () => {
  // positive --R1(1k)-- B --R2(2k)-- ground
  // positive --R3(3k)-- C --R4(4k)-- ground
  //                B --R5(5k)-- C   (the bridge)
  // Hand-solved via nodal analysis independently (see conversation notes):
  // Vb ≈ 6.580645, Vc ≈ 5.935484, bridge current I5 ≈ 0.000129 A (B→C).
  it("matches an independently hand-solved nodal analysis", () => {
    const result = solveMna({
      resistors: [
        { id: "r1", nodeA: "positive", nodeB: "b", resistanceOhms: 1000 },
        { id: "r2", nodeA: "b", nodeB: "ground", resistanceOhms: 2000 },
        { id: "r3", nodeA: "positive", nodeB: "c", resistanceOhms: 3000 },
        { id: "r4", nodeA: "c", nodeB: "ground", resistanceOhms: 4000 },
        { id: "r5", nodeA: "b", nodeB: "c", resistanceOhms: 5000 },
      ],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 10 },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.nodeVoltages.get("b")).toBeCloseTo(6.580645161, 6);
    expect(result.nodeVoltages.get("c")).toBeCloseTo(5.935483871, 6);
    expect(result.elementCurrentsAmps.get("r1")).toBeCloseTo(0.003419354839, 8);
    expect(result.elementCurrentsAmps.get("r2")).toBeCloseTo(0.003290322581, 8);
    expect(result.elementCurrentsAmps.get("r3")).toBeCloseTo(0.00135483871, 8);
    expect(result.elementCurrentsAmps.get("r4")).toBeCloseTo(0.001483870968, 8);
    expect(result.elementCurrentsAmps.get("r5")).toBeCloseTo(0.000129032258, 8);
    expect(result.elementCurrentsAmps.get("battery")).toBeCloseTo(-0.004774193548, 8);
  });
});

describe("solveMna — 0Ω wire and infinite-resistance open switch handling", () => {
  it("treats a 0Ω resistor as a transparent wire", () => {
    const result = solveMna({
      resistors: [
        { id: "wire", nodeA: "positive", nodeB: "mid", resistanceOhms: 0 },
        { id: "r1", nodeA: "mid", nodeB: "ground", resistanceOhms: 100 },
      ],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 5 },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.nodeVoltages.get("mid")).toBeCloseTo(5);
    expect(result.elementCurrentsAmps.get("r1")).toBeCloseTo(5 / 100);
    expect(result.elementCurrentsAmps.get("wire")).toBeCloseTo(5 / 100);
  });

  it("carries no current through an open (infinite-resistance) branch, without breaking the rest of the network", () => {
    const result = solveMna({
      resistors: [
        { id: "open", nodeA: "positive", nodeB: "ground", resistanceOhms: Infinity },
        { id: "r1", nodeA: "positive", nodeB: "ground", resistanceOhms: 1000 },
      ],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 5 },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.elementCurrentsAmps.get("open")).toBe(0);
    expect(result.elementCurrentsAmps.get("r1")).toBeCloseTo(5 / 1000);
  });
});

describe("solveMna — floating branches and disconnected sources", () => {
  it("reports 0A for a resistor chain with no path to ground at all", () => {
    const result = solveMna({
      resistors: [
        { id: "dangling", nodeA: "floating-a", nodeB: "floating-b", resistanceOhms: 500 },
      ],
      voltageSources: [],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.elementCurrentsAmps.get("dangling")).toBe(0);
  });

  it("reports 0A for a 0Ω wire that floats with no path to ground at all", () => {
    const result = solveMna({
      resistors: [
        {
          id: "floating-wire",
          nodeA: "floating-a",
          nodeB: "floating-b",
          resistanceOhms: 0,
        },
      ],
      voltageSources: [],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.elementCurrentsAmps.get("floating-wire")).toBe(0);
  });

  it("throws when an independent voltage source is disconnected from ground", () => {
    expect(() =>
      solveMna({
        resistors: [],
        voltageSources: [
          {
            id: "isolated-battery",
            nodeA: "island-a",
            nodeB: "island-b",
            voltageVolts: 9,
          },
        ],
        groundNodeId: "ground",
      })
    ).toThrow(RangeError);
  });
});

describe("solveMna — singular systems", () => {
  it("reports singular for a 0Ω resistor directly across a voltage source (a true short)", () => {
    const result = solveMna({
      resistors: [{ id: "short", nodeA: "positive", nodeB: "ground", resistanceOhms: 0 }],
      voltageSources: [
        { id: "battery", nodeA: "positive", nodeB: "ground", voltageVolts: 5 },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("singular");
  });

  it("reports singular for two independent sources making contradictory demands on the same nodes", () => {
    const result = solveMna({
      resistors: [],
      voltageSources: [
        { id: "battery1", nodeA: "positive", nodeB: "ground", voltageVolts: 5 },
        { id: "battery2", nodeA: "positive", nodeB: "ground", voltageVolts: 9 },
      ],
      groundNodeId: "ground",
    });
    expect(result.kind).toBe("singular");
  });
});

describe("solveMna — validation", () => {
  it("throws for a negative resistance", () => {
    expect(() =>
      solveMna({
        resistors: [{ id: "bad", nodeA: "a", nodeB: "ground", resistanceOhms: -10 }],
        voltageSources: [],
        groundNodeId: "ground",
      })
    ).toThrow(RangeError);
  });
});
