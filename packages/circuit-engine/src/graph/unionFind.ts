/**
 * A disjoint-set (union-find) structure over arbitrary string keys, with
 * path compression. Used by {@link Breadboard} to merge electrical nodes
 * when a wire joins two holes that weren't already the same node.
 *
 * Union-by-rank is deliberately omitted: breadboard-sized inputs (at most a
 * few hundred holes) make the extra bookkeeping not worth it — path
 * compression alone keeps `find` effectively constant-time here.
 */
export class UnionFind {
  private readonly parent = new Map<string, string>();

  private ensure(key: string): string {
    if (!this.parent.has(key)) {
      this.parent.set(key, key);
    }
    return key;
  }

  /** Returns the canonical representative key for the set containing `key`. */
  find(key: string): string {
    this.ensure(key);
    let root = key;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root) as string;
    }
    let current = key;
    while (this.parent.get(current) !== root) {
      const next = this.parent.get(current) as string;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  /** Merges the sets containing `a` and `b` into one set. */
  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootA, rootB);
    }
  }

  /** Whether `a` and `b` are currently in the same set. */
  connected(a: string, b: string): boolean {
    return this.find(a) === this.find(b);
  }
}
