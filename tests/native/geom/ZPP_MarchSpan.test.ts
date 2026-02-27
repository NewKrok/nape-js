import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_MarchSpan } from "../../../src/native/geom/ZPP_MarchSpan";

describe("ZPP_MarchSpan", () => {
  beforeEach(() => {
    ZPP_MarchSpan.zpp_pool = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_MarchSpan.__name__).toEqual(["zpp_nape", "geom", "ZPP_MarchSpan"]);
    });
  });

  describe("constructor", () => {
    it("should set parent to self", () => {
      const span = new ZPP_MarchSpan();
      expect(span.parent).toBe(span);
    });

    it("should initialize rank to 0", () => {
      const span = new ZPP_MarchSpan();
      expect(span.rank).toBe(0);
    });

    it("should initialize out to false", () => {
      const span = new ZPP_MarchSpan();
      expect(span.out).toBe(false);
    });

    it("should initialize next to null", () => {
      const span = new ZPP_MarchSpan();
      expect(span.next).toBeNull();
    });

    it("should set __class__ to ZPP_MarchSpan", () => {
      const span = new ZPP_MarchSpan();
      expect(span.__class__).toBe(ZPP_MarchSpan);
    });
  });

  describe("free", () => {
    it("should reset parent to self", () => {
      const span = new ZPP_MarchSpan();
      const other = new ZPP_MarchSpan();
      span.parent = other;
      span.free();
      expect(span.parent).toBe(span);
    });
  });

  describe("alloc", () => {
    it("should reset out to false", () => {
      const span = new ZPP_MarchSpan();
      span.out = true;
      span.alloc();
      expect(span.out).toBe(false);
    });

    it("should reset rank to 0", () => {
      const span = new ZPP_MarchSpan();
      span.rank = 5;
      span.alloc();
      expect(span.rank).toBe(0);
    });
  });

  describe("static pool", () => {
    it("should initialize pool to null", () => {
      expect(ZPP_MarchSpan.zpp_pool).toBeNull();
    });

    it("should allow setting pool", () => {
      const span = new ZPP_MarchSpan();
      ZPP_MarchSpan.zpp_pool = span;
      expect(ZPP_MarchSpan.zpp_pool).toBe(span);
    });
  });
});
