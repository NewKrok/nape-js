/**
 * ZPP_Simplify — Polygon simplification using Ramer-Douglas-Peucker algorithm.
 *
 * Reduces polygon vertex count while preserving shape within an epsilon tolerance.
 */

import { ZPP_SimplifyV } from "./ZPP_SimplifyV";
import { ZPP_SimplifyP } from "./ZPP_SimplifyP";
import { ZPP_GeomVert } from "./ZPP_GeomVert";
import { ZNPList_ZPP_SimplifyP } from "../util/ZNPRegistry";
import { ZNPList } from "../util/ZNPList";

/** Minimal interface for vertex-like objects with x, y coords. */
interface XYPoint {
  x: number;
  y: number;
}

export class ZPP_Simplify {
  static stack: ZNPList<ZPP_SimplifyP> | null = null;

  static less(a: XYPoint, b: XYPoint): boolean {
    return a.x - b.x + (a.y - b.y) < 0.0;
  }

  /** Perpendicular distance squared from vertex v to line segment a-b. */
  static distance(v: XYPoint, a: XYPoint, b: XYPoint): number {
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
  static simplify(P: ZPP_GeomVert, epsilon: number): ZPP_GeomVert | null {
    let ret: ZPP_SimplifyV | null = null;
    let min: ZPP_SimplifyV | null = null;
    let max: ZPP_SimplifyV | null = null;
    epsilon *= epsilon;
    if (ZPP_Simplify.stack == null) {
      ZPP_Simplify.stack = new ZNPList_ZPP_SimplifyP() as ZNPList<ZPP_SimplifyP>;
    }
    let pre: ZPP_SimplifyV | null = null;
    let fst: ZPP_SimplifyV | null = null;
    let cur = P;
    while (true) {
      const ret1: ZPP_SimplifyV = ZPP_SimplifyV.get(cur);
      const v = ret1;
      v.forced = cur.forced;
      if (v.forced) {
        v.flag = true;
        if (pre != null) {
          const tmp = ZPP_Simplify.stack;
          const ret2: ZPP_SimplifyP = ZPP_SimplifyP.get(pre, v);
          tmp.add(ret2);
        } else {
          fst = v;
        }
        pre = v;
      }
      const obj = v;
      if (ret == null) {
        obj.prev = obj.next = obj;
      } else {
        obj.prev = ret;
        obj.next = ret.next;
        ret.next!.prev = obj;
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
      cur = cur.next!;
      if (!(cur != P)) {
        break;
      }
    }
    if (ZPP_Simplify.stack.head == null) {
      if (fst == null) {
        min!.flag = max!.flag = true;
        const tmp1 = ZPP_Simplify.stack;
        const ret3: ZPP_SimplifyP = ZPP_SimplifyP.get(min, max);
        tmp1.add(ret3);
        const tmp2 = ZPP_Simplify.stack;
        const ret4: ZPP_SimplifyP = ZPP_SimplifyP.get(max, min);
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
          const ret5: ZPP_SimplifyP = ZPP_SimplifyP.get(min, fst);
          tmp3.add(ret5);
          const tmp4 = ZPP_Simplify.stack;
          const ret6: ZPP_SimplifyP = ZPP_SimplifyP.get(fst, min);
          tmp4.add(ret6);
        } else {
          max!.flag = fst.flag = true;
          const tmp5 = ZPP_Simplify.stack;
          const ret7: ZPP_SimplifyP = ZPP_SimplifyP.get(max, fst);
          tmp5.add(ret7);
          const tmp6 = ZPP_Simplify.stack;
          const ret8: ZPP_SimplifyP = ZPP_SimplifyP.get(fst, max);
          tmp6.add(ret8);
        }
      }
    } else {
      const tmp7 = ZPP_Simplify.stack;
      const ret9: ZPP_SimplifyP = ZPP_SimplifyP.get(pre, fst);
      tmp7.add(ret9);
    }
    while (ZPP_Simplify.stack.head != null) {
      const cur1 = ZPP_Simplify.stack.pop_unsafe();
      const min1 = cur1.min;
      const max1 = cur1.max;
      const o = cur1;
      o.min = o.max = null;
      o.next = ZPP_SimplifyP.zpp_pool;
      ZPP_SimplifyP.zpp_pool = o;
      let dmax = epsilon;
      let dv: ZPP_SimplifyV | null = null;
      let ite = min1!.next;
      while (ite != max1) {
        const dist = ZPP_Simplify.distance(ite!, min1!, max1!);
        if (dist > dmax) {
          dmax = dist;
          dv = ite;
        }
        ite = ite!.next;
      }
      if (dv != null) {
        dv.flag = true;
        const tmp8 = ZPP_Simplify.stack;
        const ret10: ZPP_SimplifyP = ZPP_SimplifyP.get(min1, dv);
        tmp8.add(ret10);
        const tmp9 = ZPP_Simplify.stack;
        const ret11: ZPP_SimplifyP = ZPP_SimplifyP.get(dv, max1);
        tmp9.add(ret11);
      }
    }
    let retp: ZPP_GeomVert | null = null;
    while (ret != null) {
      if (ret.flag) {
        const x = ret.x;
        const y = ret.y;
        const ret12: ZPP_GeomVert = ZPP_GeomVert.get(x, y);
        const obj1 = ret12;
        if (retp == null) {
          obj1.prev = obj1.next = obj1;
        } else {
          obj1.prev = retp;
          obj1.next = retp.next;
          retp.next!.prev = obj1;
          retp.next = obj1;
        }
        retp = obj1;
        retp.forced = ret.forced;
      }
      if (ret != null && ret.prev == ret) {
        ret.next = ret.prev = null;
        ret!.next = ZPP_SimplifyV.zpp_pool;
        ZPP_SimplifyV.zpp_pool = ret!;
        ret = null!;
      } else {
        const retnodes: ZPP_SimplifyV | null = ret!.next;
        ret!.prev!.next = ret!.next;
        ret!.next!.prev = ret!.prev;
        ret!.next = ret!.prev = null;
        ret!.next = ZPP_SimplifyV.zpp_pool;
        ZPP_SimplifyV.zpp_pool = ret!;
        ret = retnodes;
      }
    }
    return retp;
  }
}
