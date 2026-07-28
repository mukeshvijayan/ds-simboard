import { holePosition, resolveVisualColumn } from "./layout";

describe("holePosition", () => {
  it("places the positive rail above the negative rail", () => {
    const positive = holePosition(
      { address: { kind: "rail", rail: "top-positive" }, visualColumn: 1 },
      20
    );
    const negative = holePosition(
      { address: { kind: "rail", rail: "top-negative" }, visualColumn: 1 },
      20
    );
    expect(positive.yPercent).toBeLessThan(negative.yPercent);
  });

  it("places strip rows a-e above the center gap and f-j below it", () => {
    const rowA = holePosition(
      { address: { kind: "strip", row: "a", column: 1 }, visualColumn: 1 },
      20
    );
    const rowJ = holePosition(
      { address: { kind: "strip", row: "j", column: 1 }, visualColumn: 1 },
      20
    );
    expect(rowA.yPercent).toBeLessThan(rowJ.yPercent);
  });

  it("spaces columns evenly across the width", () => {
    const col1 = holePosition(
      { address: { kind: "strip", row: "a", column: 1 }, visualColumn: 1 },
      20
    );
    const col20 = holePosition(
      { address: { kind: "strip", row: "a", column: 20 }, visualColumn: 20 },
      20
    );
    expect(col1.xPercent).toBeLessThan(col20.xPercent);
    expect(col1.xPercent).toBeGreaterThanOrEqual(0);
    expect(col20.xPercent).toBeLessThanOrEqual(100);
  });
});

describe("resolveVisualColumn", () => {
  it("uses a strip hole's own column", () => {
    expect(
      resolveVisualColumn(
        { kind: "strip", row: "a", column: 7 },
        { kind: "rail", rail: "top-positive" }
      )
    ).toBe(7);
  });

  it("borrows the other endpoint's column for a rail hole connected to a strip hole", () => {
    expect(
      resolveVisualColumn(
        { kind: "rail", rail: "top-positive" },
        { kind: "strip", row: "a", column: 7 }
      )
    ).toBe(7);
  });

  it("falls back to column 1 when both endpoints are rails", () => {
    expect(
      resolveVisualColumn(
        { kind: "rail", rail: "top-positive" },
        { kind: "rail", rail: "top-negative" }
      )
    ).toBe(1);
  });
});
