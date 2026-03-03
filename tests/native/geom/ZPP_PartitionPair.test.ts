import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_PartitionPair } from "../../../src/native/geom/ZPP_PartitionPair";

describe("ZPP_PartitionPair", () => {
  beforeEach(() => {
    ZPP_PartitionPair.zpp_pool = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_PartitionPair.__name__).toEqual([
        "zpp_nape",
        "geom",
        "ZPP_PartitionPair",
      ]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize key fields to defaults", () => {
      const p = new ZPP_PartitionPair();
      expect(p.a).toBeNull();
      expect(p.b).toBeNull();
      expect(p.node).toBeNull();
      expect(p.next).toBeNull();
      expect(p.__class__).toBe(ZPP_PartitionPair);
    });
  });

  describe("static pool", () => {
    it("should initialize pool to null", () => {
      expect(ZPP_PartitionPair.zpp_pool).toBeNull();
    });

    it("should allow setting pool", () => {
      const p = new ZPP_PartitionPair();
      ZPP_PartitionPair.zpp_pool = p;
      expect(ZPP_PartitionPair.zpp_pool).toBe(p);
    });
  });
});
