/**
 * ZPP_GeomVertexIterator — Internal backing for the public GeomVertexIterator.
 *
 * Manages pooling and traversal state for circular doubly-linked vertex rings
 * used by GeomPoly.
 *
 * Converted from nape-compiled.js lines 20886–20932.
 */

import { getNape } from "../../core/engine";

type Any = any;

export class ZPP_GeomVertexIterator {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_GeomVertexIterator"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_GeomVertexIterator | null = null;

  // --- Static: internal flag for constructor guard ---
  static internal = false;

  // --- Instance fields ---
  ptr: Any = null;
  start: Any = null;
  first = false;
  forward = false;
  outer: Any = null;
  next: ZPP_GeomVertexIterator | null = null;

  __class__: Any = ZPP_GeomVertexIterator;

  constructor() {
    ZPP_GeomVertexIterator.internal = true;
    const nape = getNape();
    this.outer = new nape.geom.GeomVertexIterator();
    ZPP_GeomVertexIterator.internal = false;
  }

  /**
   * Get a pooled iterator starting at the given vertex, traversing forward or backward.
   * Returns the public GeomVertexIterator wrapper.
   */
  static get(poly: Any, forward: boolean): Any {
    let ret: ZPP_GeomVertexIterator;
    if (ZPP_GeomVertexIterator.zpp_pool == null) {
      ret = new ZPP_GeomVertexIterator();
    } else {
      ret = ZPP_GeomVertexIterator.zpp_pool;
      ZPP_GeomVertexIterator.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.outer.zpp_inner = ret;
    ret.ptr = poly;
    ret.forward = forward;
    ret.start = poly;
    ret.first = poly != null;
    return ret.outer;
  }

  free(): void {
    this.outer.zpp_inner = null;
    this.ptr = this.start = null;
  }

  alloc(): void {}
}

// --- Register in compiled namespace ---
const nape = getNape();
nape.__zpp.geom.ZPP_GeomVertexIterator = ZPP_GeomVertexIterator;
