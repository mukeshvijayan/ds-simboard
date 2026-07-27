import { NOMINAL_HEALTH } from "@ds-simboard/component-library";
import type { BreadboardComponentType } from "./model/types";

/** Kept small deliberately — enough columns for a handful of real
 * components without the grid becoming unwieldy on a phase-4-scoped UI. */
export const BREADBOARD_COLUMNS = 20;

export const DEFAULT_SUPPLY_VOLTAGE = 5;

export const PART_LABELS: Record<BreadboardComponentType, string> = {
  resistor: "Resistor",
  led: "LED",
  diode: "Diode",
  pushbutton: "Pushbutton",
  potentiometer: "Potentiometer",
};

export const DEFAULT_PARAMS = {
  resistor: { resistanceOhms: 220, ratedPowerWatts: 0.25 },
  led: { forwardVoltageVolts: 2, ratedCurrentAmps: 0.02, maxCurrentAmps: 0.03 },
  diode: { forwardVoltageVolts: 0.7, reverseBreakdownVoltageVolts: 1000 },
  pushbutton: { isMomentary: true },
  potentiometer: { totalResistanceOhms: 10_000, ratedPowerWatts: 0.2 },
} as const;

export { NOMINAL_HEALTH };
