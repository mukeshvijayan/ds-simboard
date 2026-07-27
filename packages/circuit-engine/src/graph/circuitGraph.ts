/**
 * A resolved electrical node id — every hole/pin that is guaranteed to sit
 * at the same potential shares one `NodeId`. Produced by things like
 * {@link Breadboard.nodeIdFor}; opaque to `CircuitGraph` itself.
 */
export type NodeId = string;

/**
 * A two-terminal circuit element connecting two nodes (a resistor, a wire,
 * an LED, a voltage source, ...). `CircuitGraph` only knows about the
 * topology (which nodes an element touches) — electrical behavior
 * (resistance, forward voltage, health state) is the concern of
 * `packages/component-library` (Phase 3), not this package.
 */
export interface CircuitElement {
  id: string;
  nodeA: NodeId;
  nodeB: NodeId;
}

/**
 * A framework-agnostic graph of circuit elements over electrical nodes.
 * Nodes are not stored as separate objects — a node is just any `NodeId`
 * referenced by at least one element's `nodeA`/`nodeB`.
 */
export class CircuitGraph {
  private readonly elements = new Map<string, CircuitElement>();

  /** Adds an element. Throws if an element with the same id already exists. */
  addElement(element: CircuitElement): void {
    if (this.elements.has(element.id)) {
      throw new RangeError(`circuit already has an element with id "${element.id}"`);
    }
    this.elements.set(element.id, element);
  }

  /** Removes an element by id. No-op if it isn't present. */
  removeElement(id: string): void {
    this.elements.delete(id);
  }

  /** Looks up a single element by id. */
  getElement(id: string): CircuitElement | undefined {
    return this.elements.get(id);
  }

  /** Every element currently in the graph. */
  get allElements(): CircuitElement[] {
    return Array.from(this.elements.values());
  }

  /** Every element with a terminal at `nodeId`. */
  elementsAtNode(nodeId: NodeId): CircuitElement[] {
    return this.allElements.filter((el) => el.nodeA === nodeId || el.nodeB === nodeId);
  }

  /** Every distinct node referenced by at least one element. */
  get nodeIds(): NodeId[] {
    const ids = new Set<NodeId>();
    for (const el of this.allElements) {
      ids.add(el.nodeA);
      ids.add(el.nodeB);
    }
    return Array.from(ids);
  }
}
