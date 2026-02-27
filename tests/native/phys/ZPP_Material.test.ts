import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_Material } from "../../../src/native/phys/ZPP_Material";
import { createMockZpp, createMockNape, MockZNPList } from "../_mocks";

describe("ZPP_Material", () => {
  beforeEach(() => {
    ZPP_Material.zpp_pool = null;
    ZPP_Material._zpp = createMockZpp();
    ZPP_Material._nape = createMockNape();
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Material.__name__).toEqual(["zpp_nape", "phys", "ZPP_Material"]);
    });
  });

  describe("static constants", () => {
    it("should define invalidation bitmask flags", () => {
      expect(ZPP_Material.WAKE).toBe(1);
      expect(ZPP_Material.PROPS).toBe(2);
      expect(ZPP_Material.ANGDRAG).toBe(4);
      expect(ZPP_Material.ARBITERS).toBe(8);
    });
  });

  describe("constructor", () => {
    it("should initialize with default property values", () => {
      const m = new ZPP_Material();
      expect(m.elasticity).toBe(0);
      expect(m.dynamicFriction).toBe(1);
      expect(m.staticFriction).toBe(2);
      expect(m.density).toBe(0.001);
      expect(m.rollingFriction).toBe(0.01);
    });

    it("should create shapes list", () => {
      const m = new ZPP_Material();
      expect(m.shapes).toBeInstanceOf(MockZNPList);
    });

    it("should initialize other fields to defaults", () => {
      const m = new ZPP_Material();
      expect(m.outer).toBeNull();
      expect(m.userData).toBeNull();
      expect(m.next).toBeNull();
      expect(m.wrap_shapes).toBeNull();
      expect(m.__class__).toBe(ZPP_Material);
    });
  });

  describe("wrapper", () => {
    it("should create wrapper when outer is null", () => {
      const m = new ZPP_Material();
      const w = m.wrapper();
      expect(w).not.toBeNull();
      expect(w.zpp_inner).toBe(m);
      expect(m.outer).toBe(w);
    });

    it("should return existing wrapper", () => {
      const m = new ZPP_Material();
      const w1 = m.wrapper();
      const w2 = m.wrapper();
      expect(w1).toBe(w2);
    });
  });

  describe("free", () => {
    it("should null out outer", () => {
      const m = new ZPP_Material();
      m.outer = { id: "test" };
      m.free();
      expect(m.outer).toBeNull();
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const m = new ZPP_Material();
      expect(() => m.alloc()).not.toThrow();
    });
  });

  describe("feature_cons", () => {
    it("should reinitialize shapes list", () => {
      const m = new ZPP_Material();
      const originalShapes = m.shapes;
      m.feature_cons();
      expect(m.shapes).not.toBe(originalShapes);
      expect(m.shapes).toBeInstanceOf(MockZNPList);
    });
  });

  describe("addShape / remShape", () => {
    it("should add and remove shapes", () => {
      const m = new ZPP_Material();
      const shape = { id: "shape1" };
      m.addShape(shape);
      expect(m.shapes.has(shape)).toBe(true);
      m.remShape(shape);
      expect(m.shapes.has(shape)).toBe(false);
    });
  });

  describe("copy", () => {
    it("should create a copy with same property values", () => {
      const m = new ZPP_Material();
      m.dynamicFriction = 0.5;
      m.staticFriction = 0.6;
      m.density = 2.0;
      m.elasticity = 0.8;
      m.rollingFriction = 0.05;

      const c = m.copy();
      expect(c).not.toBe(m);
      expect(c.dynamicFriction).toBe(0.5);
      expect(c.staticFriction).toBe(0.6);
      expect(c.density).toBe(2.0);
      expect(c.elasticity).toBe(0.8);
      expect(c.rollingFriction).toBe(0.05);
    });
  });

  describe("set", () => {
    it("should copy all values from another material", () => {
      const src = new ZPP_Material();
      src.dynamicFriction = 0.1;
      src.staticFriction = 0.2;
      src.density = 3.0;
      src.elasticity = 0.9;
      src.rollingFriction = 0.02;

      const dst = new ZPP_Material();
      dst.set(src);
      expect(dst.dynamicFriction).toBe(0.1);
      expect(dst.staticFriction).toBe(0.2);
      expect(dst.density).toBe(3.0);
      expect(dst.elasticity).toBe(0.9);
      expect(dst.rollingFriction).toBe(0.02);
    });
  });

  describe("invalidate", () => {
    it("should call invalidate_material on all shapes", () => {
      const m = new ZPP_Material();
      const calls: number[] = [];
      const shape1 = { invalidate_material: (x: number) => calls.push(x) };
      const shape2 = { invalidate_material: (x: number) => calls.push(x) };
      m.addShape(shape1);
      m.addShape(shape2);

      m.invalidate(ZPP_Material.PROPS);
      expect(calls).toEqual([ZPP_Material.PROPS, ZPP_Material.PROPS]);
    });

    it("should do nothing when no shapes", () => {
      const m = new ZPP_Material();
      expect(() => m.invalidate(ZPP_Material.WAKE)).not.toThrow();
    });
  });
});
