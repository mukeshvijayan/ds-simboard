import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { NOMINAL_HEALTH } from "../../contract/types";
import {
  ElectricalModel,
  EvaluationResult,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface PushbuttonParams {
  isMomentary: boolean;
}

export interface PushbuttonInput {
  pressed: boolean;
}

export interface PushbuttonVisual extends VisualState {
  isClosed: boolean;
}

/**
 * A pushbutton/switch has no over-current, reverse-polarity, or
 * short-circuit failure mode of its own in spec Part 2.3 — it's a pure
 * open/closed contact. `evaluate` always reports nominal health; there's
 * currently no path that could set it otherwise, so there's nothing to
 * latch.
 */
export function evaluatePushbutton(
  _params: PushbuttonParams,
  input: PushbuttonInput,
  _previous: PreviousComponentState
): EvaluationResult<PushbuttonVisual> {
  return {
    visual: { health: NOMINAL_HEALTH, isClosed: input.pressed },
    health: NOMINAL_HEALTH,
  };
}

/** How a pushbutton presents itself to the series-loop solver: an ideal
 * closed (0Ω) or open (∞Ω) switch. */
export function pushbuttonSeriesElement(pressed: boolean): SeriesLoopElementDescriptor {
  return { kind: "resistive", resistanceOhms: pressed ? 0 : Infinity };
}

export const pushbuttonModel: ElectricalModel<
  PushbuttonParams,
  PushbuttonInput,
  PushbuttonVisual
> = {
  type: "pushbutton",
  evaluate: evaluatePushbutton,
};
