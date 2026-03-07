/**
 * ZPP_CutInt — Internal polygon cutting intersection for the nape physics engine.
 *
 * Stores intersection data for polygon cutting: time, paths, endpoints.
 * Uses object pooling.
 *
 * Converted from nape-compiled.js lines 66681–66738.
 */

import type { ZPP_CutVert } from "./ZPP_CutVert";

export class ZPP_CutInt {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_CutInt"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_CutInt | null = null;

  // --- Instance ---
  next: ZPP_CutInt | null = null;
  time = 0.0;
  virtualint = false;
  vertex = false;
  path0: ZPP_CutVert | null = null;
  end: ZPP_CutVert | null = null;
  start: ZPP_CutVert | null = null;
  path1: ZPP_CutVert | null = null;

  /** Factory with pooling. */
  static get(
    time: number,
    end: ZPP_CutVert | null,
    start: ZPP_CutVert | null,
    path0: ZPP_CutVert | null,
    path1: ZPP_CutVert | null,
    virtualint = false,
    vertex = false,
  ): ZPP_CutInt {
    let ret: ZPP_CutInt;
    if (ZPP_CutInt.zpp_pool == null) {
      ret = new ZPP_CutInt();
    } else {
      ret = ZPP_CutInt.zpp_pool;
      ZPP_CutInt.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.virtualint = virtualint;
    ret.end = end;
    ret.start = start;
    ret.path0 = path0;
    ret.path1 = path1;
    ret.time = time;
    ret.vertex = vertex;
    return ret;
  }

  alloc(): void {}

  free(): void {
    this.end = this.start = null;
    this.path0 = this.path1 = null;
  }
}
