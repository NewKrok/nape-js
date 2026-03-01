import { describe, it, expect } from "vitest";
import { getNape } from "../../src/core/engine";
import { Body } from "../../src/phys/Body";
import { Circle } from "../../src/shape/Circle";
import { CbType } from "../../src/callbacks/CbType";
import { Space } from "../../src/space/Space";

describe("NapeListFactory", () => {
  // ---------------------------------------------------------------------------
  // BodyList
  // ---------------------------------------------------------------------------

  describe("BodyList", () => {
    it("should be registered as constructor in nape namespace", () => {
      const nape = getNape();
      expect(typeof nape.phys.BodyList).toBe("function");
    });

    it("should create a list and add bodies", () => {
      const space = new Space();
      const body = new Body();
      body.shapes.add(new Circle(10));
      space.bodies.add(body);

      expect(space.bodies.length).toBeGreaterThanOrEqual(1);
    });

    it("should support at()", () => {
      const space = new Space();
      const b1 = new Body();
      b1.shapes.add(new Circle(10));
      const b2 = new Body();
      b2.shapes.add(new Circle(20));
      space.bodies.add(b1);
      space.bodies.add(b2);

      expect(space.bodies.at(0)).toBeDefined();
      expect(space.bodies.at(1)).toBeDefined();
    });

    it("should throw on out of bounds", () => {
      const space = new Space();
      expect(() => space.bodies.at(-1)).toThrow("out of bounds");
    });

    it("should support has()", () => {
      const space = new Space();
      const body = new Body();
      body.shapes.add(new Circle(10));
      space.bodies.add(body);

      expect(space.bodies.has(body)).toBe(true);
    });

    it("should support remove()", () => {
      const space = new Space();
      const body = new Body();
      body.shapes.add(new Circle(10));
      space.bodies.add(body);
      const len = space.bodies.length;

      space.bodies.remove(body);
      expect(space.bodies.length).toBe(len - 1);
    });

    it("should support iterator() via compiled list", () => {
      const nape = getNape();
      const list = new nape.phys.BodyList();
      const body = new Body();
      body.shapes.add(new Circle(10));
      list.push(body);

      const iter = list.iterator();
      expect(iter.hasNext()).toBe(true);
      const item = iter.next();
      expect(item).toBeDefined();
    });

    it("should support toString()", () => {
      const nape = getNape();
      const list = new nape.phys.BodyList();
      expect(list.toString()).toBe("[]");
    });
  });

  // ---------------------------------------------------------------------------
  // CbTypeList
  // ---------------------------------------------------------------------------

  describe("CbTypeList", () => {
    it("should be registered in nape namespace", () => {
      const nape = getNape();
      expect(typeof nape.callbacks.CbTypeList).toBe("function");
    });

    it("should create from constructor", () => {
      const nape = getNape();
      const list = new nape.callbacks.CbTypeList();
      expect(list.empty()).toBe(true);
      expect(list.get_length()).toBe(0);
    });

    it("should push and retrieve CbTypes", () => {
      const nape = getNape();
      const list = new nape.callbacks.CbTypeList();
      const ct = new CbType();
      list.push(ct);
      expect(list.get_length()).toBe(1);
      expect(list.at(0)).toBe(ct);
    });

    it("should support has()", () => {
      const nape = getNape();
      const list = new nape.callbacks.CbTypeList();
      const ct = new CbType();
      list.push(ct);
      expect(list.has(ct)).toBe(true);
    });

    it("should support clear()", () => {
      const nape = getNape();
      const list = new nape.callbacks.CbTypeList();
      list.push(new CbType());
      list.push(new CbType());
      list.clear();
      expect(list.empty()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // ShapeList
  // ---------------------------------------------------------------------------

  describe("ShapeList", () => {
    it("should be registered in nape namespace", () => {
      const nape = getNape();
      expect(typeof nape.shape.ShapeList).toBe("function");
    });

    it("should support shapes on a body", () => {
      const body = new Body();
      const circle = new Circle(10);
      body.shapes.add(circle);
      expect(body.shapes.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // ConstraintList
  // ---------------------------------------------------------------------------

  describe("ConstraintList", () => {
    it("should be registered in nape namespace", () => {
      const nape = getNape();
      expect(typeof nape.constraint.ConstraintList).toBe("function");
    });
  });

  // ---------------------------------------------------------------------------
  // InteractionGroupList
  // ---------------------------------------------------------------------------

  describe("InteractionGroupList", () => {
    it("should be registered in nape namespace", () => {
      const nape = getNape();
      expect(typeof nape.dynamics.InteractionGroupList).toBe("function");
    });
  });

  // ---------------------------------------------------------------------------
  // Iterator pooling
  // ---------------------------------------------------------------------------

  describe("Iterator pooling", () => {
    it("should pool iterators after exhaustion", () => {
      const nape = getNape();
      const list = new nape.callbacks.CbTypeList();
      list.push(new CbType());

      const IterClass = nape.callbacks.CbTypeIterator;
      const poolBefore = IterClass.zpp_pool;

      const iter = list.iterator();
      while (iter.hasNext()) iter.next();

      // After exhaustion, iterator is pooled
      expect(IterClass.zpp_pool).not.toBe(poolBefore);
    });
  });

  // ---------------------------------------------------------------------------
  // copy + merge
  // ---------------------------------------------------------------------------

  describe("copy and merge", () => {
    it("should copy a list (shallow)", () => {
      const nape = getNape();
      const list = new nape.callbacks.CbTypeList();
      const ct1 = new CbType();
      const ct2 = new CbType();
      list.push(ct1);
      list.push(ct2);

      const copy = list.copy();
      expect(copy.get_length()).toBe(2);
      expect(copy.at(0)).toBe(ct1);
      expect(copy.at(1)).toBe(ct2);
    });

    it("should throw on deep copy for non-copyable types", () => {
      const nape = getNape();
      const list = new nape.callbacks.CbTypeList();
      list.push(new CbType());
      expect(() => list.copy(true)).toThrow("not a copyable type");
    });

    it("should merge lists", () => {
      const nape = getNape();
      const list1 = new nape.callbacks.CbTypeList();
      const list2 = new nape.callbacks.CbTypeList();
      const ct1 = new CbType();
      const ct2 = new CbType();

      list1.push(ct1);
      list2.push(ct2);

      list1.merge(list2);
      expect(list1.get_length()).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // foreach + filter
  // ---------------------------------------------------------------------------

  describe("foreach and filter", () => {
    it("should iterate with foreach", () => {
      const nape = getNape();
      const list = new nape.callbacks.CbTypeList();
      const ct = new CbType();
      list.push(ct);

      const items: any[] = [];
      list.foreach((item: any) => items.push(item));
      expect(items).toHaveLength(1);
      expect(items[0]).toBe(ct);
    });

    it("should filter a list", () => {
      const nape = getNape();
      const list = new nape.callbacks.CbTypeList();
      const ct1 = new CbType();
      const ct2 = new CbType();
      list.push(ct1);
      list.push(ct2);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      list.filter((_item: any) => false);
      expect(list.get_length()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // fromArray
  // ---------------------------------------------------------------------------

  describe("fromArray", () => {
    it("should create list from array", () => {
      const nape = getNape();
      const ct1 = new CbType();
      const ct2 = new CbType();

      const list = nape.callbacks.CbTypeList.fromArray([ct1, ct2]);
      expect(list.get_length()).toBe(2);
    });

    it("should throw on null array", () => {
      const nape = getNape();
      expect(() => nape.callbacks.CbTypeList.fromArray(null)).toThrow(
        "null Array",
      );
    });
  });
});
