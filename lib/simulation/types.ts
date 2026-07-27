export type BoardId = "uno" | "esp32";

export type ComponentType = "led" | "servo" | "ultrasonic" | "lcd1602";

export interface BoardDefinition {
  id: BoardId;
  name: string;
  digitalPins: number[];
  analogPins: string[];
  defaultSketch: string;
}

export interface PlacedComponent {
  instanceId: string;
  type: ComponentType;
  /** Canvas position, percentage-based so layout stays responsive. */
  x: number;
  y: number;
  /** Which board pin this component's primary signal wire is connected to. */
  pin: number | string | null;
}

/**
 * Live simulated pin state, keyed by pin identifier (e.g. "13", "A0").
 * `value` is 0/1 for digital pins, 0-255 for PWM/analog output,
 * 0-1023 for analog input reads.
 */
export type PinStateMap = Record<string, number>;

export interface SerialLine {
  id: number;
  text: string;
  timestamp: number;
}

export type EngineStatus = "idle" | "running" | "stopped" | "error";

export interface EngineEvent {
  type: "pin-change" | "serial" | "status" | "error";
  pin?: string;
  value?: number;
  text?: string;
  status?: EngineStatus;
  message?: string;
}
