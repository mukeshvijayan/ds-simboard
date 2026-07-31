import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  HealthState,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface FastBlowFuseParams {
  /** Near-zero when intact — a real fuse is a thin wire, not an ideal
   * 0Ω wire. */
  restingResistanceOhms: number;
  ratedCurrentAmps: number;
}

export interface FastBlowFuseInput {
  currentAmps: number;
}

export type FastBlowFuseVisual = VisualState;

function validateParams(params: FastBlowFuseParams): void {
  if (!(params.restingResistanceOhms >= 0)) {
    throw new RangeError("restingResistanceOhms must be >= 0");
  }
  if (!(params.ratedCurrentAmps > 0)) {
    throw new RangeError("ratedCurrentAmps must be > 0");
  }
}

/**
 * A real fast-blow fuse permanently opens the instant current exceeds its
 * rating — the standard latching overcurrent failure every other
 * protected part already uses, just with no "stressed" warning zone
 * first (a fuse doesn't warn, it blows).
 */
export function evaluateFastBlowFuse(
  params: FastBlowFuseParams,
  input: FastBlowFuseInput,
  previous: PreviousComponentState
): EvaluationResult<FastBlowFuseVisual> {
  validateParams(params);
  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.currentAmps,
    maxValue: params.ratedCurrentAmps,
    failureReason: `current ${Math.abs(input.currentAmps).toFixed(2)}A exceeds rated ${params.ratedCurrentAmps}A — fuse blown`,
  });
  return { visual: { health }, health };
}

/** Near-0Ω while intact, an open circuit forever once blown. */
export function fastBlowFuseSeriesElement(
  params: FastBlowFuseParams,
  health: HealthState
): SeriesLoopElementDescriptor {
  validateParams(params);
  if (health.status === "failed") {
    return { kind: "resistive", resistanceOhms: Infinity };
  }
  return { kind: "resistive", resistanceOhms: params.restingResistanceOhms };
}

export const fastBlowFuseModel: ElectricalModel<
  FastBlowFuseParams,
  FastBlowFuseInput,
  FastBlowFuseVisual
> = {
  type: "fastBlowFuse",
  evaluate: evaluateFastBlowFuse,
};
