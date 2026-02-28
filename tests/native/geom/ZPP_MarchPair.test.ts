import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_MarchPair } from "../../../src/native/geom/ZPP_MarchPair";

describe("ZPP_MarchPair", () => {
  beforeEach(() => {
    ZPP_MarchPair.zpp_pool = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_MarchPair.__name__).toEqual(["zpp_nape", "geom", "ZPP_MarchPair"]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const pair = new ZPP_MarchPair();
      expect(pair.p1).toBeNull();
      expect(pair.key1).toBe(0);
      expect(pair.okey1).toBe(0);
      expect(pair.p2).toBeNull();
      expect(pair.key2).toBe(0);
      expect(pair.okey2).toBe(0);
      expect(pair.pr).toBeNull();
      expect(pair.keyr).toBe(0);
      expect(pair.okeyr).toBe(0);
      expect(pair.pd).toBeNull();
      expect(pair.span1).toBeNull();
      expect(pair.span2).toBeNull();
      expect(pair.spanr).toBeNull();
      expect(pair.next).toBeNull();
      expect(pair.__class__).toBe(ZPP_MarchPair);
    });
  });

  describe("free", () => {
    it("should null out point and span references", () => {
      const pair = new ZPP_MarchPair();
      pair.p1 = { x: 1 };
      pair.p2 = { x: 2 };
      pair.pr = { x: 3 };
      pair.pd = { x: 4 };
      pair.span1 = { id: 1 };
      pair.span2 = { id: 2 };
      pair.spanr = { id: 3 };

      pair.free();

      expect(pair.p1).toBeNull();
      expect(pair.p2).toBeNull();
      expect(pair.pr).toBeNull();
      expect(pair.pd).toBeNull();
      expect(pair.span1).toBeNull();
      expect(pair.span2).toBeNull();
      expect(pair.spanr).toBeNull();
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const pair = new ZPP_MarchPair();
      expect(() => pair.alloc()).not.toThrow();
    });
  });

  describe("static pool", () => {
    it("should initialize pool to null", () => {
      expect(ZPP_MarchPair.zpp_pool).toBeNull();
    });
  });
});
