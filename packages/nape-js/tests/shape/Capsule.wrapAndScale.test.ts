/**
 * Capsule wrapper identity (every path that hands a capsule back to user code
 * returns the one wrapper built by the constructor) and the radius / halfLength
 * setters after scale().
 *
 * Regression: scale() rescales the capsule metadata on the ZPP_Polygon, but the
 * setters used to compare against — and regenerate from — a stale copy cached
 * on the wrapper. After `scale(2, 2)`, setting the radius back to its original
 * value was silently ignored, and any other radius rebuilt the outline with the
 * pre-scale halfLength (so `halfLength` and the actual geometry disagreed).
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Shape } from "../../src/shape/Shape";
import { Capsule } from "../../src/shape/Capsule";
import { Polygon } from "../../src/shape/Polygon";
import { spaceToJSON } from "../../src/serialization/serialize";
import { spaceFromJSON } from "../../src/serialization/deserialize";
import { spaceToBinary } from "../../src/serialization/serialize-binary";
import { spaceFromBinary } from "../../src/serialization/deserialize-binary";

/** Capsule attached to a fresh body, so `bounds` is available. */
function attached(width = 40, height = 20): Capsule {
  const c = new Capsule(width, height);
  new Body(BodyType.DYNAMIC).shapes.add(c);
  return c;
}

/** Outline extent along the spine (x) and across it (y). */
function extent(c: Capsule) {
  return { w: c.bounds.width, h: c.bounds.height };
}

describe("Capsule wrapper identity", () => {
  it("every route back to the shape returns the constructor's wrapper", () => {
    const c = attached();
    const zpp = (c as any).zpp_inner;
    expect(Capsule._wrap(c)).toBe(c);
    expect(Capsule._wrap(zpp)).toBe(c);
    expect(Shape._wrap(zpp)).toBe(c);
    expect(c.body.shapes.at(0)).toBe(c);
    expect(c.castCapsule).toBe(c);
    expect(c.isCapsule()).toBe(true);
  });

  it("returns null for nothing and for a polygon that is not a capsule", () => {
    expect(Capsule._wrap(null as any)).toBeNull();
    const poly = new Polygon(Polygon.box(10, 10));
    expect(Capsule._wrap((poly as any).zpp_inner)).toBeNull();
    expect(Capsule._wrap(poly as any)).toBeNull();
    expect(poly.castCapsule).toBeNull();
  });

  it("copy() builds a new Capsule wrapper with the same dimensions", () => {
    const c = new Capsule(60, 20);
    const copy = c.copy() as Capsule;
    expect(copy).toBeInstanceOf(Capsule);
    expect(copy).not.toBe(c);
    expect(Capsule._wrap((copy as any).zpp_inner)).toBe(copy);
    expect(copy.radius).toBe(10);
    expect(copy.halfLength).toBe(20);
  });

  it("JSON and binary round-trips hand back Capsule wrappers", () => {
    const space = new Space(new Vec2(0, 100));
    const b = new Body(BodyType.DYNAMIC, new Vec2(5, 5));
    b.shapes.add(new Capsule(50, 16));
    b.space = space;
    for (const restored of [
      spaceFromJSON(spaceToJSON(space)),
      spaceFromBinary(spaceToBinary(space)),
    ]) {
      const s = restored.bodies.at(0).shapes.at(0);
      expect(s).toBeInstanceOf(Capsule);
      expect(Shape._wrap((s as any).zpp_inner)).toBe(s);
      expect((s as Capsule).radius).toBeCloseTo(8);
      expect((s as Capsule).halfLength).toBeCloseTo(17);
    }
  });
});

describe("Capsule radius / halfLength after scale()", () => {
  it("scale() updates radius, halfLength and the outline together", () => {
    const c = attached(40, 20); // r=10, hl=10
    c.scale(2, 2);
    expect(c.radius).toBe(20);
    expect(c.halfLength).toBe(20);
    expect(extent(c).w).toBeCloseTo(80);
    expect(extent(c).h).toBeCloseTo(40);
  });

  it("setting radius back to its pre-scale value takes effect", () => {
    const c = attached(40, 20);
    c.scale(2, 2);
    c.radius = 10;
    expect(c.radius).toBe(10);
    expect(extent(c).h).toBeCloseTo(20);
    expect(extent(c).w).toBeCloseTo(2 * (20 + 10));
  });

  it("a new radius after scale() keeps the scaled halfLength", () => {
    const c = attached(40, 20);
    c.scale(2, 2);
    c.radius = 5;
    expect(c.halfLength).toBe(20);
    expect(extent(c).w).toBeCloseTo(2 * (20 + 5));
    expect(extent(c).h).toBeCloseTo(10);
  });

  it("halfLength after scale(): back to the old value, and a new one", () => {
    const c = attached(40, 20);
    c.scale(2, 2);
    c.halfLength = 10;
    expect(c.halfLength).toBe(10);
    expect(extent(c).w).toBeCloseTo(2 * (10 + 20));
    c.halfLength = 0;
    expect(extent(c).w).toBeCloseTo(40);
    expect(extent(c).h).toBeCloseTo(40);
  });

  it("setting the current value is a no-op", () => {
    const c = attached(40, 20);
    const before = extent(c);
    c.radius = 10;
    c.halfLength = 10;
    expect(extent(c)).toEqual(before);
  });
});

describe("Capsule setter guards", () => {
  it("rejects NaN and out-of-range values", () => {
    const c = attached();
    expect(() => (c.radius = NaN)).toThrow(/NaN/);
    expect(() => (c.radius = 0)).toThrow(/Config.epsilon/);
    expect(() => (c.halfLength = NaN)).toThrow(/NaN/);
    expect(() => (c.halfLength = -1)).toThrow(/>= 0/);
    expect(c.radius).toBe(10);
    expect(c.halfLength).toBe(10);
  });

  it("refuses to resize a capsule on a static body that is in a space", () => {
    const space = new Space();
    const ground = new Body(BodyType.STATIC);
    const c = new Capsule(40, 20);
    ground.shapes.add(c);
    ground.space = space;
    expect(() => (c.radius = 5)).toThrow(/static object/);
    expect(() => (c.halfLength = 5)).toThrow(/static object/);
    ground.space = null;
    c.radius = 5;
    expect(c.radius).toBe(5);
  });

  it("rejects a disposed localCOM and consumes a weak one", () => {
    const disposed = new Vec2(1, 2);
    disposed.dispose();
    expect(() => new Capsule(40, 20, disposed)).toThrow(/disposed/);

    const weak = Vec2.weak(3, 0);
    const c = new Capsule(40, 20, weak);
    expect(c.localCOM.x).toBeCloseTo(3);
    expect((weak as any).zpp_disp).toBe(true);
  });
});
