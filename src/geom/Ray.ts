import { getOrCreate } from "../core/cache";
import { Vec2 } from "./Vec2";
import { AABB } from "./AABB";
import { ZPP_Ray } from "../native/geom/ZPP_Ray";

/** Read validated x from a Vec2. */
function _readVec2X(v: Vec2): number {
  if (v.zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.x;
}

/** Read validated y from a Vec2. */
function _readVec2Y(v: Vec2): number {
  if (v.zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.y;
}

/** Dispose a Vec2 if it is weak. */
function _disposeWeakVec2(v: Vec2): void {
  if (v.zpp_inner.weak) {
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

  /** @internal */
  zpp_inner: ZPP_Ray;

  /** @internal */
  get _inner(): this {
    return this;
  }

  /**
   * Create a Ray from an origin point and a direction vector.
   * Both must be non-null, non-disposed Vec2s.
   * @param origin - The start point of the ray in world coordinates.
   * @param direction - The direction vector (need not be unit length).
   */
  constructor(origin: Vec2, direction: Vec2) {
    // Validate origin
    if (origin?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (origin == null) {
      throw new Error("Error: Ray::origin cannot be null");
    }

    // Validate direction
    if (direction?.zpp_disp) {
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
  static _wrap(inner: ZPP_Ray | Ray | null): Ray {
    if (inner == null) return null!;
    if (inner instanceof Ray) return inner;
    return getOrCreate(inner, (raw: ZPP_Ray) => {
      const r = Object.create(Ray.prototype) as Ray;
      r.zpp_inner = (raw as any).zpp_inner ?? raw;
      return r;
    });
  }

  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  /**
   * Create a Ray from a line segment.
   * The ray origin is `start`, direction is `end − start`, and `maxDistance` is the segment length.
   * @param start - The start point of the segment.
   * @param end - The end point of the segment.
   * @returns A new Ray spanning the segment.
   */
  static fromSegment(start: Vec2, end: Vec2): Ray {
    if (start?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (start == null) {
      throw new Error("Error: Ray::fromSegment::start is null");
    }
    if (end?.zpp_disp) {
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

  /** The ray's start point in world coordinates. */
  get origin(): Vec2 {
    return this.zpp_inner.origin;
  }

  /** The ray's start point in world coordinates. */
  set origin(value: Vec2) {
    if (value?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Ray::origin cannot be null");
    }
    this.zpp_inner.origin.set(value);
    _disposeWeakVec2(value);
  }

  /** The ray's direction vector (need not be unit length; the engine normalises internally). */
  get direction(): Vec2 {
    return this.zpp_inner.direction;
  }

  /** The ray's direction vector (need not be unit length; the engine normalises internally). */
  set direction(value: Vec2) {
    if (value?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Ray::direction cannot be null");
    }
    this.zpp_inner.direction.set(value);
    this.zpp_inner.zip_dir = true;
    _disposeWeakVec2(value);
  }

  /** Maximum travel distance for raycasting queries. Defaults to `Infinity`. */
  get maxDistance(): number {
    return this.zpp_inner.maxdist;
  }

  /** Maximum travel distance for raycasting queries. Defaults to `Infinity`. */
  set maxDistance(value: number) {
    if (value !== value) {
      throw new Error("Error: maxDistance cannot be NaN");
    }
    this.zpp_inner.maxdist = value;
  }

  /** Arbitrary user data attached to this Ray. */
  get userData(): Record<string, unknown> {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData as Record<string, unknown>;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /**
   * Compute the axis-aligned bounding box that encloses the ray from origin to `maxDistance`.
   * @returns A new AABB wrapping the ray's extent.
   */
  aabb(): AABB {
    return AABB._wrap(this.zpp_inner.rayAABB());
  }

  /**
   * Return the world-space point at `distance` along the ray.
   * @param distance - Distance from the ray origin along the ray direction.
   * @param weak - If true, the returned Vec2 is a weak (pooled) reference.
   * @returns The point `origin + distance * normalised_direction`.
   */
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

  /**
   * Return a new Ray with the same origin, direction, and maxDistance.
   * @returns A deep copy of this Ray.
   */
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

  /** @internal */ get_origin(): Vec2 {
    return this.origin;
  }
  /** @internal */ set_origin(v: Vec2): Vec2 {
    this.origin = v;
    return this.origin;
  }
  /** @internal */ get_direction(): Vec2 {
    return this.direction;
  }
  /** @internal */ set_direction(v: Vec2): Vec2 {
    this.direction = v;
    return this.direction;
  }
  /** @internal */ get_maxDistance(): number {
    return this.maxDistance;
  }
  /** @internal */ set_maxDistance(v: number): number {
    this.maxDistance = v;
    return this.zpp_inner.maxdist;
  }
  /** @internal */ get_userData(): Record<string, unknown> {
    return this.userData;
  }
}
