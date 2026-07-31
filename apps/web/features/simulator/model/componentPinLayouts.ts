import { LED_PIN_POSITIONS } from "../components/glyphs/LedGlyph";
import { RESISTOR_PIN_POSITIONS } from "../components/glyphs/ResistorGlyph";
import { DIODE_PIN_POSITIONS } from "../components/glyphs/DiodeGlyph";
import { TRANSISTOR_PIN_POSITIONS } from "../components/glyphs/TransistorGlyph";
import { PUSHBUTTON_PIN_POSITIONS } from "../components/glyphs/PushbuttonGlyph";
import { POTENTIOMETER_PIN_POSITIONS } from "../components/glyphs/PotentiometerGlyph";
import { PIR_PIN_POSITIONS } from "../components/glyphs/PirGlyph";
import { SOIL_MOISTURE_PIN_POSITIONS } from "../components/glyphs/SoilMoistureGlyph";
import { RAIN_SENSOR_PIN_POSITIONS } from "../components/glyphs/RainSensorGlyph";
import { SOUND_SENSOR_PIN_POSITIONS } from "../components/glyphs/SoundSensorGlyph";
import { DHT11_PIN_POSITIONS } from "../components/glyphs/Dht11Glyph";
import { RGB_LED_PIN_POSITIONS } from "../components/glyphs/RgbLedGlyph";
import { SEVEN_SEGMENT_PIN_POSITIONS } from "../components/glyphs/SevenSegmentGlyph";
import { RELAY_PIN_POSITIONS } from "../components/glyphs/RelayGlyph";
import { INDUCTOR_PIN_POSITIONS } from "../components/glyphs/InductorGlyph";
import { FERRITE_BEAD_PIN_POSITIONS } from "../components/glyphs/FerriteBeadGlyph";
import { FAST_BLOW_FUSE_PIN_POSITIONS } from "../components/glyphs/FastBlowFuseGlyph";
import { RESETTABLE_FUSE_PIN_POSITIONS } from "../components/glyphs/ResettableFuseGlyph";
import { IDEAL_CONNECTOR_PIN_POSITIONS } from "../components/glyphs/IdealConnectorGlyph";
import { LI_ION_CELL_PIN_POSITIONS } from "../components/glyphs/LiIonCellGlyph";
import { USB_POWER_BREAKOUT_PIN_POSITIONS } from "../components/glyphs/UsbPowerBreakoutGlyph";
import { SOLAR_PANEL_PIN_POSITIONS } from "../components/glyphs/SolarPanelGlyph";
import { BRIDGE_RECTIFIER_PIN_POSITIONS } from "../components/glyphs/BridgeRectifierGlyph";
import { PHOTODIODE_PIN_POSITIONS } from "../components/glyphs/PhotodiodeGlyph";
import type { BreadboardComponentType } from "./types";

/** A component's own rendered pixel footprint — must match its glyph's
 * `width`/`height` default props exactly (and those, in turn, must
 * match that glyph's own viewBox aspect ratio, or the browser's default
 * `preserveAspectRatio="xMidYMid meet"` letterboxes the content and
 * this file's percentage math would land off by the letterbox margin —
 * see docs/architecture/0036-*.md). */
export const COMPONENT_BOX_SIZE: Record<
  BreadboardComponentType,
  { width: number; height: number }
> = {
  led: { width: 40, height: 60 },
  resistor: { width: 80, height: 30 },
  diode: { width: 78, height: 40 },
  transistor: { width: 60, height: 68 },
  pushbutton: { width: 40, height: 40 },
  potentiometer: { width: 44, height: 44 },
  motionSensor: { width: 44, height: 42 },
  soilMoistureSensor: { width: 40, height: 50 },
  rainSensor: { width: 40, height: 34 },
  soundSensor: { width: 40, height: 36 },
  dht11: { width: 40, height: 38 },
  rgbLed: { width: 58, height: 68 },
  sevenSegmentDisplay: { width: 40, height: 68 },
  relay: { width: 70, height: 58 },
  // Not yet given hand-authored SVG artwork (ADR 0033) — a fixed generic
  // box, leads at the left/right edge, matching the existing fallback
  // colored-box glyph's general proportions.
  buzzer: { width: 56, height: 26 },
  dcMotor: { width: 56, height: 26 },
  ldr: { width: 56, height: 26 },
  batteryHolder: { width: 56, height: 26 },
  // ADR 0038: passives/protection, power, and storage/connectors.
  inductor: { width: 80, height: 30 },
  ferriteBead: { width: 80, height: 30 },
  fastBlowFuse: { width: 80, height: 30 },
  resettableFuse: { width: 80, height: 30 },
  idealConnector: { width: 80, height: 30 },
  liIonCell: { width: 80, height: 30 },
  usbPowerBreakout: { width: 80, height: 30 },
  solarPanel: { width: 80, height: 40 },
  bridgeRectifier: { width: 70, height: 58 },
  photodiode: { width: 78, height: 40 },
};

const GENERIC_LEADS = { lead1: { x: 0, y: 13 }, lead2: { x: 56, y: 13 } };

