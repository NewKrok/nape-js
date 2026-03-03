/**
 * ZPP_PartitionedPoly — Internal partitioned polygon for decomposition algorithms.
 *
 * Wraps a circular list of ZPP_PartitionVertex nodes. Supports extracting
 * sub-partitions (for monotone decomposition) and pulling vertex rings
 * (for triangulation output).
 *
 * Converted from nape-compiled.js lines 30688–31238.
 */

import { getNape } from "../../core/engine";
import { ZPP_PartitionVertex } from "./ZPP_PartitionVertex";
import { ZPP_GeomVert } from "./ZPP_GeomVert";

type Any = any;

export class ZPP_PartitionedPoly {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_PartitionedPoly"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_PartitionedPoly | null = null;

  // --- Static: shared lists ---
  static sharedPPList: Any = null;
  static sharedGVList: Any = null;

  // --- Instance fields ---
  next: ZPP_PartitionedPoly | null = null;
  vertices: ZPP_PartitionVertex | null = null;

  __class__: Any = ZPP_PartitionedPoly;

  constructor(P?: Any) {
    this.init(P);
  }

  // --- Static methods ---

  static getSharedPP(): Any {
    if (ZPP_PartitionedPoly.sharedPPList == null) {
      ZPP_PartitionedPoly.sharedPPList =
        new (getNape().__zpp.util.ZNPList_ZPP_PartitionedPoly)();
    }
    return ZPP_PartitionedPoly.sharedPPList;
  }

  static getShared(): Any {
    if (ZPP_PartitionedPoly.sharedGVList == null) {
      ZPP_PartitionedPoly.sharedGVList =
        new (getNape().__zpp.util.ZNPList_ZPP_GeomVert)();
    }
    return ZPP_PartitionedPoly.sharedGVList;
  }

  // --- Instance methods ---

  eq(a: ZPP_PartitionVertex, b: ZPP_PartitionVertex): boolean {
    var dx = 0.0;
    var dy = 0.0;
    dx = a.x - b.x;
    dy = a.y - b.y;
    return dx * dx + dy * dy < getNape().Config.epsilon * getNape().Config.epsilon;
  }

  alloc(): void {}

  free(): void {}

  init(P?: Any): void {
    if (P == null) {
      return;
    }
    var area = 0.0;
    var F = P;
    var L = P;
    if (F != null) {
      var nite = F;
      while (true) {
        var v = nite;
        area += v.x * (v.next.y - v.prev.y);
        nite = nite.next;
        if (!(nite != L)) {
          break;
        }
      }
    }
    var cw = area * 0.5 > 0.0;
    var p = P;
    while (true) {
      var tmp: ZPP_PartitionVertex;
      if (cw) {
        var ret: ZPP_PartitionVertex;
        if (ZPP_PartitionVertex.zpp_pool == null) {
          ret = new ZPP_PartitionVertex();
        } else {
          ret = ZPP_PartitionVertex.zpp_pool;
          ZPP_PartitionVertex.zpp_pool = ret.next;
          ret.next = null;
        }
        ret.x = p.x;
        ret.y = p.y;
        var obj = ret;
        if (this.vertices == null) {
          this.vertices = obj.prev = obj.next = obj;
        } else {
          obj.prev = this.vertices;
          obj.next = this.vertices.next;
          this.vertices.next!.prev = obj;
          this.vertices.next = obj;
        }
        tmp = obj;
      } else {
        var ret1: ZPP_PartitionVertex;
        if (ZPP_PartitionVertex.zpp_pool == null) {
          ret1 = new ZPP_PartitionVertex();
        } else {
          ret1 = ZPP_PartitionVertex.zpp_pool;
          ZPP_PartitionVertex.zpp_pool = ret1.next;
          ret1.next = null;
        }
        ret1.x = p.x;
        ret1.y = p.y;
        var obj1 = ret1;
        if (this.vertices == null) {
          this.vertices = obj1.prev = obj1.next = obj1;
        } else {
          obj1.next = this.vertices;
          obj1.prev = this.vertices.prev;
          this.vertices.prev!.next = obj1;
          this.vertices.prev = obj1;
        }
        tmp = obj1;
      }
      this.vertices = tmp;
      this.vertices.forced = p.forced;
      p = p.next;
      if (!(p != P)) {
        break;
      }
    }
    this.remove_collinear_vertices();
  }

