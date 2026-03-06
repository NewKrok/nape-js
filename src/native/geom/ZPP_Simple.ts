/**
 * ZPP_Simple — Simple polygon decomposition and simplicity testing.
 *
 * Uses a sweep-line algorithm to detect self-intersections, split a
 * self-intersecting polygon into simple sub-polygons, and test whether
 * a polygon is simple (non-self-intersecting).
 *
 * Converted from nape-compiled.js lines 33689–35033.
 */

import { getNape } from "../../core/engine";
import { ZPP_SimpleVert } from "./ZPP_SimpleVert";
import { ZPP_SimpleSeg } from "./ZPP_SimpleSeg";
import { ZPP_SimpleEvent } from "./ZPP_SimpleEvent";
import { ZPP_SimpleSweep } from "./ZPP_SimpleSweep";
import { ZPP_GeomVert } from "./ZPP_GeomVert";
import { Hashable2_Boolfalse } from "../util/Hashable2_Boolfalse";
import { FastHash2_Hashable2_Boolfalse } from "../util/FastHash2_Hashable2_Boolfalse";

type Any = any;

export class ZPP_Simple {
  static __name__ = ["zpp_nape", "geom", "ZPP_Simple"];

  static sweep: ZPP_SimpleSweep | null = null;
  static inthash: Any = null;
  static vertices: Any = null;
  static queue: Any = null;
  static ints: Any = null;
  static list_vertices: Any = null;
  static list_queue: Any = null;

  __class__: Any = ZPP_Simple;

