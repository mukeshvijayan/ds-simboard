import { Breadboard, UnionFind } from "@ds-simboard/circuit-engine";
import { connectionPointId, type ConnectionPointRef } from "./connectionPoint";

export interface CanvasWire {
  id: string;
  from: string;
  to: string;
}

/**
 * Resolves canvas-wide electrical connectivity from three sources: each
 * placed breadboard's own built-in rail/strip connectivity (via its own
 * `Breadboard` instance, namespaced per board so two separate breadboards'
 * identically-named rails don't collapse into one node), plus every
 * user-drawn `CanvasWire` between any two connection points — a
 * breadboard hole, a bare component lead, or a board pin, in any
 * combination. See docs/architecture/0024-*.md.
 *
 * Returns a lookup function from connection point id to resolved
 * electrical node id — the same node-id shape `circuit-engine`'s
 * `CircuitGraph`/MNA solver already expects, so building the graph from
 * canvas state is just mapping each placed component's connection points
 * through this lookup.
 */
export function resolveConnectivity(
  breadboardsByItemId: Map<string, Breadboard>,
  connectionPoints: ConnectionPointRef[],
  wires: CanvasWire[]
): (pointId: string) => string {
  function naturalGroupKey(ref: ConnectionPointRef): string {
    if (ref.kind !== "breadboardHole") {
      return connectionPointId(ref);
    }
    const breadboard = breadboardsByItemId.get(ref.boardItemId);
    if (!breadboard) {
      throw new RangeError(`no breadboard placed with id "${ref.boardItemId}"`);
    }
    return `${ref.boardItemId}:${breadboard.nodeIdFor(ref.hole)}`;
  }

  const naturalGroupById = new Map<string, string>();
  for (const point of connectionPoints) {
    naturalGroupById.set(connectionPointId(point), naturalGroupKey(point));
  }

  const unionFind = new UnionFind();
  for (const wire of wires) {
    const fromGroup = naturalGroupById.get(wire.from);
    const toGroup = naturalGroupById.get(wire.to);
    if (fromGroup === undefined) {
      throw new RangeError(
        `wire "${wire.id}" references unknown connection point "${wire.from}"`
      );
    }
    if (toGroup === undefined) {
      throw new RangeError(
        `wire "${wire.id}" references unknown connection point "${wire.to}"`
      );
    }
    unionFind.union(fromGroup, toGroup);
  }

  return (pointId: string): string => {
    const group = naturalGroupById.get(pointId);
    if (group === undefined) {
      throw new RangeError(`no connection point with id "${pointId}"`);
    }
    return unionFind.find(group);
  };
}
