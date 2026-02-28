/**
 * ZPP_MatMN — Internal M×N matrix for the nape physics engine.
 *
 * Variable-sized matrix stored as a flat array of m*n elements.
 *
 * Converted from nape-compiled.js lines 72949–72972.
 */

type Any = any;

export class ZPP_MatMN {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_MatMN"];

  // --- Instance ---
  outer: Any = null;
  m = 0;
  n = 0;
  x: number[];

  __class__: Any = ZPP_MatMN;

  constructor(m: number, n: number) {
    this.m = m;
    this.n = n;
    this.x = [];
    let _g = 0;
    const _g1 = m * n;
    while (_g < _g1) {
      _g++;
      this.x.push(0.0);
    }
  }
}
