import { CircuitElement, CircuitGraph } from "./circuitGraph";
import {
  SeriesLoopElement,
  SeriesLoopOutcome,
  solveSeriesLoop,
} from "../physics/seriesLoop";

/**
 * Walks a `CircuitGraph` that is expected to form a single series loop
 * (every node touched by exactly two elements) and returns its elements in
 * loop order, starting with `supplyElementId` and proceeding around the
 * loop back to it. Throws if the graph isn't a simple single loop — a
 * branch (a node touched by 3+ elements), a dead end (touched by only 1),
 * or a disconnected extra component are all rejected explicitly rather
 * than silently mis-solved, per the series-only scope in
 * docs/architecture/0004-*.md.
 */
export function walkSeriesLoop(
  graph: CircuitGraph,
  supplyElementId: string
): CircuitElement[] {
  const supply = graph.getElement(supplyElementId);
  if (!supply) {
    throw new RangeError(`no element with id "${supplyElementId}" in this graph`);
  }

  for (const nodeId of graph.nodeIds) {
    const degree = graph.elementsAtNode(nodeId).length;
    if (degree !== 2) {
      throw new RangeError(
        `node "${nodeId}" touches ${degree} element(s) — a series loop requires exactly 2 at every node`
      );
    }
  }

  // Every node now has degree exactly 2, so from any node reached via
  // `currentElement`, exactly one *other* element touches it — the walk
  // below is guaranteed to trace one closed cycle back to `supply.nodeA`
  // without ever finding zero or multiple candidates at a step.
  const ordered: CircuitElement[] = [supply];
  let currentElement = supply;
  let currentNode = supply.nodeB;

  while (currentNode !== supply.nodeA) {
    const [next] = graph
      .elementsAtNode(currentNode)
      .filter((el) => el.id !== currentElement.id);
    ordered.push(next);
    currentNode = next.nodeA === currentNode ? next.nodeB : next.nodeA;
    currentElement = next;
  }

  if (ordered.length !== graph.allElements.length) {
    throw new RangeError(
      "graph contains elements not reachable from the supply in a single loop (a disconnected component)"
    );
  }

  return ordered;
}

/** What a non-supply element in the loop presents to the solver right now. */
export type SeriesLoopElementDescriptor =
  | { kind: "resistive"; resistanceOhms: number }
  | { kind: "fixed-drop"; forwardVoltageVolts: number };

/**
 * The `CircuitGraph` → `solveSeriesLoop` bridge: walks the loop starting at
 * `supplyElementId`, asks `describeElement` how each other element
 * currently presents itself electrically (a resistor reports its fixed
 * value; a diode reports a fixed voltage drop when forward-biased or
 * effectively infinite resistance when reverse-biased; etc. — that
 * per-component logic lives in `packages/component-library`, not here),
 * and solves the resulting loop.
 */
export function solveSeriesLoopFromGraph(
  graph: CircuitGraph,
  supplyElementId: string,
  supplyVoltageVolts: number,
  describeElement: (elementId: string) => SeriesLoopElementDescriptor
): SeriesLoopOutcome {
  const loopElements = walkSeriesLoop(graph, supplyElementId);
  const elements: SeriesLoopElement[] = loopElements
    .filter((element) => element.id !== supplyElementId)
    .map((element) => ({ id: element.id, ...describeElement(element.id) }));

  return solveSeriesLoop(supplyVoltageVolts, elements);
}
