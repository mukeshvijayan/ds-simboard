import { NOMINAL_HEALTH } from "@ds-simboard/component-library";
import type {
  BatteryHolderParams,
  BuzzerParams,
  DcMotorParams,
  Dht11Params,
  DiodeParams,
  FastBlowFuseParams,
  FerriteBeadParams,
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
import type {
  BreadboardComponentType,
  BridgeRectifierParams,
  RgbLedParams,
  SevenSegmentParams,
} from "./model/types";

/** Kept small deliberately — enough columns for a handful of real
 * components without the grid becoming unwieldy on a phase-4-scoped UI. */
export const BREADBOARD_COLUMNS = 20;

export const DEFAULT_SUPPLY_VOLTAGE = 5;

/** Generic, type-level label — used for aria-labels on already-placed
 * components and Inspector headers. See `PART_PRESETS` for the
 * palette-specific labels (e.g. "LED (Red)"), since several presets can
 * share one underlying type. */
export const PART_LABELS: Record<BreadboardComponentType, string> = {
  resistor: "Resistor",
  led: "LED",
  diode: "Diode",
  pushbutton: "Pushbutton",
  potentiometer: "Potentiometer",
  buzzer: "Buzzer",
  dcMotor: "DC Motor",
  ldr: "Light Sensor (LDR)",
  batteryHolder: "Battery Holder",
  motionSensor: "Motion Sensor (PIR)",
  soilMoistureSensor: "Soil Moisture Sensor",
  rainSensor: "Rain Sensor",
  soundSensor: "Sound Sensor",
  dht11: "Temperature & Humidity Sensor (DHT11)",
  rgbLed: "RGB LED",
  sevenSegmentDisplay: "7-Segment Display",
  transistor: "Transistor (NPN Switch)",
  relay: "Relay Module",
  inductor: "Inductor",
  ferriteBead: "Ferrite Bead",
  fastBlowFuse: "Fast-Blow Fuse",
  resettableFuse: "Resettable Fuse (PTC)",
  idealConnector: "Connector",
  liIonCell: "Li-ion/LiPo Cell",
  usbPowerBreakout: "USB Power Breakout",
  solarPanel: "Solar Panel",
  bridgeRectifier: "Bridge Rectifier",
  photodiode: "Photodiode",
};

/**
 * One entry per palette button. Several presets share an underlying
 * `BreadboardComponentType` with `component-library`'s own electrical
 * model (e.g. every LED color is the same `evaluateLed`, just a
 * different `forwardVoltageVolts`/`color`) — see docs/architecture/
 * 0006-*.md and the `BreadboardComponentType` doc comment in
 * `model/types.ts` for why that's not a new type per preset.
 */
export type PartPreset =
  | { id: string; type: "resistor"; label: string; params: ResistorParams }
  | { id: string; type: "led"; label: string; params: LedParams }
  | { id: string; type: "diode"; label: string; params: DiodeParams }
  | { id: string; type: "pushbutton"; label: string; params: PushbuttonParams }
  | { id: string; type: "potentiometer"; label: string; params: PotentiometerParams }
  | { id: string; type: "buzzer"; label: string; params: BuzzerParams }
  | { id: string; type: "dcMotor"; label: string; params: DcMotorParams }
  | { id: string; type: "ldr"; label: string; params: LdrParams }
  | { id: string; type: "batteryHolder"; label: string; params: BatteryHolderParams }
  | { id: string; type: "motionSensor"; label: string; params: MotionSensorParams }
  | {
      id: string;
      type: "soilMoistureSensor";
      label: string;
      params: SoilMoistureSensorParams;
    }
  | { id: string; type: "rainSensor"; label: string; params: RainSensorParams }
  | { id: string; type: "soundSensor"; label: string; params: SoundSensorParams }
  | { id: string; type: "dht11"; label: string; params: Dht11Params }
  | { id: string; type: "rgbLed"; label: string; params: RgbLedParams }
  | {
      id: string;
      type: "sevenSegmentDisplay";
      label: string;
      params: SevenSegmentParams;
    }
  | { id: string; type: "transistor"; label: string; params: TransistorParams }
  | { id: string; type: "relay"; label: string; params: RelayParams }
  | { id: string; type: "inductor"; label: string; params: InductorParams }
  | { id: string; type: "ferriteBead"; label: string; params: FerriteBeadParams }
  | { id: string; type: "fastBlowFuse"; label: string; params: FastBlowFuseParams }
  | { id: string; type: "resettableFuse"; label: string; params: ResettableFuseParams }
  | { id: string; type: "idealConnector"; label: string; params: IdealConnectorParams }
  | { id: string; type: "liIonCell"; label: string; params: LiIonCellParams }
  | {
      id: string;
      type: "usbPowerBreakout";
      label: string;
      params: UsbPowerBreakoutParams;
    }
  | { id: string; type: "solarPanel"; label: string; params: SolarPanelParams }
  | {
      id: string;
      type: "bridgeRectifier";
      label: string;
      params: BridgeRectifierParams;
    }
  | { id: string; type: "photodiode"; label: string; params: PhotodiodeParams };

/**
 * Palette grouping (Part 2, docs/architecture/0036-*.md): a type with
 * more than one preset (e.g. four resistor values) shows as *one*
 * palette entry with a variant dropdown, not one button per value —
 * only types actually listed here get that treatment; a type with
 * exactly one preset (potentiometer, transistor, etc.) keeps a single
 * plain button. Absent from this map on purpose for single-preset
 * types, not an oversight.
 */
export const PART_GROUP_LABELS: Partial<Record<BreadboardComponentType, string>> = {
  resistor: "Resistor",
  led: "LED",
  diode: "Diode",
  pushbutton: "Pushbutton / Switch",
  buzzer: "Buzzer",
  rgbLed: "RGB LED",
  sevenSegmentDisplay: "7-Segment Display",
  motionSensor: "Digital Sensor",
  soilMoistureSensor: "Soil / Water Sensor",
  rainSensor: "Rain / Flame Sensor",
  soundSensor: "Sound / Gas Sensor",
  idealConnector: "Connector",
};

/** A preset's short, variant-only label within its group's dropdown —
 * the parenthesized part of its full label when there is one ("Red"
 * out of "LED (Red)"), else the full label with the group name
 * stripped back out. */
export function presetShortLabel(preset: PartPreset, groupLabel: string): string {
  const match = preset.label.match(/\(([^)]+)\)$/);
  if (match) return match[1];
  return preset.label.replace(groupLabel, "").trim() || preset.label;
}

