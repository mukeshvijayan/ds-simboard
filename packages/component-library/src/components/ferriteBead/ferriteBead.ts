import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface FerriteBeadParams {
  dcResistanceOhms: number;
  ratedCurrentAmps: number;
}

export interface FerriteBeadInput {
  currentAmps: number;
}

export type FerriteBeadVisual = VisualState;

function validateParams(params: FerriteBeadParams): void {
  if (!(params.dcResistanceOhms >= 0)) {
    throw new RangeError("dcResistanceOhms must be >= 0");
  }
  if (!(params.ratedCurrentAmps > 0)) {
    throw new RangeError("ratedCurrentAmps must be > 0");
  }
}

/**
 * A ferrite bead's real job — suppressing high-frequency noise — has no
 * representation in a DC-only solver (docs/architecture/0038-*.md): here
 * it's electrically indistinguishable from a very-low-value resistor.
 * Built anyway for the pedagogical value of recognizing the part and its
 * current rating, not for demonstrating what it does — a documented,
 * open limitation, not a silent one.
 */
export function evaluateFerriteBead(
  params: FerriteBeadParams,
  input: FerriteBeadInput,
  previous: PreviousComponentState
): EvaluationResult<FerriteBeadVisual> {
  validateParams(params);
  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.currentAmps,
    maxValue: params.ratedCurrentAmps,
    stressedThreshold: params.ratedCurrentAmps * 0.8,
    failureReason: `current ${Math.abs(input.currentAmps).toFixed(2)}A exceeds rated ${params.ratedCurrentAmps}A`,
  });
  return { visual: { health }, health };
}

export function ferriteBeadSeriesElement(
  params: FerriteBeadParams
): SeriesLoopElementDescriptor {
  validateParams(params);
  return { kind: "resistive", resistanceOhms: params.dcResistanceOhms };
}

export const ferriteBeadModel: ElectricalModel<
  FerriteBeadParams,
  FerriteBeadInput,
  FerriteBeadVisual
> = {
  type: "ferriteBead",
  evaluate: evaluateFerriteBead,
};
