export type LinearSolveResult =
  { kind: "solved"; solution: number[] } | { kind: "singular" };

/** Below this pivot magnitude, the matrix is treated as singular rather
 * than risking a division that blows up into a physically meaningless
 * "solution." Conductances/coefficients in this codebase's circuits are
 * never anywhere near this small unless the system is genuinely
 * rank-deficient (a short circuit, contradictory voltage sources, etc). */
const PIVOT_EPSILON = 1e-9;

/**
 * Solves the dense linear system `a·x = b` via Gaussian elimination with
 * partial pivoting. Chosen over LU decomposition or an iterative method
 * for simplicity: this is a one-shot solve (no reused factorization) over
 * at most a few dozen unknowns (a breadboard's worth of nodes/sources),
 * far below where elimination's O(n³) cost would matter — see
 * docs/architecture/0018-*.md.
 */
export function solveLinearSystem(a: number[][], b: number[]): LinearSolveResult {
  const n = b.length;
  if (a.length !== n || a.some((row) => row.length !== n)) {
    throw new RangeError(
      "solveLinearSystem requires a square matrix matching b's length"
    );
  }
  if (n === 0) {
    return { kind: "solved", solution: [] };
  }

  // Work on copies so the caller's arrays are never mutated.
  const m = a.map((row) => row.slice());
  const rhs = b.slice();

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotMagnitude = Math.abs(m[col][col]);
    for (let row = col + 1; row < n; row++) {
      const magnitude = Math.abs(m[row][col]);
      if (magnitude > pivotMagnitude) {
        pivotRow = row;
        pivotMagnitude = magnitude;
      }
    }
    if (pivotMagnitude < PIVOT_EPSILON) {
      return { kind: "singular" };
    }
    if (pivotRow !== col) {
      [m[col], m[pivotRow]] = [m[pivotRow], m[col]];
      [rhs[col], rhs[pivotRow]] = [rhs[pivotRow], rhs[col]];
    }

    for (let row = col + 1; row < n; row++) {
      const factor = m[row][col] / m[col][col];
      if (factor === 0) continue;
      for (let k = col; k < n; k++) {
        m[row][k] -= factor * m[col][k];
      }
      rhs[row] -= factor * rhs[col];
    }
  }

  const solution = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = rhs[row];
    for (let col = row + 1; col < n; col++) {
      sum -= m[row][col] * solution[col];
    }
    solution[row] = sum / m[row][row];
  }

  return { kind: "solved", solution };
}
