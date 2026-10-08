/**
 * ZPP_Simple — Simple polygon decomposition and simplicity testing.
 *
 * Uses a sweep-line algorithm to detect self-intersections, split a
 * self-intersecting polygon into simple sub-polygons, and test whether
 * a polygon is simple (non-self-intersecting).
 */

import { ZPP_SimpleVert } from "./ZPP_SimpleVert";
import { ZPP_SimpleSeg } from "./ZPP_SimpleSeg";
import { ZPP_SimpleEvent } from "./ZPP_SimpleEvent";
import { ZPP_SimpleSweep } from "./ZPP_SimpleSweep";
import { ZPP_GeomVert } from "./ZPP_GeomVert";
import { Hashable2_Boolfalse } from "../util/Hashable2_Boolfalse";
import { FastHash2_Hashable2_Boolfalse } from "../util/FastHash2_Hashable2_Boolfalse";
import { ZNPNode } from "../util/ZNPNode";
import { ZNPList } from "../util/ZNPList";
import { ZPP_Set } from "../util/ZPP_Set";
import {
  ZNPList_ZPP_GeomVert,
  ZNPList_ZPP_SimpleVert,
  ZNPList_ZPP_SimpleEvent,
  ZPP_Set_ZPP_SimpleVert,
  ZPP_Set_ZPP_SimpleEvent,
} from "../util/ZNPRegistry";

export class ZPP_Simple {
  static sweep: ZPP_SimpleSweep | null = null;
  static inthash: FastHash2_Hashable2_Boolfalse | null = null;
  static vertices: ZPP_Set<ZPP_SimpleVert> | null = null;
  static queue: ZPP_Set<ZPP_SimpleEvent> | null = null;
  static ints: ZPP_Set<ZPP_SimpleEvent> | null = null;
  static list_vertices: ZNPList<ZPP_SimpleVert> | null = null;
  static list_queue: ZNPList<ZPP_SimpleEvent> | null = null;

