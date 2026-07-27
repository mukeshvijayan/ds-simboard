import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface ResistorParams {
  resistanceOhms: number;
  /** Rated power dissipation, e.g. 0.25 for a common 1/4W resistor. */
  ratedPowerWatts: number;
}

export interface ResistorInput {
  currentAmps: number;
}

export interface ResistorVisual extends VisualState {
  powerDissipationWatts: number;
}

function validateParams(params: ResistorParams): void {
  if (!(params.resistanceOhms >= 0)) {
    throw new RangeError("resistanceOhms must be >= 0");
  }
  if (!(params.ratedPowerWatts > 0)) {
    throw new RangeError("ratedPowerWatts must be > 0");
  }
}

/** P = I²R. */
function powerDissipationWatts(currentAmps: number, resistanceOhms: number): number {
  return currentAmps * currentAmps * resistanceOhms;
}

export function evaluateResistor(
  params: ResistorParams,
  input: ResistorInput,
  previous: PreviousComponentState
): EvaluationResult<ResistorVisual> {
  validateParams(params);

  const powerWatts = powerDissipationWatts(input.currentAmps, params.resistanceOhms);
  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: powerWatts,
    maxValue: params.ratedPowerWatts,
    stressedThreshold: params.ratedPowerWatts * 0.8,
    failureReason: `power dissipation ${powerWatts.toFixed(3)}W exceeds rated ${params.ratedPowerWatts}W`,
  });

  return { visual: { health, powerDissipationWatts: powerWatts }, health };
}

/** How a resistor presents itself to the series-loop solver: its fixed value, unconditionally. */
export function resistorSeriesElement(
  params: ResistorParams
): SeriesLoopElementDescriptor {
  validateParams(params);
  return { kind: "resistive", resistanceOhms: params.resistanceOhms };
}

export const resistorModel: ElectricalModel<
  ResistorParams,
  ResistorInput,
  ResistorVisual
> = {
  type: "resistor",
  evaluate: evaluateResistor,
};
