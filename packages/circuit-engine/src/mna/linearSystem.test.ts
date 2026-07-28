import { solveLinearSystem } from "./linearSystem";

describe("solveLinearSystem", () => {
  it("solves a simple 2x2 system", () => {
    // 2x + y = 5
    // x - y = 1
    // => x=2, y=1
    const result = solveLinearSystem(
      [
        [2, 1],
        [1, -1],
      ],
      [5, 1]
    );
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.solution[0]).toBeCloseTo(2);
    expect(result.solution[1]).toBeCloseTo(1);
  });

  it("solves a 3x3 system requiring a row swap for pivoting", () => {
    // Deliberately put a 0 in the first pivot position to exercise
    // partial pivoting.
    // 0x + 2y + z = 5
    // x + y + z = 6
    // 2x - y + z = 3
    // => x=5, y=4, z=-3 (verified independently, and by substitution)
    const result = solveLinearSystem(
      [
        [0, 2, 1],
        [1, 1, 1],
        [2, -1, 1],
      ],
      [5, 6, 3]
    );
    expect(result.kind).toBe("solved");
    if (result.kind !== "solved") return;
    expect(result.solution[0]).toBeCloseTo(5);
    expect(result.solution[1]).toBeCloseTo(4);
    expect(result.solution[2]).toBeCloseTo(-3);
  });

  it("detects a singular matrix (two proportional rows)", () => {
    const result = solveLinearSystem(
      [
        [1, 2],
        [2, 4],
      ],
      [3, 6]
    );
    expect(result.kind).toBe("singular");
  });

  it("detects a singular matrix (contradictory constant rows)", () => {
    const result = solveLinearSystem(
      [
        [1, 1],
        [1, 1],
      ],
      [2, 5]
    );
    expect(result.kind).toBe("singular");
  });

  it("returns an empty solution for a 0x0 system", () => {
    const result = solveLinearSystem([], []);
    expect(result).toEqual({ kind: "solved", solution: [] });
  });

  it("throws for a non-square matrix", () => {
    expect(() => solveLinearSystem([[1, 2]], [1])).toThrow(RangeError);
  });

  it("throws when the matrix size doesn't match b's length", () => {
    expect(() =>
      solveLinearSystem(
        [
          [1, 0],
          [0, 1],
        ],
        [1]
      )
    ).toThrow(RangeError);
  });

  it("does not mutate its input arrays", () => {
    const a = [
      [2, 1],
      [1, -1],
    ];
    const b = [5, 1];
    solveLinearSystem(a, b);
    expect(a).toEqual([
      [2, 1],
      [1, -1],
    ]);
    expect(b).toEqual([5, 1]);
  });
});
