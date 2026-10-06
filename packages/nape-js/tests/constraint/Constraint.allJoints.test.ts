/**
 * The same behavioural checks run against every joint type. Each joint's
 * ZPP_* class carries its own copy of validation, soft/stiff error handling
 * and breaking logic, so a test written for one joint says nothing about the
 * others — this suite covers them uniformly:
 *
 *   - validation errors on step: same body twice, both bodies non-dynamic,
 *     a body outside the constraint's space
 *   - `ignore = true` stops the linked bodies colliding (pair_exists)
 *   - breakUnderError breaks the joint (soft and stiff), breakUnderForce
 *     breaks it under a large load, and BREAK listeners fire once
 *   - a soft joint's correction speed is clamped by maxError
 *   - a degenerate (non-moving, non-rotating dynamic) body gives no NaN
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { LineJoint } from "../../src/constraint/LineJoint";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";
import { SpringJoint } from "../../src/constraint/SpringJoint";
import { MotorJoint } from "../../src/constraint/MotorJoint";
import type { Constraint } from "../../src/constraint/Constraint";
import { ConstraintListener } from "../../src/callbacks/ConstraintListener";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { CbType } from "../../src/callbacks/CbType";
import "../../src/index";

const DT = 1 / 60;
const v = (x: number, y: number) => new Vec2(x, y);

interface JointCase {
  name: string;
  make(b1: Body, b2: Body): Constraint;
  /** Positional error of the joint (px, or rad for angular joints); null if it has none. */
  error?(b1: Body, b2: Body): number;
  /** Displace b2 so the joint is violated by `amount` error units. */
  violate?(b2: Body, amount: number): void;
}

const dist = (b1: Body, b2: Body) =>
  Math.hypot(b2.position.x - b1.position.x, b2.position.y - b1.position.y);
const moveX = (b2: Body, d: number) => {
  b2.position = v(b2.position.x + d, b2.position.y);
};

const JOINTS: JointCase[] = [
  {
    name: "PivotJoint",
    make: (b1, b2) => new PivotJoint(b1, b2, v(0, 0), v(-40, 0)),
    error: (b1, b2) => Math.abs(dist(b1, b2) - 40),
    violate: moveX,
  },
  {
    name: "WeldJoint",
    make: (b1, b2) => new WeldJoint(b1, b2, v(0, 0), v(-40, 0)),
    error: (b1, b2) => Math.abs(dist(b1, b2) - 40),
    violate: moveX,
  },
  {
    name: "DistanceJoint",
    make: (b1, b2) => new DistanceJoint(b1, b2, v(0, 0), v(0, 0), 40, 40),
    error: (b1, b2) => Math.abs(dist(b1, b2) - 40),
    violate: moveX,
  },
  {
    name: "LineJoint",
    make: (b1, b2) => new LineJoint(b1, b2, v(0, 0), v(-40, 0), v(1, 0), 0, 0),
    error: (b1, b2) => Math.abs(dist(b1, b2) - 40),
    violate: moveX,
  },
  {
    name: "PulleyJoint",
    // Both linked pairs are (b1, b2): the rope length is twice their distance.
    make: (b1, b2) => new PulleyJoint(b1, b2, b2, b1, v(0, 0), v(0, 0), v(0, 0), v(0, 0), 80, 80),
    error: (b1, b2) => Math.abs(2 * dist(b1, b2) - 80),
    violate: (b2, d) => moveX(b2, d / 2),
  },
  {
    name: "AngleJoint",
    make: (b1, b2) => new AngleJoint(b1, b2, 0, 0),
    error: (b1, b2) => Math.abs(b2.rotation - b1.rotation),
    violate: (b2, d) => {
      b2.rotation += d;
    },
  },
  {
    // Always soft: `stiff = true` is a no-op, so both breaking variants run soft.
    name: "SpringJoint",
    make: (b1, b2) => new SpringJoint(b1, b2, v(0, 0), v(0, 0), 40),
    error: (b1, b2) => Math.abs(dist(b1, b2) - 40),
    violate: moveX,
  },
  { name: "MotorJoint", make: (b1, b2) => new MotorJoint(b1, b2, 0, 1) },
];

function pair(space: Space, dynamic2 = true) {
  const b1 = new Body(BodyType.DYNAMIC, v(0, 0));
  b1.shapes.add(new Circle(10));
  const b2 = new Body(dynamic2 ? BodyType.DYNAMIC : BodyType.STATIC, v(40, 0));
  b2.shapes.add(new Circle(10));
  b1.space = space;
  b2.space = space;
  return { b1, b2 };
}

function breaks(space: Space) {
  let n = 0;
  space.listeners.add(
    new ConstraintListener(CbEvent.BREAK, CbType.ANY_CONSTRAINT, () => {
      n++;
    }),
  );
  return () => n;
}

describe("All joints — validation on step", () => {
  for (const J of JOINTS) {
    it(`${J.name}: same body twice throws`, () => {
      const space = new Space(v(0, 0));
      const { b1 } = pair(space);
      J.make(b1, b1).space = space;
      expect(() => space.step(DT)).toThrow(/body1 ?==? ?body2|body1=body2/);
    });

    it(`${J.name}: both bodies non-dynamic throws`, () => {
      const space = new Space(v(0, 0));
      const s1 = new Body(BodyType.STATIC, v(0, 0));
      const s2 = new Body(BodyType.KINEMATIC, v(40, 0));
      s1.space = space;
      s2.space = space;
      J.make(s1, s2).space = space;
      expect(() => space.step(DT)).toThrow(/non-dynamic/);
    });

    it(`${J.name}: body outside the constraint's space throws`, () => {
      const space = new Space(v(0, 0));
      const { b1 } = pair(space);
      const stray = new Body(BodyType.DYNAMIC, v(40, 0));
      stray.shapes.add(new Circle(10));
      J.make(b1, stray).space = space;
      expect(() => space.step(DT)).toThrow(/same space/);
    });
  }
});

