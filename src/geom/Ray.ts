import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2 } from "./Vec2";
import { AABB } from "./AABB";
import { ZPP_Ray } from "../native/geom/ZPP_Ray";

type Any = any;

/** Read validated x from a Vec2. */
function _readVec2X(v: Vec2): number {
  if ((v as Any).zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = (v as Any).zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.x;
}

/** Read validated y from a Vec2. */
function _readVec2Y(v: Vec2): number {
  if ((v as Any).zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = (v as Any).zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.y;
}

/** Dispose a Vec2 if it is weak. */
function _disposeWeakVec2(v: Vec2): void {
  if ((v as Any).zpp_inner.weak) {
    v.dispose();
  }
}

/**
 * A ray for raycasting queries.
 *
 * Fully modernized — uses ZPP_Ray directly (extracted to TypeScript).
 */
export class Ray {
  static __name__ = ["nape", "geom", "Ray"];

  /** Direct access to the extracted internal ZPP_Ray. */
  zpp_inner: ZPP_Ray;

  /** Backward-compat alias for compiled code. */
  get _inner(): this {
    return this;
  }

  constructor(origin: Vec2, direction: Vec2) {
    // Validate origin
    if ((origin as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (origin == null) {
      throw new Error("Error: Ray::origin cannot be null");
    }

    // Validate direction
    if ((direction as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (direction == null) {
      throw new Error("Error: Ray::direction cannot be null");
    }

    // Create internal ZPP_Ray (allocates owned origin/direction Vec2 wrappers)
    const zpp = new ZPP_Ray();
    this.zpp_inner = zpp;

    // Copy origin x/y into the owned Vec2
    const ox = _readVec2X(origin);
    const oy = _readVec2Y(origin);
    zpp.origin.zpp_inner.x = ox;
    zpp.origin.zpp_inner.y = oy;
    if (zpp.origin.zpp_inner._invalidate != null) {
      zpp.origin.zpp_inner._invalidate(zpp.origin.zpp_inner);
    }
    _disposeWeakVec2(origin);

    // Copy direction x/y into the owned Vec2
    const dx = _readVec2X(direction);
    const dy = _readVec2Y(direction);
    zpp.direction.zpp_inner.x = dx;
    zpp.direction.zpp_inner.y = dy;
    if (zpp.direction.zpp_inner._invalidate != null) {
      zpp.direction.zpp_inner._invalidate(zpp.direction.zpp_inner);
    }
    _disposeWeakVec2(direction);

    zpp.zip_dir = true;
    zpp.maxdist = Infinity;
  }

  /** @internal */
  static _wrap(inner: Any): Ray {
    if (inner == null) return null!;
    if (inner instanceof Ray) return inner;
    return getOrCreate(inner, (raw: Any) => {
      const r = Object.create(Ray.prototype) as Ray;
      r.zpp_inner = raw.zpp_inner ?? raw;
      return r;
    });
  }

  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  static fromSegment(start: Vec2, end: Vec2): Ray {
    if ((start as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (start == null) {
      throw new Error("Error: Ray::fromSegment::start is null");
    }
    if ((end as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (end == null) {
      throw new Error("Error: Ray::fromSegment::end is null");
    }

    // Compute direction as (end - start), weak
    const dir = end.sub(start, true);
    const ray = new Ray(start, dir);

    // Set maxDistance to segment length
    const sx = _readVec2X(start);
    const sy = _readVec2Y(start);
    const ex = _readVec2X(end);
    const ey = _readVec2Y(end);
    const ddx = ex - sx;
    const ddy = ey - sy;
    const maxDist = Math.sqrt(ddx * ddx + ddy * ddy);

    if (maxDist !== maxDist) {
      throw new Error("Error: maxDistance cannot be NaN");
    }
    ray.zpp_inner.maxdist = maxDist;

    _disposeWeakVec2(start);
    _disposeWeakVec2(end);

    return ray;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get origin(): Vec2 {
    return this.zpp_inner.origin;
  }

  set origin(value: Vec2) {
    if ((value as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Ray::origin cannot be null");
    }
    this.zpp_inner.origin.set(value);
    _disposeWeakVec2(value);
  }

  get direction(): Vec2 {
    return this.zpp_inner.direction;
  }

  set direction(value: Vec2) {
    if ((value as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Ray::direction cannot be null");
    }
    this.zpp_inner.direction.set(value);
    this.zpp_inner.zip_dir = true;
    _disposeWeakVec2(value);
  }

  get maxDistance(): number {
    return this.zpp_inner.maxdist;
  }

  set maxDistance(value: number) {
    if (value !== value) {
      throw new Error("Error: maxDistance cannot be NaN");
    }
    this.zpp_inner.maxdist = value;
  }

  get userData(): Record<string, unknown> {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  aabb(): AABB {
    return AABB._wrap(this.zpp_inner.rayAABB());
  }

  at(distance: number, weak: boolean = false): Vec2 {
    this.zpp_inner.validate_dir();

    // Read origin coordinates
    const inner = this.zpp_inner.origin.zpp_inner;
    if (inner._validate != null) inner._validate();
    const ox = inner.x;
    const oy = inner.y;

    const x = ox + distance * this.zpp_inner.dirx;
    const y = oy + distance * this.zpp_inner.diry;

    return Vec2.get(x, y, weak);
  }

  copy(): Ray {
    const ret = new Ray(this.zpp_inner.origin, this.zpp_inner.direction);
    const md = this.zpp_inner.maxdist;
    if (md !== md) {
      throw new Error("Error: maxDistance cannot be NaN");
    }
    ret.zpp_inner.maxdist = md;
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Backward-compat get_*/set_* methods for compiled code
  // ---------------------------------------------------------------------------

  /** @internal */ get_origin(): Vec2 { return this.origin; }
  /** @internal */ set_origin(v: Vec2): Vec2 { this.origin = v; return this.origin; }
  /** @internal */ get_direction(): Vec2 { return this.direction; }
  /** @internal */ set_direction(v: Vec2): Vec2 { this.direction = v; return this.direction; }
  /** @internal */ get_maxDistance(): number { return this.maxDistance; }
  /** @internal */ set_maxDistance(v: number): number { this.maxDistance = v; return this.zpp_inner.maxdist; }
  /** @internal */ get_userData(): Any { return this.userData; }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const nape = getNape();
nape.geom.Ray = Ray;
(Ray.prototype as Any).__class__ = Ray;
