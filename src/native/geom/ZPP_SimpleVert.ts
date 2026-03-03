/**
 * ZPP_SimpleVert — Internal vertex for simple polygon decomposition.
 *
 * Vertex node with BST-based link set for tracking adjacency in sweep-line algorithms.
 * Uses object pooling.
 *
 * Converted from nape-compiled.js lines 33750–33817.
 */

import { getNape } from "../../core/engine";

type Any = any;

export class ZPP_SimpleVert {
  static __name__ = ["zpp_nape", "geom", "ZPP_SimpleVert"];
  static zpp_pool: ZPP_SimpleVert | null = null;

  forced = false;
  x = 0.0;
  y = 0.0;
  links: Any = null;
  id = 0;
  next: ZPP_SimpleVert | null = null;
  node: Any = null;

  __class__: Any = ZPP_SimpleVert;

  constructor() {
    const zpp = getNape().__zpp;
    this.id = zpp.ZPP_ID.ZPP_SimpleVert();
    if (zpp.util.ZPP_Set_ZPP_SimpleVert.zpp_pool == null) {
      this.links = new zpp.util.ZPP_Set_ZPP_SimpleVert();
    } else {
      this.links = zpp.util.ZPP_Set_ZPP_SimpleVert.zpp_pool;
      zpp.util.ZPP_Set_ZPP_SimpleVert.zpp_pool = this.links.next;
      this.links.next = null;
    }
    this.links.lt = ZPP_SimpleVert.less_xy;
  }

  static less_xy(p: Any, q: Any): boolean {
    if (!(p.y < q.y)) {
      if (p.y == q.y) {
        return p.x < q.x;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  static swap_nodes(p: Any, q: Any): void {
    var t = p.node;
    p.node = q.node;
    q.node = t;
  }

  static get(x: number, y: number): ZPP_SimpleVert {
    let ret: ZPP_SimpleVert;
    if (ZPP_SimpleVert.zpp_pool == null) {
      ret = new ZPP_SimpleVert();
    } else {
      ret = ZPP_SimpleVert.zpp_pool;
      ZPP_SimpleVert.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.x = x;
    ret.y = y;
    return ret;
  }

  free(): void {
    this.links.clear();
    this.node = null;
    this.forced = false;
  }

  alloc(): void {}
}
