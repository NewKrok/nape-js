/**
 * ZPP_Triangular — Triangulation algorithm for monotone polygons.
 *
 * All-static class that triangulates monotone polygons using the standard
 * sweep-line stack algorithm, with optional Delaunay edge-flip optimisation.
 *
 * Converted from nape-compiled.js lines 39177–39514.
 */

import { ZPP_PartitionVertex } from "./ZPP_PartitionVertex";
import { ZPP_PartitionPair } from "./ZPP_PartitionPair";
import { ZPP_PartitionedPoly } from "./ZPP_PartitionedPoly";
import { ZNPList_ZPP_PartitionVertex, ZPP_Set_ZPP_PartitionPair } from "../util/ZNPRegistry";

type Any = any;

export class ZPP_Triangular {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_Triangular"];

  // --- Static fields ---
  static queue: Any = null;
  static stack: Any = null;
  static edgeSet: Any = null;

  __class__: Any = ZPP_Triangular;

  // --- Static methods ---

  static lt(p: ZPP_PartitionVertex, q: ZPP_PartitionVertex): boolean {
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

  static right_turn(
    a: ZPP_PartitionVertex,
    b: ZPP_PartitionVertex,
    c: ZPP_PartitionVertex,
  ): number {
    const ux = c.x - b.x;
    const uy = c.y - b.y;
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    return vy * ux - vx * uy;
  }

  static delaunay(
    A: ZPP_PartitionVertex,
    B: ZPP_PartitionVertex,
    C: ZPP_PartitionVertex,
    D: ZPP_PartitionVertex,
  ): boolean {
    let ux = C.x - B.x;
    let uy = C.y - B.y;
    let vx = B.x - A.x;
    let vy = B.y - A.y;
    let tmp: boolean;
    let tmp1: boolean;
    let tmp2: boolean;
    if (!(vy * ux - vx * uy >= 0)) {
      ux = D.x - C.x;
      uy = D.y - C.y;
      vx = C.x - B.x;
      vy = C.y - B.y;
      tmp2 = vy * ux - vx * uy >= 0;
    } else {
      tmp2 = true;
    }
    if (!tmp2) {
      ux = A.x - D.x;
      uy = A.y - D.y;
      vx = D.x - C.x;
      vy = D.y - C.y;
      tmp1 = vy * ux - vx * uy >= 0;
    } else {
      tmp1 = true;
    }
    if (!tmp1) {
      ux = B.x - A.x;
      uy = B.y - A.y;
      vx = A.x - D.x;
      vy = A.y - D.y;
      tmp = vy * ux - vx * uy >= 0;
    } else {
      tmp = true;
    }
    if (tmp) {
      return true;
    }
    return (
      B.x * (C.y * D.mag - C.mag * D.y) -
        C.x * (B.y * D.mag - B.mag * D.y) +
        D.x * (B.y * C.mag - B.mag * C.y) -
        (A.x * (C.y * D.mag - C.mag * D.y) -
          C.x * (A.y * D.mag - A.mag * D.y) +
          D.x * (A.y * C.mag - A.mag * C.y)) +
        (A.x * (B.y * D.mag - B.mag * D.y) -
          B.x * (A.y * D.mag - A.mag * D.y) +
          D.x * (A.y * B.mag - A.mag * B.y)) -
        (A.x * (B.y * C.mag - B.mag * C.y) -
          B.x * (A.y * C.mag - A.mag * C.y) +
          C.x * (A.y * B.mag - A.mag * B.y)) >
      0
    );
  }

  static optimise(P: ZPP_PartitionedPoly): void {
    const F = P.vertices;
    const L = P.vertices;
    if (F != null) {
      let nite: ZPP_PartitionVertex | null = F;
      while (true) {
        const p = nite!;
        p.sort();
        p.mag = p.x * p.x + p.y * p.y;
        nite = nite!.next;
        if (!(nite != L)) {
          break;
        }
      }
    }
    if (ZPP_Triangular.edgeSet == null) {
      if (ZPP_Set_ZPP_PartitionPair.zpp_pool == null) {
        ZPP_Triangular.edgeSet = new ZPP_Set_ZPP_PartitionPair();
      } else {
        ZPP_Triangular.edgeSet = ZPP_Set_ZPP_PartitionPair.zpp_pool;
        ZPP_Set_ZPP_PartitionPair.zpp_pool = ZPP_Triangular.edgeSet.next;
        ZPP_Triangular.edgeSet.next = null;
      }
      ZPP_Triangular.edgeSet.lt = ZPP_PartitionPair.edge_lt;
      ZPP_Triangular.edgeSet.swapped = ZPP_PartitionPair.edge_swap;
    }
    let edgeStack: ZPP_PartitionPair;
    if (ZPP_PartitionPair.zpp_pool == null) {
      edgeStack = new ZPP_PartitionPair();
    } else {
      edgeStack = ZPP_PartitionPair.zpp_pool;
      ZPP_PartitionPair.zpp_pool = edgeStack.next;
      edgeStack.next = null;
    }
    const F1 = P.vertices;
    const L1 = P.vertices;
    if (F1 != null) {
      let nite1: ZPP_PartitionVertex | null = F1;
      while (true) {
        const p1 = nite1!;
        let q0: ZPP_PartitionVertex = p1.next!;
        p1.diagonals.reverse();
        let cx_ite = p1.diagonals.head;
        while (cx_ite != null) {
          const q: ZPP_PartitionVertex = cx_ite.elt;
          if (q.id < p1.id) {
            q0 = q;
            cx_ite = cx_ite.next;
            continue;
          }
          const q1: ZPP_PartitionVertex = cx_ite.next == null ? p1.prev! : cx_ite.next.elt;
          if (!ZPP_Triangular.delaunay(p1, q0, q, q1)) {
            let ret: ZPP_PartitionPair;
            if (ZPP_PartitionPair.zpp_pool == null) {
              ret = new ZPP_PartitionPair();
            } else {
              ret = ZPP_PartitionPair.zpp_pool;
              ZPP_PartitionPair.zpp_pool = ret.next;
              ret.next = null;
            }
            ret.a = p1;
            ret.b = q;
            if (p1.id < q.id) {
              ret.id = p1.id;
              ret.di = q.id;
            } else {
              ret.id = q.id;
              ret.di = p1.id;
            }
            const edge = ret;
            edgeStack.add(edge);
            edge.node = ZPP_Triangular.edgeSet.insert(edge);
          }
          q0 = q;
          cx_ite = cx_ite.next;
        }
        nite1 = nite1!.next;
        if (!(nite1 != L1)) {
          break;
        }
      }
    }
    while (edgeStack.next != null) {
      const edge1 = edgeStack.pop_unsafe();
      const A = edge1.a;
      const C = edge1.b;
      let B: ZPP_PartitionVertex = A.next;
      let D: ZPP_PartitionVertex | null = null;
      let cx_ite1 = A.diagonals.head;
      while (cx_ite1 != null) {
        const p2 = cx_ite1.elt;
        if (p2 == C) {
          cx_ite1 = cx_ite1.next;
          D = cx_ite1 == null ? A.prev : cx_ite1.elt;
          break;
        }
        B = p2;
        cx_ite1 = cx_ite1.next;
      }
      A.diagonals.remove(C);
      C.diagonals.remove(A);
      if (C == B.next) {
        B.diagonals.add(D);
      } else {
        let cx_ite2 = B.diagonals.head;
        while (cx_ite2 != null) {
          const p3 = cx_ite2.elt;
          if (p3 == C) {
            B.diagonals.insert(cx_ite2, D);
            break;
          }
          cx_ite2 = cx_ite2.next;
        }
      }
      if (A == D!.next) {
        D!.diagonals.add(B);
      } else {
        let cx_ite3 = D!.diagonals.head;
        while (cx_ite3 != null) {
          const p4 = cx_ite3.elt;
          if (p4 == A) {
            D!.diagonals.insert(cx_ite3, B);
            break;
          }
          cx_ite3 = cx_ite3.next;
        }
      }
      ZPP_Triangular.edgeSet.remove_node(edge1.node);
      const o: Any = edge1;
      o.a = o.b = null;
      o.node = null;
      o.next = ZPP_PartitionPair.zpp_pool;
      ZPP_PartitionPair.zpp_pool = o;
    }
    const o1: Any = edgeStack;
    o1.a = o1.b = null;
    o1.node = null;
    o1.next = ZPP_PartitionPair.zpp_pool;
    ZPP_PartitionPair.zpp_pool = o1;
  }

  static triangulate(P: ZPP_PartitionedPoly): ZPP_PartitionedPoly {
    let min = P.vertices!;
    let max = P.vertices!;
    const F = P.vertices!.next;
    const L = P.vertices;
    if (F != null) {
      let nite: ZPP_PartitionVertex | null = F;
      while (true) {
        const p = nite!;
        if (p.y < min.y || (p.y == min.y && p.x < min.x)) {
          min = p;
        }
        if (max.y < p.y || (max.y == p.y && max.x < p.x)) {
          max = p;
        }
        nite = nite!.next;
        if (!(nite != L)) {
          break;
        }
      }
    }
    if (ZPP_Triangular.queue == null) {
      ZPP_Triangular.queue = new ZNPList_ZPP_PartitionVertex();
    }
    let rp = max.prev!;
    let lp = max.next!;
    ZPP_Triangular.queue.add(max);
    while (rp != min || lp != min)
      if (rp == min || (lp != min && (rp.y < lp.y || (rp.y == lp.y && rp.x < lp.x)))) {
        ZPP_Triangular.queue.add(lp);
        lp.rightchain = false;
        lp = lp.next!;
      } else {
        ZPP_Triangular.queue.add(rp);
        rp.rightchain = true;
        rp = rp.prev!;
      }
    ZPP_Triangular.queue.add(min);
    if (ZPP_Triangular.stack == null) {
      ZPP_Triangular.stack = new ZNPList_ZPP_PartitionVertex();
    }
    ZPP_Triangular.stack.add(ZPP_Triangular.queue.pop_unsafe());
    let pre = ZPP_Triangular.queue.pop_unsafe();
    ZPP_Triangular.stack.add(pre);
    while (true) {
      const p1 = ZPP_Triangular.queue.pop_unsafe();
      if (ZPP_Triangular.queue.head == null) {
        break;
      }
      if (p1.rightchain != ZPP_Triangular.stack.head.elt.rightchain) {
        while (true) {
          const s = ZPP_Triangular.stack.pop_unsafe();
          if (ZPP_Triangular.stack.head == null) {
            break;
          }
          P.add_diagonal(s, p1);
        }
        ZPP_Triangular.stack.add(pre);
      } else {
        let q = ZPP_Triangular.stack.pop_unsafe();
        while (ZPP_Triangular.stack.head != null) {
          const s1 = ZPP_Triangular.stack.head.elt;
          const ux = p1.x - q.x;
          const uy = p1.y - q.y;
          const vx = q.x - s1.x;
          const vy = q.y - s1.y;
          const right = vy * ux - vx * uy;
          if ((p1.rightchain && right >= 0) || (!p1.rightchain && right <= 0)) {
            break;
          }
          P.add_diagonal(s1, p1);
          q = s1;
          ZPP_Triangular.stack.pop();
        }
        ZPP_Triangular.stack.add(q);
      }
      ZPP_Triangular.stack.add(p1);
      pre = p1;
    }
    if (ZPP_Triangular.stack.head != null) {
      ZPP_Triangular.stack.pop();
      while (ZPP_Triangular.stack.head != null) {
        const s2 = ZPP_Triangular.stack.pop_unsafe();
        if (ZPP_Triangular.stack.head == null) {
          break;
        }
        P.add_diagonal(max, s2);
      }
    }
    return P;
  }
}
