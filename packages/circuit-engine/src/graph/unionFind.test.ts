import { UnionFind } from "./unionFind";

describe("UnionFind", () => {
  it("returns a key as its own representative before any union", () => {
    const uf = new UnionFind();
    expect(uf.find("a")).toBe("a");
  });

  it("treats two never-unioned keys as not connected", () => {
    const uf = new UnionFind();
    expect(uf.connected("a", "b")).toBe(false);
  });

  it("connects two keys after a union", () => {
    const uf = new UnionFind();
    uf.union("a", "b");
    expect(uf.connected("a", "b")).toBe(true);
    expect(uf.find("a")).toBe(uf.find("b"));
  });

  it("is transitive across chained unions", () => {
    const uf = new UnionFind();
    uf.union("a", "b");
    uf.union("b", "c");
    expect(uf.connected("a", "c")).toBe(true);
  });

  it("does not connect unrelated groups", () => {
    const uf = new UnionFind();
    uf.union("a", "b");
    uf.union("x", "y");
    expect(uf.connected("a", "x")).toBe(false);
    expect(uf.connected("b", "y")).toBe(false);
  });

  it("is idempotent when unioning already-connected keys", () => {
    const uf = new UnionFind();
    uf.union("a", "b");
    uf.union("b", "a");
    expect(uf.connected("a", "b")).toBe(true);
  });

  it("keeps working correctly after path compression across repeated finds", () => {
    const uf = new UnionFind();
    uf.union("a", "b");
    uf.union("b", "c");
    uf.union("c", "d");
    // Force path compression on a long chain, then verify it's still correct.
    uf.find("a");
    uf.find("d");
    expect(uf.connected("a", "d")).toBe(true);
    expect(uf.find("a")).toBe(uf.find("b"));
    expect(uf.find("b")).toBe(uf.find("c"));
    expect(uf.find("c")).toBe(uf.find("d"));
  });
});
