/**
 * ZPP_SimpleSweep — Sweep-line BST for simple polygon decomposition.
 *
 * Maintains a balanced BST of active segments during sweep-line processing.
 * Provides segment insertion, removal, intersection testing, and intersection point computation.
 *
 * Converted from nape-compiled.js lines 33937–34265.
 */

import { ZPP_SimpleVert } from "./ZPP_SimpleVert";
import { ZPP_SimpleEvent } from "./ZPP_SimpleEvent";
import { ZPP_SimpleSeg } from "./ZPP_SimpleSeg";
import { ZPP_Set_ZPP_SimpleSeg } from "../util/ZNPRegistry";
import { ZPP_Set } from "../util/ZPP_Set";

export class ZPP_SimpleSweep {
  static __name__ = ["zpp_nape", "geom", "ZPP_SimpleSweep"];

  sweepx = 0.0;
  tree: ZPP_Set<ZPP_SimpleSeg> | null = null;

  constructor() {
    if (ZPP_Set_ZPP_SimpleSeg.zpp_pool == null) {
      this.tree = new ZPP_Set_ZPP_SimpleSeg() as ZPP_Set<ZPP_SimpleSeg>;
    } else {
      this.tree = ZPP_Set_ZPP_SimpleSeg.zpp_pool as ZPP_Set<ZPP_SimpleSeg>;
      ZPP_Set_ZPP_SimpleSeg.zpp_pool = this.tree.next as ZPP_Set<unknown> | null;
      this.tree.next = null;
    }
    this.tree.lt = (p: ZPP_SimpleSeg, q: ZPP_SimpleSeg) => this.edge_lt(p, q);
    this.tree.swapped = (p: ZPP_SimpleSeg, q: ZPP_SimpleSeg) => this.swap_nodes(p, q);
  }

  swap_nodes(p: ZPP_SimpleSeg, q: ZPP_SimpleSeg): void {
    const t = p.node;
    p.node = q.node;
    q.node = t;
  }

