import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { Material } from "../phys/Material";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { Shape, _bindPolygonWrap } from "./Shape";

/**
 * A convex polygon physics shape.
 *
 * Use the static helper methods (`box`, `rect`, `regular`) for common shapes.
 */
export class Polygon extends Shape {
  constructor(
    vertices?: Vec2[] | NapeInner,
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

    (this as Writable<Polygon>)._inner = new nape.shape.Polygon(
      rawVerts,
      material?._inner,
      filter?._inner,
    );
  }

  /** @internal */
  static _wrap(inner: NapeInner): Polygon {
    return getOrCreate(inner, (raw) => {
      const p = Object.create(Polygon.prototype) as Polygon;
      (p as Writable<Polygon>)._inner = raw;
      return p;
    });
  }

  // ---------------------------------------------------------------------------
  // Static factory methods
  // ---------------------------------------------------------------------------

  static box(width: number, height: number, weak: boolean = false): NapeInner {
    return getNape().shape.Polygon.box(width, height, weak);
  }

  static rect(x: number, y: number, width: number, height: number, weak: boolean = false): NapeInner {
    return getNape().shape.Polygon.rect(x, y, width, height, weak);
  }

  static regular(xRadius: number, yRadius: number, sides: number, angle: number = 0, weak: boolean = false): NapeInner {
    return getNape().shape.Polygon.regular(xRadius, yRadius, sides, angle, weak);
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /** Read-only list of local-space vertices. */
  get localVerts(): NapeInner {
    return this._inner.get_localVerts();
  }

  /** Read-only list of world-space vertices (computed after stepping). */
  get worldVerts(): NapeInner {
    return this._inner.get_worldVerts();
  }

  /** Read-only edge list. */
  get edges(): NapeInner {
    return this._inner.get_edges();
  }

  /** Validate the polygon geometry. */
  validity(): NapeInner {
    return this._inner.validity();
  }
}

// Bind Polygon._wrap into Shape so Shape._wrap can dispatch without circular import.
_bindPolygonWrap((inner) => Polygon._wrap(inner));
