import { UnionFind } from "../graph/unionFind";
import { solveLinearSystem } from "./linearSystem";

export type MnaNodeId = string;

/** A purely resistive two-terminal element. `nodeA`/`nodeB` are
 * interchangeable — resistance has no polarity. */
export interface MnaResistor {
  id: string;
  nodeA: MnaNodeId;
  nodeB: MnaNodeId;
  resistanceOhms: number;
}

/** An ideal independent voltage source. `nodeA` is defined as the
 * positive terminal, `nodeB` the negative — this fixes
 * `V(nodeA) − V(nodeB) = voltageVolts` regardless of what else is
 * connected. */
export interface MnaVoltageSource {
  id: string;
  nodeA: MnaNodeId;
  nodeB: MnaNodeId;
  voltageVolts: number;
}

export interface MnaNetwork {
  resistors: MnaResistor[];
  voltageSources: MnaVoltageSource[];
  /** The node whose voltage is defined to be 0V; every other node's
   * voltage is reported relative to it. */
  groundNodeId: MnaNodeId;
}

export type MnaSolveResult =
  | {
      kind: "solved";
      nodeVoltages: Map<MnaNodeId, number>;
      /**
       * Current in amps through each resistor/voltage source, oriented
       * consistently as "the current that would be measured flowing from
       * `nodeA` to `nodeB` through that element" — for a resistor this is
       * plain Ohm's law, `(V(nodeA) − V(nodeB)) / R`; for a voltage
       * source it's the standard MNA branch-current variable, which runs
       * *opposite* to the current the source delivers to the external
       * circuit it powers (current enters a source at its negative
       * terminal and leaves at its positive terminal, from the external
       * circuit's point of view).
       */
      elementCurrentsAmps: Map<string, number>;
    }
  | {
      /** The network is rank-deficient — a true short circuit (0Ω
       * directly across a source) or two independent sources making
       * contradictory demands on the same two nodes. */
      kind: "singular";
    };

/**
 * General Modified Nodal Analysis over an arbitrary-topology resistive
 * network with independent voltage sources — branch points, parallel
 * paths, and multiple loops are all supported, unlike
 * `circuit-engine`'s series-only solvers. See docs/architecture/0018-*.md
 * for the edge-case decisions below (0Ω/∞Ω handling, disconnected
 * sub-circuits).
 */
