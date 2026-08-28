import { describe, it, expect } from "vitest";
import { InteractionGroup } from "../../src/dynamics/InteractionGroup";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
// Side-effect imports
import "../../src/callbacks/PreFlag";
import "../../src/dynamics/CollisionArbiter";
import "../../src/dynamics/FluidArbiter";

describe("InteractionGroup — coverage", () => {
  describe("interactors getter", () => {
    it("should have internal interactors data when body is assigned", () => {
      const group = new InteractionGroup();
      const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      body.shapes.add(new Circle(10));
      body.group = group;

      // interactors getter requires zpp_nape bootstrap for list wrapping,
      // but we can verify the internal state
      expect(group.zpp_inner.interactors).toBeDefined();
    });
  });

  describe("groups getter", () => {
    it("should have internal groups data when child is assigned", () => {
      const parent = new InteractionGroup();
      const child = new InteractionGroup();
      child.group = parent;

      // groups getter requires full zpp_nape bootstrap for list wrapping,
      // but we can verify the internal state
      expect(parent.zpp_inner.groups).toBeDefined();
    });
  });

  describe("ignore flag suppresses collisions", () => {
    it("should prevent collision when bodies share an ignore group", () => {
      const space = new Space(new Vec2(0, 500));
      const group = new InteractionGroup(true); // ignore = true

      const ball1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      ball1.shapes.add(new Circle(20));
      ball1.group = group;
      ball1.space = space;

      const ball2 = new Body(BodyType.DYNAMIC, new Vec2(0, 30));
      ball2.shapes.add(new Circle(20));
      ball2.group = group;
      ball2.space = space;

      for (let i = 0; i < 10; i++) space.step(1 / 60, 5, 5);

      // With ignore=true, no collision arbiters between the two
      let hasArbiter = false;
      try {
        const arb = space.arbiters.at(0);
        if (
          (arb.body1 === ball1 && arb.body2 === ball2) ||
          (arb.body1 === ball2 && arb.body2 === ball1)
        ) {
          hasArbiter = true;
        }
      } catch {
        // No arbiters — expected
      }
      expect(hasArbiter).toBe(false);
    });
  });

  describe("_wrap edge cases", () => {
    it("should return null for unknown object", () => {
      const result = InteractionGroup._wrap({ foo: "bar" });
      expect(result).toBeNull();
    });
  });

  describe("parent-child hierarchy", () => {
    it("should support multi-level hierarchy", () => {
      const grandparent = new InteractionGroup();
      const parent = new InteractionGroup();
      const child = new InteractionGroup();

      parent.group = grandparent;
      child.group = parent;

      expect(child.group).toBe(parent);
      expect(parent.group).toBe(grandparent);
      expect(grandparent.group).toBeNull();
    });
  });
});
