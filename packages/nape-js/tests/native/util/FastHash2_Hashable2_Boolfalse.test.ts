import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/core/engine";
import { Hashable2_Boolfalse } from "../../../src/native/util/Hashable2_Boolfalse";
import { FastHash2_Hashable2_Boolfalse } from "../../../src/native/util/FastHash2_Hashable2_Boolfalse";

describe("FastHash2_Hashable2_Boolfalse", () => {
  let hash: FastHash2_Hashable2_Boolfalse;

  beforeEach(() => {
    Hashable2_Boolfalse.zpp_pool = null;
    hash = new FastHash2_Hashable2_Boolfalse();
  });

  describe("constructor", () => {
    it("should initialize empty with zero count", () => {
      expect(hash.cnt).toBe(0);
      expect(hash.map.size).toBe(0);
      expect(hash.empty()).toBe(true);
    });
  });

  describe("add / get / has", () => {
    it("should add and retrieve an entry", () => {
      const entry = Hashable2_Boolfalse.get(10, 20, true);
      hash.add(entry);
      expect(hash.cnt).toBe(1);
      expect(hash.empty()).toBe(false);
      const found = hash.get(10, 20);
      expect(found).toBe(entry);
      expect(hash.has(10, 20)).toBe(true);
    });

    it("should return null for missing entries", () => {
      expect(hash.get(99, 88)).toBeNull();
      expect(hash.has(99, 88)).toBe(false);
    });

    it("should handle multiple entries with different keys", () => {
      const e1 = Hashable2_Boolfalse.get(1, 2, true);
      const e2 = Hashable2_Boolfalse.get(3, 4, false);
      hash.add(e1);
      hash.add(e2);
      expect(hash.cnt).toBe(2);
      expect(hash.get(1, 2)).toBe(e1);
      expect(hash.get(3, 4)).toBe(e2);
    });

    it("should chain duplicate keys and keep lookups correct", () => {
      const e1 = Hashable2_Boolfalse.get(1, 2, true);
      const e2 = Hashable2_Boolfalse.get(1, 2, false);
      hash.add(e1);
      hash.add(e2);
      expect(hash.cnt).toBe(2);
      expect(hash.get(1, 2)).toBe(e1);
      hash.remove(e1);
      expect(hash.get(1, 2)).toBe(e2);
    });
  });

  describe("remove", () => {
    it("should remove an entry and decrement count", () => {
      const entry = Hashable2_Boolfalse.get(7, 14, true);
      hash.add(entry);
      expect(hash.cnt).toBe(1);
      hash.remove(entry);
      expect(hash.cnt).toBe(0);
      expect(hash.get(7, 14)).toBeNull();
      expect(hash.map.size).toBe(0);
    });
  });

  describe("clear", () => {
    it("should clear all entries and reset count", () => {
      const e1 = Hashable2_Boolfalse.get(1, 2, true);
      const e2 = Hashable2_Boolfalse.get(3, 4, false);
      hash.add(e1);
      hash.add(e2);
      hash.clear();
      expect(hash.get(1, 2)).toBeNull();
      expect(hash.get(3, 4)).toBeNull();
      expect(hash.cnt).toBe(0);
      expect(hash.empty()).toBe(true);
    });

    it("should invoke the free callback on every entry", () => {
      const e1 = Hashable2_Boolfalse.get(1, 2, true);
      const e2 = Hashable2_Boolfalse.get(1, 2, false);
      const e3 = Hashable2_Boolfalse.get(3, 4, true);
      hash.add(e1);
      hash.add(e2);
      hash.add(e3);
      const freed: Hashable2_Boolfalse[] = [];
      hash.clear((n) => freed.push(n));
      expect(freed).toHaveLength(3);
      expect(freed).toContain(e1);
      expect(freed).toContain(e2);
      expect(freed).toContain(e3);
    });
  });

  describe("namespace registration", () => {
    it("should be registered in compiled namespace", async () => {
      const { getNape } = await import("../../../src/core/engine");
      const nape = getNape();
      expect(nape.__zpp.util.FastHash2_Hashable2_Boolfalse).toBe(FastHash2_Hashable2_Boolfalse);
    });
  });
});
