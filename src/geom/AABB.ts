import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_AABB } from "../native/geom/ZPP_AABB";
import type { NapeInner } from "./Vec2";

/**
 * Axis-aligned bounding box defined by min/max corners or x/y/width/height.
 *
 * Internally wraps a ZPP_AABB and is registered as the public
 * `nape.geom.AABB` class in the compiled namespace.
 *
 * Converted from nape-compiled.js lines 14950–15653.
 */
export class AABB {
  // --- Haxe metadata (required by compiled engine) ---
  static __name__ = ["nape", "geom", "AABB"];

  /** @internal The internal ZPP_AABB this wrapper owns. */
  zpp_inner: ZPP_AABB;

  /**
   * Backward-compatible accessor — returns `this` so that compiled engine
   * code that receives `aabb._inner` can still access `zpp_inner`.
   * @internal
   */
  get _inner(): NapeInner {
    return this;
  }

  constructor(
    x: number = 0,
    y: number = 0,
    width: number = 0,
    height: number = 0,
  ) {
    // NaN checks
    if (x !== x || y !== y) {
      throw new Error("Error: AABB position cannot be NaN");
    }
    if (width !== width || height !== height) {
      throw new Error("Error: AABB dimensions cannot be NaN");
    }

    // Acquire a ZPP_AABB from the pool or create a new one
    let zpp: ZPP_AABB;
    if (ZPP_AABB.zpp_pool == null) {
      zpp = new ZPP_AABB();
    } else {
      zpp = ZPP_AABB.zpp_pool;
      ZPP_AABB.zpp_pool = zpp.next;
      zpp.next = null;
    }
    zpp.minx = x;
    zpp.miny = y;
    zpp.maxx = x + width;
    zpp.maxy = y + height;

    this.zpp_inner = zpp;
    zpp.outer = this;
  }

  /** @internal Wrap a ZPP_AABB (or legacy compiled AABB) with caching. */
  static _wrap(inner: any): AABB {
    if (inner instanceof AABB) return inner;
    if (!inner) return null as unknown as AABB;

    if (inner instanceof ZPP_AABB) {
      return getOrCreate(inner, (zpp: ZPP_AABB) => {
        const a = Object.create(AABB.prototype) as AABB;
        a.zpp_inner = zpp;
        zpp.outer = a;
        return a;
      });
    }

    // Legacy fallback: compiled AABB with zpp_inner
    if (inner.zpp_inner) {
      return AABB._wrap(inner.zpp_inner);
    }

    return null as unknown as AABB;
  }

  // ---------------------------------------------------------------------------
  // Properties — scalar (x, y, width, height)
  // ---------------------------------------------------------------------------

  get x(): number {
    this.zpp_inner.validate();
    return this.zpp_inner.minx;
  }
  set x(x: number) {
    if (this.zpp_inner._immutable) {
      throw new Error("Error: AABB is immutable");
    }
    this.zpp_inner.validate();
    if (this.zpp_inner.minx != x) {
      if (x !== x) {
        throw new Error("Error: AABB::x cannot be NaN");
      }
      this.zpp_inner.maxx += x - this.zpp_inner.minx;
      this.zpp_inner.minx = x;
      this.zpp_inner.invalidate();
    }
  }

  get y(): number {
    this.zpp_inner.validate();
    return this.zpp_inner.miny;
  }
  set y(y: number) {
    if (this.zpp_inner._immutable) {
      throw new Error("Error: AABB is immutable");
    }
    this.zpp_inner.validate();
    if (this.zpp_inner.miny != y) {
      if (y !== y) {
        throw new Error("Error: AABB::y cannot be NaN");
      }
      this.zpp_inner.maxy += y - this.zpp_inner.miny;
      this.zpp_inner.miny = y;
      this.zpp_inner.invalidate();
    }
  }

  get width(): number {
    this.zpp_inner.validate();
    return this.zpp_inner.maxx - this.zpp_inner.minx;
  }
  set width(width: number) {
    if (this.zpp_inner._immutable) {
      throw new Error("Error: AABB is immutable");
    }
    this.zpp_inner.validate();
    if (this.zpp_inner.maxx - this.zpp_inner.minx != width) {
      if (width !== width) {
        throw new Error("Error: AABB::width cannot be NaN");
      }
      if (width < 0) {
        throw new Error("Error: AABB::width (" + width + ") must be >= 0");
      }
      this.zpp_inner.validate();
      this.zpp_inner.maxx = this.zpp_inner.minx + width;
      this.zpp_inner.invalidate();
    }
  }

