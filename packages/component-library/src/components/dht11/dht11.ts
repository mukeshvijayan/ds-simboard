import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface Dht11Params {
  /**
   * A real DHT11 doesn't change its electrical draw based on temperature
   * or humidity — it's a small fixed-current digital sensor, unlike an
   * LDR or the moisture/rain/sound sensors above (which genuinely *are*
   * variable resistors). Modeling it as a variable resistor the way
   * those are would misrepresent how the part actually works, so its
   * only electrical parameter is this fixed operating current.
   */
  operatingCurrentAmps: number;
}

export interface Dht11Input {
  /**
   * Simulated readings, entirely for display — there's no real
   * temperature/humidity to sense on a breadboard simulator, so these
   * are user-adjustable stand-ins, the same shape as an LDR's simulated
   * light level, just not tied to the electrical model at all (a real
   * DHT11's current draw doesn't depend on what it's reading either).
   */
  simulatedTemperatureCelsius: number;
  simulatedHumidityPercent: number;
}

export interface Dht11Visual extends VisualState {
  temperatureCelsius: number;
  humidityPercent: number;
}

function validateParams(params: Dht11Params): void {
  if (!(params.operatingCurrentAmps > 0)) {
    throw new RangeError("operatingCurrentAmps must be > 0");
  }
}

/**
 * A DHT11 has no failure mode of its own in this simulator — it's a
 * simple, low-power digital sensor, not a current-limited load.
 * `evaluate` always reports nominal health.
 */
export function evaluateDht11(
  params: Dht11Params,
  input: Dht11Input,
  _previous: PreviousComponentState
): EvaluationResult<Dht11Visual> {
  validateParams(params);
  return {
    visual: {
      health: NOMINAL_HEALTH,
      temperatureCelsius: input.simulatedTemperatureCelsius,
      humidityPercent: input.simulatedHumidityPercent,
    },
    health: NOMINAL_HEALTH,
  };
}

/** How a DHT11 presents itself to the series-loop solver: a fixed
 * resistance derived from its rated operating current at a nominal 5V
 * supply (Ohm's law) — the same small, constant draw regardless of what
 * it's simulating a reading of. */
export function dht11SeriesElement(params: Dht11Params): SeriesLoopElementDescriptor {
  return { kind: "resistive", resistanceOhms: 5 / params.operatingCurrentAmps };
}

export const dht11Model: ElectricalModel<Dht11Params, Dht11Input, Dht11Visual> = {
  type: "dht11",
  evaluate: evaluateDht11,
};
