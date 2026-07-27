import { Breadboard } from "./breadboard";
import { stripSideOf } from "./types";

describe("stripSideOf", () => {
  it.each(["a", "b", "c", "d", "e"] as const)("classifies row %s as upper", (row) => {
    expect(stripSideOf(row)).toBe("upper");
  });

  it.each(["f", "g", "h", "i", "j"] as const)("classifies row %s as lower", (row) => {
    expect(stripSideOf(row)).toBe("lower");
  });
});

describe("Breadboard construction", () => {
  it("defaults to 30 columns", () => {
    expect(new Breadboard().columns).toBe(30);
  });

  it("accepts a custom column count", () => {
    expect(new Breadboard(63).columns).toBe(63);
  });

  it.each([0, -1, 1.5])("rejects a non-positive-integer column count (%p)", (columns) => {
    expect(() => new Breadboard(columns)).toThrow(RangeError);
  });
});

describe("Breadboard terminal-strip connectivity", () => {
  it("ties all 5 holes in the upper strip of one column into one node", () => {
    const board = new Breadboard();
    const holes = (["a", "b", "c", "d", "e"] as const).map((row) => ({
      kind: "strip" as const,
      row,
      column: 1,
    }));
    const nodeIds = holes.map((hole) => board.nodeIdFor(hole));
    expect(new Set(nodeIds).size).toBe(1);
  });

  it("ties all 5 holes in the lower strip of one column into one node", () => {
    const board = new Breadboard();
    const holes = (["f", "g", "h", "i", "j"] as const).map((row) => ({
      kind: "strip" as const,
      row,
      column: 1,
    }));
    const nodeIds = holes.map((hole) => board.nodeIdFor(hole));
    expect(new Set(nodeIds).size).toBe(1);
  });

  it("does not connect the upper and lower strips of the same column (the center gap)", () => {
    const board = new Breadboard();
    const upper = { kind: "strip" as const, row: "a" as const, column: 5 };
    const lower = { kind: "strip" as const, row: "f" as const, column: 5 };
    expect(board.areConnected(upper, lower)).toBe(false);
  });

  it("does not connect the same row across different columns", () => {
    const board = new Breadboard();
    const colOne = { kind: "strip" as const, row: "a" as const, column: 1 };
    const colTwo = { kind: "strip" as const, row: "a" as const, column: 2 };
    expect(board.areConnected(colOne, colTwo)).toBe(false);
  });

  it.each([0, 31, 1.5])(
    "rejects an out-of-range column (%p) on a 30-column board",
    (column) => {
      const board = new Breadboard();
      expect(() => board.nodeIdFor({ kind: "strip", row: "a", column })).toThrow(
        RangeError
      );
    }
  );
});

describe("Breadboard power rails", () => {
  it("resolves the same rail to the same node across repeated lookups", () => {
    const board = new Breadboard();
    const holeA = { kind: "rail" as const, rail: "top-positive" as const };
    const holeB = { kind: "rail" as const, rail: "top-positive" as const };
    expect(board.areConnected(holeA, holeB)).toBe(true);
  });

  it("treats each of the four rails as electrically distinct", () => {
    const board = new Breadboard();
    const rails = [
      "top-positive",
      "top-negative",
      "bottom-positive",
      "bottom-negative",
    ] as const;
    const nodeIds = rails.map((rail) => board.nodeIdFor({ kind: "rail", rail }));
    expect(new Set(nodeIds).size).toBe(4);
  });

  it("does not connect a rail to a terminal strip by default", () => {
    const board = new Breadboard();
    const rail = { kind: "rail" as const, rail: "top-positive" as const };
    const strip = { kind: "strip" as const, row: "a" as const, column: 1 };
    expect(board.areConnected(rail, strip)).toBe(false);
  });
});

describe("Breadboard wires", () => {
  it("connects two previously unconnected holes", () => {
    const board = new Breadboard();
    const rail = { kind: "rail" as const, rail: "top-positive" as const };
    const strip = { kind: "strip" as const, row: "a" as const, column: 1 };
    expect(board.areConnected(rail, strip)).toBe(false);
    board.addWire(rail, strip);
    expect(board.areConnected(rail, strip)).toBe(true);
  });

  it("merges nodes transitively across multiple wires", () => {
    const board = new Breadboard();
    const colOne = { kind: "strip" as const, row: "a" as const, column: 1 };
    const colFive = { kind: "strip" as const, row: "a" as const, column: 5 };
    const colTen = { kind: "strip" as const, row: "a" as const, column: 10 };

    board.addWire(colOne, colFive);
    board.addWire(colFive, colTen);

    expect(board.areConnected(colOne, colTen)).toBe(true);
  });

  it("does not affect unrelated holes", () => {
    const board = new Breadboard();
    const colOne = { kind: "strip" as const, row: "a" as const, column: 1 };
    const colTwo = { kind: "strip" as const, row: "a" as const, column: 2 };
    const colThree = { kind: "strip" as const, row: "a" as const, column: 3 };

    board.addWire(colOne, colTwo);

    expect(board.areConnected(colOne, colThree)).toBe(false);
  });

  it("rejects wiring to an out-of-range hole", () => {
    const board = new Breadboard();
    const valid = { kind: "strip" as const, row: "a" as const, column: 1 };
    const invalid = { kind: "strip" as const, row: "a" as const, column: 99 };
    expect(() => board.addWire(valid, invalid)).toThrow(RangeError);
  });
});
