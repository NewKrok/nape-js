/**
 * ZPP_SimplifyP — Internal simplification pair for polygon simplification.
 *
 * Stores a min/max vertex range for the Ramer-Douglas-Peucker stack.
 * Uses object pooling.
 *
 * Converted from nape-compiled.js lines 35644–35671.
 */

import { ZPP_SimplifyV } from "./ZPP_SimplifyV";

type Any = any;

export class ZPP_SimplifyP {
  static __name__ = ["zpp_nape", "geom", "ZPP_SimplifyP"];
  static zpp_pool: ZPP_SimplifyP | null = null;

  next: ZPP_SimplifyP | null = null;
  min: ZPP_SimplifyV | null = null;
  max: ZPP_SimplifyV | null = null;

  __class__: Any = ZPP_SimplifyP;

  static get(min: ZPP_SimplifyV, max: ZPP_SimplifyV): ZPP_SimplifyP {
    let ret: ZPP_SimplifyP;
    if (ZPP_SimplifyP.zpp_pool == null) {
      ret = new ZPP_SimplifyP();
    } else {
      ret = ZPP_SimplifyP.zpp_pool;
      ZPP_SimplifyP.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.min = min;
    ret.max = max;
    return ret;
  }

  free(): void {
    this.min = null;
    this.max = null;
  }

  alloc(): void {}
}
