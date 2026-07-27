import { current, voltage } from "./ohmsLaw";

/** A single resistive element in a series loop. */
export interface SeriesResistiveElement {
  id: string;
  resistanceOhms: number;
}

/** The solved state of a series loop. */
export interface SeriesCircuitResult {
  totalResistanceOhms: number;
  currentAmps: number;
  /** Voltage drop across each element, keyed by element id. Sums to `supplyVoltage`. */
  voltageDropsByElementId: Record<string, number>;
}

/**
 * Solves a single-loop series circuit — one supply voltage across N purely
 * resistive elements — via Ohm's law: total resistance is the sum of each
 * element's resistance, current follows from `I = V / R_total`, and each
 * element's voltage drop follows from `V = I × R_element`.
 *
 * Deliberately scoped to series loops only: general resistive networks
 * (parallel branches, multiple sources — full nodal/mesh analysis) are not
 * implemented here. That's real additional work, out of Phase 2's "Ohm's
 * law solver" scope per spec Part 6, and is left as an open decision for
 * whichever later phase (3 or 4) first needs a user-built circuit with
 * parallel branches.
 *
 * This also only models resistors: a real LED's current/voltage
 * relationship is nonlinear (a forward-voltage diode curve, not `V = I·R`)
 * and belongs to that component's own `ElectricalModel` in
 * `packages/component-library` (Phase 3), which will call this solver (or
 * its own math) rather than this function trying to special-case LEDs.
 */
export function solveSeriesCircuit(
  supplyVoltage: number,
  elements: SeriesResistiveElement[]
): SeriesCircuitResult {
  if (elements.length === 0) {
    throw new RangeError("solveSeriesCircuit requires at least one element");
  }

  const totalResistanceOhms = elements.reduce((sum, element) => {
    if (element.resistanceOhms < 0) {
      throw new RangeError(`resistance for element "${element.id}" must be >= 0 ohms`);
    }
    return sum + element.resistanceOhms;
  }, 0);

  const currentAmps = current(supplyVoltage, totalResistanceOhms);

  const voltageDropsByElementId: Record<string, number> = {};
  for (const element of elements) {
    voltageDropsByElementId[element.id] = voltage(currentAmps, element.resistanceOhms);
  }

  return { totalResistanceOhms, currentAmps, voltageDropsByElementId };
}
