/**
 * ZPP_AABBTree — direct structural tests.
 *
 * Inserts / removes leaves in seeded random order and after every batch checks
 * the tree invariants (parent links, exact union AABBs, heights, balance) and
 * that a pruned overlap query over the tree returns exactly the brute-force set.
 * Also drives every rotation case of `balance()` on hand-built unbalanced trees.
 */
import "../../src/index";
import { describe, it, expect } from "vitest";
import { ZPP_AABBTree } from "../../src/native/space/ZPP_AABBTree";
import { ZPP_AABBNode } from "../../src/native/space/ZPP_AABBNode";
import { ZPP_AABB } from "../../src/native/geom/ZPP_AABB";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

if (ZPP_AABBTree.tmpaabb == null) ZPP_AABBTree._initStatics();

let nextId = 0;

function makeLeaf(minx: number, miny: number, maxx: number, maxy: number): ZPP_AABBNode {
  const n = new ZPP_AABBNode();
  n.aabb = new ZPP_AABB();
  n.aabb.minx = minx;
  n.aabb.miny = miny;
  n.aabb.maxx = maxx;
  n.aabb.maxy = maxy;
  n.height = 0;
  const id = nextId++;
  n.shape = {
    id,
    node: n,
    removed: 0,
    removedFromSpace() {
      this.removed++;
    },
  };
  return n;
}

function randomLeaf(rng: () => number): ZPP_AABBNode {
  const big = rng() < 0.05;
  const tiny = rng() < 0.1;
  const w = big ? 500 + rng() * 2000 : tiny ? 1e-3 + rng() * 0.01 : 1 + rng() * 40;
  const h = big ? 500 + rng() * 2000 : tiny ? 1e-3 + rng() * 0.01 : 1 + rng() * 40;
  const x = (rng() - 0.5) * 2000;
  const y = (rng() - 0.5) * 2000;
  return makeLeaf(x, y, x + w, y + h);
}

/** Validates structure; returns the set of leaves reachable from root. */
function checkTree(tree: ZPP_AABBTree): Set<ZPP_AABBNode> {
  const leaves = new Set<ZPP_AABBNode>();
  if (tree.root == null) return leaves;
  expect(tree.root.parent).toBeNull();
  const visit = (n: ZPP_AABBNode): number => {
    if (n.child1 == null) {
      expect(n.child2).toBeNull();
      expect(n.height).toBe(0);
      expect(leaves.has(n)).toBe(false);
      leaves.add(n);
      return 0;
    }
    const c1 = n.child1;
    const c2 = n.child2!;
    expect(c2).not.toBeNull();
    expect(c1.parent).toBe(n);
    expect(c2.parent).toBe(n);
    const h1 = visit(c1);
    const h2 = visit(c2);
    expect(n.height).toBe(1 + Math.max(h1, h2));
    expect(Math.abs(h1 - h2)).toBeLessThanOrEqual(2);
    const a = n.aabb!;
    expect(a.minx).toBe(Math.min(c1.aabb!.minx, c2.aabb!.minx));
    expect(a.miny).toBe(Math.min(c1.aabb!.miny, c2.aabb!.miny));
    expect(a.maxx).toBe(Math.max(c1.aabb!.maxx, c2.aabb!.maxx));
    expect(a.maxy).toBe(Math.max(c1.aabb!.maxy, c2.aabb!.maxy));
    return n.height;
  };
  visit(tree.root);
  return leaves;
}

function overlaps(a: ZPP_AABB, q: number[]): boolean {
  return a.minx <= q[2] && q[0] <= a.maxx && a.miny <= q[3] && q[1] <= a.maxy;
}

function queryTree(tree: ZPP_AABBTree, q: number[]): number[] {
  const out: number[] = [];
  const stack: ZPP_AABBNode[] = tree.root ? [tree.root] : [];
  while (stack.length) {
    const n = stack.pop()!;
    if (!overlaps(n.aabb!, q)) continue;
    if (n.child1 == null) out.push(n.shape.id);
    else stack.push(n.child1, n.child2!);
  }
  return out.sort((a, b) => a - b);
}

