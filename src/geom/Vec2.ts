import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_Vec2 } from "../native/geom/ZPP_Vec2";
import { ZPP_PubPool } from "../native/util/ZPP_PubPool";

type Any = any;

/**
 * 2D vector used for positions, velocities, forces, and other 2D quantities.
 *
 * Supports object pooling via `Vec2.get()` / `dispose()`, weak references
 * that auto-dispose after a single use, and immutability guards.
 *
 * Converted from nape-compiled.js lines 23448–27180.
 */
export class Vec2 {
  // --- Haxe metadata (required by compiled engine) ---
  static __name__ = ["nape", "geom", "Vec2"];

  /** @internal The internal ZPP_Vec2 this wrapper owns. */
  zpp_inner: ZPP_Vec2;

  /** @internal Public Vec2 pool link. */
  zpp_pool: Vec2 | null = null;

  /** @internal Whether this Vec2 has been disposed. */
  zpp_disp: boolean = false;

  /**
   * Backward-compatible accessor — returns `this` so that compiled engine
   * code that receives `vec._inner` can still access `zpp_inner`.
   * @internal
   */
  get _inner(): NapeInner {
    return this;
  }

  constructor(x: number = 0, y: number = 0) {
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }

    let zpp: ZPP_Vec2;
    if (ZPP_Vec2.zpp_pool == null) {
      zpp = new ZPP_Vec2();
    } else {
      zpp = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = zpp.next;
      zpp.next = null;
    }
    zpp.weak = false;
    zpp._immutable = false;
    zpp.x = x;
    zpp.y = y;

    this.zpp_inner = zpp;
    zpp.outer = this;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** @internal Check that this Vec2 has not been disposed. */
  private _checkDisposed(): void {
    if (this.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
  }

  /** @internal Check immutability. */
  private _checkImmutable(): void {
    this.zpp_inner.immutable();
  }

  /** @internal Validate (lazy evaluation callback). */
  private _validate(): void {
    this.zpp_inner.validate();
  }

  /** @internal Invalidate (notify dependents). */
  private _invalidate(): void {
    this.zpp_inner.invalidate();
  }

  /** @internal Dispose a weak Vec2 argument after use. */
  private static _disposeWeak(v: Vec2): void {
    if (v.zpp_inner.weak) {
      v.dispose();
    }
  }

  /**
   * @internal Set x and y on zpp_inner with validation/invalidation.
   * Only invalidates if values actually changed.
   */
  private _setXY(x: number, y: number): void {
    this._checkDisposed();
    this._checkImmutable();
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    this._validate();
    if (this.zpp_inner.x !== x || this.zpp_inner.y !== y) {
      this.zpp_inner.x = x;
      this.zpp_inner.y = y;
      this._invalidate();
    }
  }

  // ---------------------------------------------------------------------------
  // Static factory: allocate from public pool
  // ---------------------------------------------------------------------------

  /** @internal Get a Vec2 from the public pool or create a new one. */
  private static _poolGet(x: number, y: number, weak: boolean): Vec2 {
    let ret: Vec2;
    if (ZPP_PubPool.poolVec2 == null) {
      ret = new Vec2();
    } else {
      ret = ZPP_PubPool.poolVec2;
      ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret === ZPP_PubPool.nextVec2) {
        ZPP_PubPool.nextVec2 = null;
      }
    }

    if (ret.zpp_inner == null) {
      // Need a fresh ZPP_Vec2
      let zpp: ZPP_Vec2;
      if (ZPP_Vec2.zpp_pool == null) {
        zpp = new ZPP_Vec2();
      } else {
        zpp = ZPP_Vec2.zpp_pool;
        ZPP_Vec2.zpp_pool = zpp.next;
        zpp.next = null;
      }
      zpp.weak = false;
      zpp._immutable = false;
      zpp.x = x;
      zpp.y = y;
      ret.zpp_inner = zpp;
      zpp.outer = ret;
    } else {
      // Reuse existing zpp_inner — set values via validation
      ret.zpp_inner.immutable();
      ret.zpp_inner.validate();
      if (ret.zpp_inner.x !== x || ret.zpp_inner.y !== y) {
        ret.zpp_inner.x = x;
        ret.zpp_inner.y = y;
        ret.zpp_inner.invalidate();
      }
    }

    ret.zpp_inner.weak = weak;
    return ret;
  }

