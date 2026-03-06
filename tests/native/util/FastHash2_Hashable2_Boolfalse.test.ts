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
    it("should initialize with empty table and zero count", () => {
      expect(hash.cnt).toBe(0);
      expect(hash.table.length).toBe(1048576);
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
  });

  describe("ordered_get", () => {
    it("should find entry regardless of argument order", () => {
      const entry = Hashable2_Boolfalse.ordered_get(5, 10, true);
      hash.add(entry);
      // entry.id = 5, entry.di = 10
      expect(hash.ordered_get(5, 10)).toBe(entry);
      expect(hash.ordered_get(10, 5)).toBe(entry);
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
    });
  });

  describe("clear", () => {
    it("should clear all entries from the table", () => {
      const e1 = Hashable2_Boolfalse.get(1, 2, true);
      const e2 = Hashable2_Boolfalse.get(3, 4, false);
      hash.add(e1);
      hash.add(e2);
      hash.clear();
      expect(hash.get(1, 2)).toBeNull();
      expect(hash.get(3, 4)).toBeNull();
      // Note: clear does not reset cnt
    });
  });

  describe("maybeAdd", () => {
    it("should add an entry and increment count", () => {
      const entry = Hashable2_Boolfalse.get(100, 200, true);
      hash.maybeAdd(entry);
      expect(hash.cnt).toBe(1);
      expect(hash.has(100, 200)).toBe(true);
    });
  });

  describe("hash", () => {
    it("should compute hash for a pair of ids", () => {
      const h = hash.hash(10, 20);
      expect(h).toBe((10 * 106039 + 20) & 1048575);
    });
  });

  describe("namespace registration", () => {
    it("should be registered in compiled namespace", async () => {
      const { getNape } = await import("../../../src/core/engine");
      const nape = getNape();
      expect(nape.__zpp.util.FastHash2_Hashable2_Boolfalse).toBe(
        FastHash2_Hashable2_Boolfalse,
      );
    });
  });
});
