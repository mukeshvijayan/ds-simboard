import { CircuitGraph, NodeId } from "../graph/circuitGraph";
import { MnaResistor, MnaVoltageSource } from "./mna";
import { MnaDiode, MnaDiodeSolveResult, solveMnaWithDiodes } from "./mnaDiode";

/** What an element in a `CircuitGraph` currently presents itself as,
 * including the piecewise-linear diode/LED kind M2 adds. For
 * `"voltage-source"` and `"diode"`, `CircuitElement.nodeA` is the
 * positive terminal / anode. */
export type MnaDiodeElementDescriptor =
  | { kind: "resistive"; resistanceOhms: number }
  | { kind: "voltage-source"; voltageVolts: number }
  | { kind: "diode"; forwardVoltageVolts: number; reverseResistanceOhms: number };

/**
 * The `CircuitGraph` → `solveMnaWithDiodes` bridge, added alongside
 * (not replacing) M1's `solveMnaFromGraph` — see docs/architecture/
 * 0019-*.md. Handles arbitrary topology, same as `solveMnaFromGraph`,
 * plus piecewise-linear diodes/LEDs.
 */
export function solveMnaFromGraphWithDiodes(
  graph: CircuitGraph,
  groundNodeId: NodeId,
  describeElement: (elementId: string) => MnaDiodeElementDescriptor,
  options?: { maxIterations?: number }
): MnaDiodeSolveResult {
  const resistors: MnaResistor[] = [];
  const voltageSources: MnaVoltageSource[] = [];
  const diodes: MnaDiode[] = [];

  for (const element of graph.allElements) {
    const descriptor = describeElement(element.id);
    if (descriptor.kind === "resistive") {
      resistors.push({
        id: element.id,
        nodeA: element.nodeA,
        nodeB: element.nodeB,
        resistanceOhms: descriptor.resistanceOhms,
      });
    } else if (descriptor.kind === "voltage-source") {
      voltageSources.push({
        id: element.id,
        nodeA: element.nodeA,
        nodeB: element.nodeB,
        voltageVolts: descriptor.voltageVolts,
      });
    } else {
      diodes.push({
        id: element.id,
        nodeA: element.nodeA,
        nodeB: element.nodeB,
        forwardVoltageVolts: descriptor.forwardVoltageVolts,
        reverseResistanceOhms: descriptor.reverseResistanceOhms,
      });
    }
  }

  return solveMnaWithDiodes({ resistors, voltageSources, diodes, groundNodeId }, options);
}
