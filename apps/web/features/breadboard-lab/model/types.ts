import type { HoleAddress } from "@ds-simboard/circuit-engine";
import type {
  DiodeParams,
  HealthState,
  LedParams,
  PotentiometerParams,
  PushbuttonParams,
  ResistorParams,
} from "@ds-simboard/component-library";

/**
 * The parts placeable on the Breadboard Lab canvas in v1. Two of
 * component-library's 7 parts are deliberately excluded — see
 * docs/architecture/0006-*.md:
 * - `transistor`: a 3-terminal device; this feature's `CircuitGraph` only
 *   models 2-terminal elements.
 * - `capacitor`: its `ElectricalModel` needs a real elapsed-time input
 *   (`deltaTimeSeconds`) to do anything meaningful (the RC charge curve),
 *   and there's no time-stepped simulation loop built yet.
 * Both components' `ElectricalModel`s exist and are fully tested in
 * `@ds-simboard/component-library` already; they just aren't wireable on
 * this canvas yet.
 */
export type BreadboardComponentType =
  "resistor" | "led" | "diode" | "pushbutton" | "potentiometer";

interface BaseComponent {
  id: string;
  /** The two holes this component's leads are plugged into. */
  leads: [HoleAddress, HoleAddress];
  health: HealthState;
}

export interface PlacedResistor extends BaseComponent {
  type: "resistor";
  params: ResistorParams;
}

export interface PlacedLed extends BaseComponent {
  type: "led";
  params: LedParams;
  leadZeroIsPositive: boolean;
}

export interface PlacedDiode extends BaseComponent {
  type: "diode";
  params: DiodeParams;
  leadZeroIsPositive: boolean;
}

export interface PlacedPushbutton extends BaseComponent {
  type: "pushbutton";
  params: PushbuttonParams;
  pressed: boolean;
}

export interface PlacedPotentiometer extends BaseComponent {
  type: "potentiometer";
  params: PotentiometerParams;
  /** 0 to 1. */
  wiperPosition: number;
}

export type PlacedComponent =
  PlacedResistor | PlacedLed | PlacedDiode | PlacedPushbutton | PlacedPotentiometer;

/** A user-drawn wire directly connecting two holes. */
export interface Wire {
  id: string;
  from: HoleAddress;
  to: HoleAddress;
}
