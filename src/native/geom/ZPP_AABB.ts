/**
 * ZPP_AABB — Internal axis-aligned bounding box for the nape physics engine.
 *
 * Stores min/max coordinates and provides intersection/combine/contain tests.
 * Lazily creates Vec2 wrappers for the min and max points.
 *
 * Converted from nape-compiled.js lines 63546–63965, 134951.
 */

type Any = any;

export class ZPP_AABB {
  // --- Static: object pool ---
  static zpp_pool: ZPP_AABB | null = null;

  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_AABB"];

  // --- Static: namespace references ---
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Static: wrapper factory callback (set by AABB.ts) ---
  static _wrapFn: ((zpp: ZPP_AABB) => Any) | null = null;

  // --- Instance: callbacks ---
  _invalidate: ((self: ZPP_AABB) => void) | null = null;
  _validate: (() => void) | null = null;
  _immutable = false;

  // --- Instance: public wrapper ---
  outer: Any = null;

  // --- Instance: pool linked list ---
  next: ZPP_AABB | null = null;

  // --- Instance: bounds ---
  minx = 0.0;
  miny = 0.0;
  maxx = 0.0;
  maxy = 0.0;

  // --- Instance: lazy Vec2 wrappers ---
  wrap_min: Any = null;
  wrap_max: Any = null;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_AABB;

  /** Static factory with pooling. */
  static get(minx: number, miny: number, maxx: number, maxy: number): ZPP_AABB {
    let ret: ZPP_AABB;
    if (ZPP_AABB.zpp_pool == null) {
      ret = new ZPP_AABB();
    } else {
      ret = ZPP_AABB.zpp_pool;
      ZPP_AABB.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.minx = minx;
    ret.miny = miny;
    ret.maxx = maxx;
    ret.maxy = maxy;
    return ret;
  }

  // ========== Validation ==========

  validate(): void {
    if (this._validate != null) this._validate();
  }

  invalidate(): void {
    if (this._invalidate != null) this._invalidate(this);
  }

  // ========== Wrapper / Pool ==========

  wrapper(): Any {
    if (this.outer == null) {
      if (ZPP_AABB._wrapFn) {
        this.outer = ZPP_AABB._wrapFn(this);
      } else {
        this.outer = new ZPP_AABB._nape.geom.AABB();
        const o = this.outer.zpp_inner;
        if (o.outer != null) {
          o.outer.zpp_inner = null;
          o.outer = null;
        }
        o.wrap_min = o.wrap_max = null;
        o._invalidate = null;
        o._validate = null;
        o.next = ZPP_AABB.zpp_pool;
        ZPP_AABB.zpp_pool = o;
        this.outer.zpp_inner = this;
      }
    }
    return this.outer;
  }

  alloc(): void {}

  free(): void {
    if (this.outer != null) {
      this.outer.zpp_inner = null;
      this.outer = null;
    }
    this.wrap_min = this.wrap_max = null;
    this._invalidate = null;
    this._validate = null;
  }

  // ========== Copy ==========

  copy(): ZPP_AABB {
    return ZPP_AABB.get(this.minx, this.miny, this.maxx, this.maxy);
  }

  // ========== Dimensions ==========

  width(): number {
    return this.maxx - this.minx;
  }

  height(): number {
    return this.maxy - this.miny;
  }

  perimeter(): number {
    return (this.maxx - this.minx + (this.maxy - this.miny)) * 2;
  }

  // ========== Min/Max Vec2 wrappers (lazy creation) ==========

  /** Helper: create a Vec2 wrapper from the compiled namespace pools. */
  private static _makeVec2Wrapper(x: number, y: number): Any {
    const zpp = ZPP_AABB._zpp;
    const napeNs = ZPP_AABB._nape;

    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }

    let ret: Any;
    if (zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new napeNs.geom.Vec2();
    } else {
      ret = zpp.util.ZPP_PubPool.poolVec2;
      zpp.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == zpp.util.ZPP_PubPool.nextVec2) {
        zpp.util.ZPP_PubPool.nextVec2 = null;
      }
    }

