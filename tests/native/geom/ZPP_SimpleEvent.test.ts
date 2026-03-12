import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_SimpleEvent } from "../../../src/native/geom/ZPP_SimpleEvent";

describe("ZPP_SimpleEvent", () => {
  beforeEach(() => {
    ZPP_SimpleEvent.zpp_pool = null;
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const e = new ZPP_SimpleEvent();
      expect(e.type).toBe(0);
      expect(e.vertex).toBeNull();
      expect(e.segment).toBeNull();
      expect(e.segment2).toBeNull();
      expect(e.node).toBeNull();
      expect(e.next).toBeNull();
    });
  });

  describe("swap_nodes", () => {
    it("should swap node references between two objects", () => {
      const nodeA = { id: "A" };
      const nodeB = { id: "B" };
      const a = { node: nodeA };
      const b = { node: nodeB };
      ZPP_SimpleEvent.swap_nodes(a, b);
      expect(a.node).toBe(nodeB);
      expect(b.node).toBe(nodeA);
    });
  });

  describe("less_xy", () => {
    it("should return true when a.vertex.x < b.vertex.x", () => {
      const a = { vertex: { x: 1, y: 5 }, type: 0 };
      const b = { vertex: { x: 2, y: 3 }, type: 0 };
      expect(ZPP_SimpleEvent.less_xy(a, b)).toBe(true);
    });

    it("should return false when a.vertex.x > b.vertex.x", () => {
      const a = { vertex: { x: 3, y: 1 }, type: 0 };
      const b = { vertex: { x: 2, y: 5 }, type: 0 };
      expect(ZPP_SimpleEvent.less_xy(a, b)).toBe(false);
    });

    it("should compare y when x values are equal", () => {
      const a = { vertex: { x: 2, y: 1 }, type: 0 };
      const b = { vertex: { x: 2, y: 3 }, type: 0 };
      expect(ZPP_SimpleEvent.less_xy(a, b)).toBe(true);
    });

    it("should compare type when both x and y are equal", () => {
      const a = { vertex: { x: 2, y: 3 }, type: 0 };
      const b = { vertex: { x: 2, y: 3 }, type: 1 };
      expect(ZPP_SimpleEvent.less_xy(a, b)).toBe(true);
      expect(ZPP_SimpleEvent.less_xy(b, a)).toBe(false);
    });

    it("should return false for identical events", () => {
      const a = { vertex: { x: 2, y: 3 }, type: 1 };
      const b = { vertex: { x: 2, y: 3 }, type: 1 };
      expect(ZPP_SimpleEvent.less_xy(a, b)).toBe(false);
    });
  });

  describe("get (factory)", () => {
    it("should create new instance when pool is empty", () => {
      const v = { x: 10, y: 20 };
      const e = ZPP_SimpleEvent.get(v);
      expect(e).toBeInstanceOf(ZPP_SimpleEvent);
      expect(e.vertex).toBe(v);
    });

    it("should reuse from pool when available", () => {
      const pooled = new ZPP_SimpleEvent();
      ZPP_SimpleEvent.zpp_pool = pooled;

      const v = { x: 5, y: 6 };
      const e = ZPP_SimpleEvent.get(v);
      expect(e).toBe(pooled);
      expect(e.vertex).toBe(v);
      expect(ZPP_SimpleEvent.zpp_pool).toBeNull();
    });

    it("should correctly unlink from pool chain", () => {
      const p1 = new ZPP_SimpleEvent();
      const p2 = new ZPP_SimpleEvent();
      p1.next = p2;
      ZPP_SimpleEvent.zpp_pool = p1;

      const e = ZPP_SimpleEvent.get({ x: 1, y: 2 });
      expect(e).toBe(p1);
      expect(e.next).toBeNull();
      expect(ZPP_SimpleEvent.zpp_pool).toBe(p2);
    });
  });

  describe("free", () => {
    it("should null out all references", () => {
      const e = new ZPP_SimpleEvent();
      e.vertex = { x: 1, y: 2 };
      e.segment = { id: "s1" };
      e.segment2 = { id: "s2" };
      e.node = { id: "n1" };
      e.free();
      expect(e.vertex).toBeNull();
      expect(e.segment).toBeNull();
      expect(e.segment2).toBeNull();
      expect(e.node).toBeNull();
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const e = new ZPP_SimpleEvent();
      expect(() => e.alloc()).not.toThrow();
    });
  });
});