export function solveMna(network: MnaNetwork): MnaSolveResult {
  const { groundNodeId } = network;

  interface InternalSource {
    id: string;
    nodeA: MnaNodeId;
    nodeB: MnaNodeId;
    voltageVolts: number;
  }

  const finiteResistors: MnaResistor[] = [];
  const syntheticSources: InternalSource[] = [];

  for (const resistor of network.resistors) {
    if (!(resistor.resistanceOhms >= 0)) {
      throw new RangeError(`resistanceOhms for "${resistor.id}" must be >= 0`);
    }
    if (resistor.resistanceOhms === 0) {
      // The standard MNA trick for an ideal wire/closed switch — 1/0 is
      // undefined, not just large, so this can't go into the conductance
      // matrix directly.
      syntheticSources.push({
        id: resistor.id,
        nodeA: resistor.nodeA,
        nodeB: resistor.nodeB,
        voltageVolts: 0,
      });
    } else if (Number.isFinite(resistor.resistanceOhms)) {
      finiteResistors.push(resistor);
    }
    // Infinite resistance (an open switch): zero conductance, contributes
    // nothing — correctly reports 0A without any special-casing below.
  }

  const allVoltageSources: InternalSource[] = [
    ...network.voltageSources,
    ...syntheticSources,
  ];

  const allNodeIds = new Set<MnaNodeId>([groundNodeId]);
  for (const r of network.resistors) {
    allNodeIds.add(r.nodeA);
    allNodeIds.add(r.nodeB);
  }
  for (const vs of network.voltageSources) {
    allNodeIds.add(vs.nodeA);
    allNodeIds.add(vs.nodeB);
  }

  const connectivity = new UnionFind();
  for (const id of allNodeIds) connectivity.find(id);
  for (const r of finiteResistors) connectivity.union(r.nodeA, r.nodeB);
  for (const vs of allVoltageSources) connectivity.union(vs.nodeA, vs.nodeB);

  const groundRoot = connectivity.find(groundNodeId);

  for (const vs of network.voltageSources) {
    if (connectivity.find(vs.nodeA) !== groundRoot) {
      throw new RangeError(
        `voltage source "${vs.id}" is not connected to ground node "${groundNodeId}" — a second, ground-disconnected independent source isn't representable by this single-reference solver`
      );
    }
  }

  const activeNodeIds = Array.from(allNodeIds).filter(
    (id) => id !== groundNodeId && connectivity.find(id) === groundRoot
  );
  const activeVoltageSources = allVoltageSources.filter(
    (vs) => connectivity.find(vs.nodeA) === groundRoot
  );

  const nodeIndex = new Map<MnaNodeId, number>();
  activeNodeIds.forEach((id, index) => nodeIndex.set(id, index));
  const sourceIndex = new Map<string, number>();
  activeVoltageSources.forEach((vs, index) => sourceIndex.set(vs.id, index));

  const n = activeNodeIds.length;
  const m = activeVoltageSources.length;
  const size = n + m;

  const a: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));
  const b: number[] = new Array(size).fill(0);

  for (const resistor of finiteResistors) {
    if (connectivity.find(resistor.nodeA) !== groundRoot) continue; // floating branch, no contribution
    const conductance = 1 / resistor.resistanceOhms;
    const idxA = nodeIndex.get(resistor.nodeA);
    const idxB = nodeIndex.get(resistor.nodeB);
    if (idxA !== undefined) a[idxA][idxA] += conductance;
    if (idxB !== undefined) a[idxB][idxB] += conductance;
    if (idxA !== undefined && idxB !== undefined) {
      a[idxA][idxB] -= conductance;
      a[idxB][idxA] -= conductance;
    }
  }

  for (const source of activeVoltageSources) {
    const k = n + (sourceIndex.get(source.id) as number);
    const idxA = nodeIndex.get(source.nodeA);
    const idxB = nodeIndex.get(source.nodeB);
    if (idxA !== undefined) {
      a[idxA][k] += 1;
      a[k][idxA] += 1;
    }
    if (idxB !== undefined) {
      a[idxB][k] -= 1;
      a[k][idxB] -= 1;
    }
    b[k] = source.voltageVolts;
  }

  const result = solveLinearSystem(a, b);
  if (result.kind === "singular") {
    return { kind: "singular" };
  }

  const nodeVoltages = new Map<MnaNodeId, number>();
  for (const id of allNodeIds) {
    if (id === groundNodeId) {
      nodeVoltages.set(id, 0);
      continue;
    }
    const idx = nodeIndex.get(id);
    nodeVoltages.set(id, idx !== undefined ? result.solution[idx] : 0);
  }
  // Every id ever passed to `voltageAt` below is a resistor terminal
  // already added to `allNodeIds` above, so `nodeVoltages` is guaranteed
  // to have an entry for it — this is not a fallback for a real case.
  const voltageAt = (id: MnaNodeId): number => nodeVoltages.get(id) as number;

  const elementCurrentsAmps = new Map<string, number>();
  for (const resistor of network.resistors) {
    if (resistor.resistanceOhms === 0) continue; // reported via its synthetic source below
    if (!Number.isFinite(resistor.resistanceOhms)) {
      elementCurrentsAmps.set(resistor.id, 0);
      continue;
    }
    elementCurrentsAmps.set(
      resistor.id,
      (voltageAt(resistor.nodeA) - voltageAt(resistor.nodeB)) / resistor.resistanceOhms
    );
  }
  for (const source of allVoltageSources) {
    const idx = sourceIndex.get(source.id);
    elementCurrentsAmps.set(source.id, idx !== undefined ? result.solution[n + idx] : 0);
  }

  return { kind: "solved", nodeVoltages, elementCurrentsAmps };
}
