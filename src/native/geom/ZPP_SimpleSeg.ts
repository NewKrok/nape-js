/**
 * ZPP_SimpleSeg — Internal segment for simple polygon decomposition.
 *
 * Segment with left/right endpoints and BST-based vertex set.
 * Uses object pooling.
 *
 * Converted from nape-compiled.js lines 33818–33878.
 */

import { ZPP_Set_ZPP_SimpleVert } from "../util/ZNPRegistry";
import { ZPP_Set } from "../util/ZPP_Set";
import { ZPP_ID } from "../util/ZPP_ID";
import type { ZPP_SimpleVert } from "./ZPP_SimpleVert";

export class ZPP_SimpleSeg {
  static __name__ = ["zpp_nape", "geom", "ZPP_SimpleSeg"];
  static zpp_pool: ZPP_SimpleSeg | null = null;

  left: ZPP_SimpleVert | null = null;
  right: ZPP_SimpleVert | null = null;
  vertices: ZPP_Set<ZPP_SimpleVert> | null = null;
  id = 0;
  next: ZPP_SimpleSeg | null = null;
  prev: ZPP_SimpleSeg | null = null;
  node: ZPP_Set<ZPP_SimpleSeg> | null = null;

  constructor() {
    this.id = ZPP_ID.ZPP_SimpleSeg();
    if (ZPP_Set_ZPP_SimpleVert.zpp_pool == null) {
      this.vertices = new ZPP_Set_ZPP_SimpleVert();
    } else {
      this.vertices = ZPP_Set_ZPP_SimpleVert.zpp_pool as ZPP_Set<ZPP_SimpleVert>;
      ZPP_Set_ZPP_SimpleVert.zpp_pool = this.vertices.next as ZPP_Set<unknown>;
      this.vertices.next = null;
    }
    this.vertices.lt = (a: ZPP_SimpleVert, b: ZPP_SimpleVert) => this.less_xy(a, b);
  }

  static get(left: ZPP_SimpleVert, right: ZPP_SimpleVert): ZPP_SimpleSeg {
    let ret: ZPP_SimpleSeg;
    if (ZPP_SimpleSeg.zpp_pool == null) {
      ret = new ZPP_SimpleSeg();
    } else {
      ret = ZPP_SimpleSeg.zpp_pool;
      ZPP_SimpleSeg.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.left = left;
    ret.right = right;
    ret.vertices!.insert(left);
    ret.vertices!.insert(right);
    return ret;
  }

  free(): void {
    this.left = this.right = null;
    this.prev = null;
    this.node = null;
    this.vertices!.clear();
  }

  alloc(): void {}

  /** Instance comparator: sort vertices by x then y. */
  less_xy(a: ZPP_SimpleVert, b: ZPP_SimpleVert): boolean {
    if (!(a.x < b.x)) {
      if (a.x == b.x) {
        return a.y < b.y;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }
}
