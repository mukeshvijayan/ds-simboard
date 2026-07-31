import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface InductorParams {
  /** Every real inductor's winding has some DC resistance — this solver
   * has no time domain (docs/architecture/0038-*.md), so this is the
   * whole of what an inductor presents electrically here: its real DC
   * behavior, just not its reactive one. */
  dcResistanceOhms: number;
  ratedCurrentAmps: number;
}

export interface InductorInput {
  currentAmps: number;
}

export type InductorVisual = VisualState;

function validateParams(params: InductorParams): void {
  if (!(params.dcResistanceOhms >= 0)) {
    throw new RangeError("dcResistanceOhms must be >= 0");
  }
  if (!(params.ratedCurrentAmps > 0)) {
    throw new RangeError("ratedCurrentAmps must be > 0");
  }
}

/**
 * An inductor's own failure mode here is core saturation/winding
 * overheat past its rated current — the same overcurrent shape every
 * other current-limited part uses, not a new kind of damage.
 */
export function evaluateInductor(
  params: InductorParams,
  input: InductorInput,
  previous: PreviousComponentState
): EvaluationResult<InductorVisual> {
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

/** How an inductor presents itself to the series-loop solver: its fixed
 * DC winding resistance, unconditionally (same as a resistor — a failed
 * inductor here is flagged, not opened, since real winding failures can
 * go either way and there's no reliable single behavior to prefer). */
export function inductorSeriesElement(
  params: InductorParams
): SeriesLoopElementDescriptor {
  validateParams(params);
  return { kind: "resistive", resistanceOhms: params.dcResistanceOhms };
}

export const inductorModel: ElectricalModel<
  InductorParams,
  InductorInput,
  InductorVisual
> = {
  type: "inductor",
  evaluate: evaluateInductor,
};