  edge_lt(p: ZPP_SimpleSeg, q: ZPP_SimpleSeg): boolean {
    // Algorithm invariant: left/right are always non-null when edge_lt is called.
    const pl = p.left!;
    const pr = p.right!;
    const ql = q.left!;
    const qr = q.right!;
    let ux: number;
    let uy: number;
    let vx: number;
    let vy: number;
    let flip: boolean;
    if (p.left == q.left && p.right == q.right) {
      return false;
    } else if (p.left == q.right) {
      if (pl.x == pr.x) {
        if (pl.y < pr.y) {
          return pl.y > ql.y;
        } else {
          return pr.y > ql.y;
        }
      } else {
        flip = pr.x < pl.x;
        ux = pr.x - pl.x;
        uy = pr.y - pl.y;
        vx = ql.x - pl.x;
        vy = ql.y - pl.y;
        return (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0;
      }
    } else if (p.right == q.left) {
      let tmp: boolean;
      if (ql.x == qr.x) {
        tmp = ql.y < qr.y ? ql.y > pl.y : qr.y > pl.y;
      } else {
        flip = qr.x < ql.x;
        ux = qr.x - ql.x;
        uy = qr.y - ql.y;
        vx = pl.x - ql.x;
        vy = pl.y - ql.y;
        tmp = (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0;
      }
      return !tmp;
    } else if (p.left == q.left) {
      if (pl.x == pr.x) {
        if (pl.y < pr.y) {
          return pl.y > qr.y;
        } else {
          return pr.y > qr.y;
        }
      } else {
        flip = pr.x < pl.x;
        ux = pr.x - pl.x;
        uy = pr.y - pl.y;
        vx = qr.x - pl.x;
        vy = qr.y - pl.y;
        return (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0;
      }
    } else if (p.right == q.right) {
      if (pl.x == pr.x) {
        if (pl.y < pr.y) {
          return pl.y > ql.y;
        } else {
          return pr.y > ql.y;
        }
      } else {
        flip = pr.x < pl.x;
        ux = pr.x - pl.x;
        uy = pr.y - pl.y;
        vx = ql.x - pl.x;
        vy = ql.y - pl.y;
        return (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0;
      }
    }
    if (pl.x == pr.x) {
      if (ql.x == qr.x) {
        const pmax = pl.y < pr.y ? pr : pl;
        const qmax = ql.y < qr.y ? qr : ql;
        return pmax.y > qmax.y;
      } else {
        flip = qr.x < ql.x;
        ux = qr.x - ql.x;
        uy = qr.y - ql.y;
        vx = pl.x - ql.x;
        vy = pl.y - ql.y;
        const plrg = flip ? uy * vx - ux * vy : vy * ux - vx * uy;
        flip = qr.x < ql.x;
        ux = qr.x - ql.x;
        uy = qr.y - ql.y;
        vx = pr.x - ql.x;
        vy = pr.y - ql.y;
        const aplrg = flip ? uy * vx - ux * vy : vy * ux - vx * uy;
        if (plrg * aplrg >= 0) {
          return plrg >= 0.0;
        } else {
          return this.sweepx >= pl.x;
        }
      }
    } else if (ql.x == qr.x) {
      flip = pr.x < pl.x;
      ux = pr.x - pl.x;
      uy = pr.y - pl.y;
      vx = ql.x - pl.x;
      vy = ql.y - pl.y;
      const qlrg = flip ? uy * vx - ux * vy : vy * ux - vx * uy;
      flip = pr.x < pl.x;
      ux = pr.x - pl.x;
      uy = pr.y - pl.y;
      vx = qr.x - pl.x;
      vy = qr.y - pl.y;
      const aqlrg = flip ? uy * vx - ux * vy : vy * ux - vx * uy;
      if (qlrg * aqlrg >= 0) {
        return qlrg < 0.0;
      } else {
        return this.sweepx < ql.x;
      }
    } else {
      flip = pr.x < pl.x;
      ux = pr.x - pl.x;
      uy = pr.y - pl.y;
      vx = ql.x - pl.x;
      vy = ql.y - pl.y;
      const qlrg1 = (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0.0;
      flip = pr.x < pl.x;
      ux = pr.x - pl.x;
      uy = pr.y - pl.y;
      vx = qr.x - pl.x;
      vy = qr.y - pl.y;
      const aqlrg1 = (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0.0;
      if (qlrg1 == aqlrg1) {
        return qlrg1;
      } else {
        flip = qr.x < ql.x;
        ux = qr.x - ql.x;
        uy = qr.y - ql.y;
        vx = pl.x - ql.x;
        vy = pl.y - ql.y;
        const plrg1 = (flip ? uy * vx - ux * vy : vy * ux - vx * uy) >= 0.0;
        flip = qr.x < ql.x;
        ux = qr.x - ql.x;
        uy = qr.y - ql.y;
        vx = pr.x - ql.x;
        vy = pr.y - ql.y;
        const aplrg1 = (flip ? uy * vx - ux * vy : vy * ux - vx * uy) >= 0.0;
        if (plrg1 == aplrg1) {
          return plrg1;
        }
        const py =
          ((this.sweepx - pl.x) / (pr.x - pl.x)) * (pr.y - pl.y) + pl.y;
        const qy =
          ((this.sweepx - ql.x) / (qr.x - ql.x)) * (qr.y - ql.y) + ql.y;
        return py > qy;
      }
    }
  }

  clear(): void {
    this.tree!.clear();
  }

  add(e: ZPP_SimpleSeg): ZPP_SimpleSeg {
    e.node = this.tree!.insert(e);
    const nxt = this.tree!.successor_node(e.node);
    const pre = this.tree!.predecessor_node(e.node);
    if (nxt != null) {
      e.next = nxt.data as ZPP_SimpleSeg;
      (nxt.data as ZPP_SimpleSeg).prev = e;
    }
    if (pre != null) {
      e.prev = pre.data as ZPP_SimpleSeg;
      (pre.data as ZPP_SimpleSeg).next = e;
    }
    return e;
  }

  remove(e: ZPP_SimpleSeg): void {
    const nxt = this.tree!.successor_node(e.node!);
    const pre = this.tree!.predecessor_node(e.node!);
    if (nxt != null) {
      (nxt.data as ZPP_SimpleSeg).prev = e.prev;
    }
    if (pre != null) {
      (pre.data as ZPP_SimpleSeg).next = e.next;
    }
    this.tree!.remove_node(e.node!);
    e.node = null;
  }

  intersect(p: ZPP_SimpleSeg | null, q: ZPP_SimpleSeg | null): boolean {
    if (p == null || q == null) {
      return false;
    } else if (p.left == q.left || p.left == q.right || p.right == q.left || p.right == q.right) {
      return false;
    } else {
      const pl = p.left!; const pr = p.right!; const ql = q.left!; const qr = q.right!;
      const lsign =
        (ql.x - pl.x) * (pr.y - pl.y) -
        (pr.x - pl.x) * (ql.y - pl.y);
      const rsign =
        (qr.x - pl.x) * (pr.y - pl.y) -
        (pr.x - pl.x) * (qr.y - pl.y);
      if (lsign * rsign > 0) {
        return false;
      } else {
        const lsign2 =
          (pl.x - ql.x) * (qr.y - ql.y) -
          (qr.x - ql.x) * (pl.y - ql.y);
        const rsign2 =
          (pr.x - ql.x) * (qr.y - ql.y) -
          (qr.x - ql.x) * (pr.y - ql.y);
        if (lsign2 * rsign2 > 0) {
          return false;
        } else {
          return true;
        }
      }
    }
  }

  intersection(p: ZPP_SimpleSeg | null, q: ZPP_SimpleSeg | null): ZPP_SimpleEvent | null {
    if (p == null || q == null) {
      return null;
    } else if (p.left == q.left || p.left == q.right || p.right == q.left || p.right == q.right) {
      return null;
    } else {
      const pl = p.left!; const pr = p.right!; const ql = q.left!; const qr = q.right!;
      const ux = pr.x - pl.x;
      const uy = pr.y - pl.y;
      const vx = qr.x - ql.x;
      const vy = qr.y - ql.y;
      let denom = vy * ux - vx * uy;
      if (denom == 0.0) {
        return null;
      }
      denom = 1 / denom;
      const cx = ql.x - pl.x;
      const cy = ql.y - pl.y;
      const t = (vy * cx - vx * cy) * denom;
      if (t < 0 || t > 1) {
        return null;
      }
      const s = (uy * cx - ux * cy) * denom;
      if (s < 0 || s > 1) {
        return null;
      }
      let vet: ZPP_SimpleVert;
      if (s == 0 || s == 1 || t == 0 || t == 1) {
        let cases = s == 0;
        if (s == 1 && cases) {
          throw new Error("corner case 1a");
        } else if (s == 1) {
          cases = true;
        }
        if (t == 0 && cases) {
          throw new Error("corner case 1b");
        } else if (t == 0) {
          cases = true;
        }
        if (t == 1 && cases) {
          throw new Error("corner case 1c");
        }
        vet = (s == 0 ? ql : s == 1 ? qr : t == 0 ? pl : pr) as ZPP_SimpleVert;
      } else {
        const x = 0.5 * (pl.x + ux * t + ql.x + vx * s);
        const y = 0.5 * (pl.y + uy * t + ql.y + vy * s);
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
        vet = ret;
      }
      let ret1: ZPP_SimpleEvent;
      if (ZPP_SimpleEvent.zpp_pool == null) {
        ret1 = new ZPP_SimpleEvent();
      } else {
        ret1 = ZPP_SimpleEvent.zpp_pool;
        ZPP_SimpleEvent.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.vertex = vet;
      const ret2 = ret1;
      ret2.type = 0;
      ret2.segment = p;
      ret2.segment2 = q;
      return ret2;
    }
  }
}
