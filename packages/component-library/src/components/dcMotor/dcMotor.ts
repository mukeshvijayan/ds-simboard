import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  HealthState,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface DcMotorParams {
  /** Typical operating voltage, e.g. 6 for a common small hobby motor. */
  ratedVoltageVolts: number;
  /** Typical free-spinning current draw, e.g. 0.1 (100mA). */
  ratedCurrentAmps: number;
  /**
   * Real DC motors draw far more current when stalled (the shaft is
   * physically blocked) than when spinning freely — this simulator
   * doesn't model mechanical load, so `stallCurrentAmps` stands in as the
   * absolute current ceiling before the winding burns out.
   */
  stallCurrentAmps: number;
}

export interface DcMotorInput {
  currentAmps: number;
}

export interface DcMotorVisual extends VisualState {
  /** 0 (stopped) to 1 (spinning at/above rated speed). */
  speedFraction: number;
}

function validateParams(params: DcMotorParams): void {
  if (!(params.ratedVoltageVolts > 0)) {
    throw new RangeError("ratedVoltageVolts must be > 0");
  }
  if (!(params.ratedCurrentAmps > 0)) {
    throw new RangeError("ratedCurrentAmps must be > 0");
  }
  if (!(params.stallCurrentAmps >= params.ratedCurrentAmps)) {
    throw new RangeError("stallCurrentAmps must be >= ratedCurrentAmps");
  }
}

/**
 * Modeled as a simple resistive winding (see `dcMotorSeriesElement`) whose
 * apparent "speed" scales with current up to the rated current, and whose
 * winding burns out past `stallCurrentAmps` — the same over-current
 * failure shape as every other current-limited component here, standing
 * in for a real stalled-rotor burnout.
 */
export function evaluateDcMotor(
  params: DcMotorParams,
  input: DcMotorInput,
  previous: PreviousComponentState
): EvaluationResult<DcMotorVisual> {
  validateParams(params);

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.currentAmps,
    maxValue: params.stallCurrentAmps,
    stressedThreshold: params.ratedCurrentAmps,
    failureReason: `current ${(input.currentAmps * 1000).toFixed(1)}mA exceeds max rating ${(params.stallCurrentAmps * 1000).toFixed(1)}mA`,
  });

  const speedFraction =
    health.status === "failed"
      ? 0
      : Math.min(1, Math.max(0, input.currentAmps / params.ratedCurrentAmps));

  return { visual: { health, speedFraction }, health };
}

/**
 * How a DC motor presents itself to the series-loop solver: a fixed
 * winding resistance derived from its rated voltage/current (Ohm's law).
 * A failed (burned-out) winding stops conducting entirely.
 */
export function dcMotorSeriesElement(
  params: DcMotorParams,
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

export const dcMotorModel: ElectricalModel<DcMotorParams, DcMotorInput, DcMotorVisual> = {
  type: "dcMotor",
  evaluate: evaluateDcMotor,
};
