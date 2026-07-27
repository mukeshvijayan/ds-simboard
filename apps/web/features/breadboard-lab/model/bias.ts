import type { Breadboard, CircuitElement, NodeId } from "@ds-simboard/circuit-engine";
import type { PlacedDiode, PlacedLed } from "./types";

/** The one node two adjacent loop elements share. Assumes a valid series loop (exactly one shared node). */
export function sharedNode(a: CircuitElement, b: CircuitElement): NodeId {
  if (a.nodeA === b.nodeA || a.nodeA === b.nodeB) {
    return a.nodeA;
  }
  return a.nodeB;
}

/**
 * For element `walked[index]`, the node conventional current physically
 * enters through.
 *
 * `walkSeriesLoop` always starts at the supply and walks from
 * `supply.nodeB` around the loop back to `supply.nodeA` — i.e. it walks
 * *against* conventional current direction (which flows out of the
 * positive terminal, `nodeA`, through the loop, back into `nodeB`). So the
 * node an element shares with the *next* element in walk order (wrapping
 * around) is where current physically enters it — not the node shared
 * with the *previous* element, which is where the walk itself arrived.
 * Verified against a known-correct example in bias.test.ts rather than
 * left as an unchecked derivation.
 */
export function physicalEntryNode(walked: CircuitElement[], index: number): NodeId {
  const next = walked[(index + 1) % walked.length];
  return sharedNode(walked[index], next);
}

/**
 * Whether current enters a polarized 2-terminal part (LED/diode) at its
 * marked positive (anode) lead — forward bias — or its negative lead —
 * reverse bias.
 */
export function resolveBias(
  entryNode: NodeId,
  component: PlacedLed | PlacedDiode,
  breadboard: Breadboard
): "forward" | "reverse" {
  const positiveLead = component.leadZeroIsPositive
    ? component.leads[0]
    : component.leads[1];
  const positiveLeadNode = breadboard.nodeIdFor(positiveLead);
  return entryNode === positiveLeadNode ? "forward" : "reverse";
}
