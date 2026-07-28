import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface SoundSensorParams {
  /** Resistance at maximum simulated loudness, e.g. 1_000. */
  minResistanceOhms: number;
  /** Resistance in silence, e.g. 100_000. */
  maxResistanceOhms: number;
}

export interface SoundSensorInput {
  /** Simulated loudness, 0 (silent) to 1 (loud) — user-adjustable, the
   * same "the human provides the input this simulator can't sense" shape
   * as an LDR's simulated light level. */
  loudness: number;
}

export interface SoundSensorVisual extends VisualState {
  effectiveResistanceOhms: number;
}

function validateParams(params: SoundSensorParams): void {
  if (!(params.minResistanceOhms >= 0)) {
    throw new RangeError("minResistanceOhms must be >= 0");
  }
  if (!(params.maxResistanceOhms > params.minResistanceOhms)) {
    throw new RangeError("maxResistanceOhms must be > minResistanceOhms");
  }
}

function validateLoudness(loudness: number): void {
  if (!(loudness >= 0 && loudness <= 1)) {
    throw new RangeError("loudness must be between 0 and 1");
  }
}

/** The resistance a sound sensor presents at a given simulated loudness —
 * a linear interpolation between its silent ceiling and loud floor. */
export function effectiveSoundResistance(
  params: SoundSensorParams,
  loudness: number
): number {
  validateParams(params);
  validateLoudness(loudness);
  return (
    params.maxResistanceOhms -
    loudness * (params.maxResistanceOhms - params.minResistanceOhms)
  );
}

/**
 * A sound sensor has no failure mode of its own in this simulator, the
 * same as an LDR — it's a passive sensor. `evaluate` always reports
 * nominal health.
 */
export function evaluateSoundSensor(
  params: SoundSensorParams,
  input: SoundSensorInput,
  _previous: PreviousComponentState
): EvaluationResult<SoundSensorVisual> {
  const effectiveResistanceOhms = effectiveSoundResistance(params, input.loudness);
  return {
    visual: { health: NOMINAL_HEALTH, effectiveResistanceOhms },
    health: NOMINAL_HEALTH,
  };
}

/** How a sound sensor presents itself to the series-loop solver: its
 * current loudness-derived resistance. */
export function soundSensorSeriesElement(
  params: SoundSensorParams,
  loudness: number
): SeriesLoopElementDescriptor {
  return {
    kind: "resistive",
    resistanceOhms: effectiveSoundResistance(params, loudness),
  };
}

export const soundSensorModel: ElectricalModel<
  SoundSensorParams,
  SoundSensorInput,
  SoundSensorVisual
> = {
  type: "soundSensor",
  evaluate: evaluateSoundSensor,
};
