import type {
  BatteryHolderParams,
  BuzzerParams,
  DcMotorParams,
  Dht11Params,
  DiodeParams,
  FastBlowFuseParams,
  FerriteBeadParams,
  HealthState,
  IdealConnectorParams,
  InductorParams,
  LdrParams,
  LedParams,
  LiIonCellParams,
  MotionSensorParams,
  PhotodiodeParams,
  PotentiometerParams,
  PushbuttonParams,
  RainSensorParams,
  ResettableFuseParams,
  RelayParams,
  ResistorParams,
  SoilMoistureSensorParams,
  SolarPanelParams,
  SoundSensorParams,
  TransistorParams,
  UsbPowerBreakoutParams,
} from "@ds-simboard/component-library";
import type { ConnectionPointRef } from "./connectionPoint";
import type { BoardType } from "./boardPins";

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
  | "sevenSegmentDisplay"
  | "transistor"
  | "relay"
  // ADR 0038: passives/protection, power, and storage/connectors —
  // buildable-now set.
  | "inductor"
  | "ferriteBead"
  | "fastBlowFuse"
  | "resettableFuse"
  | "idealConnector"
  | "liIonCell"
  | "usbPowerBreakout"
  | "solarPanel"
  | "bridgeRectifier"
  | "photodiode";