describe("ZPP_AABBTree insert/remove", () => {
  it("random inserts and removals keep invariants and exact overlap queries", () => {
    for (const seed of [1, 2, 3, 4]) {
      const rng = mulberry32(seed);
      const tree = new ZPP_AABBTree();
      const live: ZPP_AABBNode[] = [];
      for (let op = 0; op < 900; op++) {
        // grow to ~150 leaves, then churn, then shrink to empty
        const phase = op < 300 ? 0.8 : op < 600 ? 0.5 : 0.15;
        if (live.length === 0 || rng() < phase) {
          const leaf = randomLeaf(rng);
          tree.insertLeaf(leaf);
          live.push(leaf);
        } else {
          const i = Math.floor(rng() * live.length);
          const leaf = live[i];
          live[i] = live[live.length - 1];
          live.pop();
          tree.removeLeaf(leaf);
          leaf.parent = null;
        }
        if (op % 30 === 0 || op > 880) {
          const leaves = checkTree(tree);
          expect(leaves.size).toBe(live.length);
          for (const l of live) expect(leaves.has(l)).toBe(true);
          if (live.length > 1) {
            // a reasonably balanced tree
            expect(tree.root!.height).toBeLessThanOrEqual(
              2 * Math.ceil(Math.log2(live.length)) + 2,
            );
          }
          for (let k = 0; k < 5; k++) {
            const x = (rng() - 0.5) * 2200;
            const y = (rng() - 0.5) * 2200;
            const q = [x, y, x + rng() * 400, y + rng() * 400];
            const brute = live
              .filter((l) => overlaps(l.aabb!, q))
              .map((l) => l.shape.id)
              .sort((a, b) => a - b);
            expect(queryTree(tree, q)).toEqual(brute);
          }
        }
      }
      // drain whatever is left
      while (live.length) {
        tree.removeLeaf(live.pop()!);
      }
      expect(tree.root).toBeNull();
    }
  });

  it("sorted (degenerate-order) insertion still produces a balanced tree", () => {
    const tree = new ZPP_AABBTree();
    const leaves: ZPP_AABBNode[] = [];
    for (let i = 0; i < 256; i++) {
      const l = makeLeaf(i * 10, 0, i * 10 + 5, 5);
      tree.insertLeaf(l);
      leaves.push(l);
    }
    expect(checkTree(tree).size).toBe(256);
    expect(tree.root!.height).toBeLessThanOrEqual(12);
    // remove every other one from the left
    for (let i = 0; i < 256; i += 2) tree.removeLeaf(leaves[i]);
    expect(checkTree(tree).size).toBe(128);
    expect(queryTree(tree, [0, 0, 100, 5])).toEqual(
      leaves
        .filter((_, i) => i % 2 === 1 && i * 10 <= 100)
        .map((l) => l.shape.id)
        .sort((a, b) => a - b),
    );
  });

  it("clear() releases every leaf's shape exactly once and empties the tree", () => {
    const rng = mulberry32(42);
    const tree = new ZPP_AABBTree();
    tree.clear(); // empty tree: no-op
    expect(tree.root).toBeNull();
    const leaves: ZPP_AABBNode[] = [];
    for (let i = 0; i < 60; i++) {
      const l = randomLeaf(rng);
      tree.insertLeaf(l);
      leaves.push(l);
    }
    const shapes = leaves.map((l) => l.shape);
    tree.clear();
    expect(tree.root).toBeNull();
    for (const s of shapes) {
      expect(s.removed).toBe(1);
      expect(s.node).toBeNull();
    }
    for (const l of leaves) expect(l.shape).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// balance()
// ---------------------------------------------------------------------------

function internal(c1: ZPP_AABBNode, c2: ZPP_AABBNode): ZPP_AABBNode {
  const n = new ZPP_AABBNode();
  n.aabb = new ZPP_AABB();
  n.child1 = c1;
  n.child2 = c2;
  c1.parent = n;
  c2.parent = n;
  n.aabb.minx = Math.min(c1.aabb!.minx, c2.aabb!.minx);
  n.aabb.miny = Math.min(c1.aabb!.miny, c2.aabb!.miny);
  n.aabb.maxx = Math.max(c1.aabb!.maxx, c2.aabb!.maxx);
  n.aabb.maxy = Math.max(c1.aabb!.maxy, c2.aabb!.maxy);
  n.height = 1 + Math.max(c1.height, c2.height);
  return n;
}

let lx = 0;
function L(): ZPP_AABBNode {
  lx += 7;
  return makeLeaf(lx, -lx, lx + 3, -lx + 2);
}

/** A subtree of exact height h (h>=0). */
function chain(h: number): ZPP_AABBNode {
  if (h === 0) return L();
  return internal(chain(h - 1), h >= 2 ? chain(h - 2) : L());
}

function leafIds(n: ZPP_AABBNode | null): number[] {
  if (n == null) return [];
  if (n.child1 == null) return [n.shape.id];
  return [...leafIds(n.child1), ...leafIds(n.child2)].sort((a, b) => a - b);
}

/** Structural check for an arbitrary subtree (balance may leave slight imbalance). */
function checkSubtree(n: ZPP_AABBNode): void {
  if (n.child1 == null) return;
  const c1 = n.child1;
  const c2 = n.child2!;
  expect(c1.parent).toBe(n);
  expect(c2.parent).toBe(n);
  checkSubtree(c1);
  checkSubtree(c2);
  expect(n.height).toBe(1 + Math.max(c1.height, c2.height));
  expect(n.aabb!.minx).toBe(Math.min(c1.aabb!.minx, c2.aabb!.minx));
  expect(n.aabb!.miny).toBe(Math.min(c1.aabb!.miny, c2.aabb!.miny));
  expect(n.aabb!.maxx).toBe(Math.max(c1.aabb!.maxx, c2.aabb!.maxx));
  expect(n.aabb!.maxy).toBe(Math.max(c1.aabb!.maxy, c2.aabb!.maxy));
}

describe("ZPP_AABBTree.balance", () => {
  it("returns leaves and low subtrees unchanged", () => {
    const tree = new ZPP_AABBTree();
    const leaf = L();
    expect(tree.balance(leaf)).toBe(leaf);
    const small = internal(L(), L());
    expect(tree.balance(small)).toBe(small);
    // height >= 2 but already balanced
    const bal = internal(internal(L(), L()), internal(L(), L()));
    expect(tree.balance(bal)).toBe(bal);
  });

  // cases: [rightHeavy, innerTaller]
  const cases: Array<[string, boolean, boolean]> = [
    ["right-heavy, outer grandchild taller", true, true],
    ["right-heavy, inner grandchild taller", true, false],
    ["left-heavy, outer grandchild taller", false, true],
    ["left-heavy, inner grandchild taller", false, false],
  ];
  for (const [label, rightHeavy, firstTaller] of cases) {
    for (const position of ["root", "child1", "child2"] as const) {
      it(`rotates ${label} subtree at ${position}`, () => {
        const tree = new ZPP_AABBTree();
        // heavy side: height 3 with one grandchild of height 2, the other 1
        const g1 = firstTaller ? chain(2) : chain(1);
        const g2 = firstTaller ? chain(1) : chain(2);
        const heavy = internal(g1, g2);
        const light = L(); // height 0 → imbalance 3 - 0 > 1
        const a = rightHeavy ? internal(light, heavy) : internal(heavy, light);
        const before = leafIds(a);
        let parent: ZPP_AABBNode | null = null;
        if (position === "root") {
          tree.root = a;
        } else {
          const sibling = chain(3);
          parent = position === "child1" ? internal(a, sibling) : internal(sibling, a);
          tree.root = parent;
        }
        const nr = tree.balance(a);
        expect(nr).toBe(heavy);
        expect(nr.parent).toBe(parent);
        if (position === "root") expect(tree.root).toBe(nr);
        else {
          expect(tree.root).toBe(parent);
          if (position === "child1") expect(parent!.child1).toBe(nr);
          else expect(parent!.child2).toBe(nr);
        }
        expect(leafIds(nr)).toEqual(before);
        checkSubtree(nr);
        // the rotation reduced the height by one
        expect(nr.height).toBe(3);
        expect(Math.abs(nr.child1!.height - nr.child2!.height)).toBeLessThanOrEqual(1);
      });
    }
  }
});