  remove_collinear_vertices(): boolean {
    var p = this.vertices;
    var skip = true;
    while (skip || p != this.vertices) {
      skip = false;
      if (this.eq(p!, p!.next!)) {
        if (p == this.vertices) {
          this.vertices = p!.next;
          skip = true;
        }
        if (p!.forced) {
          p!.next!.forced = true;
        }
        if (p != null && p.prev == p) {
          p.next = p.prev = null;
          var o = p;
          o.helper = null;
          o.next = ZPP_PartitionVertex.zpp_pool;
          ZPP_PartitionVertex.zpp_pool = o;
          p = null;
          p = p as Any;
        } else {
          var retnodes = p!.next;
          p!.prev!.next = p!.next;
          p!.next!.prev = p!.prev;
          p!.next = p!.prev = null;
          var o1 = p!;
          o1.helper = null;
          o1.next = ZPP_PartitionVertex.zpp_pool;
          ZPP_PartitionVertex.zpp_pool = o1;
          p = null;
          p = retnodes;
        }
        if (p == null) {
          this.vertices = null;
          break;
        }
      } else {
        p = p!.next;
      }
    }
    if (this.vertices == null) {
      return true;
    }
    var removed: boolean;
    while (true) {
      removed = false;
      p = this.vertices;
      skip = true;
      while (skip || p != this.vertices) {
        skip = false;
        var pre = p!.prev!;
        var ux = 0.0;
        var uy = 0.0;
        ux = p!.x - pre.x;
        uy = p!.y - pre.y;
        var vx = 0.0;
        var vy = 0.0;
        vx = p!.next!.x - p!.x;
        vy = p!.next!.y - p!.y;
        var crs = vy * ux - vx * uy;
        if (crs * crs >= getNape().Config.epsilon * getNape().Config.epsilon) {
          p = p!.next;
        } else {
          if (p == this.vertices) {
            this.vertices = p!.next;
            skip = true;
          }
          if (p != null && p.prev == p) {
            p.next = p.prev = null;
            var o2 = p;
            o2.helper = null;
            o2.next = ZPP_PartitionVertex.zpp_pool;
            ZPP_PartitionVertex.zpp_pool = o2;
            p = null;
            p = p as Any;
          } else {
            var retnodes1 = p!.next;
            p!.prev!.next = p!.next;
            p!.next!.prev = p!.prev;
            p!.next = p!.prev = null;
            var o3 = p!;
            o3.helper = null;
            o3.next = ZPP_PartitionVertex.zpp_pool;
            ZPP_PartitionVertex.zpp_pool = o3;
            p = null;
            p = retnodes1;
          }
          removed = true;
          if (p == null) {
            removed = false;
            this.vertices = null;
            break;
          }
        }
      }
      if (!removed) {
        break;
      }
    }
    return this.vertices == null;
  }

  add_diagonal(p: ZPP_PartitionVertex, q: ZPP_PartitionVertex): void {
    p.diagonals.add(q);
    q.diagonals.add(p);
    p.forced = q.forced = true;
  }