  // ---------------------------------------------------------------------------
  // _wrap / static factories
  // ---------------------------------------------------------------------------

  /** @internal Wrap a ZPP_Vec2 (or legacy compiled Vec2) with caching. */
  static _wrap(inner: any): Vec2 {
    if (inner instanceof Vec2) return inner;
    if (!inner) return null as unknown as Vec2;

    if (inner instanceof ZPP_Vec2) {
      return getOrCreate(inner, (zpp: ZPP_Vec2) => {
        const v = Object.create(Vec2.prototype) as Vec2;
        v.zpp_inner = zpp;
        v.zpp_pool = null;
        v.zpp_disp = false;
        zpp.outer = v;
        return v;
      });
    }

    // Legacy fallback: compiled Vec2 with zpp_inner
    if (inner.zpp_inner) {
      return Vec2._wrap(inner.zpp_inner);
    }

    return null as unknown as Vec2;
  }

  /** Obtain a Vec2 from the object pool (or create a new one). */
  static get(x: number = 0, y: number = 0, weak: boolean = false): Vec2 {
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    return Vec2._poolGet(x, y, weak);
  }

  /** Obtain a weak Vec2 that auto-disposes after a single use. */
  static weak(x: number = 0, y: number = 0): Vec2 {
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    return Vec2._poolGet(x, y, true);
  }

  /** Create a Vec2 from polar coordinates. */
  static fromPolar(length: number, angle: number, weak: boolean = false): Vec2 {
    if (length !== length) {
      throw new Error("Error: Vec2::length cannot be NaN");
    }
    if (angle !== angle) {
      throw new Error("Error: Vec2::angle cannot be NaN");
    }
    const x = length * Math.cos(angle);
    const y = length * Math.sin(angle);
    return Vec2._poolGet(x, y, weak);
  }

