import { getNape } from "../core/engine";
import type { Vec2 } from "./Vec2";

type Any = any;

// Capture compiled static methods before we replace the class.
// These are closures over the factory scope — they work standalone.
const _compiled = getNape().geom.Geom;
const _distanceBody = _compiled.distanceBody;
const _distance = _compiled.distance;
const _intersectsBody = _compiled.intersectsBody;
const _intersects = _compiled.intersects;
const _contains = _compiled.contains;

/**
 * Unwrap TS wrapper → compiled object. TS wrappers have `_inner` pointing
 * to the compiled object (which has `zpp_inner`). Compiled objects already
 * have `zpp_inner` directly.
 */
function unwrap(obj: Any): Any {
  return obj && obj._inner ? obj._inner : obj;
}

/**
 * Static utility class for geometric queries between shapes and bodies.
 *
 * All methods are static. This class cannot be instantiated.
 *
 * Thin wrapper — delegates to compiled nape.geom.Geom methods.
 */
export class Geom {
  static __name__ = ["nape", "geom", "Geom"];

  /**
   * Calculate minimum distance between two bodies and return closest points.
   * @param body1 - First body (must have shapes).
   * @param body2 - Second body (must have shapes).
   * @param out1 - Output Vec2 for closest point on body1.
   * @param out2 - Output Vec2 for closest point on body2.
   * @returns The distance between the two bodies.
   */
  static distanceBody(
    body1: Any,
    body2: Any,
    out1: Vec2,
    out2: Vec2,
  ): number {
    return _distanceBody(unwrap(body1), unwrap(body2), out1, out2);
  }

  /**
   * Calculate minimum distance between two shapes and return closest points.
   * @param shape1 - First shape (must be part of a body).
   * @param shape2 - Second shape (must be part of a body).
   * @param out1 - Output Vec2 for closest point on shape1.
   * @param out2 - Output Vec2 for closest point on shape2.
   * @returns The distance between the two shapes.
   */
  static distance(
    shape1: Any,
    shape2: Any,
    out1: Vec2,
    out2: Vec2,
  ): number {
    return _distance(unwrap(shape1), unwrap(shape2), out1, out2);
  }

  /**
   * Test if two bodies intersect (any of their shapes overlap).
   * @param body1 - First body (must have shapes).
   * @param body2 - Second body (must have shapes).
   * @returns True if the bodies intersect.
   */
  static intersectsBody(body1: Any, body2: Any): boolean {
    return _intersectsBody(unwrap(body1), unwrap(body2));
  }

  /**
   * Test if two shapes intersect.
   * @param shape1 - First shape (must be part of a body).
   * @param shape2 - Second shape (must be part of a body).
   * @returns True if the shapes intersect.
   */
  static intersects(shape1: Any, shape2: Any): boolean {
    return _intersects(unwrap(shape1), unwrap(shape2));
  }

  /**
   * Test if shape1 fully contains shape2.
   * @param shape1 - Containing shape (must be part of a body).
   * @param shape2 - Contained shape (must be part of a body).
   * @returns True if shape1 contains shape2.
   */
  static contains(shape1: Any, shape2: Any): boolean {
    return _contains(unwrap(shape1), unwrap(shape2));
  }
}

// Self-register in the compiled namespace
const nape = getNape();
nape.geom.Geom = Geom;
(Geom.prototype as any).__class__ = Geom;
