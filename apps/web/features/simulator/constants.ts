import { NOMINAL_HEALTH } from "@ds-simboard/component-library";
import type {
  BatteryHolderParams,
  BuzzerParams,
  DcMotorParams,
  Dht11Params,
  DiodeParams,
  LdrParams,
  LedParams,
  MotionSensorParams,
  PotentiometerParams,
  PushbuttonParams,
  RainSensorParams,
  RelayParams,
  ResistorParams,
  SoilMoistureSensorParams,
  SoundSensorParams,
  TransistorParams,
} from "@ds-simboard/component-library";
import type {
  BreadboardComponentType,
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
  | { id: string; type: "relay"; label: string; params: RelayParams };

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
  {
    id: "diode",
    type: "diode",
    label: "Diode",
    params: { forwardVoltageVolts: 0.7, reverseBreakdownVoltageVolts: 1000 },
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
  {
    id: "motion-sensor",
    type: "motionSensor",
    label: "Motion Sensor (PIR)",
    params: {},
  },
  {
    id: "soil-moisture-sensor",
    type: "soilMoistureSensor",
    label: "Soil Moisture Sensor",
    params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
  },
  {
    id: "rain-sensor",
    type: "rainSensor",
    label: "Rain Sensor",
    params: { minResistanceOhms: 1_000, maxResistanceOhms: 100_000 },
  },
  {
    id: "sound-sensor",
    type: "soundSensor",
    label: "Sound Sensor",
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
];

export { NOMINAL_HEALTH };
