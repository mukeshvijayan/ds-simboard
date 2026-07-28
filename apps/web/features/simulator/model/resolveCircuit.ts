import {
  type CircuitGraph,
  type MnaDiodeElementDescriptor,
  type MnaDiodeSolveResult,
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
  evaluateRelayCoil,
  evaluateRelayContact,
  evaluateResistor,
  evaluateSoilMoistureSensor,
  evaluateSoundSensor,
  evaluateTransistor,
  ldrSeriesElement,
  motionSensorSeriesElement,
  potentiometerSeriesElement,
  pushbuttonSeriesElement,
  rainSensorSeriesElement,
  relayIsEnergized,
  resistorSeriesElement,
  soilMoistureSensorSeriesElement,
  soundSensorSeriesElement,
  transistorIsOn,
  type BatteryHolderVisual,
  type BuzzerVisual,
  type DcMotorVisual,
  type Dht11Visual,
  type DiodeVisual,
  type LdrVisual,
  type LedParams,
  type LedVisual,
  type HealthState,
  type HealthStatus,
  type MotionSensorVisual,
  type PotentiometerVisual,
  type PushbuttonVisual,
  type RainSensorVisual,
  type RelayCoilVisual,
  type RelayContactVisual,
  type ResistorVisual,
  type SoilMoistureSensorVisual,
  type SoundSensorVisual,
  type TransistorVisual,
} from "@ds-simboard/component-library";
import { buildCircuit, SUPPLY_ELEMENT_PREFIX } from "./buildCircuit";
import { componentGraphElements } from "./componentElements";
import {
  SEVEN_SEGMENT_NAMES,
  type CanvasWireModel,
  type PlacedBreadboard,
  type PlacedComponent,
  type PlacedRelay,
  type PlacedRgbLed,
  type PlacedSevenSegmentDisplay,
  type PlacedTransistor,
  type SevenSegmentName,
} from "./types";

export interface RgbLedVisual {
  red: { health: HealthState; visual: LedVisual };
  green: { health: HealthState; visual: LedVisual };
  blue: { health: HealthState; visual: LedVisual };
}

export interface SevenSegmentVisual {
  segments: Record<SevenSegmentName, { health: HealthState; visual: LedVisual }>;
}

/** A relay's coil and contact are physically separate failure modes
 * (docs/architecture/0026-*.md), each with its own `HealthState` — same
 * per-channel shape as `RgbLedVisual`. */
export interface RelayVisual {
  coil: { health: HealthState; visual: RelayCoilVisual };
  contact: { health: HealthState; visual: RelayContactVisual };
}

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
  | Dht11Visual
  | RgbLedVisual
  | SevenSegmentVisual
  | TransistorVisual
  | RelayVisual;

/** A multi-lead component's `health` is per-channel (a real LED die can
 * fail independently of its neighbors sharing one package) — not every
 * `ComponentResult.health` is a single `HealthState` any more. */
export type ComponentHealth =
  | HealthState
  | { red: HealthState; green: HealthState; blue: HealthState }
  | Record<SevenSegmentName, HealthState>
  | { coil: HealthState; contact: HealthState };

export interface ComponentResult {
  health: ComponentHealth;
  visual: ComponentVisual;
}

/** Whether two `ComponentHealth` values represent the same status(es) —
 * used to decide whether a component's stored health needs updating.
 * Structural (duck-typed) rather than component-type-specific, since a
 * flat `HealthState` and a per-channel record are told apart by whether
 * `"status"` is present, regardless of how many channels there are. */
export function componentHealthEquals(a: ComponentHealth, b: ComponentHealth): boolean {
  if ("status" in a && "status" in b) {
    return a.status === b.status;
  }
  if (!("status" in a) && !("status" in b)) {
    const aRecord = a as Record<string, HealthState>;
    const bRecord = b as Record<string, HealthState>;
    const keys = Object.keys(bRecord);
    return (
      keys.length === Object.keys(aRecord).length &&
      keys.every((key) => aRecord[key]?.status === bRecord[key].status)
    );
  }
  return false;
}

/** The single worst status across a `ComponentHealth` value — a plain
 * `HealthState` passes through directly; a multi-channel component
 * reports "failed" if any channel has, else "stressed" if any has,
 * else "nominal". Used wherever the UI needs one status to show/compare
 * (a glyph's color, the persisted-health-changed check) without caring
 * which specific channel is responsible. */
