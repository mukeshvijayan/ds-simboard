export { UnionFind } from "./graph/unionFind";
export { CircuitGraph } from "./graph/circuitGraph";
export type { NodeId, CircuitElement } from "./graph/circuitGraph";

export { walkSeriesLoop, solveSeriesLoopFromGraph } from "./graph/seriesLoopBridge";
export type { SeriesLoopElementDescriptor } from "./graph/seriesLoopBridge";

export { Breadboard } from "./breadboard/breadboard";
export { stripSideOf } from "./breadboard/types";
export type {
  RailId,
  StripRow,
  RailHole,
  StripHole,
  HoleAddress,
} from "./breadboard/types";

export { voltage, current, resistance } from "./physics/ohmsLaw";
export { solveSeriesCircuit } from "./physics/seriesCircuit";
export type {
  SeriesResistiveElement,
  SeriesCircuitResult,
} from "./physics/seriesCircuit";

export { solveSeriesLoop } from "./physics/seriesLoop";
export type { SeriesLoopElement, SeriesLoopOutcome } from "./physics/seriesLoop";
