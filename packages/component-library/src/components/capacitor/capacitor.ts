import {
  applyMagnitudeThresholdHealth,
  applyReversePolarityHealth,
} from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface CapacitorParams {
  capacitanceFarads: number;
  /** Electrolytic (true) capacitors are damaged by reverse voltage; ceramic (false) are not. */
  polarized: boolean;
  ratedVoltageVolts: number;
}

export interface CapacitorInput {
  /** The voltage the surrounding circuit is presenting across this
   * capacitor's terminals right now — positive means charging toward the
   * capacitor's marked polarity, negative means the reverse. */
  appliedVoltageVolts: number;
  seriesResistanceOhms: number;
  deltaTimeSeconds: number;
}

export interface CapacitorState {
  storedVoltageVolts: number;
}

export interface CapacitorVisual extends VisualState {
  storedVoltageVolts: number;
  /** 0 (empty) to 1 (charged to its rated voltage). */
  chargeRatio: number;
}

function validateParams(params: CapacitorParams): void {
  if (!(params.capacitanceFarads > 0)) {
    throw new RangeError("capacitanceFarads must be > 0");
  }
  if (!(params.ratedVoltageVolts > 0)) {
    throw new RangeError("ratedVoltageVolts must be > 0");
  }
}

function validateInput(input: CapacitorInput): void {
  if (!(input.seriesResistanceOhms >= 0)) {
    throw new RangeError("seriesResistanceOhms must be >= 0");
  }
  if (!(input.deltaTimeSeconds >= 0)) {
    throw new RangeError("deltaTimeSeconds must be >= 0");
  }
}

/**
 * The exact solution of the RC charge/discharge curve
 * (`V(t) = V0 + (Vinitial - V0)·e^(-t/RC)`, spec Part 2.2) for one
 * simulation tick, rather than a discrete Euler step — this avoids
 * numerical instability if `deltaTimeSeconds` is large relative to `RC`,
 * and handles both charging and discharging with one formula since the
 * "target" is just whatever `appliedVoltageVolts` is this tick.
 */
function nextStoredVoltage(
  previousStoredVoltage: number,
  appliedVoltageVolts: number,
  seriesResistanceOhms: number,
  capacitanceFarads: number,
  deltaTimeSeconds: number
): number {
  if (deltaTimeSeconds === 0) {
    return previousStoredVoltage;
  }
  const timeConstantSeconds = seriesResistanceOhms * capacitanceFarads;
  const decay = Math.exp(-deltaTimeSeconds / timeConstantSeconds);
  return appliedVoltageVolts + (previousStoredVoltage - appliedVoltageVolts) * decay;
}

export function evaluateCapacitor(
  params: CapacitorParams,
  input: CapacitorInput,
  previous: PreviousComponentState<CapacitorState>
): EvaluationResult<CapacitorVisual, CapacitorState> {
  validateParams(params);
  validateInput(input);

  const previousStoredVoltage = previous.state?.storedVoltageVolts ?? 0;
  const storedVoltageVolts = nextStoredVoltage(
    previousStoredVoltage,
    input.appliedVoltageVolts,
    input.seriesResistanceOhms,
    params.capacitanceFarads,
    input.deltaTimeSeconds
  );

  const isReverseBiased = params.polarized && storedVoltageVolts < 0;
  const afterReverseCheck = applyReversePolarityHealth({
    previousHealth: previous.health,
    isReverseBiased,
    failureReason: `reverse voltage ${Math.abs(storedVoltageVolts).toFixed(2)}V on a polarized capacitor`,
  });
  const health = applyMagnitudeThresholdHealth({
    previousHealth: afterReverseCheck,
    measuredValue: storedVoltageVolts,
    maxValue: params.ratedVoltageVolts,
    failureReason: `stored voltage ${Math.abs(storedVoltageVolts).toFixed(2)}V exceeds rated ${params.ratedVoltageVolts}V`,
  });

  const chargeRatio = Math.min(
    1,
    Math.max(0, Math.abs(storedVoltageVolts) / params.ratedVoltageVolts)
  );

  return {
    visual: { health, storedVoltageVolts, chargeRatio },
    health,
    state: { storedVoltageVolts },
  };
}

export const capacitorModel: ElectricalModel<
  CapacitorParams,
  CapacitorInput,
  CapacitorVisual,
  CapacitorState
> = {
  type: "capacitor",
  evaluate: evaluateCapacitor,
};