export function overallHealthStatus(health: ComponentHealth): HealthStatus {
  if ("status" in health) {
    return health.status;
  }
  const statuses = Object.values(health as Record<string, HealthState>).map(
    (h) => h.status
  );
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("stressed")) return "stressed";
  return "nominal";
}

/** The first failure reason found in a `ComponentHealth` value, if any —
 * a flat `HealthState`'s own reason, or the first failed channel's
 * reason for a multi-lead part. Used for the Inspector's one-line health
 * detail, which doesn't need to enumerate every channel's own reason. */
export function firstHealthReason(health: ComponentHealth): string | undefined {
  if ("status" in health) {
    return health.reason;
  }
  const failed = Object.values(health as Record<string, HealthState>).find(
    (h) => h.reason !== undefined
  );
  return failed?.reason;
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

/** How a single graph branch resolved, in whatever terms the calling
 * context has them: the real per-tick solve, a forced short-circuit
 * (every branch forward at 0A), or a forced non-convergent fallback
 * (every branch reverse at 0V). */
interface ElementOutcome {
  currentAmps: number;
  isForward: boolean;
  voltageAcross: number;
}

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

/** One RGB/7-segment channel's LED evaluation — the same "already failed
 * stays a forced-forward 0Ω short" special case the plain `led` type
 * gets, per channel. */
function evaluateLedChannel(
  params: LedParams,
  health: HealthState,
  outcome: ElementOutcome
): { health: HealthState; visual: LedVisual } {
  if (health.status === "failed") {
    const result = evaluateLed(
      params,
      { biased: "forward", currentAmps: outcome.currentAmps },
      { health }
    );
    return { health: result.health, visual: result.visual };
  }
  const result = outcome.isForward
    ? evaluateLed(
        params,
        { biased: "forward", currentAmps: outcome.currentAmps },
        { health }
      )
    : evaluateLed(params, { biased: "reverse" }, { health });
  return { health: result.health, visual: result.visual };
}

function describeLedLikeElement(
  params: { forwardVoltageVolts: number },
  health: HealthState
): MnaDiodeElementDescriptor {
  if (health.status === "failed") {
    return { kind: "resistive", resistanceOhms: 0 };
  }
  return {
    kind: "diode",
    forwardVoltageVolts: params.forwardVoltageVolts,
    reverseResistanceOhms: Infinity,
  };
}

/**
 * The switch-state decision made from Phase 1's real solved control
 * current (docs/architecture/0026-*.md) — empty maps mean "assume every
 * switch open," Phase 1's own starting assumption; `?? false` below reads
 * that the same way whether the map is empty or just doesn't mention a
 * given component.
 */
interface SwitchDecisions {
  transistorOn: ReadonlyMap<string, boolean>;
  relayEnergized: ReadonlyMap<string, boolean>;
}

const NO_SWITCH_DECISIONS: SwitchDecisions = {
  transistorOn: new Map(),
  relayEnergized: new Map(),
};

function describeElement(
  elementId: string,
  component: PlacedComponent,
  switches: SwitchDecisions
): MnaDiodeElementDescriptor {
  if (component.type === "led" || component.type === "diode") {
    return describeLedLikeElement(component.params, component.health);
  }
  if (component.type === "rgbLed") {
    const channel = elementId.slice(component.id.length + 1) as "red" | "green" | "blue";
    return describeLedLikeElement(component.params[channel], component.health[channel]);
  }
  if (component.type === "sevenSegmentDisplay") {
    const segment = elementId.slice(component.id.length + 1) as SevenSegmentName;
    return describeLedLikeElement(component.params.segment, component.health[segment]);
  }
  if (component.type === "transistor") {
    if (elementId.endsWith(":be")) {
      if (component.health.status === "failed") {
        return { kind: "resistive", resistanceOhms: Infinity };
      }
      return {
        kind: "diode",
        forwardVoltageVolts: component.params.baseEmitterVoltageDropVolts,
        reverseResistanceOhms: Infinity,
      };
    }
    const isOn = switches.transistorOn.get(component.id) ?? false;
    if (!isOn || component.health.status === "failed") {
      return { kind: "resistive", resistanceOhms: Infinity };
    }
    return { kind: "resistive", resistanceOhms: component.params.onResistanceOhms };
  }
  if (component.type === "relay") {
    if (elementId.endsWith(":coil")) {
      if (component.health.coil.status === "failed") {
        return { kind: "resistive", resistanceOhms: Infinity };
      }
      return { kind: "resistive", resistanceOhms: component.params.coilResistanceOhms };
    }
    const isEnergized = switches.relayEnergized.get(component.id) ?? false;
    if (!isEnergized || component.health.contact.status === "failed") {
      return { kind: "resistive", resistanceOhms: Infinity };
    }
    return {
      kind: "resistive",
      resistanceOhms: component.params.contactOnResistanceOhms,
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

function evaluateRgbLed(
  component: PlacedRgbLed,
  getOutcome: (elementId: string) => ElementOutcome
): ComponentResult {
  const red = evaluateLedChannel(
    component.params.red,
    component.health.red,
    getOutcome(`${component.id}:red`)
  );
  const green = evaluateLedChannel(
    component.params.green,
    component.health.green,
    getOutcome(`${component.id}:green`)
  );
  const blue = evaluateLedChannel(
    component.params.blue,
    component.health.blue,
    getOutcome(`${component.id}:blue`)
  );
  return {
    health: { red: red.health, green: green.health, blue: blue.health },
    visual: { red, green, blue },
  };
}

function evaluateSevenSegment(
  component: PlacedSevenSegmentDisplay,
  getOutcome: (elementId: string) => ElementOutcome
): ComponentResult {
  const health: Record<string, HealthState> = {};
  const segments: Record<string, { health: HealthState; visual: LedVisual }> = {};
  for (const name of SEVEN_SEGMENT_NAMES) {
    const evaluated = evaluateLedChannel(
      component.params.segment,
      component.health[name],
      getOutcome(`${component.id}:${name}`)
    );
    health[name] = evaluated.health;
    segments[name] = evaluated;
  }
  return {
    health: health as Record<SevenSegmentName, HealthState>,
    visual: { segments: segments as SevenSegmentVisual["segments"] },
  };
}

/** A branch's real current, from whichever describes it — a plain
 * resistive branch's current is always signed "forward" (it has no
 * blocking state), so this is just `outcome.currentAmps` guarded the same
 * way `evaluateComponent`'s other resistive branches already are. */
function currentAmpsOf(outcome: ElementOutcome): number {
  return outcome.isForward ? outcome.currentAmps : 0;
}

function evaluateTransistorComponent(
  component: PlacedTransistor,
  getOutcome: (elementId: string) => ElementOutcome
): ComponentResult {
  const baseCurrentAmps = currentAmpsOf(getOutcome(`${component.id}:be`));
  const collectorCurrentAmps = currentAmpsOf(getOutcome(`${component.id}:ce`));
  const result = evaluateTransistor(
    component.params,
    { baseCurrentAmps, collectorCurrentAmps },
    { health: component.health }
  );
  return { health: result.health, visual: result.visual };
}

function evaluateRelayComponent(
  component: PlacedRelay,
  getOutcome: (elementId: string) => ElementOutcome
): ComponentResult {
  const coilCurrentAmps = currentAmpsOf(getOutcome(`${component.id}:coil`));
  const contactCurrentAmps = currentAmpsOf(getOutcome(`${component.id}:contact`));
  const coilResult = evaluateRelayCoil(
    component.params,
    { currentAmps: coilCurrentAmps },
    { health: component.health.coil }
  );
  const contactResult = evaluateRelayContact(
    component.params,
    { currentAmps: contactCurrentAmps },
    { health: component.health.contact },
    relayIsEnergized(component.params, coilCurrentAmps)
  );
  return {
    health: { coil: coilResult.health, contact: contactResult.health },
    visual: { coil: coilResult, contact: contactResult },
  };
}

function evaluateComponent(
  component: PlacedComponent,
  getOutcome: (elementId: string) => ElementOutcome,
  supplyVoltageVolts: number
): ComponentResult {
  if (component.type === "rgbLed") {
    return evaluateRgbLed(component, getOutcome);
  }
  if (component.type === "sevenSegmentDisplay") {
    return evaluateSevenSegment(component, getOutcome);
  }
  if (component.type === "transistor") {
    return evaluateTransistorComponent(component, getOutcome);
  }
  if (component.type === "relay") {
    return evaluateRelayComponent(component, getOutcome);
  }
  if (component.type === "led" || component.type === "diode") {
    const outcome = getOutcome(component.id);
    if (component.health.status === "failed") {
      return evaluatePolarized(component, "forward", outcome.currentAmps);
    }
    return outcome.isForward
      ? evaluatePolarized(component, "forward", outcome.currentAmps)
      : evaluatePolarized(component, "reverse", outcome.voltageAcross);
  }
  const outcome = getOutcome(component.id);
  return evaluateNonPolarized(component, outcome.currentAmps, supplyVoltageVolts);
}

/**
 * The unified canvas's full per-tick resolve: builds the graph from
 * every placed breadboard/component/wire (via `buildCircuit`, generalized
 * connection points), solves it via the general MNA/diode solver
 * (A-Engine), and derives every component's updated health and visual
 * from the *actual* solved current/voltage — never a scripted stand-in,
 * per spec Part 1. Multi-lead components (P2-2) evaluate each of their
 * channels the same way, via `componentGraphElements`.
 */
/** A branch's real outcome from an already-solved network — standalone
 * (not a closure) so both Phase 1 (reading a transistor/relay's control
 * current) and the final evaluate pass can use it against whichever
 * solve is the relevant one. See docs/architecture/0026-*.md. */
function outcomeFor(
  solved: MnaDiodeSolveResult & { kind: "solved" },
  graph: CircuitGraph,
  elementId: string
): ElementOutcome {
  const diodeState = solved.diodeStates.get(elementId);
  if (diodeState === undefined) {
    // A plain resistive element (not a diode-like branch at all).
    return {
      currentAmps: solved.elementCurrentsAmps.get(elementId) ?? 0,
      isForward: true,
      voltageAcross: 0,
    };
  }
  if (diodeState === "conducting") {
    return {
      currentAmps: solved.elementCurrentsAmps.get(elementId) as number,
      isForward: true,
      voltageAcross: 0,
    };
  }
  const element = graph.getElement(elementId);
  const voltageAcross =
    element === undefined
      ? 0
      : (solved.nodeVoltages.get(element.nodeA) ?? 0) -
        (solved.nodeVoltages.get(element.nodeB) ?? 0);
  return { currentAmps: 0, isForward: false, voltageAcross };
}

/** Solves the graph once with the given `describeElement`, and — if the
 * result is anything other than a clean "solved" — immediately produces
 * the final `ResolveCircuitResult` for it (short-circuit/non-convergent/
 * unresolvable), exactly the same handling regardless of which phase of
 * the two-phase resolve (docs/architecture/0026-*.md) called it. */
function solveGraphOrReport(
  graph: CircuitGraph,
  groundNodeId: string,
  describeElementFn: (elementId: string) => MnaDiodeElementDescriptor,
  components: PlacedComponent[],
  supplyVoltageVolts: number
):
  | { solved: MnaDiodeSolveResult & { kind: "solved" } }
  | { earlyResult: ResolveCircuitResult } {
  let outcome: MnaDiodeSolveResult;
  try {
    outcome = solveMnaFromGraphWithDiodes(graph, groundNodeId, describeElementFn);
  } catch (err) {
    // A second, ground-disconnected breadboard with its own supply edge
    // is the one case `solveMna` itself rejects outright (see ADR
    // 0018) — an honest "not resolvable as one circuit" rather than a
    // crash.
    const message =
      err instanceof Error
        ? err.message
        : "This wiring isn't resolvable as one connected circuit yet.";
    return {
      earlyResult: { status: "unresolved", message, componentResults: new Map() },
    };
  }

  if (outcome.kind === "short-circuit") {
    const forcedForward: ElementOutcome = {
      currentAmps: 0,
      isForward: true,
      voltageAcross: 0,
    };
    const componentResults = new Map<string, ComponentResult>();
    for (const component of components) {
      const failedComponent = withShortCircuitHealth(component);
      componentResults.set(
        component.id,
        evaluateComponent(failedComponent, () => forcedForward, supplyVoltageVolts)
      );
    }
    return { earlyResult: { status: "short-circuit", componentResults } };
  }

  if (outcome.kind === "non-convergent") {
    const forcedReverse: ElementOutcome = {
      currentAmps: 0,
      isForward: false,
      voltageAcross: 0,
    };
    const componentResults = new Map<string, ComponentResult>();
    for (const component of components) {
      componentResults.set(
        component.id,
        evaluateComponent(component, () => forcedReverse, supplyVoltageVolts)
      );
    }
    return {
      earlyResult: {
        status: "unresolved",
        message:
          "This wiring couldn't be resolved to a stable answer — try a simpler arrangement.",
        componentResults,
      },
    };
  }

  return { solved: outcome };
}

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
  const ownerByElementId = new Map<string, PlacedComponent>();
  for (const component of components) {
    for (const element of componentGraphElements(component)) {
      ownerByElementId.set(element.elementId, component);
    }
  }

  const makeDescribeElement =
    (switches: SwitchDecisions) =>
    (elementId: string): MnaDiodeElementDescriptor => {
      if (elementId.startsWith(SUPPLY_ELEMENT_PREFIX)) {
        return { kind: "voltage-source", voltageVolts: supplyVoltageVolts };
      }
      const component = ownerByElementId.get(elementId);
      if (!component) {
        throw new RangeError(`no placed component owns graph element "${elementId}"`);
      }
      return describeElement(elementId, component, switches);
    };

  // Phase 1 (docs/architecture/0026-*.md): solve with every transistor's
  // collector-emitter branch and every relay's contact branch assumed
  // open, to get each one's real control-branch current.
  const phase1 = solveGraphOrReport(
    graph,
    groundNodeId,
    makeDescribeElement(NO_SWITCH_DECISIONS),
    components,
    supplyVoltageVolts
  );
  if ("earlyResult" in phase1) {
    return phase1.earlyResult;
  }

  const transistorOn = new Map<string, boolean>();
  const relayEnergized = new Map<string, boolean>();
  for (const component of components) {
    if (component.type === "transistor") {
      const baseCurrentAmps = outcomeFor(
        phase1.solved,
        graph,
        `${component.id}:be`
      ).currentAmps;
      transistorOn.set(component.id, transistorIsOn(component.params, baseCurrentAmps));
    } else if (component.type === "relay") {
      const coilCurrentAmps = outcomeFor(
        phase1.solved,
        graph,
        `${component.id}:coil`
      ).currentAmps;
      relayEnergized.set(
        component.id,
        relayIsEnergized(component.params, coilCurrentAmps)
      );
    }
  }

  // Phase 2: re-solve once with the decided switch states baked in — only
  // when there's a decision to bake in; with none, Phase 1's result is
  // already final (same single-solve cost as before this component pair
  // existed).
  let solved: MnaDiodeSolveResult & { kind: "solved" };
  if (transistorOn.size === 0 && relayEnergized.size === 0) {
    solved = phase1.solved;
  } else {
    const phase2 = solveGraphOrReport(
      graph,
      groundNodeId,
      makeDescribeElement({ transistorOn, relayEnergized }),
      components,
      supplyVoltageVolts
    );
    if ("earlyResult" in phase2) {
      return phase2.earlyResult;
    }
    solved = phase2.solved;
  }

  const componentResults = new Map<string, ComponentResult>();
  const getOutcomeFor = (elementId: string): ElementOutcome =>
    outcomeFor(solved, graph, elementId);

  for (const component of components) {
    componentResults.set(
      component.id,
      evaluateComponent(component, getOutcomeFor, supplyVoltageVolts)
    );
  }

  let supplyCurrentAmps = 0;
  for (const breadboard of breadboards) {
    const supplyCurrent = solved.elementCurrentsAmps.get(
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

/** Applies `applyShortCircuitHealth` to every element a component owns —
 * once for a plain component, once per channel (against that channel's
 * own previous health) for a multi-lead part, since a real LED die
 * latches its own failure independently of its neighbors. */
function withShortCircuitHealth(component: PlacedComponent): PlacedComponent {
  if (component.type === "rgbLed") {
    return {
      ...component,
      health: {
        red: applyShortCircuitHealth(component.health.red),
        green: applyShortCircuitHealth(component.health.green),
        blue: applyShortCircuitHealth(component.health.blue),
      },
    };
  }
  if (component.type === "sevenSegmentDisplay") {
    const health = {} as Record<SevenSegmentName, HealthState>;
    for (const name of SEVEN_SEGMENT_NAMES) {
      health[name] = applyShortCircuitHealth(component.health[name]);
    }
    return { ...component, health };
  }
  if (component.type === "relay") {
    return {
      ...component,
      health: {
        coil: applyShortCircuitHealth(component.health.coil),
        contact: applyShortCircuitHealth(component.health.contact),
      },
    };
  }
  return {
    ...component,
    health: applyShortCircuitHealth(component.health),
  } as PlacedComponent;
}