/** Real-world typical forward voltages per spec Part 2.2. */
const LED_PRESETS: PartPreset[] = [
  {
    id: "led-red",
    type: "led",
    label: "LED (Red)",
    params: {
      forwardVoltageVolts: 2.0,
      ratedCurrentAmps: 0.02,
      maxCurrentAmps: 0.03,
      color: "red",
    },
  },
  {
    id: "led-green",
    type: "led",
    label: "LED (Green)",
    params: {
      forwardVoltageVolts: 2.1,
      ratedCurrentAmps: 0.02,
      maxCurrentAmps: 0.03,
      color: "green",
    },
  },
  {
    id: "led-blue",
    type: "led",
    label: "LED (Blue)",
    params: {
      forwardVoltageVolts: 3.2,
      ratedCurrentAmps: 0.02,
      maxCurrentAmps: 0.03,
      color: "blue",
    },
  },
  {
    id: "led-yellow",
    type: "led",
    label: "LED (Yellow)",
    params: {
      forwardVoltageVolts: 2.1,
      ratedCurrentAmps: 0.02,
      maxCurrentAmps: 0.03,
      color: "yellow",
    },
  },
  {
    id: "led-white",
    type: "led",
    label: "LED (White)",
    params: {
      forwardVoltageVolts: 3.2,
      ratedCurrentAmps: 0.02,
      maxCurrentAmps: 0.03,
      color: "white",
    },
  },
];

