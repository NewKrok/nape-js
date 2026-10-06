/**
 * ZPP_CutVert — Internal polygon cutting vertex for the nape physics engine.
 *
 * Vertex data structure with union-find support for polygon cutting operations.
 * Uses object pooling.
 */

export class ZPP_CutVert {
  // --- Static: object pool ---
  static zpp_pool: ZPP_CutVert | null = null;

  // --- Instance ---
  prev: ZPP_CutVert | null = null;
  next: ZPP_CutVert | null = null;
  posx = 0.0;
  posy = 0.0;
  vert: object | null = null;
  value = 0.0;
  positive = false;
  parent: ZPP_CutVert | null = null;
  rank = 0;
  used = false;

  /** Factory: create from pool, linked to a polygon vertex. */
  static path(poly: object): ZPP_CutVert {
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

  free(): void {
    this.vert = null;
    this.parent = null;
  }

  /** Union-find root of `x`, compressing the path (pointer reversal, no recursion). */
  static find(x: ZPP_CutVert): ZPP_CutVert {
    if (x == x.parent) {
      return x;
    }
    let obj = x;
    let stack: ZPP_CutVert | null = null;
    while (obj != obj.parent) {
      const nxt = obj.parent!;
      obj.parent = stack;
      stack = obj;
      obj = nxt;
    }
    while (stack != null) {
      const nxt = stack.parent;
      stack.parent = obj;
      stack = nxt;
    }
    return obj;
  }

  /** Union-find merge of the sets containing `a` and `b` (union by rank). */
  static union(a: ZPP_CutVert, b: ZPP_CutVert): void {
    const xr = ZPP_CutVert.find(a);
    const yr = ZPP_CutVert.find(b);
    if (xr != yr) {
      if (xr.rank < yr.rank) {
        xr.parent = yr;
      } else if (xr.rank > yr.rank) {
        yr.parent = xr;
      } else {
        yr.parent = xr;
        xr.rank++;
      }
    }
  }
}