  static decompose(poly: Any, rets: Any): Any {
    const zpp = getNape().__zpp;
    if (ZPP_Simple.sweep == null) {
      ZPP_Simple.sweep = new ZPP_SimpleSweep();
      ZPP_Simple.inthash = new FastHash2_Hashable2_Boolfalse();
    }
    if (ZPP_Simple.vertices == null) {
      if (zpp.util.ZPP_Set_ZPP_SimpleVert.zpp_pool == null) {
        ZPP_Simple.vertices = new zpp.util.ZPP_Set_ZPP_SimpleVert();
      } else {
        ZPP_Simple.vertices = zpp.util.ZPP_Set_ZPP_SimpleVert.zpp_pool;
        zpp.util.ZPP_Set_ZPP_SimpleVert.zpp_pool = ZPP_Simple.vertices.next;
        ZPP_Simple.vertices.next = null;
      }
      ZPP_Simple.vertices.lt = ZPP_SimpleVert.less_xy;
      ZPP_Simple.vertices.swapped = ZPP_SimpleVert.swap_nodes;
    }
    if (ZPP_Simple.queue == null) {
      if (zpp.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool == null) {
        ZPP_Simple.queue = new zpp.util.ZPP_Set_ZPP_SimpleEvent();
      } else {
        ZPP_Simple.queue = zpp.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool;
        zpp.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool = ZPP_Simple.queue.next;
        ZPP_Simple.queue.next = null;
      }
      ZPP_Simple.queue.lt = ZPP_SimpleEvent.less_xy;
      ZPP_Simple.queue.swapped = ZPP_SimpleEvent.swap_nodes;
    }
    let fst: Any = null;
    let pre: Any = null;
    const F = poly;
    const L = poly;
    if (F != null) {
      let nite = F;
      while (true) {
        const v = nite;
        const x = v.x;
        const y = v.y;
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
        let vert: Any = ret;
        let cur = ZPP_Simple.vertices.parent;
        while (cur != null)
          if (ZPP_Simple.vertices.lt(vert, cur.data)) {
            cur = cur.prev;
          } else if (ZPP_Simple.vertices.lt(cur.data, vert)) {
            cur = cur.next;
          } else {
            break;
          }
        const vx = cur;
        if (vx != null) {
          const o = vert;
          o.links.clear();
          o.node = null;
          o.forced = false;
          o.next = ZPP_SimpleVert.zpp_pool;
          ZPP_SimpleVert.zpp_pool = o;
          vert = vx.data;
        } else {
          vert.node = ZPP_Simple.vertices.insert(vert);
        }
        if (pre != null) {
          let ret1: ZPP_SimpleEvent;
          if (ZPP_SimpleEvent.zpp_pool == null) {
            ret1 = new ZPP_SimpleEvent();
          } else {
            ret1 = ZPP_SimpleEvent.zpp_pool;
            ZPP_SimpleEvent.zpp_pool = ret1.next;
            ret1.next = null;
          }
          ret1.vertex = pre;
          const e1 = ret1;
          let ret2: ZPP_SimpleEvent;
          if (ZPP_SimpleEvent.zpp_pool == null) {
            ret2 = new ZPP_SimpleEvent();
          } else {
            ret2 = ZPP_SimpleEvent.zpp_pool;
            ZPP_SimpleEvent.zpp_pool = ret2.next;
            ret2.next = null;
          }
          ret2.vertex = vert;
          const e2 = ret2;
          let seg: Any;
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
          ZPP_Simple.queue.insert(e1);
          ZPP_Simple.queue.insert(e2);
          pre.links.insert(vert);
          vert.links.insert(pre);
        }
        pre = vert;
        if (fst == null) {
          fst = vert;
        }
        nite = nite.next;
        if (!(nite != L)) {
          break;
        }
      }
    }
    let ret3: ZPP_SimpleEvent;
    if (ZPP_SimpleEvent.zpp_pool == null) {
      ret3 = new ZPP_SimpleEvent();
    } else {
      ret3 = ZPP_SimpleEvent.zpp_pool;
      ZPP_SimpleEvent.zpp_pool = ret3.next;
      ret3.next = null;
    }
    ret3.vertex = pre;
    const e11 = ret3;
    let ret4: ZPP_SimpleEvent;
    if (ZPP_SimpleEvent.zpp_pool == null) {
      ret4 = new ZPP_SimpleEvent();
    } else {
      ret4 = ZPP_SimpleEvent.zpp_pool;
      ZPP_SimpleEvent.zpp_pool = ret4.next;
      ret4.next = null;
    }
    ret4.vertex = fst;
    const e21 = ret4;
    let seg1: Any;
    if (ZPP_SimpleEvent.less_xy(e11, e21)) {
      e11.type = 1;
      e21.type = 2;
      seg1 = ZPP_SimpleSeg.get(pre, fst);
    } else {
      e11.type = 2;
      e21.type = 1;
      seg1 = ZPP_SimpleSeg.get(fst, pre);
    }
    e11.segment = e21.segment = seg1;
    ZPP_Simple.queue.insert(e11);
    ZPP_Simple.queue.insert(e21);
    pre.links.insert(fst);
    fst.links.insert(pre);
    if (ZPP_Simple.ints == null) {
      if (zpp.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool == null) {
        ZPP_Simple.ints = new zpp.util.ZPP_Set_ZPP_SimpleEvent();
      } else {
        ZPP_Simple.ints = zpp.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool;
        zpp.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool = ZPP_Simple.ints.next;
        ZPP_Simple.ints.next = null;
      }
      ZPP_Simple.ints.lt = ZPP_SimpleEvent.less_xy;
    }
    while (!ZPP_Simple.queue.empty()) {
      const e = ZPP_Simple.queue.pop_front();
      ZPP_Simple.sweep!.sweepx = e.vertex.x;
      if (e.type == 1) {
        const s = e.segment;
        ZPP_Simple.sweep!.add(s);
        if (
          s.next != null &&
          s != null &&
          !(s.next.id < s.id
            ? ZPP_Simple.inthash.has(s.next.id, s.id)
            : ZPP_Simple.inthash.has(s.id, s.next.id))
        ) {
          const intx = ZPP_Simple.sweep!.intersection(s.next, s);
          if (intx != null) {
            if (intx.vertex.x >= ZPP_Simple.sweep!.sweepx) {
              let cur1 = ZPP_Simple.queue.parent;
              while (cur1 != null)
                if (ZPP_Simple.queue.lt(intx, cur1.data)) {
                  cur1 = cur1.prev;
                } else if (ZPP_Simple.queue.lt(cur1.data, intx)) {
                  cur1 = cur1.next;
                } else {
                  break;
                }
              const ex = cur1;
              if (ex == null) {
                let cur2 = ZPP_Simple.ints.parent;
                while (cur2 != null)
                  if (ZPP_Simple.ints.lt(intx, cur2.data)) {
                    cur2 = cur2.prev;
                  } else if (ZPP_Simple.ints.lt(cur2.data, intx)) {
                    cur2 = cur2.next;
                  } else {
                    break;
                  }
                const vx1 = cur2;
                if (vx1 != null) {
                  const o1 = intx.vertex;
                  o1.links.clear();
                  o1.node = null;
                  o1.forced = false;
                  o1.next = ZPP_SimpleVert.zpp_pool;
                  ZPP_SimpleVert.zpp_pool = o1;
                  intx.vertex = vx1.data.vertex;
                  vx1.data = intx;
                  ZPP_Simple.queue.insert(intx);
                } else {
                  ZPP_Simple.queue.insert(intx);
                  ZPP_Simple.ints.insert(intx);
                }
                if (s.next.id < s.id) {
                  const tmp = ZPP_Simple.inthash;
                  const id = s.next.id;
                  const di = s.id;
                  let ret5: Any;
                  if (Hashable2_Boolfalse.zpp_pool == null) {
                    ret5 = new Hashable2_Boolfalse();
                  } else {
                    ret5 = Hashable2_Boolfalse.zpp_pool;
                    Hashable2_Boolfalse.zpp_pool = ret5.next;
                    ret5.next = null;
                  }
                  ret5.id = id;
                  ret5.di = di;
                  const ret6 = ret5;
                  ret6.value = true;
                  tmp.add(ret6);
                } else {
                  const tmp1 = ZPP_Simple.inthash;
                  const id1 = s.id;
                  const di1 = s.next.id;
                  let ret7: Any;
                  if (Hashable2_Boolfalse.zpp_pool == null) {
                    ret7 = new Hashable2_Boolfalse();
                  } else {
                    ret7 = Hashable2_Boolfalse.zpp_pool;
                    Hashable2_Boolfalse.zpp_pool = ret7.next;
                    ret7.next = null;
                  }
                  ret7.id = id1;
                  ret7.di = di1;
                  const ret8 = ret7;
                  ret8.value = true;
                  tmp1.add(ret8);
                }
              } else {
                const x1 = ex.data;
                if (x1.segment != intx.segment || intx.segment2 != x1.segment2) {
                  throw new Error("corner case 2, shiiiit.");
                }
                const o2 = intx.vertex;
                o2.links.clear();
                o2.node = null;
                o2.forced = false;
                o2.next = ZPP_SimpleVert.zpp_pool;
                ZPP_SimpleVert.zpp_pool = o2;
                const o3 = intx;
                o3.vertex = null;
                o3.segment = o3.segment2 = null;
                o3.node = null;
                o3.next = ZPP_SimpleEvent.zpp_pool;
                ZPP_SimpleEvent.zpp_pool = o3;
              }
            } else {
              const o4 = intx.vertex;
              o4.links.clear();
              o4.node = null;
              o4.forced = false;
              o4.next = ZPP_SimpleVert.zpp_pool;
              ZPP_SimpleVert.zpp_pool = o4;
              const o5 = intx;
              o5.vertex = null;
              o5.segment = o5.segment2 = null;
              o5.node = null;
              o5.next = ZPP_SimpleEvent.zpp_pool;
              ZPP_SimpleEvent.zpp_pool = o5;
            }
          }
        }
        if (
          s != null &&
          s.prev != null &&
          !(s.id < s.prev.id
            ? ZPP_Simple.inthash.has(s.id, s.prev.id)
            : ZPP_Simple.inthash.has(s.prev.id, s.id))
        ) {
          const intx1 = ZPP_Simple.sweep!.intersection(s, s.prev);
          if (intx1 != null) {
            if (intx1.vertex.x >= ZPP_Simple.sweep!.sweepx) {
              let cur3 = ZPP_Simple.queue.parent;
              while (cur3 != null)
                if (ZPP_Simple.queue.lt(intx1, cur3.data)) {
                  cur3 = cur3.prev;
                } else if (ZPP_Simple.queue.lt(cur3.data, intx1)) {
                  cur3 = cur3.next;
                } else {
                  break;
                }
              const ex1 = cur3;
              if (ex1 == null) {
                let cur4 = ZPP_Simple.ints.parent;
                while (cur4 != null)
                  if (ZPP_Simple.ints.lt(intx1, cur4.data)) {
                    cur4 = cur4.prev;
                  } else if (ZPP_Simple.ints.lt(cur4.data, intx1)) {
                    cur4 = cur4.next;
                  } else {
                    break;
                  }
                const vx2 = cur4;
                if (vx2 != null) {
                  const o6 = intx1.vertex;
                  o6.links.clear();
                  o6.node = null;
                  o6.forced = false;
                  o6.next = ZPP_SimpleVert.zpp_pool;
                  ZPP_SimpleVert.zpp_pool = o6;
                  intx1.vertex = vx2.data.vertex;
                  vx2.data = intx1;
                  ZPP_Simple.queue.insert(intx1);
                } else {
                  ZPP_Simple.queue.insert(intx1);
                  ZPP_Simple.ints.insert(intx1);
                }
                if (s.id < s.prev.id) {
                  const tmp2 = ZPP_Simple.inthash;
                  const id2 = s.id;
                  const di2 = s.prev.id;
                  let ret9: Any;
                  if (Hashable2_Boolfalse.zpp_pool == null) {
                    ret9 = new Hashable2_Boolfalse();
                  } else {
                    ret9 = Hashable2_Boolfalse.zpp_pool;
                    Hashable2_Boolfalse.zpp_pool = ret9.next;
                    ret9.next = null;
                  }
                  ret9.id = id2;
                  ret9.di = di2;
                  const ret10 = ret9;
                  ret10.value = true;
                  tmp2.add(ret10);
                } else {
                  const tmp3 = ZPP_Simple.inthash;
                  const id3 = s.prev.id;
                  const di3 = s.id;
                  let ret11: Any;
                  if (Hashable2_Boolfalse.zpp_pool == null) {
                    ret11 = new Hashable2_Boolfalse();
                  } else {
                    ret11 = Hashable2_Boolfalse.zpp_pool;
                    Hashable2_Boolfalse.zpp_pool = ret11.next;
                    ret11.next = null;
                  }
                  ret11.id = id3;
                  ret11.di = di3;
                  const ret12 = ret11;
                  ret12.value = true;
                  tmp3.add(ret12);
                }
              } else {
                const x2 = ex1.data;
                if (x2.segment != intx1.segment || intx1.segment2 != x2.segment2) {
                  throw new Error("corner case 2, shiiiit.");
                }
                const o7 = intx1.vertex;
                o7.links.clear();
                o7.node = null;
                o7.forced = false;
                o7.next = ZPP_SimpleVert.zpp_pool;
                ZPP_SimpleVert.zpp_pool = o7;
                const o8 = intx1;
                o8.vertex = null;
                o8.segment = o8.segment2 = null;
                o8.node = null;
                o8.next = ZPP_SimpleEvent.zpp_pool;
                ZPP_SimpleEvent.zpp_pool = o8;
              }
            } else {
              const o9 = intx1.vertex;
              o9.links.clear();
              o9.node = null;
              o9.forced = false;
              o9.next = ZPP_SimpleVert.zpp_pool;
              ZPP_SimpleVert.zpp_pool = o9;
              const o10 = intx1;
              o10.vertex = null;
              o10.segment = o10.segment2 = null;
              o10.node = null;
              o10.next = ZPP_SimpleEvent.zpp_pool;
              ZPP_SimpleEvent.zpp_pool = o10;
            }
          }
        }
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
          if (
            nxt != null &&
            pre1 != null &&
            !(nxt.id < pre1.id
              ? ZPP_Simple.inthash.has(nxt.id, pre1.id)
              : ZPP_Simple.inthash.has(pre1.id, nxt.id))
          ) {
            const intx2 = ZPP_Simple.sweep!.intersection(nxt, pre1);
            if (intx2 != null) {
              if (intx2.vertex.x >= ZPP_Simple.sweep!.sweepx) {
                let cur5 = ZPP_Simple.queue.parent;
                while (cur5 != null)
                  if (ZPP_Simple.queue.lt(intx2, cur5.data)) {
                    cur5 = cur5.prev;
                  } else if (ZPP_Simple.queue.lt(cur5.data, intx2)) {
                    cur5 = cur5.next;
                  } else {
                    break;
                  }
                const ex2 = cur5;
                if (ex2 == null) {
                  let cur6 = ZPP_Simple.ints.parent;
                  while (cur6 != null)
                    if (ZPP_Simple.ints.lt(intx2, cur6.data)) {
                      cur6 = cur6.prev;
                    } else if (ZPP_Simple.ints.lt(cur6.data, intx2)) {
                      cur6 = cur6.next;
                    } else {
                      break;
                    }
                  const vx3 = cur6;
                  if (vx3 != null) {
                    const o12 = intx2.vertex;
                    o12.links.clear();
                    o12.node = null;
                    o12.forced = false;
                    o12.next = ZPP_SimpleVert.zpp_pool;
                    ZPP_SimpleVert.zpp_pool = o12;
                    intx2.vertex = vx3.data.vertex;
                    vx3.data = intx2;
                    ZPP_Simple.queue.insert(intx2);
                  } else {
                    ZPP_Simple.queue.insert(intx2);
                    ZPP_Simple.ints.insert(intx2);
                  }
                  if (nxt.id < pre1.id) {
                    const tmp4 = ZPP_Simple.inthash;
                    const id4 = nxt.id;
                    const di4 = pre1.id;
                    let ret13: Any;
                    if (Hashable2_Boolfalse.zpp_pool == null) {
                      ret13 = new Hashable2_Boolfalse();
                    } else {
                      ret13 = Hashable2_Boolfalse.zpp_pool;
                      Hashable2_Boolfalse.zpp_pool = ret13.next;
                      ret13.next = null;
                    }
                    ret13.id = id4;
                    ret13.di = di4;
                    const ret14 = ret13;
                    ret14.value = true;
                    tmp4.add(ret14);
                  } else {
                    const tmp5 = ZPP_Simple.inthash;
                    const id5 = pre1.id;
                    const di5 = nxt.id;
                    let ret15: Any;
                    if (Hashable2_Boolfalse.zpp_pool == null) {
                      ret15 = new Hashable2_Boolfalse();
                    } else {
                      ret15 = Hashable2_Boolfalse.zpp_pool;
                      Hashable2_Boolfalse.zpp_pool = ret15.next;
                      ret15.next = null;
                    }
                    ret15.id = id5;
                    ret15.di = di5;
                    const ret16 = ret15;
                    ret16.value = true;
                    tmp5.add(ret16);
                  }
                } else {
                  const x3 = ex2.data;
                  if (x3.segment != intx2.segment || intx2.segment2 != x3.segment2) {
                    throw new Error("corner case 2, shiiiit.");
                  }
                  const o13 = intx2.vertex;
                  o13.links.clear();
                  o13.node = null;
                  o13.forced = false;
                  o13.next = ZPP_SimpleVert.zpp_pool;
                  ZPP_SimpleVert.zpp_pool = o13;
                  const o14 = intx2;
                  o14.vertex = null;
                  o14.segment = o14.segment2 = null;
                  o14.node = null;
                  o14.next = ZPP_SimpleEvent.zpp_pool;
                  ZPP_SimpleEvent.zpp_pool = o14;
                }
              } else {
                const o15 = intx2.vertex;
                o15.links.clear();
                o15.node = null;
                o15.forced = false;
                o15.next = ZPP_SimpleVert.zpp_pool;
                ZPP_SimpleVert.zpp_pool = o15;
                const o16 = intx2;
                o16.vertex = null;
                o16.segment = o16.segment2 = null;
                o16.node = null;
                o16.next = ZPP_SimpleEvent.zpp_pool;
                ZPP_SimpleEvent.zpp_pool = o16;
              }
            }
          }
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
          intx3.node = ZPP_Simple.vertices.insert(intx3);
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
        if (
          b.next != null &&
          b != null &&
          !(b.next.id < b.id
            ? ZPP_Simple.inthash.has(b.next.id, b.id)
            : ZPP_Simple.inthash.has(b.id, b.next.id))
        ) {
          const intx4 = ZPP_Simple.sweep!.intersection(b.next, b);
          if (intx4 != null) {
            if (intx4.vertex.x >= ZPP_Simple.sweep!.sweepx) {
              let cur9 = ZPP_Simple.queue.parent;
              while (cur9 != null)
                if (ZPP_Simple.queue.lt(intx4, cur9.data)) {
                  cur9 = cur9.prev;
                } else if (ZPP_Simple.queue.lt(cur9.data, intx4)) {
                  cur9 = cur9.next;
                } else {
                  break;
                }
              const ex3 = cur9;
              if (ex3 == null) {
                let cur10 = ZPP_Simple.ints.parent;
                while (cur10 != null)
                  if (ZPP_Simple.ints.lt(intx4, cur10.data)) {
                    cur10 = cur10.prev;
                  } else if (ZPP_Simple.ints.lt(cur10.data, intx4)) {
                    cur10 = cur10.next;
                  } else {
                    break;
                  }
                const vx4 = cur10;
                if (vx4 != null) {
                  const o17 = intx4.vertex;
                  o17.links.clear();
                  o17.node = null;
                  o17.forced = false;
                  o17.next = ZPP_SimpleVert.zpp_pool;
                  ZPP_SimpleVert.zpp_pool = o17;
                  intx4.vertex = vx4.data.vertex;
                  vx4.data = intx4;
                  ZPP_Simple.queue.insert(intx4);
                } else {
                  ZPP_Simple.queue.insert(intx4);
                  ZPP_Simple.ints.insert(intx4);
                }
                if (b.next.id < b.id) {
                  const tmp6 = ZPP_Simple.inthash;
                  const id6 = b.next.id;
                  const di6 = b.id;
                  let ret17: Any;
                  if (Hashable2_Boolfalse.zpp_pool == null) {
                    ret17 = new Hashable2_Boolfalse();
                  } else {
                    ret17 = Hashable2_Boolfalse.zpp_pool;
                    Hashable2_Boolfalse.zpp_pool = ret17.next;
                    ret17.next = null;
                  }
                  ret17.id = id6;
                  ret17.di = di6;
                  const ret18 = ret17;
                  ret18.value = true;
                  tmp6.add(ret18);
                } else {
                  const tmp7 = ZPP_Simple.inthash;
                  const id7 = b.id;
                  const di7 = b.next.id;
                  let ret19: Any;
                  if (Hashable2_Boolfalse.zpp_pool == null) {
                    ret19 = new Hashable2_Boolfalse();
                  } else {
                    ret19 = Hashable2_Boolfalse.zpp_pool;
                    Hashable2_Boolfalse.zpp_pool = ret19.next;
                    ret19.next = null;
                  }
                  ret19.id = id7;
                  ret19.di = di7;
                  const ret20 = ret19;
                  ret20.value = true;
                  tmp7.add(ret20);
                }
              } else {
                const x4 = ex3.data;
                if (x4.segment != intx4.segment || intx4.segment2 != x4.segment2) {
                  throw new Error("corner case 2, shiiiit.");
                }
                const o18 = intx4.vertex;
                o18.links.clear();
                o18.node = null;
                o18.forced = false;
                o18.next = ZPP_SimpleVert.zpp_pool;
                ZPP_SimpleVert.zpp_pool = o18;
                const o19 = intx4;
                o19.vertex = null;
                o19.segment = o19.segment2 = null;
                o19.node = null;
                o19.next = ZPP_SimpleEvent.zpp_pool;
                ZPP_SimpleEvent.zpp_pool = o19;
              }
            } else {
              const o20 = intx4.vertex;
              o20.links.clear();
              o20.node = null;
              o20.forced = false;
              o20.next = ZPP_SimpleVert.zpp_pool;
              ZPP_SimpleVert.zpp_pool = o20;
              const o21 = intx4;
              o21.vertex = null;
              o21.segment = o21.segment2 = null;
              o21.node = null;
              o21.next = ZPP_SimpleEvent.zpp_pool;
              ZPP_SimpleEvent.zpp_pool = o21;
            }
          }
        }
        if (
          a != null &&
          a.prev != null &&
          !(a.id < a.prev.id
            ? ZPP_Simple.inthash.has(a.id, a.prev.id)
            : ZPP_Simple.inthash.has(a.prev.id, a.id))
        ) {
          const intx5 = ZPP_Simple.sweep!.intersection(a, a.prev);
          if (intx5 != null) {
            if (intx5.vertex.x >= ZPP_Simple.sweep!.sweepx) {
              let cur11 = ZPP_Simple.queue.parent;
              while (cur11 != null)
                if (ZPP_Simple.queue.lt(intx5, cur11.data)) {
                  cur11 = cur11.prev;
                } else if (ZPP_Simple.queue.lt(cur11.data, intx5)) {
                  cur11 = cur11.next;
                } else {
                  break;
                }
              const ex4 = cur11;
              if (ex4 == null) {
                let cur12 = ZPP_Simple.ints.parent;
                while (cur12 != null)
                  if (ZPP_Simple.ints.lt(intx5, cur12.data)) {
                    cur12 = cur12.prev;
                  } else if (ZPP_Simple.ints.lt(cur12.data, intx5)) {
                    cur12 = cur12.next;
                  } else {
                    break;
                  }
                const vx5 = cur12;
                if (vx5 != null) {
                  const o22 = intx5.vertex;
                  o22.links.clear();
                  o22.node = null;
                  o22.forced = false;
                  o22.next = ZPP_SimpleVert.zpp_pool;
                  ZPP_SimpleVert.zpp_pool = o22;
                  intx5.vertex = vx5.data.vertex;
                  vx5.data = intx5;
                  ZPP_Simple.queue.insert(intx5);
                } else {
                  ZPP_Simple.queue.insert(intx5);
                  ZPP_Simple.ints.insert(intx5);
                }
                if (a.id < a.prev.id) {
                  const tmp8 = ZPP_Simple.inthash;
                  const id8 = a.id;
                  const di8 = a.prev.id;
                  let ret21: Any;
                  if (Hashable2_Boolfalse.zpp_pool == null) {
                    ret21 = new Hashable2_Boolfalse();
                  } else {
                    ret21 = Hashable2_Boolfalse.zpp_pool;
                    Hashable2_Boolfalse.zpp_pool = ret21.next;
                    ret21.next = null;
                  }
                  ret21.id = id8;
                  ret21.di = di8;
                  const ret22 = ret21;
                  ret22.value = true;
                  tmp8.add(ret22);
                } else {
                  const tmp9 = ZPP_Simple.inthash;
                  const id9 = a.prev.id;
                  const di9 = a.id;
                  let ret23: Any;
                  if (Hashable2_Boolfalse.zpp_pool == null) {
                    ret23 = new Hashable2_Boolfalse();
                  } else {
                    ret23 = Hashable2_Boolfalse.zpp_pool;
                    Hashable2_Boolfalse.zpp_pool = ret23.next;
                    ret23.next = null;
                  }
                  ret23.id = id9;
                  ret23.di = di9;
                  const ret24 = ret23;
                  ret24.value = true;
                  tmp9.add(ret24);
                }
              } else {
                const x5 = ex4.data;
                if (x5.segment != intx5.segment || intx5.segment2 != x5.segment2) {
                  throw new Error("corner case 2, shiiiit.");
                }
                const o23 = intx5.vertex;
                o23.links.clear();
                o23.node = null;
                o23.forced = false;
                o23.next = ZPP_SimpleVert.zpp_pool;
                ZPP_SimpleVert.zpp_pool = o23;
                const o24 = intx5;
                o24.vertex = null;
                o24.segment = o24.segment2 = null;
                o24.node = null;
                o24.next = ZPP_SimpleEvent.zpp_pool;
                ZPP_SimpleEvent.zpp_pool = o24;
              }
            } else {
              const o25 = intx5.vertex;
              o25.links.clear();
              o25.node = null;
              o25.forced = false;
              o25.next = ZPP_SimpleVert.zpp_pool;
              ZPP_SimpleVert.zpp_pool = o25;
              const o26 = intx5;
              o26.vertex = null;
              o26.segment = o26.segment2 = null;
              o26.node = null;
              o26.next = ZPP_SimpleEvent.zpp_pool;
              ZPP_SimpleEvent.zpp_pool = o26;
            }
          }
        }
        ZPP_Simple.ints.remove(e);
      }
      const o27 = e;
      o27.vertex = null;
      o27.segment = o27.segment2 = null;
      o27.node = null;
      o27.next = ZPP_SimpleEvent.zpp_pool;
      ZPP_SimpleEvent.zpp_pool = o27;
    }
    let _g = 0;
    const _g1 = ZPP_Simple.inthash.table.length;
    while (_g < _g1) {
      const i = _g++;
      let n = ZPP_Simple.inthash.table[i];
      if (n == null) {
        continue;
      }
      while (n != null) {
        const t1 = n.hnext;
        n.hnext = null;
        const o28 = n;
        o28.next = Hashable2_Boolfalse.zpp_pool;
        Hashable2_Boolfalse.zpp_pool = o28;
        n = t1;
      }
      ZPP_Simple.inthash.table[i] = null;
    }
    if (rets == null) {
      rets = new zpp.util.ZNPList_ZPP_GeomVert();
    }
    while (!ZPP_Simple.vertices.empty()) ZPP_Simple.clip_polygon(ZPP_Simple.vertices, rets);
    return rets;
  }

