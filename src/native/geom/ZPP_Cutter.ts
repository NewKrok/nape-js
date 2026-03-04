/**
 * ZPP_Cutter — Internal polygon cutting algorithm for the nape physics engine.
 *
 * Cuts a polygon along a line defined by two endpoints, producing a list of
 * sub-polygons. Uses union-find for path tracking and merge-sort for
 * intersection ordering.
 *
 * Converted from nape-compiled.js lines 24303–26062.
 */

import { ZPP_CutVert } from "./ZPP_CutVert";
import { ZPP_CutInt } from "./ZPP_CutInt";
import { ZPP_GeomVert } from "./ZPP_GeomVert";
import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_PubPool } from "../util/ZPP_PubPool";
import { getNape } from "../../core/engine";

type Any = any;

export class ZPP_Cutter {
  static __name__ = ["zpp_nape", "geom", "ZPP_Cutter"];
  static __class__: Any = ZPP_Cutter;

  /** Internal list of intersections (ZNPList_ZPP_CutInt), lazily created. */
  static ints: Any = null;

  /** Internal list of paths (ZNPList_ZPP_CutVert), lazily created. */
  static paths: Any = null;

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
  static run(P: Any, _start: Any, _end: Any, bstart: boolean, bend: boolean, output: Any): Any {
    const napeNs = getNape();
    const zpp_nape = napeNs.__zpp;

    if (_start != null && _start.zpp_disp) {
      throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
    }
    const _this = _start.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    const px = _start.zpp_inner.x;
    if (_start != null && _start.zpp_disp) {
      throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
    }
    const _this1 = _start.zpp_inner;
    if (_this1._validate != null) {
      _this1._validate();
    }
    const py = _start.zpp_inner.y;
    if (_end != null && _end.zpp_disp) {
      throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
    }
    const _this2 = _end.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    const dx = _end.zpp_inner.x - px;
    if (_end != null && _end.zpp_disp) {
      throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
    }
    const _this3 = _end.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    const dy = _end.zpp_inner.y - py;
    const min = bstart ? 0 : -Infinity;
    const max = bend ? 1 : Infinity;
    const crx = -(py * dx - px * dy);
    let verts: Any = null;
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
      c.posx = c.vert.x;
      c.posy = c.vert.y;
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
        verts.next.prev = obj;
        verts.next = obj;
      }
      verts = obj;
      p = p.next;
      if (!(p != P)) {
        break;
      }
    }
    if (clashes) {
      let start: Any = null;
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
          nite = nite.next;
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
      let pre: Any = null;
      let p2 = start;
      while (true) {
        if (p2.value != 0.0 && (pre == null || p2 == pre.next)) {
          pre = p2;
          p2 = p2.next;
          if (!(p2 != start)) {
            break;
          } else {
            continue;
          }
        }
        const prod = pre.value * p2.value;
        if (prod == 0) {
          p2 = p2.next;
          if (!(p2 != start)) {
            break;
          } else {
            continue;
          }
        }
        const a = pre.next;
        let positive: boolean;
        if (prod > 0) {
          positive = pre.positive;
        } else {
          const b = a.next;
          let midx: number;
          let midy: number;
          midx = a.posx + b.posx;
          midy = a.posy + b.posy;
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
              if (((p3.y < y && q.y >= y) || (q.y < y && p3.y >= y)) && (p3.x <= x || q.x <= x)) {
                if (p3.x + ((y - p3.y) / (q.y - p3.y)) * (q.x - p3.x) < x) {
                  ret = !ret;
                }
              }
              nite1 = nite1.next;
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
            nite2 = nite2.next;
            if (!(nite2 != L2)) {
              break;
            }
          }
        }
        pre = p2;
        p2 = p2.next;
        if (!(p2 != start)) {
          break;
        }
      }
      while (true) {
        if (p2.value != 0.0 && (pre == null || p2 == pre.next)) {
          break;
        }
        const prod1 = pre.value * p2.value;
        if (prod1 == 0) {
          break;
        }
        const a1 = pre.next;
        let positive1: boolean;
        if (prod1 > 0) {
          positive1 = pre.positive;
        } else {
          const b1 = a1.next;
          let midx1: number;
          let midy1: number;
          midx1 = a1.posx + b1.posx;
          midy1 = a1.posy + b1.posy;
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
                ((p4.y < y1 && q2.y >= y1) || (q2.y < y1 && p4.y >= y1)) &&
                (p4.x <= x1 || q2.x <= x1)
              ) {
                if (p4.x + ((y1 - p4.y) / (q2.y - p4.y)) * (q2.x - p4.x) < x1) {
                  ret1 = !ret1;
                }
              }
              nite3 = nite3.next;
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
            nite4 = nite4.next;
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
    let start1: Any = null;
    const x2 = verts.posx;
    const y2 = verts.posy;
    let ret2: ZPP_GeomVert;
    if (ZPP_GeomVert.zpp_pool == null) {
      ret2 = new ZPP_GeomVert();
    } else {
      ret2 = ZPP_GeomVert.zpp_pool;
      ZPP_GeomVert.zpp_pool = ret2.next;
      ret2.next = null;
    }
    ret2.forced = false;
    ret2.x = x2;
    ret2.y = y2;
    const obj1 = ret2;
    if (start1 == null) {
      start1 = obj1.prev = obj1.next = obj1;
    } else {
      obj1.next = start1;
      obj1.prev = start1.prev;
      start1.prev.next = obj1;
      start1.prev = obj1;
    }
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
      const x3 = j.posx;
      const y3 = j.posy;
      let ret4: ZPP_GeomVert;
      if (ZPP_GeomVert.zpp_pool == null) {
        ret4 = new ZPP_GeomVert();
      } else {
        ret4 = ZPP_GeomVert.zpp_pool;
        ZPP_GeomVert.zpp_pool = ret4.next;
        ret4.next = null;
      }
      ret4.forced = false;
      ret4.x = x3;
      ret4.y = y3;
      const pj = ret4;
      if (i.positive == j.positive) {
        const obj2 = pj;
        if (start1 == null) {
          start1 = obj2.prev = obj2.next = obj2;
        } else {
          obj2.next = start1;
          obj2.prev = start1.prev;
          start1.prev.next = obj2;
          start1.prev = obj2;
        }
      } else {
        const ux = j.posx - i.posx;
        const uy = j.posy - i.posy;
        let denom = dy * ux - dx * uy;
        denom = 1 / denom;
        const pax = px - i.posx;
        const pay = py - i.posy;
        const s = (uy * pax - ux * pay) * denom;
        if (s < min || s > max) {
          const tmp = ZPP_Cutter.ints;
          let virtualint: Any = true;
          if (virtualint == null) {
            virtualint = false;
          }
          let ret5: ZPP_CutInt;
          if (ZPP_CutInt.zpp_pool == null) {
            ret5 = new ZPP_CutInt();
          } else {
            ret5 = ZPP_CutInt.zpp_pool;
            ZPP_CutInt.zpp_pool = ret5.next;
            ret5.next = null;
          }
          ret5.virtualint = virtualint;
          ret5.end = null;
          ret5.start = null;
          ret5.path0 = null;
          ret5.path1 = null;
          ret5.time = s;
          ret5.vertex = false;
          tmp.add(ret5);
          const obj3 = pj;
          if (start1 == null) {
            start1 = obj3.prev = obj3.next = obj3;
          } else {
            obj3.next = start1;
            obj3.prev = start1.prev;
            start1.prev.next = obj3;
            start1.prev = obj3;
          }
        } else if (i.value == 0) {
          const endof = start1.prev;
          start1 = null;
          const x4 = endof.x;
          const y4 = endof.y;
          let ret6: ZPP_GeomVert;
          if (ZPP_GeomVert.zpp_pool == null) {
            ret6 = new ZPP_GeomVert();
          } else {
            ret6 = ZPP_GeomVert.zpp_pool;
            ZPP_GeomVert.zpp_pool = ret6.next;
            ret6.next = null;
          }
          ret6.forced = false;
          ret6.x = x4;
          ret6.y = y4;
          const obj4 = ret6;
          if (start1 == null) {
            start1 = obj4.prev = obj4.next = obj4;
          } else {
            obj4.next = start1;
            obj4.prev = start1.prev;
            start1.prev.next = obj4;
            start1.prev = obj4;
          }
          const obj5 = pj;
          if (start1 == null) {
            start1 = obj5.prev = obj5.next = obj5;
          } else {
            obj5.next = start1;
            obj5.prev = start1.prev;
            start1.prev.next = obj5;
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
          let virtualint1: Any = true;
          if (virtualint1 == null) {
            virtualint1 = false;
          }
          let ret8: ZPP_CutInt;
          if (ZPP_CutInt.zpp_pool == null) {
            ret8 = new ZPP_CutInt();
          } else {
            ret8 = ZPP_CutInt.zpp_pool;
            ZPP_CutInt.zpp_pool = ret8.next;
            ret8.next = null;
          }
          ret8.virtualint = virtualint1;
          ret8.end = endof;
          ret8.start = start1;
          ret8.path0 = prepath;
          ret8.path1 = postpath;
          ret8.time = s;
          ret8.vertex = false;
          tmp2.add(ret8);
        } else if (j.value == 0) {
          const obj6 = pj;
          if (start1 == null) {
            start1 = obj6.prev = obj6.next = obj6;
          } else {
            obj6.next = start1;
            obj6.prev = start1.prev;
            start1.prev.next = obj6;
            start1.prev = obj6;
          }
          const endof1 = start1.prev;
          start1 = null;
          const x5 = j.posx;
          const y5 = j.posy;
          let ret9: ZPP_GeomVert;
          if (ZPP_GeomVert.zpp_pool == null) {
            ret9 = new ZPP_GeomVert();
          } else {
            ret9 = ZPP_GeomVert.zpp_pool;
            ZPP_GeomVert.zpp_pool = ret9.next;
            ret9.next = null;
          }
          ret9.forced = false;
          ret9.x = x5;
          ret9.y = y5;
          const obj7 = ret9;
          if (start1 == null) {
            start1 = obj7.prev = obj7.next = obj7;
          } else {
            obj7.next = start1;
            obj7.prev = start1.prev;
            start1.prev.next = obj7;
            start1.prev = obj7;
          }
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
          let virtualint2: Any = true;
          if (virtualint2 == null) {
            virtualint2 = false;
          }
          let ret11: ZPP_CutInt;
          if (ZPP_CutInt.zpp_pool == null) {
            ret11 = new ZPP_CutInt();
          } else {
            ret11 = ZPP_CutInt.zpp_pool;
            ZPP_CutInt.zpp_pool = ret11.next;
            ret11.next = null;
          }
          ret11.virtualint = virtualint2;
          ret11.end = endof1;
          ret11.start = start1;
          ret11.path0 = prepath1;
          ret11.path1 = postpath1;
          ret11.time = s;
          ret11.vertex = false;
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
          let ret12: ZPP_GeomVert;
          if (ZPP_GeomVert.zpp_pool == null) {
            ret12 = new ZPP_GeomVert();
          } else {
            ret12 = ZPP_GeomVert.zpp_pool;
            ZPP_GeomVert.zpp_pool = ret12.next;
            ret12.next = null;
          }
          ret12.forced = false;
          ret12.x = qx;
          ret12.y = qy;
          const obj8 = ret12;
          if (start1 == null) {
            start1 = obj8.prev = obj8.next = obj8;
          } else {
            obj8.next = start1;
            obj8.prev = start1.prev;
            start1.prev.next = obj8;
            start1.prev = obj8;
          }
          const endof2 = start1.prev;
          start1 = null;
          let ret13: ZPP_GeomVert;
          if (ZPP_GeomVert.zpp_pool == null) {
            ret13 = new ZPP_GeomVert();
          } else {
            ret13 = ZPP_GeomVert.zpp_pool;
            ZPP_GeomVert.zpp_pool = ret13.next;
            ret13.next = null;
          }
          ret13.forced = false;
          ret13.x = qx;
          ret13.y = qy;
          const obj9 = ret13;
          if (start1 == null) {
            start1 = obj9.prev = obj9.next = obj9;
          } else {
            obj9.next = start1;
            obj9.prev = start1.prev;
            start1.prev.next = obj9;
            start1.prev = obj9;
          }
          const obj10 = pj;
          if (start1 == null) {
            start1 = obj10.prev = obj10.next = obj10;
          } else {
            obj10.next = start1;
            obj10.prev = start1.prev;
            start1.prev.next = obj10;
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
          let virtualint3: Any = false;
          if (virtualint3 == null) {
            virtualint3 = false;
          }
          let ret15: ZPP_CutInt;
          if (ZPP_CutInt.zpp_pool == null) {
            ret15 = new ZPP_CutInt();
          } else {
            ret15 = ZPP_CutInt.zpp_pool;
            ZPP_CutInt.zpp_pool = ret15.next;
            ret15.next = null;
          }
          ret15.virtualint = virtualint3;
          ret15.end = endof2;
          ret15.start = start1;
          ret15.path0 = prepath2;
          ret15.path1 = postpath2;
          ret15.time = s;
          ret15.vertex = false;
          tmp6.add(ret15);
        }
      }
      i = i.next;
      if (!(i != verts)) {
        break;
      }
    }
    const endof3 = start1.prev;
    endof3.next.prev = origin.prev;
    origin.prev.next = endof3.next;
    endof3.next = origin;
    origin.prev = endof3;
    const lastpath = ZPP_Cutter.paths.head.elt;
    let xr: Any;
    if (firstpath == firstpath.parent) {
      xr = firstpath;
    } else {
      let obj11: Any = firstpath;
      let stack: Any = null;
      while (obj11 != obj11.parent) {
        const nxt = obj11.parent;
        obj11.parent = stack;
        stack = obj11;
        obj11 = nxt;
      }
      while (stack != null) {
        const nxt1 = stack.parent;
        stack.parent = obj11;
        stack = nxt1;
      }
      xr = obj11;
    }
    let yr: Any;
    if (lastpath == lastpath.parent) {
      yr = lastpath;
    } else {
      let obj12 = lastpath;
      let stack1: Any = null;
      while (obj12 != obj12.parent) {
        const nxt2 = obj12.parent;
        obj12.parent = stack1;
        stack1 = obj12;
        obj12 = nxt2;
      }
      while (stack1 != null) {
        const nxt3 = stack1.parent;
        stack1.parent = obj12;
        stack1 = nxt3;
      }
      yr = obj12;
    }
    if (xr != yr) {
      if (xr.rank < yr.rank) {
        xr.parent = yr;
      } else if (xr.rank > yr.rank) {
        yr.parent = xr;
      } else {
        yr.parent = xr;
        xr.rank++;
      }
    }
    const xxlist = ZPP_Cutter.ints;
    if (xxlist.head != null && xxlist.head.next != null) {
      let head = xxlist.head;
      let tail: Any;
      let left: Any;
      let right: Any;
      let nxt4: Any;
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
      if (!i1.virtualint && !j1.virtualint) {
        i1.end.next.prev = j1.start.prev;
        j1.start.prev.next = i1.end.next;
        i1.end.next = j1.start;
        j1.start.prev = i1.end;
        j1.end.next.prev = i1.start.prev;
        i1.start.prev.next = j1.end.next;
        j1.end.next = i1.start;
        i1.start.prev = j1.end;
        let xr1: Any;
        if (i1.path0 == i1.path0.parent) {
          xr1 = i1.path0;
        } else {
          let obj13 = i1.path0;
          let stack2: Any = null;
          while (obj13 != obj13.parent) {
            const nxt5 = obj13.parent;
            obj13.parent = stack2;
            stack2 = obj13;
            obj13 = nxt5;
          }
          while (stack2 != null) {
            const nxt6 = stack2.parent;
            stack2.parent = obj13;
            stack2 = nxt6;
          }
          xr1 = obj13;
        }
        let yr1: Any;
        if (j1.path1 == j1.path1.parent) {
          yr1 = j1.path1;
        } else {
          let obj14 = j1.path1;
          let stack3: Any = null;
          while (obj14 != obj14.parent) {
            const nxt7 = obj14.parent;
            obj14.parent = stack3;
            stack3 = obj14;
            obj14 = nxt7;
          }
          while (stack3 != null) {
            const nxt8 = stack3.parent;
            stack3.parent = obj14;
            stack3 = nxt8;
          }
          yr1 = obj14;
        }
        if (xr1 != yr1) {
          if (xr1.rank < yr1.rank) {
            xr1.parent = yr1;
          } else if (xr1.rank > yr1.rank) {
            yr1.parent = xr1;
          } else {
            yr1.parent = xr1;
            xr1.rank++;
          }
        }
        let xr2: Any;
        if (i1.path1 == i1.path1.parent) {
          xr2 = i1.path1;
        } else {
          let obj15 = i1.path1;
          let stack4: Any = null;
          while (obj15 != obj15.parent) {
            const nxt9 = obj15.parent;
            obj15.parent = stack4;
            stack4 = obj15;
            obj15 = nxt9;
          }
          while (stack4 != null) {
            const nxt10 = stack4.parent;
            stack4.parent = obj15;
            stack4 = nxt10;
          }
          xr2 = obj15;
        }
        let yr2: Any;
        if (j1.path0 == j1.path0.parent) {
          yr2 = j1.path0;
        } else {
          let obj16 = j1.path0;
          let stack5: Any = null;
          while (obj16 != obj16.parent) {
            const nxt11 = obj16.parent;
            obj16.parent = stack5;
            stack5 = obj16;
            obj16 = nxt11;
          }
          while (stack5 != null) {
            const nxt12 = stack5.parent;
            stack5.parent = obj16;
            stack5 = nxt12;
          }
          yr2 = obj16;
        }
        if (xr2 != yr2) {
          if (xr2.rank < yr2.rank) {
            xr2.parent = yr2;
          } else if (xr2.rank > yr2.rank) {
            yr2.parent = xr2;
          } else {
            yr2.parent = xr2;
            xr2.rank++;
          }
        }
      } else if (i1.virtualint && !j1.virtualint) {
        let tmp7: Any;
        if (j1.end != null && j1.end.prev == j1.end) {
          j1.end.next = j1.end.prev = null;
          const o = j1.end;
          if (o.wrap != null) {
            o.wrap.zpp_inner._inuse = false;
            const _this4 = o.wrap;
            if (_this4 != null && _this4.zpp_disp) {
              throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
            }
            const _this5 = _this4.zpp_inner;
            if (_this5._immutable) {
              throw new Error("Error: Vec2 is immutable");
            }
            if (_this5._isimmutable != null) {
              _this5._isimmutable();
            }
            if (_this4.zpp_inner._inuse) {
              throw new Error("Error: This Vec2 is not disposable");
            }
            const inner = _this4.zpp_inner;
            _this4.zpp_inner.outer = null;
            _this4.zpp_inner = null;
            const o1 = _this4;
            o1.zpp_pool = null;
            if (ZPP_PubPool.nextVec2 != null) {
              ZPP_PubPool.nextVec2.zpp_pool = o1;
            } else {
              ZPP_PubPool.poolVec2 = o1;
            }
            ZPP_PubPool.nextVec2 = o1;
            o1.zpp_disp = true;
            const o2 = inner;
            if (o2.outer != null) {
              o2.outer.zpp_inner = null;
              o2.outer = null;
            }
            o2._isimmutable = null;
            o2._validate = null;
            o2._invalidate = null;
            o2.next = ZPP_Vec2.zpp_pool;
            ZPP_Vec2.zpp_pool = o2;
            o.wrap = null;
          }
          o.prev = o.next = null;
          o.next = ZPP_GeomVert.zpp_pool;
          ZPP_GeomVert.zpp_pool = o;
          tmp7 = null;
        } else {
          const retnodes = j1.end.prev;
          j1.end.prev.next = j1.end.next;
          j1.end.next.prev = j1.end.prev;
          j1.end.next = j1.end.prev = null;
          const o3 = j1.end;
          if (o3.wrap != null) {
            o3.wrap.zpp_inner._inuse = false;
            const _this6 = o3.wrap;
            if (_this6 != null && _this6.zpp_disp) {
              throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
            }
            const _this7 = _this6.zpp_inner;
            if (_this7._immutable) {
              throw new Error("Error: Vec2 is immutable");
            }
            if (_this7._isimmutable != null) {
              _this7._isimmutable();
            }
            if (_this6.zpp_inner._inuse) {
              throw new Error("Error: This Vec2 is not disposable");
            }
            const inner1 = _this6.zpp_inner;
            _this6.zpp_inner.outer = null;
            _this6.zpp_inner = null;
            const o4 = _this6;
            o4.zpp_pool = null;
            if (ZPP_PubPool.nextVec2 != null) {
              ZPP_PubPool.nextVec2.zpp_pool = o4;
            } else {
              ZPP_PubPool.poolVec2 = o4;
            }
            ZPP_PubPool.nextVec2 = o4;
            o4.zpp_disp = true;
            const o5 = inner1;
            if (o5.outer != null) {
              o5.outer.zpp_inner = null;
              o5.outer = null;
            }
            o5._isimmutable = null;
            o5._validate = null;
            o5._invalidate = null;
            o5.next = ZPP_Vec2.zpp_pool;
            ZPP_Vec2.zpp_pool = o5;
            o3.wrap = null;
          }
          o3.prev = o3.next = null;
          o3.next = ZPP_GeomVert.zpp_pool;
          ZPP_GeomVert.zpp_pool = o3;
          j1.end = null;
          tmp7 = retnodes;
        }
        j1.end = tmp7;
        if (!j1.vertex) {
          if (j1.end != j1.path0.vert) {
            j1.start.x = j1.end.x;
            j1.start.y = j1.end.y;
            let tmp8: Any;
            if (j1.end != null && j1.end.prev == j1.end) {
              j1.end.next = j1.end.prev = null;
              const o6 = j1.end;
              if (o6.wrap != null) {
                o6.wrap.zpp_inner._inuse = false;
                const _this8 = o6.wrap;
                if (_this8 != null && _this8.zpp_disp) {
                  throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
                }
                const _this9 = _this8.zpp_inner;
                if (_this9._immutable) {
                  throw new Error("Error: Vec2 is immutable");
                }
                if (_this9._isimmutable != null) {
                  _this9._isimmutable();
                }
                if (_this8.zpp_inner._inuse) {
                  throw new Error("Error: This Vec2 is not disposable");
                }
                const inner2 = _this8.zpp_inner;
                _this8.zpp_inner.outer = null;
                _this8.zpp_inner = null;
                const o7 = _this8;
                o7.zpp_pool = null;
                if (ZPP_PubPool.nextVec2 != null) {
                  ZPP_PubPool.nextVec2.zpp_pool = o7;
                } else {
                  ZPP_PubPool.poolVec2 = o7;
                }
                ZPP_PubPool.nextVec2 = o7;
                o7.zpp_disp = true;
                const o8 = inner2;
                if (o8.outer != null) {
                  o8.outer.zpp_inner = null;
                  o8.outer = null;
                }
                o8._isimmutable = null;
                o8._validate = null;
                o8._invalidate = null;
                o8.next = ZPP_Vec2.zpp_pool;
                ZPP_Vec2.zpp_pool = o8;
                o6.wrap = null;
              }
              o6.prev = o6.next = null;
              o6.next = ZPP_GeomVert.zpp_pool;
              ZPP_GeomVert.zpp_pool = o6;
              tmp8 = null;
            } else {
              const retnodes1 = j1.end.prev;
              j1.end.prev.next = j1.end.next;
              j1.end.next.prev = j1.end.prev;
              j1.end.next = j1.end.prev = null;
              const o9 = j1.end;
              if (o9.wrap != null) {
                o9.wrap.zpp_inner._inuse = false;
                const _this10 = o9.wrap;
                if (_this10 != null && _this10.zpp_disp) {
                  throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
                }
                const _this11 = _this10.zpp_inner;
                if (_this11._immutable) {
                  throw new Error("Error: Vec2 is immutable");
                }
                if (_this11._isimmutable != null) {
                  _this11._isimmutable();
                }
                if (_this10.zpp_inner._inuse) {
                  throw new Error("Error: This Vec2 is not disposable");
                }
                const inner3 = _this10.zpp_inner;
                _this10.zpp_inner.outer = null;
                _this10.zpp_inner = null;
                const o10 = _this10;
                o10.zpp_pool = null;
                if (ZPP_PubPool.nextVec2 != null) {
                  ZPP_PubPool.nextVec2.zpp_pool = o10;
                } else {
                  ZPP_PubPool.poolVec2 = o10;
                }
                ZPP_PubPool.nextVec2 = o10;
                o10.zpp_disp = true;
                const o11 = inner3;
                if (o11.outer != null) {
                  o11.outer.zpp_inner = null;
                  o11.outer = null;
                }
                o11._isimmutable = null;
                o11._validate = null;
                o11._invalidate = null;
                o11.next = ZPP_Vec2.zpp_pool;
                ZPP_Vec2.zpp_pool = o11;
                o9.wrap = null;
              }
              o9.prev = o9.next = null;
              o9.next = ZPP_GeomVert.zpp_pool;
              ZPP_GeomVert.zpp_pool = o9;
              j1.end = null;
              tmp8 = retnodes1;
            }
            j1.end = tmp8;
          } else {
            const n = j1.start.next;
            j1.start.x = n.x;
            j1.start.y = n.y;
            if (n != null && n.prev == n) {
              n.next = n.prev = null;
              const o12 = n;
              if (o12.wrap != null) {
                o12.wrap.zpp_inner._inuse = false;
                const _this12 = o12.wrap;
                if (_this12 != null && _this12.zpp_disp) {
                  throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
                }
                const _this13 = _this12.zpp_inner;
                if (_this13._immutable) {
                  throw new Error("Error: Vec2 is immutable");
                }
                if (_this13._isimmutable != null) {
                  _this13._isimmutable();
                }
                if (_this12.zpp_inner._inuse) {
                  throw new Error("Error: This Vec2 is not disposable");
                }
                const inner4 = _this12.zpp_inner;
                _this12.zpp_inner.outer = null;
                _this12.zpp_inner = null;
                const o13 = _this12;
                o13.zpp_pool = null;
                if (ZPP_PubPool.nextVec2 != null) {
                  ZPP_PubPool.nextVec2.zpp_pool = o13;
                } else {
                  ZPP_PubPool.poolVec2 = o13;
                }
                ZPP_PubPool.nextVec2 = o13;
                o13.zpp_disp = true;
                const o14 = inner4;
                if (o14.outer != null) {
                  o14.outer.zpp_inner = null;
                  o14.outer = null;
                }
                o14._isimmutable = null;
                o14._validate = null;
                o14._invalidate = null;
                o14.next = ZPP_Vec2.zpp_pool;
                ZPP_Vec2.zpp_pool = o14;
                o12.wrap = null;
              }
              o12.prev = o12.next = null;
              o12.next = ZPP_GeomVert.zpp_pool;
              ZPP_GeomVert.zpp_pool = o12;
            } else {
              n.prev.next = n.next;
              n.next.prev = n.prev;
              n.next = n.prev = null;
              const o15 = n;
              if (o15.wrap != null) {
                o15.wrap.zpp_inner._inuse = false;
                const _this14 = o15.wrap;
                if (_this14 != null && _this14.zpp_disp) {
                  throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
                }
                const _this15 = _this14.zpp_inner;
                if (_this15._immutable) {
                  throw new Error("Error: Vec2 is immutable");
                }
                if (_this15._isimmutable != null) {
                  _this15._isimmutable();
                }
                if (_this14.zpp_inner._inuse) {
                  throw new Error("Error: This Vec2 is not disposable");
                }
                const inner5 = _this14.zpp_inner;
                _this14.zpp_inner.outer = null;
                _this14.zpp_inner = null;
                const o16 = _this14;
                o16.zpp_pool = null;
                if (ZPP_PubPool.nextVec2 != null) {
                  ZPP_PubPool.nextVec2.zpp_pool = o16;
                } else {
                  ZPP_PubPool.poolVec2 = o16;
                }
                ZPP_PubPool.nextVec2 = o16;
                o16.zpp_disp = true;
                const o17 = inner5;
                if (o17.outer != null) {
                  o17.outer.zpp_inner = null;
                  o17.outer = null;
                }
                o17._isimmutable = null;
                o17._validate = null;
                o17._invalidate = null;
                o17.next = ZPP_Vec2.zpp_pool;
                ZPP_Vec2.zpp_pool = o17;
                o15.wrap = null;
              }
              o15.prev = o15.next = null;
              o15.next = ZPP_GeomVert.zpp_pool;
              ZPP_GeomVert.zpp_pool = o15;
            }
          }
        }
        j1.end.next.prev = j1.start.prev;
        j1.start.prev.next = j1.end.next;
        j1.end.next = j1.start;
        j1.start.prev = j1.end;
        let xr3: Any;
        if (j1.path0 == j1.path0.parent) {
          xr3 = j1.path0;
        } else {
          let obj17 = j1.path0;
          let stack6: Any = null;
          while (obj17 != obj17.parent) {
            const nxt13 = obj17.parent;
            obj17.parent = stack6;
            stack6 = obj17;
            obj17 = nxt13;
          }
          while (stack6 != null) {
            const nxt14 = stack6.parent;
            stack6.parent = obj17;
            stack6 = nxt14;
          }
          xr3 = obj17;
        }
        let yr3: Any;
        if (j1.path1 == j1.path1.parent) {
          yr3 = j1.path1;
        } else {
          let obj18 = j1.path1;
          let stack7: Any = null;
          while (obj18 != obj18.parent) {
            const nxt15 = obj18.parent;
            obj18.parent = stack7;
            stack7 = obj18;
            obj18 = nxt15;
          }
          while (stack7 != null) {
            const nxt16 = stack7.parent;
            stack7.parent = obj18;
            stack7 = nxt16;
          }
          yr3 = obj18;
        }
        if (xr3 != yr3) {
          if (xr3.rank < yr3.rank) {
            xr3.parent = yr3;
          } else if (xr3.rank > yr3.rank) {
            yr3.parent = xr3;
          } else {
            yr3.parent = xr3;
            xr3.rank++;
          }
        }
      } else if (j1.virtualint && !i1.virtualint) {
        let tmp9: Any;
        if (i1.end != null && i1.end.prev == i1.end) {
          i1.end.next = i1.end.prev = null;
          const o18 = i1.end;
          if (o18.wrap != null) {
            o18.wrap.zpp_inner._inuse = false;
            const _this16 = o18.wrap;
            if (_this16 != null && _this16.zpp_disp) {
              throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
            }
            const _this17 = _this16.zpp_inner;
            if (_this17._immutable) {
              throw new Error("Error: Vec2 is immutable");
            }
            if (_this17._isimmutable != null) {
              _this17._isimmutable();
            }
            if (_this16.zpp_inner._inuse) {
              throw new Error("Error: This Vec2 is not disposable");
            }
            const inner6 = _this16.zpp_inner;
            _this16.zpp_inner.outer = null;
            _this16.zpp_inner = null;
            const o19 = _this16;
            o19.zpp_pool = null;
            if (ZPP_PubPool.nextVec2 != null) {
              ZPP_PubPool.nextVec2.zpp_pool = o19;
            } else {
              ZPP_PubPool.poolVec2 = o19;
            }
            ZPP_PubPool.nextVec2 = o19;
            o19.zpp_disp = true;
            const o20 = inner6;
            if (o20.outer != null) {
              o20.outer.zpp_inner = null;
              o20.outer = null;
            }
            o20._isimmutable = null;
            o20._validate = null;
            o20._invalidate = null;
            o20.next = ZPP_Vec2.zpp_pool;
            ZPP_Vec2.zpp_pool = o20;
            o18.wrap = null;
          }
          o18.prev = o18.next = null;
          o18.next = ZPP_GeomVert.zpp_pool;
          ZPP_GeomVert.zpp_pool = o18;
          tmp9 = null;
        } else {
          const retnodes2 = i1.end.prev;
          i1.end.prev.next = i1.end.next;
          i1.end.next.prev = i1.end.prev;
          i1.end.next = i1.end.prev = null;
          const o21 = i1.end;
          if (o21.wrap != null) {
            o21.wrap.zpp_inner._inuse = false;
            const _this18 = o21.wrap;
            if (_this18 != null && _this18.zpp_disp) {
              throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
            }
            const _this19 = _this18.zpp_inner;
            if (_this19._immutable) {
              throw new Error("Error: Vec2 is immutable");
            }
            if (_this19._isimmutable != null) {
              _this19._isimmutable();
            }
            if (_this18.zpp_inner._inuse) {
              throw new Error("Error: This Vec2 is not disposable");
            }
            const inner7 = _this18.zpp_inner;
            _this18.zpp_inner.outer = null;
            _this18.zpp_inner = null;
            const o22 = _this18;
            o22.zpp_pool = null;
            if (ZPP_PubPool.nextVec2 != null) {
              ZPP_PubPool.nextVec2.zpp_pool = o22;
            } else {
              ZPP_PubPool.poolVec2 = o22;
            }
            ZPP_PubPool.nextVec2 = o22;
            o22.zpp_disp = true;
            const o23 = inner7;
            if (o23.outer != null) {
              o23.outer.zpp_inner = null;
              o23.outer = null;
            }
            o23._isimmutable = null;
            o23._validate = null;
            o23._invalidate = null;
            o23.next = ZPP_Vec2.zpp_pool;
            ZPP_Vec2.zpp_pool = o23;
            o21.wrap = null;
          }
          o21.prev = o21.next = null;
          o21.next = ZPP_GeomVert.zpp_pool;
          ZPP_GeomVert.zpp_pool = o21;
          i1.end = null;
          tmp9 = retnodes2;
        }
        i1.end = tmp9;
        if (!i1.vertex) {
          if (i1.end != i1.path0.vert) {
            i1.start.x = i1.end.x;
            i1.start.y = i1.end.y;
            let tmp10: Any;
            if (i1.end != null && i1.end.prev == i1.end) {
              i1.end.next = i1.end.prev = null;
              const o24 = i1.end;
              if (o24.wrap != null) {
                o24.wrap.zpp_inner._inuse = false;
                const _this20 = o24.wrap;
                if (_this20 != null && _this20.zpp_disp) {
                  throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
                }
                const _this21 = _this20.zpp_inner;
                if (_this21._immutable) {
                  throw new Error("Error: Vec2 is immutable");
                }
                if (_this21._isimmutable != null) {
                  _this21._isimmutable();
                }
                if (_this20.zpp_inner._inuse) {
                  throw new Error("Error: This Vec2 is not disposable");
                }
                const inner8 = _this20.zpp_inner;
                _this20.zpp_inner.outer = null;
                _this20.zpp_inner = null;
                const o25 = _this20;
                o25.zpp_pool = null;
                if (ZPP_PubPool.nextVec2 != null) {
                  ZPP_PubPool.nextVec2.zpp_pool = o25;
                } else {
                  ZPP_PubPool.poolVec2 = o25;
                }
                ZPP_PubPool.nextVec2 = o25;
                o25.zpp_disp = true;
                const o26 = inner8;
                if (o26.outer != null) {
                  o26.outer.zpp_inner = null;
                  o26.outer = null;
                }
                o26._isimmutable = null;
                o26._validate = null;
                o26._invalidate = null;
                o26.next = ZPP_Vec2.zpp_pool;
                ZPP_Vec2.zpp_pool = o26;
                o24.wrap = null;
              }
              o24.prev = o24.next = null;
              o24.next = ZPP_GeomVert.zpp_pool;
              ZPP_GeomVert.zpp_pool = o24;
              tmp10 = null;
            } else {
              const retnodes3 = i1.end.prev;
              i1.end.prev.next = i1.end.next;
              i1.end.next.prev = i1.end.prev;
              i1.end.next = i1.end.prev = null;
              const o27 = i1.end;
              if (o27.wrap != null) {
                o27.wrap.zpp_inner._inuse = false;
                const _this22 = o27.wrap;
                if (_this22 != null && _this22.zpp_disp) {
                  throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
                }
                const _this23 = _this22.zpp_inner;
                if (_this23._immutable) {
                  throw new Error("Error: Vec2 is immutable");
                }
                if (_this23._isimmutable != null) {
                  _this23._isimmutable();
                }
                if (_this22.zpp_inner._inuse) {
                  throw new Error("Error: This Vec2 is not disposable");
                }
                const inner9 = _this22.zpp_inner;
                _this22.zpp_inner.outer = null;
                _this22.zpp_inner = null;
                const o28 = _this22;
                o28.zpp_pool = null;
                if (ZPP_PubPool.nextVec2 != null) {
                  ZPP_PubPool.nextVec2.zpp_pool = o28;
                } else {
                  ZPP_PubPool.poolVec2 = o28;
                }
                ZPP_PubPool.nextVec2 = o28;
                o28.zpp_disp = true;
                const o29 = inner9;
                if (o29.outer != null) {
                  o29.outer.zpp_inner = null;
                  o29.outer = null;
                }
                o29._isimmutable = null;
                o29._validate = null;
                o29._invalidate = null;
                o29.next = ZPP_Vec2.zpp_pool;
                ZPP_Vec2.zpp_pool = o29;
                o27.wrap = null;
              }
              o27.prev = o27.next = null;
              o27.next = ZPP_GeomVert.zpp_pool;
              ZPP_GeomVert.zpp_pool = o27;
              i1.end = null;
              tmp10 = retnodes3;
            }
            i1.end = tmp10;
          } else {
            const n1 = i1.start.next;
            i1.start.x = n1.x;
            i1.start.y = n1.y;
            if (n1 != null && n1.prev == n1) {
              n1.next = n1.prev = null;
              const o30 = n1;
              if (o30.wrap != null) {
                o30.wrap.zpp_inner._inuse = false;
                const _this24 = o30.wrap;
                if (_this24 != null && _this24.zpp_disp) {
                  throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
                }
                const _this25 = _this24.zpp_inner;
                if (_this25._immutable) {
                  throw new Error("Error: Vec2 is immutable");
                }
                if (_this25._isimmutable != null) {
                  _this25._isimmutable();
                }
                if (_this24.zpp_inner._inuse) {
                  throw new Error("Error: This Vec2 is not disposable");
                }
                const inner10 = _this24.zpp_inner;
                _this24.zpp_inner.outer = null;
                _this24.zpp_inner = null;
                const o31 = _this24;
                o31.zpp_pool = null;
                if (ZPP_PubPool.nextVec2 != null) {
                  ZPP_PubPool.nextVec2.zpp_pool = o31;
                } else {
                  ZPP_PubPool.poolVec2 = o31;
                }
                ZPP_PubPool.nextVec2 = o31;
                o31.zpp_disp = true;
                const o32 = inner10;
                if (o32.outer != null) {
                  o32.outer.zpp_inner = null;
                  o32.outer = null;
                }
                o32._isimmutable = null;
                o32._validate = null;
                o32._invalidate = null;
                o32.next = ZPP_Vec2.zpp_pool;
                ZPP_Vec2.zpp_pool = o32;
                o30.wrap = null;
              }
              o30.prev = o30.next = null;
              o30.next = ZPP_GeomVert.zpp_pool;
              ZPP_GeomVert.zpp_pool = o30;
            } else {
              n1.prev.next = n1.next;
              n1.next.prev = n1.prev;
              n1.next = n1.prev = null;
              const o33 = n1;
              if (o33.wrap != null) {
                o33.wrap.zpp_inner._inuse = false;
                const _this26 = o33.wrap;
                if (_this26 != null && _this26.zpp_disp) {
                  throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
                }
                const _this27 = _this26.zpp_inner;
                if (_this27._immutable) {
                  throw new Error("Error: Vec2 is immutable");
                }
                if (_this27._isimmutable != null) {
                  _this27._isimmutable();
                }
                if (_this26.zpp_inner._inuse) {
                  throw new Error("Error: This Vec2 is not disposable");
                }
                const inner11 = _this26.zpp_inner;
                _this26.zpp_inner.outer = null;
                _this26.zpp_inner = null;
                const o34 = _this26;
                o34.zpp_pool = null;
                if (ZPP_PubPool.nextVec2 != null) {
                  ZPP_PubPool.nextVec2.zpp_pool = o34;
                } else {
                  ZPP_PubPool.poolVec2 = o34;
                }
                ZPP_PubPool.nextVec2 = o34;
                o34.zpp_disp = true;
                const o35 = inner11;
                if (o35.outer != null) {
                  o35.outer.zpp_inner = null;
                  o35.outer = null;
                }
                o35._isimmutable = null;
                o35._validate = null;
                o35._invalidate = null;
                o35.next = ZPP_Vec2.zpp_pool;
                ZPP_Vec2.zpp_pool = o35;
                o33.wrap = null;
              }
              o33.prev = o33.next = null;
              o33.next = ZPP_GeomVert.zpp_pool;
              ZPP_GeomVert.zpp_pool = o33;
            }
          }
        }
        i1.end.next.prev = i1.start.prev;
        i1.start.prev.next = i1.end.next;
        i1.end.next = i1.start;
        i1.start.prev = i1.end;
        let xr4: Any;
        if (i1.path0 == i1.path0.parent) {
          xr4 = i1.path0;
        } else {
          let obj19 = i1.path0;
          let stack8: Any = null;
          while (obj19 != obj19.parent) {
            const nxt17 = obj19.parent;
            obj19.parent = stack8;
            stack8 = obj19;
            obj19 = nxt17;
          }
          while (stack8 != null) {
            const nxt18 = stack8.parent;
            stack8.parent = obj19;
            stack8 = nxt18;
          }
          xr4 = obj19;
        }
        let yr4: Any;
        if (i1.path1 == i1.path1.parent) {
          yr4 = i1.path1;
        } else {
          let obj20 = i1.path1;
          let stack9: Any = null;
          while (obj20 != obj20.parent) {
            const nxt19 = obj20.parent;
            obj20.parent = stack9;
            stack9 = obj20;
            obj20 = nxt19;
          }
          while (stack9 != null) {
            const nxt20 = stack9.parent;
            stack9.parent = obj20;
            stack9 = nxt20;
          }
          yr4 = obj20;
        }
        if (xr4 != yr4) {
          if (xr4.rank < yr4.rank) {
            xr4.parent = yr4;
          } else if (xr4.rank > yr4.rank) {
            yr4.parent = xr4;
          } else {
            yr4.parent = xr4;
            xr4.rank++;
          }
        }
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
    let cx_ite = ZPP_Cutter.paths.head;
    while (cx_ite != null) {
      const p5 = cx_ite.elt;
      let poly: Any;
      if (p5 == p5.parent) {
        poly = p5;
      } else {
        let obj21 = p5;
        let stack10: Any = null;
        while (obj21 != obj21.parent) {
          const nxt21 = obj21.parent;
          obj21.parent = stack10;
          stack10 = obj21;
          obj21 = nxt21;
        }
        while (stack10 != null) {
          const nxt22 = stack10.parent;
          stack10.parent = obj21;
          stack10 = nxt22;
        }
        poly = obj21;
      }
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
      if (poly.vert != null) {
        const gp = napeNs.geom.GeomPoly.get();
        gp.zpp_inner.vertices = poly.vert;
        if (ret16.zpp_inner.reverse_flag) {
          ret16.push(gp);
        } else {
          ret16.unshift(gp);
        }
      }
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
        const retnodes5 = verts.next;
        verts.prev.next = verts.next;
        verts.next.prev = verts.prev;
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
