/**
 * The shared component health state machine (spec Part 2.3):
 * nominal → stressed → failed. `"failed"` latches — once a component
 * fails, every helper in `./health.ts` returns the same failed state on
 * subsequent calls until the caller constructs a fresh nominal state
 * (i.e. the user replaces the component in the simulation).
 */
export type HealthStatus = "nominal" | "stressed" | "failed";

export interface HealthState {
  status: HealthStatus;
  /** Human-readable reason once status is "failed", e.g. why it latched. */
  reason?: string;
}

/** The health state every fresh, never-evaluated component instance starts in. */
export const NOMINAL_HEALTH: HealthState = { status: "nominal" };

/** Base shape every component's visual state extends — at minimum, the UI
 * needs a component's health to render its failure visual (blackened LED,
 * scorch mark, smoke puff, ...). */
export interface VisualState {
  health: HealthState;
}

/** What's threaded into `ElectricalModel.evaluate` from the previous tick. */
export interface PreviousComponentState<TState = unknown> {
  health: HealthState;
  state?: TState;
}

export interface EvaluationResult<TVisual extends VisualState, TState = unknown> {
  visual: TVisual;
  health: HealthState;
  state?: TState;
}

/**
 * The "block contract" (spec Part 5.6): every component in this package
 * implements `ElectricalModel<TParams, TInput, TVisual, TState>`, exposing
 * the same `evaluate` operation. This is uniformity of *shape* (same
 * operation, same threading of health/state across ticks), not of literal
 * data — a resistor and a capacitor genuinely need different parameters
 * and inputs to be modeled correctly, so `TParams`/`TInput`/`TVisual` are
 * intentionally per-component, the way each DS BlockCode block has its own
 * fields but the same block/slot mechanics.
 *
 * `TState` is for components that need memory across simulation ticks
 * (a capacitor's stored charge); it defaults to `unknown` and is simply
 * left `undefined` by every stateless component (resistor, LED, diode,
 * transistor, pushbutton, potentiometer, in this package).
 */
export interface ElectricalModel<
  TParams,
  TInput,
  TVisual extends VisualState = VisualState,
  TState = unknown,
> {
  /** Component type identifier, e.g. "resistor", "led". */
  readonly type: string;
  evaluate(
    params: TParams,
    input: TInput,
    previous: PreviousComponentState<TState>
  ): EvaluationResult<TVisual, TState>;
}
