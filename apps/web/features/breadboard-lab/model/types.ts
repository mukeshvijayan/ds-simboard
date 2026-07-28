import type { HoleAddress } from "@ds-simboard/circuit-engine";
import type {
  BatteryHolderParams,
  BuzzerParams,
  DcMotorParams,
  Dht11Params,
  DiodeParams,
  HealthState,
  LdrParams,
  LedParams,
  MotionSensorParams,
  PotentiometerParams,
  PushbuttonParams,
  RainSensorParams,
  ResistorParams,
  SoilMoistureSensorParams,
  SoundSensorParams,
} from "@ds-simboard/component-library";

/**
 * The parts placeable on the Breadboard Lab canvas. Two of
 * component-library's parts are deliberately excluded — see
 * docs/architecture/0006-*.md:
 * - `transistor`: a 3-terminal device; this feature's `CircuitGraph` only
 *   models 2-terminal elements.
 * - `capacitor`: its `ElectricalModel` needs a real elapsed-time input
 *   (`deltaTimeSeconds`) to do anything meaningful (the RC charge curve),
 *   and there's no time-stepped simulation loop built yet.
 * Both components' `ElectricalModel`s exist and are fully tested in
 * `@ds-simboard/component-library` already; they just aren't wireable on
 * this canvas yet.
 *
 * `toggleSwitch` isn't a separate electrical model — it's a `pushbutton`
 * placed with `params.isMomentary: false` (see docs/architecture/0006-*.md's
 * existing `PushbuttonParams.isMomentary` field), exposed as its own
 * palette entry since "a switch you flip and it stays" and "a button you
 * hold" are different real parts to a student even though they share one
 * model. Same for the resistor value presets (`resistor220`/etc.) and the
 * LED colors below — all `resistor`/`led` under the hood, distinguished by
 * `DEFAULT_PARAMS`, not by a new `BreadboardComponentType`.
 */
export type BreadboardComponentType =
  | "resistor"
  | "led"
  | "diode"
  | "pushbutton"
  | "potentiometer"
  | "buzzer"
  | "dcMotor"
  | "ldr"
  | "batteryHolder"
  | "motionSensor"
  | "soilMoistureSensor"
  | "rainSensor"
  | "soundSensor"
  | "dht11";

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

export interface PlacedBuzzer extends BaseComponent {
  type: "buzzer";
  params: BuzzerParams;
}

export interface PlacedDcMotor extends BaseComponent {
  type: "dcMotor";
  params: DcMotorParams;
}

export interface PlacedLdr extends BaseComponent {
  type: "ldr";
  params: LdrParams;
  /** Simulated ambient light level, 0 (dark) to 1 (bright) — user-adjustable. */
  lightLevel: number;
}

export interface PlacedBatteryHolder extends BaseComponent {
  type: "batteryHolder";
  params: BatteryHolderParams;
}

export interface PlacedMotionSensor extends BaseComponent {
  type: "motionSensor";
  params: MotionSensorParams;
  /** Simulated PIR trigger state — user-toggled, standing in for real motion. */
  motionDetected: boolean;
}

export interface PlacedSoilMoistureSensor extends BaseComponent {
  type: "soilMoistureSensor";
  params: SoilMoistureSensorParams;
  /** Simulated soil wetness, 0 (dry) to 1 (soaked) — user-adjustable. */
  wetness: number;
}

export interface PlacedRainSensor extends BaseComponent {
  type: "rainSensor";
  params: RainSensorParams;
  /** Simulated rainfall, 0 (dry) to 1 (heavy rain) — user-adjustable. */
  rainLevel: number;
}

export interface PlacedSoundSensor extends BaseComponent {
  type: "soundSensor";
  params: SoundSensorParams;
  /** Simulated ambient loudness, 0 (silent) to 1 (loud) — user-adjustable. */
  loudness: number;
}

export interface PlacedDht11 extends BaseComponent {
  type: "dht11";
  params: Dht11Params;
  /** Display-only simulated readings — not tied to the electrical model. */
  simulatedTemperatureCelsius: number;
  simulatedHumidityPercent: number;
}

export type PlacedComponent =
  | PlacedResistor
  | PlacedLed
  | PlacedDiode
  | PlacedPushbutton
  | PlacedPotentiometer
  | PlacedBuzzer
  | PlacedDcMotor
  | PlacedLdr
  | PlacedBatteryHolder
  | PlacedMotionSensor
  | PlacedSoilMoistureSensor
  | PlacedRainSensor
  | PlacedSoundSensor
  | PlacedDht11;

/** A user-drawn wire directly connecting two holes. */
export interface Wire {
  id: string;
  from: HoleAddress;
  to: HoleAddress;
}
