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
import type { ConnectionPointRef } from "./connectionPoint";

/**
 * The parts placeable on the unified canvas — carried over unchanged
 * from Breadboard Lab (docs/architecture/0006-*.md's original exclusion
 * reasoning for `transistor`/`capacitor` still applies; both get real
 * homes in P2-2/later). See docs/architecture/0024-*.md for why `leads`
 * is now `ConnectionPointRef[]` instead of `HoleAddress[]` — a lead can
 * resolve to a breadboard hole, a bare canvas point, or (P2-3) a board
 * pin, not only a breadboard hole.
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
  | "dht11"
  | "rgbLed"
  | "sevenSegmentDisplay";

interface BaseComponent {
  id: string;
  /** The two connection points this component's leads resolve to —
   * breadboard holes, bare canvas points, or (P2-3) board pins, in any
   * combination. */
  leads: [ConnectionPointRef, ConnectionPointRef];
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

/**
 * Multi-lead components (P2-2, closing ADR 0022): each is genuinely N
 * independent LED branches sharing one common leg — the same
 * `evaluateLed`/`ledSeriesElement` physics component-library already
 * has, reused per channel/segment. No new `component-library` model is
 * needed since this isn't new physics, just more of the same physics
 * wired to more leads than the old 2-terminal-only placement UI could
 * express. `health`/visuals are per-channel (a real LED die can burn out
 * independently of its neighbors sharing the same package).
 */
export interface RgbLedParams {
  commonTerminal: "cathode" | "anode";
  red: LedParams;
  green: LedParams;
  blue: LedParams;
}

export interface PlacedRgbLed {
  id: string;
  type: "rgbLed";
  params: RgbLedParams;
  commonLead: ConnectionPointRef;
  redLead: ConnectionPointRef;
  greenLead: ConnectionPointRef;
  blueLead: ConnectionPointRef;
  health: { red: HealthState; green: HealthState; blue: HealthState };
}

export type SevenSegmentName = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "dp";

export const SEVEN_SEGMENT_NAMES: SevenSegmentName[] = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "dp",
];

export interface SevenSegmentParams {
  commonTerminal: "cathode" | "anode";
  /** Every segment on a real 7-segment display is an identical LED die —
   * one shared set of electrical params, not one per segment. */
  segment: LedParams;
}

export interface PlacedSevenSegmentDisplay {
  id: string;
  type: "sevenSegmentDisplay";
  params: SevenSegmentParams;
  commonLead: ConnectionPointRef;
  segmentLeads: Record<SevenSegmentName, ConnectionPointRef>;
  health: Record<SevenSegmentName, HealthState>;
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
  | PlacedDht11
  | PlacedRgbLed
  | PlacedSevenSegmentDisplay;

/** A user-drawn wire directly connecting any two connection points. */
export interface CanvasWireModel {
  id: string;
  from: ConnectionPointRef;
  to: ConnectionPointRef;
}

/** A breadboard placed on the open canvas — a draggable item like any
 * other, not a fixed backdrop. Its holes' canvas coordinates are derived
 * from `position` plus the existing percentage-based hole layout
 * (`model/layout.ts`, unchanged) scaled by `pixelWidth`/`pixelHeight`. */
export interface PlacedBreadboard {
  id: string;
  position: { x: number; y: number };
  columns: number;
  pixelWidth: number;
  pixelHeight: number;
}
