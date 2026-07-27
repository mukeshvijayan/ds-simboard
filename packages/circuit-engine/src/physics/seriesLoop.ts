/**
 * A resistive element in a series loop — the same model `solveSeriesCircuit`
 * (Phase 2) already handles.
 */
export type SeriesLoopElement =
  | { id: string; kind: "resistive"; resistanceOhms: number }
  | { id: string; kind: "fixed-drop"; forwardVoltageVolts: number };

export type SeriesLoopOutcome =
  | {
      kind: "conducting";
      currentAmps: number;
      voltageDropsByElementId: Record<string, number>;
    }
  | { kind: "non-conducting"; voltageDropsByElementId: Record<string, number> }
  | { kind: "short-circuit" };

/**
 * Solves a single series loop that may mix ohmic resistors with
 * fixed-voltage-drop elements (a forward-biased diode/LED, modeled by its
 * forward-voltage spec rather than a resistance — a real diode's V-I curve
 * is nonlinear, so representing it as a resistance would give a physically
 * wrong current). This is still strictly a single series loop, not general
 * nodal analysis — see docs/architecture/0004-*.md and 0005-*.md.
 *
 * Three distinct outcomes, matching spec Part 2.3's three failure/safety
 * categories:
 * - `"short-circuit"`: the resistive elements sum to 0Ω while there's
 *   enough voltage to drive current — e.g. an LED wired with no series
 *   resistor. The canonical example spec Part 2.3 calls out.
 * - `"non-conducting"`: either the supply voltage doesn't exceed the
 *   fixed-voltage-drop elements' total (an LED that isn't forward-biased
 *   hard enough to light), or an element reports infinite resistance (an
 *   open switch breaks the loop) — either way, current is legitimately 0,
 *   which is not a failure, just "off."
 * - `"conducting"`: normal operation; current and every element's voltage
 *   drop are well-defined.
 */
export function solveSeriesLoop(
  supplyVoltage: number,
  elements: SeriesLoopElement[]
): SeriesLoopOutcome {
  if (elements.length === 0) {
    throw new RangeError("solveSeriesLoop requires at least one element");
  }

  let totalResistanceOhms = 0;
  let totalForwardDropVolts = 0;
  for (const element of elements) {
    if (element.kind === "resistive") {
      if (!(element.resistanceOhms >= 0)) {
        throw new RangeError(`resistanceOhms for "${element.id}" must be >= 0`);
      }
      totalResistanceOhms += element.resistanceOhms;
    } else {
      if (!(element.forwardVoltageVolts >= 0)) {
        throw new RangeError(`forwardVoltageVolts for "${element.id}" must be >= 0`);
      }
      totalForwardDropVolts += element.forwardVoltageVolts;
    }
  }

  const availableVoltage = supplyVoltage - totalForwardDropVolts;

  if (totalResistanceOhms <= 0 && availableVoltage > 0) {
    return { kind: "short-circuit" };
  }

  if (availableVoltage <= 0 || !Number.isFinite(totalResistanceOhms)) {
    const voltageDropsByElementId: Record<string, number> = {};
    for (const element of elements) {
      if (element.kind === "fixed-drop") {
        voltageDropsByElementId[element.id] = Math.max(
          0,
          Math.min(element.forwardVoltageVolts, supplyVoltage)
        );
      } else if (!Number.isFinite(element.resistanceOhms)) {
        // An open element (e.g. a released pushbutton). No current flows,
        // so it absorbs the remaining loop voltage. If more than one
        // element is open at once, each is simply shown carrying the full
        // remaining voltage — the exact split isn't physically well-defined
        // without further device modeling, and doesn't matter here since
        // the current (0A) is correct either way.
        voltageDropsByElementId[element.id] = Math.max(0, availableVoltage);
      } else {
        voltageDropsByElementId[element.id] = 0;
      }
    }
    return { kind: "non-conducting", voltageDropsByElementId };
  }

  const currentAmps = availableVoltage / totalResistanceOhms;
  const voltageDropsByElementId: Record<string, number> = {};
  for (const element of elements) {
    voltageDropsByElementId[element.id] =
      element.kind === "resistive"
        ? currentAmps * element.resistanceOhms
        : element.forwardVoltageVolts;
  }
  return { kind: "conducting", currentAmps, voltageDropsByElementId };
}
