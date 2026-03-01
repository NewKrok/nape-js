import { describe, it, expect } from "vitest";
import { Compound } from "../../src/phys/Compound";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Space } from "../../src/space/Space";
import { Interactor } from "../../src/phys/Interactor";
import { ZPP_Compound } from "../../src/native/phys/ZPP_Compound";

describe("Compound", () => {
  it("should have correct __name__", () => {
    expect(Compound.__name__).toEqual(["nape", "phys", "Compound"]);
  });

  it("should have __class__ set on prototype", () => {
    expect((Compound.prototype as any).__class__).toBe(Compound);
  });

  it("should extend Interactor", () => {
    const c = new Compound();
    expect(c).toBeInstanceOf(Interactor);
  });

  it("should have zpp_inner as ZPP_Compound", () => {
    const c = new Compound();
    expect(c.zpp_inner).toBeInstanceOf(ZPP_Compound);
  });

  it("should have a unique id", () => {
    const c1 = new Compound();
    const c2 = new Compound();
    expect(typeof c1.id).toBe("number");
    expect(c1.id).not.toBe(c2.id);
  });

  it("should have userData", () => {
    const c = new Compound();
    expect(c.userData).toBeDefined();
    expect(typeof c.userData).toBe("object");
  });

  it("should report isCompound true", () => {
    const c = new Compound();
    expect(c.isCompound()).toBe(true);
    expect(c.isBody()).toBe(false);
    expect(c.isShape()).toBe(false);
  });

  it("should start with empty bodies list", () => {
    const c = new Compound();
    expect(c.bodies.get_length()).toBe(0);
  });

  it("should start with empty constraints list", () => {
    const c = new Compound();
    expect(c.constraints.get_length()).toBe(0);
  });

  it("should start with empty compounds list", () => {
    const c = new Compound();
    expect(c.compounds.get_length()).toBe(0);
  });

  it("should start with null compound and space", () => {
    const c = new Compound();
    expect(c.compound).toBeNull();
    expect(c.space).toBeNull();
  });

  describe("body management", () => {
    it("should add bodies to compound", () => {
      const c = new Compound();
      const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      b.shapes.add(new Circle(10));
      c.bodies.add(b);
      expect(c.bodies.get_length()).toBe(1);
    });

    it("should remove bodies from compound", () => {
      const c = new Compound();
      const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      b.shapes.add(new Circle(10));
      c.bodies.add(b);
      c.bodies.remove(b);
      expect(c.bodies.get_length()).toBe(0);
    });
  });

  describe("compound hierarchy", () => {
    it("should add child compounds", () => {
      const parent = new Compound();
      const child = new Compound();
      parent.compounds.add(child);
      expect(parent.compounds.get_length()).toBe(1);
    });

    it("should set compound property on child", () => {
      const parent = new Compound();
      const child = new Compound();
      parent.compounds.add(child);
      expect(child.compound).toBe(parent);
    });

    it("should prevent cycles in compound tree", () => {
      const a = new Compound();
      const b = new Compound();
      a.compounds.add(b);
      expect(() => b.compounds.add(a)).toThrow("cycle");
    });
  });

  describe("space integration", () => {
    it("should set space on compound", () => {
      const space = new Space(new Vec2(0, 100));
      const c = new Compound();
      c.space = space;
      expect(c.space).not.toBeNull();
    });

    it("should throw when setting space on inner compound", () => {
      const parent = new Compound();
      const child = new Compound();
      parent.compounds.add(child);
      expect(() => {
        child.space = new Space(new Vec2(0, 100));
      }).toThrow("inner Compound");
    });

    it("should add bodies to space through compound", () => {
      const space = new Space(new Vec2(0, 100));
      const c = new Compound();
      const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      b.shapes.add(new Circle(10));
      c.bodies.add(b);
      c.space = space;
      // Bodies inside compounds are not in space.bodies (top-level only).
      // They are registered with the space engine via addBody but stay in the compound's list.
      expect(c.bodies.get_length()).toBe(1);
      // The body should be live in the space (managed by physics engine)
      expect(space.liveBodies.length).toBeGreaterThan(0);
    });
  });

  describe("visitBodies", () => {
    it("should visit all bodies", () => {
      const c = new Compound();
      for (let i = 0; i < 3; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(i * 10, 0));
        b.shapes.add(new Circle(5));
        c.bodies.add(b);
      }
      let count = 0;
      c.visitBodies(() => count++);
      expect(count).toBe(3);
    });

    it("should visit bodies in sub-compounds", () => {
      const parent = new Compound();
      const child = new Compound();
      parent.compounds.add(child);

      const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(5));
      parent.bodies.add(b1);

      const b2 = new Body(BodyType.DYNAMIC, new Vec2(10, 0));
      b2.shapes.add(new Circle(5));
      child.bodies.add(b2);

      let count = 0;
      parent.visitBodies(() => count++);
      expect(count).toBe(2);
    });

    it("should throw on null lambda", () => {
      const c = new Compound();
      expect(() => c.visitBodies(null as any)).toThrow("null");
    });
  });

  describe("visitCompounds", () => {
    it("should visit child compounds recursively", () => {
      const root = new Compound();
      const child = new Compound();
      const grandchild = new Compound();
      root.compounds.add(child);
      child.compounds.add(grandchild);

      const visited: Compound[] = [];
      root.visitCompounds((c) => visited.push(c));
      expect(visited.length).toBe(2);
    });
  });

  describe("breakApart", () => {
    it("should distribute bodies from compound to space", () => {
      const space = new Space(new Vec2(0, 100));
      const c = new Compound();
      const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      b.shapes.add(new Circle(5));
      c.bodies.add(b);
      c.space = space;

      // Body is in compound, not directly in space.bodies
      const bodiesBefore = space.bodies.length;
      expect(bodiesBefore).toBe(0);
      c.breakApart();
      // After breakApart, body is distributed to space directly
      expect(space.bodies.length).toBe(1);
    });
  });

  describe("copy", () => {
    it("should create a deep copy", () => {
      const c = new Compound();
      const b = new Body(BodyType.DYNAMIC, new Vec2(5, 10));
      b.shapes.add(new Circle(10));
      c.bodies.add(b);

      const copy = c.copy();
      expect(copy).not.toBe(c);
      expect(copy.bodies.get_length()).toBe(1);
    });
  });

  describe("translate", () => {
    it("should translate all bodies", () => {
      const c = new Compound();
      const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      b.shapes.add(new Circle(5));
      c.bodies.add(b);

      c.translate(new Vec2(10, 20));
      expect(b.position.x).toBeCloseTo(10);
      expect(b.position.y).toBeCloseTo(20);
    });

    it("should throw on null translation", () => {
      const c = new Compound();
      expect(() => c.translate(null as any)).toThrow("null");
    });
  });

  describe("rotate", () => {
    it("should throw on null centre", () => {
      const c = new Compound();
      expect(() => c.rotate(null as any, Math.PI)).toThrow("null");
    });

    it("should throw on NaN angle", () => {
      const c = new Compound();
      expect(() => c.rotate(new Vec2(0, 0), NaN)).toThrow("NaN");
    });
  });

  describe("toString", () => {
    it("should return string with Compound prefix", () => {
      const c = new Compound();
      const str = c.toString();
      expect(str).toContain("Compound");
    });
  });
});

