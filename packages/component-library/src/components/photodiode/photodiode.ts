import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  HealthState,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface PhotodiodeParams {
  forwardVoltageVolts: number;
  reverseBreakdownVoltageVolts: number;
  /** Reverse-biased resistance in full darkness — effectively an open
   * circuit, the same "no light, no signal" floor an LDR's dark ceiling
   * represents. */
  darkResistanceOhms: number;
  /** Reverse-biased resistance in full light — a real photodiode used
   * for light sensing is operated exactly this way (reverse-biased,
   * its leakage current proportional to incident light), unlike a plain
   * diode/LED, which is always used forward-biased. */
  litResistanceOhms: number;
}

/**
 * Which way the photodiode is currently biased, the same wiring-
 * orientation-is-an-input shape `DiodeInput` already uses — `lightLevel`
 * only matters in reverse bias (a real photodiode's light-sensing mode),
 * the same "the human provides the input this simulator can't sense"
 * shape an LDR's simulated light level already is.
 */
export type PhotodiodeInput =
  | { biased: "forward"; currentAmps: number }
  | { biased: "reverse"; voltageVolts: number; lightLevel: number };

export interface PhotodiodeVisual extends VisualState {
  isConducting: boolean;
  isReverseBiased: boolean;
  /** Only meaningful while reverse-biased — the light-dependent
   * resistance this instant's `lightLevel` produces. */
  effectiveResistanceOhms: number;
}

function validateParams(params: PhotodiodeParams): void {
  if (!(params.darkResistanceOhms >= 0)) {
    throw new RangeError("darkResistanceOhms must be >= 0");
  }
  if (!(
    params.litResistanceOhms >= 0 && params.litResistanceOhms < params.darkResistanceOhms
  )) {
    throw new RangeError("litResistanceOhms must be >= 0 and < darkResistanceOhms");
  }
}

function validateLightLevel(lightLevel: number): void {
  if (!(lightLevel >= 0 && lightLevel <= 1)) {
    throw new RangeError("lightLevel must be between 0 and 1");
  }
}

/** The resistance a photodiode presents while reverse-biased at a given
 * simulated light level — full light is its low-resistance floor
 * (maximum photocurrent), darkness is its near-open ceiling, the same
 * interpolation shape `effectiveLdrResistance` already uses. */
export function effectivePhotodiodeResistance(
  params: PhotodiodeParams,
  lightLevel: number
): number {
  validateParams(params);
  validateLightLevel(lightLevel);
  return (
    params.darkResistanceOhms -
    lightLevel * (params.darkResistanceOhms - params.litResistanceOhms)
  );
}

/**
 * Spec Part 2.3's reverse-bias health check, same as a plain diode:
 * reverse bias below breakdown is this part's *normal* operating mode
 * (unlike a plain diode, it's the intended one), not damage — only
 * exceeding the reverse breakdown voltage latches a failure.
 */
export function evaluatePhotodiode(
  params: PhotodiodeParams,
  input: PhotodiodeInput,
  previous: PreviousComponentState
): EvaluationResult<PhotodiodeVisual> {
  validateParams(params);

  if (input.biased === "forward") {
    const health: HealthState =
      previous.health.status === "failed" ? previous.health : NOMINAL_HEALTH;
    return {
      visual: {
        health,
        isConducting: true,
        isReverseBiased: false,
        effectiveResistanceOhms: 0,
      },
      health,
    };
  }

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.voltageVolts,
    maxValue: params.reverseBreakdownVoltageVolts,
    failureReason: `reverse voltage ${Math.abs(input.voltageVolts).toFixed(1)}V exceeds breakdown rating ${params.reverseBreakdownVoltageVolts}V`,
  });
  const effectiveResistanceOhms = effectivePhotodiodeResistance(params, input.lightLevel);
  return {
    visual: {
      health,
      isConducting: false,
      isReverseBiased: true,
      effectiveResistanceOhms,
    },
    health,
  };
}

export const photodiodeModel: ElectricalModel<
  PhotodiodeParams,
  PhotodiodeInput,
  PhotodiodeVisual
> = {
  type: "photodiode",
  evaluate: evaluatePhotodiode,
};
