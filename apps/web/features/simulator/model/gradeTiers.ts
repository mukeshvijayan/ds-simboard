import type { BoardType } from "./boardPins";
import type { BreadboardComponentType } from "./types";

/**
 * A palette filter for the unified canvas (P2-6), not a separate route
 * or simulator — carrying forward the grade-band groupings this project
 * built up in three real phases (Phase A1 "Foundations," grade 3-5;
 * Phase A2, grade 6-8; the components ADR 0017 deferred as too
 * architecturally advanced until A-Engine's general solver arrived,
 * grade 9-10+) as an explicit, user-facing filter rather than the
 * build-phase-only scoping device those grade ranges were before.
 */
export type GradeTier = "foundations" | "building" | "advanced";

export const GRADE_TIERS: GradeTier[] = ["foundations", "building", "advanced"];

export const GRADE_TIER_LABELS: Record<GradeTier, string> = {
  foundations: "Foundations",
  building: "Building",
  advanced: "Advanced",
};

export const GRADE_TIER_RANGES: Record<GradeTier, string> = {
  foundations: "Grades 3–5",
  building: "Grades 6–8",
  advanced: "Grades 9–10+",
};

/**
 * Every component type's tier — Phase A1's original grade 3-5 set
 * (simple 2-lead parts: resistor, LED, diode, pushbutton, potentiometer,
 * buzzer, DC motor, LDR, battery holder) is `"foundations"`; Phase A2's
 * grade 6-8 sensor set is `"building"`; the four components ADR 0017
 * deferred until multi-lead placement and the general MNA solver existed
 * (RGB LED, 7-segment display, transistor, relay — closed by ADR 0025/
 * 0026) are `"advanced"`, alongside real microcontroller boards (ADR
 * 0027), which need genuinely more background to use meaningfully than
 * any single component does.
 */
export const COMPONENT_TIER: Record<BreadboardComponentType, GradeTier> = {
  resistor: "foundations",
  led: "foundations",
  diode: "foundations",
  pushbutton: "foundations",
  potentiometer: "foundations",
  buzzer: "foundations",
  dcMotor: "foundations",
  ldr: "foundations",
  batteryHolder: "foundations",
  motionSensor: "building",
  soilMoistureSensor: "building",
  rainSensor: "building",
  soundSensor: "building",
  dht11: "building",
  rgbLed: "advanced",
  sevenSegmentDisplay: "advanced",
  transistor: "advanced",
  relay: "advanced",
};

export const BOARD_TIER: Record<BoardType, GradeTier> = {
  arduinoUno: "advanced",
  esp32: "advanced",
};
