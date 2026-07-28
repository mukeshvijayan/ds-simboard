import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface RainSensorParams {
  /** Resistance on a fully wet sensor plate, e.g. 1_000. */
  minResistanceOhms: number;
  /** Resistance on a bone-dry sensor plate, e.g. 100_000. */
  maxResistanceOhms: number;
}

export interface RainSensorInput {
  /** Simulated rain intensity, 0 (dry) to 1 (heavy rain) — user-adjustable,
   * the same "the human provides the input this simulator can't sense"
   * shape as an LDR's simulated light level. */
  rainLevel: number;
}

export interface RainSensorVisual extends VisualState {
  effectiveResistanceOhms: number;
}

function validateParams(params: RainSensorParams): void {
  if (!(params.minResistanceOhms >= 0)) {
    throw new RangeError("minResistanceOhms must be >= 0");
  }
  if (!(params.maxResistanceOhms > params.minResistanceOhms)) {
    throw new RangeError("maxResistanceOhms must be > minResistanceOhms");
  }
}

function validateRainLevel(rainLevel: number): void {
  if (!(rainLevel >= 0 && rainLevel <= 1)) {
    throw new RangeError("rainLevel must be between 0 and 1");
  }
}

/** The resistance a rain sensor presents at a given simulated rain level —
 * a linear interpolation between its dry ceiling and wet floor. */
export function effectiveRainResistance(
  params: RainSensorParams,
  rainLevel: number
): number {
  validateParams(params);
  validateRainLevel(rainLevel);
  return (
    params.maxResistanceOhms -
    rainLevel * (params.maxResistanceOhms - params.minResistanceOhms)
  );
}

/**
 * A rain sensor has no failure mode of its own in this simulator, the
 * same as an LDR — it's a passive sensor. `evaluate` always reports
 * nominal health.
 */
export function evaluateRainSensor(
  params: RainSensorParams,
  input: RainSensorInput,
  _previous: PreviousComponentState
): EvaluationResult<RainSensorVisual> {
  const effectiveResistanceOhms = effectiveRainResistance(params, input.rainLevel);
  return {
    visual: { health: NOMINAL_HEALTH, effectiveResistanceOhms },
    health: NOMINAL_HEALTH,
  };
}

/** How a rain sensor presents itself to the series-loop solver: its
 * current rain-level-derived resistance. */
export function rainSensorSeriesElement(
  params: RainSensorParams,
  rainLevel: number
): SeriesLoopElementDescriptor {
  return {
    kind: "resistive",
    resistanceOhms: effectiveRainResistance(params, rainLevel),
  };
}

export const rainSensorModel: ElectricalModel<
  RainSensorParams,
  RainSensorInput,
  RainSensorVisual
> = {
  type: "rainSensor",
  evaluate: evaluateRainSensor,
};
