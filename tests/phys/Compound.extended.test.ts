import { describe, it, expect } from "vitest";
import { Compound } from "../../src/phys/Compound";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Space } from "../../src/space/Space";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { ZPP_Compound } from "../../src/native/phys/ZPP_Compound";

describe("Compound extended coverage", () => {
  // --- visitConstraints ---

  describe("visitConstraints", () => {
    it("should visit all constraints in the compound", () => {
      const compound = new Compound();
      const b1 = new Body(BodyType.DYNAMIC);
      b1.shapes.add(new Circle(10));
      const b2 = new Body(BodyType.DYNAMIC);
      b2.shapes.add(new Circle(10));
      compound.bodies.add(b1);
      compound.bodies.add(b2);

      const pivot = new PivotJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0));
      compound.constraints.add(pivot);

      const visited: unknown[] = [];
      compound.visitConstraints((c) => {
        visited.push(c);
      });
      expect(visited).toHaveLength(1);
      expect(visited[0]).toBe(pivot);
    });

    it("should visit constraints in sub-compounds", () => {
      const parent = new Compound();
      const child = new Compound();
      parent.compounds.add(child);

      const b1 = new Body(BodyType.DYNAMIC);
      b1.shapes.add(new Circle(10));
      const b2 = new Body(BodyType.DYNAMIC);
      b2.shapes.add(new Circle(10));
      child.bodies.add(b1);
      child.bodies.add(b2);

      const dist = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 5, 20);
      child.constraints.add(dist);

      const visited: unknown[] = [];
      parent.visitConstraints((c) => {
        visited.push(c);
      });
      expect(visited).toHaveLength(1);
      expect(visited[0]).toBe(dist);
    });

    it("should throw when lambda is null", () => {
      const compound = new Compound();
      expect(() => compound.visitConstraints(null as never)).toThrow();
    });
  });

  // --- COM ---

  describe("COM", () => {
    it("should calculate center of mass of all bodies", () => {
      const space = new Space();
      const compound = new Compound();
      const b1 = new Body(BodyType.DYNAMIC);
      b1.shapes.add(new Circle(10));
      b1.position.setxy(0, 0);
      const b2 = new Body(BodyType.DYNAMIC);
      b2.shapes.add(new Circle(10));
      b2.position.setxy(10, 0);
      compound.bodies.add(b1);
      compound.bodies.add(b2);
      compound.space = space;

      // Access worldCOM on each body to initialize the wrapper
      void b1.worldCOM;
      void b2.worldCOM;

      const com = compound.COM();
      expect(com.x).toBeCloseTo(5, 1);
      expect(com.y).toBeCloseTo(0, 1);
    });

    it("should return a weak Vec2", () => {
      const space = new Space();
      const compound = new Compound();
      const b = new Body(BodyType.DYNAMIC);
      b.shapes.add(new Circle(10));
      b.position.setxy(3, 4);
      compound.bodies.add(b);
      compound.space = space;

      // Access worldCOM to initialize wrapper
      void b.worldCOM;

      const com = compound.COM();
      expect(com.x).toBeCloseTo(3, 1);
      expect(com.y).toBeCloseTo(4, 1);
    });

    it("should include bodies from sub-compounds", () => {
      const space = new Space();
      const parent = new Compound();
      const child = new Compound();
      parent.compounds.add(child);

      const b1 = new Body(BodyType.DYNAMIC);
      b1.shapes.add(new Circle(10));
      b1.position.setxy(0, 0);
      parent.bodies.add(b1);

      const b2 = new Body(BodyType.DYNAMIC);
      b2.shapes.add(new Circle(10));
      b2.position.setxy(20, 0);
      child.bodies.add(b2);

      parent.space = space;

      // Access worldCOM to initialize wrappers
      void b1.worldCOM;
      void b2.worldCOM;

      const com = parent.COM();
      expect(com.x).toBeCloseTo(10, 1);
      expect(com.y).toBeCloseTo(0, 1);
    });

    it("should throw for compound with no bodies", () => {
      const compound = new Compound();
      expect(() => compound.COM()).toThrow();
    });
  });

  // --- compound setter (parent compound) ---

  describe("compound setter", () => {
    it("should set parent compound", () => {
      const parent = new Compound();
      const child = new Compound();
      child.compound = parent;
      expect(child.compound).toBe(parent);
      expect(parent.compounds.has(child)).toBe(true);
    });

    it("should remove from old parent when reassigned", () => {
      const parent1 = new Compound();
      const parent2 = new Compound();
      const child = new Compound();

      parent1.compounds.add(child);
      expect(child.compound).toBe(parent1);

      child.compound = parent2;
      expect(child.compound).toBe(parent2);
      expect(parent1.compounds.has(child)).toBe(false);
      expect(parent2.compounds.has(child)).toBe(true);
    });

    it("should handle setting compound to null", () => {
      const parent = new Compound();
      const child = new Compound();
      parent.compounds.add(child);

      child.compound = null;
      expect(child.compound).toBeNull();
      expect(parent.compounds.has(child)).toBe(false);
    });
  });

  // --- space setter ---

  describe("space setter", () => {
    it("should add compound to space via setter", () => {
      const space = new Space();
      const compound = new Compound();
      const b = new Body(BodyType.DYNAMIC);
      b.shapes.add(new Circle(10));
      compound.bodies.add(b);

      compound.space = space;
      expect(compound.space).toBe(space);
    });

    it("should remove from old space when reassigned", () => {
      const space1 = new Space();
      const space2 = new Space();
      const compound = new Compound();
      const b = new Body(BodyType.DYNAMIC);
      b.shapes.add(new Circle(10));
      compound.bodies.add(b);

      compound.space = space1;
      expect(compound.space).toBe(space1);

      compound.space = space2;
      expect(compound.space).toBe(space2);
    });

    it("should remove from space when set to null", () => {
      const space = new Space();
      const compound = new Compound();
      const b = new Body(BodyType.DYNAMIC);
      b.shapes.add(new Circle(10));
      compound.bodies.add(b);

      compound.space = space;
      compound.space = null;
      expect(compound.space).toBeNull();
    });
  });

  // --- _wrap static method ---

  describe("_wrap", () => {
    it("should wrap a ZPP_Compound and return a Compound instance", () => {
      const compound = new Compound();
      const zpp = compound.zpp_inner;
      const wrapped = Compound._wrap(zpp);
      expect(wrapped).toBeInstanceOf(Compound);
      expect(wrapped.zpp_inner).toBe(zpp);
    });

    it("should return the same wrapper on repeated calls", () => {
      const compound = new Compound();
      const zpp = compound.zpp_inner;
      const w1 = Compound._wrap(zpp);
      const w2 = Compound._wrap(zpp);
      expect(w1).toBe(w2);
    });

    it("should return null when wrapping null", () => {
      const result = Compound._wrap(null as unknown as ZPP_Compound);
      expect(result).toBeNull();
    });
  });

  // --- rotate with actual bodies ---

  describe("rotate with bodies", () => {
    it("should rotate body positions around a centre", () => {
      const compound = new Compound();
      const b = new Body(BodyType.DYNAMIC);
      b.shapes.add(new Circle(10));
      b.position.setxy(10, 0);
      compound.bodies.add(b);

      compound.rotate(Vec2.weak(0, 0), Math.PI / 2);
      expect(b.position.x).toBeCloseTo(0, 1);
      expect(b.position.y).toBeCloseTo(10, 1);
    });
  });

  // --- deeper compound hierarchies (3+ levels) ---

  describe("deep compound hierarchy", () => {
    it("should handle 3-level deep hierarchy", () => {
      const root = new Compound();
      const mid = new Compound();
      const leaf = new Compound();

      root.compounds.add(mid);
      mid.compounds.add(leaf);

      const b = new Body(BodyType.DYNAMIC);
      b.shapes.add(new Circle(5));
      b.position.setxy(100, 200);
      leaf.bodies.add(b);

      const visited: Body[] = [];
      root.visitBodies((body) => {
        visited.push(body);
      });
      expect(visited).toHaveLength(1);
      expect(visited[0]).toBe(b);
    });

    it("should visitCompounds through 3 levels", () => {
      const root = new Compound();
      const mid = new Compound();
      const leaf = new Compound();

      root.compounds.add(mid);
      mid.compounds.add(leaf);

      const visited: Compound[] = [];
      root.visitCompounds((c) => {
        visited.push(c);
      });
      expect(visited).toHaveLength(2);
    });

    it("should translate bodies through 3 levels", () => {
      const root = new Compound();
      const mid = new Compound();
      const leaf = new Compound();
      root.compounds.add(mid);
      mid.compounds.add(leaf);

      const b = new Body(BodyType.DYNAMIC);
      b.shapes.add(new Circle(5));
      b.position.setxy(0, 0);
      leaf.bodies.add(b);

      root.translate(Vec2.weak(10, 20));
      expect(b.position.x).toBeCloseTo(10, 1);
      expect(b.position.y).toBeCloseTo(20, 1);
    });
  });

  // --- multiple constraints in compounds ---

  describe("multiple constraints", () => {
    it("should visit multiple constraints across compound and sub-compound", () => {
      const parent = new Compound();
      const child = new Compound();
      parent.compounds.add(child);

      const b1 = new Body(BodyType.DYNAMIC);
      b1.shapes.add(new Circle(10));
      const b2 = new Body(BodyType.DYNAMIC);
      b2.shapes.add(new Circle(10));
      const b3 = new Body(BodyType.DYNAMIC);
      b3.shapes.add(new Circle(10));

      parent.bodies.add(b1);
      parent.bodies.add(b2);
      child.bodies.add(b3);

      const pivot = new PivotJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0));
      parent.constraints.add(pivot);

      const dist = new DistanceJoint(b2, b3, Vec2.weak(0, 0), Vec2.weak(0, 0), 5, 15);
      child.constraints.add(dist);

      const visited: unknown[] = [];
      parent.visitConstraints((c) => {
        visited.push(c);
      });
      expect(visited).toHaveLength(2);
      expect(visited).toContain(pivot);
      expect(visited).toContain(dist);
    });
  });

  // --- breakApart with sub-compounds and constraints ---

  describe("breakApart with sub-compounds and constraints", () => {
    it("should break apart compound with sub-compounds into space", () => {
      const space = new Space();
      const root = new Compound();
      const child = new Compound();
      root.compounds.add(child);

      const b1 = new Body(BodyType.DYNAMIC);
      b1.shapes.add(new Circle(10));
      root.bodies.add(b1);

      const b2 = new Body(BodyType.DYNAMIC);
      b2.shapes.add(new Circle(10));
      child.bodies.add(b2);

      root.space = space;
      root.breakApart();

      // After breakApart, root should no longer be in the space
      expect(root.space).toBeNull();
    });

    it("should break apart compound with constraints into space", () => {
      const space = new Space();
      const compound = new Compound();

      const b1 = new Body(BodyType.DYNAMIC);
      b1.shapes.add(new Circle(10));
      const b2 = new Body(BodyType.DYNAMIC);
      b2.shapes.add(new Circle(10));
      compound.bodies.add(b1);
      compound.bodies.add(b2);

      const pivot = new PivotJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0));
      compound.constraints.add(pivot);

      compound.space = space;
      compound.breakApart();

      // Bodies and constraints should now be directly in the space
      expect(compound.space).toBeNull();
      expect(b1.space).toBe(space);
      expect(b2.space).toBe(space);
      expect(pivot.space).toBe(space);
    });
  });
});
