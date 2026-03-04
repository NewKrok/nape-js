import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner } from "../geom/Vec2";
import { ZPP_Edge } from "../native/shape/ZPP_Edge";

type Any = any;

/**
 * An edge of a polygon shape.
 *
 * Edges are read-only and managed by the polygon they belong to.
 * Cannot be instantiated directly — only obtained from Polygon.edges.
 *
 * Fully modernized — all getters access ZPP_Edge directly.
 */
export class Edge {
  static __name__ = ["nape", "shape", "Edge"];

  /** Direct access to the internal ZPP_Edge. */
  zpp_inner!: ZPP_Edge;

  constructor() {
    if (!ZPP_Edge.internal) {
      throw new Error("Error: Cannot instantiate an Edge derp!");
    }
  }

  /** @internal */
  static _wrap(inner: Any): Edge {
    if (!inner) return null as unknown as Edge;
    if (inner instanceof Edge) return inner;
    if (inner instanceof ZPP_Edge) {
      return getOrCreate(inner, (zpp: ZPP_Edge) => {
        ZPP_Edge.internal = true;
        const e = new Edge();
        ZPP_Edge.internal = false;
        e.zpp_inner = zpp;
        zpp.outer = e;
        return e;
      });
    }
    // Legacy: compiled Edge with zpp_inner
    if (inner.zpp_inner) return Edge._wrap(inner.zpp_inner);
    return inner;
  }

  // ---------------------------------------------------------------------------
  // Read-only properties
  // ---------------------------------------------------------------------------

  /** Parent polygon (as compiled Polygon wrapper). */
  get polygon(): Any {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      throw new Error("Error: Edge not current in use");
    }
    return zpp.polygon.outer_zn;
  }

  /** Local-space normal vector (immutable Vec2). */
  get localNormal(): Vec2 {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      throw new Error("Error: Edge not current in use");
    }
    if (zpp.wrap_lnorm == null) {
      zpp.getlnorm();
    }
    return zpp.wrap_lnorm;
  }

  /** World-space normal vector (immutable Vec2). Requires polygon in a body. */
  get worldNormal(): Vec2 {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      throw new Error("Error: Edge not current in use");
    }
    if (zpp.wrap_gnorm == null) {
      zpp.getgnorm();
    }
    return zpp.wrap_gnorm;
  }

  /** Edge length. */
  get length(): number {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      throw new Error("Error: Edge not current in use");
    }
    zpp.polygon.validate_laxi();
    return zpp.length;
  }

  /** Local-space projection along the edge normal. */
  get localProjection(): number {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      throw new Error("Error: Edge not current in use");
    }
    zpp.polygon.validate_laxi();
    return zpp.lprojection;
  }

  /** World-space projection. Requires polygon in a body. */
  get worldProjection(): number {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      throw new Error("Error: Edge not current in use");
    }
    if (zpp.polygon.body == null) {
      throw new Error(
        "Error: Edge world projection only makes sense for Polygons contained within a rigid body",
      );
    }
    zpp.polygon.validate_gaxi();
    return zpp.gprojection;
  }

  /** First local vertex of this edge. */
  get localVertex1(): Vec2 {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      throw new Error("Error: Edge not current in use");
    }
    zpp.polygon.validate_laxi();
    return this._wrapVert(zpp.lp0);
  }

  /** Second local vertex of this edge. */
  get localVertex2(): Vec2 {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      throw new Error("Error: Edge not current in use");
    }
    zpp.polygon.validate_laxi();
    return this._wrapVert(zpp.lp1);
  }

  /** First world vertex. Requires polygon in a body. */
  get worldVertex1(): Vec2 {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      throw new Error("Error: Edge not current in use");
    }
    zpp.polygon.validate_gaxi();
    return this._wrapVert(zpp.gp0);
  }

  /** Second world vertex. Requires polygon in a body. */
  get worldVertex2(): Vec2 {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      throw new Error("Error: Edge not current in use");
    }
    zpp.polygon.validate_gaxi();
    return this._wrapVert(zpp.gp1);
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  toString(): string {
    const zpp = this.zpp_inner;
    if (zpp.polygon == null) {
      return "Edge(object-pooled)";
    } else if (zpp.polygon.body == null) {
      zpp.polygon.validate_laxi();
      return (
        "{ localNormal : " +
        "{ x: " + zpp.lnormx + " y: " + zpp.lnormy + " }" +
        " }"
      );
    } else {
      zpp.polygon.validate_gaxi();
      return (
        "{ localNormal : " +
        "{ x: " + zpp.lnormx + " y: " + zpp.lnormy + " }" +
        " worldNormal : " +
        "{ x: " + zpp.gnormx + " y: " + zpp.gnormy + " }" +
        " }"
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Wrap a ZPP_Vec2 vertex into its public Vec2 outer.
   * Mirrors the compiled vertex wrapping pattern.
   */
  private _wrapVert(vert: Any): Vec2 {
    const nape = getNape();
    const zpp = nape.__zpp;
    if (vert.outer == null) {
      vert.outer = new nape.geom.Vec2();
      const o = vert.outer.zpp_inner;
      if (o.outer != null) {
        o.outer.zpp_inner = null;
        o.outer = null;
      }
      o._isimmutable = null;
      o._validate = null;
      o._invalidate = null;
      o.next = zpp.geom.ZPP_Vec2.zpp_pool;
      zpp.geom.ZPP_Vec2.zpp_pool = o;
      vert.outer.zpp_inner = vert;
    }
    return vert.outer;
  }
}

// ---------------------------------------------------------------------------
// Self-register in the compiled namespace
// ---------------------------------------------------------------------------

// Register _wrapFn so ZPP_Edge.wrapper() creates TS Edge instances
ZPP_Edge._wrapFn = (zpp: ZPP_Edge) =>
  getOrCreate(zpp, (raw: ZPP_Edge) => {
    ZPP_Edge.internal = true;
    const e = new Edge();
    ZPP_Edge.internal = false;
    e.zpp_inner = raw;
    raw.outer = e;
    return e;
  });

const nape = getNape();

// Replace the compiled Edge with our TS class
nape.shape.Edge = Edge;
(Edge.prototype as Any).__class__ = Edge;
