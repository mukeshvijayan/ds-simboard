import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface TransistorParams {
  /** Typical Si BJT base-emitter drop, ~0.7V. */
  baseEmitterVoltageDropVolts: number;
  /** Minimum base current that saturates the switch fully on. */
  baseThresholdCurrentAmps: number;
  /** Collector-emitter resistance once saturated — small, e.g. 1-10Ω. */
  onResistanceOhms: number;
  maxCollectorCurrentAmps: number;
}

export interface TransistorInput {
  baseCurrentAmps: number;
  collectorCurrentAmps: number;
}

export interface TransistorVisual extends VisualState {
  isOn: boolean;
  collectorCurrentAmps: number;
}

function validateParams(params: TransistorParams): void {
  if (!(params.baseEmitterVoltageDropVolts >= 0)) {
    throw new RangeError("baseEmitterVoltageDropVolts must be >= 0");
  }
  if (!(params.baseThresholdCurrentAmps > 0)) {
    throw new RangeError("baseThresholdCurrentAmps must be > 0");
  }
  if (!(params.onResistanceOhms > 0)) {
    throw new RangeError("onResistanceOhms must be > 0");
  }
  if (!(params.maxCollectorCurrentAmps > 0)) {
    throw new RangeError("maxCollectorCurrentAmps must be > 0");
  }
}

function validateInput(input: TransistorInput): void {
  if (!(input.baseCurrentAmps >= 0)) {
    throw new RangeError("baseCurrentAmps must be >= 0");
  }
  if (!(input.collectorCurrentAmps >= 0)) {
    throw new RangeError("collectorCurrentAmps must be >= 0");
  }
}

/**
 * Whether enough base current is flowing to saturate the switch fully
 * on — the decision the graph-building layer needs *before* it knows
 * what resistance to give the collector-emitter branch for its second,
 * final solve. See docs/architecture/0026-*.md's two-phase resolve.
 */
export function transistorIsOn(
  params: TransistorParams,
  baseCurrentAmps: number
): boolean {
  return baseCurrentAmps >= params.baseThresholdCurrentAmps;
}

/**
 * A BJT modeled purely as a current-controlled switch (spec Part 2.2,
 * "transistor as a switch" — not the amplifier/linear region): base
 * current above `baseThresholdCurrentAmps` saturates it into a small
 * `onResistanceOhms` collector-emitter path; below it, that path is open.
 * `collectorCurrentAmps` is never derived here — it's whatever the
 * general MNA solver actually found once the graph is re-solved with
 * that decision baked in, never a scripted stand-in.
 */
export function evaluateTransistor(
  params: TransistorParams,
  input: TransistorInput,
  previous: PreviousComponentState
): EvaluationResult<TransistorVisual> {
  validateParams(params);
  validateInput(input);

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.collectorCurrentAmps,
    maxValue: params.maxCollectorCurrentAmps,
    failureReason: `collector current ${(input.collectorCurrentAmps * 1000).toFixed(1)}mA exceeds max rating ${(params.maxCollectorCurrentAmps * 1000).toFixed(1)}mA`,
  });

  const isOn =
    health.status === "failed" ? false : transistorIsOn(params, input.baseCurrentAmps);

  return {
    visual: {
      health,
      isOn,
      collectorCurrentAmps: health.status === "failed" ? 0 : input.collectorCurrentAmps,
    },
    health,
  };
}

export const transistorModel: ElectricalModel<
  TransistorParams,
  TransistorInput,
  TransistorVisual
> = {
  type: "transistor",
  evaluate: evaluateTransistor,
};
