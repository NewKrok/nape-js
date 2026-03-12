/**
 * ZPP_Convex — Static convex polygon optimization utilities.
 *
 * Provides inner-angle test and diagonal removal optimization for
 * partitioned polygon decomposition.
 *
 * Converted from nape-compiled.js lines 24287–24365.
 */

export class ZPP_Convex {
  /**
   * Test if the angle at vertex b (from a→b→c) is an inner angle.
   * Returns true if the cross product (a-b) × (c-b) >= 0.
   */
  static isinner(
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
  ): boolean {
    const ux = a.x - b.x;
    const uy = a.y - b.y;
    const vx = c.x - b.x;
    const vy = c.y - b.y;
    return vy * ux - vx * uy >= 0;
  }

  /**
   * Optimize a partitioned polygon by removing unnecessary diagonals
   * that don't contribute to convexity.
   */
  static optimise(P: any): void {
    // First pass: sort diagonals for each vertex
    const F = P.vertices;
    const L = P.vertices;
    if (F != null) {
      let nite = F;
      while (true) {
        const p = nite;
        p.sort();
        nite = nite.next;
        if (!(nite != L)) {
          break;
        }
      }
    }
    // Second pass: remove diagonals that maintain convexity
    const F1 = P.vertices;
    const L1 = P.vertices;
    if (F1 != null) {
      let nite1 = F1;
      while (true) {
        const p1 = nite1;
        let pright = p1.prev;
        let ppre: any = null;
        let cx_ite = p1.diagonals.head;
        while (cx_ite != null) {
          const pdiag = cx_ite.elt;
          const pleft = cx_ite.next == null ? p1.next : cx_ite.next.elt;
          if (!ZPP_Convex.isinner(pleft, p1, pright)) {
            ppre = cx_ite;
            pright = pdiag;
            cx_ite = cx_ite.next;
            continue;
          }
          let removable = true;
          const q = pdiag;
          let qright = q.prev;
          let qpre: any = null;
          let cx_ite1 = q.diagonals.head;
          while (cx_ite1 != null) {
            const qdiag = cx_ite1.elt;
            if (qdiag == p1) {
              const qleft = cx_ite1.next == null ? q.next : cx_ite1.next.elt;
              removable = ZPP_Convex.isinner(qleft, q, qright);
              break;
            }
            qright = qdiag;
            qpre = cx_ite1;
            cx_ite1 = cx_ite1.next;
          }
          if (removable) {
            cx_ite = p1.diagonals.erase(ppre);
            q.diagonals.erase(qpre);
            continue;
          }
          pright = pdiag;
          ppre = cx_ite;
          cx_ite = cx_ite.next;
        }
        nite1 = nite1.next;
        if (!(nite1 != L1)) {
          break;
        }
      }
    }
  }
}
