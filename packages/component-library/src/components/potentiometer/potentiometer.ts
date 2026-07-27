import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface PotentiometerParams {
  /** Full end-to-end resistance, e.g. 10_000 for a common 10kΩ pot. */
  totalResistanceOhms: number;
  ratedPowerWatts: number;
}

export interface PotentiometerInput {
  /** Wiper position from 0 (0Ω) to 1 (full resistance) — a linear taper. */
  wiperPosition: number;
  currentAmps: number;
}

export interface PotentiometerVisual extends VisualState {
  effectiveResistanceOhms: number;
  powerDissipationWatts: number;
}

function validateParams(params: PotentiometerParams): void {
  if (!(params.totalResistanceOhms >= 0)) {
    throw new RangeError("totalResistanceOhms must be >= 0");
  }
  if (!(params.ratedPowerWatts > 0)) {
    throw new RangeError("ratedPowerWatts must be > 0");
  }
}

function validateWiperPosition(wiperPosition: number): void {
  if (!(wiperPosition >= 0 && wiperPosition <= 1)) {
    throw new RangeError("wiperPosition must be between 0 and 1");
  }
}

/** The resistance a linear-taper pot presents at a given wiper position. */
export function effectiveResistance(
  params: PotentiometerParams,
  wiperPosition: number
): number {
  validateParams(params);
  validateWiperPosition(wiperPosition);
  return params.totalResistanceOhms * wiperPosition;
}

export function evaluatePotentiometer(
  params: PotentiometerParams,
  input: PotentiometerInput,
  previous: PreviousComponentState
): EvaluationResult<PotentiometerVisual> {
  const resistanceOhms = effectiveResistance(params, input.wiperPosition);
  const powerWatts = input.currentAmps * input.currentAmps * resistanceOhms;

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: powerWatts,
    maxValue: params.ratedPowerWatts,
    stressedThreshold: params.ratedPowerWatts * 0.8,
    failureReason: `power dissipation ${powerWatts.toFixed(3)}W exceeds rated ${params.ratedPowerWatts}W`,
  });

  return {
    visual: {
      health,
      effectiveResistanceOhms: resistanceOhms,
      powerDissipationWatts: powerWatts,
    },
    health,
  };
}

/** How a potentiometer presents itself to the series-loop solver: its
 * current wiper-derived resistance. A failed pot still reports this value
 * in v1 — health is a UI warning here, not a change in circuit behavior;
 * real overloaded-pot failure modes (open, resistance drift) are more
 * varied than this simulator models yet. */
export function potentiometerSeriesElement(
  params: PotentiometerParams,
  wiperPosition: number
): SeriesLoopElementDescriptor {
  return {
    kind: "resistive",
    resistanceOhms: effectiveResistance(params, wiperPosition),
  };
}

export const potentiometerModel: ElectricalModel<
  PotentiometerParams,
  PotentiometerInput,
  PotentiometerVisual
> = {
  type: "potentiometer",
  evaluate: evaluatePotentiometer,
};
