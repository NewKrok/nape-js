import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/core/engine";
import { getNape } from "../../../src/core/engine";
import { ZPP_Set } from "../../../src/native/util/ZPP_Set";

describe("ZPP_Set", () => {
  let SetClass: any;

  beforeEach(() => {
    const zpp = getNape().__zpp;
    SetClass = zpp.util.ZPP_Set_ZPP_Body;
    SetClass.zpp_pool = null;
  });

  function makeSet(lt?: (a: number, b: number) => boolean) {
    const set = new SetClass();
    set.lt = lt || ((a: number, b: number) => a < b);
    return set;
  }

  it("instances should be instanceof ZPP_Set", () => {
    const set = new SetClass();
    expect(set).toBeInstanceOf(ZPP_Set);
  });

  describe("empty / insert / size", () => {
    it("new set should be empty", () => {
      const set = makeSet();
      expect(set.empty()).toBe(true);
      expect(set.size()).toBe(0);
    });

    it("insert should add elements", () => {
      const set = makeSet();
      set.insert(5);
      set.insert(3);
      set.insert(7);
      expect(set.empty()).toBe(false);
      expect(set.size()).toBe(3);
    });
  });

  describe("has / find", () => {
    it("should find inserted elements", () => {
      const set = makeSet();
      set.insert(10);
      set.insert(20);
      expect(set.has(10)).toBe(true);
      expect(set.has(20)).toBe(true);
      expect(set.has(30)).toBe(false);
    });

    it("find should return node for existing element", () => {
      const set = makeSet();
      set.insert(5);
      const node = set.find(5);
      expect(node).not.toBeNull();
      expect(node.data).toBe(5);
    });

    it("find should return null for missing element", () => {
      const set = makeSet();
      expect(set.find(99)).toBeNull();
    });
  });

  describe("has_weak / find_weak", () => {
    it("should find by comparator equality", () => {
      const set = makeSet();
      set.insert(10);
      expect(set.has_weak(10)).toBe(true);
      expect(set.has_weak(5)).toBe(false);
    });
  });

  describe("first / pop_front", () => {
    it("first should return smallest element", () => {
      const set = makeSet();
      set.insert(20);
      set.insert(10);
      set.insert(30);
      expect(set.first()).toBe(10);
    });

    it("pop_front should remove and return smallest", () => {
      const set = makeSet();
      set.insert(20);
      set.insert(10);
      set.insert(30);
      expect(set.pop_front()).toBe(10);
      expect(set.size()).toBe(2);
      expect(set.first()).toBe(20);
    });
  });

  describe("remove", () => {
    it("should remove a specific element", () => {
      const set = makeSet();
      set.insert(5);
      set.insert(10);
      set.insert(15);
      set.remove(10);
      expect(set.has(10)).toBe(false);
      expect(set.size()).toBe(2);
    });
  });

  describe("clear", () => {
    it("should remove all elements", () => {
      const set = makeSet();
      set.insert(1);
      set.insert(2);
      set.insert(3);
      set.clear();
      expect(set.empty()).toBe(true);
      expect(set.size()).toBe(0);
    });
  });

  describe("clear_with", () => {
    it("should call lambda for each element and clear", () => {
      const set = makeSet();
      set.insert(1);
      set.insert(2);
      set.insert(3);
      const collected: number[] = [];
      set.clear_with((d: number) => collected.push(d));
      expect(set.empty()).toBe(true);
      expect(collected.sort()).toEqual([1, 2, 3]);
    });
  });

  describe("try_insert_bool", () => {
    it("should return true for new elements", () => {
      const set = makeSet();
      expect(set.try_insert_bool(5)).toBe(true);
      expect(set.try_insert_bool(10)).toBe(true);
    });

    it("should return false for duplicates", () => {
      const set = makeSet();
      set.try_insert_bool(5);
      expect(set.try_insert_bool(5)).toBe(false);
    });
  });

  describe("try_insert", () => {
    it("should return new node for new elements", () => {
      const set = makeSet();
      const node = set.try_insert(5);
      expect(node.data).toBe(5);
    });

    it("should return existing node for duplicates", () => {
      const set = makeSet();
      const node1 = set.try_insert(5);
      const node2 = set.try_insert(5);
      expect(node2).toBe(node1);
    });
  });

  describe("successor / predecessor", () => {
    it("should find the next element in order", () => {
      const set = makeSet();
      set.insert(10);
      set.insert(20);
      set.insert(30);
      expect(set.successor(10)).toBe(20);
      expect(set.successor(20)).toBe(30);
      expect(set.successor(30)).toBeNull();
    });

    it("should find the previous element in order", () => {
      const set = makeSet();
      set.insert(10);
      set.insert(20);
      set.insert(30);
      expect(set.predecessor(30)).toBe(20);
      expect(set.predecessor(20)).toBe(10);
      expect(set.predecessor(10)).toBeNull();
    });
  });

  describe("singular", () => {
    it("should be true for single-element sets", () => {
      const set = makeSet();
      set.insert(42);
      expect(set.singular()).toBe(true);
    });

    it("should be false for multi-element sets", () => {
      const set = makeSet();
      set.insert(1);
      set.insert(2);
      expect(set.singular()).toBe(false);
    });
  });

  describe("lower_bound", () => {
    it("should find first element >= given value", () => {
      const set = makeSet();
      set.insert(10);
      set.insert(20);
      set.insert(30);
      expect(set.lower_bound(15)).toBe(20);
      expect(set.lower_bound(10)).toBe(10);
      expect(set.lower_bound(5)).toBe(10);
    });
  });

  describe("verify", () => {
    it("should return true for a valid tree", () => {
      const set = makeSet();
      set.insert(10);
      set.insert(20);
      set.insert(5);
      expect(set.verify()).toBe(true);
    });
  });

  describe("pool reuse", () => {
    it("removed nodes should be returned to pool", () => {
      SetClass.zpp_pool = null;
      const set = makeSet();
      set.insert(5);
      set.remove(5);
      expect(SetClass.zpp_pool).not.toBeNull();
    });
  });

  describe("stress test — many insertions and removals", () => {
    it("should maintain correct ordering with many ops", () => {
      const set = makeSet();
      const values = [50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43];
      for (const v of values) set.insert(v);
      expect(set.size()).toBe(values.length);

      // Verify sorted order via successive first/pop_front
      const sorted: number[] = [];
      while (!set.empty()) sorted.push(set.pop_front());
      expect(sorted).toEqual([...values].sort((a, b) => a - b));
    });
  });
});
