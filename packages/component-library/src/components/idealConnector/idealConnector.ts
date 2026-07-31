import type { SeriesLoopElementDescriptor } from "@ds-simboard/circuit-engine";
import {
  ElectricalModel,
  EvaluationResult,
  NOMINAL_HEALTH,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

/**
 * `kind` has zero electrical effect (every kind is the same ideal
 * pass-through) — it exists purely so the UI can render each connector's
 * own real, visually distinct shape (a header pin looks nothing like an
 * alligator clip) instead of one generic box, the same way `BuzzerParams`
 * already carries a `kind` field the UI/physics both read. This is the
 * one field keeping this from being a pure `Record<string, never>` like
 * `motionSensorModel`'s six presets share.
 */
export interface IdealConnectorParams {
  kind:
    | "headerPins"
    | "headerSockets"
    | "jstConnector"
    | "dcBarrelJack"
    | "screwTerminal"
    | "alligatorClips";
}

export type IdealConnectorInput = Record<string, never>;

export type IdealConnectorVisual = VisualState;

/**
 * Header pins, header sockets, JST connectors, DC barrel jacks, screw
 * terminals, and alligator clips (ADR 0038) are all electrically
 * identical — a pure mechanical wiring aid, an ideal 0Ω pass-through with
 * no failure mode a current/voltage threshold could represent (a real
 * connector's failure mode is corrosion or a loose crimp, not
 * overcurrent). One shared model reused across six presets, the same
 * "one component type, several presets" shape `motionSensorModel`
 * already established across six sensor presets. `evaluate` always
 * reports nominal health.
 */
export function evaluateIdealConnector(
  _params: IdealConnectorParams,
  _input: IdealConnectorInput,
  _previous: PreviousComponentState
): EvaluationResult<IdealConnectorVisual> {
  return { visual: { health: NOMINAL_HEALTH }, health: NOMINAL_HEALTH };
}

/** An ideal (0Ω) pass-through, unconditionally. */
export function idealConnectorSeriesElement(): SeriesLoopElementDescriptor {
  return { kind: "resistive", resistanceOhms: 0 };
}

export const idealConnectorModel: ElectricalModel<
  IdealConnectorParams,
  IdealConnectorInput,
  IdealConnectorVisual
> = {
  type: "idealConnector",
  evaluate: evaluateIdealConnector,
};
