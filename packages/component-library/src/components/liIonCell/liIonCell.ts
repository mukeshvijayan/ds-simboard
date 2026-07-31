import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export type LiIonCellParams = Record<string, never>;

export interface LiIonCellInput {
  /** The board's actual configured supply voltage — same "transparent,
   * reads the one real supply" treatment `batteryHolderModel` already
   * gets (ADR 0016), applied to a Li-ion/LiPo cell instead of a AA
   * holder. See docs/architecture/0038-*.md: this is the existing
   * battery-holder decision applied to a different-looking battery, not
   * a new independent power source. */
  supplyVoltageVolts: number;
}

export interface LiIonCellVisual extends VisualState {
  suppliedVoltageVolts: number;
}

/** A Li-ion/LiPo cell has no failure mode of its own in this simulator —
 * same reasoning as `batteryHolderModel`. */
export function evaluateLiIonCell(
  _params: LiIonCellParams,
  input: LiIonCellInput,
  _previous: PreviousComponentState
): EvaluationResult<LiIonCellVisual> {
  return {
    visual: { health: NOMINAL_HEALTH, suppliedVoltageVolts: input.supplyVoltageVolts },
    health: NOMINAL_HEALTH,
  };
}

/** A perfect (0Ω) connection — doesn't add its own EMF, see
 * `evaluateLiIonCell`'s doc comment. */
export function liIonCellSeriesElement(): SeriesLoopElementDescriptor {
  return { kind: "resistive", resistanceOhms: 0 };
}

export const liIonCellModel: ElectricalModel<
  LiIonCellParams,
  LiIonCellInput,
  LiIonCellVisual
> = {
  type: "liIonCell",
  evaluate: evaluateLiIonCell,
};
