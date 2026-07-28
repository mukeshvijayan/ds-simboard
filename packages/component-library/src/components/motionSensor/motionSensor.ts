import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export type MotionSensorParams = Record<string, never>;

export interface MotionSensorInput {
  /**
   * Whether the sensor currently detects motion — there's no real motion
   * to sense on a breadboard simulator, so this is a user-toggled
   * stand-in, the same "the human provides the input this simulator
   * can't sense" shape as a pushbutton's `pressed` flag or an LDR's
   * simulated light level.
   */
  motionDetected: boolean;
}

export interface MotionSensorVisual extends VisualState {
  motionDetected: boolean;
}

/**
 * A PIR motion sensor has no failure mode of its own in this simulator —
 * it's a passive digital switch, the same as a pushbutton. `evaluate`
 * always reports nominal health.
 */
export function evaluateMotionSensor(
  _params: MotionSensorParams,
  input: MotionSensorInput,
  _previous: PreviousComponentState
): EvaluationResult<MotionSensorVisual> {
  return {
    visual: { health: NOMINAL_HEALTH, motionDetected: input.motionDetected },
    health: NOMINAL_HEALTH,
  };
}

/** How a PIR sensor presents itself to the series-loop solver: an ideal
 * closed (0Ω) circuit when it detects motion, open (∞Ω) otherwise — the
 * same shape as a pushbutton's contact. */
export function motionSensorSeriesElement(
  motionDetected: boolean
): SeriesLoopElementDescriptor {
  return { kind: "resistive", resistanceOhms: motionDetected ? 0 : Infinity };
}

export const motionSensorModel: ElectricalModel<
  MotionSensorParams,
  MotionSensorInput,
  MotionSensorVisual
> = {
  type: "motionSensor",
  evaluate: evaluateMotionSensor,
};
