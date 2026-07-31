import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  HealthState,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

/** Researched range (ADR 0039): the commonly-taught simplified hobby-
 * servo pulse-width mapping — 1000µs is one extreme (0°), 2000µs is the
 * other (180°), 1500µs is center. Real servos vary slightly around this,
 * but this is the range nearly every beginner tutorial and "typical"
 * datasheet spec documents, and the one used here rather than per-preset
 * variation that would overstate real-world precision this simulator
 * can't back up with sensed timing anyway. */
export const SERVO_MIN_PULSE_MICROSECONDS = 1000;
export const SERVO_MAX_PULSE_MICROSECONDS = 2000;

/** A real servo's signal pin presents a high input impedance — this
 * isn't a per-preset parameter (real servos don't meaningfully vary
 * here for teaching purposes), just a fixed, realistic value so the
 * signal lead participates honestly in the circuit graph. */
export const SERVO_SIGNAL_IMPEDANCE_OHMS = 1_000_000;

export interface ServoParams {
  ratedVoltageVolts: number;
  ratedCurrentAmps: number;
  /** Stall/overcurrent rating — exceeding this (e.g. a mechanically
   * jammed real servo drawing stall current) is what actually damages
   * a servo, not the angle it's commanded to. */
  maxCurrentAmps: number;
}

export interface ServoInput {
  /** The power/ground branch's real solved current. */
  currentAmps: number;
  /**
   * Simulated pulse width in microseconds (ADR 0039) — this simulator's
   * chip emulation has no PWM/timer hardware, so there's no way to sense
   * a real duty cycle from running code; the human provides the exact
   * signal parameter a real servo responds to instead of an abstracted
   * angle, the same "the human supplies what this simulator can't
   * sense" shape every environmental sensor already uses.
   */
  pulseWidthMicroseconds: number;
}

export interface ServoVisual extends VisualState {
  angleDegrees: number;
}

function validateParams(params: ServoParams): void {
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

function validatePulseWidth(pulseWidthMicroseconds: number): void {
  if (!(
    pulseWidthMicroseconds >= SERVO_MIN_PULSE_MICROSECONDS &&
    pulseWidthMicroseconds <= SERVO_MAX_PULSE_MICROSECONDS
  )) {
    throw new RangeError(
      `pulseWidthMicroseconds must be between ${SERVO_MIN_PULSE_MICROSECONDS} and ${SERVO_MAX_PULSE_MICROSECONDS}`
    );
  }
}

/** The linear pulse-width-to-angle mapping researched in ADR 0039. */
export function servoAngleFromPulseWidth(pulseWidthMicroseconds: number): number {
  validatePulseWidth(pulseWidthMicroseconds);
  return (
    ((pulseWidthMicroseconds - SERVO_MIN_PULSE_MICROSECONDS) /
      (SERVO_MAX_PULSE_MICROSECONDS - SERVO_MIN_PULSE_MICROSECONDS)) *
    180
  );
}

/**
 * A servo's real failure mode is overcurrent on its power leads (a
 * mechanically stalled or overloaded motor draws excess current) — not
 * anything to do with the angle it's commanded to, which this
 * simulator can't damage the part with.
 */
export function evaluateServo(
  params: ServoParams,
  input: ServoInput,
  previous: PreviousComponentState
): EvaluationResult<ServoVisual> {
  validateParams(params);

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.currentAmps,
    maxValue: params.maxCurrentAmps,
    stressedThreshold: params.ratedCurrentAmps,
    failureReason: `current ${(input.currentAmps * 1000).toFixed(1)}mA exceeds max rating ${(params.maxCurrentAmps * 1000).toFixed(1)}mA`,
  });

  const angleDegrees = servoAngleFromPulseWidth(input.pulseWidthMicroseconds);
  return { visual: { health, angleDegrees }, health };
}

/** How a servo's power/ground branch presents itself to the series-loop
 * solver: a fixed resistance derived from its rated voltage/current, an
 * open circuit once its own overcurrent has failed it — the same shape
 * `buzzerSeriesElement`/`dcMotorSeriesElement` already use. */
export function servoSeriesElement(
  params: ServoParams,
  health: HealthState
): SeriesLoopElementDescriptor {
  validateParams(params);
  if (health.status === "failed") {
    return { kind: "resistive", resistanceOhms: Infinity };
  }
  return {
    kind: "resistive",
    resistanceOhms: params.ratedVoltageVolts / params.ratedCurrentAmps,
  };
}

export const servoModel: ElectricalModel<ServoParams, ServoInput, ServoVisual> = {
  type: "servo",
  evaluate: evaluateServo,
};