/** Common, real resistor color-band values a student would actually have on hand. */
const RESISTOR_PRESETS: PartPreset[] = [
  {
    id: "resistor-220",
    type: "resistor",
    label: "Resistor (220Ω)",
    params: { resistanceOhms: 220, ratedPowerWatts: 0.25 },
  },
  {
    id: "resistor-330",
    type: "resistor",
    label: "Resistor (330Ω)",
    params: { resistanceOhms: 330, ratedPowerWatts: 0.25 },
  },
  {
    id: "resistor-1k",
    type: "resistor",
    label: "Resistor (1kΩ)",
    params: { resistanceOhms: 1_000, ratedPowerWatts: 0.25 },
  },
  {
    id: "resistor-10k",
    type: "resistor",
    label: "Resistor (10kΩ)",
    params: { resistanceOhms: 10_000, ratedPowerWatts: 0.25 },
  },
];

export const PART_PRESETS: PartPreset[] = [
  ...RESISTOR_PRESETS,
  ...LED_PRESETS,
  // Rectifier and Schottky are both accurately represented by the
  // existing diode model as-is: real rectifier/Schottky diodes *are*
  // permanently damaged if driven past their reverse voltage rating,
  // which is exactly what `reverseBreakdownVoltageVolts` already models
  // (docs/architecture/0037-*.md). A "Zener" preset is deliberately
  // *not* added here — a real zener is specifically designed to conduct
  // in reverse at its rated voltage *without* being damaged (voltage
  // regulation, its whole purpose), the opposite of what this model's
  // reverse-breakdown-as-failure represents; reusing it for a "Zener"
  // preset would teach backwards physics, not a simplification of real
  // physics. A real zener needs its own regulation-modeling electrical
  // behavior, which is new component-library work, not a preset.
  {
    id: "diode-rectifier",
    type: "diode",
    label: "Diode (Rectifier 1N4007)",
    params: { forwardVoltageVolts: 0.7, reverseBreakdownVoltageVolts: 1000 },
  },
  {
    id: "diode-schottky",
    type: "diode",
    label: "Diode (Schottky 1N5819)",
    params: { forwardVoltageVolts: 0.3, reverseBreakdownVoltageVolts: 40 },
  },
  {
    id: "pushbutton",
    type: "pushbutton",
    label: "Pushbutton / Switch (Momentary)",
    params: { isMomentary: true },
  },
  {
    id: "toggle-switch",
    type: "pushbutton",
    label: "Pushbutton / Switch (Toggle)",
    params: { isMomentary: false },
  },
  {
    id: "potentiometer",
    type: "potentiometer",
    label: "Potentiometer",
    params: { totalResistanceOhms: 10_000, ratedPowerWatts: 0.2 },
  },
  {
    id: "buzzer-active",
    type: "buzzer",
    label: "Buzzer (Active)",
    params: {
      kind: "active",
      ratedVoltageVolts: 5,
      ratedCurrentAmps: 0.03,
      maxCurrentAmps: 0.05,
    },
  },
  {
    id: "buzzer-passive",
    type: "buzzer",
    label: "Buzzer (Passive)",
    params: {
      kind: "passive",
      ratedVoltageVolts: 5,
      ratedCurrentAmps: 0.03,
      maxCurrentAmps: 0.05,
    },
  },
  {
    id: "dc-motor",
    type: "dcMotor",
    label: "DC Motor",
    params: { ratedVoltageVolts: 6, ratedCurrentAmps: 0.1, stallCurrentAmps: 0.4 },
  },
  {
    id: "ldr",
    type: "ldr",
    label: "Light Sensor (LDR)",
    params: { minResistanceOhms: 500, maxResistanceOhms: 1_000_000 },
  },
  {
    id: "battery-holder",
    type: "batteryHolder",
    label: "Battery Holder",
    params: {},
  },
  // motionSensor's own params are genuinely empty (`Record<string,
  // never>` — a user-toggled digital trigger, nothing else to
  // parameterize), so every real digital on/off sensor below is
  // electrically identical to the PIR: this isn't a simplification that
  // loses anything real, it's the same physics with a different real
  // part's name on it (docs/architecture/0037-*.md).
  {
    id: "motion-sensor-pir",
    type: "motionSensor",
    label: "Digital Sensor (PIR Motion)",
    params: {},
  },
  {
    id: "motion-sensor-tilt",
    type: "motionSensor",
    label: "Digital Sensor (Tilt)",
    params: {},
  },
  {
    id: "motion-sensor-vibration",
    type: "motionSensor",
    label: "Digital Sensor (Vibration SW-420)",
    params: {},
  },
  {
    id: "motion-sensor-touch",
    type: "motionSensor",
    label: "Digital Sensor (Touch)",
    params: {},
  },
  {
    id: "motion-sensor-ir-obstacle",
    type: "motionSensor",
    label: "Digital Sensor (IR Obstacle)",
    params: {},
  },
  {
    id: "motion-sensor-hall",
    type: "motionSensor",
    label: "Digital Sensor (Hall Effect)",
    params: {},
  },
  {
    id: "soil-moisture-sensor",
    type: "soilMoistureSensor",
    label: "Soil / Water Sensor (Soil Moisture)",
    params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
  },
  {
    id: "water-level-sensor",
    type: "soilMoistureSensor",
    label: "Soil / Water Sensor (Water Level)",
    params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
  },
  {
    id: "rain-sensor",
    type: "rainSensor",
    label: "Rain / Flame Sensor (Rain)",
    params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
  },
  {
    id: "flame-sensor",
    type: "rainSensor",
    label: "Rain / Flame Sensor (Flame)",
    params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
  },
  {
    id: "sound-sensor",
    type: "soundSensor",
    label: "Sound / Gas Sensor (Sound)",
    params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
  },
  {
    id: "gas-sensor",
    type: "soundSensor",
    label: "Sound / Gas Sensor (Gas MQ-2)",
    params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
  },
  {
    id: "dht11",
    type: "dht11",
    label: "Temperature & Humidity Sensor (DHT11)",
    params: { operatingCurrentAmps: 0.0025 },
  },
  {
    id: "rgb-led-common-cathode",
    type: "rgbLed",
    label: "RGB LED (Common Cathode)",
    params: {
      commonTerminal: "cathode",
      red: {
        forwardVoltageVolts: 2.0,
        ratedCurrentAmps: 0.02,
        maxCurrentAmps: 0.03,
        color: "red",
      },
      green: {
        forwardVoltageVolts: 2.1,
        ratedCurrentAmps: 0.02,
        maxCurrentAmps: 0.03,
        color: "green",
      },
      blue: {
        forwardVoltageVolts: 3.2,
        ratedCurrentAmps: 0.02,
        maxCurrentAmps: 0.03,
        color: "blue",
      },
    },
  },
  {
    id: "rgb-led-common-anode",
    type: "rgbLed",
    label: "RGB LED (Common Anode)",
    params: {
      commonTerminal: "anode",
      red: {
        forwardVoltageVolts: 2.0,
        ratedCurrentAmps: 0.02,
        maxCurrentAmps: 0.03,
        color: "red",
      },
      green: {
        forwardVoltageVolts: 2.1,
        ratedCurrentAmps: 0.02,
        maxCurrentAmps: 0.03,
        color: "green",
      },
      blue: {
        forwardVoltageVolts: 3.2,
        ratedCurrentAmps: 0.02,
        maxCurrentAmps: 0.03,
        color: "blue",
      },
    },
  },
  {
    id: "seven-segment-common-cathode",
    type: "sevenSegmentDisplay",
    label: "7-Segment Display (Common Cathode)",
    params: {
      commonTerminal: "cathode",
      segment: {
        forwardVoltageVolts: 2.0,
        ratedCurrentAmps: 0.02,
        maxCurrentAmps: 0.03,
        color: "red",
      },
    },
  },
  {
    id: "seven-segment-common-anode",
    type: "sevenSegmentDisplay",
    label: "7-Segment Display (Common Anode)",
    params: {
      commonTerminal: "anode",
      segment: {
        forwardVoltageVolts: 2.0,
        ratedCurrentAmps: 0.02,
        maxCurrentAmps: 0.03,
        color: "red",
      },
    },
  },
  {
    id: "transistor-npn-switch",
    type: "transistor",
    label: "Transistor (NPN Switch)",
    params: {
      baseEmitterVoltageDropVolts: 0.7,
      baseThresholdCurrentAmps: 0.001,
      onResistanceOhms: 1,
      maxCollectorCurrentAmps: 0.5,
    },
  },
  {
    id: "relay-module",
    type: "relay",
    label: "Relay Module",
    params: {
      coilResistanceOhms: 400,
      pullInCurrentAmps: 0.01,
      contactOnResistanceOhms: 0.05,
      maxCoilCurrentAmps: 0.05,
      maxContactCurrentAmps: 2,
    },
  },
  // ADR 0038: passives/protection, power, and storage/connectors —
  // buildable-now set.
  {
    id: "inductor",
    type: "inductor",
    label: "Inductor",
    params: { dcResistanceOhms: 0.5, ratedCurrentAmps: 1 },
  },
  {
    id: "ferrite-bead",
    type: "ferriteBead",
    label: "Ferrite Bead",
    params: { dcResistanceOhms: 0.1, ratedCurrentAmps: 3 },
  },
  {
    id: "fast-blow-fuse",
    type: "fastBlowFuse",
    label: "Fast-Blow Fuse (1A)",
    params: { restingResistanceOhms: 0.05, ratedCurrentAmps: 1 },
  },
  {
    id: "resettable-fuse",
    type: "resettableFuse",
    label: "Resettable Fuse (PTC, 1A)",
    params: {
      restingResistanceOhms: 0.1,
      trippedResistanceOhms: 1000,
      tripCurrentAmps: 1,
      holdCurrentAmps: 0.3,
      destructiveCurrentAmps: 10,
    },
  },
  // idealConnector's six presets are all the same ideal 0Ω pass-through
  // (docs/architecture/0038-*.md) — only `params.kind` (a display-only
  // field) and the label differ.
  {
    id: "header-pins",
    type: "idealConnector",
    label: "Header Pins",
    params: { kind: "headerPins" },
  },
  {
    id: "header-sockets",
    type: "idealConnector",
    label: "Header Sockets",
    params: { kind: "headerSockets" },
  },
  {
    id: "jst-connector",
    type: "idealConnector",
    label: "JST Connector",
    params: { kind: "jstConnector" },
  },
  {
    id: "dc-barrel-jack",
    type: "idealConnector",
    label: "DC Barrel Jack",
    params: { kind: "dcBarrelJack" },
  },
  {
    id: "screw-terminal",
    type: "idealConnector",
    label: "Screw Terminal",
    params: { kind: "screwTerminal" },
  },
  {
    id: "alligator-clips",
    type: "idealConnector",
    label: "Alligator Clips",
    params: { kind: "alligatorClips" },
  },
  {
    id: "li-ion-cell",
    type: "liIonCell",
    label: "Li-ion/LiPo Cell",
    params: {},
  },
  {
    id: "usb-power-breakout",
    type: "usbPowerBreakout",
    label: "USB Power Breakout",
    params: {},
  },
  {
    id: "solar-panel",
    type: "solarPanel",
    label: "Solar Panel",
    params: { minResistanceOhms: 20, maxResistanceOhms: 1_000_000 },
  },
  // ADR 0038 diode follow-up: bridge rectifier and photodiode, the two
  // buildable-now diode-family parts paced into their own pass.
  {
    id: "bridge-rectifier",
    type: "bridgeRectifier",
    label: "Bridge Rectifier",
    params: {
      diode: { forwardVoltageVolts: 0.7, reverseBreakdownVoltageVolts: 1000 },
    },
  },
  {
    id: "photodiode",
    type: "photodiode",
    label: "Photodiode",
    params: {
      forwardVoltageVolts: 0.7,
      reverseBreakdownVoltageVolts: 60,
      darkResistanceOhms: 10_000_000,
      litResistanceOhms: 1_000,
    },
  },
];

export { NOMINAL_HEALTH };