    if (ret.zpp_inner == null) {
      let inner: Any;
      if (zpp.geom.ZPP_Vec2.zpp_pool == null) {
        inner = new zpp.geom.ZPP_Vec2();
      } else {
        inner = zpp.geom.ZPP_Vec2.zpp_pool;
        zpp.geom.ZPP_Vec2.zpp_pool = inner.next;
        inner.next = null;
      }
      inner.weak = false;
      inner._immutable = false;
      inner.x = x;
      inner.y = y;
      ret.zpp_inner = inner;
      ret.zpp_inner.outer = ret;
    } else {
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const inner = ret.zpp_inner;
      if (inner._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (inner._isimmutable != null) inner._isimmutable();
      if (x !== x || y !== y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      if (inner._validate != null) inner._validate();
      if (inner.x !== x || inner.y !== y) {
        inner.x = x;
        inner.y = y;
        if (inner._invalidate != null) inner._invalidate(inner);
      }
    }
    ret.zpp_inner.weak = false;
    return ret;
  }

  getmin(): void {
    if (this.wrap_min == null) {
      this.wrap_min = ZPP_AABB._makeVec2Wrapper(this.minx, this.miny);
      this.wrap_min.zpp_inner._inuse = true;
      if (this._immutable) {
        this.wrap_min.zpp_inner._immutable = true;
      } else {
        this.wrap_min.zpp_inner._invalidate = this.mod_min.bind(this);
      }
      this.wrap_min.zpp_inner._validate = this.dom_min.bind(this);
    }
  }

  dom_min(): void {
    if (this._validate != null) this._validate();
    this.wrap_min.zpp_inner.x = this.minx;
    this.wrap_min.zpp_inner.y = this.miny;
  }

  mod_min(min: Any): void {
    if (min.x !== this.minx || min.y !== this.miny) {
      this.minx = min.x;
      this.miny = min.y;
      if (this._invalidate != null) this._invalidate(this);
    }
  }

  getmax(): void {
    if (this.wrap_max == null) {
      this.wrap_max = ZPP_AABB._makeVec2Wrapper(this.maxx, this.maxy);
      this.wrap_max.zpp_inner._inuse = true;
      if (this._immutable) {
        this.wrap_max.zpp_inner._immutable = true;
      } else {
        this.wrap_max.zpp_inner._invalidate = this.mod_max.bind(this);
      }
      this.wrap_max.zpp_inner._validate = this.dom_max.bind(this);
    }
  }

  dom_max(): void {
    if (this._validate != null) this._validate();
    this.wrap_max.zpp_inner.x = this.maxx;
    this.wrap_max.zpp_inner.y = this.maxy;
  }

  mod_max(max: Any): void {
    if (max.x !== this.maxx || max.y !== this.maxy) {
      this.maxx = max.x;
      this.maxy = max.y;
      if (this._invalidate != null) this._invalidate(this);
    }
  }

  // ========== Spatial queries ==========

  intersectX(x: ZPP_AABB): boolean {
    return !(x.minx > this.maxx || this.minx > x.maxx);
  }

  intersectY(x: ZPP_AABB): boolean {
    return !(x.miny > this.maxy || this.miny > x.maxy);
  }

  intersect(x: ZPP_AABB): boolean {
    return x.miny <= this.maxy && this.miny <= x.maxy &&
      x.minx <= this.maxx && this.minx <= x.maxx;
  }

  combine(x: ZPP_AABB): void {
    if (x.minx < this.minx) this.minx = x.minx;
    if (x.maxx > this.maxx) this.maxx = x.maxx;
    if (x.miny < this.miny) this.miny = x.miny;
    if (x.maxy > this.maxy) this.maxy = x.maxy;
  }

  contains(x: ZPP_AABB): boolean {
    return x.minx >= this.minx && x.miny >= this.miny &&
      x.maxx <= this.maxx && x.maxy <= this.maxy;
  }

  containsPoint(v: { x: number; y: number }): boolean {
    return v.x >= this.minx && v.x <= this.maxx &&
      v.y >= this.miny && v.y <= this.maxy;
  }

  setCombine(a: ZPP_AABB, b: ZPP_AABB): void {
    this.minx = a.minx < b.minx ? a.minx : b.minx;
    this.miny = a.miny < b.miny ? a.miny : b.miny;
    this.maxx = a.maxx > b.maxx ? a.maxx : b.maxx;
    this.maxy = a.maxy > b.maxy ? a.maxy : b.maxy;
  }

  setExpand(a: ZPP_AABB, fatten: number): void {
    this.minx = a.minx - fatten;
    this.miny = a.miny - fatten;
    this.maxx = a.maxx + fatten;
    this.maxy = a.maxy + fatten;
  }

  setExpandPoint(x: number, y: number): void {
    if (x < this.minx) this.minx = x;
    if (x > this.maxx) this.maxx = x;
    if (y < this.miny) this.miny = y;
    if (y > this.maxy) this.maxy = y;
  }

  toString(): string {
    return "{ x: " + this.minx + " y: " + this.miny +
      " w: " + (this.maxx - this.minx) + " h: " + (this.maxy - this.miny) + " }";
  }
}
