/**
 * ZPP_Simplify — Polygon simplification using Ramer-Douglas-Peucker algorithm.
 *
 * Reduces polygon vertex count while preserving shape within an epsilon tolerance.
 *
 * Converted from nape-compiled.js lines 35672–35983.
 */

import { getNape } from "../../core/engine";
import { ZPP_SimplifyV } from "./ZPP_SimplifyV";
import { ZPP_SimplifyP } from "./ZPP_SimplifyP";
import { ZPP_GeomVert } from "./ZPP_GeomVert";

type Any = any;

export class ZPP_Simplify {
  static __name__ = ["zpp_nape", "geom", "ZPP_Simplify"];

  static stack: Any = null;

  __class__: Any = ZPP_Simplify;

  static lessval(a: Any, b: Any): number {
    return a.x - b.x + (a.y - b.y);
  }

  static less(a: Any, b: Any): boolean {
    return a.x - b.x + (a.y - b.y) < 0.0;
  }

  /** Perpendicular distance squared from vertex v to line segment a-b. */
  static distance(v: Any, a: Any, b: Any): number {
    const nx = b.x - a.x;
    const ny = b.y - a.y;
    let cx = v.x - a.x;
    let cy = v.y - a.y;
    const den = nx * nx + ny * ny;
    if (den == 0.0) {
      return cx * cx + cy * cy;
    } else {
      const t = (cx * nx + cy * ny) / (nx * nx + ny * ny);
      if (t <= 0) {
        return cx * cx + cy * cy;
      } else if (t >= 1) {
        const dx = v.x - b.x;
        const dy = v.y - b.y;
        return dx * dx + dy * dy;
      } else {
        const t1 = t;
        cx -= nx * t1;
        cy -= ny * t1;
        return cx * cx + cy * cy;
      }
    }
  }