  extract_partitions(ret: Any): Any {
    if (ret == null) {
      ret = new (getNape().__zpp.util.ZNPList_ZPP_PartitionedPoly)();
    }
    if (this.vertices != null) {
      var F = this.vertices;
      var L = this.vertices;
      if (F != null) {
        var nite: ZPP_PartitionVertex | null = F;
        while (true) {
          var c = nite!;
          c.sort();
          nite = nite!.next;
          if (!(nite != L)) {
            break;
          }
        }
      }
      this.pull_partitions(this.vertices, ret);
      while (this.vertices != null) {
        var tmp: ZPP_PartitionVertex | null;
        if (this.vertices != null && this.vertices.prev == this.vertices) {
          this.vertices.next = this.vertices.prev = null;
          var o = this.vertices;
          o.helper = null;
          o.next = ZPP_PartitionVertex.zpp_pool;
          ZPP_PartitionVertex.zpp_pool = o;
          tmp = this.vertices = null;
        } else {
          var retnodes: ZPP_PartitionVertex | null = this.vertices.next;
          this.vertices.prev!.next = this.vertices.next;
          this.vertices.next!.prev = this.vertices.prev;
          this.vertices.next = this.vertices.prev = null;
          var o1 = this.vertices;
          o1.helper = null;
          o1.next = ZPP_PartitionVertex.zpp_pool;
          ZPP_PartitionVertex.zpp_pool = o1;
          this.vertices = null;
          tmp = retnodes;
        }
        this.vertices = tmp;
      }
      var pre: Any = null;
      var cx_ite = ret.head;
      while (cx_ite != null) {
        var p = cx_ite.elt;
        if (p.remove_collinear_vertices()) {
          ret.erase(pre);
          continue;
        }
        pre = cx_ite;
        cx_ite = cx_ite.next;
      }
    }
    return ret;
  }

