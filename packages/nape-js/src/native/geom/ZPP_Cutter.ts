/**
 * ZPP_Cutter — Internal polygon cutting algorithm for the nape physics engine.
 *
 * Cuts a polygon along a line defined by two endpoints, producing a list of
 * sub-polygons. Uses union-find for path tracking and merge-sort for
 * intersection ordering.
 */

import { ZPP_CutVert } from "./ZPP_CutVert";
import { ZPP_CutInt } from "./ZPP_CutInt";
import { ZPP_GeomVert, disposeGeomVertWrap } from "./ZPP_GeomVert";
import { getNape } from "../../core/engine";
import { Config } from "../../Config";

/**
 * Side for a run of on-line vertices (starting at `a`) whose neighbours are
 * both on side `side`: `side`, unless the run contains an edge lying on the
 * line and the polygon interior also lies just across the line from that edge
 * (unit normal `nx, ny` points to the positive side) — then the cut runs
 * along the edge and the run is assigned the opposite side, so its two ends
 * become vertex crossings that split the lobes on `side`.
 *
 * A single touching vertex is left on `side`: flipping it would put two
 * crossings on one vertex, which the path splitting below cannot represent.
 */
function touchSide(
  P: ZPP_GeomVert | null,
  a: ZPP_CutVert,
  side: boolean,
  nx: number,
  ny: number,
): boolean {
  const b = a.next!;
  if (b.value != 0) return side;
  const x = (a.posx + b.posx) * 0.5;
  const y = (a.posy + b.posy) * 0.5;
  const off = side ? -1e-8 : 1e-8;
  return insidePoly(P, x + nx * off, y + ny * off) ? !side : side;
}

/** Absolute area of a GeomVert ring. */
function ringArea(P: ZPP_GeomVert): number {
  let a = 0;
  let p = P;
  do {
    const q = p.next!;
    a += p.x * q.y - q.x * p.y;
    p = q;
  } while (p != P);
  return Math.abs(a) * 0.5;
}

function allocGeomVert(x: number, y: number): ZPP_GeomVert {
  const ret: ZPP_GeomVert = ZPP_GeomVert.get(x, y);
  return ret;
}

/**
 * Find a pinch in a ring: a vertex `v` that shares its position with another,
 * non-adjacent vertex `u`. A vertex lying inside a non-incident edge is turned
 * into such a pair by inserting a copy of it into that edge. Returns `[u, v]`,
 * or null when the ring has no pinch (always the case for a simple ring).
 * Only vertices on the cut line (`onLine`) can be pinch points.
 */
function findPinch(
  P: ZPP_GeomVert,
  onLine: (x: number, y: number) => boolean,
): [ZPP_GeomVert, ZPP_GeomVert] | null {
  let v = P;
  do {
    if (!onLine(v.x, v.y)) {
      v = v.next!;
      continue;
    }
    let a = v.next!;
    while (a != v.prev) {
      const b = a.next!;
      if (a.x == v.x && a.y == v.y) return [a, v];
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const len2 = ex * ex + ey * ey;
      const wx = v.x - a.x;
      const wy = v.y - a.y;
      const dot = wx * ex + wy * ey;
      if (
        dot > 0 &&
        dot < len2 &&
        Math.abs(wx * ey - wy * ex) <= Config.epsilon * Math.sqrt(len2) &&
        !(b.x == v.x && b.y == v.y)
      ) {
        const u = allocGeomVert(v.x, v.y);
        u.prev = a;
        u.next = b;
        a.next = u;
        b.prev = u;
        return [u, v];
      }
      a = b;
    }
    v = v.next!;
  } while (v != P);
  return null;
}

/**
 * Split a ring at every pinch into rings that touch nowhere. The cut leaves a
 * pinch when the line only touches a reflex vertex: the lobes on that side
 * come back as one ring that meets itself at the vertex.
 */
