/**
 * ZPP_SimplifyV — Internal simplification vertex for polygon simplification.
 *
 * Circular doubly-linked list node used by ZPP_Simplify (Ramer-Douglas-Peucker).
 * Uses object pooling.
 *
 * Converted from nape-compiled.js lines 35611–35643.
 */

export class ZPP_SimplifyV {
  static __name__ = ["zpp_nape", "geom", "ZPP_SimplifyV"];
  static zpp_pool: ZPP_SimplifyV | null = null;

  x = 0.0;
  y = 0.0;
  next: ZPP_SimplifyV | null = null;
  prev: ZPP_SimplifyV | null = null;
  flag = false;
  forced = false;

  static get(v: { x: number; y: number }): ZPP_SimplifyV {
    let ret: ZPP_SimplifyV;
    if (ZPP_SimplifyV.zpp_pool == null) {
      ret = new ZPP_SimplifyV();
    } else {
      ret = ZPP_SimplifyV.zpp_pool;
      ZPP_SimplifyV.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.x = v.x;
    ret.y = v.y;
    ret.flag = false;
    return ret;
  }

  free(): void {}
  alloc(): void {}
}
