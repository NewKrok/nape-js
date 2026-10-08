/**
 * Serialization regressions found by the behaviour golden suite:
 *
 * - A constraint pinned to `space.world` (the usual way to anchor a joint to
 *   the world — `new PivotJoint(space.world, body, …)`) was saved as "no
 *   body", restored with a null body, and the restored space threw on its
 *   first step ("PivotJoint cannot be simulated null bodies").
 * - A space using `Broadphase.SPATIAL_HASH` was saved as `SWEEP_AND_PRUNE`
 *   (the spatial hash also sets the internal `is_sweep` flag).
 */
import { describe, it, expect } from "vitest";
import {
  AngleJoint,
  Body,
  BodyType,
  Broadphase,
  Circle,
  DistanceJoint,
  LineJoint,
  MotorJoint,
  PivotJoint,
  PulleyJoint,
  Space,
  SpringJoint,
  Vec2,
  WeldJoint,
} from "../../src";
import type { Constraint } from "../../src";
import {
  spaceFromBinary,
  spaceFromJSON,
  spaceToBinary,
  spaceToJSON,
} from "../../src/serialization";

const roundTrips: Array<[string, (s: Space) => Space]> = [
  ["JSON", (s) => spaceFromJSON(JSON.parse(JSON.stringify(spaceToJSON(s))))],
  ["binary", (s) => spaceFromBinary(spaceToBinary(s))],
];

function bob(space: Space, x: number): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, 50));
  b.shapes.add(new Circle(5));
  b.space = space;
  return b;
}

/** One world-anchored instance of every built-in joint. */
function worldAnchoredScene(): Space {
  const space = new Space(new Vec2(0, 300));
  const w = space.world;
  const joints: Constraint[] = [
    new PivotJoint(w, bob(space, 0), new Vec2(0, 0), new Vec2(0, 0)),
    new DistanceJoint(bob(space, 40), w, new Vec2(0, 0), new Vec2(40, 0), 10, 40),
    new AngleJoint(w, bob(space, 80), -0.2, 0.2),
    new MotorJoint(w, bob(space, 120), 2),
    new LineJoint(w, bob(space, 160), new Vec2(160, 0), new Vec2(0, 0), new Vec2(0, 1), 0, 80),
    new WeldJoint(w, bob(space, 200), new Vec2(200, 50), new Vec2(0, 0)),
    new SpringJoint(w, bob(space, 240), new Vec2(240, 0), new Vec2(0, 0), 30),
    new PulleyJoint(
      w,
      bob(space, 280),
      w,
      bob(space, 320),
      new Vec2(280, 0),
      new Vec2(0, 0),
      new Vec2(320, 0),
      new Vec2(0, 0),
      60,
      120,
    ),
  ];
  for (const j of joints) j.space = space;
  return space;
}

describe("constraints anchored to space.world", () => {
  for (const [format, roundTrip] of roundTrips) {
    it(`${format}: restores world anchors to the restored space's world and simulates`, () => {
      const original = worldAnchoredScene();
      const restored = roundTrip(original);
      const cs = restored.constraints;
      expect(cs.length).toBe(8);
      for (let i = 0; i < cs.length; i++) {
        const c = cs.at(i) as any;
        const bodies = [c.body1, c.body2, c.body3, c.body4].filter((b) => b !== undefined);
        expect(bodies).toContain(restored.world);
        expect(bodies).not.toContain(null);
        expect(bodies).not.toContain(original.world);
      }
      expect(() => {
        for (let i = 0; i < 60; i++) restored.step(1 / 60);
      }).not.toThrow();
    });

    it(`${format}: the restored copy continues exactly like the original`, () => {
      const original = worldAnchoredScene();
      const restored = roundTrip(original);
      for (let i = 0; i < 90; i++) {
        original.step(1 / 60);
        restored.step(1 / 60);
      }
      for (let i = 0; i < original.bodies.length; i++) {
        const a = original.bodies.at(i);
        const b = restored.bodies.at(i);
        expect(b.position.x).toBe(a.position.x);
        expect(b.position.y).toBe(a.position.y);
        expect(b.rotation).toBe(a.rotation);
      }
    });
  }

  it("JSON stores the world as body id -2 and no body as null", () => {
    const space = new Space();
    const b = bob(space, 0);
    new PivotJoint(space.world, b, new Vec2(0, 0), new Vec2(0, 0)).space = space;
    new PivotJoint(null, b, new Vec2(0, 0), new Vec2(0, 0)).space = space;
    const snap = spaceToJSON(space);
    const ids = snap.constraints.map((c) => [c.body1Id, c.body2Id]);
    expect(ids).toHaveLength(2);
    expect(ids).toContainEqual([-2, 0]);
    expect(ids).toContainEqual([null, 0]);
  });
});

describe("broadphase round-trip", () => {
  for (const [format, roundTrip] of roundTrips) {
    for (const [name, bp] of [
      ["SWEEP_AND_PRUNE", Broadphase.SWEEP_AND_PRUNE],
      ["DYNAMIC_AABB_TREE", Broadphase.DYNAMIC_AABB_TREE],
      ["SPATIAL_HASH", Broadphase.SPATIAL_HASH],
    ] as Array<[string, Broadphase]>) {
      it(`${format}: ${name} is restored`, () => {
        const space = new Space(new Vec2(0, 100), bp);
        bob(space, 0);
        expect(roundTrip(space).broadphase).toBe(bp);
      });
    }
  }
});
