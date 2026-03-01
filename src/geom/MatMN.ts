import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_MatMN } from "../native/geom/ZPP_MatMN";
import type { NapeInner } from "./Vec2";

type Any = any;

/**
 * Variable-sized M×N matrix.
 *
 * Converted from nape-compiled.js lines 17261–17395.
 */
export class MatMN {
  static __name__ = ["nape", "geom", "MatMN"];

  zpp_inner: ZPP_MatMN;

  get _inner(): NapeInner {
    return this;
  }

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

  static _wrap(inner: Any): MatMN {
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
    if (inner.zpp_inner) return MatMN._wrap(inner.zpp_inner);
    return null as unknown as MatMN;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get rows(): number {
    return this.zpp_inner.m;
  }

  get cols(): number {
    return this.zpp_inner.n;
  }

  // ---------------------------------------------------------------------------
  // Element access
  // ---------------------------------------------------------------------------

  x(row: number, col: number): number {
    if (row < 0 || col < 0 || row >= this.zpp_inner.m || col >= this.zpp_inner.n) {
      throw new Error("Error: MatMN indices out of range");
    }
    return this.zpp_inner.x[row * this.zpp_inner.n + col];
  }

  setx(row: number, col: number, value: number): number {
    if (row < 0 || col < 0 || row >= this.zpp_inner.m || col >= this.zpp_inner.n) {
      throw new Error("Error: MatMN indices out of range");
    }
    return (this.zpp_inner.x[row * this.zpp_inner.n + col] = value);
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

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

  transpose(): MatMN {
    const ret = new MatMN(this.zpp_inner.n, this.zpp_inner.m);
    for (let i = 0; i < this.zpp_inner.m; i++) {
      for (let j = 0; j < this.zpp_inner.n; j++) {
        ret.zpp_inner.x[j * ret.zpp_inner.n + i] = this.zpp_inner.x[i * this.zpp_inner.n + j];
      }
    }
    return ret;
  }

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
(MatMN.prototype as Any).__class__ = MatMN;
