import { getNape } from "../core/engine";
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

  /** Obtain a Vec3 from the object pool (or create a new one). */
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

  get x(): number {
    this._checkDisposed();
    this.zpp_inner.validate();
    return this.zpp_inner.x;
  }

  set x(value: number) {
    this._checkDisposed();
    this._checkImmutable();
    this.zpp_inner.x = value;
  }

  get y(): number {
    this._checkDisposed();
    this.zpp_inner.validate();
    return this.zpp_inner.y;
  }

  set y(value: number) {
    this._checkDisposed();
    this._checkImmutable();
    this.zpp_inner.y = value;
  }

  get z(): number {
    this._checkDisposed();
    this.zpp_inner.validate();
    return this.zpp_inner.z;
  }

  set z(value: number) {
    this._checkDisposed();
    this._checkImmutable();
    this.zpp_inner.z = value;
  }

  /** Magnitude of the 3D vector. */
  get length(): number {
    this._checkDisposed();
    this.zpp_inner.validate();
    const { x, y, z } = this.zpp_inner;
    return Math.sqrt(x * x + y * y + z * z);
  }

  /** Setting length scales the vector to the given magnitude. */
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

  /** Squared length — avoids a square root when only comparison is needed. */
  lsq(): number {
    this._checkDisposed();
    this.zpp_inner.validate();
    const { x, y, z } = this.zpp_inner;
    return x * x + y * y + z * z;
  }

  /** Copy values from another Vec3 into this one (in-place). Returns this. */
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

  /** Set all three components at once (in-place). Returns this. */
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

  /** Return the x,y components as a Vec2. */
  xy(weak: boolean = false): Vec2 {
    this._checkDisposed();
    this.zpp_inner.validate();
    return Vec2.get(this.zpp_inner.x, this.zpp_inner.y, weak);
  }

  /** Release this Vec3 back to the object pool. */
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

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace (replaces compiled Vec3)
// ---------------------------------------------------------------------------
const nape = getNape();
nape.geom.Vec3 = Vec3;
(Vec3.prototype as any).__class__ = Vec3;
