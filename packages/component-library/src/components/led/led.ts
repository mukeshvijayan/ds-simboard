import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  HealthState,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface LedParams {
  /** ~2V for red, ~3.2V for blue/white, per spec Part 2.2. */
  forwardVoltageVolts: number;
  /** Typical operating current, e.g. 0.02 (20mA). */
  ratedCurrentAmps: number;
  /** Absolute max before failure, e.g. 0.03–0.04 (30–40mA), per spec Part 2.2. */
  maxCurrentAmps: number;
}

/**
 * Which way the LED is currently biased — a wiring-orientation fact (how
 * the user placed it), not something solved from current/voltage.
 */
export type LedInput = { biased: "forward"; currentAmps: number } | { biased: "reverse" };

export interface LedVisual extends VisualState {
  /** 0 (off) to 1 (fully lit at/above rated current). */
  brightness: number;
  isReverseBiased: boolean;
}

function validateParams(params: LedParams): void {
  if (!(params.forwardVoltageVolts >= 0)) {
    throw new RangeError("forwardVoltageVolts must be >= 0");
  }
  if (!(params.ratedCurrentAmps > 0)) {
    throw new RangeError("ratedCurrentAmps must be > 0");
  }
  if (!(params.maxCurrentAmps >= params.ratedCurrentAmps)) {
    throw new RangeError("maxCurrentAmps must be >= ratedCurrentAmps");
  }
}

/**
 * Spec Part 2.3's canonical failure example: no (or an undersized) series
 * resistor lets current exceed `maxCurrentAmps`, which permanently burns
 * the LED out. Reverse bias, per spec Part 2.3, does nothing — it isn't a
 * failure mode for an LED (unlike the general-purpose `Diode`, which does
 * have a modeled reverse-breakdown failure — see `diode.ts`).
 */
export function evaluateLed(
  params: LedParams,
  input: LedInput,
  previous: PreviousComponentState
): EvaluationResult<LedVisual> {
  validateParams(params);

  if (input.biased === "reverse") {
    const health: HealthState =
      previous.health.status === "failed" ? previous.health : NOMINAL_HEALTH;
    return { visual: { health, brightness: 0, isReverseBiased: true }, health };
  }

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.currentAmps,
    maxValue: params.maxCurrentAmps,
    stressedThreshold: params.ratedCurrentAmps,
    failureReason: `current ${(input.currentAmps * 1000).toFixed(1)}mA exceeds max rating ${(params.maxCurrentAmps * 1000).toFixed(1)}mA`,
  });

  const brightness =
    health.status === "failed"
      ? 0
      : Math.min(1, Math.max(0, input.currentAmps / params.ratedCurrentAmps));

  return { visual: { health, brightness, isReverseBiased: false }, health };
}

/**
 * How an LED presents itself to the series-loop solver: a fixed forward
 * voltage drop when healthy and forward-biased, an open circuit when
 * reverse-biased (it blocks, same as a healthy diode), or an open circuit
 * once failed — real LEDs typically fail open (the die itself opens up),
 * unlike a rectifier diode's more common short-circuit breakdown failure
 * (see `diode.ts`); this is a modeling simplification, real failure modes
 * vary by LED construction.
 */
export function ledSeriesElement(
  params: LedParams,
  biased: "forward" | "reverse",
  health: HealthState
): SeriesLoopElementDescriptor {
  if (health.status === "failed" || biased === "reverse") {
    return { kind: "resistive", resistanceOhms: Infinity };
  }
  return { kind: "fixed-drop", forwardVoltageVolts: params.forwardVoltageVolts };
}

export const ledModel: ElectricalModel<LedParams, LedInput, LedVisual> = {
  type: "led",
  evaluate: evaluateLed,
};
