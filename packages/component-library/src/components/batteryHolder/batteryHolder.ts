import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export type BatteryHolderParams = Record<string, never>;

export interface BatteryHolderInput {
  /**
   * The board's actual configured supply voltage — passed in by the
   * caller (see docs/architecture/0016-*.md), not stored as this
   * component's own parameter, so a battery holder's display can never
   * drift out of sync with the real, single source of truth for supply
   * voltage on the board.
   */
  supplyVoltageVolts: number;
}

export interface BatteryHolderVisual extends VisualState {
  suppliedVoltageVolts: number;
}

/**
 * A battery holder has no failure mode of its own in this simulator — see
 * docs/architecture/0016-*.md for why it's modeled as a transparent
 * (zero-resistance) pass-through rather than an independent voltage
 * source: `evaluate` always reports nominal health.
 */
export function evaluateBatteryHolder(
  _params: BatteryHolderParams,
  input: BatteryHolderInput,
  _previous: PreviousComponentState
): EvaluationResult<BatteryHolderVisual> {
  return {
    visual: { health: NOMINAL_HEALTH, suppliedVoltageVolts: input.supplyVoltageVolts },
    health: NOMINAL_HEALTH,
  };
}

/**
 * How a battery holder presents itself to the series-loop solver: a
 * perfect (0Ω) connection. It doesn't add its own EMF to the loop — the
 * board's power rails already carry the real supply voltage (see
 * `circuitGraph.ts`'s `SUPPLY_ELEMENT_ID`); this component is a labeled,
 * placeable visual for where a student would plug batteries in, not a
 * second, independent power source.
 */
export function batteryHolderSeriesElement(): SeriesLoopElementDescriptor {
  return { kind: "resistive", resistanceOhms: 0 };
}

export const batteryHolderModel: ElectricalModel<
  BatteryHolderParams,
  BatteryHolderInput,
  BatteryHolderVisual
> = {
  type: "batteryHolder",
  evaluate: evaluateBatteryHolder,
};