  static clip_polygon(vertices: Any, rets: Any): void {
    let ret: Any = null;
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
    let ret1: Any;
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
    const obj = ret1;
    if (ret == null) {
      obj.prev = obj.next = obj;
    } else {
      obj.prev = ret;
      obj.next = ret.next;
      ret.next.prev = obj;
      ret.next = obj;
    }
    ret = obj;
    ret.forced = cur.forced;
    while (true) {
      cur.links.remove(nxt);
      nxt.links.remove(cur);
      if (nxt == fst) {
        if (cur.links.empty()) {
          vertices.remove(cur);
          const o = cur;
          o.links.clear();
          o.node = null;
          o.forced = false;
          o.next = ZPP_SimpleVert.zpp_pool;
          ZPP_SimpleVert.zpp_pool = o;
        }
        break;
      }
      const x1 = nxt.x;
      const y1 = nxt.y;
      let ret2: Any;
      if (ZPP_GeomVert.zpp_pool == null) {
        ret2 = new ZPP_GeomVert();
      } else {
        ret2 = ZPP_GeomVert.zpp_pool;
        ZPP_GeomVert.zpp_pool = ret2.next;
        ret2.next = null;
      }
      ret2.forced = false;
      ret2.x = x1;
      ret2.y = y1;
      const obj1 = ret2;
      if (ret == null) {
        obj1.prev = obj1.next = obj1;
      } else {
        obj1.prev = ret;
        obj1.next = ret.next;
        ret.next.prev = obj1;
        ret.next = obj1;
      }
      ret = obj1;
      ret.forced = nxt.forced;
      if (nxt.links.singular()) {
        if (cur.links.empty()) {
          vertices.remove(cur);
          const o1 = cur;
          o1.links.clear();
          o1.node = null;
          o1.forced = false;
          o1.next = ZPP_SimpleVert.zpp_pool;
          ZPP_SimpleVert.zpp_pool = o1;
        }
        cur = nxt;
        nxt = nxt.links.parent.data;
      } else {
        let min: Any = null;
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
          const o2 = cur;
          o2.links.clear();
          o2.node = null;
          o2.forced = false;
          o2.next = ZPP_SimpleVert.zpp_pool;
          ZPP_SimpleVert.zpp_pool = o2;
        }
        cur = nxt;
        nxt = min;
      }
    }
    vertices.remove(fst);
    const o3 = fst;
    o3.links.clear();
    o3.node = null;
    o3.forced = false;
    o3.next = ZPP_SimpleVert.zpp_pool;
    ZPP_SimpleVert.zpp_pool = o3;
    rets.add(ret);
  }

  static isSimple(poly: Any): boolean {
    const zpp = getNape().__zpp;
    if (ZPP_Simple.sweep == null) {
      ZPP_Simple.sweep = new ZPP_SimpleSweep();
      ZPP_Simple.inthash = new FastHash2_Hashable2_Boolfalse();
    }
    let vertices = ZPP_Simple.list_vertices;
    if (vertices == null) {
      vertices = ZPP_Simple.list_vertices = new zpp.util.ZNPList_ZPP_SimpleVert();
    }
    const F = poly;
    const L = poly;
    if (F != null) {
      let nite = F;
      while (true) {
        const v = nite;
        const x = v.x;
        const y = v.y;
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
        vertices.add(ret);
        nite = nite.next;
        if (!(nite != L)) {
          break;
        }
      }
    }
    let queue = ZPP_Simple.list_queue;
    if (queue == null) {
      queue = ZPP_Simple.list_queue = new zpp.util.ZNPList_ZPP_SimpleEvent();
    }
    let cx_ite = vertices.head;
    let u = cx_ite.elt;
    cx_ite = cx_ite.next;
    while (cx_ite != null) {
      const v1 = cx_ite.elt;
      let ret1: ZPP_SimpleEvent;
      if (ZPP_SimpleEvent.zpp_pool == null) {
        ret1 = new ZPP_SimpleEvent();
      } else {
        ret1 = ZPP_SimpleEvent.zpp_pool;
        ZPP_SimpleEvent.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.vertex = u;
      const e1: Any = queue.add(ret1);
      let ret2: ZPP_SimpleEvent;
      if (ZPP_SimpleEvent.zpp_pool == null) {
        ret2 = new ZPP_SimpleEvent();
      } else {
        ret2 = ZPP_SimpleEvent.zpp_pool;
        ZPP_SimpleEvent.zpp_pool = ret2.next;
        ret2.next = null;
      }
      ret2.vertex = v1;
      const e2: Any = queue.add(ret2);
      let tmp: Any;
      if (ZPP_SimpleEvent.less_xy(e1, e2)) {
        e1.type = 1;
        e2.type = 2;
        tmp = ZPP_SimpleSeg.get(u, v1);
      } else {
        e1.type = 2;
        e2.type = 1;
        tmp = ZPP_SimpleSeg.get(v1, u);
      }
      e1.segment = e2.segment = tmp;
      u = v1;
      cx_ite = cx_ite.next;
    }
    const v2 = vertices.head.elt;
    let ret3: ZPP_SimpleEvent;
    if (ZPP_SimpleEvent.zpp_pool == null) {
      ret3 = new ZPP_SimpleEvent();
    } else {
      ret3 = ZPP_SimpleEvent.zpp_pool;
      ZPP_SimpleEvent.zpp_pool = ret3.next;
      ret3.next = null;
    }
    ret3.vertex = u;
    const e11: Any = queue.add(ret3);
    let ret4: ZPP_SimpleEvent;
    if (ZPP_SimpleEvent.zpp_pool == null) {
      ret4 = new ZPP_SimpleEvent();
    } else {
      ret4 = ZPP_SimpleEvent.zpp_pool;
      ZPP_SimpleEvent.zpp_pool = ret4.next;
      ret4.next = null;
    }
    ret4.vertex = v2;
    const e21: Any = queue.add(ret4);
    let tmp1: Any;
    if (ZPP_SimpleEvent.less_xy(e11, e21)) {
      e11.type = 1;
      e21.type = 2;
      tmp1 = ZPP_SimpleSeg.get(u, v2);
    } else {
      e11.type = 2;
      e21.type = 1;
      tmp1 = ZPP_SimpleSeg.get(v2, u);
    }
    e11.segment = e21.segment = tmp1;
    // Merge sort the queue list
    const xxlist = queue;
    if (xxlist.head != null && xxlist.head.next != null) {
      let head = xxlist.head;
      let tail: Any;
      let left: Any;
      let right: Any;
      let nxt: Any;
      let listSize = 1;
      let numMerges: number;
      let leftSize: number;
      let rightSize: number;
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
            } else if (ZPP_SimpleEvent.less_xy(left.elt, right.elt)) {
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
      const o1 = e;
      o1.vertex = null;
      o1.segment = o1.segment2 = null;
      o1.node = null;
      o1.next = ZPP_SimpleEvent.zpp_pool;
      ZPP_SimpleEvent.zpp_pool = o1;
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
      const o3 = e3;
      o3.vertex = null;
      o3.segment = o3.segment2 = null;
      o3.node = null;
      o3.next = ZPP_SimpleEvent.zpp_pool;
      ZPP_SimpleEvent.zpp_pool = o3;
    }
    ZPP_Simple.sweep!.clear();
    while (vertices.head != null) {
      const o4 = vertices.pop_unsafe();
      o4.links.clear();
      o4.node = null;
      o4.forced = false;
      o4.next = ZPP_SimpleVert.zpp_pool;
      ZPP_SimpleVert.zpp_pool = o4;
    }
    return ret5;
  }
}