describe("ZPP_Compound", () => {
  it("should have correct __name__", () => {
    expect(ZPP_Compound.__name__).toEqual(["zpp_nape", "phys", "ZPP_Compound"]);
  });

  it("should have __super__ set to ZPP_Interactor", () => {
    expect(ZPP_Compound.__super__).not.toBeNull();
  });

  it("should have _nape and _zpp set", () => {
    expect(ZPP_Compound._nape).not.toBeNull();
    expect(ZPP_Compound._zpp).not.toBeNull();
  });

  it("should inherit ZPP_Interactor methods", () => {
    const zpp = new ZPP_Compound();
    expect(typeof zpp.isShape).toBe("function");
    expect(typeof zpp.isBody).toBe("function");
    expect(typeof zpp.isCompound).toBe("function");
    expect(typeof zpp.immutable_midstep).toBe("function");
    expect(typeof zpp.insert_cbtype).toBe("function");
  });

  it("should report isCompound true via inherited method", () => {
    const zpp = new ZPP_Compound();
    expect(zpp.isCompound()).toBe(true);
    expect(zpp.isBody()).toBe(false);
    expect(zpp.isShape()).toBe(false);
  });

  it("should have depth=1 by default", () => {
    const zpp = new ZPP_Compound();
    expect(zpp.depth).toBe(1);
  });

  it("should have icompound pointing to self", () => {
    const zpp = new ZPP_Compound();
    expect(zpp.icompound).toBe(zpp);
  });

  it("should have empty lists after construction", () => {
    const zpp = new ZPP_Compound();
    expect(zpp.bodies.head).toBeNull();
    expect(zpp.constraints.head).toBeNull();
    expect(zpp.compounds.head).toBeNull();
  });
});
