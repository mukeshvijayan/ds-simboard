export { NOMINAL_HEALTH } from "./contract/types";
export type {
  HealthStatus,
  HealthState,
  VisualState,
  PreviousComponentState,
  EvaluationResult,
  ElectricalModel,
} from "./contract/types";

export {
  applyMagnitudeThresholdHealth,
  applyReversePolarityHealth,
  applyShortCircuitHealth,
} from "./contract/health";

export {
  evaluateResistor,
  resistorSeriesElement,
  resistorModel,
} from "./components/resistor/resistor";
export type {
  ResistorParams,
  ResistorInput,
  ResistorVisual,
} from "./components/resistor/resistor";

export {
  evaluatePotentiometer,
  potentiometerSeriesElement,
  potentiometerModel,
  effectiveResistance,
} from "./components/potentiometer/potentiometer";
export type {
  PotentiometerParams,
  PotentiometerInput,
  PotentiometerVisual,
} from "./components/potentiometer/potentiometer";

export {
  evaluatePushbutton,
  pushbuttonSeriesElement,
  pushbuttonModel,
} from "./components/pushbutton/pushbutton";
export type {
  PushbuttonParams,
  PushbuttonInput,
  PushbuttonVisual,
} from "./components/pushbutton/pushbutton";

export { evaluateDiode, diodeSeriesElement, diodeModel } from "./components/diode/diode";
export type { DiodeParams, DiodeInput, DiodeVisual } from "./components/diode/diode";

export { evaluateLed, ledSeriesElement, ledModel } from "./components/led/led";
export type { LedParams, LedInput, LedVisual, LedColor } from "./components/led/led";

export {
  evaluateBuzzer,
  buzzerSeriesElement,
  buzzerModel,
} from "./components/buzzer/buzzer";
export type { BuzzerParams, BuzzerInput, BuzzerVisual } from "./components/buzzer/buzzer";

export {
  evaluateDcMotor,
  dcMotorSeriesElement,
  dcMotorModel,
} from "./components/dcMotor/dcMotor";
export type {
  DcMotorParams,
  DcMotorInput,
  DcMotorVisual,
} from "./components/dcMotor/dcMotor";

export {
  evaluateLdr,
  ldrSeriesElement,
  effectiveLdrResistance,
  ldrModel,
} from "./components/ldr/ldr";
export type { LdrParams, LdrInput, LdrVisual } from "./components/ldr/ldr";

export {
  evaluateBatteryHolder,
  batteryHolderSeriesElement,
  batteryHolderModel,
} from "./components/batteryHolder/batteryHolder";
export type {
  BatteryHolderParams,
  BatteryHolderInput,
  BatteryHolderVisual,
} from "./components/batteryHolder/batteryHolder";

export {
  evaluateMotionSensor,
  motionSensorSeriesElement,
  motionSensorModel,
} from "./components/motionSensor/motionSensor";
export type {
  MotionSensorParams,
  MotionSensorInput,
  MotionSensorVisual,
} from "./components/motionSensor/motionSensor";

export {
  evaluateSoilMoistureSensor,
  soilMoistureSensorSeriesElement,
  effectiveSoilMoistureResistance,
  soilMoistureSensorModel,
} from "./components/soilMoistureSensor/soilMoistureSensor";
export type {
  SoilMoistureSensorParams,
  SoilMoistureSensorInput,
  SoilMoistureSensorVisual,
} from "./components/soilMoistureSensor/soilMoistureSensor";

export {
  evaluateRainSensor,
  rainSensorSeriesElement,
  effectiveRainResistance,
  rainSensorModel,
} from "./components/rainSensor/rainSensor";
export type {
  RainSensorParams,
  RainSensorInput,
  RainSensorVisual,
} from "./components/rainSensor/rainSensor";

export {
  evaluateSoundSensor,
  soundSensorSeriesElement,
  effectiveSoundResistance,
  soundSensorModel,
} from "./components/soundSensor/soundSensor";
export type {
  SoundSensorParams,
  SoundSensorInput,
  SoundSensorVisual,
} from "./components/soundSensor/soundSensor";

export { evaluateDht11, dht11SeriesElement, dht11Model } from "./components/dht11/dht11";
export type { Dht11Params, Dht11Input, Dht11Visual } from "./components/dht11/dht11";

export { evaluateCapacitor, capacitorModel } from "./components/capacitor/capacitor";
export type {
  CapacitorParams,
  CapacitorInput,
  CapacitorState,
  CapacitorVisual,
} from "./components/capacitor/capacitor";

export { evaluateTransistor, transistorModel } from "./components/transistor/transistor";
export type {
  TransistorParams,
  TransistorInput,
  TransistorVisual,
} from "./components/transistor/transistor";