  static decompose(poly: ZPP_GeomVert | null, rets: ZNPList<ZPP_GeomVert>): ZNPList<ZPP_GeomVert> {
    if (ZPP_Simple.sweep == null) {
      ZPP_Simple.sweep = new ZPP_SimpleSweep();
      ZPP_Simple.inthash = new FastHash2_Hashable2_Boolfalse();
    }
    if (ZPP_Simple.vertices == null) {
      if (ZPP_Set_ZPP_SimpleVert.zpp_pool == null) {
        ZPP_Simple.vertices = new ZPP_Set_ZPP_SimpleVert() as ZPP_Set<ZPP_SimpleVert>;
      } else {
        ZPP_Simple.vertices = ZPP_Set_ZPP_SimpleVert.zpp_pool as ZPP_Set<ZPP_SimpleVert>;
        ZPP_Set_ZPP_SimpleVert.zpp_pool = ZPP_Simple.vertices!.next as ZPP_Set<unknown> | null;
        ZPP_Simple.vertices!.next = null;
      }
      ZPP_Simple.vertices!.lt = ZPP_SimpleVert.less_xy;
      ZPP_Simple.vertices!.swapped = ZPP_SimpleVert.swap_nodes;
    }
    if (ZPP_Simple.queue == null) {
      if (ZPP_Set_ZPP_SimpleEvent.zpp_pool == null) {
        ZPP_Simple.queue = new ZPP_Set_ZPP_SimpleEvent() as ZPP_Set<ZPP_SimpleEvent>;
      } else {
        ZPP_Simple.queue = ZPP_Set_ZPP_SimpleEvent.zpp_pool as ZPP_Set<ZPP_SimpleEvent>;
        ZPP_Set_ZPP_SimpleEvent.zpp_pool = ZPP_Simple.queue!.next as ZPP_Set<unknown> | null;
        ZPP_Simple.queue!.next = null;
      }
      ZPP_Simple.queue!.lt = ZPP_SimpleEvent.less_xy;
      ZPP_Simple.queue!.swapped = ZPP_SimpleEvent.swap_nodes;
    }
    let fst: ZPP_SimpleVert | null = null;
    let pre: ZPP_SimpleVert | null = null;
    const F = poly;
    const L = poly;
    if (F != null) {
      let nite = F;
      while (true) {
        const v = nite;
        const x = v.x;
        const y = v.y;
        let vert: ZPP_SimpleVert = ZPP_SimpleVert.get(x, y);
        let cur = ZPP_Simple.vertices!.parent;
        while (cur != null)
          if (ZPP_Simple.vertices!.lt!(vert, cur.data!)) {
            cur = cur.prev;
          } else if (ZPP_Simple.vertices!.lt!(cur.data!, vert)) {
            cur = cur.next;
          } else {
            break;
          }
        const vx = cur;
        if (vx != null) {
          vert.release();
          vert = vx.data!;
        } else {
          vert.node = ZPP_Simple.vertices!.insert(vert);
        }
        // A vertex coinciding with its predecessor resolves to the same set
        // node; skip it rather than queue a zero-length self-segment.
        if (pre != null && pre != vert) {
          const e1 = ZPP_SimpleEvent.get(pre);
          const e2 = ZPP_SimpleEvent.get(vert);
          let seg: ZPP_SimpleSeg;
          if (ZPP_SimpleEvent.less_xy(e1, e2)) {
            e1.type = 1;
            e2.type = 2;
            seg = ZPP_SimpleSeg.get(pre, vert);
          } else {
            e1.type = 2;
            e2.type = 1;
            seg = ZPP_SimpleSeg.get(vert, pre);
          }
          e1.segment = e2.segment = seg;
          ZPP_Simple.queue!.insert(e1);
          ZPP_Simple.queue!.insert(e2);
          pre.links.insert(vert);
          vert.links.insert(pre);
        }
        pre = vert;
        if (fst == null) {
          fst = vert;
        }
        nite = nite.next!;
        if (!(nite != L)) {
          break;
        }
      }
    }
    // Close the ring, unless the last vertex coincided with the first.
    if (pre != fst) {
      const e11 = ZPP_SimpleEvent.get(pre);
      const e21 = ZPP_SimpleEvent.get(fst);
      let seg1: ZPP_SimpleSeg;
      if (ZPP_SimpleEvent.less_xy(e11, e21)) {
        e11.type = 1;
        e21.type = 2;
        seg1 = ZPP_SimpleSeg.get(pre!, fst!);
      } else {
        e11.type = 2;
        e21.type = 1;
        seg1 = ZPP_SimpleSeg.get(fst!, pre!);
      }
      e11.segment = e21.segment = seg1;
      ZPP_Simple.queue!.insert(e11);
      ZPP_Simple.queue!.insert(e21);
      pre!.links.insert(fst!);
      fst!.links.insert(pre!);
    }
    if (ZPP_Simple.ints == null) {
      if (ZPP_Set_ZPP_SimpleEvent.zpp_pool == null) {
        ZPP_Simple.ints = new ZPP_Set_ZPP_SimpleEvent() as ZPP_Set<ZPP_SimpleEvent>;
      } else {
        ZPP_Simple.ints = ZPP_Set_ZPP_SimpleEvent.zpp_pool as ZPP_Set<ZPP_SimpleEvent>;
        ZPP_Set_ZPP_SimpleEvent.zpp_pool = ZPP_Simple.ints!.next as ZPP_Set<unknown> | null;
        ZPP_Simple.ints!.next = null;
      }
      ZPP_Simple.ints!.lt = ZPP_SimpleEvent.less_xy;
    }
    while (!ZPP_Simple.queue!.empty()) {
      const e = ZPP_Simple.queue!.pop_front();
      ZPP_Simple.sweep!.sweepx = e.vertex.x;
      if (e.type == 1) {
        const s = e.segment;
        ZPP_Simple.sweep!.add(s);
        ZPP_Simple._queueIntersection(s.next, s);
        ZPP_Simple._queueIntersection(s, s.prev);
      } else if (e.type == 2) {
        const s1 = e.segment;
        if (s1.node != null) {
          const nxt = s1.next;
          const pre1 = s1.prev;
          ZPP_Simple.sweep!.remove(s1);
          const o11 = s1;
          o11.left = o11.right = null;
          o11.prev = null;
          o11.node = null;
          o11.vertices.clear();
          o11.next = ZPP_SimpleSeg.zpp_pool;
          ZPP_SimpleSeg.zpp_pool = o11;
          ZPP_Simple._queueIntersection(nxt, pre1);
        }
      } else {
        const intx3 = e.vertex;
        const pnull = intx3.node == null;
        let a = e.segment;
        let b = e.segment2;
        if (b.next != a) {
          const t = a;
          a = b;
          b = t;
        }
        let cur7 = a.vertices.parent;
        while (cur7 != null)
          if (a.vertices.lt(intx3, cur7.data)) {
            cur7 = cur7.prev;
          } else if (a.vertices.lt(cur7.data, intx3)) {
            cur7 = cur7.next;
          } else {
            break;
          }
        const anew = cur7 == null;
        let cur8 = b.vertices.parent;
        while (cur8 != null)
          if (b.vertices.lt(intx3, cur8.data)) {
            cur8 = cur8.prev;
          } else if (b.vertices.lt(cur8.data, intx3)) {
            cur8 = cur8.next;
          } else {
            break;
          }
        const bnew = cur8 == null;
        if (anew) {
          const aint = a.vertices.insert(intx3);
          const naleft = intx3 == a.left ? intx3 : a.vertices.predecessor_node(aint).data;
          const naright = intx3 == a.right ? intx3 : a.vertices.successor_node(aint).data;
          naleft.links.remove(naright);
          if (intx3 != naleft) {
            naleft.links.insert(intx3);
          }
          naright.links.remove(naleft);
          if (intx3 != naright) {
            naright.links.insert(intx3);
          }
          if (intx3 != naleft) {
            intx3.links.insert(naleft);
          }
          if (intx3 != naright) {
            intx3.links.insert(naright);
          }
        }
        if (bnew) {
          const bint = b.vertices.insert(intx3);
          const nbleft = intx3 == b.left ? intx3 : b.vertices.predecessor_node(bint).data;
          const nbright = intx3 == b.right ? intx3 : b.vertices.successor_node(bint).data;
          nbleft.links.remove(nbright);
          if (intx3 != nbleft) {
            nbleft.links.insert(intx3);
          }
          nbright.links.remove(nbleft);
          if (intx3 != nbright) {
            nbright.links.insert(intx3);
          }
          if (intx3 != nbleft) {
            intx3.links.insert(nbleft);
          }
          if (intx3 != nbright) {
            intx3.links.insert(nbright);
          }
        }
        if (pnull) {
          intx3.node = ZPP_Simple.vertices!.insert(intx3);
        }
        intx3.forced = true;
        if (pnull) {
          const an = a.node;
          const bn = b.node;
          an.data = b;
          bn.data = a;
          a.node = bn;
          b.node = an;
          b.next = a.next;
          a.next = b;
          a.prev = b.prev;
          b.prev = a;
          if (a.prev != null) {
            a.prev.next = a;
          }
          if (b.next != null) {
            b.next.prev = b;
          }
        }
        ZPP_Simple._queueIntersection(b.next, b);
        ZPP_Simple._queueIntersection(a, a.prev);
        ZPP_Simple.ints!.remove(e);
      }
      e.release();
    }
    ZPP_Simple.inthash!.clear((o28) => {
      o28.next = Hashable2_Boolfalse.zpp_pool;
      Hashable2_Boolfalse.zpp_pool = o28;
    });
    if (rets == null) {
      rets = new ZNPList_ZPP_GeomVert();
    }
    while (!ZPP_Simple.vertices!.empty()) ZPP_Simple.clip_polygon(ZPP_Simple.vertices, rets);
    return rets;
  }

