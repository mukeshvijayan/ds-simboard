import { Breadboard, CircuitGraph } from "@ds-simboard/circuit-engine";
import { connectionPointId, type ConnectionPointRef } from "./connectionPoint";
import { resolveConnectivity } from "./connectivity";
import { componentGraphElements } from "./componentElements";
import type { CanvasWireModel, PlacedBreadboard, PlacedComponent } from "./types";

export const SUPPLY_ELEMENT_PREFIX = "__supply__:";

function railPoint(
  boardItemId: string,
  rail: "top-positive" | "top-negative"
): ConnectionPointRef {
  return { kind: "breadboardHole", boardItemId, hole: { kind: "rail", rail } };
}

export type BuildCircuitResult =
  | { status: "empty" }
  | { status: "no-power"; message: string }
  | { status: "built"; graph: CircuitGraph; groundNodeId: string };

/**
 * Builds the `CircuitGraph` for the whole canvas: one synthetic supply
 * edge per placed breadboard (across its own rails, all sharing the same
 * board-wide `supplyVoltageVolts`), plus every graph branch each placed
 * component contributes (`componentGraphElements` — one for a plain
 * 2-lead part, several sharing a common leg for a multi-lead part like
 * an RGB LED, P2-2), with every node id resolved through
 * `resolveConnectivity` — so components can freely span multiple
 * breadboards, bare canvas leads, or (P2-3) board pins, not just one
 * fixed board's holes. See docs/architecture/0024-*.md.
 *
 * At least one placed breadboard is required to establish a ground
 * reference (its negative rail) — components with nothing to power them
 * is reported as `"no-power"` rather than silently building a graph with
 * no meaningful ground.
 */
export function buildCircuit(
  breadboards: PlacedBreadboard[],
  components: PlacedComponent[],
  wires: CanvasWireModel[]
): BuildCircuitResult {
  if (breadboards.length === 0 && components.length === 0) {
    return { status: "empty" };
  }
  if (breadboards.length === 0) {
    return {
      status: "no-power",
      message: "Place a breadboard to power this circuit.",
    };
  }

  const breadboardInstances = new Map(
    breadboards.map((bb) => [bb.id, new Breadboard(bb.columns)])
  );

  const allPoints: ConnectionPointRef[] = [];
  for (const bb of breadboards) {
    allPoints.push(railPoint(bb.id, "top-positive"), railPoint(bb.id, "top-negative"));
  }
  for (const component of components) {
    for (const element of componentGraphElements(component)) {
      allPoints.push(element.nodeA, element.nodeB);
    }
  }
  for (const wire of wires) {
    allPoints.push(wire.from, wire.to);
  }

  const resolve = resolveConnectivity(
    breadboardInstances,
    allPoints,
    wires.map((wire) => ({
      id: wire.id,
      from: connectionPointId(wire.from),
      to: connectionPointId(wire.to),
    }))
  );

  const graph = new CircuitGraph();
  const groundNodeId = resolve(
    connectionPointId(railPoint(breadboards[0].id, "top-negative"))
  );

  // Every breadboard's rails are "always live" (ADR 0006), but two boards
  // wired rail-to-rail already demand the *same* voltage across the *same*
  // (now-unified) two nodes — adding a second independent supply edge
  // there would be a redundant, not contradictory, constraint, which
  // `solveMna` can't tell apart from a real short circuit (two independent
  // sources are singular together regardless of whether their values
  // happen to agree). Skip a board's supply edge once another board
  // already supplies the exact same resolved rail pair.
  const poweredRailPairs = new Set<string>();
  for (const bb of breadboards) {
    const nodeA = resolve(connectionPointId(railPoint(bb.id, "top-positive")));
    const nodeB = resolve(connectionPointId(railPoint(bb.id, "top-negative")));
    const pairKey = `${nodeA}|${nodeB}`;
    if (poweredRailPairs.has(pairKey)) {
      continue;
    }
    poweredRailPairs.add(pairKey);
    graph.addElement({ id: `${SUPPLY_ELEMENT_PREFIX}${bb.id}`, nodeA, nodeB });
  }

  for (const component of components) {
    for (const element of componentGraphElements(component)) {
      graph.addElement({
        id: element.elementId,
        nodeA: resolve(connectionPointId(element.nodeA)),
        nodeB: resolve(connectionPointId(element.nodeB)),
      });
    }
  }

  return { status: "built", graph, groundNodeId };
}
