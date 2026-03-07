import { getNape } from "../core/engine";
import type { Vec2 } from "./Vec2";
import type { Shape } from "../shape/Shape";
import type { Body } from "../phys/Body";
import { ZPP_Vec2 } from "../native/geom/ZPP_Vec2";
import { ZPP_Geom } from "../native/geom/ZPP_Geom";
import { ZPP_SweepDistance } from "../native/geom/ZPP_SweepDistance";
import { ZPP_Collide } from "../native/geom/ZPP_Collide";


/** Get the ZPP_Shape from a Shape (handles TS wrapper or compiled object). */
function getZppShape(s: any): any {
  return s?.zpp_inner ?? s?._inner?.zpp_inner;
}

/** Get the ZPP_Body from a Body (handles TS wrapper or compiled object). */
function getZppBody(b: any): any {
  return b?.zpp_inner ?? b?._inner?.zpp_inner;
}

/** Validate a Vec2 output parameter: not disposed, not immutable. */
function validateOutVec2(v: any, _name: string): void {
  if (v != null && v.zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._immutable) {
    throw new Error("Error: Vec2 is immutable");
  }
  if (inner._isimmutable != null) {
    inner._isimmutable();
  }
}

/** Validate a shape has a body. */
function validateShapeHasBody(s: any, method: string): void {
  const zpp = getZppShape(s);
  if (zpp?.body?.outer == null) {
    throw new Error(`Error: Shape must be part of a Body to calculate ${method}`);
  }
}

/**
 * Static utility class for geometric queries between shapes and bodies.
 *
 * Fully modernized — calls ZPP_Geom, ZPP_SweepDistance, and ZPP_Collide directly.
 */
export class Geom {
  static __name__ = ["nape", "geom", "Geom"];

  /**
   * Calculate minimum distance between two bodies and return closest points.
   */
  static distanceBody(body1: Body, body2: Body, out1: Vec2, out2: Vec2): number {
    validateOutVec2(out1, "out1");
    validateOutVec2(out2, "out2");

    const zb1 = getZppBody(body1);
    const zb2 = getZppBody(body2);

    if (zb1.shapes.head == null || zb2.shapes.head == null) {
      throw new Error("Error: Bodies cannot be empty in calculating distances");
    }

    // Validate all shapes on both bodies
    let node = zb1.shapes.head;
    while (node != null) {
      ZPP_Geom.validateShape(node.elt);
      node = node.next;
    }
    node = zb2.shapes.head;
    while (node != null) {
      ZPP_Geom.validateShape(node.elt);
      node = node.next;
    }

    return ZPP_SweepDistance.distanceBody(
      zb1,
      zb2,
      (out1 as any).zpp_inner,
      (out2 as any).zpp_inner,
    );
  }

  /**
   * Calculate minimum distance between two shapes and return closest points.
   */
  static distance(shape1: Shape, shape2: Shape, out1: Vec2, out2: Vec2): number {
    validateOutVec2(out1, "out1");
    validateOutVec2(out2, "out2");
    validateShapeHasBody(shape1, "distances");
    validateShapeHasBody(shape2, "distances");

    const zs1 = getZppShape(shape1);
    const zs2 = getZppShape(shape2);

    ZPP_Geom.validateShape(zs1);
    ZPP_Geom.validateShape(zs2);

    // Allocate temporary ZPP_Vec2 for axis direction
    let tmp: ZPP_Vec2;
    if (ZPP_Vec2.zpp_pool == null) {
      tmp = new ZPP_Vec2();
    } else {
      tmp = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = tmp.next;
      tmp.next = null;
    }
    tmp.weak = false;

    const ret = ZPP_SweepDistance.distance(
      zs1,
      zs2,
      (out1 as any).zpp_inner,
      (out2 as any).zpp_inner,
      tmp,
      1e100,
    );

    // Return temp ZPP_Vec2 to pool
    tmp.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = tmp;

    return ret;
  }

  /**
   * Test if two bodies intersect (any of their shapes overlap).
   */
  static intersectsBody(body1: Body, body2: Body): boolean {
    const zb1 = getZppBody(body1);
    const zb2 = getZppBody(body2);

    if (zb1.shapes.head == null || zb2.shapes.head == null) {
      throw new Error("Error: Bodies must have shapes to test for intersection.");
    }

    // Validate all shapes on both bodies
    let node = zb1.shapes.head;
    while (node != null) {
      ZPP_Geom.validateShape(node.elt);
      node = node.next;
    }
    node = zb2.shapes.head;
    while (node != null) {
      ZPP_Geom.validateShape(node.elt);
      node = node.next;
    }

    // AABB broad-phase check
    const a1 = zb1.aabb;
    const a2 = zb2.aabb;
    if (a1.minx > a2.maxx || a1.maxx < a2.minx || a1.miny > a2.maxy || a1.maxy < a2.miny) {
      return false;
    }

    // Narrow-phase: test all shape pairs
    let n1 = zb1.shapes.head;
    while (n1 != null) {
      let n2 = zb2.shapes.head;
      while (n2 != null) {
        if (ZPP_Collide.testCollide_safe(n1.elt, n2.elt)) {
          return true;
        }
        n2 = n2.next;
      }
      n1 = n1.next;
    }

    return false;
  }

  /**
   * Test if two shapes intersect.
   */
  static intersects(shape1: Shape, shape2: Shape): boolean {
    validateShapeHasBody(shape1, "intersection");
    validateShapeHasBody(shape2, "intersection");

    const zs1 = getZppShape(shape1);
    const zs2 = getZppShape(shape2);

    ZPP_Geom.validateShape(zs1);
    ZPP_Geom.validateShape(zs2);

    // AABB broad-phase check
    const a1 = zs1.aabb;
    const a2 = zs2.aabb;
    if (a1.minx > a2.maxx || a1.maxx < a2.minx || a1.miny > a2.maxy || a1.maxy < a2.miny) {
      return false;
    }

    return ZPP_Collide.testCollide_safe(zs1, zs2);
  }

  /**
   * Test if shape1 fully contains shape2.
   */
  static contains(shape1: Shape, shape2: Shape): boolean {
    validateShapeHasBody(shape1, "containment");
    validateShapeHasBody(shape2, "containment");

    const zs1 = getZppShape(shape1);
    const zs2 = getZppShape(shape2);

    ZPP_Geom.validateShape(zs1);
    ZPP_Geom.validateShape(zs2);

    return ZPP_Collide.containTest(zs1, zs2);
  }
}

// Self-register in the compiled namespace
const nape = getNape();
nape.geom.Geom = Geom;
