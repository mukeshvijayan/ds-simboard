/**
 * Ohm's law, as three pure rearrangements of V = I·R. These operate on
 * magnitudes (unsigned) — current direction / component polarity is a
 * concern for `packages/component-library` (Phase 3: reverse-polarity
 * handling per spec Part 2.3), not this package.
 *
 * Degenerate inputs (zero/negative resistance where that's not physically
 * meaningful) throw rather than silently returning `Infinity`/`NaN`, so
 * that a short-circuit condition surfaces as an explicit error the caller
 * must handle — the "clamp instead of Infinity" policy from spec Part 2.3
 * belongs to the higher-level failure-state logic in Phase 3/4, which is
 * expected to catch this.
 */

/** V = I × R. */
export function voltage(currentAmps: number, resistanceOhms: number): number {
  if (resistanceOhms < 0) {
    throw new RangeError("resistanceOhms must be >= 0");
  }
  return currentAmps * resistanceOhms;
}

/** I = V / R. Throws if resistanceOhms is 0 (a short circuit) or negative. */
export function current(voltageVolts: number, resistanceOhms: number): number {
  if (resistanceOhms <= 0) {
    throw new RangeError("resistanceOhms must be > 0 (0 ohms is a short circuit)");
  }
  return voltageVolts / resistanceOhms;
}

/** R = V / I. Throws if currentAmps is 0 (resistance is undefined/open-circuit). */
export function resistance(voltageVolts: number, currentAmps: number): number {
  if (currentAmps === 0) {
    throw new RangeError("currentAmps must be non-zero (0 A is an open circuit)");
  }
  return voltageVolts / currentAmps;
}
