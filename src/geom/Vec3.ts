import { getOrCreate } from "../core/cache";
import { ZPP_Vec3 } from "../native/geom/ZPP_Vec3";
import { ZPP_PubPool } from "../native/util/ZPP_PubPool";
import { Vec2 } from "./Vec2";
import type { NapeInner } from "./Vec2";

/**
 * 3D vector used for constraint impulses and other 3-component values.
 *
 * Supports object pooling via `Vec3.get()` / `dispose()`.
 *
 * Converted from nape-compiled.js lines 24120–25040.
 */
export class Vec3 {
  // --- Haxe metadata (required by compiled engine) ---
  static __name__ = ["nape", "geom", "Vec3"];

  /** @internal The internal ZPP_Vec3 this wrapper owns. */
  zpp_inner: ZPP_Vec3;

  /** @internal Public Vec3 pool link. */
  zpp_pool: Vec3 | null = null;

  /** @internal Whether this Vec3 has been disposed. */
  zpp_disp: boolean = false;

  /**
   * Backward-compatible accessor — returns `this` so that compiled engine
   * code that receives `v3._inner` can still access `zpp_inner`.
   * @internal
   */
  get _inner(): NapeInner {
    return this;
  }

  /**
   * Create a Vec3 with the given components. Defaults to (0, 0, 0).
   * @param x - The x component.
   * @param y - The y component.
   * @param z - The z component.
   */
  constructor(x: number = 0, y: number = 0, z: number = 0) {
    const zpp = new ZPP_Vec3();
    this.zpp_inner = zpp;
    zpp.outer = this;

    zpp.x = x;
    zpp.y = y;
    zpp.z = z;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** @internal Check that this Vec3 has not been disposed. */
  private _checkDisposed(): void {
    if (this.zpp_disp) {
      throw new Error("Error: Vec3 has been disposed and cannot be used!");
    }
  }

  /** @internal Check immutability. */
  private _checkImmutable(): void {
    if (this.zpp_inner.immutable) {
      throw new Error("Error: Vec3 is immutable");
    }
  }

  // ---------------------------------------------------------------------------
  // _wrap / static factories
  // ---------------------------------------------------------------------------

  /** @internal Wrap a ZPP_Vec3 (or legacy compiled Vec3) with caching. */
  static _wrap(inner: any): Vec3 {
    if (inner instanceof Vec3) return inner;
    if (!inner) return null as unknown as Vec3;

    if (inner instanceof ZPP_Vec3) {
      return getOrCreate(inner, (zpp: ZPP_Vec3) => {
        const v = Object.create(Vec3.prototype) as Vec3;
        v.zpp_inner = zpp;
        v.zpp_pool = null;
        v.zpp_disp = false;
        zpp.outer = v;
        return v;
      });
    }

    // Legacy fallback: compiled Vec3 with zpp_inner
    if (inner.zpp_inner) {
      return Vec3._wrap(inner.zpp_inner);
    }

    return null as unknown as Vec3;
  }

  /**
   * Allocate a Vec3 from the public object pool, or create a new one if the pool is empty.
   * @param x - Initial x component (default 0).
   * @param y - Initial y component (default 0).
   * @param z - Initial z component (default 0).
   * @returns A Vec3 initialised with the given components.
   */
  static get(x: number = 0, y: number = 0, z: number = 0): Vec3 {
    let ret: Vec3;
    if (ZPP_PubPool.poolVec3 == null) {
      ret = new Vec3();
    } else {
      ret = ZPP_PubPool.poolVec3;
      ZPP_PubPool.poolVec3 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret === ZPP_PubPool.nextVec3) {
        ZPP_PubPool.nextVec3 = null;
      }
    }
    ret.setxyz(x, y, z);
    ret.zpp_inner.immutable = false;
    ret.zpp_inner._validate = null;
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /** The x component. */
  get x(): number {
    this._checkDisposed();
    this.zpp_inner.validate();
    return this.zpp_inner.x;
  }

  /** The x component. */
  set x(value: number) {
    this._checkDisposed();
    this._checkImmutable();
    this.zpp_inner.x = value;
  }

  /** The y component. */
  get y(): number {
    this._checkDisposed();
    this.zpp_inner.validate();
    return this.zpp_inner.y;
  }

  /** The y component. */
  set y(value: number) {
    this._checkDisposed();
    this._checkImmutable();
    this.zpp_inner.y = value;
  }

  /** The z component. */
  get z(): number {
    this._checkDisposed();
    this.zpp_inner.validate();
    return this.zpp_inner.z;
  }

  /** The z component. */
  set z(value: number) {
    this._checkDisposed();
    this._checkImmutable();
    this.zpp_inner.z = value;
  }

  /**
   * Magnitude of the 3D vector.
   * @returns The Euclidean length `sqrt(x² + y² + z²)`.
   */
  get length(): number {
    this._checkDisposed();
    this.zpp_inner.validate();
    const { x, y, z } = this.zpp_inner;
    return Math.sqrt(x * x + y * y + z * z);
  }

  /**
   * Scale the vector to the given magnitude.
   * @throws If the vector has zero length.
   */
  set length(value: number) {
    this._checkDisposed();
    if (value !== value) {
      throw new Error("Error: Vec3::length cannot be NaN");
    }
    this.zpp_inner.validate();
    const { x, y, z } = this.zpp_inner;
    const lsq = x * x + y * y + z * z;
    if (lsq === 0) {
      throw new Error("Error: Cannot set length of a zero vector");
    }
    const scale = value / Math.sqrt(lsq);
    this._checkImmutable();
    this.zpp_inner.x = x * scale;
    this.zpp_inner.y = y * scale;
    this.zpp_inner.z = z * scale;
  }

  // ---------------------------------------------------------------------------
  // Instance methods
  // ---------------------------------------------------------------------------

  /**
   * Squared magnitude. Faster than `length` as it avoids a square root.
   * @returns `x² + y² + z²`.
   */
  lsq(): number {
    this._checkDisposed();
    this.zpp_inner.validate();
    const { x, y, z } = this.zpp_inner;
    return x * x + y * y + z * z;
  }

  /**
   * Copy another Vec3's components into this one in-place.
   * @param vector - The source Vec3 to copy from.
   * @returns `this` for chaining.
   */
  set(vector: Vec3): this {
    this._checkDisposed();
    if (vector != null && vector.zpp_disp) {
      throw new Error("Error: Vec3 has been disposed and cannot be used!");
    }
    if (vector == null) {
      throw new Error("Error: Cannot assign null Vec3");
    }
    vector.zpp_inner.validate();
    return this.setxyz(vector.zpp_inner.x, vector.zpp_inner.y, vector.zpp_inner.z);
  }

  /**
   * Set all three components at once in-place.
   * @param x - The new x component.
   * @param y - The new y component.
   * @param z - The new z component.
   * @returns `this` for chaining.
   */
  setxyz(x: number, y: number, z: number): this {
    this._checkDisposed();
    this._checkImmutable();
    this.zpp_inner.x = x;
    this._checkImmutable();
    this.zpp_inner.y = y;
    this._checkImmutable();
    this.zpp_inner.z = z;
    return this;
  }

  /**
   * Check whether this Vec3 is component-wise equal to another, within an optional epsilon tolerance.
   *
   * @param other - The Vec3 to compare against.
   * @param epsilon - Maximum allowed difference per component (default 0).
   * @returns `true` if all three components differ by at most `epsilon`.
   */
  equals(other: Vec3, epsilon: number = 0): boolean {
    this._checkDisposed();
    if (other != null && other.zpp_disp) {
      throw new Error("Error: Vec3 has been disposed and cannot be used!");
    }
    if (other == null) {
      return false;
    }
    this.zpp_inner.validate();
    other.zpp_inner.validate();
    const dx = this.zpp_inner.x - other.zpp_inner.x;
    const dy = this.zpp_inner.y - other.zpp_inner.y;
    const dz = this.zpp_inner.z - other.zpp_inner.z;
    return (
      (dx < 0 ? -dx : dx) <= epsilon &&
      (dy < 0 ? -dy : dy) <= epsilon &&
      (dz < 0 ? -dz : dz) <= epsilon
    );
  }

  /**
   * Return a new Vec3 with the same components.
   * @returns A copy of this vector.
   */
  clone(): Vec3 {
    this._checkDisposed();
    this.zpp_inner.validate();
    return Vec3.get(this.zpp_inner.x, this.zpp_inner.y, this.zpp_inner.z);
  }

  /**
   * Return the x and y components as a new Vec2.
   * @param weak - If true, the returned Vec2 is a weak (pooled) reference.
   * @returns A new Vec2 containing this vector's x and y components.
   */
  xy(weak: boolean = false): Vec2 {
    this._checkDisposed();
    this.zpp_inner.validate();
    return Vec2.get(this.zpp_inner.x, this.zpp_inner.y, weak);
  }

  /**
   * Return this Vec3 to the object pool.
   * @throws If this Vec3 has already been disposed.
   */
  dispose(): void {
    if (this.zpp_disp) {
      throw new Error("Error: Vec3 has been disposed and cannot be used!");
    }
    if (this.zpp_inner.immutable) {
      throw new Error("Error: This Vec3 is not disposable");
    }
    this.zpp_pool = null;
    if (ZPP_PubPool.nextVec3 != null) {
      ZPP_PubPool.nextVec3.zpp_pool = this;
    } else {
      ZPP_PubPool.poolVec3 = this;
    }
    ZPP_PubPool.nextVec3 = this;
    this.zpp_disp = true;
  }

  /**
   * String representation `{ x: … y: … z: … }`.
   * @returns A human-readable string of the three components.
   */
  toString(): string {
    this._checkDisposed();
    this.zpp_inner.validate();
    return (
      "{ x: " + this.zpp_inner.x + " y: " + this.zpp_inner.y + " z: " + this.zpp_inner.z + " }"
    );
  }
}

// ---------------------------------------------------------------------------
// Register wrapper factory on ZPP_Vec3 so wrapper() returns our Vec3
// ---------------------------------------------------------------------------
ZPP_Vec3._wrapFn = (zpp: ZPP_Vec3): Vec3 => {
  return getOrCreate(zpp, (raw: ZPP_Vec3) => {
    const v = Object.create(Vec3.prototype) as Vec3;
    v.zpp_inner = raw;
    v.zpp_pool = null;
    v.zpp_disp = false;
    raw.outer = v;
    return v;
  });
};