/** Every component type's own lead-name → pixel position within its own
 * `COMPONENT_BOX_SIZE` box — the free-floating-component equivalent of
 * `model/boardPins.ts`'s pin layout, reusing each glyph's already-
 * exported `*_PIN_POSITIONS` constants (hand-placed at authoring time,
 * ADR 0032) rather than a second, separately-maintained copy of the
 * same coordinates. */
export const COMPONENT_PIN_LAYOUTS: Record<
  BreadboardComponentType,
  Record<string, { x: number; y: number }>
> = {
  led: LED_PIN_POSITIONS,
  resistor: RESISTOR_PIN_POSITIONS,
  diode: DIODE_PIN_POSITIONS,
  transistor: TRANSISTOR_PIN_POSITIONS,
  pushbutton: PUSHBUTTON_PIN_POSITIONS,
  potentiometer: POTENTIOMETER_PIN_POSITIONS,
  motionSensor: PIR_PIN_POSITIONS,
  soilMoistureSensor: SOIL_MOISTURE_PIN_POSITIONS,
  rainSensor: RAIN_SENSOR_PIN_POSITIONS,
  soundSensor: SOUND_SENSOR_PIN_POSITIONS,
  dht11: DHT11_PIN_POSITIONS,
  rgbLed: RGB_LED_PIN_POSITIONS,
  sevenSegmentDisplay: SEVEN_SEGMENT_PIN_POSITIONS,
  relay: RELAY_PIN_POSITIONS,
  buzzer: GENERIC_LEADS,
  dcMotor: GENERIC_LEADS,
  ldr: GENERIC_LEADS,
  batteryHolder: GENERIC_LEADS,
  inductor: INDUCTOR_PIN_POSITIONS,
  ferriteBead: FERRITE_BEAD_PIN_POSITIONS,
  fastBlowFuse: FAST_BLOW_FUSE_PIN_POSITIONS,
  resettableFuse: RESETTABLE_FUSE_PIN_POSITIONS,
  idealConnector: IDEAL_CONNECTOR_PIN_POSITIONS,
  liIonCell: LI_ION_CELL_PIN_POSITIONS,
  usbPowerBreakout: USB_POWER_BREAKOUT_PIN_POSITIONS,
  solarPanel: SOLAR_PANEL_PIN_POSITIONS,
  bridgeRectifier: BRIDGE_RECTIFIER_PIN_POSITIONS,
  photodiode: PHOTODIODE_PIN_POSITIONS,
};

/** A named lead's position in percent of its own component's rendered
 * box — the coordinate space `ComponentGlyph`'s absolutely-positioned
 * lead buttons, and the global wire layer, both place things in. */
export function componentPinPercent(
  type: BreadboardComponentType,
  leadName: string
): { xPercent: number; yPercent: number } {
  const box = COMPONENT_BOX_SIZE[type];
  const pin = COMPONENT_PIN_LAYOUTS[type][leadName];
  if (!pin) {
    throw new RangeError(`component type "${type}" has no lead named "${leadName}"`);
  }
  return { xPercent: (pin.x / box.width) * 100, yPercent: (pin.y / box.height) * 100 };
}

/** Every lead name a component type has, in the fixed order
 * `createComponent`/multi-lead evaluation already expects — the same
 * order `presetLeadNames` (`constants.ts`) prompts for during the old
 * click-sequence placement flow, kept as the canonical lead order for
 * the new free-placement flow too. */
export const COMPONENT_LEAD_NAMES: Record<BreadboardComponentType, string[]> = {
  led: ["anode", "cathode"],
  diode: ["anode", "cathode"],
  resistor: ["lead1", "lead2"],
  pushbutton: ["lead1", "lead2"],
  potentiometer: ["lead1", "lead2"],
  buzzer: ["lead1", "lead2"],
  dcMotor: ["lead1", "lead2"],
  ldr: ["lead1", "lead2"],
  batteryHolder: ["lead1", "lead2"],
  motionSensor: ["lead1", "lead2"],
  soilMoistureSensor: ["lead1", "lead2"],
  rainSensor: ["lead1", "lead2"],
  soundSensor: ["lead1", "lead2"],
  dht11: ["lead1", "lead2"],
  transistor: ["base", "collector", "emitter"],
  relay: ["coilA", "coilB", "contactA", "contactB"],
  rgbLed: ["common", "red", "green", "blue"],
  sevenSegmentDisplay: ["common", "a", "b", "c", "d", "e", "f", "g", "dp"],
  inductor: ["lead1", "lead2"],
  ferriteBead: ["lead1", "lead2"],
  fastBlowFuse: ["lead1", "lead2"],
  resettableFuse: ["lead1", "lead2"],
  idealConnector: ["lead1", "lead2"],
  liIonCell: ["lead1", "lead2"],
  usbPowerBreakout: ["lead1", "lead2"],
  solarPanel: ["lead1", "lead2"],
  bridgeRectifier: ["acLead1", "acLead2", "dcPositiveLead", "dcNegativeLead"],
  photodiode: ["anode", "cathode"],
};