  /** Simplify a polygon vertex ring using Ramer-Douglas-Peucker. Returns new GeomVert ring. */
  static simplify(P: Any, epsilon: number): Any {
    let ret: ZPP_SimplifyV | null = null;
    let min: ZPP_SimplifyV | null = null;
    let max: ZPP_SimplifyV | null = null;
    epsilon *= epsilon;
    if (ZPP_Simplify.stack == null) {
      ZPP_Simplify.stack = new (getNape().__zpp.util.ZNPList_ZPP_SimplifyP)();
    }
    let pre: ZPP_SimplifyV | null = null;
    let fst: ZPP_SimplifyV | null = null;
    let cur = P;
    while (true) {
      let ret1: ZPP_SimplifyV;
      if (ZPP_SimplifyV.zpp_pool == null) {
        ret1 = new ZPP_SimplifyV();
      } else {
        ret1 = ZPP_SimplifyV.zpp_pool;
        ZPP_SimplifyV.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.x = cur.x;
      ret1.y = cur.y;
      ret1.flag = false;
      const v = ret1;
      v.forced = cur.forced;
      if (v.forced) {
        v.flag = true;
        if (pre != null) {
          const tmp = ZPP_Simplify.stack;
          let ret2: ZPP_SimplifyP;
          if (ZPP_SimplifyP.zpp_pool == null) {
            ret2 = new ZPP_SimplifyP();
          } else {
            ret2 = ZPP_SimplifyP.zpp_pool;
            ZPP_SimplifyP.zpp_pool = ret2.next;
            ret2.next = null;
          }
          ret2.min = pre;
          ret2.max = v;
          tmp.add(ret2);
        } else {
          fst = v;
        }
        pre = v;
      }
      const obj: Any = v;
      if (ret == null) {
        obj.prev = obj.next = obj;
      } else {
        obj.prev = ret;
        obj.next = ret.next;
        ret.next.prev = obj;
        ret.next = obj;
      }
      ret = obj;
      if (min == null) {
        min = ret;
        max = ret;
      } else {
        if (ret.x - min!.x + (ret.y - min!.y) < 0.0) {
          min = ret;
        }
        if (max!.x - ret.x + (max!.y - ret.y) < 0.0) {
          max = ret;
        }
      }
      cur = cur.next;
      if (!(cur != P)) {
        break;
      }
    }
    if (ZPP_Simplify.stack.head == null) {
      if (fst == null) {
        min!.flag = max!.flag = true;
        const tmp1 = ZPP_Simplify.stack;
        let ret3: ZPP_SimplifyP;
        if (ZPP_SimplifyP.zpp_pool == null) {
          ret3 = new ZPP_SimplifyP();
        } else {
          ret3 = ZPP_SimplifyP.zpp_pool;
          ZPP_SimplifyP.zpp_pool = ret3.next;
          ret3.next = null;
        }
        ret3.min = min;
        ret3.max = max;
        tmp1.add(ret3);
        const tmp2 = ZPP_Simplify.stack;
        let ret4: ZPP_SimplifyP;
        if (ZPP_SimplifyP.zpp_pool == null) {
          ret4 = new ZPP_SimplifyP();
        } else {
          ret4 = ZPP_SimplifyP.zpp_pool;
          ZPP_SimplifyP.zpp_pool = ret4.next;
          ret4.next = null;
        }
        ret4.min = max;
        ret4.max = min;
        tmp2.add(ret4);
      } else {
        let d1 = min!.x - fst.x + (min!.y - fst.y);
        if (d1 < 0) {
          d1 = -d1;
        }
        let d2 = max!.x - fst.x + (max!.y - fst.y);
        if (d2 < 0) {
          d2 = -d2;
        }
        if (d1 > d2) {
          min!.flag = fst.flag = true;
          const tmp3 = ZPP_Simplify.stack;
          let ret5: ZPP_SimplifyP;
          if (ZPP_SimplifyP.zpp_pool == null) {
            ret5 = new ZPP_SimplifyP();
          } else {
            ret5 = ZPP_SimplifyP.zpp_pool;
            ZPP_SimplifyP.zpp_pool = ret5.next;
            ret5.next = null;
          }
          ret5.min = min;
          ret5.max = fst;
          tmp3.add(ret5);
          const tmp4 = ZPP_Simplify.stack;
          let ret6: ZPP_SimplifyP;
          if (ZPP_SimplifyP.zpp_pool == null) {
            ret6 = new ZPP_SimplifyP();
          } else {
            ret6 = ZPP_SimplifyP.zpp_pool;
            ZPP_SimplifyP.zpp_pool = ret6.next;
            ret6.next = null;
          }
          ret6.min = fst;
          ret6.max = min;
          tmp4.add(ret6);
        } else {
          max!.flag = fst.flag = true;
          const tmp5 = ZPP_Simplify.stack;
          let ret7: ZPP_SimplifyP;
          if (ZPP_SimplifyP.zpp_pool == null) {
            ret7 = new ZPP_SimplifyP();
          } else {
            ret7 = ZPP_SimplifyP.zpp_pool;
            ZPP_SimplifyP.zpp_pool = ret7.next;
            ret7.next = null;
          }
          ret7.min = max;
          ret7.max = fst;
          tmp5.add(ret7);
          const tmp6 = ZPP_Simplify.stack;
          let ret8: ZPP_SimplifyP;
          if (ZPP_SimplifyP.zpp_pool == null) {
            ret8 = new ZPP_SimplifyP();
          } else {
            ret8 = ZPP_SimplifyP.zpp_pool;
            ZPP_SimplifyP.zpp_pool = ret8.next;
            ret8.next = null;
          }
          ret8.min = fst;
          ret8.max = max;
          tmp6.add(ret8);
        }
      }
    } else {
      const tmp7 = ZPP_Simplify.stack;
      let ret9: ZPP_SimplifyP;
      if (ZPP_SimplifyP.zpp_pool == null) {
        ret9 = new ZPP_SimplifyP();
      } else {
        ret9 = ZPP_SimplifyP.zpp_pool;
        ZPP_SimplifyP.zpp_pool = ret9.next;
        ret9.next = null;
      }
      ret9.min = pre;
      ret9.max = fst;
      tmp7.add(ret9);
    }
    while (ZPP_Simplify.stack.head != null) {
      const cur1 = ZPP_Simplify.stack.pop_unsafe();
      const min1 = cur1.min;
      const max1 = cur1.max;
      const o: Any = cur1;
      o.min = o.max = null;
      o.next = ZPP_SimplifyP.zpp_pool;
      ZPP_SimplifyP.zpp_pool = o;
      let dmax = epsilon;
      let dv: Any = null;
      let ite = min1.next;
      while (ite != max1) {
        const dist = ZPP_Simplify.distance(ite, min1, max1);
        if (dist > dmax) {
          dmax = dist;
          dv = ite;
        }
        ite = ite.next;
      }
      if (dv != null) {
        dv.flag = true;
        const tmp8 = ZPP_Simplify.stack;
        let ret10: ZPP_SimplifyP;
        if (ZPP_SimplifyP.zpp_pool == null) {
          ret10 = new ZPP_SimplifyP();
        } else {
          ret10 = ZPP_SimplifyP.zpp_pool;
          ZPP_SimplifyP.zpp_pool = ret10.next;
          ret10.next = null;
        }
        ret10.min = min1;
        ret10.max = dv;
        tmp8.add(ret10);
        const tmp9 = ZPP_Simplify.stack;
        let ret11: ZPP_SimplifyP;
        if (ZPP_SimplifyP.zpp_pool == null) {
          ret11 = new ZPP_SimplifyP();
        } else {
          ret11 = ZPP_SimplifyP.zpp_pool;
          ZPP_SimplifyP.zpp_pool = ret11.next;
          ret11.next = null;
        }
        ret11.min = dv;
        ret11.max = max1;
        tmp9.add(ret11);
      }
    }
    let retp: Any = null;
    while (ret != null) {
      if (ret.flag) {
        const x = ret.x;
        const y = ret.y;
        let ret12: ZPP_GeomVert;
        if (ZPP_GeomVert.zpp_pool == null) {
          ret12 = new ZPP_GeomVert();
        } else {
          ret12 = ZPP_GeomVert.zpp_pool;
          ZPP_GeomVert.zpp_pool = ret12.next;
          ret12.next = null;
        }
        ret12.forced = false;
        ret12.x = x;
        ret12.y = y;
        const obj1: Any = ret12;
        if (retp == null) {
          obj1.prev = obj1.next = obj1;
        } else {
          obj1.prev = retp;
          obj1.next = retp.next;
          retp.next.prev = obj1;
          retp.next = obj1;
        }
        retp = obj1;
        retp.forced = ret.forced;
      }
      if (ret != null && ret.prev == ret) {
        ret.next = ret.prev = null;
        const o1: Any = ret;
        o1.next = ZPP_SimplifyV.zpp_pool;
        ZPP_SimplifyV.zpp_pool = o1;
        ret = null as Any;
      } else {
        const retnodes = ret!.next;
        ret!.prev!.next = ret!.next;
        ret!.next!.prev = ret!.prev;
        ret!.next = ret!.prev = null;
        const o2: Any = ret;
        o2.next = ZPP_SimplifyV.zpp_pool;
        ZPP_SimplifyV.zpp_pool = o2;
        ret = retnodes;
      }
    }
    return retp;
  }
}
