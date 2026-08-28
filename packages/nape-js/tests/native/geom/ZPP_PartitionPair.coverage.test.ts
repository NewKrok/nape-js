import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/core/engine";
import { ZPP_PartitionPair } from "../../../src/native/geom/ZPP_PartitionPair";

/**
 * Coverage tests for ZPP_PartitionPair.
 *
 * Exercises linked-list operations (add, remove, insert, pop, erase, splice,
 * reverse, has, front, back, at, iterator_at, empty, size, clear) and the
 * static get() factory, edge_swap, edge_lt.
 */

// Mock vertex objects with an `id` field (what ZPP_PartitionPair.get expects)
function mockVertex(id: number) {
  return { id };
}

describe("ZPP_PartitionPair", () => {
  // Clear the pool before each test to avoid cross-test interference
  beforeEach(() => {
    ZPP_PartitionPair.zpp_pool = null;
  });

  // ---------------------------------------------------------------------------
  // Static get() factory
  // ---------------------------------------------------------------------------

  describe("static get()", () => {
    it("creates a pair from two vertices with a.id < b.id", () => {
      const va = mockVertex(1);
      const vb = mockVertex(5);
      const pair = ZPP_PartitionPair.get(va, vb);
      expect(pair.a).toBe(va);
      expect(pair.b).toBe(vb);
      expect(pair.id).toBe(1);
      expect(pair.di).toBe(5);
    });

    it("creates a pair from two vertices with a.id > b.id (swaps id/di)", () => {
      const va = mockVertex(10);
      const vb = mockVertex(3);
      const pair = ZPP_PartitionPair.get(va, vb);
      expect(pair.a).toBe(va);
      expect(pair.b).toBe(vb);
      expect(pair.id).toBe(3);
      expect(pair.di).toBe(10);
    });

    it("creates a pair from two vertices with equal ids", () => {
      const va = mockVertex(7);
      const vb = mockVertex(7);
      const pair = ZPP_PartitionPair.get(va, vb);
      expect(pair.id).toBe(7);
      expect(pair.di).toBe(7);
    });

    it("reuses pooled instances when available", () => {
      const p1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      // Return p1 to the pool
      p1.next = ZPP_PartitionPair.zpp_pool;
      ZPP_PartitionPair.zpp_pool = p1;

      const p2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(4));
      expect(p2).toBe(p1); // reused from pool
      expect(p2.id).toBe(3);
      expect(p2.di).toBe(4);
      expect(p2.next).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // edge_swap and edge_lt
  // ---------------------------------------------------------------------------

  describe("edge_swap", () => {
    it("swaps the node field between two pairs", () => {
      const p1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      const p2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(4));
      p1.node = "nodeA";
      p2.node = "nodeB";
      ZPP_PartitionPair.edge_swap(p1, p2);
      expect(p1.node).toBe("nodeB");
      expect(p2.node).toBe("nodeA");
    });
  });

  describe("edge_lt", () => {
    it("returns true when a.id < b.id", () => {
      const p1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(5));
      const p2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(4));
      expect(ZPP_PartitionPair.edge_lt(p1, p2)).toBe(true);
    });

    it("returns false when a.id > b.id", () => {
      const p1 = ZPP_PartitionPair.get(mockVertex(5), mockVertex(6));
      const p2 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      expect(ZPP_PartitionPair.edge_lt(p1, p2)).toBe(false);
    });

    it("compares di when ids are equal", () => {
      const p1 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(5));
      const p2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(8));
      // p1: id=3, di=5; p2: id=3, di=8
      expect(ZPP_PartitionPair.edge_lt(p1, p2)).toBe(true);
      expect(ZPP_PartitionPair.edge_lt(p2, p1)).toBe(false);
    });

    it("returns false when both id and di are equal", () => {
      const p1 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(5));
      const p2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(5));
      expect(ZPP_PartitionPair.edge_lt(p1, p2)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Linked list: add, empty, size, front, back
  // ---------------------------------------------------------------------------

  describe("linked list basics", () => {
    let head: ZPP_PartitionPair;

    beforeEach(() => {
      head = new ZPP_PartitionPair();
    });

    it("add() sets modified flag", () => {
      head.modified = false;
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      expect(head.modified).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // inlined_add
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // insert
  // ---------------------------------------------------------------------------

  describe("insert", () => {
    let head: ZPP_PartitionPair;

    beforeEach(() => {
      head = new ZPP_PartitionPair();
    });

    it("inserts at head when cur is null", () => {
      const e1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      const e2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(4));
      head.insert(null, e1);
      head.insert(null, e2);
      expect(head.next).toBe(e2);
      expect(e2.next).toBe(e1);
      expect(head.length).toBe(2);
    });

    it("inserts after cur when cur is given", () => {
      const e1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      const e2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(4));
      head.insert(null, e1);
      head.insert(e1, e2);
      expect(head.next).toBe(e1);
      expect(e1.next).toBe(e2);
      expect(head.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // pop, pop_unsafe, inlined_pop, inlined_pop_unsafe
  // ---------------------------------------------------------------------------

  describe("pop", () => {
    it("sets pushmod when list becomes empty after pop", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      head.pushmod = false;
      head.pop();
      expect(head.pushmod).toBe(true);
      expect(head.empty()).toBe(true);
    });

    it("pop works like pop", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      head.pop();
      expect(head.empty()).toBe(true);
    });

    it("pop_unsafe removes and returns front element", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      const popped = head.pop_unsafe();
      expect(popped).toBe(e);
      expect(head.empty()).toBe(true);
    });

    it("pop_unsafe removes and returns front element", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      const popped = head.pop_unsafe();
      expect(popped).toBe(e);
      expect(head.empty()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // remove, try_remove, inlined_remove, inlined_try_remove
  // ---------------------------------------------------------------------------

  describe("remove", () => {
    it("removes the last element (sets pushmod)", () => {
      const head = new ZPP_PartitionPair();
      const e1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      const e2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(4));
      head.add(e1);
      head.add(e2); // e2 -> e1
      head.pushmod = false;
      head.remove(e1); // remove tail
      expect(head.pushmod).toBe(true);
    });

    it("remove works identically to remove", () => {
      const head = new ZPP_PartitionPair();
      const e1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e1);
      head.remove(e1);
      expect(head.empty()).toBe(true);
    });
  });
  // ---------------------------------------------------------------------------
  // erase, inlined_erase
  // ---------------------------------------------------------------------------

  describe("erase", () => {
    it("erase sets pushmod when erasing makes tail null", () => {
      const head = new ZPP_PartitionPair();
      const e1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      const e2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(4));
      head.add(e1);
      head.add(e2); // e2 -> e1
      head.pushmod = false;
      head.erase(e2); // erases e1 (the tail)
      expect(head.pushmod).toBe(true);
    });

    it("erase works like erase", () => {
      const head = new ZPP_PartitionPair();
      const e1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e1);
      const result = head.erase(null);
      expect(result).toBeNull();
      expect(head.empty()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // splice
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // reverse
  // ---------------------------------------------------------------------------

  describe("reverse", () => {
    it("reverse sets modified and pushmod", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      head.modified = false;
      head.pushmod = false;
      head.reverse();
      expect(head.modified).toBe(true);
      expect(head.pushmod).toBe(true);
    });

    it("reversing empty list is safe", () => {
      const head = new ZPP_PartitionPair();
      expect(() => head.reverse()).not.toThrow();
      expect(head.empty()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // has, inlined_has
  // ---------------------------------------------------------------------------

  describe("has / inlined_has", () => {
    it("returns true for contained element", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      expect(head.has(e)).toBe(true);
    });

    it("returns false for missing element", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      expect(head.has(e)).toBe(false);
    });

    it("has returns true for contained element", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      expect(head.has(e)).toBe(true);
    });

    it("has returns false for missing element", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(9), mockVertex(10));
      expect(head.has(e)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // at, iterator_at
  // ---------------------------------------------------------------------------

  describe("at / iterator_at", () => {
    it("at(0) returns front element", () => {
      const head = new ZPP_PartitionPair();
      const e1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      const e2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(4));
      head.add(e1);
      head.add(e2); // e2 -> e1
      expect(head.at(0)).toBe(e2);
    });

    it("at(1) returns second element", () => {
      const head = new ZPP_PartitionPair();
      const e1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      const e2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(4));
      head.add(e1);
      head.add(e2);
      expect(head.at(1)).toBe(e1);
    });

    it("at(n) returns null for out-of-bounds index", () => {
      const head = new ZPP_PartitionPair();
      expect(head.at(0)).toBeNull();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      expect(head.at(5)).toBeNull();
    });

    it("iterator_at returns same as at", () => {
      const head = new ZPP_PartitionPair();
      const e1 = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      const e2 = ZPP_PartitionPair.get(mockVertex(3), mockVertex(4));
      head.add(e1);
      head.add(e2);
      expect(head.iterator_at(0)).toBe(e2);
      expect(head.iterator_at(1)).toBe(e1);
      expect(head.iterator_at(2)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // begin, setbegin, elem
  // ---------------------------------------------------------------------------

  describe("begin / setbegin / elem", () => {
    it("begin() returns head.next", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      expect(head.begin()).toBe(e);
    });
  });

  // ---------------------------------------------------------------------------
  // addAll
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // clear
  // ---------------------------------------------------------------------------

  describe("clear", () => {
    it("clear() is a no-op (does not crash)", () => {
      const head = new ZPP_PartitionPair();
      const e = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      head.add(e);
      expect(() => head.clear()).not.toThrow();
    });

    it("clear() is a no-op (does not crash)", () => {
      const head = new ZPP_PartitionPair();
      expect(() => head.clear()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // free / alloc
  // ---------------------------------------------------------------------------

  describe("free / alloc", () => {
    it("free() nulls a, b, and node", () => {
      const pair = ZPP_PartitionPair.get(mockVertex(1), mockVertex(2));
      pair.node = "test";
      pair.free();
      expect(pair.a).toBeNull();
      expect(pair.b).toBeNull();
      expect(pair.node).toBeNull();
    });

    it("alloc() is a no-op", () => {
      const pair = new ZPP_PartitionPair();
      expect(() => pair.alloc()).not.toThrow();
    });
  });
});
