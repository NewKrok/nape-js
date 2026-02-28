import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_PubPool } from "../../../src/native/util/ZPP_PubPool";

describe("ZPP_PubPool", () => {
  beforeEach(() => {
    ZPP_PubPool.poolGeomPoly = null;
    ZPP_PubPool.nextGeomPoly = null;
    ZPP_PubPool.poolVec2 = null;
    ZPP_PubPool.nextVec2 = null;
    ZPP_PubPool.poolVec3 = null;
    ZPP_PubPool.nextVec3 = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_PubPool.__name__).toEqual(["zpp_nape", "util", "ZPP_PubPool"]);
    });
  });

  describe("__class__", () => {
    it("should reference ZPP_PubPool", () => {
      const inst = new ZPP_PubPool();
      expect(inst.__class__).toBe(ZPP_PubPool);
    });
  });

  describe("static pool references", () => {
    it("should initialize all pools to null", () => {
      expect(ZPP_PubPool.poolGeomPoly).toBeNull();
      expect(ZPP_PubPool.nextGeomPoly).toBeNull();
      expect(ZPP_PubPool.poolVec2).toBeNull();
      expect(ZPP_PubPool.nextVec2).toBeNull();
      expect(ZPP_PubPool.poolVec3).toBeNull();
      expect(ZPP_PubPool.nextVec3).toBeNull();
    });

    it("should allow setting pool references", () => {
      const obj = { id: 1 };
      ZPP_PubPool.poolVec2 = obj;
      expect(ZPP_PubPool.poolVec2).toBe(obj);
    });
  });
});
