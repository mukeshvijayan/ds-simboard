import {
  type MnaDiodeElementDescriptor,
  solveMnaFromGraphWithDiodes,
} from "@ds-simboard/circuit-engine";
import {
  applyShortCircuitHealth,
  batteryHolderSeriesElement,
  buzzerSeriesElement,
  dcMotorSeriesElement,
  dht11SeriesElement,
  evaluateBatteryHolder,
  evaluateBuzzer,
  evaluateDcMotor,
  evaluateDht11,
  evaluateDiode,
  evaluateLdr,
  evaluateLed,
  evaluateMotionSensor,
  evaluatePotentiometer,
  evaluatePushbutton,
  evaluateRainSensor,
  evaluateResistor,
  evaluateSoilMoistureSensor,
  evaluateSoundSensor,
  ldrSeriesElement,
  motionSensorSeriesElement,
  potentiometerSeriesElement,
  pushbuttonSeriesElement,
  rainSensorSeriesElement,
  resistorSeriesElement,
  soilMoistureSensorSeriesElement,
  soundSensorSeriesElement,
  type BatteryHolderVisual,
  type BuzzerVisual,
  type DcMotorVisual,
  type Dht11Visual,
  type DiodeVisual,
  type LdrVisual,
  type LedVisual,
  type HealthState,
  type MotionSensorVisual,
  type PotentiometerVisual,
  type PushbuttonVisual,
  type RainSensorVisual,
  type ResistorVisual,
  type SoilMoistureSensorVisual,
  type SoundSensorVisual,
} from "@ds-simboard/component-library";
import { buildCircuit, SUPPLY_ELEMENT_PREFIX } from "./buildCircuit";
import type { CanvasWireModel, PlacedBreadboard, PlacedComponent } from "./types";

export type ComponentVisual =
  | ResistorVisual
  | LedVisual
  | DiodeVisual
  | PushbuttonVisual
  | PotentiometerVisual
  | BuzzerVisual
  | DcMotorVisual
  | LdrVisual
  | BatteryHolderVisual
  | MotionSensorVisual
  | SoilMoistureSensorVisual
  | RainSensorVisual
  | SoundSensorVisual
  | Dht11Visual;

export interface ComponentResult {
  health: HealthState;
  visual: ComponentVisual;
}

export type ResolveCircuitResult =
  | { status: "empty"; componentResults: Map<string, ComponentResult> }
  | {
      status: "no-power";
      message: string;
      componentResults: Map<string, ComponentResult>;
    }
  | {
      status: "solved";
      /** The total current supplied across every placed breadboard's
       * rails — the one board-wide number that's still meaningful once
       * branches (and now, multiple breadboards) can carry different
       * currents. See docs/architecture/0021-*.md (unchanged reasoning,
       * generalized to possibly-multiple supply edges). */
      supplyCurrentAmps: number;
      componentResults: Map<string, ComponentResult>;
    }
  | { status: "short-circuit"; componentResults: Map<string, ComponentResult> }
  | {
      status: "unresolved";
      message: string;
      componentResults: Map<string, ComponentResult>;
    };

type NonPolarizedComponent = Extract<
  PlacedComponent,
  {
    type:
      | "resistor"
      | "potentiometer"
      | "pushbutton"
      | "buzzer"
      | "dcMotor"
      | "ldr"
      | "batteryHolder"
      | "motionSensor"
      | "soilMoistureSensor"
      | "rainSensor"
      | "soundSensor"
      | "dht11";
  }
>;
type PolarizedComponent = Extract<PlacedComponent, { type: "led" | "diode" }>;

/** See the identically-named helper in the retired Breadboard Lab
 * `resolveCircuit.ts` — these component types never report `"fixed-drop"`,
 * so this narrows at zero runtime cost rather than carrying a dead
 * fallback branch. */
function resistanceOhmsOf(descriptor: {
  kind: "resistive" | "fixed-drop";
  resistanceOhms?: number;
}): number {
  return (descriptor as { kind: "resistive"; resistanceOhms: number }).resistanceOhms;
}