  /** Squared distance between two Vec2s. */
  static dsq(a: Vec2, b: Vec2): number {
    if (a != null && a.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (b != null && b.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (a == null || b == null) {
      throw new Error("Error: Cannot compute squared distance between null Vec2");
    }
    a.zpp_inner.validate();
    const ax = a.zpp_inner.x;
    const ay = a.zpp_inner.y;
    b.zpp_inner.validate();
    const bx = b.zpp_inner.x;
    const by = b.zpp_inner.y;
    const dx = ax - bx;
    const dy = ay - by;
    const ret = dx * dx + dy * dy;
    Vec2._disposeWeak(a);
    Vec2._disposeWeak(b);
    return ret;
  }

  /** Euclidean distance between two Vec2s. */
  static distance(a: Vec2, b: Vec2): number {
    if (a != null && a.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (b != null && b.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (a == null || b == null) {
      throw new Error("Error: Cannot compute squared distance between null Vec2");
    }
    a.zpp_inner.validate();
    const ax = a.zpp_inner.x;
    const ay = a.zpp_inner.y;
    b.zpp_inner.validate();
    const bx = b.zpp_inner.x;
    const by = b.zpp_inner.y;
    const dx = ax - bx;
    const dy = ay - by;
    const ret = Math.sqrt(dx * dx + dy * dy);
    Vec2._disposeWeak(a);
    Vec2._disposeWeak(b);
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get x(): number {
    this._checkDisposed();
    this._validate();
    return this.zpp_inner.x;
  }

  set x(value: number) {
    this._checkDisposed();
    this._checkImmutable();
    this._validate();
    if (this.zpp_inner.x !== value) {
      if (value !== value) {
        throw new Error("Error: Vec2::x cannot be NaN");
      }
      this.zpp_inner.x = value;
      this._invalidate();
    }
  }

  get y(): number {
    this._checkDisposed();
    this._validate();
    return this.zpp_inner.y;
  }

  set y(value: number) {
    this._checkDisposed();
    this._checkImmutable();
    this._validate();
    if (this.zpp_inner.y !== value) {
      if (value !== value) {
        throw new Error("Error: Vec2::y cannot be NaN");
      }
      this.zpp_inner.y = value;
      this._invalidate();
    }
  }

  /** Magnitude of the vector. */
  get length(): number {
    this._checkDisposed();
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    return Math.sqrt(x * x + y * y);
  }

  /** Setting length scales the vector to the given magnitude. */
  set length(value: number) {
    this._checkDisposed();
    this._checkImmutable();
    if (value !== value) {
      throw new Error("Error: Vec2::length cannot be NaN");
    }
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    const lsq = x * x + y * y;
    if (lsq === 0) {
      throw new Error("Error: Cannot set length of a zero vector");
    }
    const scale = value / Math.sqrt(lsq);
    this._setXY(x * scale, y * scale);
    this._invalidate();
  }

  /** Angle of the vector in radians (measured from the +x axis). */
  get angle(): number {
    this._checkDisposed();
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    if (x === y && x === 0) {
      return 0.0;
    }
    return Math.atan2(y, x);
  }

  /** Setting angle preserves magnitude but rotates to the given angle. */
  set angle(value: number) {
    this._checkDisposed();
    this._checkImmutable();
    if (value !== value) {
      throw new Error("Error: Vec2::angle cannot be NaN");
    }
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    const l = Math.sqrt(x * x + y * y);
    const nx = l * Math.cos(value);
    const ny = l * Math.sin(value);
    this._setXY(nx, ny);
  }

  // ---------------------------------------------------------------------------
  // Instance methods
  // ---------------------------------------------------------------------------

  /** Squared length — avoids a square root when only comparison is needed. */
  lsq(): number {
    this._checkDisposed();
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    return x * x + y * y;
  }

  /** Copy values from another vector into this one (in-place). Returns this. */
  set(vector: Vec2): this {
    this._checkDisposed();
    if (vector != null && vector.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    this._checkImmutable();
    if (vector == null) {
      throw new Error("Error: Cannot assign null Vec2");
    }
    vector.zpp_inner.validate();
    const x = vector.zpp_inner.x;
    const y = vector.zpp_inner.y;
    this._setXY(x, y);
    Vec2._disposeWeak(vector);
    return this;
  }

  /** Set both components at once (in-place). Returns this. */
  setxy(x: number, y: number): this {
    this._checkDisposed();
    this._checkImmutable();
    this._setXY(x, y);
    return this;
  }

  /** Return a new copy of this vector. */
  copy(weak: boolean = false): Vec2 {
    this._checkDisposed();
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    return Vec2._poolGet(x, y, weak);
  }

  /** Rotate this vector by the given angle in radians (in-place). Returns this. */
  rotate(angle: number): this {
    this._checkDisposed();
    this._checkImmutable();
    if (angle !== angle) {
      throw new Error("Error: Cannot rotate Vec2 by NaN");
    }
    if (angle % (Math.PI * 2) !== 0) {
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      const t = c * this.zpp_inner.x - s * this.zpp_inner.y;
      this.zpp_inner.y = this.zpp_inner.x * s + this.zpp_inner.y * c;
      this.zpp_inner.x = t;
      this._invalidate();
    }
    return this;
  }

  /** Reflect this vector about the given axis vector (returns new Vec2). */
  reflect(vec: Vec2, weak: boolean = false): Vec2 {
    this._checkDisposed();
    if (vec != null && vec.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    if (Math.sqrt(x * x + y * y) === 0) {
      throw new Error("Error: Cannot reflect in zero vector");
    }
    // normal = unit of this, then: result = vec - 2*(normal·vec)*normal
    const normal = Vec2._poolGet(x, y, true);
    normal.normalise();
    const ret = vec.sub(normal.muleq(2 * normal.dot(vec)), weak);
    Vec2._disposeWeak(vec);
    return ret;
  }

  /** Normalize this vector to unit length (in-place). Returns this. */
  normalise(): this {
    this._checkDisposed();
    this._checkImmutable();
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    const lsq = x * x + y * y;
    if (Math.sqrt(lsq) === 0) {
      throw new Error("Error: Cannot normalise vector of length 0");
    }
    const imag = 1.0 / Math.sqrt(lsq);
    this._setXY(x * imag, y * imag);
    this._invalidate();
    return this;
  }

  /** Return a new unit-length vector with the same direction. */
  unit(weak: boolean = false): Vec2 {
    this._checkDisposed();
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    const lsq = x * x + y * y;
    if (Math.sqrt(lsq) === 0) {
      throw new Error("Error: Cannot normalise vector of length 0");
    }
    const scale = 1 / Math.sqrt(lsq);
    return Vec2._poolGet(x * scale, y * scale, weak);
  }

  /** Return a new vector = this + other. */
  add(vector: Vec2, weak: boolean = false): Vec2 {
    this._checkDisposed();
    if (vector != null && vector.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (vector == null) {
      throw new Error("Error: Cannot add null vectors");
    }
    this._validate();
    vector.zpp_inner.validate();
    const x = this.zpp_inner.x + vector.zpp_inner.x;
    const y = this.zpp_inner.y + vector.zpp_inner.y;
    const ret = Vec2._poolGet(x, y, weak);
    Vec2._disposeWeak(vector);
    return ret;
  }

  /** Return a new vector = this + other * scalar. */
  addMul(vector: Vec2, scalar: number, weak: boolean = false): Vec2 {
    this._checkDisposed();
    if (vector != null && vector.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (vector == null) {
      throw new Error("Error: Cannot add null vectors");
    }
    this._validate();
    vector.zpp_inner.validate();
    const x = this.zpp_inner.x + vector.zpp_inner.x * scalar;
    const y = this.zpp_inner.y + vector.zpp_inner.y * scalar;
    const ret = Vec2._poolGet(x, y, weak);
    Vec2._disposeWeak(vector);
    return ret;
  }

  /** Return a new vector = this - other. */
  sub(vector: Vec2, weak: boolean = false): Vec2 {
    this._checkDisposed();
    if (vector != null && vector.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (vector == null) {
      throw new Error("Error: Cannot subtract null vectors");
    }
    this._validate();
    vector.zpp_inner.validate();
    const x = this.zpp_inner.x - vector.zpp_inner.x;
    const y = this.zpp_inner.y - vector.zpp_inner.y;
    const ret = Vec2._poolGet(x, y, weak);
    Vec2._disposeWeak(vector);
    return ret;
  }

  /** Return a new vector = this * scalar. */
  mul(scalar: number, weak: boolean = false): Vec2 {
    this._checkDisposed();
    if (scalar !== scalar) {
      throw new Error("Error: Cannot multiply with NaN");
    }
    this._validate();
    const x = this.zpp_inner.x * scalar;
    const y = this.zpp_inner.y * scalar;
    return Vec2._poolGet(x, y, weak);
  }

  /** this += other (in-place). Returns this. */
  addeq(vector: Vec2): this {
    this._checkDisposed();
    if (vector != null && vector.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    this._checkImmutable();
    if (vector == null) {
      throw new Error("Error: Cannot add null vectors");
    }
    this._validate();
    vector.zpp_inner.validate();
    const x = this.zpp_inner.x + vector.zpp_inner.x;
    const y = this.zpp_inner.y + vector.zpp_inner.y;
    this._setXY(x, y);
    Vec2._disposeWeak(vector);
    return this;
  }

  /** this -= other (in-place). Returns this. */
  subeq(vector: Vec2): this {
    this._checkDisposed();
    if (vector != null && vector.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    this._checkImmutable();
    if (vector == null) {
      throw new Error("Error: Cannot subtract null vectors");
    }
    this._validate();
    vector.zpp_inner.validate();
    const x = this.zpp_inner.x - vector.zpp_inner.x;
    const y = this.zpp_inner.y - vector.zpp_inner.y;
    this._setXY(x, y);
    Vec2._disposeWeak(vector);
    return this;
  }

  /** this *= scalar (in-place). Returns this. */
  muleq(scalar: number): this {
    this._checkDisposed();
    this._checkImmutable();
    if (scalar !== scalar) {
      throw new Error("Error: Cannot multiply with NaN");
    }
    this._validate();
    const x = this.zpp_inner.x * scalar;
    const y = this.zpp_inner.y * scalar;
    this._setXY(x, y);
    return this;
  }

  /** Dot product of this and other. */
  dot(vector: Vec2): number {
    this._checkDisposed();
    if (vector != null && vector.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (vector == null) {
      throw new Error("Error: Cannot take dot product with null vector");
    }
    this._validate();
    vector.zpp_inner.validate();
    const ret =
      this.zpp_inner.x * vector.zpp_inner.x +
      this.zpp_inner.y * vector.zpp_inner.y;
    Vec2._disposeWeak(vector);
    return ret;
  }

  /** 2D cross product (returns scalar: this.x*other.y - this.y*other.x). */
  cross(vector: Vec2): number {
    this._checkDisposed();
    if (vector != null && vector.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (vector == null) {
      throw new Error("Error: Cannot take cross product with null vector");
    }
    this._validate();
    vector.zpp_inner.validate();
    const ret =
      this.zpp_inner.x * vector.zpp_inner.y -
      this.zpp_inner.y * vector.zpp_inner.x;
    Vec2._disposeWeak(vector);
    return ret;
  }

  /** Return the perpendicular vector (rotated 90deg counter-clockwise). */
  perp(weak: boolean = false): Vec2 {
    this._checkDisposed();
    this._validate();
    const x = -this.zpp_inner.y;
    const y = this.zpp_inner.x;
    return Vec2._poolGet(x, y, weak);
  }

  /** Release this vector back to the object pool. */
  dispose(): void {
    if (this.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    this._checkImmutable();
    if (this.zpp_inner._inuse) {
      throw new Error("Error: This Vec2 is not disposable");
    }

    // Free the ZPP_Vec2 back to internal pool
    const inner = this.zpp_inner;
    inner.outer = null;
    this.zpp_inner = null as any;

    // Return public Vec2 to public pool
    this.zpp_pool = null;
    if (ZPP_PubPool.nextVec2 != null) {
      ZPP_PubPool.nextVec2.zpp_pool = this;
    } else {
      ZPP_PubPool.poolVec2 = this;
    }
    ZPP_PubPool.nextVec2 = this;
    this.zpp_disp = true;

    // Return ZPP_Vec2 to internal pool
    inner.free();
    inner.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = inner;
  }

  toString(): string {
    this._checkDisposed();
    this._validate();
    return this.zpp_inner.toString();
  }
}

// ---------------------------------------------------------------------------
// Internal type helpers (used across wrapper modules)
// ---------------------------------------------------------------------------

/** @internal Opaque handle for any Haxe-compiled nape object. */
export type NapeInner = any;

/** @internal Helper to write to readonly properties during construction. */
export type Writable<T> = { -readonly [P in keyof T]: T[P] };

// ---------------------------------------------------------------------------
// Register wrapper factory on ZPP_Vec2 so wrapper() returns our Vec2
// ---------------------------------------------------------------------------
ZPP_Vec2._wrapFn = (zpp: ZPP_Vec2): Vec2 => {
  return getOrCreate(zpp, (raw: ZPP_Vec2) => {
    const v = Object.create(Vec2.prototype) as Vec2;
    v.zpp_inner = raw;
    v.zpp_pool = null;
    v.zpp_disp = false;
    raw.outer = v;
    return v;
  });
};

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace (replaces compiled Vec2)
// ---------------------------------------------------------------------------
const nape = getNape();
nape.geom.Vec2 = Vec2;
(Vec2.prototype as any).__class__ = Vec2;