interface BaseComponent {
  id: string;
  /** Where this component sits on the open canvas (Part 2, docs/
   * architecture/0036-*.md) — independent of what, if anything, its
   * leads are wired to. A freshly-placed component's own leads default
   * to `{kind: "componentLead", componentItemId: this.id, ...}`
   * (pointing at itself — unwired) until the user draws a wire from one
   * to a hole, a board pin, or another component's lead. */
  position: { x: number; y: number };
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

/** A photodiode (ADR 0038 diode follow-up) — electrically a diode whose
 * reverse-biased resistance also depends on a simulated light level
 * (`component-library`'s `photodiodeModel`), the same shape as `PlacedLdr`
 * combined with `PlacedDiode`'s own polarity flag. */
export interface PlacedPhotodiode extends BaseComponent {
  type: "photodiode";
  params: PhotodiodeParams;
  leadZeroIsPositive: boolean;
  /** Simulated ambient light level, 0 (dark) to 1 (bright) — user-adjustable. */
  lightLevel: number;
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

export interface PlacedInductor extends BaseComponent {
  type: "inductor";
  params: InductorParams;
}

export interface PlacedFerriteBead extends BaseComponent {
  type: "ferriteBead";
  params: FerriteBeadParams;
}

export interface PlacedFastBlowFuse extends BaseComponent {
  type: "fastBlowFuse";
  params: FastBlowFuseParams;
}

export interface PlacedResettableFuse extends BaseComponent {
  type: "resettableFuse";
  params: ResettableFuseParams;
}

export interface PlacedIdealConnector extends BaseComponent {
  type: "idealConnector";
  params: IdealConnectorParams;
}

export interface PlacedLiIonCell extends BaseComponent {
  type: "liIonCell";
  params: LiIonCellParams;
}

export interface PlacedUsbPowerBreakout extends BaseComponent {
  type: "usbPowerBreakout";
  params: UsbPowerBreakoutParams;
}

export interface PlacedSolarPanel extends BaseComponent {
  type: "solarPanel";
  params: SolarPanelParams;
  /** Simulated sunlight level, 0 (dark) to 1 (full sun) — user-adjustable. */
  sunlightLevel: number;
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
  position: { x: number; y: number };
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
  position: { x: number; y: number };
  commonLead: ConnectionPointRef;
  segmentLeads: Record<SevenSegmentName, ConnectionPointRef>;
  health: Record<SevenSegmentName, HealthState>;
}

/**
 * A bridge rectifier (ADR 0038 diode follow-up) — four identical diode
 * dies (one shared `DiodeParams`, the same "every segment is the same
 * die" reuse `SevenSegmentParams.segment` already established) wired in
 * the classic bridge topology: AC~ lead 1 and AC~ lead 2 are
 * interchangeable inputs, DC+/DC- are the rectified output. Unlike
 * transistor/relay (ADR 0026), this needs no two-phase resolve — all
 * four branches are ordinary diode elements the general MNA/diode
 * solver already handles in one pass, just wired in a mesh instead of a
 * shared-leg star like RGB LED/7-segment.
 */
export interface BridgeRectifierParams {
  diode: DiodeParams;
}

export interface PlacedBridgeRectifier {
  id: string;
  type: "bridgeRectifier";
  params: BridgeRectifierParams;
  position: { x: number; y: number };
  acLead1: ConnectionPointRef;
  acLead2: ConnectionPointRef;
  dcPositiveLead: ConnectionPointRef;
  dcNegativeLead: ConnectionPointRef;
  health: { d1: HealthState; d2: HealthState; d3: HealthState; d4: HealthState };
}

/**
 * Transistor-as-switch and relay module (P2-2 part 2, closing ADR 0022)
 * both need a two-phase resolve — one branch's on/off state depends on a
 * *different* branch's real solved current, not its own. See
 * docs/architecture/0026-*.md. A transistor is 3 leads (base, collector,
 * emitter) → 2 graph elements sharing the emitter node; a relay is 4
 * leads (2 coil, 2 contact) → 2 graph elements that do *not* share a
 * node with each other.
 */
export interface PlacedTransistor {
  id: string;
  type: "transistor";
  params: TransistorParams;
  position: { x: number; y: number };
  baseLead: ConnectionPointRef;
  collectorLead: ConnectionPointRef;
  emitterLead: ConnectionPointRef;
  health: HealthState;
}

export interface PlacedRelay {
  id: string;
  type: "relay";
  params: RelayParams;
  position: { x: number; y: number };
  coilLeadA: ConnectionPointRef;
  coilLeadB: ConnectionPointRef;
  /** Common/pole terminal. */
  contactLeadA: ConnectionPointRef;
  /** Normally-open terminal. */
  contactLeadB: ConnectionPointRef;
  /** A burned coil doesn't weld the contacts, and vice versa — same
   * per-channel reasoning as `PlacedRgbLed.health`. */
  health: { coil: HealthState; contact: HealthState };
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
  | PlacedSevenSegmentDisplay
  | PlacedTransistor
  | PlacedRelay
  | PlacedInductor
  | PlacedFerriteBead
  | PlacedFastBlowFuse
  | PlacedResettableFuse
  | PlacedIdealConnector
  | PlacedLiIonCell
  | PlacedUsbPowerBreakout
  | PlacedSolarPanel
  | PlacedBridgeRectifier
  | PlacedPhotodiode;

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

/**
 * A board on the canvas (P2-3, closing ADR 0027) — not a `PlacedComponent`
 * (no `ElectricalModel`/`HealthState`; a board doesn't "burn out" the way
 * a resistor does). Its pins are real `{kind: "boardPin"}` connection
 * points, bridged into the circuit graph live, every simulation tick,
 * while `running` — see `model/boardBridge.ts`.
 *
 * Arduino Uno has no live sketch compilation (ADR 0007): `program` picks
 * between the two precompiled `chip-emulation` demos, not free-typed
 * source. ESP32 keeps the line-stepping `SketchEngine` interpreter (ADR
 * 0008) and so does have a free-typed `sketch`.
 */
export interface PlacedArduinoUno {
  id: string;
  boardType: "arduinoUno";
  position: { x: number; y: number };
  program: "blink" | "digitalPassthrough";
  running: boolean;
}

export interface PlacedEsp32 {
  id: string;
  boardType: "esp32";
  position: { x: number; y: number };
  sketch: string;
  running: boolean;
}

export type PlacedBoard = PlacedArduinoUno | PlacedEsp32;

export type { BoardType };

/** A board digital pin's electrical role for exactly one simulation tick
 * (`model/boardBridge.ts` computes this from the board's real running
 * engine) — `"driving"` when the program has configured it as an output
 * (a real avr8js DDR bit, or an ESP32 pin that's received at least one
 * `digitalWrite`), `"open"` otherwise (input-configured, or the board
 * isn't running), so the rest of the circuit decides that node's voltage
 * instead of the pin fighting it. See docs/architecture/0027-*.md. */
export type BoardPinElectricalState =
  { kind: "driving"; isHigh: boolean } | { kind: "open" };
