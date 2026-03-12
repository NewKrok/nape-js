/**
 * ZPP_PartitionVertex — Internal partition vertex for polygon decomposition.
 *
 * Used by the monotone decomposition and triangulation algorithms.
 * Doubly-linked circular list node with diagonal tracking and merge-sort.
 *
 * Converted from nape-compiled.js lines 30410–30687.
 */

import { ZNPList_ZPP_PartitionVertex } from "../util/ZNPRegistry";

export class ZPP_PartitionVertex {
  // --- Static: Haxe metadata ---

  // --- Static: object pool ---
  static zpp_pool: ZPP_PartitionVertex | null = null;

  // --- Static: ID counter ---
  static nextId = 0;

  // --- Instance fields ---
  node: any = null;
  prev: ZPP_PartitionVertex | null = null;
  next: ZPP_PartitionVertex | null = null;
  rightchain = false;
  helper: ZPP_PartitionVertex | null = null;
  type = 0;
  diagonals: any = null;
  forced = false;
  y = 0.0;
  x = 0.0;
  mag = 0;
  id = 0;

  constructor() {
    this.id = ZPP_PartitionVertex.nextId++;
    this.diagonals = new ZNPList_ZPP_PartitionVertex();
  }

  // --- Static methods ---

  static get(x: { x: number; y: number }): ZPP_PartitionVertex {
    let ret: ZPP_PartitionVertex;
    if (ZPP_PartitionVertex.zpp_pool == null) {
      ret = new ZPP_PartitionVertex();
    } else {
      ret = ZPP_PartitionVertex.zpp_pool;
      ZPP_PartitionVertex.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.x = x.x;
    ret.y = x.y;
    return ret;
  }

  static rightdistance(edge: ZPP_PartitionVertex, vert: ZPP_PartitionVertex): number {
    const flip = edge.next!.y > edge.y;
    const ux = edge.next!.x - edge.x;
    const uy = edge.next!.y - edge.y;
    const vx = vert.x - edge.x;
    const vy = vert.y - edge.y;
    return (flip ? -1.0 : 1.0) * (vy * ux - vx * uy);
  }

  static vert_lt(edge: ZPP_PartitionVertex, vert: ZPP_PartitionVertex): boolean {
    if (vert == edge || vert == edge.next) {
      return true;
    } else if (edge.y == edge.next!.y) {
      const x = edge.x;
      const y = edge.next!.x;
      return (x < y ? x : y) <= vert.x;
    } else {
      return ZPP_PartitionVertex.rightdistance(edge, vert) <= 0.0;
    }
  }

  static edge_swap(p: ZPP_PartitionVertex, q: ZPP_PartitionVertex): void {
    const t = p.node;
    p.node = q.node;
    q.node = t;
  }

  static edge_lt(p: ZPP_PartitionVertex, q: ZPP_PartitionVertex): boolean {
    if (p == q && p.next == q.next) {
      return false;
    }
    if (p == q.next) {
      return !ZPP_PartitionVertex.vert_lt(p, q);
    } else if (q == p.next) {
      return ZPP_PartitionVertex.vert_lt(q, p);
    } else if (p.y == p.next!.y) {
      if (q.y == q.next!.y) {
        const x = p.x;
        const y = p.next!.x;
        const x1 = q.x;
        const y1 = q.next!.x;
        return (x > y ? x : y) > (x1 > y1 ? x1 : y1);
      } else if (!(ZPP_PartitionVertex.rightdistance(q, p) > 0.0)) {
        return ZPP_PartitionVertex.rightdistance(q, p.next!) > 0.0;
      } else {
        return true;
      }
    } else {
      const qRight = ZPP_PartitionVertex.rightdistance(p, q);
      const qNextRight = ZPP_PartitionVertex.rightdistance(p, q.next!);
      if (qRight == 0 && qNextRight == 0) {
        const x2 = p.x;
        const y2 = p.next!.x;
        const x3 = q.x;
        const y3 = q.next!.x;
        return (x2 > y2 ? x2 : y2) > (x3 > y3 ? x3 : y3);
      }
      if (qRight * qNextRight >= 0) {
        if (!(qRight < 0)) {
          return qNextRight < 0;
        } else {
          return true;
        }
      }
      const pRight = ZPP_PartitionVertex.rightdistance(q, p);
      const pNextRight = ZPP_PartitionVertex.rightdistance(q, p.next!);
      if (pRight * pNextRight >= 0) {
        if (!(pRight > 0)) {
          return pNextRight > 0;
        } else {
          return true;
        }
      }
      return false;
    }
  }

  // --- Instance methods ---

  alloc(): void {}

  free(): void {
    this.helper = null;
  }

  copy(): ZPP_PartitionVertex {
    let ret: ZPP_PartitionVertex;
    if (ZPP_PartitionVertex.zpp_pool == null) {
      ret = new ZPP_PartitionVertex();
    } else {
      ret = ZPP_PartitionVertex.zpp_pool;
      ZPP_PartitionVertex.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.x = this.x;
    ret.y = this.y;
    ret.forced = this.forced;
    return ret;
  }

  sort(): void {
    let ux = this.prev!.x - this.x;
    let uy = this.prev!.y - this.y;
    let vx = this.next!.x - this.x;
    let vy = this.next!.y - this.y;
    const ret = vy * ux - vx * uy;
    const vorient = ret > 0 ? -1 : ret == 0 ? 0 : 1;
    const xxlist = this.diagonals;
    if (xxlist.head != null && xxlist.head.next != null) {
      let head = xxlist.head;
      let tail: any;
      let left: any;
      let right: any;
      let nxt: any;
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
            } else {
              let tmp: boolean;
              if (vorient == 1) {
                ux = left.elt.x - this.x;
                uy = left.elt.y - this.y;
                vx = right.elt.x - this.x;
                vy = right.elt.y - this.y;
                const ret1 = vy * ux - vx * uy;
                tmp = (ret1 > 0 ? -1 : ret1 == 0 ? 0 : 1) == 1;
              } else {
                ux = this.prev!.x - this.x;
                uy = this.prev!.y - this.y;
                vx = left.elt.x - this.x;
                vy = left.elt.y - this.y;
                const ret2 = vy * ux - vx * uy;
                const d1 = ret2 > 0 ? -1 : ret2 == 0 ? 0 : 1;
                ux = this.prev!.x - this.x;
                uy = this.prev!.y - this.y;
                vx = right.elt.x - this.x;
                vy = right.elt.y - this.y;
                const ret3 = vy * ux - vx * uy;
                const d2 = ret3 > 0 ? -1 : ret3 == 0 ? 0 : 1;
                if (d1 * d2 == 1 || (d1 * d2 == 0 && (d1 == 1 || d2 == 1))) {
                  ux = left.elt.x - this.x;
                  uy = left.elt.y - this.y;
                  vx = right.elt.x - this.x;
                  vy = right.elt.y - this.y;
                  const ret4 = vy * ux - vx * uy;
                  tmp = (ret4 > 0 ? -1 : ret4 == 0 ? 0 : 1) == 1;
                } else if (d1 == -1 || d2 == -1) {
                  tmp = d2 == -1;
                } else if (d1 == 0 && d2 == 0) {
                  ux = this.x - this.prev!.x;
                  uy = this.y - this.prev!.y;
                  vx = left.elt.x - this.x;
                  vy = left.elt.y - this.y;
                  const d11 = ux * vx + uy * vy;
                  vx = right.elt.x - this.x;
                  vy = right.elt.y - this.y;
                  const d21 = ux * vx + uy * vy;
                  tmp = d11 < 0 && d21 > 0 ? true : d21 < 0 && d11 > 0 ? false : true;
                } else {
                  tmp = true;
                }
              }
              if (tmp) {
                nxt = left;
                left = left.next;
                --leftSize;
              } else {
                nxt = right;
                right = right.next;
                --rightSize;
              }
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
  }
}
