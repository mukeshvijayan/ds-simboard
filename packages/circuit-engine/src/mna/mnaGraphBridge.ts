import { CircuitGraph, NodeId } from "../graph/circuitGraph";
import { MnaResistor, MnaVoltageSource, MnaSolveResult, solveMna } from "./mna";

/** What an element in a `CircuitGraph` currently presents itself as to
 * the MNA solver. Unlike `SeriesLoopElementDescriptor`, there is no
 * `"fixed-drop"` kind yet — nonlinear elements are A-Engine Milestone 2. */
export type MnaElementDescriptor =
  | { kind: "resistive"; resistanceOhms: number }
  | { kind: "voltage-source"; voltageVolts: number };

/**
 * The `CircuitGraph` → `solveMna` bridge, the general-topology analogue
 * of `solveSeriesLoopFromGraph`. Unlike `walkSeriesLoop`, this does
 * **not** require every node to have degree exactly 2 — branch points,
 * parallel paths, and multiple loops are exactly what this solver is for.
 * For a `"voltage-source"` element, `CircuitElement.nodeA` is the
 * positive terminal (matching the `nodeA`-is-positive convention already
 * used for polarized components elsewhere in this codebase).
 */
export function solveMnaFromGraph(
  graph: CircuitGraph,
  groundNodeId: NodeId,
  describeElement: (elementId: string) => MnaElementDescriptor
): MnaSolveResult {
  const resistors: MnaResistor[] = [];
  const voltageSources: MnaVoltageSource[] = [];

  for (const element of graph.allElements) {
    const descriptor = describeElement(element.id);
    if (descriptor.kind === "resistive") {
      resistors.push({
        id: element.id,
        nodeA: element.nodeA,
        nodeB: element.nodeB,
        resistanceOhms: descriptor.resistanceOhms,
      });
    } else {
      voltageSources.push({
        id: element.id,
        nodeA: element.nodeA,
        nodeB: element.nodeB,
        voltageVolts: descriptor.voltageVolts,
      });
    }
  }

  return solveMna({ resistors, voltageSources, groundNodeId });
}
