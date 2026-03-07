/**
 * ZPP_MarchingSquares — Internal marching squares algorithm for the nape physics engine.
 *
 * Implements the core marching squares isosurface extraction, including cell
 * processing, polygon combination across cells, and interpolation.
 *
 * Converted from nape-compiled.js lines 20938–24762.
 */

import { ZPP_GeomVert } from "./ZPP_GeomVert";
import { ZPP_MarchPair } from "./ZPP_MarchPair";
import { ZPP_MarchSpan } from "./ZPP_MarchSpan";
import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_PubPool } from "../util/ZPP_PubPool";
import { ZNPArray2_Float, ZNPArray2_ZPP_GeomVert, ZNPArray2_ZPP_MarchPair } from "../util/ZNPArray2";
import { ZNPList } from "../util/ZNPList";

export class ZPP_MarchingSquares {
  static __name__ = ["zpp_nape", "geom", "ZPP_MarchingSquares"];

  // --- Static fields ---
  static isos: ZNPArray2_Float | null = null;
  static ints: ZNPArray2_ZPP_GeomVert | null = null;
  static map: ZNPArray2_ZPP_MarchPair | null = null;
  static me: ZPP_MarchingSquares;
  static look_march: number[];

  // Namespace refs for compiled-only types (ZNPArray2_*)
  static _zpp: any = null;
  static _nape: any = null;

  static _init(zpp: any, nape: any): void {
    ZPP_MarchingSquares._zpp = zpp;
    ZPP_MarchingSquares._nape = nape;
    // Initialize singleton + lookup table (was in compiled init block)
    ZPP_MarchingSquares.me = new ZPP_MarchingSquares();
    ZPP_MarchingSquares.look_march = [-1, 224, 56, 216, 14, -1, 54, 214, 131, 99, -1, 91, 141, 109, 181, 85];
  }

