import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface SoilMoistureSensorParams {
  /** Resistance in fully saturated (wet) soil, e.g. 1_000. */
  minResistanceOhms: number;
  /** Resistance in bone-dry soil, e.g. 100_000. */
  maxResistanceOhms: number;
}

export interface SoilMoistureSensorInput {
  /** Simulated soil wetness, 0 (dry) to 1 (fully wet) — user-adjustable,
   * the same "the human provides the input this simulator can't sense"
   * shape as an LDR's simulated light level. */
  wetness: number;
}

export interface SoilMoistureSensorVisual extends VisualState {
  effectiveResistanceOhms: number;
}

function validateParams(params: SoilMoistureSensorParams): void {
  if (!(params.minResistanceOhms >= 0)) {
    throw new RangeError("minResistanceOhms must be >= 0");
  }
  if (!(params.maxResistanceOhms > params.minResistanceOhms)) {
    throw new RangeError("maxResistanceOhms must be > minResistanceOhms");
  }
}

function validateWetness(wetness: number): void {
  if (!(wetness >= 0 && wetness <= 1)) {
    throw new RangeError("wetness must be between 0 and 1");
  }
}

/** The resistance a soil moisture sensor presents at a given simulated
 * wetness — a linear interpolation between its dry ceiling and wet floor. */
export function effectiveSoilMoistureResistance(
  params: SoilMoistureSensorParams,
  wetness: number
): number {
  validateParams(params);
  validateWetness(wetness);
  return (
    params.maxResistanceOhms -
    wetness * (params.maxResistanceOhms - params.minResistanceOhms)
  );
}

/**
 * A soil moisture sensor has no failure mode of its own in this
 * simulator, the same as an LDR — it's a passive sensor. `evaluate`
 * always reports nominal health.
 */
export function evaluateSoilMoistureSensor(
  params: SoilMoistureSensorParams,
  input: SoilMoistureSensorInput,
  _previous: PreviousComponentState
): EvaluationResult<SoilMoistureSensorVisual> {
  const effectiveResistanceOhms = effectiveSoilMoistureResistance(params, input.wetness);
  return {
    visual: { health: NOMINAL_HEALTH, effectiveResistanceOhms },
    health: NOMINAL_HEALTH,
  };
}

/** How a soil moisture sensor presents itself to the series-loop solver:
 * its current wetness-derived resistance. */
export function soilMoistureSensorSeriesElement(
  params: SoilMoistureSensorParams,
  wetness: number
): SeriesLoopElementDescriptor {
  return {
    kind: "resistive",
    resistanceOhms: effectiveSoilMoistureResistance(params, wetness),
  };
}

export const soilMoistureSensorModel: ElectricalModel<
  SoilMoistureSensorParams,
  SoilMoistureSensorInput,
  SoilMoistureSensorVisual
> = {
  type: "soilMoistureSensor",
  evaluate: evaluateSoilMoistureSensor,
};
