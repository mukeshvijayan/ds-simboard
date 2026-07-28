import { HealthState } from "./types";

/**
 * The shared over-threshold health check (spec Part 2.3): a component
 * whose measured value (current, power dissipation, ...) exceeds its
 * rated maximum latches into `"failed"`; an optional intermediate
 * `stressedThreshold` produces a `"stressed"` warning below that. Once
 * failed, a component stays failed regardless of subsequent readings —
 * the caller must construct a fresh `NOMINAL_HEALTH` to "replace" it.
 */
export function applyMagnitudeThresholdHealth(params: {
  previousHealth: HealthState;
  measuredValue: number;
  maxValue: number;
  stressedThreshold?: number;
  failureReason: string;
}): HealthState {
  if (params.previousHealth.status === "failed") {
    return params.previousHealth;
  }
  const magnitude = Math.abs(params.measuredValue);
  if (magnitude > params.maxValue) {
    return { status: "failed", reason: params.failureReason };
  }
  if (params.stressedThreshold !== undefined && magnitude > params.stressedThreshold) {
    return { status: "stressed" };
  }
  return { status: "nominal" };
}

/**
 * The shared reverse-polarity health check (spec Part 2.3): for a
 * component that's damaged the instant it's reverse-biased (an
 * electrolytic capacitor), rather than one that's merely blocked and
 * undamaged by it (a diode/LED below its breakdown voltage — see each of
 * those components' own health logic instead). Latches the same way as
 * {@link applyMagnitudeThresholdHealth}.
 */
export function applyReversePolarityHealth(params: {
  previousHealth: HealthState;
  isReverseBiased: boolean;
  failureReason: string;
}): HealthState {
  if (params.previousHealth.status === "failed") {
    return params.previousHealth;
  }
  if (params.isReverseBiased) {
    return { status: "failed", reason: params.failureReason };
  }
  return { status: "nominal" };
}

/**
 * The shared short-circuit health check (spec Part 2.3): when
 * `circuit-engine`'s solver reports a `"short-circuit"` outcome (no
 * resistive element anywhere to limit current), every component involved
 * is marked failed — there's no well-defined current to report, only
 * that something is now damaged. Latches the same way as the other
 * health checks.
 */
export function applyShortCircuitHealth(previousHealth: HealthState): HealthState {
  if (previousHealth.status === "failed") {
    return previousHealth;
  }
  return {
    status: "failed",
    reason: "short circuit: no resistive element in this loop to limit current",
  };
}
