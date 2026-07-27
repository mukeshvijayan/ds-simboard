import { UnionFind } from "../graph/unionFind";
import { NodeId } from "../graph/circuitGraph";
import { HoleAddress, stripSideOf } from "./types";

/**
 * Canonicalizes a hole address into the electrical node it belongs to
 * *before* any wires are added — i.e. the physical wiring rules from spec
 * Part 2.1: a rail is one node along its full length; a terminal-strip
 * column is split into an "upper" node (rows a–e) and a "lower" node
 * (rows f–j), which are never connected to each other by the board itself.
 */
function naturalNodeKey(hole: HoleAddress): string {
  if (hole.kind === "rail") {
    return `rail:${hole.rail}`;
  }
  return `strip:${stripSideOf(hole.row)}:${hole.column}`;
}

/**
 * Electrical model of a solderless breadboard (spec Part 2.1): two pairs of
 * continuous power rails, and terminal-strip columns of 5 holes tied
 * together on each side of the center gap. Placing a wire (or a component
 * pin bridging two holes) merges whichever natural nodes it touches.
 *
 * This models topology only — no visual/pixel layout — and deliberately
 * does not model the physical gap some full-size real breadboards have in
 * the middle of each power rail; spec Part 2.1 specifies rails as
 * continuous along their full length, so that's what this implements.
 */
export class Breadboard {
  private readonly unionFind = new UnionFind();

  /** Number of terminal-strip columns, 1-indexed up to this value. */
  readonly columns: number;

  constructor(columns = 30) {
    if (!Number.isInteger(columns) || columns < 1) {
      throw new RangeError("columns must be a positive integer");
    }
    this.columns = columns;
  }

  private assertValidHole(hole: HoleAddress): void {
    if (hole.kind === "strip") {
      if (
        !Number.isInteger(hole.column) ||
        hole.column < 1 ||
        hole.column > this.columns
      ) {
        throw new RangeError(
          `column ${hole.column} is out of range for a ${this.columns}-column breadboard`
        );
      }
    }
  }

  /** Resolves a hole to its current electrical node id. */
  nodeIdFor(hole: HoleAddress): NodeId {
    this.assertValidHole(hole);
    return this.unionFind.find(naturalNodeKey(hole));
  }

  /** Places a wire (or any direct connection) between two holes, merging
   * their electrical nodes. Idempotent if they're already connected. */
  addWire(from: HoleAddress, to: HoleAddress): void {
    this.assertValidHole(from);
    this.assertValidHole(to);
    this.unionFind.union(naturalNodeKey(from), naturalNodeKey(to));
  }

  /** Whether two holes are currently on the same electrical node, whether
   * by the board's built-in wiring or by an added wire. */
  areConnected(a: HoleAddress, b: HoleAddress): boolean {
    return this.nodeIdFor(a) === this.nodeIdFor(b);
  }
}
