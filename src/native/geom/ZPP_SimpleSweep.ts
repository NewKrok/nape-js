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
import { ZPP_Set_ZPP_SimpleSeg } from "../util/ZNPRegistry";

type Any = any;

export class ZPP_SimpleSweep {
  static __name__ = ["zpp_nape", "geom", "ZPP_SimpleSweep"];

  sweepx = 0.0;
  tree: Any = null;

  __class__: Any = ZPP_SimpleSweep;

  constructor() {
    if (ZPP_Set_ZPP_SimpleSeg.zpp_pool == null) {
      this.tree = new ZPP_Set_ZPP_SimpleSeg();
    } else {
      this.tree = ZPP_Set_ZPP_SimpleSeg.zpp_pool;
      ZPP_Set_ZPP_SimpleSeg.zpp_pool = this.tree.next;
      this.tree.next = null;
    }
    this.tree.lt = (p: Any, q: Any) => this.edge_lt(p, q);
    this.tree.swapped = (p: Any, q: Any) => this.swap_nodes(p, q);
  }

  swap_nodes(p: Any, q: Any): void {
    const t = p.node;
    p.node = q.node;
    q.node = t;
  }

  edge_lt(p: Any, q: Any): boolean {
    let ux: number;
    let uy: number;
    let vx: number;
    let vy: number;
    let flip: boolean;
    if (p.left == q.left && p.right == q.right) {
      return false;
    } else if (p.left == q.right) {
      if (p.left.x == p.right.x) {
        if (p.left.y < p.right.y) {
          return p.left.y > q.left.y;
        } else {
          return p.right.y > q.left.y;
        }
      } else {
        flip = p.right.x < p.left.x;
        ux = p.right.x - p.left.x;
        uy = p.right.y - p.left.y;
        vx = q.left.x - p.left.x;
        vy = q.left.y - p.left.y;
        return (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0;
      }
    } else if (p.right == q.left) {
      let tmp: boolean;
      if (q.left.x == q.right.x) {
        tmp = q.left.y < q.right.y ? q.left.y > p.left.y : q.right.y > p.left.y;
      } else {
        flip = q.right.x < q.left.x;
        ux = q.right.x - q.left.x;
        uy = q.right.y - q.left.y;
        vx = p.left.x - q.left.x;
        vy = p.left.y - q.left.y;
        tmp = (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0;
      }
      return !tmp;
    } else if (p.left == q.left) {
      if (p.left.x == p.right.x) {
        if (p.left.y < p.right.y) {
          return p.left.y > q.right.y;
        } else {
          return p.right.y > q.right.y;
        }
      } else {
        flip = p.right.x < p.left.x;
        ux = p.right.x - p.left.x;
        uy = p.right.y - p.left.y;
        vx = q.right.x - p.left.x;
        vy = q.right.y - p.left.y;
        return (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0;
      }
    } else if (p.right == q.right) {
      if (p.left.x == p.right.x) {
        if (p.left.y < p.right.y) {
          return p.left.y > q.left.y;
        } else {
          return p.right.y > q.left.y;
        }
      } else {
        flip = p.right.x < p.left.x;
        ux = p.right.x - p.left.x;
        uy = p.right.y - p.left.y;
        vx = q.left.x - p.left.x;
        vy = q.left.y - p.left.y;
        return (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0;
      }
    }
    if (p.left.x == p.right.x) {
      if (q.left.x == q.right.x) {
        const pmax = p.left.y < p.right.y ? p.right : p.left;
        const qmax = q.left.y < q.right.y ? q.right : q.left;
        return pmax.y > qmax.y;
      } else {
        flip = q.right.x < q.left.x;
        ux = q.right.x - q.left.x;
        uy = q.right.y - q.left.y;
        vx = p.left.x - q.left.x;
        vy = p.left.y - q.left.y;
        const plrg = flip ? uy * vx - ux * vy : vy * ux - vx * uy;
        flip = q.right.x < q.left.x;
        ux = q.right.x - q.left.x;
        uy = q.right.y - q.left.y;
        vx = p.right.x - q.left.x;
        vy = p.right.y - q.left.y;
        const aplrg = flip ? uy * vx - ux * vy : vy * ux - vx * uy;
        if (plrg * aplrg >= 0) {
          return plrg >= 0.0;
        } else {
          return this.sweepx >= p.left.x;
        }
      }
    } else if (q.left.x == q.right.x) {
      flip = p.right.x < p.left.x;
      ux = p.right.x - p.left.x;
      uy = p.right.y - p.left.y;
      vx = q.left.x - p.left.x;
      vy = q.left.y - p.left.y;
      const qlrg = flip ? uy * vx - ux * vy : vy * ux - vx * uy;
      flip = p.right.x < p.left.x;
      ux = p.right.x - p.left.x;
      uy = p.right.y - p.left.y;
      vx = q.right.x - p.left.x;
      vy = q.right.y - p.left.y;
      const aqlrg = flip ? uy * vx - ux * vy : vy * ux - vx * uy;
      if (qlrg * aqlrg >= 0) {
        return qlrg < 0.0;
      } else {
        return this.sweepx < q.left.x;
      }
    } else {
      flip = p.right.x < p.left.x;
      ux = p.right.x - p.left.x;
      uy = p.right.y - p.left.y;
      vx = q.left.x - p.left.x;
      vy = q.left.y - p.left.y;
      const qlrg1 = (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0.0;
      flip = p.right.x < p.left.x;
      ux = p.right.x - p.left.x;
      uy = p.right.y - p.left.y;
      vx = q.right.x - p.left.x;
      vy = q.right.y - p.left.y;
      const aqlrg1 = (flip ? uy * vx - ux * vy : vy * ux - vx * uy) < 0.0;
      if (qlrg1 == aqlrg1) {
        return qlrg1;
      } else {
        flip = q.right.x < q.left.x;
        ux = q.right.x - q.left.x;
        uy = q.right.y - q.left.y;
        vx = p.left.x - q.left.x;
        vy = p.left.y - q.left.y;
        const plrg1 = (flip ? uy * vx - ux * vy : vy * ux - vx * uy) >= 0.0;
        flip = q.right.x < q.left.x;
        ux = q.right.x - q.left.x;
        uy = q.right.y - q.left.y;
        vx = p.right.x - q.left.x;
        vy = p.right.y - q.left.y;
        const aplrg1 = (flip ? uy * vx - ux * vy : vy * ux - vx * uy) >= 0.0;
        if (plrg1 == aplrg1) {
          return plrg1;
        }
        const py =
          ((this.sweepx - p.left.x) / (p.right.x - p.left.x)) * (p.right.y - p.left.y) + p.left.y;
        const qy =
          ((this.sweepx - q.left.x) / (q.right.x - q.left.x)) * (q.right.y - q.left.y) + q.left.y;
        return py > qy;
      }
    }
  }

  clear(): void {
    this.tree.clear();
  }

  add(e: Any): Any {
    e.node = this.tree.insert(e);
    const nxt = this.tree.successor_node(e.node);
    const pre = this.tree.predecessor_node(e.node);
    if (nxt != null) {
      e.next = nxt.data;
      nxt.data.prev = e;
    }
    if (pre != null) {
      e.prev = pre.data;
      pre.data.next = e;
    }
    return e;
  }

  remove(e: Any): void {
    const nxt = this.tree.successor_node(e.node);
    const pre = this.tree.predecessor_node(e.node);
    if (nxt != null) {
      nxt.data.prev = e.prev;
    }
    if (pre != null) {
      pre.data.next = e.next;
    }
    this.tree.remove_node(e.node);
    e.node = null;
  }

  intersect(p: Any, q: Any): boolean {
    if (p == null || q == null) {
      return false;
    } else if (p.left == q.left || p.left == q.right || p.right == q.left || p.right == q.right) {
      return false;
    } else {
      const lsign =
        (q.left.x - p.left.x) * (p.right.y - p.left.y) -
        (p.right.x - p.left.x) * (q.left.y - p.left.y);
      const rsign =
        (q.right.x - p.left.x) * (p.right.y - p.left.y) -
        (p.right.x - p.left.x) * (q.right.y - p.left.y);
      if (lsign * rsign > 0) {
        return false;
      } else {
        const lsign2 =
          (p.left.x - q.left.x) * (q.right.y - q.left.y) -
          (q.right.x - q.left.x) * (p.left.y - q.left.y);
        const rsign2 =
          (p.right.x - q.left.x) * (q.right.y - q.left.y) -
          (q.right.x - q.left.x) * (p.right.y - q.left.y);
        if (lsign2 * rsign2 > 0) {
          return false;
        } else {
          return true;
        }
      }
    }
  }

  intersection(p: Any, q: Any): Any {
    if (p == null || q == null) {
      return null;
    } else if (p.left == q.left || p.left == q.right || p.right == q.left || p.right == q.right) {
      return null;
    } else {
      const ux = p.right.x - p.left.x;
      const uy = p.right.y - p.left.y;
      const vx = q.right.x - q.left.x;
      const vy = q.right.y - q.left.y;
      let denom = vy * ux - vx * uy;
      if (denom == 0.0) {
        return null;
      }
      denom = 1 / denom;
      const cx = q.left.x - p.left.x;
      const cy = q.left.y - p.left.y;
      const t = (vy * cx - vx * cy) * denom;
      if (t < 0 || t > 1) {
        return null;
      }
      const s = (uy * cx - ux * cy) * denom;
      if (s < 0 || s > 1) {
        return null;
      }
      let vet: Any;
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
        vet = s == 0 ? q.left : s == 1 ? q.right : t == 0 ? p.left : p.right;
      } else {
        const x = 0.5 * (p.left.x + ux * t + q.left.x + vx * s);
        const y = 0.5 * (p.left.y + uy * t + q.left.y + vy * s);
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
