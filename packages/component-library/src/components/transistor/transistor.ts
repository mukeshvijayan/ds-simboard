import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  ElectricalModel,
  EvaluationResult,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface TransistorParams {
  polarity: "NPN" | "PNP";
  /** Current gain (β). */
  hFE: number;
  /** Saturation voltage between collector and emitter. */
  vceSatVolts: number;
  maxCollectorCurrentAmps: number;
}

export interface TransistorInput {
  baseCurrentAmps: number;
  supplyVoltageVolts: number;
  collectorResistanceOhms: number;
}

export interface TransistorVisual extends VisualState {
  collectorCurrentAmps: number;
  isConducting: boolean;
  /** True when the base is asking for more current than the collector
   * circuit can supply — the textbook "transistor as a switch" region. */
  isSaturated: boolean;
}

function validateParams(params: TransistorParams): void {
  if (!(params.hFE > 0)) {
    throw new RangeError("hFE must be > 0");
  }
  if (!(params.vceSatVolts >= 0)) {
    throw new RangeError("vceSatVolts must be >= 0");
  }
  if (!(params.maxCollectorCurrentAmps > 0)) {
    throw new RangeError("maxCollectorCurrentAmps must be > 0");
  }
}

function validateInput(input: TransistorInput): void {
  if (!(input.baseCurrentAmps >= 0)) {
    throw new RangeError("baseCurrentAmps must be >= 0");
  }
  if (!(input.supplyVoltageVolts >= 0)) {
    throw new RangeError("supplyVoltageVolts must be >= 0");
  }
  if (!(input.collectorResistanceOhms > 0)) {
    throw new RangeError("collectorResistanceOhms must be > 0");
  }
}

/**
 * Models a BJT as a current-controlled switch/amplifier (spec Part 2.2):
 * the collector current is whichever is smaller of (a) the amplified base
 * current (`hFE × Ib`, the "amplifier region" answer) and (b) whatever the
 * external collector circuit can actually supply once the transistor is
 * fully on (`(Vsupply − VceSat) / Rc`, the "saturation region" ceiling) —
 * this is the standard textbook analysis for a transistor switch.
 *
 * This is a 3-terminal device (base, collector, emitter). `circuit-engine`'s
 * `CircuitGraph`/series-loop solver only models 2-terminal elements, so
 * this component's inputs are given directly rather than derived by
 * walking a graph — how a 3-terminal device fits the graph model at all is
 * an open question for whichever later phase needs to wire a transistor
 * into a user-built circuit, not decided here.
 */
export function evaluateTransistor(
  params: TransistorParams,
  input: TransistorInput,
  previous: PreviousComponentState
): EvaluationResult<TransistorVisual> {
  validateParams(params);
  validateInput(input);

  const idealCurrentAmps = params.hFE * input.baseCurrentAmps;
  const saturationCurrentAmps = Math.max(
    0,
    (input.supplyVoltageVolts - params.vceSatVolts) / input.collectorResistanceOhms
  );
  const collectorCurrentAmps = Math.min(idealCurrentAmps, saturationCurrentAmps);
  const isSaturated = idealCurrentAmps > saturationCurrentAmps;

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: collectorCurrentAmps,
    maxValue: params.maxCollectorCurrentAmps,
    failureReason: `collector current ${(collectorCurrentAmps * 1000).toFixed(1)}mA exceeds max rating ${(params.maxCollectorCurrentAmps * 1000).toFixed(1)}mA`,
  });

  return {
    visual: {
      health,
      collectorCurrentAmps,
      isConducting: collectorCurrentAmps > 0,
      isSaturated,
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
