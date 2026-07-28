import {
  type SeriesLoopElementDescriptor,
  walkSeriesLoop,
  solveSeriesLoopFromGraph,
} from "@ds-simboard/circuit-engine";
import {
  applyShortCircuitHealth,
  batteryHolderSeriesElement,
  buzzerSeriesElement,
  dcMotorSeriesElement,
  dht11SeriesElement,
  diodeSeriesElement,
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
  ledSeriesElement,
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
import { buildBreadboard, buildCircuitGraph, SUPPLY_ELEMENT_ID } from "./circuitGraph";
import { physicalEntryNode, resolveBias } from "./bias";
import type { PlacedComponent, Wire } from "./types";

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
      status: "conducting";
      currentAmps: number;
      componentResults: Map<string, ComponentResult>;
    }
  | { status: "non-conducting"; componentResults: Map<string, ComponentResult> }
  | { status: "short-circuit"; componentResults: Map<string, ComponentResult> }
  | {
      status: "unsupported-topology";
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

function evaluateComponent(
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

function evaluatePolarizedComponent(
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

/**
 * The Breadboard Lab's full per-tick resolve: builds the graph from the
 * current wiring, solves it, and derives every component's updated health
 * and visual from the *actual* solved current/voltage — never a scripted
 * stand-in, per spec Part 1.
 */
export function resolveCircuit(
  columns: number,
  components: PlacedComponent[],
  wires: Wire[],
  supplyVoltageVolts: number
): ResolveCircuitResult {
  if (components.length === 0) {
    return { status: "empty", componentResults: new Map() };
  }

  const breadboard = buildBreadboard(columns, wires);
  const graph = buildCircuitGraph(breadboard, components);
  const componentById = new Map(components.map((c) => [c.id, c]));

  let walked;
  try {
    walked = walkSeriesLoop(graph, SUPPLY_ELEMENT_ID);
  } catch (err) {
    const reason =
      err instanceof Error
        ? err.message
        : "this wiring isn't a supported circuit shape yet";
    return {
      status: "unsupported-topology",
      // This same path also covers "not a closed loop yet" (e.g. a
      // component with a dangling lead), not just true parallel branches —
      // the underlying reason from walkSeriesLoop is always included.
      message: `This isn't a complete series loop yet — parallel branches and multi-source circuits aren't supported either. (${reason})`,
      componentResults: new Map(),
    };
  }

  const biasByComponentId = new Map<string, "forward" | "reverse">();
  walked.forEach((element, index) => {
    const component = componentById.get(element.id);
    if (!component || (component.type !== "led" && component.type !== "diode")) {
      return;
    }
    const entryNode = physicalEntryNode(walked, index);
    biasByComponentId.set(component.id, resolveBias(entryNode, component, breadboard));
  });

  const describeElement = (elementId: string): SeriesLoopElementDescriptor => {
    const component = componentById.get(elementId);
    if (!component) {
      throw new RangeError(`no placed component with id "${elementId}"`);
    }
    switch (component.type) {
      case "resistor":
        return resistorSeriesElement(component.params);
      case "potentiometer":
        return potentiometerSeriesElement(component.params, component.wiperPosition);
      case "pushbutton":
        return pushbuttonSeriesElement(component.pressed);
      case "buzzer":
        return buzzerSeriesElement(component.params, component.health);
      case "dcMotor":
        return dcMotorSeriesElement(component.params, component.health);
      case "ldr":
        return ldrSeriesElement(component.params, component.lightLevel);
      case "batteryHolder":
        return batteryHolderSeriesElement();
      case "motionSensor":
        return motionSensorSeriesElement(component.motionDetected);
      case "soilMoistureSensor":
        return soilMoistureSensorSeriesElement(component.params, component.wetness);
      case "rainSensor":
        return rainSensorSeriesElement(component.params, component.rainLevel);
      case "soundSensor":
        return soundSensorSeriesElement(component.params, component.loudness);
      case "dht11":
        return dht11SeriesElement(component.params);
      case "led":
        return ledSeriesElement(
          component.params,
          biasByComponentId.get(component.id) ?? "forward",
          component.health
        );
      case "diode":
        return diodeSeriesElement(
          component.params,
          biasByComponentId.get(component.id) ?? "forward",
          component.health
        );
    }
  };

  const outcome = solveSeriesLoopFromGraph(
    graph,
    SUPPLY_ELEMENT_ID,
    supplyVoltageVolts,
    describeElement
  );

  const componentResults = new Map<string, ComponentResult>();

  if (outcome.kind === "short-circuit") {
    for (const component of components) {
      const health = applyShortCircuitHealth(component.health);
      const failedComponent = { ...component, health };
      const result =
        failedComponent.type === "led" || failedComponent.type === "diode"
          ? evaluatePolarizedComponent(
              failedComponent,
              biasByComponentId.get(failedComponent.id) ?? "forward",
              0
            )
          : evaluateComponent(failedComponent, 0, supplyVoltageVolts);
      componentResults.set(component.id, result);
    }
    return { status: "short-circuit", componentResults };
  }

  const currentAmps = outcome.kind === "conducting" ? outcome.currentAmps : 0;

  for (const component of components) {
    if (component.type === "led" || component.type === "diode") {
      const bias = biasByComponentId.get(component.id) ?? "forward";
      const magnitude =
        bias === "forward"
          ? currentAmps
          : (outcome.voltageDropsByElementId[component.id] ?? 0);
      componentResults.set(
        component.id,
        evaluatePolarizedComponent(component, bias, magnitude)
      );
    } else {
      componentResults.set(
        component.id,
        evaluateComponent(component, currentAmps, supplyVoltageVolts)
      );
    }
  }

  return outcome.kind === "conducting"
    ? { status: "conducting", currentAmps, componentResults }
    : { status: "non-conducting", componentResults };
}