  pull_partitions(start: ZPP_PartitionVertex, ret: Any): ZPP_PartitionVertex {
    var poly: ZPP_PartitionedPoly;
    if (ZPP_PartitionedPoly.zpp_pool == null) {
      poly = new ZPP_PartitionedPoly();
    } else {
      poly = ZPP_PartitionedPoly.zpp_pool;
      ZPP_PartitionedPoly.zpp_pool = poly.next;
      poly.next = null;
    }
    var next: ZPP_PartitionVertex = start;
    while (true) {
      var ret1: ZPP_PartitionVertex;
      if (ZPP_PartitionVertex.zpp_pool == null) {
        ret1 = new ZPP_PartitionVertex();
      } else {
        ret1 = ZPP_PartitionVertex.zpp_pool;
        ZPP_PartitionVertex.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.x = next.x;
      ret1.y = next.y;
      ret1.forced = next.forced;
      var obj = ret1;
      if (poly.vertices == null) {
        poly.vertices = obj.prev = obj.next = obj;
      } else {
        obj.prev = poly.vertices;
        obj.next = poly.vertices.next;
        poly.vertices.next!.prev = obj;
        poly.vertices.next = obj;
      }
      poly.vertices = obj;
      poly.vertices.forced = next.forced;
      if (next.diagonals.head != null) {
        var _this = next.diagonals;
        var ret2 = _this.head.elt;
        _this.pop();
        var diag = ret2;
        if (diag == start) {
          break;
        } else {
          next = this.pull_partitions(next, ret);
        }
      } else {
        next = next.next!;
      }
      if (!(next != start)) {
        break;
      }
    }
    var area = 0.0;
    var F = poly.vertices;
    var L = poly.vertices;
    if (F != null) {
      var nite: ZPP_PartitionVertex | null = F;
      while (true) {
        var v = nite!;
        area += v.x * (v.next!.y - v.prev!.y);
        nite = nite!.next;
        if (!(nite != L)) {
          break;
        }
      }
    }
    if (area * 0.5 != 0) {
      ret.add(poly);
    }
    return next;
  }

  extract(ret: Any): Any {
    if (ret == null) {
      ret = new (getNape().__zpp.util.ZNPList_ZPP_GeomVert)();
    }
    if (this.vertices != null) {
      var F = this.vertices;
      var L = this.vertices;
      if (F != null) {
        var nite: ZPP_PartitionVertex | null = F;
        while (true) {
          var c = nite!;
          c.sort();
          nite = nite!.next;
          if (!(nite != L)) {
            break;
          }
        }
      }
      this.pull(this.vertices, ret);
      while (this.vertices != null) {
        var tmp: ZPP_PartitionVertex | null;
        if (this.vertices != null && this.vertices.prev == this.vertices) {
          this.vertices.next = this.vertices.prev = null;
          var o = this.vertices;
          o.helper = null;
          o.next = ZPP_PartitionVertex.zpp_pool;
          ZPP_PartitionVertex.zpp_pool = o;
          tmp = this.vertices = null;
        } else {
          var retnodes: ZPP_PartitionVertex | null = this.vertices.next;
          this.vertices.prev!.next = this.vertices.next;
          this.vertices.next!.prev = this.vertices.prev;
          this.vertices.next = this.vertices.prev = null;
          var o1 = this.vertices;
          o1.helper = null;
          o1.next = ZPP_PartitionVertex.zpp_pool;
          ZPP_PartitionVertex.zpp_pool = o1;
          this.vertices = null;
          tmp = retnodes;
        }
        this.vertices = tmp;
      }
    }
    return ret;
  }

  pull(start: ZPP_PartitionVertex, ret: Any): ZPP_PartitionVertex {
    var poly: Any = null;
    var next: ZPP_PartitionVertex = start;
    while (true) {
      var x = next.x;
      var y = next.y;
      var ret1: Any;
      if (ZPP_GeomVert.zpp_pool == null) {
        ret1 = new ZPP_GeomVert();
      } else {
        ret1 = ZPP_GeomVert.zpp_pool;
        ZPP_GeomVert.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.forced = false;
      ret1.x = x;
      ret1.y = y;
      var obj = ret1;
      if (poly == null) {
        poly = obj.prev = obj.next = obj;
      } else {
        obj.prev = poly;
        obj.next = poly.next;
        poly.next.prev = obj;
        poly.next = obj;
      }
      poly = obj;
      poly.forced = next.forced;
      if (next.diagonals.head != null) {
        var _this = next.diagonals;
        var ret2 = _this.head.elt;
        _this.pop();
        var diag = ret2;
        if (diag == start) {
          break;
        } else {
          next = this.pull(next, ret);
        }
      } else {
        next = next.next!;
      }
      if (!(next != start)) {
        break;
      }
    }
    var area = 0.0;
    var F = poly;
    var L = poly;
    if (F != null) {
      var nite = F;
      while (true) {
        var v = nite;
        area += v.x * (v.next.y - v.prev.y);
        nite = nite.next;
        if (!(nite != L)) {
          break;
        }
      }
    }
    var area1 = area * 0.5;
    if (area1 * area1 >= getNape().Config.epsilon * getNape().Config.epsilon) {
      var p = poly;
      var skip = true;
      while (skip || p != poly) {
        skip = false;
        var dx = 0.0;
        var dy = 0.0;
        dx = p.x - p.next.x;
        dy = p.y - p.next.y;
        if (dx * dx + dy * dy < getNape().Config.epsilon * getNape().Config.epsilon) {
          if (p == poly) {
            poly = p.next;
            skip = true;
          }
          if (p.forced) {
            p.next.forced = true;
          }
          if (p != null && p.prev == p) {
            p.next = p.prev = null;
            p = null;
            p = p;
          } else {
            var retnodes = p.next;
            p.prev.next = p.next;
            p.next.prev = p.prev;
            p.next = p.prev = null;
            p = null;
            p = retnodes;
          }
          if (p == null) {
            poly = null;
            break;
          }
        } else {
          p = p.next;
        }
      }
      if (poly != null) {
        var removed: boolean;
        while (true) {
          removed = false;
          p = poly;
          skip = true;
          while (skip || p != poly) {
            skip = false;
            var pre = p.prev;
            var ux = 0.0;
            var uy = 0.0;
            ux = p.x - pre.x;
            uy = p.y - pre.y;
            var vx = 0.0;
            var vy = 0.0;
            vx = p.next.x - p.x;
            vy = p.next.y - p.y;
            var crs = vy * ux - vx * uy;
            if (crs * crs >= getNape().Config.epsilon * getNape().Config.epsilon) {
              p = p.next;
            } else {
              if (p == poly) {
                poly = p.next;
                skip = true;
              }
              if (p != null && p.prev == p) {
                p.next = p.prev = null;
                p = null;
                p = p;
              } else {
                var retnodes1 = p.next;
                p.prev.next = p.next;
                p.next.prev = p.prev;
                p.next = p.prev = null;
                p = null;
                p = retnodes1;
              }
              removed = true;
              if (p == null) {
                removed = false;
                poly = null;
                break;
              }
            }
          }
          if (!removed) {
            break;
          }
        }
      }
      if (poly != null) {
        ret.add(poly);
      }
    }
    return next;
  }
}
