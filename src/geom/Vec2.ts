import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_Vec2 } from "../native/geom/ZPP_Vec2";
import { ZPP_PubPool } from "../native/util/ZPP_PubPool";

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

  /**
   * Creates a Vec2 with the given components. Defaults to (0, 0).
   *
   * @param x - The x component (default 0).
   * @param y - The y component (default 0).
   */
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

  /**
   * Allocate a Vec2 from the public object pool. If `weak` is true, the vector
   * auto-disposes after a single API call.
   *
   * @param x - The x component (default 0).
   * @param y - The y component (default 0).
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A pooled or newly created Vec2.
   * @example
   * const v = Vec2.get(3, 4);
   * // use v ...
   * v.dispose();
   */
  static get(x: number = 0, y: number = 0, weak: boolean = false): Vec2 {
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    return Vec2._poolGet(x, y, weak);
  }

  /**
   * Allocate a weak Vec2 (auto-disposes after a single use).
   *
   * @param x - The x component (default 0).
   * @param y - The y component (default 0).
   * @returns A weak, pooled Vec2 that is automatically disposed after one API call.
   */
  static weak(x: number = 0, y: number = 0): Vec2 {
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    return Vec2._poolGet(x, y, true);
  }

  /**
   * Create a Vec2 from polar coordinates (length and angle in radians).
   *
   * @param length - The magnitude of the resulting vector.
   * @param angle - The angle in radians, measured counter-clockwise from the +x axis.
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A new Vec2 with components `(length * cos(angle), length * sin(angle))`.
   * @example
   * const v = Vec2.fromPolar(1, Math.PI / 4); // 45-degree unit vector
   */
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

  /**
   * Create a unit Vec2 pointing in the given direction (angle in radians).
   * Equivalent to `Vec2.fromPolar(1, radians)`.
   *
   * @param radians - The angle in radians, measured counter-clockwise from the +x axis.
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A unit Vec2 at the given angle.
   */
  static fromAngle(radians: number, weak: boolean = false): Vec2 {
    return Vec2.fromPolar(1, radians, weak);
  }

  /**
   * Linearly interpolate between two Vec2s. Returns `a + t * (b - a)`.
   * Disposes weak arguments after use.
   *
   * @param a - The start Vec2 (t = 0).
   * @param b - The end Vec2 (t = 1).
   * @param t - The interpolation factor (typically 0–1, but not clamped).
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A new Vec2 at the interpolated position.
   */
  static lerp(a: Vec2, b: Vec2, t: number, weak: boolean = false): Vec2 {
    if (a != null && a.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (b != null && b.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (a == null || b == null) {
      throw new Error("Error: Cannot lerp with null Vec2");
    }
    if (t !== t) {
      throw new Error("Error: Cannot lerp with NaN t");
    }
    a.zpp_inner.validate();
    b.zpp_inner.validate();
    const x = a.zpp_inner.x + t * (b.zpp_inner.x - a.zpp_inner.x);
    const y = a.zpp_inner.y + t * (b.zpp_inner.y - a.zpp_inner.y);
    const ret = Vec2._poolGet(x, y, weak);
    Vec2._disposeWeak(a);
    Vec2._disposeWeak(b);
    return ret;
  }

  /**
   * Check whether two Vec2s are component-wise equal, within an optional epsilon tolerance.
   * Disposes weak arguments after comparison.
   *
   * @param a - The first Vec2.
   * @param b - The second Vec2.
   * @param epsilon - Maximum allowed difference per component (default 0).
   * @returns `true` if both components differ by at most `epsilon`.
   */
  static eq(a: Vec2, b: Vec2, epsilon: number = 0): boolean {
    if (a != null && a.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (b != null && b.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (a == null || b == null) {
      const ret = a == null && b == null;
      if (a != null) Vec2._disposeWeak(a);
      if (b != null) Vec2._disposeWeak(b);
      return ret;
    }
    a.zpp_inner.validate();
    b.zpp_inner.validate();
    const dx = a.zpp_inner.x - b.zpp_inner.x;
    const dy = a.zpp_inner.y - b.zpp_inner.y;
    const ret = (dx < 0 ? -dx : dx) <= epsilon && (dy < 0 ? -dy : dy) <= epsilon;
    Vec2._disposeWeak(a);
    Vec2._disposeWeak(b);
    return ret;
  }

  /**
   * Squared Euclidean distance between two Vec2s. Avoids a square root when
   * only comparison is needed.
   *
   * @param a - The first Vec2.
   * @param b - The second Vec2.
   * @returns The squared distance `(a.x - b.x)² + (a.y - b.y)²`.
   */
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

  /**
   * Euclidean distance between two Vec2s.
   *
   * @param a - The first Vec2.
   * @param b - The second Vec2.
   * @returns The distance `sqrt((a.x - b.x)² + (a.y - b.y)²)`.
   */
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

  /** The x component. */
  get x(): number {
    this._checkDisposed();
    this._validate();
    return this.zpp_inner.x;
  }

  /** The x component. */
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

  /** The y component. */
  get y(): number {
    this._checkDisposed();
    this._validate();
    return this.zpp_inner.y;
  }

  /** The y component. */
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

  /** Magnitude (Euclidean length) of the vector. */
  get length(): number {
    this._checkDisposed();
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    return Math.sqrt(x * x + y * y);
  }

  /**
   * Setting length scales the vector to the given magnitude. Throws if the
   * vector is zero-length.
   *
   * @param value - The desired magnitude. Must not be NaN.
   */
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

  /**
   * Angle of the vector in radians, measured counter-clockwise from the +x
   * axis. Returns 0 for the zero vector.
   */
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

  /**
   * Setting angle preserves the vector's magnitude and rotates it to the given
   * angle.
   *
   * @param value - The desired angle in radians. Must not be NaN.
   */
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

  /**
   * Returns the squared magnitude. Faster than `length` as it avoids a square
   * root.
   *
   * @returns `x² + y²`.
   */
  lsq(): number {
    this._checkDisposed();
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    return x * x + y * y;
  }

  /**
   * Copy another Vec2's components into this vector in-place.
   *
   * @param vector - The source Vec2 to copy from.
   * @returns `this` for chaining.
   */
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

  /**
   * Set both components at once in-place.
   *
   * @param x - The new x component.
   * @param y - The new y component.
   * @returns `this` for chaining.
   */
  setxy(x: number, y: number): this {
    this._checkDisposed();
    this._checkImmutable();
    this._setXY(x, y);
    return this;
  }

  /**
   * Return a new Vec2 with the same components. Alias for `copy()`.
   *
   * @returns A new Vec2 with the same x and y values.
   */
  clone(): Vec2 {
    return this.copy();
  }

  /**
   * Check whether this Vec2 is component-wise equal to another, within an optional epsilon tolerance.
   *
   * @param other - The Vec2 to compare against.
   * @param epsilon - Maximum allowed difference per component (default 0).
   * @returns `true` if both components differ by at most `epsilon`.
   */
  equals(other: Vec2, epsilon: number = 0): boolean {
    this._checkDisposed();
    if (other != null && other.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (other == null) {
      return false;
    }
    this._validate();
    other.zpp_inner.validate();
    const dx = this.zpp_inner.x - other.zpp_inner.x;
    const dy = this.zpp_inner.y - other.zpp_inner.y;
    return (dx < 0 ? -dx : dx) <= epsilon && (dy < 0 ? -dy : dy) <= epsilon;
  }

  /**
   * Return a new Vec2 with the same components.
   *
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A copy of this vector.
   */
  copy(weak: boolean = false): Vec2 {
    this._checkDisposed();
    this._validate();
    const x = this.zpp_inner.x;
    const y = this.zpp_inner.y;
    return Vec2._poolGet(x, y, weak);
  }

  /**
   * Rotate this vector by `angle` radians in-place.
   *
   * @param angle - The rotation angle in radians.
   * @returns `this` for chaining.
   */
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

  /**
   * Reflect `vec` about this vector as a normal axis.
   *
   * @param vec - The Vec2 to reflect.
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A new Vec2 that is the reflection of `vec` about this vector.
   */
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

  /**
   * Normalise this vector to unit length in-place. Throws for zero-length
   * vectors.
   *
   * @returns `this` for chaining.
   */
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

  /**
   * Return a new unit-length vector with the same direction. Throws for
   * zero-length vectors.
   *
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A normalised copy of this vector.
   */
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

  /**
   * Return a new Vec2 equal to `this + other`.
   *
   * @param vector - The Vec2 to add.
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A new Vec2 with components `(this.x + other.x, this.y + other.y)`.
   */
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

  /**
   * Return a new Vec2 equal to `this + other × scalar`.
   *
   * @param vector - The Vec2 to scale and add.
   * @param scalar - The multiplier applied to `vector` before addition.
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A new Vec2 with components `(this.x + vector.x * scalar, this.y + vector.y * scalar)`.
   */
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

  /**
   * Return a new Vec2 equal to `this − other`.
   *
   * @param vector - The Vec2 to subtract.
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A new Vec2 with components `(this.x - other.x, this.y - other.y)`.
   */
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

  /**
   * Return a new Vec2 equal to `this × scalar`.
   *
   * @param scalar - The multiplier.
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A new Vec2 with components `(this.x * scalar, this.y * scalar)`.
   */
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

  /**
   * Add another Vec2 to this in-place (`this += other`).
   *
   * @param vector - The Vec2 to add.
   * @returns `this` for chaining.
   */
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

  /**
   * Subtract another Vec2 from this in-place (`this -= other`).
   *
   * @param vector - The Vec2 to subtract.
   * @returns `this` for chaining.
   */
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

  /**
   * Multiply this Vec2 by a scalar in-place (`this ×= scalar`).
   *
   * @param scalar - The multiplier.
   * @returns `this` for chaining.
   */
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

  /**
   * Dot product of this and another Vec2.
   *
   * @param vector - The other Vec2.
   * @returns `this.x * other.x + this.y * other.y`.
   */
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
    const ret = this.zpp_inner.x * vector.zpp_inner.x + this.zpp_inner.y * vector.zpp_inner.y;
    Vec2._disposeWeak(vector);
    return ret;
  }

  /**
   * 2D cross product (`this.x × other.y − this.y × other.x`). Returns a
   * scalar.
   *
   * @param vector - The other Vec2.
   * @returns The scalar cross product.
   */
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
    const ret = this.zpp_inner.x * vector.zpp_inner.y - this.zpp_inner.y * vector.zpp_inner.x;
    Vec2._disposeWeak(vector);
    return ret;
  }

  /**
   * Return the perpendicular vector, rotated 90° counter-clockwise.
   *
   * @param weak - If true, the returned Vec2 is auto-disposed after one use (default false).
   * @returns A new Vec2 with components `(-this.y, this.x)`.
   */
  perp(weak: boolean = false): Vec2 {
    this._checkDisposed();
    this._validate();
    const x = -this.zpp_inner.y;
    const y = this.zpp_inner.x;
    return Vec2._poolGet(x, y, weak);
  }

  /**
   * Return this Vec2 to the object pool. Throws if already disposed or
   * immutable.
   */
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

  /**
   * String representation in the form `{ x: … y: … }`.
   *
   * @returns A human-readable string of this vector's components.
   */
  toString(): string {
    this._checkDisposed();
    this._validate();
    return this.zpp_inner.toString();
  }
}

// ---------------------------------------------------------------------------
// Internal type helpers (used across wrapper modules)
// ---------------------------------------------------------------------------

/** Opaque handle for any nape internal object. */
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
const _napeVec2 = getNape();
_napeVec2.geom.Vec2 = Vec2;
