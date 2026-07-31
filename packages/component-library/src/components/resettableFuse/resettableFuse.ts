import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  HealthState,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface ResettableFuseParams {
  /** Near-zero while untripped. */
  restingResistanceOhms: number;
  /** Sharply higher once tripped — a real PTC self-heats into a
   * high-resistance state that limits current to a small trickle, it
   * doesn't fully open like a blown fast-blow fuse. */
  trippedResistanceOhms: number;
  /** Current above which an untripped fuse trips. */
  tripCurrentAmps: number;
  /** Current below which a tripped fuse resets — lower than
   * `tripCurrentAmps` (real PTC hysteresis: it needs to cool down, not
   * just dip below the trip point for an instant). */
  holdCurrentAmps: number;
  /** Current far beyond `tripCurrentAmps` that permanently destroys the
   * part instead of tripping — a real PTC has a maximum fault current
   * rating too. */
  destructiveCurrentAmps: number;
}

export interface ResettableFuseInput {
  currentAmps: number;
}

export type ResettableFuseVisual = VisualState;

function validateParams(params: ResettableFuseParams): void {
  if (!(params.restingResistanceOhms >= 0)) {
    throw new RangeError("restingResistanceOhms must be >= 0");
  }
  if (!(params.trippedResistanceOhms > params.restingResistanceOhms)) {
    throw new RangeError("trippedResistanceOhms must be > restingResistanceOhms");
  }
  if (!(params.holdCurrentAmps > 0 && params.holdCurrentAmps < params.tripCurrentAmps)) {
    throw new RangeError("holdCurrentAmps must be > 0 and < tripCurrentAmps");
  }
  if (!(params.destructiveCurrentAmps > params.tripCurrentAmps)) {
    throw new RangeError("destructiveCurrentAmps must be > tripCurrentAmps");
  }
}

/**
 * A resettable (PTC) fuse doesn't latch the way every other protected
 * part in this package does — its whole point is resetting once
 * overcurrent clears. Modeled with real hysteresis (trips at
 * `tripCurrentAmps`, only resets once current drops below the lower
 * `holdCurrentAmps`) using the non-latching `"stressed"` status as
 * "currently tripped" rather than `"failed"`, since the part survives.
 * A large enough fault current (`destructiveCurrentAmps`) still
 * destroys it permanently, the one case that does latch to `"failed"`.
 */
export function evaluateResettableFuse(
  params: ResettableFuseParams,
  input: ResettableFuseInput,
  previous: PreviousComponentState
): EvaluationResult<ResettableFuseVisual> {
  validateParams(params);

  if (previous.health.status === "failed") {
    return { visual: { health: previous.health }, health: previous.health };
  }

  const magnitude = Math.abs(input.currentAmps);
  if (magnitude > params.destructiveCurrentAmps) {
    const health: HealthState = {
      status: "failed",
      reason: `current ${magnitude.toFixed(2)}A far exceeds its rating — PTC destroyed, won't reset`,
    };
    return { visual: { health }, health };
  }

  const wasTripped = previous.health.status === "stressed";
  const isTripped = wasTripped
    ? magnitude > params.holdCurrentAmps
    : magnitude > params.tripCurrentAmps;
  const health: HealthState = isTripped ? { status: "stressed" } : NOMINAL_HEALTH;
  return { visual: { health }, health };
}

/** Near-0Ω while untripped, sharply higher while tripped, an open
 * circuit forever only if genuinely destroyed. */
export function resettableFuseSeriesElement(
  params: ResettableFuseParams,
  health: HealthState
): SeriesLoopElementDescriptor {
  validateParams(params);
  if (health.status === "failed") {
    return { kind: "resistive", resistanceOhms: Infinity };
  }
  if (health.status === "stressed") {
    return { kind: "resistive", resistanceOhms: params.trippedResistanceOhms };
  }
  return { kind: "resistive", resistanceOhms: params.restingResistanceOhms };
}

export const resettableFuseModel: ElectricalModel<
  ResettableFuseParams,
  ResettableFuseInput,
  ResettableFuseVisual
> = {
  type: "resettableFuse",
  evaluate: evaluateResettableFuse,
};
