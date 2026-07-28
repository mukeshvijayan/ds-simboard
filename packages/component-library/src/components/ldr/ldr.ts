import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface LdrParams {
  /** Resistance in full bright light, e.g. 500 (a common LDR's bright-light floor). */
  minResistanceOhms: number;
  /** Resistance in full darkness, e.g. 1_000_000 (a common LDR's dark-condition ceiling). */
  maxResistanceOhms: number;
}

export interface LdrInput {
  /**
   * Simulated ambient light level, 0 (dark) to 1 (bright) — there's no
   * real light source on a breadboard, so this is a user-adjustable
   * stand-in, the same "the human provides the input this simulator can't
   * sense" shape as a pushbutton's `pressed` flag.
   */
  lightLevel: number;
}

export interface LdrVisual extends VisualState {
  effectiveResistanceOhms: number;
}

function validateParams(params: LdrParams): void {
  if (!(params.minResistanceOhms >= 0)) {
    throw new RangeError("minResistanceOhms must be >= 0");
  }
  if (!(params.maxResistanceOhms > params.minResistanceOhms)) {
    throw new RangeError("maxResistanceOhms must be > minResistanceOhms");
  }
}

function validateLightLevel(lightLevel: number): void {
  if (!(lightLevel >= 0 && lightLevel <= 1)) {
    throw new RangeError("lightLevel must be between 0 and 1");
  }
}

/** The resistance an LDR presents at a given simulated light level — a
 * linear interpolation between its dark ceiling and bright floor. */
export function effectiveLdrResistance(params: LdrParams, lightLevel: number): number {
  validateParams(params);
  validateLightLevel(lightLevel);
  return (
    params.maxResistanceOhms -
    lightLevel * (params.maxResistanceOhms - params.minResistanceOhms)
  );
}

/**
 * An LDR has no failure mode of its own in this simulator, the same as a
 * potentiometer or pushbutton — it's a passive sensor, not a
 * current-limited load. `evaluate` always reports nominal health.
 */
export function evaluateLdr(
  params: LdrParams,
  input: LdrInput,
  _previous: PreviousComponentState
): EvaluationResult<LdrVisual> {
  const effectiveResistanceOhms = effectiveLdrResistance(params, input.lightLevel);
  return {
    visual: { health: NOMINAL_HEALTH, effectiveResistanceOhms },
    health: NOMINAL_HEALTH,
  };
}

/** How an LDR presents itself to the series-loop solver: its current
 * light-level-derived resistance. */
export function ldrSeriesElement(
  params: LdrParams,
  lightLevel: number
): SeriesLoopElementDescriptor {
  return {
    kind: "resistive",
    resistanceOhms: effectiveLdrResistance(params, lightLevel),
  };
}

export const ldrModel: ElectricalModel<LdrParams, LdrInput, LdrVisual> = {
  type: "ldr",
  evaluate: evaluateLdr,
};
