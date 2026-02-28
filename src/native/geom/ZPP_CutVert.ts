/**
 * ZPP_CutVert — Internal polygon cutting vertex for the nape physics engine.
 *
 * Vertex data structure with union-find support for polygon cutting operations.
 * Uses object pooling.
 *
 * Converted from nape-compiled.js lines 66636–66680.
 */

type Any = any;

export class ZPP_CutVert {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_CutVert"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_CutVert | null = null;

  // --- Instance ---
  prev: ZPP_CutVert | null = null;
  next: ZPP_CutVert | null = null;
  posx = 0.0;
  posy = 0.0;
  vert: Any = null;
  value = 0.0;
  positive = false;
  parent: ZPP_CutVert | null = null;
  rank = 0;
  used = false;

  __class__: Any = ZPP_CutVert;

  /** Factory: create from pool, linked to a polygon vertex. */
  static path(poly: Any): ZPP_CutVert {
    let ret: ZPP_CutVert;
    if (ZPP_CutVert.zpp_pool == null) {
      ret = new ZPP_CutVert();
    } else {
      ret = ZPP_CutVert.zpp_pool;
      ZPP_CutVert.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.vert = poly;
    ret.parent = ret;
    ret.rank = 0;
    ret.used = false;
    return ret;
  }

  alloc(): void {}

  free(): void {
    this.vert = null;
    this.parent = null;
  }
}
