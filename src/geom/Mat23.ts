import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_Mat23 } from "../native/geom/ZPP_Mat23";
import { Vec2 } from "./Vec2";
import type { NapeInner } from "./Vec2";

/**
 * 2x3 affine transformation matrix [a b tx; c d ty].
 *
 * Converted from nape-compiled.js lines 20507–21760.
 */
export class Mat23 {
  /** @internal */
  zpp_inner: ZPP_Mat23;

  /** @internal */
  get _inner(): NapeInner {
    return this;
  }

  /**
   * Create a Mat23 with the given components. Defaults to the identity matrix `[1 0 0; 0 1 0]`.
   * @param a - Component at row 0, col 0.
   * @param b - Component at row 0, col 1.
   * @param c - Component at row 1, col 0.
   * @param d - Component at row 1, col 1.
   * @param tx - Translation component along x.
   * @param ty - Translation component along y.
   */
  constructor(
    a: number = 1.0,
    b: number = 0.0,
    c: number = 0.0,
    d: number = 1.0,
    tx: number = 0.0,
    ty: number = 0.0,
  ) {
    const zpp = ZPP_Mat23.get();
    this.zpp_inner = zpp;
    zpp.outer = this;

    const names = ["a", "b", "tx", "c", "d", "ty"] as const;
    const vals = [a, b, tx, c, d, ty];
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] !== vals[i]) {
        throw new Error("Error: Mat23::" + names[i] + " cannot be NaN");
      }
    }
    zpp.setas(a, b, c, d, tx, ty);
  }

  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  /**
   * Create a pure rotation matrix for the given angle in radians.
   * @param angle - Rotation angle in radians.
   * @returns A new Mat23 representing the rotation.
   */
  static rotation(angle: number): Mat23 {
    if (angle !== angle) {
      throw new Error("Error: Cannot create rotation matrix with NaN angle");
    }
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Mat23(cos, -sin, sin, cos, 0, 0);
  }

  /**
   * Create a pure translation matrix.
   * @param tx - Translation along x.
   * @param ty - Translation along y.
   * @returns A new Mat23 representing the translation.
   */
  static translation(tx: number, ty: number): Mat23 {
    return new Mat23(1, 0, 0, 1, tx, ty);
  }

  /**
   * Create a pure scale matrix.
   * @param sx - Scale factor along x.
   * @param sy - Scale factor along y.
   * @returns A new Mat23 representing the scale.
   */
  static scale(sx: number, sy: number): Mat23 {
    return new Mat23(sx, 0, 0, sy, 0, 0);
  }

  static _wrap(inner: any): Mat23 {
    if (inner instanceof Mat23) return inner;
    if (!inner) return null as unknown as Mat23;
    if (inner instanceof ZPP_Mat23) {
      return getOrCreate(inner, (zpp: ZPP_Mat23) => {
        const m = Object.create(Mat23.prototype) as Mat23;
        m.zpp_inner = zpp;
        zpp.outer = m;
        return m;
      });
    }
    if (inner.zpp_inner) return Mat23._wrap(inner.zpp_inner);
    return null as unknown as Mat23;
  }

  // ---------------------------------------------------------------------------
  // Properties — get/set with NaN check + invalidation
  // ---------------------------------------------------------------------------

  private _setProp(name: string, value: number): void {
    if (value !== value) {
      throw new Error("Error: Mat23::" + name + " cannot be NaN");
    }
    (this.zpp_inner as any)[name] = value;
    this.zpp_inner.invalidate();
  }

  /** Matrix component at row 0, col 0. The matrix layout is `[a b tx; c d ty]`. */
  get a(): number {
    return this.zpp_inner.a;
  }
  /** Matrix component at row 0, col 0. The matrix layout is `[a b tx; c d ty]`. */
  set a(v: number) {
    this._setProp("a", v);
  }

  /** Matrix component at row 0, col 1. The matrix layout is `[a b tx; c d ty]`. */
  get b(): number {
    return this.zpp_inner.b;
  }
  /** Matrix component at row 0, col 1. The matrix layout is `[a b tx; c d ty]`. */
  set b(v: number) {
    this._setProp("b", v);
  }

  /** Matrix component at row 1, col 0. The matrix layout is `[a b tx; c d ty]`. */
  get c(): number {
    return this.zpp_inner.c;
  }
  /** Matrix component at row 1, col 0. The matrix layout is `[a b tx; c d ty]`. */
  set c(v: number) {
    this._setProp("c", v);
  }

  /** Matrix component at row 1, col 1. The matrix layout is `[a b tx; c d ty]`. */
  get d(): number {
    return this.zpp_inner.d;
  }
  /** Matrix component at row 1, col 1. The matrix layout is `[a b tx; c d ty]`. */
  set d(v: number) {
    this._setProp("d", v);
  }

  /** Translation component along x. The matrix layout is `[a b tx; c d ty]`. */
  get tx(): number {
    return this.zpp_inner.tx;
  }
  /** Translation component along x. The matrix layout is `[a b tx; c d ty]`. */
  set tx(v: number) {
    this._setProp("tx", v);
  }

  /** Translation component along y. The matrix layout is `[a b tx; c d ty]`. */
  get ty(): number {
    return this.zpp_inner.ty;
  }
  /** Translation component along y. The matrix layout is `[a b tx; c d ty]`. */
  set ty(v: number) {
    this._setProp("ty", v);
  }

  /** The determinant of the linear 2×2 part (ad − bc). */
  get determinant(): number {
    return this.zpp_inner.a * this.zpp_inner.d - this.zpp_inner.b * this.zpp_inner.c;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /**
   * Return a new Mat23 with the same components. Alias for `copy()`.
   * @returns A new Mat23 with the same components.
   */
  clone(): Mat23 {
    return this.copy();
  }

  /**
   * Check whether this Mat23 is component-wise equal to another, within an optional epsilon tolerance.
   *
   * @param other - The Mat23 to compare against.
   * @param epsilon - Maximum allowed difference per component (default 0).
   * @returns `true` if all six components differ by at most `epsilon`.
   */
  equals(other: Mat23, epsilon: number = 0): boolean {
    if (other == null) {
      return false;
    }
    const t = this.zpp_inner;
    const o = other.zpp_inner;
    const da = t.a - o.a;
    const db = t.b - o.b;
    const dc = t.c - o.c;
    const dd = t.d - o.d;
    const dtx = t.tx - o.tx;
    const dty = t.ty - o.ty;
    return (
      (da < 0 ? -da : da) <= epsilon &&
      (db < 0 ? -db : db) <= epsilon &&
      (dc < 0 ? -dc : dc) <= epsilon &&
      (dd < 0 ? -dd : dd) <= epsilon &&
      (dtx < 0 ? -dtx : dtx) <= epsilon &&
      (dty < 0 ? -dty : dty) <= epsilon
    );
  }

  /**
   * Return a new Mat23 with the same components.
   * @returns A deep copy of this matrix.
   */
  copy(): Mat23 {
    return new Mat23(
      this.zpp_inner.a,
      this.zpp_inner.b,
      this.zpp_inner.c,
      this.zpp_inner.d,
      this.zpp_inner.tx,
      this.zpp_inner.ty,
    );
  }

  /**
   * Copy all components from another Mat23 into this one in-place.
   * @param matrix - The source matrix to copy from.
   * @returns `this` for chaining.
   */
  set(matrix: Mat23): this {
    if (matrix == null) {
      throw new Error("Error: Cannot set form null matrix");
    }
    const m = matrix.zpp_inner;
    this.zpp_inner.setas(m.a, m.b, m.c, m.d, m.tx, m.ty);
    this.zpp_inner.invalidate();
    return this;
  }

  /**
   * Set all six components at once in-place.
   * @param a - Component at row 0, col 0.
   * @param b - Component at row 0, col 1.
   * @param c - Component at row 1, col 0.
   * @param d - Component at row 1, col 1.
   * @param tx - Translation along x.
   * @param ty - Translation along y.
   * @returns `this` for chaining.
   */
  setAs(
    a: number = 1.0,
    b: number = 0.0,
    c: number = 0.0,
    d: number = 1.0,
    tx: number = 0.0,
    ty: number = 0.0,
  ): this {
    this.zpp_inner.setas(a, b, c, d, tx, ty);
    this.zpp_inner.invalidate();
    return this;
  }

  /**
   * Reset to the identity matrix in-place.
   * @returns `this` for chaining.
   */
  reset(): this {
    return this.setAs();
  }

  /**
   * Return `true` if the matrix is singular (non-invertible) within the engine's epsilon threshold.
   * @returns `true` when the matrix cannot be safely inverted.
   */
  singular(): boolean {
    const { a, b, c, d } = this.zpp_inner;
    const norm = a * a + b * b + c * c + d * d;
    let limit = a * d - b * c;
    if (limit < 0) limit = -limit;
    const nape = getNape();
    return norm > nape.Config.illConditionedThreshold * limit;
  }

  /**
   * Return the inverse of this matrix.
   * @returns A new Mat23 that is the inverse of this one.
   * @throws If the matrix is singular.
   */
  inverse(): Mat23 {
    if (this.singular()) {
      throw new Error("Error: Matrix is singular and cannot be inverted");
    }
    const { a, b, c, d, tx, ty } = this.zpp_inner;
    const idet = 1.0 / (a * d - b * c);
    return new Mat23(
      d * idet,
      -b * idet,
      -c * idet,
      a * idet,
      (b * ty - d * tx) * idet,
      (c * tx - a * ty) * idet,
    );
  }

  /**
   * Return the transpose of this matrix.
   * @returns A new Mat23 that is the transpose of this one.
   */
  transpose(): Mat23 {
    const { a, b, c, d, tx, ty } = this.zpp_inner;
    return new Mat23(a, c, b, d, -a * tx - c * ty, -b * tx - d * ty);
  }

  /**
   * Return `matrix × this` (apply this matrix first, then `matrix`).
   * @param matrix - The matrix to concatenate on the left.
   * @returns A new Mat23 representing the combined transformation.
   */
  concat(matrix: Mat23): Mat23 {
    if (matrix == null) {
      throw new Error("Error: Cannot concatenate with null Mat23");
    }
    const m = matrix.zpp_inner;
    const t = this.zpp_inner;
    return new Mat23(
      m.a * t.a + m.b * t.c,
      m.a * t.b + m.b * t.d,
      m.c * t.a + m.d * t.c,
      m.c * t.b + m.d * t.d,
      m.a * t.tx + m.b * t.ty + m.tx,
      m.c * t.tx + m.d * t.ty + m.ty,
    );
  }

  /**
   * Transform a Vec2 by this matrix. If `noTranslation` is true, only the linear 2×2 part is applied.
   * @param point - The Vec2 to transform.
   * @param noTranslation - When true, the translation components (tx, ty) are ignored.
   * @param weak - If true, the returned Vec2 is a weak (pooled) reference.
   * @returns A new Vec2 with the transformed coordinates.
   */
  transform(point: Vec2, noTranslation: boolean = false, weak: boolean = false): Vec2 {
    if (point != null && point.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (point == null) {
      throw new Error("Error: Cannot transform null Vec2");
    }
    point.zpp_inner.validate();
    const px = point.zpp_inner.x;
    const py = point.zpp_inner.y;
    const { a, b, c, d, tx: mtx, ty: mty } = this.zpp_inner;

    let rx: number, ry: number;
    if (noTranslation) {
      rx = px * a + py * b;
      ry = px * c + py * d;
    } else {
      rx = px * a + py * b + mtx;
      ry = px * c + py * d + mty;
    }

    const ret = Vec2.get(rx, ry, weak);

    if (point.zpp_inner.weak) {
      point.dispose();
    }
    return ret;
  }

  /**
   * Apply the inverse transformation to a Vec2. Throws if the matrix is singular.
   * @param point - The Vec2 to transform.
   * @param noTranslation - When true, the translation components (tx, ty) are ignored.
   * @param weak - If true, the returned Vec2 is a weak (pooled) reference.
   * @returns A new Vec2 with the inverse-transformed coordinates.
   */
  inverseTransform(point: Vec2, noTranslation: boolean = false, weak: boolean = false): Vec2 {
    if (point != null && point.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (point == null) {
      throw new Error("Error: Cannot transform null Vec2");
    }
    if (this.singular()) {
      throw new Error("Error: Matrix is singular and inverse transformation cannot be performed");
    }
    const { a, b, c, d, tx: mtx, ty: mty } = this.zpp_inner;
    const idet = 1.0 / (a * d - b * c);

    point.zpp_inner.validate();
    const px = point.zpp_inner.x;
    const py = point.zpp_inner.y;

    let rx: number, ry: number;
    if (noTranslation) {
      rx = (px * d - py * b) * idet;
      ry = (py * a - px * c) * idet;
    } else {
      const dx = px - mtx;
      const dy = py - mty;
      rx = (dx * d - dy * b) * idet;
      ry = (dy * a - dx * c) * idet;
    }

    const ret = Vec2.get(rx, ry, weak);

    if (point.zpp_inner.weak) {
      point.dispose();
    }
    return ret;
  }

  /**
   * Return `true` if the matrix is equiorthogonal (uniform scale, no shear).
   * @returns `true` when the matrix has equal scale on both axes and no shear.
   */
  equiorthogonal(): boolean {
    if (this.singular()) return false;
    const { a, b, c, d } = this.zpp_inner;
    const nape = getNape();
    const dot = a * b + c * d;
    if (dot * dot >= nape.Config.epsilon) return false;
    const diff = a * a + b * b - c * c - d * d;
    return diff * diff < nape.Config.epsilon;
  }

  /**
   * Return `true` if the matrix is orthogonal (unit-scale rotation, no shear).
   * @returns `true` when the column vectors are orthonormal.
   */
  orthogonal(): boolean {
    const { a, b, c, d } = this.zpp_inner;
    const nape = getNape();
    const dot = a * b + c * d;
    if (dot * dot >= nape.Config.epsilon) return false;
    const r1 = a * a + b * b - 1;
    const r2 = c * c + d * d - 1;
    return r1 * r1 < nape.Config.epsilon && r2 * r2 < nape.Config.epsilon;
  }

  private _orthogonaliseImpl(equi: boolean): this {
    const { a, b, c, d } = this.zpp_inner;
    const nape = getNape();

    let k1 = Math.sqrt(a * a + c * c);
    let k2 = Math.sqrt(b * b + d * d);
    if (k1 * k1 < nape.Config.epsilon || k2 * k2 < nape.Config.epsilon) {
      throw new Error(
        "Error: Matrix is singular and cannot be " +
          (equi ? "equiorthogonal" : "orthogonal") +
          "ised",
      );
    }

    const k = equi ? (k1 + k2) / 2 : 1;
    k1 = k / k1;
    k2 = k / k2;

    this.a = this.zpp_inner.a * k1;
    this.c = this.zpp_inner.c * k1;
    this.b = this.zpp_inner.b * k2;
    this.d = this.zpp_inner.d * k2;

    const dot = this.zpp_inner.a * this.zpp_inner.b + this.zpp_inner.c * this.zpp_inner.d;
    let ang = 0.25 * Math.PI - 0.5 * Math.acos(dot / (k * k));
    if (this.zpp_inner.a * this.zpp_inner.d - this.zpp_inner.b * this.zpp_inner.c > 0) {
      ang = -ang;
    }

    const sin = Math.sin(ang);
    const cos = Math.cos(ang);
    const a2 = this.zpp_inner.a * cos - this.zpp_inner.c * sin;
    const b2 = this.zpp_inner.b * cos + this.zpp_inner.d * sin;
    const c1 = this.zpp_inner.c * cos + this.zpp_inner.a * sin;
    const d1 = this.zpp_inner.d * cos - this.zpp_inner.b * sin;

    this.c = c1;
    this.a = a2;
    this.d = d1;
    this.b = b2;
    this.zpp_inner.invalidate();
    return this;
  }

  /**
   * Adjust the matrix in-place to be equiorthogonal (uniform scale, no shear).
   * @returns `this` for chaining.
   */
  equiorthogonalise(): this {
    if (!this.equiorthogonal()) {
      return this._orthogonaliseImpl(true);
    }
    return this;
  }

  /**
   * Adjust the matrix in-place to be orthogonal (normalise column vectors).
   * @returns `this` for chaining.
   */
  orthogonalise(): this {
    if (!this.orthogonal()) {
      return this._orthogonaliseImpl(false);
    }
    return this;
  }

  /**
   * String representation `{ a: … b: … c: … d: … tx: … ty: … }`.
   * @returns A human-readable string of the matrix components.
   */
  toString(): string {
    const { a, b, c, d, tx, ty } = this.zpp_inner;
    return "{ a: " + a + " b: " + b + " c: " + c + " d: " + d + " tx: " + tx + " ty: " + ty + " }";
  }
}

// Register wrapper factory
ZPP_Mat23._wrapFn = (zpp: ZPP_Mat23): Mat23 => {
  return getOrCreate(zpp, (raw: ZPP_Mat23) => {
    const m = Object.create(Mat23.prototype) as Mat23;
    m.zpp_inner = raw;
    raw.outer = m;
    return m;
  });
};
