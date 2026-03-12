/**
 * ZPP_MatMN — Internal M×N matrix for the nape physics engine.
 *
 * Variable-sized matrix stored as a flat array of m*n elements.
 *
 * Converted from nape-compiled.js lines 72949–72972.
 */

export class ZPP_MatMN {
  // --- Static: Haxe metadata ---

  // --- Instance ---
  outer: object | null = null;
  m = 0;
  n = 0;
  x: number[];

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
