/**
 * ZPP_Monotone — Monotone polygon decomposition algorithm.
 *
 * All-static class that decomposes a simple polygon into y-monotone
 * sub-polygons using a sweep line algorithm with a BST edge set.
 *
 * Converted from nape-compiled.js lines 29958–30409.
 */

import { getNape } from "../../core/engine";
import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_PartitionVertex } from "./ZPP_PartitionVertex";
import { ZPP_PartitionedPoly } from "./ZPP_PartitionedPoly";

type Any = any;

export class ZPP_Monotone {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_Monotone"];

  // --- Static fields ---
  static queue: Any = null;
  static edges: Any = null;
  static sharedPPoly: ZPP_PartitionedPoly | null = null;

  __class__: Any = ZPP_Monotone;

  // --- Static methods ---

  static bisector(b: ZPP_PartitionVertex): ZPP_Vec2 {
    var a = b.prev!;
    var c = b.next!;
    var ux = 0.0;
    var uy = 0.0;
    ux = b.x - a.x;
    uy = b.y - a.y;
    var vx = 0.0;
    var vy = 0.0;
    vx = c.x - b.x;
    vy = c.y - b.y;
    var ret: ZPP_Vec2;
    if (ZPP_Vec2.zpp_pool == null) {
      ret = new ZPP_Vec2();
    } else {
      ret = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.weak = false;
    ret._immutable = false;
    ret.x = -uy - vy;
    ret.y = ux + vx;
    var ret1 = ret;
    var d = ret1.x * ret1.x + ret1.y * ret1.y;
    var imag = 1.0 / Math.sqrt(d);
    var t = imag;
    ret1.x *= t;
    ret1.y *= t;
    if (vy * ux - vx * uy < 0) {
      ret1.x = -ret1.x;
      ret1.y = -ret1.y;
    }
    return ret1;
  }

  static below(p: ZPP_PartitionVertex, q: ZPP_PartitionVertex): boolean {
    if (p.y < q.y) {
      return true;
    } else if (p.y > q.y) {
      return false;
    } else if (p.x < q.x) {
      return true;
    } else if (p.x > q.x) {
      return false;
    } else {
      var po = ZPP_Monotone.bisector(p);
      var qo = ZPP_Monotone.bisector(q);
      var t = 1.0;
      po.x += p.x * t;
      po.y += p.y * t;
      var t1 = 1.0;
      qo.x += q.x * t1;
      qo.y += q.y * t1;
      var ret = po.x < qo.x || (po.x == qo.x && po.y < qo.y);
      var o: Any = po;
      if (o.outer != null) {
        o.outer.zpp_inner = null;
        o.outer = null;
      }
      o._isimmutable = null;
      o._validate = null;
      o._invalidate = null;
      o.next = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = o;
      var o1: Any = qo;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = o1;
      return ret;
    }
  }

  static above(p: ZPP_PartitionVertex, q: ZPP_PartitionVertex): boolean {
    return ZPP_Monotone.below(q, p);
  }

  static left_vertex(p: ZPP_PartitionVertex): boolean {
    var pre = p.prev!;
    if (!(pre.y > p.y)) {
      if (pre.y == p.y) {
        return p.next!.y < p.y;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  static isMonotone(P: ZPP_PartitionVertex): boolean {
    var min = P;
    var max = P;
    var F = P.next;
    var L = P;
    if (F != null) {
      var nite: ZPP_PartitionVertex | null = F;
      while (true) {
        var p = nite!;
        if (p.y < min.y) {
          min = p;
        }
        if (p.y > max.y) {
          max = p;
        }
        nite = nite!.next;
        if (!(nite != L)) {
          break;
        }
      }
    }
    var ret = true;
    var pre = min;
    if (max != min.next) {
      var F1 = min.next;
      var L1 = max;
      if (F1 != null) {
        var nite1: ZPP_PartitionVertex | null = F1;
        while (true) {
          var p1 = nite1!;
          if (p1.y < pre.y) {
            ret = false;
            break;
          }
          pre = p1;
          nite1 = nite1!.next;
          if (!(nite1 != L1)) {
            break;
          }
        }
      }
    }
    if (!ret) {
      return false;
    }
    pre = min;
    if (max != min.prev) {
      var F2 = min.prev;
      var L2 = max;
      if (F2 != null) {
        var nite2: ZPP_PartitionVertex | null = F2;
        while (true) {
          var p2 = nite2!;
          if (p2.y < pre.y) {
            ret = false;
            break;
          }
          pre = p2;
          nite2 = nite2!.prev;
          if (!(nite2 != L2)) {
            break;
          }
        }
      }
    }
    return ret;
  }

  static getShared(): ZPP_PartitionedPoly {
    if (ZPP_Monotone.sharedPPoly == null) {
      ZPP_Monotone.sharedPPoly = new ZPP_PartitionedPoly();
    }
    return ZPP_Monotone.sharedPPoly;
  }

  static decompose(P: Any, poly: ZPP_PartitionedPoly | null): ZPP_PartitionedPoly {
    if (poly == null) {
      poly = new ZPP_PartitionedPoly(P);
    } else {
      poly.init(P);
    }
    if (poly.vertices == null) {
      return poly;
    }
    if (ZPP_Monotone.queue == null) {
      ZPP_Monotone.queue =
        new (getNape().__zpp.util.ZNPList_ZPP_PartitionVertex)();
    }
    var F = poly.vertices;
    var L = poly.vertices;
    if (F != null) {
      var nite: ZPP_PartitionVertex | null = F;
      while (true) {
        var p = nite!;
        ZPP_Monotone.queue.add(p);
        var ux = 0.0;
        var uy = 0.0;
        ux = p.next!.x - p.x;
        uy = p.next!.y - p.y;
        var vx = 0.0;
        var vy = 0.0;
        vx = p.prev!.x - p.x;
        vy = p.prev!.y - p.y;
        var cx = vy * ux - vx * uy > 0.0;
        p.type = ZPP_Monotone.below(p.prev!, p)
          ? ZPP_Monotone.below(p.next!, p)
            ? cx
              ? 0
              : 3
            : 4
          : ZPP_Monotone.below(p, p.next!)
          ? cx
            ? 1
            : 2
          : 4;
        nite = nite!.next;
        if (!(nite != L)) {
          break;
        }
      }
    }
    // Merge sort the queue by above()
    var xxlist = ZPP_Monotone.queue;
    if (xxlist.head != null && xxlist.head.next != null) {
      var head = xxlist.head;
      var tail: Any = null;
      var left: Any = null;
      var right: Any = null;
      var nxt: Any = null;
      var listSize = 1;
      var numMerges: number;
      var leftSize: number;
      var rightSize: number;
      while (true) {
        numMerges = 0;
        left = head;
        head = null;
        tail = head;
        while (left != null) {
          ++numMerges;
          right = left;
          leftSize = 0;
          rightSize = listSize;
          while (right != null && leftSize < listSize) {
            ++leftSize;
            right = right.next;
          }
          while (leftSize > 0 || (rightSize > 0 && right != null)) {
            if (leftSize == 0) {
              nxt = right;
              right = right.next;
              --rightSize;
            } else if (rightSize == 0 || right == null) {
              nxt = left;
              left = left.next;
              --leftSize;
            } else if (ZPP_Monotone.above(left.elt, right.elt)) {
              nxt = left;
              left = left.next;
              --leftSize;
            } else {
              nxt = right;
              right = right.next;
              --rightSize;
            }
            if (tail != null) {
              tail.next = nxt;
            } else {
              head = nxt;
            }
            tail = nxt;
          }
          left = right;
        }
        tail.next = null;
        listSize <<= 1;
        if (!(numMerges > 1)) {
          break;
        }
      }
      xxlist.head = head;
      xxlist.modified = true;
      xxlist.pushmod = true;
    }
    // Initialize BST edge set
    var zpp = getNape().__zpp;
    if (ZPP_Monotone.edges == null) {
      if (zpp.util.ZPP_Set_ZPP_PartitionVertex.zpp_pool == null) {
        ZPP_Monotone.edges =
          new zpp.util.ZPP_Set_ZPP_PartitionVertex();
      } else {
        ZPP_Monotone.edges =
          zpp.util.ZPP_Set_ZPP_PartitionVertex.zpp_pool;
        zpp.util.ZPP_Set_ZPP_PartitionVertex.zpp_pool =
          ZPP_Monotone.edges.next;
        ZPP_Monotone.edges.next = null;
      }
      ZPP_Monotone.edges.lt =
        ZPP_PartitionVertex.edge_lt;
      ZPP_Monotone.edges.swapped =
        ZPP_PartitionVertex.edge_swap;
    }
    // Process vertices in sweep order
    while (ZPP_Monotone.queue.head != null) {
      var v = ZPP_Monotone.queue.pop_unsafe();
      switch (v.type) {
        case 0:
          v.helper = v;
          v.node = ZPP_Monotone.edges.insert(v);
          break;
        case 1: {
          var e = v.prev;
          if (e.helper == null) {
            throw new Error(
              "Fatal error (1): Polygon is not weakly-simple and clockwise"
            );
          }
          if (e.helper.type == 2) {
            poly.add_diagonal(v, e.helper);
          }
          ZPP_Monotone.edges.remove_node(e.node);
          e.helper = null;
          break;
        }
        case 2: {
          var e1 = v.prev;
          if (e1.helper == null) {
            throw new Error(
              "Fatal error (3): Polygon is not weakly-simple and clockwise"
            );
          }
          if (e1.helper.type == 2) {
            poly.add_diagonal(v, e1.helper);
          }
          ZPP_Monotone.edges.remove_node(e1.node);
          e1.helper = null;
          var ret: Any = null;
          if (!ZPP_Monotone.edges.empty()) {
            var set_ite = ZPP_Monotone.edges.parent;
            while (set_ite.prev != null) set_ite = set_ite.prev;
            while (set_ite != null) {
              var elt = set_ite.data;
              if (!ZPP_PartitionVertex.vert_lt(elt, v)) {
                ret = elt;
                break;
              }
              if (set_ite.next != null) {
                set_ite = set_ite.next;
                while (set_ite.prev != null) set_ite = set_ite.prev;
              } else {
                while (set_ite.parent != null && set_ite == set_ite.parent.next)
                  set_ite = set_ite.parent;
                set_ite = set_ite.parent;
              }
            }
          }
          var e2 = ret;
          if (e2 != null) {
            if (e2.helper == null) {
              throw new Error(
                "Fatal error (4): Polygon is not weakly-simple and clockwise"
              );
            }
            if (e2.helper.type == 2) {
              poly.add_diagonal(v, e2.helper);
            }
            e2.helper = v;
          }
          break;
        }
        case 3: {
          var ret1: Any = null;
          if (!ZPP_Monotone.edges.empty()) {
            var set_ite1 = ZPP_Monotone.edges.parent;
            while (set_ite1.prev != null) set_ite1 = set_ite1.prev;
            while (set_ite1 != null) {
              var elt1 = set_ite1.data;
              if (!ZPP_PartitionVertex.vert_lt(elt1, v)) {
                ret1 = elt1;
                break;
              }
              if (set_ite1.next != null) {
                set_ite1 = set_ite1.next;
                while (set_ite1.prev != null) set_ite1 = set_ite1.prev;
              } else {
                while (
                  set_ite1.parent != null &&
                  set_ite1 == set_ite1.parent.next
                )
                  set_ite1 = set_ite1.parent;
                set_ite1 = set_ite1.parent;
              }
            }
          }
          var e3 = ret1;
          if (e3 != null) {
            if (e3.helper == null) {
              throw new Error(
                "Fatal error (2): Polygon is not weakly-simple and clockwise"
              );
            }
            poly.add_diagonal(v, e3.helper);
            e3.helper = v;
          }
          v.node = ZPP_Monotone.edges.insert(v);
          v.helper = v;
          break;
        }
        case 4: {
          var pre = v.prev;
          if (ZPP_Monotone.left_vertex(v)) {
            if (pre.helper == null) {
              throw new Error(
                "Fatal error (5): Polygon is not weakly-simple and clockwise"
              );
            }
            if (pre.helper.type == 2) {
              poly.add_diagonal(v, pre.helper);
            }
            ZPP_Monotone.edges.remove_node(pre.node);
            pre.helper = null;
            v.node = ZPP_Monotone.edges.insert(v);
            v.helper = v;
          } else {
            var ret2: Any = null;
            if (!ZPP_Monotone.edges.empty()) {
              var set_ite2 = ZPP_Monotone.edges.parent;
              while (set_ite2.prev != null) set_ite2 = set_ite2.prev;
              while (set_ite2 != null) {
                var elt2 = set_ite2.data;
                if (!ZPP_PartitionVertex.vert_lt(elt2, v)) {
                  ret2 = elt2;
                  break;
                }
                if (set_ite2.next != null) {
                  set_ite2 = set_ite2.next;
                  while (set_ite2.prev != null) set_ite2 = set_ite2.prev;
                } else {
                  while (
                    set_ite2.parent != null &&
                    set_ite2 == set_ite2.parent.next
                  )
                    set_ite2 = set_ite2.parent;
                  set_ite2 = set_ite2.parent;
                }
              }
            }
            var e4 = ret2;
            if (e4 == null || e4.helper == null) {
              throw new Error(
                "Fatal error (6): Polygon is not weakly-simple and clockwise"
              );
            }
            if (e4.helper.type == 2) {
              poly.add_diagonal(v, e4.helper);
            }
            e4.helper = v;
          }
          break;
        }
      }
    }
    return poly;
  }
}