describe("All joints — ignore stops the linked bodies colliding", () => {
  for (const J of JOINTS) {
    for (const ignore of [true, false]) {
      it(`${J.name}: ignore = ${ignore}`, () => {
        const space = new Space(v(0, 0));
        const { b1, b2 } = pair(space);
        // Overlap the two discs so they would collide.
        b2.position = v(5, 0);
        const j = J.make(b1, b2);
        j.ignore = ignore;
        j.space = space;
        space.step(DT);
        const touching = b1.arbiters.length > 0;
        expect(touching).toBe(!ignore);
      });
    }
  }
});

describe("All joints — breaking", () => {
  for (const J of JOINTS.filter((j) => j.violate)) {
    for (const stiff of [false, true]) {
      it(`${J.name}: breakUnderError breaks a ${stiff ? "stiff" : "soft"} joint`, () => {
        const space = new Space(v(0, 0));
        const { b1, b2 } = pair(space);
        const broke = breaks(space);
        const j = J.make(b1, b2);
        j.stiff = stiff;
        j.maxError = J.name === "AngleJoint" ? 0.1 : 5;
        j.breakUnderError = true;
        j.space = space;
        for (let i = 0; i < 10; i++) space.step(DT);
        expect(broke()).toBe(0);
        expect(j.space).toBe(space);

        J.violate!(b2, J.name === "AngleJoint" ? 2 : 100);
        for (let i = 0; i < 3; i++) space.step(DT);
        expect(broke()).toBe(1);
        expect(j.space).toBeNull(); // removeOnBreak defaults to true
      });
    }

    it(`${J.name}: breakUnderForce breaks under a load it cannot hold`, () => {
      const space = new Space(v(0, 0));
      const { b1, b2 } = pair(space);
      const broke = breaks(space);
      const j = J.make(b1, b2);
      j.maxForce = 1;
      j.breakUnderForce = true;
      j.space = space;
      space.step(DT);
      expect(broke()).toBe(0);
      if (J.name === "AngleJoint") b2.angularVel = 50;
      else b2.velocity = v(2000, 0);
      for (let i = 0; i < 3; i++) space.step(DT);
      expect(broke()).toBe(1);
      expect(j.space).toBeNull();
    });

    it(`${J.name}: removeOnBreak = false keeps the broken joint, inactive`, () => {
      const space = new Space(v(0, 0));
      const { b1, b2 } = pair(space);
      const broke = breaks(space);
      const j = J.make(b1, b2);
      j.maxForce = 1;
      j.breakUnderForce = true;
      j.removeOnBreak = false;
      j.space = space;
      space.step(DT);
      if (J.name === "AngleJoint") b2.angularVel = 50;
      else b2.velocity = v(2000, 0);
      for (let i = 0; i < 3; i++) space.step(DT);
      expect(broke()).toBe(1);
      expect(j.space).toBe(space);
      expect(j.active).toBe(false);
    });
  }
});

describe("All joints — soft correction speed is clamped by maxError", () => {
  for (const J of JOINTS.filter((j) => j.violate)) {
    it(J.name, () => {
      const angular = J.name === "AngleJoint";
      const run = (maxError: number) => {
        const space = new Space(v(0, 0));
        // b2 static: only b1 moves, so the error closes at b1's speed.
        const { b1, b2 } = pair(space, false);
        const j = J.make(b1, b2);
        j.stiff = false;
        j.frequency = 20;
        j.damping = 1;
        j.maxError = maxError;
        j.space = space;
        // Static b2 cannot be moved once in space, so violate through b1.
        if (angular) b1.rotation = 1.5;
        else b1.position = v(b1.position.x - (J.name === "PulleyJoint" ? 50 : 100), 0);
        const e0 = J.error!(b1, b2);
        for (let i = 0; i < 60; i++) space.step(DT);
        return { e0, e1: J.error!(b1, b2) };
      };
      const cap = angular ? 0.3 : 20;
      const clamped = run(cap);
      const free = run(Infinity);
      const closed = clamped.e0 - clamped.e1;
      expect(closed).toBeGreaterThan(0);
      // One second at the capped bias speed (pulley error counts the rope twice).
      const scale = J.name === "PulleyJoint" ? 2 : 1;
      expect(closed).toBeLessThanOrEqual(cap * scale * 1.05);
      expect(free.e1).toBeLessThan(clamped.e1);
    });
  }
});

describe("All joints — degenerate mass gives no NaN", () => {
  for (const J of JOINTS) {
    it(J.name, () => {
      const space = new Space(v(0, 600));
      const { b1, b2 } = pair(space, false);
      b1.allowMovement = false;
      b1.allowRotation = false;
      J.make(b1, b2).space = space;
      for (let i = 0; i < 30; i++) space.step(DT);
      for (const x of [b1.position.x, b1.position.y, b1.rotation, b1.velocity.x, b1.velocity.y]) {
        expect(Number.isFinite(x)).toBe(true);
      }
      expect(b1.position.x).toBe(0);
      expect(b1.position.y).toBe(0);
    });
  }
});