  /**
   * Queue the future intersection of the sweep-adjacent segments `a` / `b`
   * (at most once per pair, tracked in `inthash`). An intersection behind the
   * sweep line, or one already queued, is released back to the pools.
   */
  static _queueIntersection(a: ZPP_SimpleSeg | null, b: ZPP_SimpleSeg | null): void {
    if (
      a != null &&
      b != null &&
      !(a.id < b.id ? ZPP_Simple.inthash!.has(a.id, b.id) : ZPP_Simple.inthash!.has(b.id, a.id))
    ) {
      const intx = ZPP_Simple.sweep!.intersection(a, b);
      if (intx != null) {
        if (intx.vertex.x >= ZPP_Simple.sweep!.sweepx) {
          let cur = ZPP_Simple.queue!.parent;
          while (cur != null)
            if (ZPP_Simple.queue!.lt!(intx, cur.data!)) {
              cur = cur.prev;
            } else if (ZPP_Simple.queue!.lt!(cur.data!, intx)) {
              cur = cur.next;
            } else {
              break;
            }
          const ex = cur;
          if (ex == null) {
            let cur = ZPP_Simple.ints!.parent;
            while (cur != null)
              if (ZPP_Simple.ints!.lt!(intx, cur.data!)) {
                cur = cur.prev;
              } else if (ZPP_Simple.ints!.lt!(cur.data!, intx)) {
                cur = cur.next;
              } else {
                break;
              }
            const vx = cur;
            if (vx != null) {
              intx.vertex.release();
              intx.vertex = vx.data!.vertex;
              vx.data = intx;
              ZPP_Simple.queue!.insert(intx);
            } else {
              ZPP_Simple.queue!.insert(intx);
              ZPP_Simple.ints!.insert(intx);
            }
            ZPP_Simple.inthash!.add(Hashable2_Boolfalse.ordered_get(a.id, b.id, true));
          } else {
            const x = ex.data;
            if (x!.segment != intx.segment || intx.segment2 != x!.segment2) {
              throw new Error("corner case 2, shiiiit.");
            }
            intx.vertex.release();
            intx.release();
          }
        } else {
          intx.vertex.release();
          intx.release();
        }
      }
    }
  }

