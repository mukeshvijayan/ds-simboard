import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface SolarPanelParams {
  /** Resistance in full sunlight, e.g. 20 (a small panel loaded near its
   * rated output). */
  minResistanceOhms: number;
  /** Resistance in full darkness — effectively an open circuit, no
   * generated current at all. */
  maxResistanceOhms: number;
}

export interface SolarPanelInput {
  /**
   * Simulated sunlight level, 0 (dark) to 1 (full sun) — same "the
   * human provides the input this simulator can't sense" shape as an
   * LDR's simulated light level.
   *
   * A real solar panel is a genuine independent voltage/current source,
   * not a variable resistor — modeled here as a light-gated resistance
   * *riding the board's one real supply* (ADR 0016) rather than as its
   * own independent source, a deliberate simplification (docs/
   * architecture/0038-*.md) to stay inside the single-source-of-truth
   * boundary battery holder already established, not a claim that a
   * solar panel "really is" a resistor.
   */
  sunlightLevel: number;
}

export interface SolarPanelVisual extends VisualState {
  effectiveResistanceOhms: number;
}

function validateParams(params: SolarPanelParams): void {
  if (!(params.minResistanceOhms >= 0)) {
    throw new RangeError("minResistanceOhms must be >= 0");
  }
  if (!(params.maxResistanceOhms > params.minResistanceOhms)) {
    throw new RangeError("maxResistanceOhms must be > minResistanceOhms");
  }
}

function validateSunlightLevel(sunlightLevel: number): void {
  if (!(sunlightLevel >= 0 && sunlightLevel <= 1)) {
    throw new RangeError("sunlightLevel must be between 0 and 1");
  }
}

/** The resistance a solar panel presents at a given simulated sunlight
 * level — full sun is its low-resistance floor, darkness is its
 * effectively-open ceiling (the same interpolation shape as an LDR, just
 * with the direction that matches "more light, more current"). */
export function effectiveSolarPanelResistance(
  params: SolarPanelParams,
  sunlightLevel: number
): number {
  validateParams(params);
  validateSunlightLevel(sunlightLevel);
  return (
    params.maxResistanceOhms -
    sunlightLevel * (params.maxResistanceOhms - params.minResistanceOhms)
  );
}

/** A solar panel has no failure mode of its own in this simulator — same
 * reasoning as an LDR. */
export function evaluateSolarPanel(
  params: SolarPanelParams,
  input: SolarPanelInput,
  _previous: PreviousComponentState
): EvaluationResult<SolarPanelVisual> {
  const effectiveResistanceOhms = effectiveSolarPanelResistance(
    params,
    input.sunlightLevel
  );
  return {
    visual: { health: NOMINAL_HEALTH, effectiveResistanceOhms },
    health: NOMINAL_HEALTH,
  };
}

export function solarPanelSeriesElement(
  params: SolarPanelParams,
  sunlightLevel: number
): SeriesLoopElementDescriptor {
  return {
    kind: "resistive",
    resistanceOhms: effectiveSolarPanelResistance(params, sunlightLevel),
  };
}

export const solarPanelModel: ElectricalModel<
  SolarPanelParams,
  SolarPanelInput,
  SolarPanelVisual
> = {
  type: "solarPanel",
  evaluate: evaluateSolarPanel,
};
