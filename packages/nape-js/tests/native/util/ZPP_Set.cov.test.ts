/**
 * ZPP_Set — red-black tree set: operations, ordered iteration, node pooling
 * (issue #167).
 *
 * Colour encoding (Haxe nape): 1 = black, 0 = red. Transient values (-1, 2)
 * only appear inside remove_node's rebalancing and must never survive an
 * operation. Each ZPP_Set subclass keeps its own node pool, so the tests use
 * one concrete subclass and reset its pool between tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/index";
import { ZPP_Set } from "../../../src/native/util/ZPP_Set";
import { ZPP_Set_ZPP_Body, ZPP_Set_ZPP_SimpleEvent } from "../../../src/native/util/ZNPRegistry";

type NumSet = ZPP_Set<number>;

function makeSet(): NumSet {
  const s = new ZPP_Set_ZPP_Body() as unknown as NumSet;
  s.lt = (a, b) => a < b;
  return s;
}

/** Deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-order traversal using successor_node, starting from the minimum. */
function inOrder(set: NumSet): number[] {
  const out: number[] = [];
  if (set.parent == null) return out;
  let cur: NumSet | null = set.parent;
  while (cur.prev != null) cur = cur.prev;
  while (cur != null) {
    out.push(cur.data!);
    if (out.length > 100_000) throw new Error("cycle");
    cur = set.successor_node(cur);
  }
  return out;
}

/** Reverse traversal using predecessor_node, starting from the maximum. */
function reverseOrder(set: NumSet): number[] {
  const out: number[] = [];
  if (set.parent == null) return out;
  let cur: NumSet | null = set.parent;
  while (cur.next != null) cur = cur.next;
  while (cur != null) {
    out.push(cur.data!);
    if (out.length > 100_000) throw new Error("cycle");
    cur = set.predecessor_node(cur);
  }
  return out;
}

/** Validate red-black + BST + parent-pointer invariants; returns node count. */
function checkRB(set: NumSet): number {
  const root = set.parent;
  if (root == null) return 0;
  expect(root.parent).toBeNull();
  expect(root.colour).toBe(1);
  let count = 0;
  const visit = (n: NumSet | null, lo: number, hi: number): number => {
    if (n == null) return 1;
    count++;
    expect(n.colour === 0 || n.colour === 1).toBe(true);
    expect(n.data! >= lo && n.data! <= hi).toBe(true);
    if (n.prev) expect(n.prev.parent).toBe(n);
    if (n.next) expect(n.next.parent).toBe(n);
    if (n.colour === 0) {
      expect(n.prev == null || n.prev.colour === 1).toBe(true);
      expect(n.next == null || n.next.colour === 1).toBe(true);
    }
    const l = visit(n.prev, lo, n.data!);
    const r = visit(n.next, n.data!, hi);
    expect(l).toBe(r);
    return l + (n.colour === 1 ? 1 : 0);
  };
  visit(root, -Infinity, Infinity);
  return count;
}

function poolSize(Cls: { zpp_pool: any }): number {
  let n = 0;
  let cur = Cls.zpp_pool;
  while (cur != null) {
    n++;
    if (n > 100_000) throw new Error("pool cycle");
    cur = cur.next;
  }
  return n;
}

