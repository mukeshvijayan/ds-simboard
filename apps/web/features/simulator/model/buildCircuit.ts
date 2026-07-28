import { Breadboard, CircuitGraph } from "@ds-simboard/circuit-engine";
import { connectionPointId, type ConnectionPointRef } from "./connectionPoint";
import { resolveConnectivity } from "./connectivity";
import { componentGraphElements } from "./componentElements";
import { BOARD_DIGITAL_PINS } from "./boardPins";
import type {
  CanvasWireModel,
  PlacedBoard,
  PlacedBreadboard,
  PlacedComponent,
} from "./types";

export const SUPPLY_ELEMENT_PREFIX = "__supply__:";
export const BOARD_POWER_ELEMENT_PREFIX = "__board_power__:";

function railPoint(
  boardItemId: string,
  rail: "top-positive" | "top-negative"
): ConnectionPointRef {
  return { kind: "breadboardHole", boardItemId, hole: { kind: "rail", rail } };
}

function boardPinPoint(boardItemId: string, pinName: string): ConnectionPointRef {
  return { kind: "boardPin", boardItemId, pinName };
}

function boardGroundPoint(board: PlacedBoard): ConnectionPointRef {
  return boardPinPoint(board.id, "GND");
}

function boardPowerPoint(board: PlacedBoard): ConnectionPointRef {
  return boardPinPoint(board.id, board.boardType === "arduinoUno" ? "5V" : "3V3");
}

/** The graph element id for one board digital pin's driving/open branch
 * (docs/architecture/0027-*.md) — shared with `resolveCircuit.ts`, which
 * describes it per-tick from the board's real running engine state. */
export function boardPinElementId(boardItemId: string, pinName: string): string {
  return `${boardItemId}:pin:${pinName}`;
}

export type BuildCircuitResult =
  | { status: "empty" }
  | { status: "no-power"; message: string }
  | { status: "built"; graph: CircuitGraph; groundNodeId: string };

/**
 * Builds the `CircuitGraph` for the whole canvas: one synthetic supply
 * edge per placed breadboard (across its own rails, all sharing the same
 * board-wide `supplyVoltageVolts`) or board (P2-3, across its own
 * power/GND pins, at that board type's fixed logic voltage), plus every
 * graph branch each placed component contributes (`componentGraphElements`
 * — one for a plain 2-lead part, several sharing a common leg for a
 * multi-lead part like an RGB LED, P2-2), plus one driving/open branch per
 * board digital pin (P2-3), with every node id resolved through
 * `resolveConnectivity` — so components can freely span multiple
 * breadboards, bare canvas leads, or board pins, not just one fixed
 * board's holes. See docs/architecture/0024-*.md.
 *
 * At least one placed breadboard or board is required to establish a
 * ground reference — components with nothing to power them is reported
 * as `"no-power"` rather than silently building a graph with no
 * meaningful ground.
 */
export function buildCircuit(
  breadboards: PlacedBreadboard[],
  components: PlacedComponent[],
  wires: CanvasWireModel[],
  boards: PlacedBoard[] = []
): BuildCircuitResult {
  if (breadboards.length === 0 && components.length === 0 && boards.length === 0) {
    return { status: "empty" };
  }
  if (breadboards.length === 0 && boards.length === 0) {
    return {
      status: "no-power",
      message: "Place a breadboard or a board to power this circuit.",
    };
  }

  const breadboardInstances = new Map(
    breadboards.map((bb) => [bb.id, new Breadboard(bb.columns)])
  );

  const allPoints: ConnectionPointRef[] = [];
  for (const bb of breadboards) {
    allPoints.push(railPoint(bb.id, "top-positive"), railPoint(bb.id, "top-negative"));
  }
  for (const board of boards) {
    allPoints.push(boardPowerPoint(board), boardGroundPoint(board));
    for (const pin of BOARD_DIGITAL_PINS[board.boardType]) {
      allPoints.push(boardPinPoint(board.id, `D${pin}`));
    }
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
  const groundNodeId =
    breadboards.length > 0
      ? resolve(connectionPointId(railPoint(breadboards[0].id, "top-negative")))
      : resolve(connectionPointId(boardGroundPoint(boards[0])));

  // Every breadboard's rails are "always live" (ADR 0006), and every
  // running board's power/GND pins are too (P2-3) — but two of these
  // wired rail-to-rail already demand the *same* voltage across the
  // *same* (now-unified) two nodes; adding a second independent supply
  // edge there would be a redundant, not contradictory, constraint, which
  // `solveMna` can't tell apart from a real short circuit (two independent
  // sources are singular together regardless of whether their values
  // happen to agree). Skip a supply edge once another one already
  // supplies the exact same resolved pair — the same assumption the
  // breadboard-only version of this already made, now shared by boards.
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
  for (const board of boards) {
    const nodeA = resolve(connectionPointId(boardPowerPoint(board)));
    const nodeB = resolve(connectionPointId(boardGroundPoint(board)));
    const pairKey = `${nodeA}|${nodeB}`;
    if (poweredRailPairs.has(pairKey)) {
      continue;
    }
    poweredRailPairs.add(pairKey);
    graph.addElement({ id: `${BOARD_POWER_ELEMENT_PREFIX}${board.id}`, nodeA, nodeB });
  }

  for (const board of boards) {
    const groundNode = resolve(connectionPointId(boardGroundPoint(board)));
    for (const pin of BOARD_DIGITAL_PINS[board.boardType]) {
      const pinName = `D${pin}`;
      graph.addElement({
        id: boardPinElementId(board.id, pinName),
        nodeA: resolve(connectionPointId(boardPinPoint(board.id, pinName))),
        nodeB: groundNode,
      });
    }
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
