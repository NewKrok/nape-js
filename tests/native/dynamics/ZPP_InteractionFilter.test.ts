import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_InteractionFilter } from "../../../src/native/dynamics/ZPP_InteractionFilter";
import { createMockZpp, createMockNape, MockZNPList } from "../_mocks";

describe("ZPP_InteractionFilter", () => {
  beforeEach(() => {
    ZPP_InteractionFilter.zpp_pool = null;
    ZPP_InteractionFilter._zpp = createMockZpp();
    ZPP_InteractionFilter._nape = createMockNape();
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_InteractionFilter.__name__).toEqual(["zpp_nape", "dynamics", "ZPP_InteractionFilter"]);
    });
  });

  describe("constructor", () => {
    it("should initialize with default bitmask values", () => {
      const f = new ZPP_InteractionFilter();
      expect(f.collisionGroup).toBe(1);
      expect(f.collisionMask).toBe(-1);
      expect(f.sensorGroup).toBe(1);
      expect(f.sensorMask).toBe(-1);
      expect(f.fluidGroup).toBe(1);
      expect(f.fluidMask).toBe(-1);
    });

    it("should create shapes list", () => {
      const f = new ZPP_InteractionFilter();
      expect(f.shapes).toBeInstanceOf(MockZNPList);
    });

    it("should initialize other fields", () => {
      const f = new ZPP_InteractionFilter();
      expect(f.outer).toBeNull();
      expect(f.userData).toBeNull();
      expect(f.next).toBeNull();
      expect(f.wrap_shapes).toBeNull();
      expect(f.__class__).toBe(ZPP_InteractionFilter);
    });
  });

  describe("wrapper", () => {
    it("should create wrapper when outer is null", () => {
      const f = new ZPP_InteractionFilter();
      const w = f.wrapper();
      expect(w).not.toBeNull();
      expect(w.zpp_inner).toBe(f);
    });

    it("should return existing wrapper", () => {
      const f = new ZPP_InteractionFilter();
      const w1 = f.wrapper();
      const w2 = f.wrapper();
      expect(w1).toBe(w2);
    });
  });

  describe("free", () => {
    it("should null out outer", () => {
      const f = new ZPP_InteractionFilter();
      f.outer = { id: "test" };
      f.free();
      expect(f.outer).toBeNull();
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const f = new ZPP_InteractionFilter();
      expect(() => f.alloc()).not.toThrow();
    });
  });

  describe("feature_cons", () => {
    it("should reinitialize shapes list", () => {
      const f = new ZPP_InteractionFilter();
      const original = f.shapes;
      f.feature_cons();
      expect(f.shapes).not.toBe(original);
    });
  });

  describe("addShape / remShape", () => {
    it("should add and remove shapes", () => {
      const f = new ZPP_InteractionFilter();
      const shape = { id: "s1" };
      f.addShape(shape);
      expect(f.shapes.has(shape)).toBe(true);
      f.remShape(shape);
      expect(f.shapes.has(shape)).toBe(false);
    });
  });

  describe("copy", () => {
    it("should create a copy with same bitmask values", () => {
      const f = new ZPP_InteractionFilter();
      f.collisionGroup = 2;
      f.collisionMask = 3;
      f.sensorGroup = 4;
      f.sensorMask = 5;
      f.fluidGroup = 6;
      f.fluidMask = 7;

      const c = f.copy();
      expect(c).not.toBe(f);
      expect(c.collisionGroup).toBe(2);
      expect(c.collisionMask).toBe(3);
      expect(c.sensorGroup).toBe(4);
      expect(c.sensorMask).toBe(5);
      expect(c.fluidGroup).toBe(6);
      expect(c.fluidMask).toBe(7);
    });

    it("should reuse from pool when available", () => {
      const pooled = new ZPP_InteractionFilter();
      ZPP_InteractionFilter.zpp_pool = pooled;

      const f = new ZPP_InteractionFilter();
      f.collisionGroup = 10;
      const c = f.copy();
      expect(c).toBe(pooled);
      expect(c.collisionGroup).toBe(10);
      expect(c.next).toBeNull();
    });

    it("should unlink from pool chain", () => {
      const p1 = new ZPP_InteractionFilter();
      const p2 = new ZPP_InteractionFilter();
      p1.next = p2;
      ZPP_InteractionFilter.zpp_pool = p1;

      const f = new ZPP_InteractionFilter();
      const c = f.copy();
      expect(c).toBe(p1);
      expect(ZPP_InteractionFilter.zpp_pool).toBe(p2);
    });
  });

  describe("shouldCollide", () => {
    it("should return true when masks overlap", () => {
      const a = new ZPP_InteractionFilter();
      const b = new ZPP_InteractionFilter();
      expect(a.shouldCollide(b)).toBe(true);
    });

    it("should return false when a.mask excludes b.group", () => {
      const a = new ZPP_InteractionFilter();
      const b = new ZPP_InteractionFilter();
      a.collisionMask = 0;
      expect(a.shouldCollide(b)).toBe(false);
    });

    it("should return false when b.mask excludes a.group", () => {
      const a = new ZPP_InteractionFilter();
      const b = new ZPP_InteractionFilter();
      b.collisionMask = 0;
      expect(a.shouldCollide(b)).toBe(false);
    });

    it("should work with specific bitmask patterns", () => {
      const a = new ZPP_InteractionFilter();
      const b = new ZPP_InteractionFilter();
      a.collisionGroup = 0b0010;
      a.collisionMask = 0b0100;
      b.collisionGroup = 0b0100;
      b.collisionMask = 0b0010;
      expect(a.shouldCollide(b)).toBe(true);
    });
  });

  describe("shouldSense", () => {
    it("should return true when masks overlap", () => {
      const a = new ZPP_InteractionFilter();
      const b = new ZPP_InteractionFilter();
      expect(a.shouldSense(b)).toBe(true);
    });

    it("should return false when masks don't overlap", () => {
      const a = new ZPP_InteractionFilter();
      const b = new ZPP_InteractionFilter();
      a.sensorMask = 0;
      expect(a.shouldSense(b)).toBe(false);
    });
  });

  describe("shouldFlow", () => {
    it("should return true when masks overlap", () => {
      const a = new ZPP_InteractionFilter();
      const b = new ZPP_InteractionFilter();
      expect(a.shouldFlow(b)).toBe(true);
    });

    it("should return false when masks don't overlap", () => {
      const a = new ZPP_InteractionFilter();
      const b = new ZPP_InteractionFilter();
      b.fluidMask = 0;
      expect(a.shouldFlow(b)).toBe(false);
    });
  });

  describe("invalidate", () => {
    it("should call invalidate_filter on all shapes", () => {
      const f = new ZPP_InteractionFilter();
      const calls: boolean[] = [];
      f.addShape({ invalidate_filter: () => calls.push(true) });
      f.addShape({ invalidate_filter: () => calls.push(true) });
      f.invalidate();
      expect(calls.length).toBe(2);
    });

    it("should do nothing when no shapes", () => {
      const f = new ZPP_InteractionFilter();
      expect(() => f.invalidate()).not.toThrow();
    });
  });
});
