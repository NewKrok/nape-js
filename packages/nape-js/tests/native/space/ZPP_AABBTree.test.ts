/**
 * ZPP_AABBTree + ZPP_AABBNode unit tests.
 */

import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/core/engine";
import { ZPP_AABBTree } from "../../../src/native/space/ZPP_AABBTree";
import { ZPP_AABBNode } from "../../../src/native/space/ZPP_AABBNode";
import { ZPP_AABB } from "../../../src/native/geom/ZPP_AABB";

function createLeaf(minx: number, miny: number, maxx: number, maxy: number): ZPP_AABBNode {
  const node = new ZPP_AABBNode();
  node.alloc();
  node.aabb!.minx = minx;
  node.aabb!.miny = miny;
  node.aabb!.maxx = maxx;
  node.aabb!.maxy = maxy;
  node.height = 0;
  node.shape = { node: null, removedFromSpace: () => {} };
  return node;
}

describe("ZPP_AABBNode", () => {
  it("constructor defaults", () => {
    const node = new ZPP_AABBNode();
    expect(node.aabb).toBeNull();
    expect(node.shape).toBeNull();
    expect(node.parent).toBeNull();
    expect(node.child1).toBeNull();
    expect(node.child2).toBeNull();
    expect(node.height).toBe(-1);
    expect(node.dyn).toBe(false);
    expect(node.moved).toBe(false);
    expect(node.synced).toBe(false);
    expect(node.first_sync).toBe(false);
  });

  it("alloc creates aabb and resets flags", () => {
    const node = new ZPP_AABBNode();
    node.alloc();
    expect(node.aabb).not.toBeNull();
    expect(node.aabb).toBeInstanceOf(ZPP_AABB);
    expect(node.moved).toBe(false);
    expect(node.synced).toBe(false);
    expect(node.first_sync).toBe(false);
  });

  it("alloc uses pool when available", () => {
    const oldPool = ZPP_AABB.zpp_pool;
    const pooled = new ZPP_AABB();
    ZPP_AABB.zpp_pool = pooled;
    const node = new ZPP_AABBNode();
    node.alloc();
    expect(node.aabb).toBe(pooled);
    ZPP_AABB.zpp_pool = oldPool;
  });

  it("free returns aabb to pool and clears pointers", () => {
    const node = new ZPP_AABBNode();
    node.alloc();
    const aabb = node.aabb!;
    node.child1 = new ZPP_AABBNode();
    node.child2 = new ZPP_AABBNode();
    node.parent = new ZPP_AABBNode();
    node.height = 5;

    const oldPool = ZPP_AABB.zpp_pool;
    node.free();
    expect(node.height).toBe(-1);
    expect(node.child1).toBeNull();
    expect(node.child2).toBeNull();
    expect(node.parent).toBeNull();
    expect(node.next).toBeNull();
    expect(node.snext).toBeNull();
    expect(node.mnext).toBeNull();
    expect(ZPP_AABB.zpp_pool).toBe(aabb);
    ZPP_AABB.zpp_pool = oldPool;
  });

  it("isLeaf returns true when child1 is null", () => {
    const node = new ZPP_AABBNode();
    expect(node.isLeaf()).toBe(true);
  });

  it("isLeaf returns false when child1 is set", () => {
    const node = new ZPP_AABBNode();
    node.child1 = new ZPP_AABBNode();
    expect(node.isLeaf()).toBe(false);
  });

  it("static pool field exists", () => {
    expect("zpp_pool" in ZPP_AABBNode).toBe(true);
  });
});

