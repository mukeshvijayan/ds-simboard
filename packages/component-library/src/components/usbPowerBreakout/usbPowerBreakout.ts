import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export type UsbPowerBreakoutParams = Record<string, never>;

export interface UsbPowerBreakoutInput {
  /** Same transparent, reads-the-one-real-supply treatment as
   * `batteryHolderModel`/`liIonCellModel` (ADR 0016, ADR 0038) — a USB
   * breakout is a labeled "power enters here" visual, not a second,
   * independent 5V source. */
  supplyVoltageVolts: number;
}

export interface UsbPowerBreakoutVisual extends VisualState {
  suppliedVoltageVolts: number;
}

export function evaluateUsbPowerBreakout(
  _params: UsbPowerBreakoutParams,
  input: UsbPowerBreakoutInput,
  _previous: PreviousComponentState
): EvaluationResult<UsbPowerBreakoutVisual> {
  return {
    visual: { health: NOMINAL_HEALTH, suppliedVoltageVolts: input.supplyVoltageVolts },
    health: NOMINAL_HEALTH,
  };
}

export function usbPowerBreakoutSeriesElement(): SeriesLoopElementDescriptor {
  return { kind: "resistive", resistanceOhms: 0 };
}

export const usbPowerBreakoutModel: ElectricalModel<
  UsbPowerBreakoutParams,
  UsbPowerBreakoutInput,
  UsbPowerBreakoutVisual
> = {
  type: "usbPowerBreakout",
  evaluate: evaluateUsbPowerBreakout,
};
