import { getNape } from "../core/engine";
import { Vec2 } from "../geom/Vec2";
import { Material } from "../phys/Material";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { Shape, _registerPolygonClass } from "./Shape";

/**
 * A convex polygon physics shape.
 *
 * Use the static helper methods (`box`, `rect`, `regular`) for common shapes.
 */
export class Polygon extends Shape {
  /**
   * Create a polygon from an array of vertices.
   *
   * @param vertices Array of Vec2 or raw Haxe vertex list.
   * @param material Optional material.
   * @param filter   Optional interaction filter.
   */
  constructor(
    vertices?: Vec2[] | any,
    material?: Material,
    filter?: InteractionFilter,
  ) {
    super();
    const nape = getNape();

    // If vertices is an array of Vec2 wrappers, extract their inners.
    let rawVerts = vertices;
    if (Array.isArray(vertices) && vertices.length > 0 && vertices[0]._inner) {
      rawVerts = vertices.map((v: Vec2) => v._inner);
    }

    this._inner = new nape.shape.Polygon(
      rawVerts,
      material?._inner,
      filter?._inner,
    );
  }

  /** @internal */
  static _wrap(inner: any): Polygon {
    if (!inner) return null as unknown as Polygon;
    const p = Object.create(Polygon.prototype) as Polygon;
    p._inner = inner;
    return p;
  }

  // ---------------------------------------------------------------------------
  // Static factory methods — return raw Haxe vertex arrays suitable for the
  // Polygon constructor.
  // ---------------------------------------------------------------------------

  /**
   * Create vertex list for an axis-aligned box centred at the origin.
   *
   * Usage: `new Polygon(Polygon.box(100, 50))`
   */
  static box(width: number, height: number, weak: boolean = false): any {
    return getNape().shape.Polygon.box(width, height, weak);
  }

  /**
   * Create vertex list for a rectangle at the given offset.
   *
   * Usage: `new Polygon(Polygon.rect(x, y, w, h))`
   */
  static rect(
    x: number,
    y: number,
    width: number,
    height: number,
    weak: boolean = false,
  ): any {
    return getNape().shape.Polygon.rect(x, y, width, height, weak);
  }

  /**
   * Create vertex list for a regular polygon (equilateral triangle, hexagon, etc.).
   *
   * @param xRadius  Horizontal radius.
   * @param yRadius  Vertical radius.
   * @param sides    Number of sides.
   * @param angle    Starting angle offset (radians).
   * @param weak     Whether returned Vec2s are weak.
   */
  static regular(
    xRadius: number,
    yRadius: number,
    sides: number,
    angle: number = 0,
    weak: boolean = false,
  ): any {
    return getNape().shape.Polygon.regular(
      xRadius,
      yRadius,
      sides,
      angle,
      weak,
    );
  }

  /** Read-only list of local-space vertices. */
  get localVerts(): any {
    return this._inner.get_localVerts();
  }

  /** Read-only list of world-space vertices (computed after stepping). */
  get worldVerts(): any {
    return this._inner.get_worldVerts();
  }

  /** Read-only edge list. */
  get edges(): any {
    return this._inner.get_edges();
  }

  /** Validate the polygon geometry. */
  validity(): any {
    return this._inner.validity();
  }
}

// Register with the base Shape class for castPolygon support.
_registerPolygonClass(Polygon);
