import { Breadboard, CircuitGraph, type HoleAddress } from "@ds-simboard/circuit-engine";
import type { PlacedComponent, Wire } from "./types";

/**
 * Component-library's 7 parts don't include a power source (spec Part 2.2
 * lists none), but a circuit needs one — see docs/architecture/0006-*.md.
 * The breadboard's power rails are modeled as always live at a
 * user-settable supply voltage rather than requiring a separate, undrawn
 * "Battery" component.
 */
export const POSITIVE_RAIL: HoleAddress = { kind: "rail", rail: "top-positive" };
export const NEGATIVE_RAIL: HoleAddress = { kind: "rail", rail: "top-negative" };
export const SUPPLY_ELEMENT_ID = "__supply__";

/**
 * Builds a fresh `Breadboard` (never a reused/mutated one — `UnionFind`
 * can't "un-union" a removed wire, so every rebuild starts from a clean
 * board and replays the *current* full wire list) and applies every wire.
 */
export function buildBreadboard(columns: number, wires: Wire[]): Breadboard {
  const breadboard = new Breadboard(columns);
  for (const wire of wires) {
    breadboard.addWire(wire.from, wire.to);
  }
  return breadboard;
}

/**
 * Builds a `CircuitGraph` from the current breadboard state: a synthetic
 * supply edge across the rails, plus one 2-terminal element per placed
 * component.
 */
export function buildCircuitGraph(
  breadboard: Breadboard,
  components: PlacedComponent[]
): CircuitGraph {
  const graph = new CircuitGraph();
  graph.addElement({
    id: SUPPLY_ELEMENT_ID,
    nodeA: breadboard.nodeIdFor(POSITIVE_RAIL),
    nodeB: breadboard.nodeIdFor(NEGATIVE_RAIL),
  });

  for (const component of components) {
    const [leadA, leadB] = component.leads;
    // For a polarized part (LED/diode), the general solver (A-Engine M1/M2)
    // treats an element's `nodeA` as its anode by convention — orient the
    // graph edge so that's always true, rather than always defaulting to
    // `leads[0]` regardless of which lead the user marked positive.
    const [anodeLead, cathodeLead] =
      (component.type === "led" || component.type === "diode") &&
      !component.leadZeroIsPositive
        ? [leadB, leadA]
        : [leadA, leadB];
    graph.addElement({
      id: component.id,
      nodeA: breadboard.nodeIdFor(anodeLead),
      nodeB: breadboard.nodeIdFor(cathodeLead),
    });
  }

  return graph;
}
