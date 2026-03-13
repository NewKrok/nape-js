/**
 * Advanced Body property and state tests.
 * Exercises isSleeping, cbTypes, bodyType transitions, space assignment,
 * and impulse query methods.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { CbType } from "../../src/callbacks/CbType";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { InteractionType } from "../../src/callbacks/InteractionType";

function dynCircle(x = 0, y = 0, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

// ---------------------------------------------------------------------------
// Body sleeping state
// ---------------------------------------------------------------------------
describe("Body — sleeping state", () => {
  it("body starts awake (isSleeping is boolean)", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dynCircle();
    b.space = space;

    expect(typeof b.isSleeping).toBe("boolean");
  });

  it("body should eventually sleep with no gravity and no velocity", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dynCircle();
    b.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);

    expect(b.isSleeping).toBe(true);
  });

  it("body should wake after impulse", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dynCircle();
    b.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);
    expect(b.isSleeping).toBe(true);

    b.applyImpulse(new Vec2(500, 0));
    space.step(1 / 60);

    expect(b.isSleeping).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Body cbTypes
// ---------------------------------------------------------------------------
describe("Body — cbTypes", () => {
  it("cbTypes should be accessible", () => {
    const b = dynCircle();
    expect(b.cbTypes).toBeDefined();
  });

  it("should add a CbType to body.cbTypes", () => {
    const b = dynCircle();
    const ct = new CbType();

    (b.cbTypes as any).add(ct);

    expect((b.cbTypes as any).has(ct)).toBe(true);
  });

  it("should remove a CbType from body.cbTypes", () => {
    const b = dynCircle();
    const ct = new CbType();

    (b.cbTypes as any).add(ct);
    (b.cbTypes as any).remove(ct);

    expect((b.cbTypes as any).has(ct)).toBe(false);
  });

  it("cbTypes listener should only fire for matching type", () => {
    const space = new Space(new Vec2(0, 500));
    const ct = new CbType();
    let count = 0;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      ct,
      CbType.ANY_BODY,
      () => {
        count++;
      },
    );
    listener.space = space;

    const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
    floor.shapes.add(new Polygon(Polygon.box(300, 10)));
    (floor.cbTypes as any).add(ct);
    floor.space = space;

    const ball = dynCircle(0, 0);
    (ball.cbTypes as any).add(ct);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("listener should NOT fire when body lacks required CbType", () => {
    const space = new Space(new Vec2(0, 500));
    const ct = new CbType();
    let count = 0;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      ct,
      ct,
      () => {
        count++;
      },
    );
    listener.space = space;

    // Neither body has ct
    const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
    floor.shapes.add(new Polygon(Polygon.box(300, 10)));
    floor.space = space;

    const ball = dynCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Body type / bodyType
// ---------------------------------------------------------------------------
describe("Body — bodyType property", () => {
  it("DYNAMIC body should have correct bodyType", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    expect(b.type).toBe(BodyType.DYNAMIC);
  });

  it("STATIC body should have correct bodyType", () => {
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    expect(b.type).toBe(BodyType.STATIC);
  });

  it("KINEMATIC body should have correct bodyType", () => {
    const b = new Body(BodyType.KINEMATIC, new Vec2(0, 0));
    expect(b.type).toBe(BodyType.KINEMATIC);
  });

  it("should allow changing body type to STATIC", () => {
    const space = new Space(new Vec2(0, 100));
    const b = dynCircle();
    b.space = space;
    space.step(1 / 60);

    b.type = BodyType.STATIC;
    const posY = b.position.y;
    for (let i = 0; i < 30; i++) space.step(1 / 60);

    // Should not move as static
    expect(b.position.y).toBeCloseTo(posY, 0);
  });

  it("should allow changing body type back to DYNAMIC", () => {
    const space = new Space(new Vec2(0, 100));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.space = space;

    b.type = BodyType.DYNAMIC;
    for (let i = 0; i < 30; i++) space.step(1 / 60);

    // Should fall as dynamic
    expect(b.position.y).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Body impulse query methods
// ---------------------------------------------------------------------------
describe("Body — impulse queries", () => {
  it("normalImpulse should return a Vec3 after collision", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
    floor.shapes.add(new Polygon(Polygon.box(300, 10)));
    floor.space = space;

    const ball = dynCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    const imp = ball.normalImpulse();
    expect(imp).toBeDefined();
    expect(typeof imp.x).toBe("number");
  });

  it("tangentImpulse should return a Vec3 after collision", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
    floor.shapes.add(new Polygon(Polygon.box(300, 10)));
    floor.space = space;

    const ball = dynCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    const imp = ball.tangentImpulse();
    expect(imp).toBeDefined();
    expect(typeof imp.x).toBe("number");
  });

  it("totalImpulse should return a Vec3 after collision", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
    floor.shapes.add(new Polygon(Polygon.box(300, 10)));
    floor.space = space;

    const ball = dynCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    const imp = ball.totalImpulse();
    expect(imp).toBeDefined();
    expect(typeof imp.x).toBe("number");
  });

  it("rollingImpulse should return a number after collision", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
    floor.shapes.add(new Polygon(Polygon.box(300, 10)));
    floor.space = space;

    const ball = dynCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    const imp = ball.rollingImpulse();
    expect(typeof imp).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Body space operations
// ---------------------------------------------------------------------------
describe("Body — space assignment", () => {
  it("should be removable from space", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dynCircle();
    b.space = space;

    expect(space.bodies.length).toBe(1);
    b.space = null;
    expect(space.bodies.length).toBe(0);
  });

  it("body.space should be null before adding to space", () => {
    const b = dynCircle();
    expect(b.space).toBeNull();
  });

  it("body.space should reflect the assigned space", () => {
    const space = new Space();
    const b = dynCircle();
    b.space = space;
    expect(b.space).toBe(space);
  });

  it("should allow moving body to a different space", () => {
    const space1 = new Space(new Vec2(0, 100));
    const space2 = new Space(new Vec2(0, 200));
    const b = dynCircle();
    b.space = space1;

    expect(space1.bodies.length).toBe(1);

    b.space = space2;
    expect(space1.bodies.length).toBe(0);
    expect(space2.bodies.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Body worldCOM and localCOM
// ---------------------------------------------------------------------------
describe("Body — center of mass", () => {
  it("worldCOM should be accessible for a circle", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dynCircle(50, 50);
    b.space = space;
    space.step(1 / 60);

    const com = b.worldCOM;
    expect(com).toBeDefined();
    expect(typeof com.x).toBe("number");
    expect(typeof com.y).toBe("number");
  });

  it("worldCOM should move with body", () => {
    const space = new Space(new Vec2(0, 100));
    const b = dynCircle(0, 0);
    b.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    const com = b.worldCOM;
    expect(com.y).toBeGreaterThan(0);
  });
});
