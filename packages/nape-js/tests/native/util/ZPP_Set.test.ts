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
  describe("first / pop_front", () => {
    it("first should return smallest element", () => {
      const set = makeSet();
      set.insert(20);
      set.insert(10);
      set.insert(30);
      expect(set.first()).toBe(10);
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
  describe("pool reuse", () => {
    it("removed nodes should be returned to pool", () => {
      SetClass.zpp_pool = null;
      const set = makeSet();
      set.insert(5);
      set.remove(5);
      expect(SetClass.zpp_pool).not.toBeNull();
    });

    it("reuses freed nodes without keeping stale tree links", () => {
      SetClass.zpp_pool = null;
      const set = makeSet();
      const first = set.insert(5);
      set.remove(5);

      const reused = set.insert(10);

      expect(reused).toBe(first);
      expect(reused.parent).toBeNull();
      expect(reused.prev).toBeNull();
      expect(reused.next).toBeNull();
      expect(reused.data).toBe(10);
      expect(set.verify()).toBe(true);
    });

    it("can drain and reuse a freed batch in later insertions", () => {
      SetClass.zpp_pool = null;
      const set = makeSet();
      const freed = [1, 2, 3, 4].map((value) => set.insert(value));
      for (const value of [1, 2, 3, 4]) set.remove(value);

      const reused = [10, 20, 30, 40].map((value) => set.insert(value));

      expect(new Set(reused)).toEqual(new Set(freed));
      expect(SetClass.zpp_pool).toBeNull();
      expect(set.size()).toBe(4);
      expect(set.verify()).toBe(true);
      expect([10, 20, 30, 40].every((value) => set.has(value))).toBe(true);
    });
  });
});
