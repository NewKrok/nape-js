/**
 * Shape behaviour around capsules, weak Vec2 arguments, lazy sub-objects and
 * mutable polygon vertex lists.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Capsule } from "../../src/shape/Capsule";
import { Shape } from "../../src/shape/Shape";
import { Vec2 } from "../../src/geom/Vec2";
import { Mat23 } from "../../src/geom/Mat23";
import { CbType } from "../../src/callbacks/CbType";
import { FluidProperties } from "../../src/phys/FluidProperties";
import "../../src/index";

function withBody(shape: Shape): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
  b.shapes.add(shape);
  return b;
}

describe("Capsule transforms", () => {
  it("translate / rotate / scale / transform keep the capsule a valid polygon", () => {
    const cap = new Capsule(40, 10);
    withBody(cap);
    const area0 = cap.area;

    cap.translate(new Vec2(5, -5));
    expect(cap.localCOM.x).toBeCloseTo(5, 4);
    expect(cap.localCOM.y).toBeCloseTo(-5, 4);
    expect(cap.area).toBeCloseTo(area0, 4);

    cap.rotate(Math.PI / 2);
    expect(cap.area).toBeCloseTo(area0, 4);
    const bounds = cap.bounds;
    expect(bounds.height).toBeGreaterThan(bounds.width);

    cap.scale(2, 2);
    expect(cap.area).toBeCloseTo(area0 * 4, 2);

    const comBefore = { x: cap.localCOM.x, y: cap.localCOM.y };
    cap.transform(Mat23.translation(3, 4));
    expect(cap.localCOM.x).toBeCloseTo(comBefore.x + 3, 3);
    expect(cap.localCOM.y).toBeCloseTo(comBefore.y + 4, 3);
    expect(cap.area).toBeCloseTo(area0 * 4, 2);
  });

  it("re-wraps to the same Capsule instance and survives Body.copy()", () => {
    const cap = new Capsule(30, 8);
    const body = withBody(cap);
    expect(Shape._wrap(cap.zpp_inner)).toBe(cap);
    expect(body.shapes.at(0)).toBe(cap);

    const copy = body.copy();
    const copied = copy.shapes.at(0);
    expect(copied).toBeInstanceOf(Capsule);
    expect(copied).not.toBe(cap);
    expect((copied as Capsule).radius).toBeCloseTo(cap.radius, 6);
    expect((copied as Capsule).halfLength).toBeCloseTo(cap.halfLength, 6);
    expect(copied.isCapsule()).toBe(true);
    expect(copied.castCapsule).toBe(copied);
  });

  it("changing radius/halfLength regenerates the vertex list in place", () => {
    const cap = new Capsule(40, 10);
    withBody(cap);
    const area0 = cap.area;
    cap.radius = 10;
    expect(cap.radius).toBe(10);
    expect(cap.area).toBeGreaterThan(area0);
    expect(cap.bounds.height).toBeCloseTo(20, 4);
    cap.halfLength = 30;
    expect(cap.width).toBeCloseTo(80, 6);
    expect(cap.height).toBeCloseTo(20, 6);
  });
});

describe("weak Vec2 arguments are consumed", () => {
  it("Shape.translate disposes a weak translation", () => {
    const c = new Circle(5);
    withBody(c);
    const weak = Vec2.weak(3, 4);
    c.translate(weak);
    expect(weak.zpp_disp).toBe(true);
    expect(c.localCOM.x).toBeCloseTo(3, 6);
  });

  it("Shape.contains disposes a weak point", () => {
    const c = new Circle(5);
    withBody(c);
    const inside = Vec2.weak(1, 1);
    const outside = Vec2.weak(50, 50);
    expect(c.contains(inside)).toBe(true);
    expect(c.contains(outside)).toBe(false);
    expect(inside.zpp_disp).toBe(true);
    expect(outside.zpp_disp).toBe(true);
    expect(() => c.contains(inside)).toThrow(/disposed/);
  });

  it("Shape.localCOM setter on a polygon disposes a weak value", () => {
    const p = new Polygon(Polygon.box(20, 20));
    withBody(p);
    const weak = Vec2.weak(4, 6);
    p.localCOM = weak;
    expect(weak.zpp_disp).toBe(true);
    expect(p.localCOM.x).toBeCloseTo(4, 6);
    expect(p.localCOM.y).toBeCloseTo(6, 6);
    // Vertices shifted with the centre of mass.
    expect(p.localVerts.at(0).x).not.toBe(-10);
  });

  it("Shape.localCOM rejects null and disposed values", () => {
    const c = new Circle(5);
    expect(() => {
      c.localCOM = null as unknown as Vec2;
    }).toThrow(/null/);
    const dead = new Vec2();
    dead.dispose();
    expect(() => {
      c.localCOM = dead;
    }).toThrow(/disposed/);
  });
});

describe("lazy fluid properties and cbTypes set", () => {
  it("fluidProperties is created on demand when fluid is enabled", () => {
    const c = new Circle(5);
    c.fluidEnabled = true;
    const fp = c.fluidProperties;
    expect(fp).toBeInstanceOf(FluidProperties);
    expect(c.fluidProperties).toBe(fp);
    expect(fp.density).toBe(1);
  });

  it("assigning fluidProperties replaces the lazily created one", () => {
    const c = new Circle(5);
    c.fluidEnabled = true;
    const custom = new FluidProperties(3, 2);
    c.fluidProperties = custom;
    expect(c.fluidProperties).toBe(custom);
    expect(() => {
      c.fluidProperties = null as unknown as FluidProperties;
    }).toThrow(/fluidEnabled/);
    expect(c.fluidProperties).toBe(custom);
  });

  it("cbTypes supports add / has / remove / clear / length", () => {
    const c = new Circle(5);
    const a = new CbType();
    const b = new CbType();
    const set = c.cbTypes;
    const base = set.length; // ANY_SHAPE is always present
    set.add(a);
    set.add(b);
    expect(set.length).toBe(base + 2);
    expect(set.has(a)).toBe(true);
    set.remove(a);
    expect(set.has(a)).toBe(false);
    expect(set.length).toBe(base + 1);
    set.clear();
    expect(set.has(b)).toBe(false);
    expect(set.length).toBeLessThanOrEqual(base);
  });
});

describe("Polygon.localVerts is a live, mutable list", () => {
  function square(): Polygon {
    return new Polygon([
      new Vec2(-10, -10),
      new Vec2(10, -10),
      new Vec2(10, 10),
      new Vec2(-10, 10),
    ]);
  }

  it("push / unshift add vertices and update area and edges", () => {
    const p = square();
    withBody(p);
    const area0 = p.area;
    expect(p.localVerts.length).toBe(4);
    expect(p.edges.length).toBe(4);

    // Turn the square into a convex pentagon by pushing a vertex between the
    // last (-10, 10) and first (-10, -10) corners.
    p.localVerts.push(new Vec2(-20, 0));
    expect(p.localVerts.length).toBe(5);
    expect(p.edges.length).toBe(5);
    expect(p.area).toBeCloseTo(area0 + 100, 4);
    expect(p.validity().toString()).toBe("VALID");

    p.localVerts.unshift(new Vec2(-15, -15));
    expect(p.localVerts.length).toBe(6);
    expect(p.localVerts.at(0).x).toBe(-15);
  });

  it("pop / shift / remove / clear take vertices away", () => {
    const p = square();
    withBody(p);
    p.localVerts.push(new Vec2(-20, 0));
    const popped = p.localVerts.pop();
    expect(popped.x).toBe(-20);
    expect(p.localVerts.length).toBe(4);

    const first = p.localVerts.at(0);
    const shifted = p.localVerts.shift();
    expect(shifted).toBe(first);
    expect(p.localVerts.length).toBe(3);

    const v = p.localVerts.at(1);
    expect(p.localVerts.remove(v)).toBe(true);
    expect(p.localVerts.has(v)).toBe(false);
    expect(p.localVerts.length).toBe(2);

    p.localVerts.clear();
    expect(p.localVerts.length).toBe(0);
    expect(p.localVerts.empty()).toBe(true);
    expect(p.validity().toString()).toBe("DEGENERATE");
  });

  it("worldVerts cannot be modified directly", () => {
    const p = square();
    withBody(p);
    expect(() => p.worldVerts.push(new Vec2(1, 1))).toThrow(/immutable/);
    expect(() => p.worldVerts.pop()).toThrow(/immutable/);
    expect(p.worldVerts.length).toBe(4);
  });

  it("cannot be modified on a static body inside a Space", () => {
    const space = new Space();
    const p = square();
    const b = new Body(BodyType.STATIC);
    b.shapes.add(p);
    space.bodies.add(b);
    expect(() => p.localVerts.push(new Vec2(20, 0))).toThrow(/static/);
    expect(() => p.localVerts.pop()).toThrow(/static/);
  });

  it("a moved vertex is reflected in the polygon geometry", () => {
    const p = square();
    withBody(p);
    const v = p.localVerts.at(0);
    const area0 = p.area;
    v.x -= 10;
    expect(p.area).not.toBeCloseTo(area0, 6);
    expect(p.localVerts.at(0).x).toBe(v.x);
  });
});
