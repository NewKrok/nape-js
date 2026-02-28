import { describe, it, expect } from "vitest";
import { ZPP_MatMN } from "../../../src/native/geom/ZPP_MatMN";

describe("ZPP_MatMN", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_MatMN.__name__).toEqual(["zpp_nape", "geom", "ZPP_MatMN"]);
    });
  });

  describe("constructor", () => {
    it("should create a matrix with correct dimensions", () => {
      const mat = new ZPP_MatMN(3, 4);
      expect(mat.m).toBe(3);
      expect(mat.n).toBe(4);
    });

    it("should initialize flat array with m*n zeros", () => {
      const mat = new ZPP_MatMN(2, 3);
      expect(mat.x).toHaveLength(6);
      expect(mat.x).toEqual([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
    });

    it("should handle 1x1 matrix", () => {
      const mat = new ZPP_MatMN(1, 1);
      expect(mat.x).toHaveLength(1);
      expect(mat.x[0]).toBe(0.0);
    });

    it("should set __class__ to ZPP_MatMN", () => {
      const mat = new ZPP_MatMN(2, 2);
      expect(mat.__class__).toBe(ZPP_MatMN);
    });

    it("should initialize outer to null", () => {
      const mat = new ZPP_MatMN(2, 2);
      expect(mat.outer).toBeNull();
    });
  });
});