describe("ZPP_Set (red-black tree) — coverage", () => {
  beforeEach(() => {
    ZPP_Set_ZPP_Body.zpp_pool = null;
    ZPP_Set_ZPP_SimpleEvent.zpp_pool = null;
  });

  it("ascending, descending and zig-zag inserts keep RB invariants and sorted order", () => {
    for (const seq of [
      Array.from({ length: 64 }, (_, i) => i),
      Array.from({ length: 64 }, (_, i) => 63 - i),
      Array.from({ length: 64 }, (_, i) => (i % 2 ? 100 - i : i)),
    ]) {
      const s = makeSet();
      for (const v of seq) {
        s.insert(v);
        checkRB(s);
      }
      const sorted = [...seq].sort((a, b) => a - b);
      expect(inOrder(s)).toEqual(sorted);
      expect(reverseOrder(s)).toEqual([...sorted].reverse());
      expect(s.first()).toBe(sorted[0]);
    }
  });

  it("randomised insert/remove/pop_front matches a reference model", () => {
    const rand = rng(167);
    const s = makeSet();
    const model = new Set<number>();
    for (let step = 0; step < 4000; step++) {
      const r = rand();
      const v = Math.floor(rand() * 300);
      if (r < 0.45) {
        const added = s.try_insert_bool(v);
        expect(added).toBe(!model.has(v));
        model.add(v);
      } else if (r < 0.55) {
        const node = s.try_insert(v);
        expect(node!.data).toBe(v);
        model.add(v);
      } else if (r < 0.85) {
        if (model.has(v)) {
          s.remove(v);
          model.delete(v);
        }
        expect(s.has(v)).toBe(false);
      } else if (model.size > 0) {
        const min = Math.min(...model);
        expect(s.pop_front()).toBe(min);
        model.delete(min);
      }
      if (step % 50 === 0) {
        expect(checkRB(s)).toBe(model.size);
        expect(inOrder(s)).toEqual([...model].sort((a, b) => a - b));
      }
    }
    expect(checkRB(s)).toBe(model.size);
    expect(s.empty()).toBe(model.size === 0);
  });

  it("removing every element in random order drains the tree and pools every node", () => {
    const rand = rng(42);
    const s = makeSet();
    const vals = Array.from({ length: 200 }, (_, i) => i * 3);
    for (const v of vals) s.insert(v);
    const order = [...vals].sort(() => rand() - 0.5);
    for (let i = 0; i < order.length; i++) {
      s.remove(order[i]);
      expect(checkRB(s)).toBe(order.length - i - 1);
    }
    expect(s.empty()).toBe(true);
    expect(s.parent).toBeNull();
    expect(poolSize(ZPP_Set_ZPP_Body)).toBe(200);
  });

  it("pooled nodes are scrubbed and reused for the next inserts (no new allocations)", () => {
    const s = makeSet();
    for (let i = 0; i < 20; i++) s.insert(i);
    s.clear();
    expect(s.empty()).toBe(true);
    expect(poolSize(ZPP_Set_ZPP_Body)).toBe(20);
    // Every pooled node had its payload and callbacks dropped.
    let cur: any = ZPP_Set_ZPP_Body.zpp_pool;
    const pooled = new Set<any>();
    while (cur != null) {
      expect(cur.data).toBeNull();
      expect(cur.lt).toBeNull();
      expect(cur.swapped).toBeNull();
      pooled.add(cur);
      cur = cur.next;
    }
    const nodes: any[] = [];
    for (let i = 0; i < 20; i++) nodes.push(s.insert(100 + i));
    for (const n of nodes) expect(pooled.has(n)).toBe(true);
    expect(poolSize(ZPP_Set_ZPP_Body)).toBe(0);
    expect(inOrder(s)).toEqual(Array.from({ length: 20 }, (_, i) => 100 + i));
    checkRB(s);
    // Pool depleted → a fresh node is constructed.
    const extra = s.insert(999);
    expect(pooled.has(extra)).toBe(false);
  });

  it("subclass pools are independent", () => {
    const a = makeSet();
    const b = new ZPP_Set_ZPP_SimpleEvent() as unknown as NumSet;
    b.lt = (x, y) => x < y;
    a.insert(1);
    a.insert(2);
    a.clear();
    expect(poolSize(ZPP_Set_ZPP_Body)).toBe(2);
    expect(poolSize(ZPP_Set_ZPP_SimpleEvent)).toBe(0);
    const n = b.insert(5);
    expect(n).toBeInstanceOf(ZPP_Set_ZPP_SimpleEvent);
    expect(poolSize(ZPP_Set_ZPP_Body)).toBe(2);
  });

  it("clear() on an empty set is a no-op", () => {
    const s = makeSet();
    s.clear();
    expect(s.empty()).toBe(true);
    expect(poolSize(ZPP_Set_ZPP_Body)).toBe(0);
  });

  it("insert() accepts duplicates (multiset); try_insert/try_insert_bool do not", () => {
    const s = makeSet();
    s.insert(5);
    s.insert(5);
    s.insert(5);
    expect(inOrder(s)).toEqual([5, 5, 5]);
    checkRB(s);

    const t = makeSet();
    const n1 = t.try_insert(5);
    const n2 = t.try_insert(5);
    expect(n2).toBe(n1);
    expect(t.try_insert_bool(5)).toBe(false);
    expect(inOrder(t)).toEqual([5]);
  });

  it("try_insert on deep trees returns the existing node for duplicates", () => {
    const s = makeSet();
    const nodes = new Map<number, any>();
    for (const v of [50, 25, 75, 10, 30, 60, 90, 5, 15, 27, 35]) nodes.set(v, s.try_insert(v));
    for (const [v, node] of nodes) expect(s.try_insert(v)).toBe(node);
    expect(checkRB(s)).toBe(nodes.size);
  });

  it("swapped() is told about data exchanged between nodes during removal", () => {
    const s = makeSet();
    const swaps: [number, number][] = [];
    s.swapped = (a, b) => swaps.push([a, b]);
    for (let i = 0; i < 31; i++) s.insert(i);
    // Removing an internal node with two children swaps it with its successor.
    const root = s.parent!.data!;
    s.remove(root);
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps[0][1]).toBe(root);
    expect(swaps[0][0]).toBeGreaterThan(root);
    expect(inOrder(s)).not.toContain(root);
    checkRB(s);
  });

  it("swapped() also fires during insertion rotations of a randomised workload", () => {
    const rand = rng(7);
    const s = makeSet();
    let swaps = 0;
    s.swapped = () => swaps++;
    const model = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = Math.floor(rand() * 500);
      if (rand() < 0.6) {
        s.try_insert_bool(v);
        model.add(v);
      } else if (model.has(v)) {
        s.remove(v);
        model.delete(v);
      }
    }
    expect(swaps).toBeGreaterThan(0);
    expect(inOrder(s)).toEqual([...model].sort((a, b) => a - b));
    expect(checkRB(s)).toBe(model.size);
  });

  it("find_weak locates by ordering (not identity) and returns null when absent", () => {
    const s = new ZPP_Set_ZPP_Body() as unknown as ZPP_Set<{ k: number }>;
    s.lt = (a, b) => a.k < b.k;
    const items = [3, 1, 4, 1.5, 9, 2.6].map((k) => ({ k }));
    for (const it of items) s.insert(it);
    const probe = { k: 4 };
    expect(s.find(probe)).toBeNull(); // identity-based
    expect(s.find_weak(probe)!.data).toBe(items[2]);
    expect(s.find_weak({ k: 100 })).toBeNull();
    expect(s.has(items[4])).toBe(true);
  });

  it("singular() is true only for one-element sets", () => {
    const s = makeSet();
    expect(s.singular()).toBe(false);
    s.insert(1);
    expect(s.singular()).toBe(true);
    s.insert(0);
    expect(s.singular()).toBe(false);
    s.remove(1);
    expect(s.singular()).toBe(true);
    s.insert(2);
    expect(s.singular()).toBe(false);
  });

  it("successor/predecessor of the extremes are null", () => {
    const s = makeSet();
    for (const v of [4, 2, 6, 1, 3, 5, 7]) s.insert(v);
    let min: NumSet = s.parent!;
    while (min.prev) min = min.prev;
    let max: NumSet = s.parent!;
    while (max.next) max = max.next;
    expect(s.predecessor_node(min)).toBeNull();
    expect(s.successor_node(max)).toBeNull();
    expect(s.successor_node(min)!.data).toBe(2);
    expect(s.predecessor_node(max)!.data).toBe(6);
  });

  it("free() drops payload and callbacks", () => {
    const s = makeSet();
    s.data = 3;
    s.swapped = () => {};
    s.free();
    expect(s.data).toBeNull();
    expect(s.lt).toBeNull();
    expect(s.swapped).toBeNull();
  });

  it("a comparator that throws mid-insert leaves the tree valid and the pool untouched", () => {
    const s = makeSet();
    for (const v of [10, 20, 30, 40, 50]) s.insert(v);
    s.clear();
    for (const v of [10, 20, 30, 40, 50]) s.insert(v);
    const poolBefore = poolSize(ZPP_Set_ZPP_Body);
    const good = s.lt!;
    s.lt = (a, b) => {
      if (a === 35 || b === 35) throw new Error("boom");
      return good(a, b);
    };
    expect(() => s.try_insert_bool(35)).toThrow("boom");
    expect(() => s.try_insert(35)).toThrow("boom");
    s.lt = good;
    expect(poolSize(ZPP_Set_ZPP_Body)).toBe(poolBefore);
    expect(inOrder(s)).toEqual([10, 20, 30, 40, 50]);
    expect(checkRB(s)).toBe(5);
    // The set continues to work after the failure.
    s.insert(35);
    expect(inOrder(s)).toEqual([10, 20, 30, 35, 40, 50]);
    checkRB(s);
  });
});
