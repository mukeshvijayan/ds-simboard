import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  HealthState,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface BuzzerParams {
  /**
   * An active buzzer has its own internal oscillator and sounds as soon
   * as DC power flows through it, like an LED. A passive buzzer has no
   * oscillator — it needs an oscillating (PWM/tone) drive signal to
   * produce sound, so on a breadboard powered by a plain DC supply it
   * genuinely stays silent even while current flows through it. This
   * simulator has no signal generator on the breadboard itself, so a
   * passive buzzer here always reports `isBuzzing: false` — an honest
   * limitation, not a bug.
   */
  kind: "active" | "passive";
  /** Typical operating voltage, e.g. 5 for a common 5V module. */
  ratedVoltageVolts: number;
  /** Typical operating current, e.g. 0.03 (30mA). */
  ratedCurrentAmps: number;
  /** Absolute max before the coil burns out. */
  maxCurrentAmps: number;
}

export interface BuzzerInput {
  currentAmps: number;
}

export interface BuzzerVisual extends VisualState {
  isBuzzing: boolean;
}

function validateParams(params: BuzzerParams): void {
  if (!(params.ratedVoltageVolts > 0)) {
    throw new RangeError("ratedVoltageVolts must be > 0");
  }
  if (!(params.ratedCurrentAmps > 0)) {
    throw new RangeError("ratedCurrentAmps must be > 0");
  }
  if (!(params.maxCurrentAmps >= params.ratedCurrentAmps)) {
    throw new RangeError("maxCurrentAmps must be >= ratedCurrentAmps");
  }
}

/**
 * A buzzer's coil is modeled as a simple resistive load (same shape as a
 * small motor's winding) — see `buzzerSeriesElement`. Over-current burns
 * the coil out, the same failure shape as every other current-limited
 * component in this package.
 */
export function evaluateBuzzer(
  params: BuzzerParams,
  input: BuzzerInput,
  previous: PreviousComponentState
): EvaluationResult<BuzzerVisual> {
  validateParams(params);

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.currentAmps,
    maxValue: params.maxCurrentAmps,
    stressedThreshold: params.ratedCurrentAmps,
    failureReason: `current ${(input.currentAmps * 1000).toFixed(1)}mA exceeds max rating ${(params.maxCurrentAmps * 1000).toFixed(1)}mA`,
  });

  const isBuzzing =
    health.status !== "failed" && params.kind === "active" && input.currentAmps > 0;

  return { visual: { health, isBuzzing }, health };
}

/**
 * How a buzzer presents itself to the series-loop solver: a fixed
 * resistance derived from its rated voltage/current (Ohm's law), the same
 * approximation used for `dcMotor`. A failed buzzer's coil has burned
 * open, so it stops conducting entirely.
 */
export function buzzerSeriesElement(
  params: BuzzerParams,
  health: HealthState
): SeriesLoopElementDescriptor {
  if (health.status === "failed") {
    return { kind: "resistive", resistanceOhms: Infinity };
  }
  return {
    kind: "resistive",
    resistanceOhms: params.ratedVoltageVolts / params.ratedCurrentAmps,
  };
}

export const buzzerModel: ElectricalModel<BuzzerParams, BuzzerInput, BuzzerVisual> = {
  type: "buzzer",
  evaluate: evaluateBuzzer,
};
