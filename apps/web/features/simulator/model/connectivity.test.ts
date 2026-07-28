import { Breadboard } from "@ds-simboard/circuit-engine";
import { connectionPointId, type ConnectionPointRef } from "./connectionPoint";
import { resolveConnectivity, type CanvasWire } from "./connectivity";

const board1Hole = (row: "a" | "b", column: number): ConnectionPointRef => ({
  kind: "breadboardHole",
  boardItemId: "board1",
  hole: { kind: "strip", row, column },
});

const board1Rail = (rail: "top-positive" | "top-negative"): ConnectionPointRef => ({
  kind: "breadboardHole",
  boardItemId: "board1",
  hole: { kind: "rail", rail },
});

describe("resolveConnectivity — a single breadboard's built-in connectivity", () => {
  it("resolves two holes in the same strip column/side to the same node with no wire", () => {
    const breadboards = new Map([["board1", new Breadboard(30)]]);
    const points = [board1Hole("a", 5), board1Hole("b", 5)];
    const resolve = resolveConnectivity(breadboards, points, []);

    expect(resolve(connectionPointId(points[0]))).toBe(
      resolve(connectionPointId(points[1]))
    );
  });

  it("resolves two holes on the same rail to the same node with no wire", () => {
    const breadboards = new Map([["board1", new Breadboard(30)]]);
    const points = [board1Rail("top-positive"), board1Rail("top-positive")];
    const resolve = resolveConnectivity(breadboards, points, []);

    expect(resolve(connectionPointId(points[0]))).toBe(
      resolve(connectionPointId(points[1]))
    );
  });

  it("does not connect different strip columns without a wire", () => {
    const breadboards = new Map([["board1", new Breadboard(30)]]);
    const points = [board1Hole("a", 5), board1Hole("a", 6)];
    const resolve = resolveConnectivity(breadboards, points, []);

    expect(resolve(connectionPointId(points[0]))).not.toBe(
      resolve(connectionPointId(points[1]))
    );
  });
});

describe("resolveConnectivity — multiple breadboards are namespaced, not merged", () => {
  it("keeps two boards' identically-named rails as distinct nodes until wired", () => {
    const breadboards = new Map([
      ["board1", new Breadboard(30)],
      ["board2", new Breadboard(30)],
    ]);
    const board1Point: ConnectionPointRef = {
      kind: "breadboardHole",
      boardItemId: "board1",
      hole: { kind: "rail", rail: "top-positive" },
    };
    const board2Point: ConnectionPointRef = {
      kind: "breadboardHole",
      boardItemId: "board2",
      hole: { kind: "rail", rail: "top-positive" },
    };
    const resolve = resolveConnectivity(breadboards, [board1Point, board2Point], []);

    expect(resolve(connectionPointId(board1Point))).not.toBe(
      resolve(connectionPointId(board2Point))
    );
  });

  it("connects two different boards' rails once a wire joins them", () => {
    const breadboards = new Map([
      ["board1", new Breadboard(30)],
      ["board2", new Breadboard(30)],
    ]);
    const board1Point: ConnectionPointRef = {
      kind: "breadboardHole",
      boardItemId: "board1",
      hole: { kind: "rail", rail: "top-positive" },
    };
    const board2Point: ConnectionPointRef = {
      kind: "breadboardHole",
      boardItemId: "board2",
      hole: { kind: "rail", rail: "top-positive" },
    };
    const wires: CanvasWire[] = [
      {
        id: "w1",
        from: connectionPointId(board1Point),
        to: connectionPointId(board2Point),
      },
    ];
    const resolve = resolveConnectivity(breadboards, [board1Point, board2Point], wires);

    expect(resolve(connectionPointId(board1Point))).toBe(
      resolve(connectionPointId(board2Point))
    );
  });
});

describe("resolveConnectivity — wires between arbitrary connection point kinds", () => {
  it("wires a breadboard hole directly to a bare component lead", () => {
    const breadboards = new Map([["board1", new Breadboard(30)]]);
    const holePoint = board1Hole("a", 3);
    const leadPoint: ConnectionPointRef = {
      kind: "componentLead",
      componentItemId: "led1",
      leadName: "anode",
    };
    const wires: CanvasWire[] = [
      { id: "w1", from: connectionPointId(holePoint), to: connectionPointId(leadPoint) },
    ];
    const resolve = resolveConnectivity(breadboards, [holePoint, leadPoint], wires);

    expect(resolve(connectionPointId(holePoint))).toBe(
      resolve(connectionPointId(leadPoint))
    );
  });

  it("wires a board pin directly to a bare component lead", () => {
    const pinPoint: ConnectionPointRef = {
      kind: "boardPin",
      boardItemId: "uno1",
      pinName: "D13",
    };
    const leadPoint: ConnectionPointRef = {
      kind: "componentLead",
      componentItemId: "led1",
      leadName: "anode",
    };
    const wires: CanvasWire[] = [
      { id: "w1", from: connectionPointId(pinPoint), to: connectionPointId(leadPoint) },
    ];
    const resolve = resolveConnectivity(new Map(), [pinPoint, leadPoint], wires);

    expect(resolve(connectionPointId(pinPoint))).toBe(
      resolve(connectionPointId(leadPoint))
    );
  });

  it("leaves unrelated bare leads as distinct nodes", () => {
    const leadA: ConnectionPointRef = {
      kind: "componentLead",
      componentItemId: "led1",
      leadName: "anode",
    };
    const leadB: ConnectionPointRef = {
      kind: "componentLead",
      componentItemId: "led2",
      leadName: "anode",
    };
    const resolve = resolveConnectivity(new Map(), [leadA, leadB], []);

    expect(resolve(connectionPointId(leadA))).not.toBe(resolve(connectionPointId(leadB)));
  });
});

describe("resolveConnectivity — validation", () => {
  it("throws if a wire's 'from' end references an unknown connection point", () => {
    expect(() =>
      resolveConnectivity(new Map(), [], [{ id: "w1", from: "lead:a:x", to: "lead:b:y" }])
    ).toThrow(RangeError);
  });

  it("throws if a wire's 'to' end references an unknown connection point", () => {
    const leadA: ConnectionPointRef = {
      kind: "componentLead",
      componentItemId: "a",
      leadName: "x",
    };
    expect(() =>
      resolveConnectivity(
        new Map(),
        [leadA],
        [{ id: "w1", from: connectionPointId(leadA), to: "lead:b:y" }]
      )
    ).toThrow(RangeError);
  });

  it("throws when looking up a connection point that was never registered", () => {
    const resolve = resolveConnectivity(new Map(), [], []);
    expect(() => resolve("lead:missing:x")).toThrow(RangeError);
  });

  it("throws when a breadboardHole references a board id with no placed breadboard", () => {
    const point: ConnectionPointRef = {
      kind: "breadboardHole",
      boardItemId: "ghost-board",
      hole: { kind: "rail", rail: "top-positive" },
    };
    expect(() => resolveConnectivity(new Map(), [point], [])).toThrow(RangeError);
  });
});
