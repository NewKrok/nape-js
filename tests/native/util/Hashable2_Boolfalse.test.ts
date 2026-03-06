import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import { Hashable2_Boolfalse } from "../../../src/native/util/Hashable2_Boolfalse";

describe("Hashable2_Boolfalse", () => {
  describe("constructor", () => {
    it("should initialize with default values", () => {
      const h = new Hashable2_Boolfalse();
      expect(h.value).toBe(false);
      expect(h.id).toBe(0);
      expect(h.di).toBe(0);
      expect(h.next).toBeNull();
      expect(h.hnext).toBeNull();
    });
  });

  describe("static get", () => {
    it("should create an entry with id, di, and value", () => {
      Hashable2_Boolfalse.zpp_pool = null;
      const h = Hashable2_Boolfalse.get(10, 20, true);
      expect(h.id).toBe(10);
      expect(h.di).toBe(20);
      expect(h.value).toBe(true);
    });

    it("should reuse pooled instances", () => {
      const pooled = new Hashable2_Boolfalse();
      pooled.next = null;
      Hashable2_Boolfalse.zpp_pool = pooled;
      const h = Hashable2_Boolfalse.get(1, 2, false);
      expect(h).toBe(pooled);
      expect(h.id).toBe(1);
      expect(h.di).toBe(2);
      expect(h.value).toBe(false);
      expect(Hashable2_Boolfalse.zpp_pool).toBeNull();
    });
  });

  describe("static getpersist", () => {
    it("should create an entry without setting value", () => {
      Hashable2_Boolfalse.zpp_pool = null;
      const h = Hashable2_Boolfalse.getpersist(5, 15);
      expect(h.id).toBe(5);
      expect(h.di).toBe(15);
    });
  });

  describe("static ordered_get", () => {
    it("should keep order when id <= di", () => {
      Hashable2_Boolfalse.zpp_pool = null;
      const h = Hashable2_Boolfalse.ordered_get(3, 7, true);
      expect(h.id).toBe(3);
      expect(h.di).toBe(7);
      expect(h.value).toBe(true);
    });

    it("should swap when id > di", () => {
      Hashable2_Boolfalse.zpp_pool = null;
      const h = Hashable2_Boolfalse.ordered_get(7, 3, true);
      expect(h.id).toBe(3);
      expect(h.di).toBe(7);
      expect(h.value).toBe(true);
    });
  });

  describe("static ordered_get_persist", () => {
    it("should keep order when id <= di", () => {
      Hashable2_Boolfalse.zpp_pool = null;
      const h = Hashable2_Boolfalse.ordered_get_persist(2, 8);
      expect(h.id).toBe(2);
      expect(h.di).toBe(8);
    });

    it("should swap when id > di", () => {
      Hashable2_Boolfalse.zpp_pool = null;
      const h = Hashable2_Boolfalse.ordered_get_persist(8, 2);
      expect(h.id).toBe(2);
      expect(h.di).toBe(8);
    });
  });

  describe("free / alloc", () => {
    it("should have no-op free and alloc methods", () => {
      const h = new Hashable2_Boolfalse();
      expect(() => h.free()).not.toThrow();
      expect(() => h.alloc()).not.toThrow();
    });
  });

  describe("namespace registration", () => {
    it("should be registered in compiled namespace", async () => {
      const { getNape } = await import("../../../src/core/engine");
      const nape = getNape();
      expect(nape.__zpp.util.Hashable2_Boolfalse).toBe(Hashable2_Boolfalse);
    });
  });
});