  // ---------------------------------------------------------------------------
  // Helper: allocate a ZPP_GeomVert from pool
  // ---------------------------------------------------------------------------
  private static _allocVert(x: number, y: number): ZPP_GeomVert {
    let ret: ZPP_GeomVert;
    if (ZPP_GeomVert.zpp_pool == null) {
      ret = new ZPP_GeomVert();
    } else {
      ret = ZPP_GeomVert.zpp_pool;
      ZPP_GeomVert.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.forced = false;
    ret.x = x;
    ret.y = y;
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Helper: free a ZPP_GeomVert (dispose wrap, return to pool)
  // ---------------------------------------------------------------------------
  private static _freeVert(o: ZPP_GeomVert): void {
    if (o.wrap != null) {
      o.wrap.zpp_inner._inuse = false;
      const _this = o.wrap;
      if (_this != null && _this.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = _this.zpp_inner;
      if (_this1._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this1._isimmutable != null) {
        _this1._isimmutable();
      }
      if (_this.zpp_inner._inuse) {
        throw new Error("Error: This Vec2 is not disposable");
      }
      const inner = _this.zpp_inner;
      _this.zpp_inner.outer = null;
      _this.zpp_inner = null;
      const o1 = _this;
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
  }

  // ---------------------------------------------------------------------------
  // Helper: allocate a ZPP_MarchSpan from pool
  // ---------------------------------------------------------------------------
  private static _allocSpan(): ZPP_MarchSpan {
    let s: ZPP_MarchSpan;
    if (ZPP_MarchSpan.zpp_pool == null) {
      s = new ZPP_MarchSpan();
    } else {
      s = ZPP_MarchSpan.zpp_pool;
      ZPP_MarchSpan.zpp_pool = s.next;
      s.next = null;
    }
    s.out = false;
    s.rank = 0;
    return s;
  }

  // ---------------------------------------------------------------------------
  // Helper: allocate a ZPP_MarchPair from pool
  // ---------------------------------------------------------------------------
  private static _allocPair(): ZPP_MarchPair {
    let ret: ZPP_MarchPair;
    if (ZPP_MarchPair.zpp_pool == null) {
      ret = new ZPP_MarchPair();
    } else {
      ret = ZPP_MarchPair.zpp_pool;
      ZPP_MarchPair.zpp_pool = ret.next;
      ret.next = null;
    }
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Helper: free a ZPP_MarchPair to pool
  // ---------------------------------------------------------------------------
  private static _freePair(o: ZPP_MarchPair): void {
    o.p1 = o.p2 = o.pr = o.pd = null;
    o.span1 = o.span2 = o.spanr = null;
    o.next = ZPP_MarchPair.zpp_pool;
    ZPP_MarchPair.zpp_pool = o;
  }

  // ---------------------------------------------------------------------------
  // Helper: union-find root
  // ---------------------------------------------------------------------------
  private static _findRoot(obj: ZPP_MarchSpan): ZPP_MarchSpan {
    if (obj == obj.parent) {
      return obj;
    }
    let cur = obj;
    let stack: ZPP_MarchSpan | null = null;
    while (cur != cur.parent) {
      const nxt = cur.parent;
      cur.parent = stack!;
      stack = cur;
      cur = nxt;
    }
    while (stack != null) {
      const nxt = stack.parent;
      stack.parent = cur;
      stack = nxt;
    }
    return cur;
  }

  // ---------------------------------------------------------------------------
  // Helper: union two spans
  // ---------------------------------------------------------------------------
  private static _union(a: ZPP_MarchSpan, b: ZPP_MarchSpan): void {
    const xr = ZPP_MarchingSquares._findRoot(a);
    const yr = ZPP_MarchingSquares._findRoot(b);
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
  }

  // ---------------------------------------------------------------------------
  // Helper: push vertex into circular linked list (append at tail)
  // ---------------------------------------------------------------------------
  private static _pushVert(head: ZPP_GeomVert | null, obj: ZPP_GeomVert): ZPP_GeomVert {
    if (head == null) {
      obj.prev = obj.next = obj;
    } else {
      obj.prev = head;
      obj.next = head.next;
      head.next!.prev = obj;
      head.next = obj;
    }
    return obj; // new tail
  }

  // ---------------------------------------------------------------------------
  // Helper: check if key is degenerate (should produce no polygon)
  // ---------------------------------------------------------------------------
  private static _isDegenKey(val: number): boolean {
    return (
      val == 1 ||
      val == 4 ||
      val == 16 ||
      val == 64 ||
      val == 3 ||
      val == 12 ||
      val == 48 ||
      val == 192 ||
      val == 129 ||
      val == 6 ||
      val == 24 ||
      val == 96 ||
      val == 5 ||
      val == 20 ||
      val == 80 ||
      val == 65 ||
      val == 17 ||
      val == 68
    );
  }

  // ---------------------------------------------------------------------------
  // Static method: ISO
  // ---------------------------------------------------------------------------
  static ISO(iso: (x: number, y: number) => number, x: number, y: number): number {
    return iso(x, y);
  }

  // ---------------------------------------------------------------------------
  // Static method: run — main marching squares entry point
  // ---------------------------------------------------------------------------
  static run(
    iso: (x: number, y: number) => number,
    bx0: number,
    by0: number,
    bx1: number,
    by1: number,
    cell: any,
    quality: number,
    combine: boolean,
    ret: ZNPList<ZPP_GeomVert>,
  ): void {
    if (cell != null && cell.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    let _this = cell.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    const xp = (bx1 - bx0) / cell.zpp_inner.x;
    let xn = xp | 0;

    if (cell != null && cell.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    _this = cell.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    const yp = (by1 - by0) / cell.zpp_inner.y;
    let yn = yp | 0;

    if (xp != xn) {
      ++xn;
    }
    if (yp != yn) {
      ++yn;
    }

    if (combine) {
      if (ZPP_MarchingSquares.map == null) {
        ZPP_MarchingSquares.map =
          new ZNPArray2_ZPP_MarchPair(xn, yn);
      } else {
        ZPP_MarchingSquares.map.resize(xn, yn, null);
      }
    }

    if (ZPP_MarchingSquares.isos == null) {
      ZPP_MarchingSquares.isos =
        new ZNPArray2_Float(xn + 1, yn + 1);
    } else {
      ZPP_MarchingSquares.isos.resize(xn + 1, yn + 1, 0);
    }

    // Fill iso values grid
    for (let y = 0; y < yn + 1; y++) {
      let yc: number;
      if (y == 0) {
        yc = by0;
      } else if (y <= yn) {
        if (cell != null && cell.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this2 = cell.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        yc = by0 + cell.zpp_inner.y * y;
      } else {
        yc = by1;
      }

      for (let x = 0; x < xn + 1; x++) {
        let xc: number;
        if (x == 0) {
          xc = bx0;
        } else if (x <= xn) {
          if (cell != null && cell.zpp_disp) {
            throw new Error("Error: Vec2 has been disposed and cannot be used!");
          }
          const _this3 = cell.zpp_inner;
          if (_this3._validate != null) {
            _this3._validate();
          }
          xc = bx0 + cell.zpp_inner.x * x;
        } else {
          xc = bx1;
        }
        const _thisIsos = ZPP_MarchingSquares.isos;
        const obj = iso(xc, yc);
        _thisIsos.list[y * _thisIsos.width + x] = obj;
      }
    }

    if (ZPP_MarchingSquares.ints == null) {
      ZPP_MarchingSquares.ints =
        new ZNPArray2_ZPP_GeomVert(xn + 1, (yn << 1) + 1);
    } else {
      ZPP_MarchingSquares.ints.resize(xn + 1, (yn << 1) + 1, null);
    }

    let spans: ZPP_MarchSpan | null = null;
    if (combine) {
      spans = ZPP_MarchingSquares._allocSpan();
      spans.next = null;
    }

    let py = by0;
    for (let y1 = 0; y1 < yn; y1++) {
      const y0 = py;
      let y1end: number;
      if (y1 == yn - 1) {
        y1end = by1;
      } else {
        if (cell != null && cell.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this5 = cell.zpp_inner;
        if (_this5._validate != null) {
          _this5._validate();
        }
        y1end = by0 + cell.zpp_inner.y * (y1 + 1);
      }
      py = y1end;

      let px = bx0;
      let pre: ZPP_MarchPair | null = null;

      for (let x1 = 0; x1 < xn; x1++) {
        const x0 = px;
        let x1end: number;
        if (x1 == xn - 1) {
          x1end = bx1;
        } else {
          if (cell != null && cell.zpp_disp) {
            throw new Error("Error: Vec2 has been disposed and cannot be used!");
          }
          const _this6 = cell.zpp_inner;
          if (_this6._validate != null) {
            _this6._validate();
          }
          x1end = bx0 + cell.zpp_inner.x * (x1 + 1);
        }
        px = x1end;

        const fstx = x1 == 0 || !combine;
        const fsty = y1 == 0 || !combine;
        const sndx = x1 == xn - 1 || !combine;
        const sndy = y1 == yn - 1 || !combine;

        const pp = ZPP_MarchingSquares.me.marchSquare(
          iso,
          ZPP_MarchingSquares.isos,
          ZPP_MarchingSquares.ints,
          x0,
          y0,
          x1end,
          y1end,
          x1,
          y1,
          fstx,
          fsty,
          sndx,
          sndy,
          quality,
        );

        if (pp == null) {
          pre = null;
          continue;
        }

        if (combine) {
          const pd = pp.p2 != null && pp.okey2 != 14 ? pp.p2 : pp.p1;
          pp.pd =
            ((pd == pp.p2 ? pp.okey2 : pp.okey1) & 128) == 0
              ? pd.prev
              : pd.prev.prev;

          const _thisMap = ZPP_MarchingSquares.map;
          _thisMap.list[y1 * _thisMap.width + x1] = pp;

          let tmp: boolean;
          if (pre != null) {
            const key = pp.key1;
            const flag = (key & 1) | ((key & 192) >> 5);
            let cnt = 0;
            if ((flag & 1) != 0) ++cnt;
            if ((flag & 2) != 0) ++cnt;
            if ((flag & 4) != 0) ++cnt;
            tmp = cnt >= 2;
          } else {
            tmp = false;
          }

          if (tmp) {
            ZPP_MarchingSquares.me.combLR(pre!, pp);
            pp.span1 = pre!.spanr;
          } else {
            pp.span1 = ZPP_MarchingSquares._allocSpan();
            pp.span1.next = spans;
            spans = pp.span1;
          }

          if (pp.p2 != null) {
            pp.span2 = ZPP_MarchingSquares._allocSpan();
            pp.span2.next = spans;
            spans = pp.span2;
            pp.spanr = pp.span2;
          } else {
            pp.spanr = pp.span1;
          }

          const flag1 = (pp.keyr & 28) >> 2;
          let cnt1 = 0;
          if ((flag1 & 1) != 0) ++cnt1;
          if ((flag1 & 2) != 0) ++cnt1;
          if ((flag1 & 4) != 0) ++cnt1;
          if (cnt1 >= 2) {
            pre = pp;
          } else {
            pre = null;
          }
        } else {
          ZPP_MarchingSquares.me.output(ret, pp.p1);
          if (pp.p2 != null) {
            ZPP_MarchingSquares.me.output(ret, pp.p2);
          }
          ZPP_MarchingSquares._freePair(pp);
        }
      }
    }

    if (!combine) {
      return;
    }

    // Combine up-down across rows
    for (let y2 = 1; y2 < yn; y2++) {
      let pre1: ZPP_MarchSpan | null = null;

      for (let x2 = 0; x2 < xn; x2++) {
        const _thisMap2 = ZPP_MarchingSquares.map;
        const b = _thisMap2.list[y2 * _thisMap2.width + x2];
        if (b == null) {
          pre1 = null;
          continue;
        }

        const bkey = b.p2 != null && b.okey2 == 14 ? b.okey2 : b.okey1;
        const flag2 = bkey & 7;
        let cnt2 = 0;
        if ((flag2 & 1) != 0) ++cnt2;
        if ((flag2 & 2) != 0) ++cnt2;
        if ((flag2 & 4) != 0) ++cnt2;
        if (cnt2 < 2) {
          pre1 = null;
          continue;
        }

        const _thisMap3 = ZPP_MarchingSquares.map;
        const a = _thisMap3.list[(y2 - 1) * _thisMap3.width + x2];
        if (a == null) {
          pre1 = null;
          continue;
        }

        const akey = a.p2 != null && a.okey2 == 56 ? a.okey2 : a.okey1;
        const flag3 = (akey & 112) >> 4;
        let cnt3 = 0;
        if ((flag3 & 1) != 0) ++cnt3;
        if ((flag3 & 2) != 0) ++cnt3;
        if ((flag3 & 4) != 0) ++cnt3;
        if (cnt3 < 2) {
          pre1 = null;
          continue;
        }

        const ad = a.p2 != null && a.okey2 == 56 ? a.span2 : a.span1;
        const bu = b.p2 != null && b.okey2 == 14 ? b.span2 : b.span1;

        const rootAd = ZPP_MarchingSquares._findRoot(ad);
        const rootBu = ZPP_MarchingSquares._findRoot(bu);

        if (rootAd == rootBu) {
          if (pre1 != bu) {
            ZPP_MarchingSquares.me.combUD_virtual(a, b);
          }
        } else {
          ZPP_MarchingSquares._union(ad, bu);
          ZPP_MarchingSquares.me.combUD(a, b);
        }

        const key1 = bu == b.span2 ? b.okey2 : b.okey1;
        pre1 = (key1 & 4) != 0 ? bu : null;
      }
    }

    // Output combined polygons
    for (let y3 = 0; y3 < yn; y3++) {
      for (let x3 = 0; x3 < xn; x3++) {
        const _thisMap4 = ZPP_MarchingSquares.map;
        const p = _thisMap4.list[y3 * _thisMap4.width + x3];
        if (p == null) {
          continue;
        }

        let root = ZPP_MarchingSquares._findRoot(p.span1);
        if (!root.out) {
          root.out = true;
          ZPP_MarchingSquares.me.output(ret, p.p1);
        }

        if (p.p2 != null) {
          root = ZPP_MarchingSquares._findRoot(p.span2);
          if (!root.out) {
            root.out = true;
            ZPP_MarchingSquares.me.output(ret, p.p2);
          }
        }

        ZPP_MarchingSquares._freePair(p);
        _thisMap4.list[y3 * _thisMap4.width + x3] = null;
      }
    }

    // Return spans to pool
    while (spans != null) {
      const t = spans;
      spans = t.next;
      const o = t;
      o.parent = o;
      o.next = ZPP_MarchSpan.zpp_pool;
      ZPP_MarchSpan.zpp_pool = o;
    }
  }

  // ---------------------------------------------------------------------------
  // Instance method: output — emit a polygon to the result list
  // ---------------------------------------------------------------------------
  output(ret: ZNPList<ZPP_GeomVert>, poly: ZPP_GeomVert | null): void {
    const nape = ZPP_MarchingSquares._nape;
    let tmp: boolean;
    if (poly == null || poly.next == poly || poly.next == poly.prev) {
      tmp = true;
    } else {
      let area = 0.0;
      const F = poly;
      const L = poly;
      if (F != null) {
        let nite: ZPP_GeomVert = F;
        while (true) {
          const v = nite;
          area += v.x * (v.next.y - v.prev.y);
          nite = nite.next;
          if (!(nite != L)) {
            break;
          }
        }
      }
      const a = area * 0.5;
      tmp = a * a < nape.Config.epsilon * nape.Config.epsilon;
    }
    if (tmp) {
      while (poly != null) {
        if (poly != null && poly.prev == poly) {
          poly.next = poly.prev = null;
          poly = null;
        } else {
          const retnodes = poly.next;
          poly.prev!.next = poly.next;
          poly.next!.prev = poly.prev;
          poly.next = poly.prev = null;
          poly = retnodes;
        }
      }
      return;
    }

    const gp = nape.geom.GeomPoly.get();
    gp.zpp_inner.vertices = poly;
    if (ret.zpp_inner.reverse_flag) {
      ret.push(gp);
    } else {
      ret.unshift(gp);
    }
  }

  // ---------------------------------------------------------------------------
  // Instance method: linkright
  // ---------------------------------------------------------------------------
  linkright(poly: ZPP_GeomVert | null, key: number): ZPP_GeomVert | null {
    const kind = key & 7;
    if (kind == 0) {
      return poly;
    } else if (kind == 3) {
      return poly.next.next;
    } else {
      return poly.next;
    }
  }

  // ---------------------------------------------------------------------------
  // Instance method: linkleft
  // ---------------------------------------------------------------------------
  linkleft(poly: ZPP_GeomVert | null, key: number): ZPP_GeomVert | null {
    if ((key & 1) == 0) {
      return poly.prev;
    } else {
      return poly;
    }
  }

  // ---------------------------------------------------------------------------
  // Instance method: linkdown
  // ---------------------------------------------------------------------------
  linkdown(poly: ZPP_GeomVert | null, key: number): ZPP_GeomVert | null {
    if ((key & 128) == 0) {
      return poly.prev;
    } else {
      return poly.prev.prev;
    }
  }

  // ---------------------------------------------------------------------------
  // Instance method: linkup
  // ---------------------------------------------------------------------------
  linkup(poly: ZPP_GeomVert | null, _key: number): ZPP_GeomVert | null {
    return poly;
  }

  // ---------------------------------------------------------------------------
  // Instance method: combLR — combine left-right adjacent cells
  // ---------------------------------------------------------------------------
  combLR(a: ZPP_MarchPair, b: ZPP_MarchPair): void {
    const poly = a.pr;
    const kind = a.okeyr & 7;
    const ap = kind == 0 ? poly : kind == 3 ? poly.next.next : poly.next;
    const poly1 = b.p1;
    const bp = (b.okey1 & 1) == 0 ? poly1.prev : poly1;
    const ap2 = ap.next;
    const bp2 = bp.prev;

    if ((a.keyr & 4) != 0) {
      if (b.pr == b.p1) {
        b.pr = ap.prev;
      }
      b.p1 = ap.prev;
      ap.prev.next = bp.next;
      bp.next.prev = ap.prev;
      ZPP_MarchingSquares._freeVert(ap);
    } else {
      ap.next = bp.next;
      bp.next.prev = ap;
    }

    ZPP_MarchingSquares._freeVert(bp);

    if ((a.keyr & 16) != 0) {
      b.pd = ap2.next;
      ap2.next.prev = bp2.prev;
      bp2.prev.next = ap2.next;
      ZPP_MarchingSquares._freeVert(ap2);
    } else {
      ap2.prev = bp2.prev;
      bp2.prev.next = ap2;
    }

    ZPP_MarchingSquares._freeVert(bp2);
  }

  // ---------------------------------------------------------------------------
  // Instance method: combUD — combine up-down adjacent cells
  // ---------------------------------------------------------------------------
  combUD(a: ZPP_MarchPair, b: ZPP_MarchPair): void {
    const ap = a.pd;
    const bp = b.p2 != null && b.key2 == 14 ? b.p2 : b.p1;
    const ap2 = ap.prev;
    const bp2 = bp.next;

    bp.next = ap.next;
    ap.next.prev = bp;
    ZPP_MarchingSquares._freeVert(ap);

    bp2.prev = ap2.prev;
    ap2.prev.next = bp2;
    if (ap2 == a.p1) {
      a.p1 = bp2;
    }
    ZPP_MarchingSquares._freeVert(ap2);
  }

  // ---------------------------------------------------------------------------
  // Instance method: combUD_virtual — mark forced vertices for virtual combine
  // ---------------------------------------------------------------------------
  combUD_virtual(a: ZPP_MarchPair, b: ZPP_MarchPair): void {
    const ap = a.pd;
    const bp = b.p2 != null && b.key2 == 14 ? b.p2 : b.p1;
    const ap2 = ap.prev;
    const bp2 = bp.next;
    ap.forced = bp.forced = ap2.forced = bp2.forced = true;
  }

  // ---------------------------------------------------------------------------
  // Instance method: combLeft
  // ---------------------------------------------------------------------------
  combLeft(key: number): boolean {
    const flag = (key & 1) | ((key & 192) >> 5);
    let cnt = 0;
    if ((flag & 1) != 0) ++cnt;
    if ((flag & 2) != 0) ++cnt;
    if ((flag & 4) != 0) ++cnt;
    return cnt >= 2;
  }

  // ---------------------------------------------------------------------------
  // Instance method: combRight
  // ---------------------------------------------------------------------------
  combRight(key: number): boolean {
    const flag = (key & 28) >> 2;
    let cnt = 0;
    if ((flag & 1) != 0) ++cnt;
    if ((flag & 2) != 0) ++cnt;
    if ((flag & 4) != 0) ++cnt;
    return cnt >= 2;
  }

  // ---------------------------------------------------------------------------
  // Instance method: combUp
  // ---------------------------------------------------------------------------
  combUp(key: number): boolean {
    const flag = key & 7;
    let cnt = 0;
    if ((flag & 1) != 0) ++cnt;
    if ((flag & 2) != 0) ++cnt;
    if ((flag & 4) != 0) ++cnt;
    return cnt >= 2;
  }

  // ---------------------------------------------------------------------------
  // Instance method: combDown
  // ---------------------------------------------------------------------------
  combDown(key: number): boolean {
    const flag = (key & 112) >> 4;
    let cnt = 0;
    if ((flag & 1) != 0) ++cnt;
    if ((flag & 2) != 0) ++cnt;
    if ((flag & 4) != 0) ++cnt;
    return cnt >= 2;
  }

  // ---------------------------------------------------------------------------
  // Instance method: comb
  // ---------------------------------------------------------------------------
  comb(flag: number): boolean {
    let cnt = 0;
    if ((flag & 1) != 0) ++cnt;
    if ((flag & 2) != 0) ++cnt;
    if ((flag & 4) != 0) ++cnt;
    return cnt >= 2;
  }

  // ---------------------------------------------------------------------------
  // Helper: build polygon ring from val bitmask
  // Returns: [head, val] — head of circular list and possibly modified val
  // ---------------------------------------------------------------------------
  private _buildPoly(
    val: number,
    isos: ZNPArray2_Float,
    ints: ZNPArray2_ZPP_GeomVert,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    xn: number,
    yn: number,
    v0: number,
    v1: number,
    v2: number,
    v3: number,
    fstx: boolean,
    fsty: boolean,
    sndx: boolean,
    sndy: boolean,
    iso: (x: number, y: number) => number,
    quality: number,
  ): { head: ZPP_GeomVert | null; val: number } {
    let head: ZPP_GeomVert | null = null;

    for (let i = 0; i < 8; i++) {
      if ((val & (1 << i)) != 0) {
        let p: ZPP_GeomVert | null;

        if (i == 0) {
          p = ZPP_MarchingSquares._allocVert(x0, y0);
          if (fstx || fsty) p.forced = true;
        } else if (i == 2) {
          p = ZPP_MarchingSquares._allocVert(x1, y0);
          if (sndx || fsty) p.forced = true;
        } else if (i == 4) {
          p = ZPP_MarchingSquares._allocVert(x1, y1);
          if (sndx || sndy) p.forced = true;
        } else if (i == 6) {
          p = ZPP_MarchingSquares._allocVert(x0, y1);
          if (fstx || sndy) p.forced = true;
        } else if (i == 1) {
          // Top edge interpolation
          p = ints.list[(yn << 1) * ints.width + xn];
          if (p == null) {
            const xv = this.xlerp(x0, x1, y0, v0, v1, iso, quality);
            p = ZPP_MarchingSquares._allocVert(xv, y0);
            ints.list[(yn << 1) * ints.width + xn] = p;
          } else {
            p = ZPP_MarchingSquares._allocVert(p.x, p.y);
          }
          if (fsty) p.forced = true;
          if (p.x == x0 || p.x == x1) {
            if ((p.x == x0 && (val & 1) != 0) || (p.x == x1 && (val & 4) != 0)) {
              val ^= 2;
            }
          }
        } else if (i == 5) {
          // Bottom edge interpolation
          p = ints.list[((yn << 1) + 2) * ints.width + xn];
          if (p == null) {
            const xv = this.xlerp(x0, x1, y1, v3, v2, iso, quality);
            p = ZPP_MarchingSquares._allocVert(xv, y1);
            ints.list[((yn << 1) + 2) * ints.width + xn] = p;
          } else {
            p = ZPP_MarchingSquares._allocVert(p.x, p.y);
          }
          if (sndy) p.forced = true;
          if (p.x == x0 || p.x == x1) {
            if ((p.x == x0 && (val & 64) != 0) || (p.x == x1 && (val & 16) != 0)) {
              val ^= 32;
            }
          }
        } else if (i == 3) {
          // Right edge interpolation
          p = ints.list[((yn << 1) + 1) * ints.width + (xn + 1)];
          if (p == null) {
            const yv = this.ylerp(y0, y1, x1, v1, v2, iso, quality);
            p = ZPP_MarchingSquares._allocVert(x1, yv);
            ints.list[((yn << 1) + 1) * ints.width + (xn + 1)] = p;
          } else {
            p = ZPP_MarchingSquares._allocVert(p.x, p.y);
          }
          if (sndx) p.forced = true;
          if (p.y == y0 || p.y == y1) {
            if ((p.y == y0 && (val & 4) != 0) || (p.y == y1 && (val & 16) != 0)) {
              val ^= 8;
            }
          }
        } else {
          // i == 7: Left edge interpolation
          p = ints.list[((yn << 1) + 1) * ints.width + xn];
          if (p == null) {
            const yv = this.ylerp(y0, y1, x0, v0, v3, iso, quality);
            p = ZPP_MarchingSquares._allocVert(x0, yv);
            ints.list[((yn << 1) + 1) * ints.width + xn] = p;
          } else {
            p = ZPP_MarchingSquares._allocVert(p.x, p.y);
          }
          if (fstx) p.forced = true;
          if (p.y == y0 || p.y == y1) {
            if ((p.y == y0 && (val & 1) != 0) || (p.y == y1 && (val & 64) != 0)) {
              val ^= 128;
            }
          }
        }

        head = ZPP_MarchingSquares._pushVert(head, p!);
      }
    }

    // Advance head to first element (pushVert returns tail, head.next is first)
    if (head != null) {
      head = head.next!;
    }

    return { head, val };
  }

  // ---------------------------------------------------------------------------
  // Instance method: marchSquare — process a single cell
  // ---------------------------------------------------------------------------
  marchSquare(
    iso: (x: number, y: number) => number,
    isos: ZNPArray2_Float,
    ints: ZNPArray2_ZPP_GeomVert,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    xn: number,
    yn: number,
    fstx: boolean,
    fsty: boolean,
    sndx: boolean,
    sndy: boolean,
    quality: number,
  ): ZPP_MarchPair | null {
    let key = 0;
    const v0 = isos.list[yn * isos.width + xn];
    if (v0 < 0) key |= 8;
    const v1 = isos.list[yn * isos.width + (xn + 1)];
    if (v1 < 0) key |= 4;
    const v2 = isos.list[(yn + 1) * isos.width + (xn + 1)];
    if (v2 < 0) key |= 2;
    const v3 = isos.list[(yn + 1) * isos.width + xn];
    if (v3 < 0) key |= 1;

    if (key == 0) {
      return null;
    }

    let ret: ZPP_MarchPair | null = ZPP_MarchingSquares._allocPair();

    if (key != 10 && key != 5) {
      // Non-ambiguous cases
      let val = ZPP_MarchingSquares.look_march[key];
      ret.okey1 = val;

      const result = this._buildPoly(
        val, isos, ints, x0, y0, x1, y1, xn, yn, v0, v1, v2, v3,
        fstx, fsty, sndx, sndy, iso, quality,
      );
      ret.p1 = result.head;
      val = result.val;
      ret.key1 = val;

      if (ZPP_MarchingSquares._isDegenKey(val)) {
        val = 0;
        ret.key1 = 0;
        ret.p1 = null;
      }

      if (val == 0) {
        ret = null;
      } else {
        ret!.pr = ret!.p1;
        ret!.okeyr = ret!.okey1;
        ret!.keyr = ret!.key1;
      }
    } else {
      // Ambiguous cases (key == 10 or key == 5)
      const mid = iso(0.5 * (x0 + x1), 0.5 * (y0 + y1)) < 0;

      if (key == 10) {
        if (mid) {
          // key==10, mid: single polygon 187
          let val1 = 187;
          ret.okey1 = val1;

          const result = this._buildPoly(
            val1, isos, ints, x0, y0, x1, y1, xn, yn, v0, v1, v2, v3,
            fstx, fsty, sndx, sndy, iso, quality,
          );
          ret.p1 = result.head;
          val1 = result.val;
          ret.key1 = val1;

          if (ZPP_MarchingSquares._isDegenKey(val1)) {
            val1 = 0;
            ret.key1 = 0;
            ret.p1 = null;
          }

          if (val1 == 0) {
            ret = null;
          } else {
            ret!.pr = ret!.p1;
            ret!.okeyr = ret!.okey1;
            ret!.keyr = ret!.key1;
          }
        } else {
          // key==10, !mid: two polygons 131 + 56
          let val2 = 131;
          ret.okey1 = val2;

          const result1 = this._buildPoly(
            val2, isos, ints, x0, y0, x1, y1, xn, yn, v0, v1, v2, v3,
            fstx, fsty, sndx, sndy, iso, quality,
          );
          ret.p1 = result1.head;
          val2 = result1.val;
          ret.key1 = val2;

          if (ZPP_MarchingSquares._isDegenKey(val2)) {
            val2 = 0;
            ret.key1 = 0;
            ret.p1 = null;
          }

          if (val2 != 0) {
            // Build second polygon (56)
            let val3 = 56;
            ret.okey2 = val3;

            const result2 = this._buildPoly2(
              val3, isos, ints, x0, y0, x1, y1, xn, yn, v0, v1, v2, v3,
              fstx, fsty, sndx, sndy, iso, quality, ret,
            );
            val3 = result2.val;
            ret.key2 = val3;

            if (ZPP_MarchingSquares._isDegenKey(val3)) {
              val3 = 0;
              ret.key2 = 0;
              ret.p2 = null;
            }

            if (val3 == 0) {
              ret.pr = ret.p1;
              ret.okeyr = ret.okey1;
              ret.keyr = ret.key1;
            } else {
              ret.pr = ret.p2;
              ret.okeyr = ret.okey2;
              ret.keyr = ret.key2;
            }
          } else {
            // val2==0: try single polygon 56
            let val4 = 56;
            ret.okey1 = val4;

            const result3 = this._buildPoly(
              val4, isos, ints, x0, y0, x1, y1, xn, yn, v0, v1, v2, v3,
              fstx, fsty, sndx, sndy, iso, quality,
            );
            ret.p1 = result3.head;
            val4 = result3.val;
            ret.key1 = val4;

            if (ZPP_MarchingSquares._isDegenKey(val4)) {
              val4 = 0;
              ret.key1 = 0;
              ret.p1 = null;
            }

            if (val4 == 0) {
              ret = null;
            } else {
              ret!.pr = ret!.p1;
              ret!.okeyr = ret!.okey1;
              ret!.keyr = ret!.key1;
            }
          }
        }
      } else {
        // key == 5
        if (mid) {
          // key==5, mid: single polygon 238
          let val5 = 238;
          ret.okey1 = val5;

          const result = this._buildPoly(
            val5, isos, ints, x0, y0, x1, y1, xn, yn, v0, v1, v2, v3,
            fstx, fsty, sndx, sndy, iso, quality,
          );
          ret.p1 = result.head;
          val5 = result.val;
          ret.key1 = val5;

          if (ZPP_MarchingSquares._isDegenKey(val5)) {
            val5 = 0;
            ret.key1 = 0;
            ret.p1 = null;
          }

          if (val5 == 0) {
            ret = null;
          } else {
            ret!.pr = ret!.p1;
            ret!.okeyr = ret!.okey1;
            ret!.keyr = ret!.key1;
          }
        } else {
          // key==5, !mid: two polygons 224 + 14
          let val6 = 224;
          ret.okey1 = val6;

          const result1 = this._buildPoly(
            val6, isos, ints, x0, y0, x1, y1, xn, yn, v0, v1, v2, v3,
            fstx, fsty, sndx, sndy, iso, quality,
          );
          ret.p1 = result1.head;
          val6 = result1.val;
          ret.key1 = val6;

          if (ZPP_MarchingSquares._isDegenKey(val6)) {
            val6 = 0;
            ret.key1 = 0;
            ret.p1 = null;
          }

          if (val6 != 0) {
            // Build second polygon (14)
            let val7 = 14;
            ret.okey2 = val7;

            const result2 = this._buildPoly2(
              val7, isos, ints, x0, y0, x1, y1, xn, yn, v0, v1, v2, v3,
              fstx, fsty, sndx, sndy, iso, quality, ret,
            );
            val7 = result2.val;
            ret.key2 = val7;

            if (ZPP_MarchingSquares._isDegenKey(val7)) {
              val7 = 0;
              ret.key2 = 0;
              ret.p2 = null;
            }

            if (val7 == 0) {
              ret.pr = ret.p1;
              ret.okeyr = ret.okey1;
              ret.keyr = ret.key1;
            } else {
              ret.pr = ret.p2;
              ret.okeyr = ret.okey2;
              ret.keyr = ret.key2;
            }
          } else {
            // val6==0: try single polygon 14
            let val8 = 14;
            ret.okey1 = val8;

            const result3 = this._buildPoly(
              val8, isos, ints, x0, y0, x1, y1, xn, yn, v0, v1, v2, v3,
              fstx, fsty, sndx, sndy, iso, quality,
            );
            ret.p1 = result3.head;
            val8 = result3.val;
            ret.key1 = val8;

            if (ZPP_MarchingSquares._isDegenKey(val8)) {
              val8 = 0;
              ret.key1 = 0;
              ret.p1 = null;
            }

            if (val8 == 0) {
              ret = null;
            } else {
              ret!.pr = ret!.p1;
              ret!.okeyr = ret!.okey1;
              ret!.keyr = ret!.key1;
            }
          }
        }
      }
    }

    return ret;
  }

  // ---------------------------------------------------------------------------
  // Helper: build second polygon (p2) for ambiguous cases
  // Same as _buildPoly but writes to ret.p2 instead of ret.p1
  // ---------------------------------------------------------------------------
  private _buildPoly2(
    val: number,
    isos: ZNPArray2_Float,
    ints: ZNPArray2_ZPP_GeomVert,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    xn: number,
    yn: number,
    v0: number,
    v1: number,
    v2: number,
    v3: number,
    fstx: boolean,
    fsty: boolean,
    sndx: boolean,
    sndy: boolean,
    iso: (x: number, y: number) => number,
    quality: number,
    ret: ZPP_MarchPair,
  ): { val: number } {
    for (let i = 0; i < 8; i++) {
      if ((val & (1 << i)) != 0) {
        let p: ZPP_GeomVert | null;

        if (i == 0) {
          p = ZPP_MarchingSquares._allocVert(x0, y0);
          if (fstx || fsty) p.forced = true;
        } else if (i == 2) {
          p = ZPP_MarchingSquares._allocVert(x1, y0);
          if (sndx || fsty) p.forced = true;
        } else if (i == 4) {
          p = ZPP_MarchingSquares._allocVert(x1, y1);
          if (sndx || sndy) p.forced = true;
        } else if (i == 6) {
          p = ZPP_MarchingSquares._allocVert(x0, y1);
          if (fstx || sndy) p.forced = true;
        } else if (i == 1) {
          p = ints.list[(yn << 1) * ints.width + xn];
          if (p == null) {
            const xv = this.xlerp(x0, x1, y0, v0, v1, iso, quality);
            p = ZPP_MarchingSquares._allocVert(xv, y0);
            ints.list[(yn << 1) * ints.width + xn] = p;
          } else {
            p = ZPP_MarchingSquares._allocVert(p.x, p.y);
          }
          if (fsty) p.forced = true;
          if (p.x == x0 || p.x == x1) {
            if ((p.x == x0 && (val & 1) != 0) || (p.x == x1 && (val & 4) != 0)) {
              val ^= 2;
            }
          }
        } else if (i == 5) {
          p = ints.list[((yn << 1) + 2) * ints.width + xn];
          if (p == null) {
            const xv = this.xlerp(x0, x1, y1, v3, v2, iso, quality);
            p = ZPP_MarchingSquares._allocVert(xv, y1);
            ints.list[((yn << 1) + 2) * ints.width + xn] = p;
          } else {
            p = ZPP_MarchingSquares._allocVert(p.x, p.y);
          }
          if (sndy) p.forced = true;
          if (p.x == x0 || p.x == x1) {
            if ((p.x == x0 && (val & 64) != 0) || (p.x == x1 && (val & 16) != 0)) {
              val ^= 32;
            }
          }
        } else if (i == 3) {
          p = ints.list[((yn << 1) + 1) * ints.width + (xn + 1)];
          if (p == null) {
            const yv = this.ylerp(y0, y1, x1, v1, v2, iso, quality);
            p = ZPP_MarchingSquares._allocVert(x1, yv);
            ints.list[((yn << 1) + 1) * ints.width + (xn + 1)] = p;
          } else {
            p = ZPP_MarchingSquares._allocVert(p.x, p.y);
          }
          if (sndx) p.forced = true;
          if (p.y == y0 || p.y == y1) {
            if ((p.y == y0 && (val & 4) != 0) || (p.y == y1 && (val & 16) != 0)) {
              val ^= 8;
            }
          }
        } else {
          // i == 7
          p = ints.list[((yn << 1) + 1) * ints.width + xn];
          if (p == null) {
            const yv = this.ylerp(y0, y1, x0, v0, v3, iso, quality);
            p = ZPP_MarchingSquares._allocVert(x0, yv);
            ints.list[((yn << 1) + 1) * ints.width + xn] = p;
          } else {
            p = ZPP_MarchingSquares._allocVert(p.x, p.y);
          }
          if (fstx) p.forced = true;
          if (p.y == y0 || p.y == y1) {
            if ((p.y == y0 && (val & 1) != 0) || (p.y == y1 && (val & 64) != 0)) {
              val ^= 128;
            }
          }
        }

        // Push into p2 circular list
        const obj = p!;
        if (ret.p2 == null) {
          ret.p2 = obj.prev = obj.next = obj;
        } else {
          obj.prev = ret.p2;
          obj.next = ret.p2.next;
          ret.p2.next.prev = obj;
          ret.p2.next = obj;
        }
        ret.p2 = obj;
      }
    }

    if (ret.p2 != null) {
      ret.p2 = ret.p2.next;
    }

    return { val };
  }

  // ---------------------------------------------------------------------------
  // Instance method: lerp — basic linear interpolation
  // ---------------------------------------------------------------------------
  lerp(x0: number, x1: number, v0: number, v1: number): number {
    const nape = ZPP_MarchingSquares._nape;
    if (v0 == 0) {
      return x0;
    } else if (v1 == 0) {
      return x1;
    } else {
      const dv = v0 - v1;
      let t = dv * dv < nape.Config.epsilon * nape.Config.epsilon ? 0.5 : v0 / dv;
      if (t < 0) {
        t = 0;
      } else if (t > 1) {
        t = 1;
      }
      return x0 + t * (x1 - x0);
    }
  }

  // ---------------------------------------------------------------------------
  // Instance method: xlerp — interpolate along x axis with quality refinement
  // ---------------------------------------------------------------------------
  xlerp(
    x0: number,
    x1: number,
    y: number,
    v0: number,
    v1: number,
    iso: (x: number, y: number) => number,
    quality: number,
  ): number {
    const nape = ZPP_MarchingSquares._nape;
    let xm: number;
    if (v0 == 0) {
      xm = x0;
    } else if (v1 == 0) {
      xm = x1;
    } else {
      const dv = v0 - v1;
      let t = dv * dv < nape.Config.epsilon * nape.Config.epsilon ? 0.5 : v0 / dv;
      if (t < 0) {
        t = 0;
      } else if (t > 1) {
        t = 1;
      }
      xm = x0 + t * (x1 - x0);
    }
    while (quality-- != 0 && x0 < xm && xm < x1) {
      const vm = iso(xm, y);
      if (vm == 0) {
        break;
      }
      if (v0 * vm < 0) {
        x1 = xm;
        v1 = vm;
      } else {
        x0 = xm;
        v0 = vm;
      }
      if (v0 == 0) {
        xm = x0;
      } else if (v1 == 0) {
        xm = x1;
      } else {
        const dv1 = v0 - v1;
        let t1 = dv1 * dv1 < nape.Config.epsilon * nape.Config.epsilon ? 0.5 : v0 / dv1;
        if (t1 < 0) {
          t1 = 0;
        } else if (t1 > 1) {
          t1 = 1;
        }
        xm = x0 + t1 * (x1 - x0);
      }
    }
    return xm;
  }

  // ---------------------------------------------------------------------------
  // Instance method: ylerp — interpolate along y axis with quality refinement
  // ---------------------------------------------------------------------------
  ylerp(
    y0: number,
    y1: number,
    x: number,
    v0: number,
    v1: number,
    iso: (x: number, y: number) => number,
    quality: number,
  ): number {
    const nape = ZPP_MarchingSquares._nape;
    let ym: number;
    if (v0 == 0) {
      ym = y0;
    } else if (v1 == 0) {
      ym = y1;
    } else {
      const dv = v0 - v1;
      let t = dv * dv < nape.Config.epsilon * nape.Config.epsilon ? 0.5 : v0 / dv;
      if (t < 0) {
        t = 0;
      } else if (t > 1) {
        t = 1;
      }
      ym = y0 + t * (y1 - y0);
    }
    while (quality-- != 0 && y0 < ym && ym < y1) {
      const vm = iso(x, ym);
      if (vm == 0) {
        break;
      }
      if (v0 * vm < 0) {
        y1 = ym;
        v1 = vm;
      } else {
        y0 = ym;
        v0 = vm;
      }
      if (v0 == 0) {
        ym = y0;
      } else if (v1 == 0) {
        ym = y1;
      } else {
        const dv1 = v0 - v1;
        let t1 = dv1 * dv1 < nape.Config.epsilon * nape.Config.epsilon ? 0.5 : v0 / dv1;
        if (t1 < 0) {
          t1 = 0;
        } else if (t1 > 1) {
          t1 = 1;
        }
        ym = y0 + t1 * (y1 - y0);
      }
    }
    return ym;
  }
}