  static clip_polygon(vertices: ZPP_Set<ZPP_SimpleVert>, rets: ZNPList<ZPP_GeomVert>): void {
    let ret: ZPP_GeomVert | null = null;
    let cur = vertices.first();
    const fst = cur;
    const pren = cur.links.parent;
    const nxtn = pren.prev == null ? pren.next : pren.prev;
    const pre = pren.data;
    let nxt = nxtn.data;
    const ux = cur.x - pre.x;
    const uy = cur.y - pre.y;
    const vx = nxt.x - cur.x;
    const vy = nxt.y - cur.y;
    if (vy * ux - vx * uy < 0) {
      nxt = pre;
    }
    const x = cur.x;
    const y = cur.y;
    const ret1: ZPP_GeomVert = ZPP_GeomVert.get(x, y);
    const obj = ret1;
    if (ret == null) {
      obj.prev = obj.next = obj;
    } else {
      const retRef = ret as ZPP_GeomVert;
      const retNxt = retRef.next;
      obj.prev = retRef;
      obj.next = retNxt;
      retNxt!.prev = obj;
      retRef.next = obj;
    }
    ret = obj;
    ret.forced = cur.forced;
    while (true) {
      cur.links.remove(nxt);
      nxt.links.remove(cur);
      if (nxt == fst) {
        if (cur.links.empty()) {
          vertices.remove(cur);
          cur.release();
        }
        break;
      }
      const x1 = nxt.x;
      const y1 = nxt.y;
      const ret2: ZPP_GeomVert = ZPP_GeomVert.get(x1, y1);
      const obj1 = ret2;
      if (ret == null) {
        obj1.prev = obj1.next = obj1;
      } else {
        const retRef1 = ret as ZPP_GeomVert;
        const retNxt1 = retRef1.next;
        obj1.prev = retRef1;
        obj1.next = retNxt1;
        retNxt1!.prev = obj1;
        retRef1.next = obj1;
      }
      ret = obj1;
      ret.forced = nxt.forced;
      if (nxt.links.singular()) {
        if (cur.links.empty()) {
          vertices.remove(cur);
          cur.release();
        }
        cur = nxt;
        nxt = nxt.links.parent.data;
      } else {
        let min: ZPP_SimpleVert | null = null;
        let minl = 0.0;
        if (!nxt.links.empty()) {
          let set_ite = nxt.links.parent;
          while (set_ite.prev != null) set_ite = set_ite.prev;
          while (set_ite != null) {
            const p = set_ite.data;
            if (min == null) {
              min = p;
              const ux1 = nxt.x - cur.x;
              const uy1 = nxt.y - cur.y;
              const vx1 = p.x - nxt.x;
              const vy1 = p.y - nxt.y;
              minl = vy1 * ux1 - vx1 * uy1;
            } else {
              const ux2 = nxt.x - cur.x;
              const uy2 = nxt.y - cur.y;
              const vx2 = p.x - nxt.x;
              const vy2 = p.y - nxt.y;
              const nleft = vy2 * ux2 - vx2 * uy2;
              if (nleft > 0 && minl <= 0) {
                min = p;
                minl = nleft;
              } else if (minl * nleft >= 0) {
                const ux3 = nxt.x - p.x;
                const uy3 = nxt.y - p.y;
                const vx3 = min.x - nxt.x;
                const vy3 = min.y - nxt.y;
                const pleft = vy3 * ux3 - vx3 * uy3;
                if (pleft > 0) {
                  min = p;
                  minl = nleft;
                }
              }
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
        if (cur.links.empty()) {
          vertices.remove(cur);
          cur.release();
        }
        cur = nxt;
        nxt = min;
      }
    }
    vertices.remove(fst);
    fst.release();
    if (ret.next == ret || ret.next!.next == ret) {
      // Fewer than 3 vertices: a zero-area sliver left by an edge traversed
      // there and back (spike / collapsed ring). Recycle it instead of
      // emitting a degenerate polygon.
      let v: ZPP_GeomVert | null = ret;
      const stop = ret.prev;
      while (v != null) {
        const nx: ZPP_GeomVert | null = v == stop ? null : v.next;
        v.free();
        v.next = ZPP_GeomVert.zpp_pool;
        ZPP_GeomVert.zpp_pool = v;
        v = nx;
      }
    } else {
      rets.add(ret);
    }
  }

  static isSimple(poly: ZPP_GeomVert | null): boolean {
    if (ZPP_Simple.sweep == null) {
      ZPP_Simple.sweep = new ZPP_SimpleSweep();
      ZPP_Simple.inthash = new FastHash2_Hashable2_Boolfalse();
    }
    let vertices = ZPP_Simple.list_vertices;
    if (vertices == null) {
      vertices = ZPP_Simple.list_vertices = new ZNPList_ZPP_SimpleVert();
    }
    const F = poly;
    const L = poly;
    if (F != null) {
      let nite = F;
      while (true) {
        const v = nite;
        const x = v.x;
        const y = v.y;
        vertices.add(ZPP_SimpleVert.get(x, y));
        nite = nite.next!;
        if (!(nite != L)) {
          break;
        }
      }
    }
    let queue = ZPP_Simple.list_queue;
    if (queue == null) {
      queue = ZPP_Simple.list_queue = new ZNPList_ZPP_SimpleEvent();
    }
    let cx_ite = vertices.head;
    let u = cx_ite!.elt;
    cx_ite = cx_ite!.next;
    while (cx_ite != null) {
      const v1 = cx_ite.elt;
      const e1: ZPP_SimpleEvent = queue.add(ZPP_SimpleEvent.get(u));
      const e2: ZPP_SimpleEvent = queue.add(ZPP_SimpleEvent.get(v1));
      let tmp: ZPP_SimpleSeg;
      if (ZPP_SimpleEvent.less_xy(e1, e2)) {
        e1.type = 1;
        e2.type = 2;
        tmp = ZPP_SimpleSeg.get(u!, v1!);
      } else {
        e1.type = 2;
        e2.type = 1;
        tmp = ZPP_SimpleSeg.get(v1!, u!);
      }
      e1.segment = e2.segment = tmp;
      u = v1;
      cx_ite = cx_ite.next;
    }
    const v2 = vertices.head!.elt;
    const e11: ZPP_SimpleEvent = queue.add(ZPP_SimpleEvent.get(u));
    const e21: ZPP_SimpleEvent = queue.add(ZPP_SimpleEvent.get(v2));
    let tmp1: ZPP_SimpleSeg;
    if (ZPP_SimpleEvent.less_xy(e11, e21)) {
      e11.type = 1;
      e21.type = 2;
      tmp1 = ZPP_SimpleSeg.get(u!, v2!);
    } else {
      e11.type = 2;
      e21.type = 1;
      tmp1 = ZPP_SimpleSeg.get(v2!, u!);
    }
    e11.segment = e21.segment = tmp1;
    // Merge sort the queue list
    const xxlist = queue;
    if (xxlist.head != null && xxlist.head.next != null) {
      let head: ZNPNode<ZPP_SimpleEvent> | null = xxlist.head;
      let tail: ZNPNode<ZPP_SimpleEvent> | null;
      let left: ZNPNode<ZPP_SimpleEvent> | null;
      let right: ZNPNode<ZPP_SimpleEvent> | null;
      let nxt: ZNPNode<ZPP_SimpleEvent>;
      let listSize = 1;
      let numMerges: number;
      let leftSize: number;
      let rightSize: number;
      while (true) {
        numMerges = 0;
        left = head;
        head = null;
        tail = null;
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
              nxt = right!;
              right = right!.next;
              --rightSize;
            } else if (rightSize == 0 || right == null) {
              nxt = left!;
              left = left!.next;
              --leftSize;
            } else if (ZPP_SimpleEvent.less_xy(left!.elt!, right.elt!)) {
              nxt = left!;
              left = left!.next;
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
        tail!.next = null;
        listSize <<= 1;
        if (!(numMerges > 1)) {
          break;
        }
      }
      xxlist.head = head;
      xxlist.modified = true;
      xxlist.pushmod = true;
    }
    let ret5 = true;
    while (queue.head != null) {
      const e = queue.pop_unsafe();
      const seg = e.segment;
      if (e.type == 1) {
        ZPP_Simple.sweep!.add(seg);
        if (
          ZPP_Simple.sweep!.intersect(seg, seg.next) ||
          ZPP_Simple.sweep!.intersect(seg, seg.prev)
        ) {
          ret5 = false;
          break;
        }
      } else if (e.type == 2) {
        if (ZPP_Simple.sweep!.intersect(seg.prev, seg.next)) {
          ret5 = false;
          break;
        }
        ZPP_Simple.sweep!.remove(seg);
        const o = seg;
        o.left = o.right = null;
        o.prev = null;
        o.node = null;
        o.vertices.clear();
        o.next = ZPP_SimpleSeg.zpp_pool;
        ZPP_SimpleSeg.zpp_pool = o;
      }
      e.release();
    }
    while (queue.head != null) {
      const e3 = queue.pop_unsafe();
      if (e3.type == 2) {
        const o2 = e3.segment;
        o2.left = o2.right = null;
        o2.prev = null;
        o2.node = null;
        o2.vertices.clear();
        o2.next = ZPP_SimpleSeg.zpp_pool;
        ZPP_SimpleSeg.zpp_pool = o2;
      }
      e3.release();
    }
    ZPP_Simple.sweep!.clear();
    while (vertices.head != null) {
      vertices.pop_unsafe().release();
    }
    return ret5;
  }
}
