/**
 * Runtime integration tests that verify the compiled engine works end-to-end.
 *
 * These tests catch issues that unit tests miss:
 * - Side-effect modules stripped by bundlers (registerLists, etc.)
 * - Broken Object.defineProperty accessors in compiled code
 * - Missing class registrations in the nape namespace
 */
import { describe, it, expect } from "vitest";
import { getNape } from "../../src/index";

describe("Engine integration — namespace registrations", () => {
  const nape = getNape();

  const listClasses = [
    ["callbacks", "CbTypeList"],
    ["callbacks", "CbTypeIterator"],
    ["callbacks", "ListenerList"],
    ["callbacks", "ListenerIterator"],
    ["constraint", "ConstraintList"],
    ["constraint", "ConstraintIterator"],
    ["dynamics", "ArbiterList"],
    ["dynamics", "ArbiterIterator"],
    ["dynamics", "InteractionGroupList"],
    ["dynamics", "InteractionGroupIterator"],
    ["geom", "ConvexResultList"],
    ["geom", "ConvexResultIterator"],
    ["geom", "GeomPolyList"],
    ["geom", "GeomPolyIterator"],
    ["geom", "RayResultList"],
    ["geom", "RayResultIterator"],
    ["phys", "BodyList"],
    ["phys", "BodyIterator"],
    ["phys", "CompoundList"],
    ["phys", "CompoundIterator"],
    ["phys", "InteractorList"],
    ["phys", "InteractorIterator"],
    ["shape", "ShapeList"],
    ["shape", "ShapeIterator"],
    ["shape", "EdgeList"],
    ["shape", "EdgeIterator"],
  ] as const;

  it.each(listClasses)("nape.%s.%s should be registered as a constructor", (ns, cls) => {
    expect(typeof nape[ns][cls]).toBe("function");
  });
});

describe("Engine integration — property accessors on compiled objects", () => {
  const nape = getNape();

  it("Body property accessors should return defined values", () => {
    const body = new nape.phys.Body(nape.phys.BodyType.DYNAMIC);
    body.get_shapes().add(new nape.shape.Circle(10));

    // These would return undefined if Object.defineProperty captured
    // getter references before the functions were defined
    expect(body.shapes).toBeDefined();
    expect(body.position).toBeDefined();
    expect(body.velocity).toBeDefined();
    expect(body.type).toBeDefined();
    expect(body.rotation).not.toBeUndefined();
    expect(body.force).toBeDefined();
    expect(body.bounds).toBeDefined();
    expect(body.mass).toBeDefined();
    expect(body.inertia).toBeDefined();
  });

  it("Space property accessors should return defined values", () => {
    const space = new nape.space.Space(new nape.geom.Vec2(0, 600));

    expect(space.gravity).toBeDefined();
    expect(space.bodies).toBeDefined();
    expect(space.constraints).toBeDefined();
    expect(space.world).toBeDefined();
    expect(space.timeStamp).not.toBeUndefined();
    expect(space.elapsedTime).not.toBeUndefined();
  });

  it("Circle own property accessors should return defined values", () => {
    const circle = new nape.shape.Circle(15);

    // Own property (defined on Circle.prototype)
    expect(circle.radius).toBe(15);

    // Inherited Shape properties accessible via getter methods
    expect(circle.get_type()).toBeDefined();
    expect(circle.get_material()).toBeDefined();
    expect(circle.get_filter()).toBeDefined();
    expect(circle.get_area()).toBeGreaterThan(0);
  });

  it("PivotJoint own property accessors should return defined values", () => {
    const body1 = new nape.phys.Body(nape.phys.BodyType.DYNAMIC);
    const body2 = new nape.phys.Body(nape.phys.BodyType.DYNAMIC);
    const joint = new nape.constraint.PivotJoint(
      body1,
      body2,
      new nape.geom.Vec2(0, 0),
      new nape.geom.Vec2(0, 0),
    );

    // Own properties (defined on PivotJoint.prototype)
    expect(joint.body1).toBeDefined();
    expect(joint.body2).toBeDefined();
    expect(joint.anchor1).toBeDefined();
    expect(joint.anchor2).toBeDefined();

    // Inherited Constraint properties accessible via getter methods
    // (defineProperty accessors don't propagate through for...in prototype copy)
    expect(joint.get_stiff()).toBe(true);
    expect(joint.get_active()).toBe(true);
  });
});

describe("Engine integration — simulation loop", () => {
  const nape = getNape();

  it("should update body positions over multiple steps via compiled API", () => {
    const space = new nape.space.Space(new nape.geom.Vec2(0, 600));
    const body = new nape.phys.Body(nape.phys.BodyType.DYNAMIC);
    body.shapes.add(new nape.shape.Circle(10));
    body.position.setxy(100, 0);
    body.space = space;

    const initialY = body.position.y;

    for (let i = 0; i < 10; i++) {
      space.step(1 / 60);
    }

    // Body must have moved down due to gravity
    expect(body.position.y).toBeGreaterThan(initialY);
    expect(body.position.x).toBeCloseTo(100);
  });

  it("should handle body-to-body collision with floor", () => {
    const space = new nape.space.Space(new nape.geom.Vec2(0, 500));

    // Static floor
    const floor = new nape.phys.Body(nape.phys.BodyType.STATIC);
    floor.shapes.add(new nape.shape.Polygon(nape.shape.Polygon.box(500, 10)));
    floor.position.setxy(0, 200);
    floor.space = space;

    // Falling circle
    const ball = new nape.phys.Body(nape.phys.BodyType.DYNAMIC);
    ball.shapes.add(new nape.shape.Circle(10));
    ball.position.setxy(0, 0);
    ball.space = space;

    // Simulate 2 seconds
    for (let i = 0; i < 120; i++) {
      space.step(1 / 60);
    }

    // Ball should have settled on top of the floor, not fallen through
    expect(ball.position.y).toBeLessThan(200);
    expect(ball.position.y).toBeGreaterThan(100);
  });

  it("should support reading body list from space after stepping", () => {
    const space = new nape.space.Space(new nape.geom.Vec2(0, 100));

    for (let i = 0; i < 3; i++) {
      const b = new nape.phys.Body(nape.phys.BodyType.DYNAMIC);
      b.shapes.add(new nape.shape.Circle(5));
      b.position.setxy(i * 50, 0);
      b.space = space;
    }

    space.step(1 / 60);

    // Verify bodies list works via property accessor
    expect(space.bodies.length).toBe(3);

    // Verify iteration works
    let count = 0;
    const iter = nape.phys.BodyIterator.get(space.bodies);
    while (iter.hasNext()) {
      const b = iter.next();
      expect(b.position).toBeDefined();
      expect(b.position.y).toBeGreaterThan(0);
      count++;
    }
    expect(count).toBe(3);
  });
});
