import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  HealthState,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface DiodeParams {
  forwardVoltageVolts: number;
  reverseBreakdownVoltageVolts: number;
}

/**
 * Which way the diode is currently biased. This is a wiring-orientation
 * fact (how the user placed it relative to current flow), not something
 * solved from current/voltage — so it's an input, not a computed output.
 */
export type DiodeInput =
  | { biased: "forward"; currentAmps: number }
  | { biased: "reverse"; voltageVolts: number };

export interface DiodeVisual extends VisualState {
  isConducting: boolean;
  isReverseBiased: boolean;
}

/**
 * Spec Part 2.3: reverse bias below breakdown is normal operation (the
 * diode's whole job) — it blocks current but isn't damaged. Only exceeding
 * the reverse breakdown voltage is a failure.
 */
export function evaluateDiode(
  params: DiodeParams,
  input: DiodeInput,
  previous: PreviousComponentState
): EvaluationResult<DiodeVisual> {
  if (input.biased === "forward") {
    const health: HealthState =
      previous.health.status === "failed" ? previous.health : NOMINAL_HEALTH;
    return { visual: { health, isConducting: true, isReverseBiased: false }, health };
  }

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.voltageVolts,
    maxValue: params.reverseBreakdownVoltageVolts,
    failureReason: `reverse voltage ${Math.abs(input.voltageVolts).toFixed(1)}V exceeds breakdown rating ${params.reverseBreakdownVoltageVolts}V`,
  });
  return { visual: { health, isConducting: false, isReverseBiased: true }, health };
}

/**
 * How a diode presents itself to the series-loop solver: a fixed voltage
 * drop when forward-biased, an open circuit when safely reverse-biased
 * (it's blocking, as designed), or a short once failed — avalanche/Zener
 * breakdown is commonly a catastrophic short in real rectifier diodes.
 */
export function diodeSeriesElement(
  params: DiodeParams,
  biased: "forward" | "reverse",
  health: HealthState
): SeriesLoopElementDescriptor {
  if (health.status === "failed") {
    return { kind: "resistive", resistanceOhms: 0 };
  }
  if (biased === "forward") {
    return { kind: "fixed-drop", forwardVoltageVolts: params.forwardVoltageVolts };
  }
  return { kind: "resistive", resistanceOhms: Infinity };
}

export const diodeModel: ElectricalModel<DiodeParams, DiodeInput, DiodeVisual> = {
  type: "diode",
  evaluate: evaluateDiode,
};