function evaluateNonPolarized(
  component: NonPolarizedComponent,
  currentAmps: number,
  supplyVoltageVolts: number
): ComponentResult {
  switch (component.type) {
    case "resistor": {
      const result = evaluateResistor(
        component.params,
        { currentAmps },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "potentiometer": {
      const result = evaluatePotentiometer(
        component.params,
        { wiperPosition: component.wiperPosition, currentAmps },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "pushbutton": {
      const result = evaluatePushbutton(
        component.params,
        { pressed: component.pressed },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "buzzer": {
      const result = evaluateBuzzer(
        component.params,
        { currentAmps },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "dcMotor": {
      const result = evaluateDcMotor(
        component.params,
        { currentAmps },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "ldr": {
      const result = evaluateLdr(
        component.params,
        { lightLevel: component.lightLevel },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "batteryHolder": {
      const result = evaluateBatteryHolder(
        component.params,
        { supplyVoltageVolts },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "motionSensor": {
      const result = evaluateMotionSensor(
        component.params,
        { motionDetected: component.motionDetected },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "soilMoistureSensor": {
      const result = evaluateSoilMoistureSensor(
        component.params,
        { wetness: component.wetness },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "rainSensor": {
      const result = evaluateRainSensor(
        component.params,
        { rainLevel: component.rainLevel },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "soundSensor": {
      const result = evaluateSoundSensor(
        component.params,
        { loudness: component.loudness },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
    case "dht11": {
      const result = evaluateDht11(
        component.params,
        {
          simulatedTemperatureCelsius: component.simulatedTemperatureCelsius,
          simulatedHumidityPercent: component.simulatedHumidityPercent,
        },
        { health: component.health }
      );
      return { health: result.health, visual: result.visual };
    }
  }
}

function evaluatePolarized(
  component: PolarizedComponent,
  bias: "forward" | "reverse",
  currentOrVoltage: number
): ComponentResult {
  if (component.type === "led") {
    const result =
      bias === "forward"
        ? evaluateLed(
            component.params,
            { biased: "forward", currentAmps: currentOrVoltage },
            { health: component.health }
          )
        : evaluateLed(
            component.params,
            { biased: "reverse" },
            { health: component.health }
          );
    return { health: result.health, visual: result.visual };
  }
  const result =
    bias === "forward"
      ? evaluateDiode(
          component.params,
          { biased: "forward", currentAmps: currentOrVoltage },
          { health: component.health }
        )
      : evaluateDiode(
          component.params,
          { biased: "reverse", voltageVolts: -currentOrVoltage },
          { health: component.health }
        );
  return { health: result.health, visual: result.visual };
}

function describeElement(component: PlacedComponent): MnaDiodeElementDescriptor {
  if (component.type === "led" || component.type === "diode") {
    if (component.health.status === "failed") {
      return { kind: "resistive", resistanceOhms: 0 };
    }
    return {
      kind: "diode",
      forwardVoltageVolts: component.params.forwardVoltageVolts,
      reverseResistanceOhms: Infinity,
    };
  }
  switch (component.type) {
    case "resistor":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(resistorSeriesElement(component.params)),
      };
    case "potentiometer":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(
          potentiometerSeriesElement(component.params, component.wiperPosition)
        ),
      };
    case "pushbutton":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(pushbuttonSeriesElement(component.pressed)),
      };
    case "buzzer":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(
          buzzerSeriesElement(component.params, component.health)
        ),
      };
    case "dcMotor":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(
          dcMotorSeriesElement(component.params, component.health)
        ),
      };
    case "ldr":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(
          ldrSeriesElement(component.params, component.lightLevel)
        ),
      };
    case "batteryHolder":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(batteryHolderSeriesElement()),
      };
    case "motionSensor":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(
          motionSensorSeriesElement(component.motionDetected)
        ),
      };
    case "soilMoistureSensor":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(
          soilMoistureSensorSeriesElement(component.params, component.wetness)
        ),
      };
    case "rainSensor":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(
          rainSensorSeriesElement(component.params, component.rainLevel)
        ),
      };
    case "soundSensor":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(
          soundSensorSeriesElement(component.params, component.loudness)
        ),
      };
    case "dht11":
      return {
        kind: "resistive",
        resistanceOhms: resistanceOhmsOf(dht11SeriesElement(component.params)),
      };
  }
}

/**
 * The unified canvas's full per-tick resolve: builds the graph from
 * every placed breadboard/component/wire (via `buildCircuit`, generalized
 * connection points), solves it via the general MNA/diode solver
 * (A-Engine), and derives every component's updated health and visual
 * from the *actual* solved current/voltage — never a scripted stand-in,
 * per spec Part 1.
 */
export function resolveCircuit(
  breadboards: PlacedBreadboard[],
  components: PlacedComponent[],
  wires: CanvasWireModel[],
  supplyVoltageVolts: number
): ResolveCircuitResult {
  const built = buildCircuit(breadboards, components, wires);
  if (built.status === "empty") {
    return { status: "empty", componentResults: new Map() };
  }
  if (built.status === "no-power") {
    return { status: "no-power", message: built.message, componentResults: new Map() };
  }

  const { graph, groundNodeId } = built;
  const componentById = new Map(components.map((c) => [c.id, c]));

  let outcome;
  try {
    outcome = solveMnaFromGraphWithDiodes(graph, groundNodeId, (elementId) => {
      if (elementId.startsWith(SUPPLY_ELEMENT_PREFIX)) {
        return { kind: "voltage-source", voltageVolts: supplyVoltageVolts };
      }
      const component = componentById.get(elementId);
      if (!component) {
        throw new RangeError(`no placed component with id "${elementId}"`);
      }
      return describeElement(component);
    });
  } catch (err) {
    // A second, ground-disconnected breadboard with its own supply edge
    // is the one case `solveMna` itself rejects outright (see ADR
    // 0018) — an honest "not resolvable as one circuit" rather than a
    // crash.
    const message =
      err instanceof Error
        ? err.message
        : "This wiring isn't resolvable as one connected circuit yet.";
    return { status: "unresolved", message, componentResults: new Map() };
  }

  const componentResults = new Map<string, ComponentResult>();

  if (outcome.kind === "short-circuit") {
    for (const component of components) {
      const health = applyShortCircuitHealth(component.health);
      const failedComponent = { ...component, health };
      const result =
        failedComponent.type === "led" || failedComponent.type === "diode"
          ? evaluatePolarized(failedComponent, "forward", 0)
          : evaluateNonPolarized(failedComponent, 0, supplyVoltageVolts);
      componentResults.set(component.id, result);
    }
    return { status: "short-circuit", componentResults };
  }

  if (outcome.kind === "non-convergent") {
    for (const component of components) {
      const result =
        component.type === "led" || component.type === "diode"
          ? evaluatePolarized(component, "reverse", 0)
          : evaluateNonPolarized(component, 0, supplyVoltageVolts);
      componentResults.set(component.id, result);
    }
    return {
      status: "unresolved",
      message:
        "This wiring couldn't be resolved to a stable answer — try a simpler arrangement.",
      componentResults,
    };
  }

  for (const component of components) {
    if (component.type === "led" || component.type === "diode") {
      if (component.health.status === "failed") {
        const current = outcome.elementCurrentsAmps.get(component.id) ?? 0;
        componentResults.set(
          component.id,
          evaluatePolarized(component, "forward", current)
        );
        continue;
      }
      const diodeState = outcome.diodeStates.get(component.id);
      const bias: "forward" | "reverse" =
        diodeState === "conducting" ? "forward" : "reverse";
      if (bias === "forward") {
        const current = outcome.elementCurrentsAmps.get(component.id) as number;
        componentResults.set(
          component.id,
          evaluatePolarized(component, "forward", current)
        );
      } else {
        const element = graph.getElement(component.id);
        const voltageAcross =
          element === undefined
            ? 0
            : (outcome.nodeVoltages.get(element.nodeA) ?? 0) -
              (outcome.nodeVoltages.get(element.nodeB) ?? 0);
        componentResults.set(
          component.id,
          evaluatePolarized(component, "reverse", voltageAcross)
        );
      }
    } else {
      const current = outcome.elementCurrentsAmps.get(component.id) as number;
      componentResults.set(
        component.id,
        evaluateNonPolarized(component, current, supplyVoltageVolts)
      );
    }
  }

  let supplyCurrentAmps = 0;
  for (const breadboard of breadboards) {
    const supplyCurrent = outcome.elementCurrentsAmps.get(
      `${SUPPLY_ELEMENT_PREFIX}${breadboard.id}`
    );
    if (supplyCurrent !== undefined) {
      // See resolveCircuit.ts's ADR-0021-inherited note: a source's own
      // branch current runs opposite to what it delivers externally.
      supplyCurrentAmps += -supplyCurrent;
    }
  }

  return { status: "solved", supplyCurrentAmps, componentResults };
}