function splitPinches(P: ZPP_GeomVert, onLine: (x: number, y: number) => boolean): ZPP_GeomVert[] {
  const todo = [P];
  const done: ZPP_GeomVert[] = [];
  while (todo.length > 0) {
    const R = todo.pop()!;
    if (R.next == R || R.next!.next == R) {
      done.push(R);
      continue;
    }
    const pinch = findPinch(R, onLine);
    if (pinch == null) {
      done.push(R);
      continue;
    }
    // Swapping the successors of u and v closes off the run between them.
    const [u, v] = pinch;
    const a = u.next!;
    const c = v.next!;
    u.next = c;
    c.prev = u;
    v.next = a;
    a.prev = v;
    todo.push(u, v);
  }
  return done;
}

/** Even-odd point-in-polygon on a GeomVert ring. */
function insidePoly(P: ZPP_GeomVert | null, x: number, y: number): boolean {
  let ret = false;
  if (P == null) return ret;
  let p = P;
  do {
    const q = p.prev!;
    if (((p.y < y && q.y >= y) || (q.y < y && p.y >= y)) && (p.x <= x || q.x <= x)) {
      if (p.x + ((y - p.y) / (q.y - p.y)) * (q.x - p.x) < x) {
        ret = !ret;
      }
    }
    p = p.next!;
  } while (p != P);
  return ret;
}

/**
 * Unlink `v` from its circular vertex ring, free it to the pool and return
 * its predecessor (null when `v` was the ring's only vertex).
 */
function eraseRingVert(v: any): any {
  let ret = null;
  if (v.prev != v) {
    ret = v.prev;
    v.prev.next = v.next;
    v.next.prev = v.prev;
  }
  v.free();
  v.next = ZPP_GeomVert.zpp_pool;
  ZPP_GeomVert.zpp_pool = v;
  return ret;
}

export class ZPP_Cutter {
  /** Internal list of intersections (ZNPList_ZPP_CutInt), lazily created. */
  static ints: any = null;

  /** Internal list of paths (ZNPList_ZPP_CutVert), lazily created. */
  static paths: any = null;

