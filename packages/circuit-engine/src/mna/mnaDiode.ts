import { MnaNodeId, MnaResistor, MnaVoltageSource, solveMna } from "./mna";

/** A default guard against a genuinely oscillating configuration — see
 * docs/architecture/0019-*.md. Realistic breadboard-scale circuits
 * converge in a handful of iterations at most; this cap exists purely so
 * a pathological case fails loudly (`"non-convergent"`) instead of
 * looping forever. */
const DEFAULT_MAX_ITERATIONS = 100;

/** A piecewise-linear diode/LED: a fixed forward-voltage drop when
 * conducting, or a (typically very large) resistance when blocking —
 * the same fixed-`Vf` model `component-library`'s `diode`/`led` already
 * use (ADR 0005), extended here to work in an arbitrary-topology network
 * instead of only a single series loop. `nodeA` is the anode (positive
 * terminal when forward-biased). */
export interface MnaDiode {
  id: string;
  nodeA: MnaNodeId;
  nodeB: MnaNodeId;
  forwardVoltageVolts: number;
  /** Resistance presented while blocking — `Infinity` for an ideal diode. */
  reverseResistanceOhms: number;
}

export interface MnaNetworkWithDiodes {
  resistors: MnaResistor[];
  voltageSources: MnaVoltageSource[];
  diodes: MnaDiode[];
  groundNodeId: MnaNodeId;
}

export type MnaDiodeState = "conducting" | "blocking";

export type MnaDiodeSolveResult =
  | {
      kind: "solved";
      nodeVoltages: Map<MnaNodeId, number>;
      elementCurrentsAmps: Map<string, number>;
      diodeStates: Map<string, MnaDiodeState>;
    }
  | {
      /** A singular underlying linear solve — including spec Part 2.3's
       * canonical case, a diode's fixed drop directly contradicting
       * another source with no resistance between them. */
      kind: "short-circuit";
    }
  | {
      /** The state-guessing iteration didn't settle within the
       * iteration cap. See docs/architecture/0019-*.md. */
      kind: "non-convergent";
    };

/**
 * Solves an arbitrary-topology network containing piecewise-linear
 * diodes/LEDs alongside plain resistors and independent voltage sources,
 * by iteratively guessing each diode's conducting/blocking state,
 * solving the resulting fully linear network via M1's unmodified
 * `solveMna`, and flipping one inconsistent diode's guess at a time until
 * the whole network is self-consistent. See docs/architecture/0019-*.md
 * for why this (rather than full Newton-Raphson on a smooth curve) is
 * the right technique for this project's fixed-`Vf` diode model.
 */
export function solveMnaWithDiodes(
  network: MnaNetworkWithDiodes,
  options?: { maxIterations?: number }
): MnaDiodeSolveResult {
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  let states = new Map<string, MnaDiodeState>(
    network.diodes.map((diode) => [diode.id, "blocking"])
  );

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const resistors = [...network.resistors];
    const voltageSources = [...network.voltageSources];
    for (const diode of network.diodes) {
      if (states.get(diode.id) === "conducting") {
        voltageSources.push({
          id: diode.id,
          nodeA: diode.nodeA,
          nodeB: diode.nodeB,
          voltageVolts: diode.forwardVoltageVolts,
        });
      } else {
        resistors.push({
          id: diode.id,
          nodeA: diode.nodeA,
          nodeB: diode.nodeB,
          resistanceOhms: diode.reverseResistanceOhms,
        });
      }
    }

    const result = solveMna({
      resistors,
      voltageSources,
      groundNodeId: network.groundNodeId,
    });
    if (result.kind === "singular") {
      return { kind: "short-circuit" };
    }

    const inconsistentDiode = network.diodes.find((diode) => {
      if (states.get(diode.id) === "conducting") {
        const current = result.elementCurrentsAmps.get(diode.id) as number;
        return current < 0;
      }
      const voltageAcross =
        (result.nodeVoltages.get(diode.nodeA) as number) -
        (result.nodeVoltages.get(diode.nodeB) as number);
      return voltageAcross > diode.forwardVoltageVolts;
    });

    if (!inconsistentDiode) {
      return {
        kind: "solved",
        nodeVoltages: result.nodeVoltages,
        elementCurrentsAmps: result.elementCurrentsAmps,
        diodeStates: states,
      };
    }

    states = new Map(states);
    states.set(
      inconsistentDiode.id,
      states.get(inconsistentDiode.id) === "conducting" ? "blocking" : "conducting"
    );
  }

  return { kind: "non-convergent" };
}