  get height(): number {
    this.zpp_inner.validate();
    return this.zpp_inner.maxy - this.zpp_inner.miny;
  }
  set height(height: number) {
    if (this.zpp_inner._immutable) {
      throw new Error("Error: AABB is immutable");
    }
    this.zpp_inner.validate();
    if (this.zpp_inner.maxy - this.zpp_inner.miny != height) {
      if (height !== height) {
        throw new Error("Error: AABB::height cannot be NaN");
      }
      if (height < 0) {
        throw new Error("Error: AABB::height (" + height + ") must be >= 0");
      }
      this.zpp_inner.validate();
      this.zpp_inner.maxy = this.zpp_inner.miny + height;
      this.zpp_inner.invalidate();
    }
  }

  // ---------------------------------------------------------------------------
  // Properties — Vec2 (min, max)
  // ---------------------------------------------------------------------------

  get min(): any {
    this.zpp_inner.getmin();
    return this.zpp_inner.wrap_min;
  }
  set min(min: any) {
    if (min != null && min.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (this.zpp_inner._immutable) {
      throw new Error("Error: AABB is immutable");
    }
    if (min == null) {
      throw new Error("Error: Cannot assign null to AABB::min");
    }

    // NaN check on current bounds
    this.zpp_inner.validate();
    const curMinX = this.zpp_inner.minx;
    this.zpp_inner.validate();
    if (curMinX != this.zpp_inner.minx) {
      throw new Error("Error: AABB::min components cannot be NaN");
    }
    this.zpp_inner.validate();
    const curMinY = this.zpp_inner.miny;
    this.zpp_inner.validate();
    if (curMinY != this.zpp_inner.miny) {
      throw new Error("Error: AABB::min components cannot be NaN");
    }

    // Validate min.x <= max.x
    if (min != null && min.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (min.zpp_inner._validate != null) {
      min.zpp_inner._validate();
    }
    const newX = min.zpp_inner.x;

    this.zpp_inner.getmax();
    const maxVec = this.zpp_inner.wrap_max;
    if (maxVec != null && maxVec.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (maxVec.zpp_inner._validate != null) {
      maxVec.zpp_inner._validate();
    }
    if (newX > maxVec.zpp_inner.x) {
      throw new Error("Error: Assignment would cause negative width");
    }

    // Validate min.y <= max.y
    if (min != null && min.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (min.zpp_inner._validate != null) {
      min.zpp_inner._validate();
    }
    const newY = min.zpp_inner.y;

    this.zpp_inner.getmin();
    const minVecForMaxY = this.zpp_inner.wrap_max;
    if (minVecForMaxY != null && minVecForMaxY.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (minVecForMaxY.zpp_inner._validate != null) {
      minVecForMaxY.zpp_inner._validate();
    }
    if (newY > minVecForMaxY.zpp_inner.y) {
      throw new Error("Error: Assignment would cause negative height");
    }

    // Assign via Vec2 set
    const minVec = this.zpp_inner.wrap_min;
    this._assignVec2(minVec, min);

    // Dispose weak Vec2
    if (min.zpp_inner.weak) {
      this._disposeVec2(min);
    }
  }

  get max(): any {
    this.zpp_inner.getmax();
    return this.zpp_inner.wrap_max;
  }
  set max(max: any) {
    if (max != null && max.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (this.zpp_inner._immutable) {
      throw new Error("Error: AABB is immutable");
    }
    if (max == null) {
      throw new Error("Error: Cannot assign null to AABB::max");
    }

    // NaN check on current bounds
    this.zpp_inner.validate();
    const curMinX = this.zpp_inner.minx;
    this.zpp_inner.validate();
    if (curMinX != this.zpp_inner.minx) {
      throw new Error("Error: AABB::max components cannot be NaN");
    }
    this.zpp_inner.validate();
    const curMinY = this.zpp_inner.miny;
    this.zpp_inner.validate();
    if (curMinY != this.zpp_inner.miny) {
      throw new Error("Error: AABB::max components cannot be NaN");
    }

    // Validate max.x >= min.x
    if (max != null && max.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (max.zpp_inner._validate != null) {
      max.zpp_inner._validate();
    }
    const newX = max.zpp_inner.x;

    this.zpp_inner.getmin();
    const minVec = this.zpp_inner.wrap_min;
    if (minVec != null && minVec.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (minVec.zpp_inner._validate != null) {
      minVec.zpp_inner._validate();
    }
    if (newX < minVec.zpp_inner.x) {
      throw new Error("Error: Assignment would cause negative width");
    }

    // Validate max.y >= min.y
    if (max != null && max.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (max.zpp_inner._validate != null) {
      max.zpp_inner._validate();
    }
    const newY = max.zpp_inner.y;

    this.zpp_inner.getmin();
    const minVecForY = this.zpp_inner.wrap_min;
    if (minVecForY != null && minVecForY.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (minVecForY.zpp_inner._validate != null) {
      minVecForY.zpp_inner._validate();
    }
    if (newY < minVecForY.zpp_inner.y) {
      throw new Error("Error: Assignment would cause negative height");
    }

    // Assign via Vec2 set
    const maxVec = this.zpp_inner.wrap_max;
    this._assignVec2(maxVec, max);

    // Dispose weak Vec2
    if (max.zpp_inner.weak) {
      this._disposeVec2(max);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal Vec2 helpers (shared by min/max setters)
  // ---------------------------------------------------------------------------

  /** @internal Assign source Vec2 values to target Vec2 wrapper. */
  private _assignVec2(target: any, source: any): void {
    if (target != null && target.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (source != null && source.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    const inner = target.zpp_inner;
    if (inner._immutable) {
      throw new Error("Error: Vec2 is immutable");
    }
    if (inner._isimmutable != null) {
      inner._isimmutable();
    }
    if (source == null) {
      throw new Error("Error: Cannot assign null Vec2");
    }
    if (source != null && source.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (source.zpp_inner._validate != null) {
      source.zpp_inner._validate();
    }
    const x = source.zpp_inner.x;
    if (source != null && source.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (source.zpp_inner._validate != null) {
      source.zpp_inner._validate();
    }
    const y = source.zpp_inner.y;

    if (target != null && target.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    const inner2 = target.zpp_inner;
    if (inner2._immutable) {
      throw new Error("Error: Vec2 is immutable");
    }
    if (inner2._isimmutable != null) {
      inner2._isimmutable();
    }
    if (x != x || y != y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }

    let same;
    if (target != null && target.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (target.zpp_inner._validate != null) {
      target.zpp_inner._validate();
    }
    if (target.zpp_inner.x == x) {
      if (target != null && target.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      if (target.zpp_inner._validate != null) {
        target.zpp_inner._validate();
      }
      same = target.zpp_inner.y == y;
    } else {
      same = false;
    }
    if (!same) {
      target.zpp_inner.x = x;
      target.zpp_inner.y = y;
      if (target.zpp_inner._invalidate != null) {
        target.zpp_inner._invalidate(target.zpp_inner);
      }
    }
  }

  /** @internal Dispose a weak Vec2 back to the pool. */
  private _disposeVec2(vec: any): void {
    const napeNs = getNape();
    const zpp_nape = napeNs.zpp_nape;

    if (vec != null && vec.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    const inner = vec.zpp_inner;
    if (inner._immutable) {
      throw new Error("Error: Vec2 is immutable");
    }
    if (inner._isimmutable != null) {
      inner._isimmutable();
    }
    if (vec.zpp_inner._inuse) {
      throw new Error("Error: This Vec2 is not disposable");
    }
    const innerRef = vec.zpp_inner;
    vec.zpp_inner.outer = null;
    vec.zpp_inner = null;
    const o = vec;
    o.zpp_pool = null;
    if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
      zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
    } else {
      zpp_nape.util.ZPP_PubPool.poolVec2 = o;
    }
    zpp_nape.util.ZPP_PubPool.nextVec2 = o;
    o.zpp_disp = true;
    const o1 = innerRef;
    if (o1.outer != null) {
      o1.outer.zpp_inner = null;
      o1.outer = null;
    }
    o1._isimmutable = null;
    o1._validate = null;
    o1._invalidate = null;
    o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
    zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  copy(): AABB {
    this.zpp_inner.validate();
    const inner = this.zpp_inner;
    const ret = ZPP_AABB.get(inner.minx, inner.miny, inner.maxx, inner.maxy);
    return ret.wrapper();
  }

  toString(): string {
    this.zpp_inner.validate();
    return this.zpp_inner.toString();
  }
}

// ---------------------------------------------------------------------------
// Register wrapper factory on ZPP_AABB so wrapper() returns our class
// ---------------------------------------------------------------------------
ZPP_AABB._wrapFn = (zpp: ZPP_AABB): AABB => {
  return getOrCreate(zpp, (raw: ZPP_AABB) => {
    const a = Object.create(AABB.prototype) as AABB;
    a.zpp_inner = raw;
    raw.outer = a;
    return a;
  });
};

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace (replaces compiled AABB)
// ---------------------------------------------------------------------------
const nape = getNape();
nape.geom.AABB = AABB;
(AABB.prototype as any).__class__ = AABB;
