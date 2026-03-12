import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_MatMN } from "../native/geom/ZPP_MatMN";
import type { NapeInner } from "./Vec2";

/**
 * Variable-sized M×N matrix.
 *
 * Converted from nape-compiled.js lines 17261–17395.
 */
export class MatMN {
  /** @internal */
  zpp_inner: ZPP_MatMN;

  /** @internal */
  get _inner(): NapeInner {
    return this;
  }

  /**
   * Create a zero-filled M×N matrix. Both dimensions must be ≥ 1.
   * @param rows - Number of rows (must be ≥ 1).
   * @param cols - Number of columns (must be ≥ 1).
   */
  constructor(rows: number, cols: number) {
    if (rows <= 0 || cols <= 0) {
      throw new Error("Error: MatMN::dimensions cannot be < 1");
    }
    this.zpp_inner = new ZPP_MatMN(rows, cols);
    this.zpp_inner.outer = this;
  }

  // ---------------------------------------------------------------------------
  // Static wrap helper
  // ---------------------------------------------------------------------------

  /** @internal */
  static _wrap(inner: ZPP_MatMN | MatMN | null): MatMN {
    if (inner instanceof MatMN) return inner;
    if (!inner) return null as unknown as MatMN;
    if (inner instanceof ZPP_MatMN) {
      return getOrCreate(inner, (zpp: ZPP_MatMN) => {
        const m = Object.create(MatMN.prototype) as MatMN;
        m.zpp_inner = zpp;
        zpp.outer = m;
        return m;
      });
    }
    if ((inner as any).zpp_inner) return MatMN._wrap((inner as any).zpp_inner);
    return null as unknown as MatMN;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /** Number of rows. */
  get rows(): number {
    return this.zpp_inner.m;
  }

  /** Number of columns. */
  get cols(): number {
    return this.zpp_inner.n;
  }

  // ---------------------------------------------------------------------------
  // Element access
  // ---------------------------------------------------------------------------

  /**
   * Read the element at (row, col). Zero-based indices.
   * @param row - Zero-based row index.
   * @param col - Zero-based column index.
   * @returns The element value at the given position.
   */
  x(row: number, col: number): number {
    if (row < 0 || col < 0 || row >= this.zpp_inner.m || col >= this.zpp_inner.n) {
      throw new Error("Error: MatMN indices out of range");
    }
    return this.zpp_inner.x[row * this.zpp_inner.n + col];
  }

  /**
   * Write `value` to the element at (row, col). Returns the written value.
   * @param row - Zero-based row index.
   * @param col - Zero-based column index.
   * @param value - The value to write.
   * @returns The written value.
   */
  setx(row: number, col: number, value: number): number {
    if (row < 0 || col < 0 || row >= this.zpp_inner.m || col >= this.zpp_inner.n) {
      throw new Error("Error: MatMN indices out of range");
    }
    return (this.zpp_inner.x[row * this.zpp_inner.n + col] = value);
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /**
   * Check whether this MatMN is element-wise equal to another, within an optional epsilon tolerance.
   * Matrices must have the same dimensions.
   *
   * @param other - The MatMN to compare against.
   * @param epsilon - Maximum allowed difference per element (default 0).
   * @returns `true` if dimensions match and all elements differ by at most `epsilon`.
   */
  equals(other: MatMN, epsilon: number = 0): boolean {
    if (other == null) {
      return false;
    }
    if (this.zpp_inner.m !== other.zpp_inner.m || this.zpp_inner.n !== other.zpp_inner.n) {
      return false;
    }
    for (let i = 0; i < this.zpp_inner.x.length; i++) {
      const d = this.zpp_inner.x[i] - other.zpp_inner.x[i];
      if ((d < 0 ? -d : d) > epsilon) {
        return false;
      }
    }
    return true;
  }

  /**
   * Return a new MatMN with the same dimensions and element values.
   * @returns A deep copy of this matrix.
   */
  clone(): MatMN {
    const ret = new MatMN(this.zpp_inner.m, this.zpp_inner.n);
    for (let i = 0; i < this.zpp_inner.x.length; i++) {
      ret.zpp_inner.x[i] = this.zpp_inner.x[i];
    }
    return ret;
  }

  /**
   * String representation with rows separated by semicolons.
   * @returns A human-readable string of the matrix elements.
   */
  toString(): string {
    let ret = "{ ";
    let fst = true;
    for (let i = 0; i < this.zpp_inner.m; i++) {
      if (!fst) {
        ret += "; ";
      }
      fst = false;
      for (let j = 0; j < this.zpp_inner.n; j++) {
        if (i < 0 || j < 0 || i >= this.zpp_inner.m || j >= this.zpp_inner.n) {
          throw new Error("Error: MatMN indices out of range");
        }
        ret += this.zpp_inner.x[i * this.zpp_inner.n + j] + " ";
      }
    }
    ret += "}";
    return ret;
  }

  /**
   * Return a new transposed matrix (N×M).
   * @returns A new MatMN that is the transpose of this one.
   */
  transpose(): MatMN {
    const ret = new MatMN(this.zpp_inner.n, this.zpp_inner.m);
    for (let i = 0; i < this.zpp_inner.m; i++) {
      for (let j = 0; j < this.zpp_inner.n; j++) {
        ret.zpp_inner.x[j * ret.zpp_inner.n + i] = this.zpp_inner.x[i * this.zpp_inner.n + j];
      }
    }
    return ret;
  }

  /**
   * Return the matrix product `this × matrix`. Column count of this must equal row count of `matrix`.
   * @param matrix - The right-hand matrix to multiply by.
   * @returns A new MatMN representing the product.
   */
  mul(matrix: MatMN): MatMN {
    const y = matrix;
    if (this.zpp_inner.n !== y.zpp_inner.m) {
      throw new Error("Error: Matrix dimensions aren't compatible");
    }
    const ret = new MatMN(this.zpp_inner.m, y.zpp_inner.n);
    for (let i = 0; i < this.zpp_inner.m; i++) {
      for (let j = 0; j < y.zpp_inner.n; j++) {
        let v = 0.0;
        for (let k = 0; k < this.zpp_inner.n; k++) {
          v += this.zpp_inner.x[i * this.zpp_inner.n + k] * y.zpp_inner.x[k * y.zpp_inner.n + j];
        }
        ret.zpp_inner.x[i * ret.zpp_inner.n + j] = v;
      }
    }
    return ret;
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace (replaces compiled MatMN)
// ---------------------------------------------------------------------------
const nape = getNape();
nape.geom.MatMN = MatMN;