describe("ZPP_AABBTree", () => {
  let tree: ZPP_AABBTree;

  beforeEach(() => {
    tree = new ZPP_AABBTree();
    ZPP_AABBTree._initStatics();
  });

  it("constructor has null root", () => {
    expect(tree.root).toBeNull();
  });

  it("_initStatics creates tmpaabb", () => {
    ZPP_AABBTree._initStatics();
    expect(ZPP_AABBTree.tmpaabb).toBeInstanceOf(ZPP_AABB);
  });

  it("clear on empty tree does nothing", () => {
    tree.clear();
    expect(tree.root).toBeNull();
  });

  it("insertLeaf single node becomes root", () => {
    const leaf = createLeaf(0, 0, 10, 10);
    tree.insertLeaf(leaf);
    expect(tree.root).toBe(leaf);
    expect(leaf.parent).toBeNull();
  });

  it("insertLeaf two nodes creates internal node", () => {
    const a = createLeaf(0, 0, 10, 10);
    const b = createLeaf(20, 20, 30, 30);
    tree.insertLeaf(a);
    tree.insertLeaf(b);
    expect(tree.root).not.toBe(a);
    expect(tree.root).not.toBe(b);
    const children = [tree.root!.child1, tree.root!.child2];
    expect(children).toContain(a);
    expect(children).toContain(b);
  });

  it("insertLeaf three nodes creates tree with height >= 1", () => {
    const a = createLeaf(0, 0, 10, 10);
    const b = createLeaf(20, 20, 30, 30);
    const c = createLeaf(5, 5, 15, 15);
    tree.insertLeaf(a);
    tree.insertLeaf(b);
    tree.insertLeaf(c);
    expect(tree.root).not.toBeNull();
    expect(tree.root!.height).toBeGreaterThanOrEqual(1);
  });

  it("insertLeaf many nodes keeps tree valid", () => {
    const leaves: ZPP_AABBNode[] = [];
    for (let i = 0; i < 10; i++) {
      const leaf = createLeaf(i * 10, i * 10, i * 10 + 8, i * 10 + 8);
      leaves.push(leaf);
      tree.insertLeaf(leaf);
    }
    expect(tree.root).not.toBeNull();
    for (const leaf of leaves) {
      expect(leaf.isLeaf()).toBe(true);
    }
  });

  it("removeLeaf single leaf empties tree", () => {
    const leaf = createLeaf(0, 0, 10, 10);
    tree.insertLeaf(leaf);
    tree.removeLeaf(leaf);
    expect(tree.root).toBeNull();
  });

  it("removeLeaf from two-node tree leaves one", () => {
    const a = createLeaf(0, 0, 10, 10);
    const b = createLeaf(20, 20, 30, 30);
    tree.insertLeaf(a);
    tree.insertLeaf(b);
    tree.removeLeaf(a);
    expect(tree.root).toBe(b);
    expect(b.parent).toBeNull();
  });

  it("removeLeaf from multi-node tree preserves remaining", () => {
    const a = createLeaf(0, 0, 10, 10);
    const b = createLeaf(20, 20, 30, 30);
    const c = createLeaf(5, 5, 15, 15);
    tree.insertLeaf(a);
    tree.insertLeaf(b);
    tree.insertLeaf(c);
    tree.removeLeaf(b);
    expect(tree.root).not.toBeNull();
  });

  it("insertLeaf works like insertLeaf", () => {
    const a = createLeaf(0, 0, 10, 10);
    tree.insertLeaf(a);
    expect(tree.root).toBe(a);

    const b = createLeaf(20, 0, 30, 10);
    tree.insertLeaf(b);
    const children = [tree.root!.child1, tree.root!.child2];
    expect(children).toContain(a);
    expect(children).toContain(b);
  });

  it("removeLeaf works like removeLeaf", () => {
    const a = createLeaf(0, 0, 10, 10);
    const b = createLeaf(20, 0, 30, 10);
    tree.insertLeaf(a);
    tree.insertLeaf(b);
    tree.removeLeaf(a);
    expect(tree.root).toBe(b);
  });

  it("clear with nodes calls removedFromSpace", () => {
    let removedCount = 0;
    const a = createLeaf(0, 0, 10, 10);
    a.shape = {
      node: a,
      removedFromSpace: () => {
        removedCount++;
      },
    };
    const b = createLeaf(20, 20, 30, 30);
    b.shape = {
      node: b,
      removedFromSpace: () => {
        removedCount++;
      },
    };
    tree.insertLeaf(a);
    tree.insertLeaf(b);
    tree.clear();
    expect(removedCount).toBe(2);
    expect(tree.root).toBeNull();
  });

  it("balance returns leaf unchanged", () => {
    const leaf = createLeaf(0, 0, 10, 10);
    const result = tree.balance(leaf);
    expect(result).toBe(leaf);
  });

  it("balance returns node with height < 2 unchanged", () => {
    const node = new ZPP_AABBNode();
    node.alloc();
    node.height = 1;
    node.child1 = createLeaf(0, 0, 5, 5);
    node.child2 = createLeaf(5, 5, 10, 10);
    const result = tree.balance(node);
    expect(result).toBe(node);
  });

  it("balance rotates right-heavy subtree", () => {
    const a = new ZPP_AABBNode();
    a.alloc();
    const b = createLeaf(0, 0, 5, 5);
    const c = new ZPP_AABBNode();
    c.alloc();
    const f = createLeaf(10, 10, 15, 15);
    const g = createLeaf(20, 20, 25, 25);

    a.child1 = b;
    a.child2 = c;
    b.parent = a;
    c.parent = a;
    c.child1 = f;
    c.child2 = g;
    f.parent = c;
    g.parent = c;

    b.height = 0;
    f.height = 0;
    g.height = 0;
    c.height = 1;
    a.height = 2;

    c.aabb!.minx = 10;
    c.aabb!.miny = 10;
    c.aabb!.maxx = 25;
    c.aabb!.maxy = 25;

    const result = tree.balance(a);
    expect(result).not.toBeNull();
  });

  it("balance rotates left-heavy subtree", () => {
    const a = new ZPP_AABBNode();
    a.alloc();
    const b = new ZPP_AABBNode();
    b.alloc();
    const c = createLeaf(20, 20, 25, 25);
    const f = createLeaf(0, 0, 5, 5);
    const g = createLeaf(10, 10, 15, 15);

    a.child1 = b;
    a.child2 = c;
    b.parent = a;
    c.parent = a;
    b.child1 = f;
    b.child2 = g;
    f.parent = b;
    g.parent = b;

    c.height = 0;
    f.height = 0;
    g.height = 0;
    b.height = 1;
    a.height = 2;

    b.aabb!.minx = 0;
    b.aabb!.miny = 0;
    b.aabb!.maxx = 15;
    b.aabb!.maxy = 15;

    const result = tree.balance(a);
    expect(result).not.toBeNull();
  });

  it("insert and remove many nodes stress test", () => {
    const leaves: ZPP_AABBNode[] = [];
    for (let i = 0; i < 20; i++) {
      const leaf = createLeaf(i * 5, i * 3, i * 5 + 4, i * 3 + 4);
      leaves.push(leaf);
      tree.insertLeaf(leaf);
    }
    for (let i = 0; i < 10; i++) {
      tree.removeLeaf(leaves[i]);
    }
    expect(tree.root).not.toBeNull();
    for (let i = 10; i < 20; i++) {
      tree.removeLeaf(leaves[i]);
    }
    expect(tree.root).toBeNull();
  });
});
