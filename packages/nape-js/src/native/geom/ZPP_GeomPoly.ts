/**
 * ZPP_GeomPoly — Internal polygon geometry holder for the nape physics engine.
 *
 * Simple data container linking a public GeomPoly wrapper to its vertex list.
 */

export class ZPP_GeomPoly {
  // --- Instance ---
  outer: object | null = null;
  vertices: any = null;

  constructor(outer: object | null = null) {
    this.outer = outer;
  }
}
