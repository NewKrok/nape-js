import { describe, it, expect } from "vitest";
import { ZPP_MatMN } from "../../../src/native/geom/ZPP_MatMN";

describe("ZPP_MatMN", () => {
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

    it("should initialize outer to null", () => {
      const mat = new ZPP_MatMN(2, 2);
      expect(mat.outer).toBeNull();
    });
  });
});