  /**
   * Cut polygon P along the line from _start to _end.
   *
   * @param P       Head of the polygon vertex ring (ZPP_GeomVert)
   * @param _start  Start point (public Vec2)
   * @param _end    End point (public Vec2)
   * @param bstart  Whether the cut line is bounded at the start
   * @param bend    Whether the cut line is bounded at the end
   * @param output  Optional GeomPolyList to append results to
   * @returns       GeomPolyList of resulting sub-polygons
   */
  static run(
    P: ZPP_GeomVert | null,
    _start: any,
    _end: any,
    bstart: boolean,
    bend: boolean,
    output: any,
  ): any {
    const napeNs = getNape();
    const zpp_nape = napeNs.__zpp;

    if (_start != null && _start.zpp_disp) {
      throw new Error("Vec2 has been disposed and cannot be used!");
    }
    const _this = _start.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    const px = _start.zpp_inner.x;
    if (_start != null && _start.zpp_disp) {
      throw new Error("Vec2 has been disposed and cannot be used!");
    }
    const _this1 = _start.zpp_inner;
    if (_this1._validate != null) {
      _this1._validate();
    }
    const py = _start.zpp_inner.y;
    if (_end != null && _end.zpp_disp) {
      throw new Error("Vec2 has been disposed and cannot be used!");
    }
    const _this2 = _end.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    const dx = _end.zpp_inner.x - px;
    if (_end != null && _end.zpp_disp) {
      throw new Error("Vec2 has been disposed and cannot be used!");
    }
    const _this3 = _end.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    const dy = _end.zpp_inner.y - py;
    const min = bstart ? 0 : -Infinity;
    const max = bend ? 1 : Infinity;
    const crx = -(py * dx - px * dy);
    let verts: ZPP_CutVert | null = null;
    let clashes = false;
    let p = P;
    while (true) {
      let c: ZPP_CutVert;
      if (ZPP_CutVert.zpp_pool == null) {
        c = new ZPP_CutVert();
      } else {
        c = ZPP_CutVert.zpp_pool;
        ZPP_CutVert.zpp_pool = c.next;
        c.next = null;
      }
      c.vert = p;
      c.posx = p!.x;
      c.posy = p!.y;
      c.value = c.posy * dx - c.posx * dy + crx;
      c.positive = c.value > 0;
      if (c.value == 0) {
        clashes = true;
      }
      const obj = c;
      if (verts == null) {
        obj.prev = obj.next = obj;
      } else {
        obj.prev = verts;
        obj.next = verts.next;
        verts.next!.prev = obj;
        verts.next = obj;
      }
      verts = obj;
      p = p!.next;
      if (!(p != P)) {
        break;
      }
    }
    if (clashes) {
      let start: ZPP_CutVert | null = null;
      const F = verts;
      const L = verts;
      if (F != null) {
        let nite = F;
        while (true) {
          const p1 = nite;
          if (p1.value != 0.0) {
            start = p1;
            break;
          }
          nite = nite.next!;
          if (!(nite != L)) {
            break;
          }
        }
      }
      let nx: number;
      let ny: number;
      nx = dx;
      ny = dy;
      const d = nx * nx + ny * ny;
      const imag = 1.0 / Math.sqrt(d);
      const t = imag;
      nx *= t;
      ny *= t;
      const t1 = nx;
      nx = -ny;
      ny = t1;
      let pre: ZPP_CutVert | null = null;
      let p2 = start;
      while (true) {
        if (p2!.value != 0.0 && (pre == null || p2 == pre.next)) {
          pre = p2;
          p2 = p2!.next;
          if (!(p2 != start)) {
            break;
          } else {
            continue;
          }
        }
        const prod = pre!.value * p2!.value;
        if (prod == 0) {
          p2 = p2!.next;
          if (!(p2 != start)) {
            break;
          } else {
            continue;
          }
        }
        const a = pre!.next;
        let positive: boolean;
        if (prod > 0) {
          // Touching run: both neighbours on one side. If the polygon also
          // lies just across the line from it (a reflex touch), the cut
          // passes through the run, which must then split that side.
          positive = touchSide(P, a!, pre!.positive, nx, ny);
        } else {
          const b = a!.next;
          let midx: number;
          let midy: number;
          midx = a!.posx + b!.posx;
          midy = a!.posy + b!.posy;
          const t2 = 0.5;
          midx *= t2;
          midy *= t2;
          const x = midx + nx * 1e-8;
          const y = midy + ny * 1e-8;
          let ret = false;
          const F1 = P;
          const L1 = P;
          if (F1 != null) {
            let nite1 = F1;
            while (true) {
              const p3 = nite1;
              const q = p3.prev;
              if (
                ((p3.y < y && q!.y >= y) || (q!.y < y && p3.y >= y)) &&
                (p3.x <= x || q!.x <= x)
              ) {
                if (p3.x + ((y - p3.y) / (q!.y - p3.y)) * (q!.x - p3.x) < x) {
                  ret = !ret;
                }
              }
              nite1 = nite1.next!;
              if (!(nite1 != L1)) {
                break;
              }
            }
          }
          positive = ret;
        }
        const F2 = a;
        const L2 = p2;
        if (F2 != null) {
          let nite2 = F2;
          while (true) {
            const q1 = nite2;
            q1.positive = positive;
            nite2 = nite2.next!;
            if (!(nite2 != L2)) {
              break;
            }
          }
        }
        pre = p2;
        p2 = p2!.next;
        if (!(p2 != start)) {
          break;
        }
      }
      while (true) {
        if (p2!.value != 0.0 && (pre == null || p2 == pre!.next)) {
          break;
        }
        const prod1 = pre!.value * p2!.value;
        if (prod1 == 0) {
          break;
        }
        const a1 = pre!.next;
        let positive1: boolean;
        if (prod1 > 0) {
          // Touching run: both neighbours on one side. If the polygon also
          // lies just across the line from it (a reflex touch), the cut
          // passes through the run, which must then split that side.
          positive1 = touchSide(P, a1!, pre!.positive, nx, ny);
        } else {
          const b1 = a1!.next;
          let midx1: number;
          let midy1: number;
          midx1 = a1!.posx + b1!.posx;
          midy1 = a1!.posy + b1!.posy;
          const t3 = 0.5;
          midx1 *= t3;
          midy1 *= t3;
          const x1 = midx1 + nx * 1e-8;
          const y1 = midy1 + ny * 1e-8;
          let ret1 = false;
          const F3 = P;
          const L3 = P;
          if (F3 != null) {
            let nite3 = F3;
            while (true) {
              const p4 = nite3;
              const q2 = p4.prev;
              if (
                ((p4.y < y1 && q2!.y >= y1) || (q2!.y < y1 && p4.y >= y1)) &&
                (p4.x <= x1 || q2!.x <= x1)
              ) {
                if (p4.x + ((y1 - p4.y) / (q2!.y - p4.y)) * (q2!.x - p4.x) < x1) {
                  ret1 = !ret1;
                }
              }
              nite3 = nite3.next!;
              if (!(nite3 != L3)) {
                break;
              }
            }
          }
          positive1 = ret1;
        }
        const F4 = a1;
        const L4 = p2;
        if (F4 != null) {
          let nite4 = F4;
          while (true) {
            const q3 = nite4;
            q3.positive = positive1;
            nite4 = nite4.next!;
            if (!(nite4 != L4)) {
              break;
            }
          }
        }
        break;
      }
    }
    if (ZPP_Cutter.ints == null) {
      ZPP_Cutter.ints = new zpp_nape.util.ZNPList_ZPP_CutInt();
    }
    if (ZPP_Cutter.paths == null) {
      ZPP_Cutter.paths = new zpp_nape.util.ZNPList_ZPP_CutVert();
    }
    // eslint-disable-next-line no-useless-assignment
    let start1: ZPP_GeomVert | null = null;
    const x2 = verts.posx;
    const y2 = verts.posy;
    const ret2: ZPP_GeomVert = ZPP_GeomVert.get(x2, y2);
    const obj1 = ret2;
    obj1.prev = obj1.next = obj1;
    start1 = obj1;
    const origin = start1;
    let ret3: ZPP_CutVert;
    if (ZPP_CutVert.zpp_pool == null) {
      ret3 = new ZPP_CutVert();
    } else {
      ret3 = ZPP_CutVert.zpp_pool;
      ZPP_CutVert.zpp_pool = ret3.next;
      ret3.next = null;
    }
    ret3.vert = start1;
    ret3.parent = ret3;
    ret3.rank = 0;
    ret3.used = false;
    const firstpath = ret3;
    ZPP_Cutter.paths.add(firstpath);
    let i = verts;
    while (true) {
      const j = i.next;
      const x3 = j!.posx;
      const y3 = j!.posy;
      const ret4: ZPP_GeomVert = ZPP_GeomVert.get(x3, y3);
      const pj = ret4;
      if (i.positive == j!.positive) {
        const obj2 = pj;
        if (start1 == null) {
          obj2.prev = obj2.next = obj2;
          start1 = obj2;
        } else {
          obj2.next = start1;
          obj2.prev = start1.prev;
          start1.prev!.next = obj2;
          start1.prev = obj2;
        }
      } else {
        const ux = j!.posx - i.posx;
        const uy = j!.posy - i.posy;
        let denom = dy * ux - dx * uy;
        denom = 1 / denom;
        const pax = px - i.posx;
        const pay = py - i.posy;
        const s = (uy * pax - ux * pay) * denom;
        if (s < min || s > max) {
          const tmp = ZPP_Cutter.ints;
          let virtualint: boolean = true;
          if (virtualint == null) {
            virtualint = false;
          }
          const ret5: ZPP_CutInt = ZPP_CutInt.get(s, null, null, null, null, virtualint, false);
          tmp.add(ret5);
          const obj3 = pj;
          if (start1 == null) {
            obj3.prev = obj3.next = obj3;
            start1 = obj3;
          } else {
            obj3.next = start1;
            obj3.prev = start1.prev;
            start1.prev!.next = obj3;
            start1.prev = obj3;
          }
        } else if (i.value == 0) {
          const endof = start1!.prev;
          // eslint-disable-next-line no-useless-assignment
          start1 = null;
          const x4 = endof!.x;
          const y4 = endof!.y;
          const ret6: ZPP_GeomVert = ZPP_GeomVert.get(x4, y4);
          const obj4 = ret6;
          obj4.prev = obj4.next = obj4;
          start1 = obj4;
          const obj5 = pj;
          if (start1 == null) {
            obj5.prev = obj5.next = obj5;
            start1 = obj5;
          } else {
            obj5.next = start1;
            obj5.prev = start1.prev;
            start1.prev!.next = obj5;
            start1.prev = obj5;
          }
          const prepath = ZPP_Cutter.paths.head.elt;
          const tmp1 = ZPP_Cutter.paths;
          let ret7: ZPP_CutVert;
          if (ZPP_CutVert.zpp_pool == null) {
            ret7 = new ZPP_CutVert();
          } else {
            ret7 = ZPP_CutVert.zpp_pool;
            ZPP_CutVert.zpp_pool = ret7.next;
            ret7.next = null;
          }
          ret7.vert = start1;
          ret7.parent = ret7;
          ret7.rank = 0;
          ret7.used = false;
          tmp1.add(ret7);
          const postpath = ZPP_Cutter.paths.head.elt;
          const tmp2 = ZPP_Cutter.ints;
          let virtualint1: boolean = true;
          if (virtualint1 == null) {
            virtualint1 = false;
          }
          const ret8: ZPP_CutInt = ZPP_CutInt.get(
            s,
            endof,
            start1,
            prepath,
            postpath,
            virtualint1,
            false,
          );
          tmp2.add(ret8);
        } else if (j!.value == 0) {
          const obj6 = pj;
          if (start1 == null) {
            obj6.prev = obj6.next = obj6;
            start1 = obj6;
          } else {
            obj6.next = start1;
            obj6.prev = start1.prev;
            start1.prev!.next = obj6;
            start1.prev = obj6;
          }
          const endof1 = start1!.prev;
          // eslint-disable-next-line no-useless-assignment
          start1 = null;
          const x5 = j!.posx;
          const y5 = j!.posy;
          const ret9: ZPP_GeomVert = ZPP_GeomVert.get(x5, y5);
          const obj7 = ret9;
          obj7.prev = obj7.next = obj7;
          start1 = obj7;
          const prepath1 = ZPP_Cutter.paths.head.elt;
          const tmp3 = ZPP_Cutter.paths;
          let ret10: ZPP_CutVert;
          if (ZPP_CutVert.zpp_pool == null) {
            ret10 = new ZPP_CutVert();
          } else {
            ret10 = ZPP_CutVert.zpp_pool;
            ZPP_CutVert.zpp_pool = ret10.next;
            ret10.next = null;
          }
          ret10.vert = start1;
          ret10.parent = ret10;
          ret10.rank = 0;
          ret10.used = false;
          tmp3.add(ret10);
          const postpath1 = ZPP_Cutter.paths.head.elt;
          const tmp4 = ZPP_Cutter.ints;
          let virtualint2: boolean = true;
          if (virtualint2 == null) {
            virtualint2 = false;
          }
          const ret11: ZPP_CutInt = ZPP_CutInt.get(
            s,
            endof1,
            start1,
            prepath1,
            postpath1,
            virtualint2,
            false,
          );
          tmp4.add(ret11);
        } else {
          const t4 = (dy * pax - dx * pay) * denom;
          let qx: number;
          let qy: number;
          qx = i.posx;
          qy = i.posy;
          const t5 = t4;
          qx += ux * t5;
          qy += uy * t5;
          const ret12: ZPP_GeomVert = ZPP_GeomVert.get(qx, qy);
          const obj8 = ret12;
          if (start1 == null) {
            obj8.prev = obj8.next = obj8;
            start1 = obj8;
          } else {
            obj8.next = start1;
            obj8.prev = start1.prev;
            start1.prev!.next = obj8;
            start1.prev = obj8;
          }
          const endof2 = start1!.prev;
          // eslint-disable-next-line no-useless-assignment
          start1 = null;
          const ret13: ZPP_GeomVert = ZPP_GeomVert.get(qx, qy);
          const obj9 = ret13;
          obj9.prev = obj9.next = obj9;
          start1 = obj9;
          const obj10 = pj;
          if (start1 == null) {
            obj10.prev = obj10.next = obj10;
            start1 = obj10;
          } else {
            obj10.next = start1;
            obj10.prev = start1.prev;
            start1.prev!.next = obj10;
            start1.prev = obj10;
          }
          const prepath2 = ZPP_Cutter.paths.head.elt;
          const tmp5 = ZPP_Cutter.paths;
          let ret14: ZPP_CutVert;
          if (ZPP_CutVert.zpp_pool == null) {
            ret14 = new ZPP_CutVert();
          } else {
            ret14 = ZPP_CutVert.zpp_pool;
            ZPP_CutVert.zpp_pool = ret14.next;
            ret14.next = null;
          }
          ret14.vert = start1;
          ret14.parent = ret14;
          ret14.rank = 0;
          ret14.used = false;
          tmp5.add(ret14);
          const postpath2 = ZPP_Cutter.paths.head.elt;
          const tmp6 = ZPP_Cutter.ints;
          let virtualint3: boolean = false;
          if (virtualint3 == null) {
            virtualint3 = false;
          }
          const ret15: ZPP_CutInt = ZPP_CutInt.get(
            s,
            endof2,
            start1,
            prepath2,
            postpath2,
            virtualint3,
            false,
          );
          tmp6.add(ret15);
        }
      }
      i = i.next!;
      if (!(i != verts)) {
        break;
      }
    }
    const endof3 = start1!.prev;
    endof3!.next!.prev = origin!.prev;
    origin!.prev!.next = endof3!.next;
    endof3!.next = origin;
    origin!.prev = endof3;
    const lastpath = ZPP_Cutter.paths.head.elt;
    ZPP_CutVert.union(firstpath, lastpath);
    const xxlist = ZPP_Cutter.ints;
    if (xxlist.head != null && xxlist.head.next != null) {
      let head = xxlist.head;
      let tail: any;
      let left: any;
      let right: any;
      let nxt4: any;
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
              nxt4 = right;
              right = right.next;
              --rightSize;
            } else if (rightSize == 0 || right == null) {
              nxt4 = left;
              left = left.next;
              --leftSize;
            } else if (left.elt.time < right.elt.time) {
              nxt4 = left;
              left = left.next;
              --leftSize;
            } else {
              nxt4 = right;
              right = right.next;
              --rightSize;
            }
            if (tail != null) {
              tail.next = nxt4;
            } else {
              head = nxt4;
            }
            tail = nxt4;
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
    while (ZPP_Cutter.ints.head != null) {
      const i1 = ZPP_Cutter.ints.pop_unsafe();
      const j1 = ZPP_Cutter.ints.pop_unsafe();
      // A crossing exactly at an on-line vertex is flagged virtual, like one
      // outside the cut's bounds, but unlike those it has already split the
      // path (start != null). Paired with a real crossing it bounds a chord
      // through the polygon, so it must be stitched as a real crossing rather
      // than have the real one undone.
      if (i1.virtualint != j1.virtualint) {
        const v = i1.virtualint ? i1 : j1;
        if (v.start != null) {
          v.virtualint = false;
        }
      }
      if (!i1.virtualint && !j1.virtualint) {
        i1.end.next.prev = j1.start.prev;
        j1.start.prev.next = i1.end.next;
        i1.end.next = j1.start;
        j1.start.prev = i1.end;
        j1.end.next.prev = i1.start.prev;
        i1.start.prev.next = j1.end.next;
        j1.end.next = i1.start;
        i1.start.prev = j1.end;
        ZPP_CutVert.union(i1.path0, j1.path1);
        ZPP_CutVert.union(i1.path1, j1.path0);
      } else if (i1.virtualint && !j1.virtualint) {
        j1.end = eraseRingVert(j1.end);
        if (!j1.vertex) {
          if (j1.end != j1.path0.vert) {
            j1.start.x = j1.end.x;
            j1.start.y = j1.end.y;
            j1.end = eraseRingVert(j1.end);
          } else {
            const n = j1.start.next;
            j1.start.x = n.x;
            j1.start.y = n.y;
            eraseRingVert(n);
          }
        }
        j1.end.next.prev = j1.start.prev;
        j1.start.prev.next = j1.end.next;
        j1.end.next = j1.start;
        j1.start.prev = j1.end;
        ZPP_CutVert.union(j1.path0, j1.path1);
      } else if (j1.virtualint && !i1.virtualint) {
        i1.end = eraseRingVert(i1.end);
        if (!i1.vertex) {
          if (i1.end != i1.path0.vert) {
            i1.start.x = i1.end.x;
            i1.start.y = i1.end.y;
            i1.end = eraseRingVert(i1.end);
          } else {
            const n1 = i1.start.next;
            i1.start.x = n1.x;
            i1.start.y = n1.y;
            eraseRingVert(n1);
          }
        }
        i1.end.next.prev = i1.start.prev;
        i1.start.prev.next = i1.end.next;
        i1.end.next = i1.start;
        i1.start.prev = i1.end;
        ZPP_CutVert.union(i1.path0, i1.path1);
      }
      const o36 = i1;
      o36.end = o36.start = null;
      o36.path0 = o36.path1 = null;
      o36.next = ZPP_CutInt.zpp_pool;
      ZPP_CutInt.zpp_pool = o36;
      const o37 = j1;
      o37.end = o37.start = null;
      o37.path0 = o37.path1 = null;
      o37.next = ZPP_CutInt.zpp_pool;
      ZPP_CutInt.zpp_pool = o37;
    }
    const ret16 = output == null ? new napeNs.geom.GeomPolyList() : output;
    const lineTol = Config.epsilon * Math.sqrt(dx * dx + dy * dy);
    const onLine = (x: number, y: number) => Math.abs(y * dx - x * dy + crx) <= lineTol;
    let cx_ite = ZPP_Cutter.paths.head;
    while (cx_ite != null) {
      const p5 = cx_ite.elt;
      const poly: any = ZPP_CutVert.find(p5);
      if (poly.used) {
        cx_ite = cx_ite.next;
        continue;
      }
      poly.used = true;
      let p6 = poly.vert;
      let skip = true;
      while (poly.vert != null && (skip || p6 != poly.vert)) {
        skip = false;
        if (p6.x == p6.next.x && p6.y == p6.next.y) {
          if (p6 == poly.vert) {
            poly.vert = p6.next == p6 ? null : p6.next;
            skip = true;
          }
          if (p6 != null && p6.prev == p6) {
            p6.next = p6.prev = null;
            p6 = null;
          } else {
            const retnodes4 = p6.next;
            p6.prev.next = p6.next;
            p6.next.prev = p6.prev;
            p6.next = p6.prev = null;
            p6 = retnodes4;
          }
        } else {
          p6 = p6.next;
        }
      }
      const rings = poly.vert != null ? splitPinches(poly.vert, onLine) : [];
      for (const R of rings) {
        if (ringArea(R) < Config.epsilon) {
          // No area: the leftover of a cut running along a boundary edge
          // between two on-line vertices. Release it instead of emitting it.
          let v: ZPP_GeomVert | null = R;
          do {
            const nx: ZPP_GeomVert | null = v!.next;
            v!.next = v!.prev = null;
            disposeGeomVertWrap(v!);
            v!.next = ZPP_GeomVert.zpp_pool;
            ZPP_GeomVert.zpp_pool = v!;
            v = nx;
          } while (v != R && v != null);
          continue;
        }
        const gp = napeNs.geom.GeomPoly.get();
        gp.zpp_inner.vertices = R;
        if (ret16.zpp_inner.reverse_flag) {
          ret16.push(gp);
        } else {
          ret16.unshift(gp);
        }
      }
      poly.vert = null;
      cx_ite = cx_ite.next;
    }
    while (ZPP_Cutter.paths.head != null) {
      const p7 = ZPP_Cutter.paths.pop_unsafe();
      const o38 = p7;
      o38.vert = null;
      o38.parent = null;
      o38.next = ZPP_CutVert.zpp_pool;
      ZPP_CutVert.zpp_pool = o38;
    }
    while (verts != null)
      if (verts != null && verts.prev == verts) {
        verts.next = verts.prev = null;
        const o39 = verts;
        o39.vert = null;
        o39.parent = null;
        o39.next = ZPP_CutVert.zpp_pool;
        ZPP_CutVert.zpp_pool = o39;
        verts = null;
      } else {
        const retnodes5: ZPP_CutVert | null = verts.next;
        verts.prev!.next = verts.next;
        verts.next!.prev = verts.prev;
        verts.next = verts.prev = null;
        const o40 = verts;
        o40.vert = null;
        o40.parent = null;
        o40.next = ZPP_CutVert.zpp_pool;
        ZPP_CutVert.zpp_pool = o40;
        verts = retnodes5;
      }
    return ret16;
  }
}
