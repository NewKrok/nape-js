/**
 * ZPP_GeomPoly — Internal polygon geometry holder for the nape physics engine.
 *
 * Simple data container linking a public GeomPoly wrapper to its vertex list.
 *
 * Converted from nape-compiled.js lines 69554–69563.
 */

export class ZPP_GeomPoly {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_GeomPoly"];

  // --- Instance ---
  outer: object | null = null;
  vertices: any = null;


  constructor(outer: object | null = null) {
    this.outer = outer;
  }
}
