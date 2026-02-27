/**
 * ZPP_Mat23 — Internal 2×3 transformation matrix for the nape physics engine.
 *
 * Represents affine transforms with components [a, b, c, d, tx, ty].
 * Supports object pooling and lazy wrapper creation.
 *
 * Converted from nape-compiled.js lines 73495–73561, 133826.
 */

type Any = any;

export class ZPP_Mat23 {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_Mat23"];

  // --- Static: namespace references ---
  static _nape: Any = null;

  // --- Static: object pool ---
  static zpp_pool: ZPP_Mat23 | null = null;

  // --- Instance ---
  outer: Any = null;
  a = 0.0;
  b = 0.0;
  c = 0.0;
  d = 0.0;
  tx = 0.0;
  ty = 0.0;
  _invalidate: (() => void) | null = null;
  next: ZPP_Mat23 | null = null;

  __class__: Any = ZPP_Mat23;

  /** Static factory with pooling. */
  static get(): ZPP_Mat23 {
    let ret: ZPP_Mat23;
    if (ZPP_Mat23.zpp_pool == null) {
      ret = new ZPP_Mat23();
    } else {
      ret = ZPP_Mat23.zpp_pool;
      ZPP_Mat23.zpp_pool = ret.next;
      ret.next = null;
    }
    return ret;
  }

  /** Create an identity matrix from pool. */
  static identity(): ZPP_Mat23 {
    const ret = ZPP_Mat23.get();
    ret.setas(1, 0, 0, 1, 0, 0);
    return ret;
  }

  /** Create a public wrapper, recycling any existing inner. */
  wrapper(): Any {
    if (this.outer == null) {
      this.outer = new ZPP_Mat23._nape.geom.Mat23();
      const o = this.outer.zpp_inner;
      o.next = ZPP_Mat23.zpp_pool;
      ZPP_Mat23.zpp_pool = o;
      this.outer.zpp_inner = this;
    }
    return this.outer;
  }

  invalidate(): void {
    if (this._invalidate != null) {
      this._invalidate();
    }
  }

  set(m: ZPP_Mat23): void {
    this.setas(m.a, m.b, m.c, m.d, m.tx, m.ty);
  }

  setas(a: number, b: number, c: number, d: number, tx: number, ty: number): void {
    this.tx = tx;
    this.ty = ty;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
  }

  free(): void {}
  alloc(): void {}
}
