/**
 * ZPP_MarchPair — Internal marching squares pair data for the nape physics engine.
 *
 * Stores pairs of points and spans for the marching squares algorithm.
 *
 * Converted from nape-compiled.js lines 69082–69119.
 */

export class ZPP_MarchPair {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_MarchPair"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_MarchPair | null = null;

  // --- Instance ---
  p1: any = null;
  key1 = 0;
  okey1 = 0;
  p2: any = null;
  key2 = 0;
  okey2 = 0;
  pr: any = null;
  keyr = 0;
  okeyr = 0;
  pd: any = null;
  span1: any = null;
  span2: any = null;
  spanr: any = null;
  next: ZPP_MarchPair | null = null;


  free(): void {
    this.p1 = this.p2 = this.pr = this.pd = null;
    this.span1 = this.span2 = this.spanr = null;
  }

  alloc(): void {}
}
