import { applyMagnitudeThresholdHealth } from "../../contract/health";
import {
  EvaluationResult,
  PreviousComponentState,
  VisualState,
} from "../../contract/types";

export interface RelayParams {
  coilResistanceOhms: number;
  /** Minimum coil current that pulls the armature in and closes the contact. */
  pullInCurrentAmps: number;
  /** Contact resistance once closed — small, e.g. 0.05-0.2Ω. */
  contactOnResistanceOhms: number;
  maxCoilCurrentAmps: number;
  maxContactCurrentAmps: number;
}

export interface RelayCoilInput {
  currentAmps: number;
}

export interface RelayContactInput {
  currentAmps: number;
}

export interface RelayCoilVisual extends VisualState {
  isEnergized: boolean;
}

export interface RelayContactVisual extends VisualState {
  isClosed: boolean;
  currentAmps: number;
}

function validateParams(params: RelayParams): void {
  if (!(params.coilResistanceOhms > 0)) {
    throw new RangeError("coilResistanceOhms must be > 0");
  }
  if (!(params.pullInCurrentAmps > 0)) {
    throw new RangeError("pullInCurrentAmps must be > 0");
  }
  if (!(params.contactOnResistanceOhms > 0)) {
    throw new RangeError("contactOnResistanceOhms must be > 0");
  }
  if (!(params.maxCoilCurrentAmps >= params.pullInCurrentAmps)) {
    throw new RangeError("maxCoilCurrentAmps must be >= pullInCurrentAmps");
  }
  if (!(params.maxContactCurrentAmps > 0)) {
    throw new RangeError("maxContactCurrentAmps must be > 0");
  }
}

/**
 * Whether enough coil current is flowing to pull the armature in and
 * close the contact — decided from the coil branch's own first-phase
 * solve, same shape as `transistorIsOn`. See docs/architecture/0026-*.md.
 */
export function relayIsEnergized(params: RelayParams, coilCurrentAmps: number): boolean {
  return coilCurrentAmps >= params.pullInCurrentAmps;
}

/** The coil: an ordinary resistive winding that can burn out from
 * over-current, exactly like `dcMotor`'s winding. */
export function evaluateRelayCoil(
  params: RelayParams,
  input: RelayCoilInput,
  previous: PreviousComponentState
): EvaluationResult<RelayCoilVisual> {
  validateParams(params);
  if (!(input.currentAmps >= 0)) {
    throw new RangeError("currentAmps must be >= 0");
  }

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.currentAmps,
    maxValue: params.maxCoilCurrentAmps,
    failureReason: `coil current ${(input.currentAmps * 1000).toFixed(1)}mA exceeds max rating ${(params.maxCoilCurrentAmps * 1000).toFixed(1)}mA`,
  });

  return {
    visual: {
      health,
      isEnergized:
        health.status === "failed" ? false : relayIsEnergized(params, input.currentAmps),
    },
    health,
  };
}

/**
 * The contact: a physically separate failure mode from the coil (a
 * burned winding doesn't weld the contacts, and vice versa) — its
 * `isClosed` state comes from the *coil's* decision (`isEnergized`), not
 * from the contact's own current, which is the entire two-phase point.
 */
export function evaluateRelayContact(
  params: RelayParams,
  input: RelayContactInput,
  previous: PreviousComponentState,
  isEnergized: boolean
): EvaluationResult<RelayContactVisual> {
  validateParams(params);
  if (!(input.currentAmps >= 0)) {
    throw new RangeError("currentAmps must be >= 0");
  }

  const health = applyMagnitudeThresholdHealth({
    previousHealth: previous.health,
    measuredValue: input.currentAmps,
    maxValue: params.maxContactCurrentAmps,
    failureReason: `contact current ${(input.currentAmps * 1000).toFixed(1)}mA exceeds max rating ${(params.maxContactCurrentAmps * 1000).toFixed(1)}mA`,
  });

  return {
    visual: {
      health,
      isClosed: health.status === "failed" ? false : isEnergized,
      currentAmps: health.status === "failed" ? 0 : input.currentAmps,
    },
    health,
  };
}
