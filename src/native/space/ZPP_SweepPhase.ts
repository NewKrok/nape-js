/**
 * ZPP_SweepPhase — Internal sweep-and-prune broadphase variant.
 *
 * Extends ZPP_Broadphase with a sorted doubly-linked list of ZPP_SweepData nodes.
 * Performs insertion sort on AABB minx for broadphase pair detection,
 * plus spatial queries (shapes/bodies under point, in AABB, in circle, in shape,
 * raycasting).
 *
 * Converted from nape-compiled.js lines 46298–47510.
 */

import { ZPP_SweepData } from "./ZPP_SweepData";
import { ZPP_Vec2 } from "../geom/ZPP_Vec2";
import { ZPP_AABB } from "../geom/ZPP_AABB";
import { ZPP_Collide } from "../geom/ZPP_Collide";
import { ZPP_Broadphase } from "./ZPP_Broadphase";

export class ZPP_SweepPhase extends ZPP_Broadphase {
  // --- Static: namespace references ---
  static _zpp: any = null;
  static _nape: any = null;

  // --- Instance fields ---
  failed: any = null;
  list: ZPP_SweepData | null = null;

  constructor(space: any) {
    super();
    this.space = space;
    this.is_sweep = true;
    this.sweep = this;
  }

  // ========== Insert / Remove ==========

  __insert(shape: any): void {
    let dat: ZPP_SweepData;
    if (ZPP_SweepData.zpp_pool == null) {
      dat = new ZPP_SweepData();
    } else {
      dat = ZPP_SweepData.zpp_pool;
      ZPP_SweepData.zpp_pool = dat.next;
      dat.next = null;
    }
    shape.sweep = dat;
    dat.shape = shape;
    dat.aabb = shape.aabb;
    dat.next = this.list;
    if (this.list != null) {
      this.list.prev = dat;
    }
    this.list = dat;
  }

  __remove(shape: any): void {
    const dat = shape.sweep as ZPP_SweepData;
    if (dat.prev == null) {
      this.list = dat.next;
    } else {
      dat.prev.next = dat.next;
    }
    if (dat.next != null) {
      dat.next.prev = dat.prev;
    }
    shape.sweep = null;
    const o = dat;
    o.prev = null;
    o.shape = null;
    o.aabb = null;
    o.next = ZPP_SweepData.zpp_pool;
    ZPP_SweepData.zpp_pool = o;
  }

  // ========== Sync (AABB update for shape) ==========

  __sync(shape: any): void {
    if (!this.space.continuous) {
      if (shape.zip_aabb) {
        if (shape.body != null) {
          shape.zip_aabb = false;
          if (shape.type == 0) {
            const _this = shape.circle;
            if (_this.zip_worldCOM) {
              if (_this.body != null) {
                _this.zip_worldCOM = false;
                if (_this.zip_localCOM) {
                  _this.zip_localCOM = false;
                  if (_this.type == 1) {
                    const _this1 = _this.polygon;
                    if (_this1.lverts.next == null) {
                      throw new Error("Error: An empty polygon has no meaningful localCOM");
                    }
                    if (_this1.lverts.next.next == null) {
                      _this1.localCOMx = _this1.lverts.next.x;
                      _this1.localCOMy = _this1.lverts.next.y;
                    } else if (_this1.lverts.next.next.next == null) {
                      _this1.localCOMx = _this1.lverts.next.x;
                      _this1.localCOMy = _this1.lverts.next.y;
                      const t = 1.0;
                      _this1.localCOMx += _this1.lverts.next.next.x * t;
                      _this1.localCOMy += _this1.lverts.next.next.y * t;
                      const t1 = 0.5;
                      _this1.localCOMx *= t1;
                      _this1.localCOMy *= t1;
                    } else {
                      _this1.localCOMx = 0;
                      _this1.localCOMy = 0;
                      let area = 0.0;
                      let cx_ite = _this1.lverts.next;
                      let u = cx_ite;
                      cx_ite = cx_ite.next;
                      let v = cx_ite;
                      cx_ite = cx_ite.next;
                      while (cx_ite != null) {
                        const w = cx_ite;
                        area += v.x * (w.y - u.y);
                        const cf = w.y * v.x - w.x * v.y;
                        _this1.localCOMx += (v.x + w.x) * cf;
                        _this1.localCOMy += (v.y + w.y) * cf;
                        u = v;
                        v = w;
                        cx_ite = cx_ite.next;
                      }
                      cx_ite = _this1.lverts.next;
                      const w1 = cx_ite;
                      area += v.x * (w1.y - u.y);
                      const cf1 = w1.y * v.x - w1.x * v.y;
                      _this1.localCOMx += (v.x + w1.x) * cf1;
                      _this1.localCOMy += (v.y + w1.y) * cf1;
                      u = v;
                      v = w1;
                      cx_ite = cx_ite.next;
                      const w2 = cx_ite;
                      area += v.x * (w2.y - u.y);
                      const cf2 = w2.y * v.x - w2.x * v.y;
                      _this1.localCOMx += (v.x + w2.x) * cf2;
                      _this1.localCOMy += (v.y + w2.y) * cf2;
                      area = 1 / (3 * area);
                      const t2 = area;
                      _this1.localCOMx *= t2;
                      _this1.localCOMy *= t2;
                    }
                  }
                  if (_this.wrap_localCOM != null) {
                    _this.wrap_localCOM.zpp_inner.x = _this.localCOMx;
                    _this.wrap_localCOM.zpp_inner.y = _this.localCOMy;
                  }
                }
                const _this2 = _this.body;
                if (_this2.zip_axis) {
                  _this2.zip_axis = false;
                  _this2.axisx = Math.sin(_this2.rot);
                  _this2.axisy = Math.cos(_this2.rot);
                }
                _this.worldCOMx =
                  _this.body.posx +
                  (_this.body.axisy * _this.localCOMx - _this.body.axisx * _this.localCOMy);
                _this.worldCOMy =
                  _this.body.posy +
                  (_this.localCOMx * _this.body.axisx + _this.localCOMy * _this.body.axisy);
              }
            }
            const rx = _this.radius;
            const ry = _this.radius;
            _this.aabb.minx = _this.worldCOMx - rx;
            _this.aabb.miny = _this.worldCOMy - ry;
            _this.aabb.maxx = _this.worldCOMx + rx;
            _this.aabb.maxy = _this.worldCOMy + ry;
          } else {
            const _this3 = shape.polygon;
            if (_this3.zip_gverts) {
              if (_this3.body != null) {
                _this3.zip_gverts = false;
                _this3.validate_lverts();
                const _this4 = _this3.body;
                if (_this4.zip_axis) {
                  _this4.zip_axis = false;
                  _this4.axisx = Math.sin(_this4.rot);
                  _this4.axisy = Math.cos(_this4.rot);
                }
                let li = _this3.lverts.next;
                let cx_ite1 = _this3.gverts.next;
                while (cx_ite1 != null) {
                  const g = cx_ite1;
                  const l = li;
                  li = li.next;
                  g.x = _this3.body.posx + (_this3.body.axisy * l.x - _this3.body.axisx * l.y);
                  g.y = _this3.body.posy + (l.x * _this3.body.axisx + l.y * _this3.body.axisy);
                  cx_ite1 = cx_ite1.next;
                }
              }
            }
            if (_this3.lverts.next == null) {
              throw new Error("Error: An empty polygon has no meaningful bounds");
            }
            const p0 = _this3.gverts.next;
            _this3.aabb.minx = p0.x;
            _this3.aabb.miny = p0.y;
            _this3.aabb.maxx = p0.x;
            _this3.aabb.maxy = p0.y;
            let cx_ite2 = _this3.gverts.next.next;
            while (cx_ite2 != null) {
              const p = cx_ite2;
              if (p.x < _this3.aabb.minx) {
                _this3.aabb.minx = p.x;
              }
              if (p.x > _this3.aabb.maxx) {
                _this3.aabb.maxx = p.x;
              }
              if (p.y < _this3.aabb.miny) {
                _this3.aabb.miny = p.y;
              }
              if (p.y > _this3.aabb.maxy) {
                _this3.aabb.maxy = p.y;
              }
              cx_ite2 = cx_ite2.next;
            }
          }
        }
      }
    }
  }

  // ========== Broadphase sorting ==========

  sync_broadphase(): void {
    (this as any).space.validation();
    if (this.list != null) {
      let a: ZPP_SweepData | null = this.list.next;
      while (a != null) {
        const n = a.next;
        let b: ZPP_SweepData | null = a.prev;
        if (b != null && a.aabb.minx > b.aabb.minx) {
          a = n;
          continue;
        }
        while (b!.prev != null && b!.prev.aabb.minx > a.aabb.minx) b = b!.prev;
        const prev = a.prev!;
        prev.next = a.next;
        if (a.next != null) {
          a.next.prev = prev;
        }
        if (b!.prev == null) {
          a.prev = null;
          this.list = a;
          a.next = b;
          b!.prev = a;
        } else {
          a.prev = b!.prev;
          b!.prev = a;
          a.prev!.next = a;
          a.next = b;
        }
        a = n;
      }
    }
  }

  sync_broadphase_fast(): void {
    let a: ZPP_SweepData | null = this.list!.next;
    while (a != null) {
      const n = a.next;
      let b: ZPP_SweepData | null = a.prev;
      if (b != null && a.aabb.minx > b.aabb.minx) {
        a = n;
        continue;
      }
      while (b!.prev != null && b!.prev.aabb.minx > a.aabb.minx) b = b!.prev;
      const prev = a.prev!;
      prev.next = a.next;
      if (a.next != null) {
        a.next.prev = prev;
      }
      if (b!.prev == null) {
        a.prev = null;
        this.list = a;
        a.next = b;
        b!.prev = a;
      } else {
        a.prev = b!.prev;
        b!.prev = a;
        a.prev!.next = a;
        a.next = b;
      }
      a = n;
    }
  }

  // ========== Broadphase pair detection ==========

  broadphase(space: any, discrete: boolean): void {
    if (this.list != null) {
      // Insertion sort pass
      let a: ZPP_SweepData | null = this.list.next;
      while (a != null) {
        const n = a.next;
        let b: ZPP_SweepData | null = a.prev;
        if (b != null && a.aabb.minx > b.aabb.minx) {
          a = n;
          continue;
        }
        while (b!.prev != null && b!.prev.aabb.minx > a.aabb.minx) b = b!.prev;
        const prev = a.prev!;
        prev.next = a.next;
        if (a.next != null) {
          a.next.prev = prev;
        }
        if (b!.prev == null) {
          a.prev = null;
          this.list = a;
          a.next = b;
          b!.prev = a;
        } else {
          a.prev = b!.prev;
          b!.prev = a;
          a.prev!.next = a;
          a.next = b;
        }
        a = n;
      }

      // Sweep-and-prune pair check
      let d1: ZPP_SweepData | null = this.list;
      while (d1 != null) {
        let d2: ZPP_SweepData | null = d1.next;
        const s1 = d1.shape;
        const b1 = s1.body;
        const bottom = d1.aabb.maxx;
        while (d2 != null) {
          if (d2.aabb.minx > bottom) {
            break;
          }
          const s2 = d2.shape;
          const b2 = s2.body;
          if (b2 == b1) {
            d2 = d2.next;
            continue;
          }
          if (b1.type == 1 && b2.type == 1) {
            d2 = d2.next;
            continue;
          }
          if (b1.component.sleeping && b2.component.sleeping) {
            d2 = d2.next;
            continue;
          }
          const _this = s1.aabb;
          const x = s2.aabb;
          if (!(x.miny > _this.maxy || _this.miny > x.maxy)) {
            if (discrete) {
              space.narrowPhase(s1, s2, b1.type != 2 || b2.type != 2, null, false);
            } else {
              space.continuousEvent(s1, s2, b1.type != 2 || b2.type != 2, null, false);
            }
          }
          d2 = d2.next;
        }
        d1 = d1.next;
      }
    }
  }

  // ========== Clear ==========

  clear(): void {
    while (this.list != null) {
      this.list.shape.removedFromSpace();
      this.__remove(this.list.shape);
    }
  }

  // ========== Spatial queries: shapes/bodies under point ==========

  shapesUnderPoint(x: number, y: number, filter: any, output: any): any {
    this.sync_broadphase();

    let ret: any;
    if (ZPP_Vec2.zpp_pool == null) {
      ret = new ZPP_Vec2();
    } else {
      ret = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.weak = false;
    ret._immutable = false;
    ret.x = x;
    ret.y = y;
    const v = ret;

    const ret1 = output == null ? new ZPP_SweepPhase._nape.shape.ShapeList() : output;

    let a: any = this.list;
    while (a != null && a.aabb.minx > x) a = a.next;
    while (a != null && a.aabb.minx <= x) {
      if (a.aabb.maxx >= x && a.aabb.miny <= y && a.aabb.maxy >= y) {
        const shape = a.shape;
        let tmp: boolean;
        if (filter != null) {
          const _this = shape.filter;
          tmp =
            (_this.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this.collisionGroup) != 0;
        } else {
          tmp = true;
        }
        if (tmp) {
          if (shape.type == 0) {
            if (ZPP_Collide.circleContains(shape.circle, v)) {
              ret1.push(shape.outer);
            }
          } else if (ZPP_Collide.polyContains(shape.polygon, v)) {
            ret1.push(shape.outer);
          }
        }
      }
      a = a.next;
    }

    // Release pooled vec2
    const o = v;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o._isimmutable = null;
    o._validate = null;
    o._invalidate = null;
    o.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = o;

    return ret1;
  }

  bodiesUnderPoint(x: number, y: number, filter: any, output: any): any {
    this.sync_broadphase();

    let ret: any;
    if (ZPP_Vec2.zpp_pool == null) {
      ret = new ZPP_Vec2();
    } else {
      ret = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.weak = false;
    ret._immutable = false;
    ret.x = x;
    ret.y = y;
    const v = ret;

    const ret1 = output == null ? new ZPP_SweepPhase._nape.phys.BodyList() : output;

    let a: any = this.list;
    while (a != null && a.aabb.minx > x) a = a.next;
    while (a != null && a.aabb.minx <= x) {
      if (a.aabb.maxx >= x && a.aabb.miny <= y && a.aabb.maxy >= y) {
        const shape = a.shape;
        const body = shape.body.outer;
        if (!ret1.has(body)) {
          let tmp: boolean;
          if (filter != null) {
            const _this = shape.filter;
            tmp =
              (_this.collisionMask & filter.collisionGroup) != 0 &&
              (filter.collisionMask & _this.collisionGroup) != 0;
          } else {
            tmp = true;
          }
          if (tmp) {
            if (shape.type == 0) {
              if (ZPP_Collide.circleContains(shape.circle, v)) {
                ret1.push(body);
              }
            } else if (ZPP_Collide.polyContains(shape.polygon, v)) {
              ret1.push(body);
            }
          }
        }
      }
      a = a.next;
    }

    // Release pooled vec2
    const o = v;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o._isimmutable = null;
    o._validate = null;
    o._invalidate = null;
    o.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = o;

    return ret1;
  }

  // ========== Spatial queries: shapes/bodies in AABB ==========

  shapesInAABB(aabb: any, strict: boolean, containment: boolean, filter: any, output: any): any {
    this.sync_broadphase();
    (this as any).updateAABBShape(aabb);
    const ab = (this as any).aabbShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_SweepPhase._nape.shape.ShapeList() : output;

    let a: any = this.list;
    while (a != null && a.aabb.maxx < ab.minx) a = a.next;
    while (a != null && a.aabb.minx <= ab.maxx) {
      const shape = a.shape;
      let tmp: boolean;
      if (filter != null) {
        const _this = shape.filter;
        tmp =
          (_this.collisionMask & filter.collisionGroup) != 0 &&
          (filter.collisionMask & _this.collisionGroup) != 0;
      } else {
        tmp = true;
      }
      if (tmp) {
        if (strict) {
          if (containment) {
            if (ZPP_Collide.containTest((this as any).aabbShape.zpp_inner, shape)) {
              ret.push(shape.outer);
            }
          } else {
            const x = a.aabb;
            if (x.minx >= ab.minx && x.miny >= ab.miny && x.maxx <= ab.maxx && x.maxy <= ab.maxy) {
              ret.push(shape.outer);
            } else {
              const _this1 = a.aabb;
              if (
                ab.miny <= _this1.maxy &&
                _this1.miny <= ab.maxy &&
                ab.minx <= _this1.maxx &&
                _this1.minx <= ab.maxx
              ) {
                if (ZPP_Collide.testCollide_safe(shape, (this as any).aabbShape.zpp_inner)) {
                  ret.push(shape.outer);
                }
              }
            }
          }
        } else {
          let tmp1: boolean;
          if (containment) {
            const x1 = a.aabb;
            tmp1 =
              x1.minx >= ab.minx && x1.miny >= ab.miny && x1.maxx <= ab.maxx && x1.maxy <= ab.maxy;
          } else {
            const _this2 = a.aabb;
            tmp1 =
              ab.miny <= _this2.maxy &&
              _this2.miny <= ab.maxy &&
              ab.minx <= _this2.maxx &&
              _this2.minx <= ab.maxx;
          }
          if (tmp1) {
            ret.push(shape.outer);
          }
        }
      }
      a = a.next;
    }
    return ret;
  }

  bodiesInAABB(aabb: any, strict: boolean, containment: boolean, filter: any, output: any): any {
    this.sync_broadphase();
    (this as any).updateAABBShape(aabb);
    const ab = (this as any).aabbShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_SweepPhase._nape.phys.BodyList() : output;
    if (this.failed == null) {
      this.failed = new ZPP_SweepPhase._nape.phys.BodyList();
    }

    let a: any = this.list;
    while (a != null && a.aabb.maxx < ab.minx) a = a.next;
    while (a != null && a.aabb.minx <= ab.maxx) {
      const shape = a.shape;
      const body = shape.body.outer;
      const _this = a.aabb;
      if (
        ab.miny <= _this.maxy &&
        _this.miny <= ab.maxy &&
        ab.minx <= _this.maxx &&
        _this.minx <= ab.maxx
      ) {
        let tmp: boolean;
        if (filter != null) {
          const _this1 = shape.filter;
          tmp =
            (_this1.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this1.collisionGroup) != 0;
        } else {
          tmp = true;
        }
        if (tmp) {
          if (strict) {
            if (containment) {
              if (!this.failed.has(body)) {
                const col = ZPP_Collide.containTest((this as any).aabbShape.zpp_inner, shape);
                if (!ret.has(body) && col) {
                  ret.push(body);
                } else if (!col) {
                  ret.remove(body);
                  this.failed.push(body);
                }
              }
            } else if (
              !ret.has(body) &&
              ZPP_Collide.testCollide_safe(shape, (this as any).aabbShape.zpp_inner)
            ) {
              ret.push(body);
            }
          } else if (containment) {
            if (!this.failed.has(body)) {
              const x = shape.aabb;
              const col1 =
                x.minx >= ab.minx && x.miny >= ab.miny && x.maxx <= ab.maxx && x.maxy <= ab.maxy;
              if (!ret.has(body) && col1) {
                ret.push(body);
              } else if (!col1) {
                ret.remove(body);
                this.failed.push(body);
              }
            }
          } else {
            let tmp1: boolean;
            if (!ret.has(body)) {
              const x1 = shape.aabb;
              tmp1 =
                x1.minx >= ab.minx &&
                x1.miny >= ab.miny &&
                x1.maxx <= ab.maxx &&
                x1.maxy <= ab.maxy;
            } else {
              tmp1 = false;
            }
            if (tmp1) {
              ret.push(body);
            }
          }
        }
      }
      a = a.next;
    }
    this.failed.clear();
    return ret;
  }

  // ========== Spatial queries: shapes/bodies in circle ==========

  shapesInCircle(
    x: number,
    y: number,
    r: number,
    containment: boolean,
    filter: any,
    output: any,
  ): any {
    this.sync_broadphase();
    (this as any).updateCircShape(x, y, r);
    const ab = (this as any).circShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_SweepPhase._nape.shape.ShapeList() : output;

    let a: any = this.list;
    while (a != null && a.aabb.maxx < ab.minx) a = a.next;
    while (a != null && a.aabb.minx <= ab.maxx) {
      const _this = a.aabb;
      if (
        ab.miny <= _this.maxy &&
        _this.miny <= ab.maxy &&
        ab.minx <= _this.maxx &&
        _this.minx <= ab.maxx
      ) {
        const shape = a.shape;
        let tmp: boolean;
        if (filter != null) {
          const _this1 = shape.filter;
          tmp =
            (_this1.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this1.collisionGroup) != 0;
        } else {
          tmp = true;
        }
        if (tmp) {
          if (containment) {
            if (ZPP_Collide.containTest((this as any).circShape.zpp_inner, shape)) {
              ret.push(shape.outer);
            }
          } else if (ZPP_Collide.testCollide_safe(shape, (this as any).circShape.zpp_inner)) {
            ret.push(shape.outer);
          }
        }
      }
      a = a.next;
    }
    return ret;
  }

  bodiesInCircle(
    x: number,
    y: number,
    r: number,
    containment: boolean,
    filter: any,
    output: any,
  ): any {
    this.sync_broadphase();
    (this as any).updateCircShape(x, y, r);
    const ab = (this as any).circShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_SweepPhase._nape.phys.BodyList() : output;
    if (this.failed == null) {
      this.failed = new ZPP_SweepPhase._nape.phys.BodyList();
    }

    let a: any = this.list;
    while (a != null && a.aabb.maxx < ab.minx) a = a.next;
    while (a != null && a.aabb.minx <= ab.maxx) {
      const _this = a.aabb;
      if (
        ab.miny <= _this.maxy &&
        _this.miny <= ab.maxy &&
        ab.minx <= _this.maxx &&
        _this.minx <= ab.maxx
      ) {
        const shape = a.shape;
        const body = shape.body.outer;
        let tmp: boolean;
        if (filter != null) {
          const _this1 = shape.filter;
          tmp =
            (_this1.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this1.collisionGroup) != 0;
        } else {
          tmp = true;
        }
        if (tmp) {
          if (containment) {
            if (!this.failed.has(body)) {
              const col = ZPP_Collide.containTest((this as any).circShape.zpp_inner, shape);
              if (!ret.has(body) && col) {
                ret.push(body);
              } else if (!col) {
                ret.remove(body);
                this.failed.push(body);
              }
            }
          } else if (
            !ret.has(body) &&
            ZPP_Collide.testCollide_safe(shape, (this as any).circShape.zpp_inner)
          ) {
            ret.push(body);
          }
        }
      }
      a = a.next;
    }
    this.failed.clear();
    return ret;
  }

  // ========== Spatial queries: shapes/bodies in shape ==========

  shapesInShape(shape: any, containment: boolean, filter: any, output: any): any {
    this.sync_broadphase();
    (this as any).validateShape(shape);
    const ab = shape.aabb;
    const ret = output == null ? new ZPP_SweepPhase._nape.shape.ShapeList() : output;

    let a: any = this.list;
    while (a != null && a.aabb.maxx < ab.minx) a = a.next;
    while (a != null && a.aabb.minx <= ab.maxx) {
      const _this = a.aabb;
      if (
        ab.miny <= _this.maxy &&
        _this.miny <= ab.maxy &&
        ab.minx <= _this.maxx &&
        _this.minx <= ab.maxx
      ) {
        const shape2 = a.shape;
        let tmp: boolean;
        if (filter != null) {
          const _this1 = shape2.filter;
          tmp =
            (_this1.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this1.collisionGroup) != 0;
        } else {
          tmp = true;
        }
        if (tmp) {
          if (containment) {
            if (ZPP_Collide.containTest(shape, shape2)) {
              ret.push(shape2.outer);
            }
          } else if (ZPP_Collide.testCollide_safe(shape2, shape)) {
            ret.push(shape2.outer);
          }
        }
      }
      a = a.next;
    }
    return ret;
  }

  bodiesInShape(shape: any, containment: boolean, filter: any, output: any): any {
    this.sync_broadphase();
    (this as any).validateShape(shape);
    const ab = shape.aabb;
    const ret = output == null ? new ZPP_SweepPhase._nape.phys.BodyList() : output;
    if (this.failed == null) {
      this.failed = new ZPP_SweepPhase._nape.phys.BodyList();
    }

    let a: any = this.list;
    while (a != null && a.aabb.maxx < ab.minx) a = a.next;
    while (a != null && a.aabb.minx <= ab.maxx) {
      const _this = a.aabb;
      if (
        ab.miny <= _this.maxy &&
        _this.miny <= ab.maxy &&
        ab.minx <= _this.maxx &&
        _this.minx <= ab.maxx
      ) {
        const shape2 = a.shape;
        const body = shape2.body.outer;
        let tmp: boolean;
        if (filter != null) {
          const _this1 = shape2.filter;
          tmp =
            (_this1.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this1.collisionGroup) != 0;
        } else {
          tmp = true;
        }
        if (tmp) {
          if (containment) {
            if (!this.failed.has(body)) {
              const col = ZPP_Collide.containTest(shape, shape2);
              if (!ret.has(body) && col) {
                ret.push(body);
              } else if (!col) {
                ret.remove(body);
                this.failed.push(body);
              }
            }
          } else if (!ret.has(body) && ZPP_Collide.testCollide_safe(shape, shape2)) {
            ret.push(body);
          }
        }
      }
      a = a.next;
    }
    this.failed.clear();
    return ret;
  }

  // ========== Raycasting ==========

  rayCast(ray: any, inner: boolean, filter: any): any {
    this.sync_broadphase();
    ray.validate_dir();
    const rayab = ray.rayAABB();
    let mint = ray.maxdist;
    let minres: any = null;

    if (ray.dirx == 0) {
      let a: any = this.list;
      while (a != null && a.aabb.minx <= rayab.minx) {
        let tmp: boolean;
        const _this = a.aabb;
        if (
          rayab.miny <= _this.maxy &&
          _this.miny <= rayab.maxy &&
          rayab.minx <= _this.maxx &&
          _this.minx <= rayab.maxx
        ) {
          if (filter != null) {
            const _this1 = a.shape.filter;
            tmp =
              (_this1.collisionMask & filter.collisionGroup) != 0 &&
              (filter.collisionMask & _this1.collisionGroup) != 0;
          } else {
            tmp = true;
          }
        } else {
          tmp = false;
        }
        if (tmp) {
          const t = ray.aabbsect(a.aabb);
          if (t >= 0 && t < mint) {
            const result =
              a.shape.type == 0
                ? ray.circlesect(a.shape.circle, inner, mint)
                : ray.polysect(a.shape.polygon, inner, mint);
            if (result != null) {
              if (result.zpp_inner.next != null) {
                throw new Error("Error: This object has been disposed of and cannot be used");
              }
              mint = result.zpp_inner.toiDistance;
              if (minres != null) {
                if (minres.zpp_inner.next != null) {
                  throw new Error("Error: This object has been disposed of and cannot be used");
                }
                minres.zpp_inner.free();
              }
              minres = result;
            }
          }
        }
        a = a.next;
      }
    } else if (ray.dirx < 0) {
      let a1: any = this.list;
      let b: any = null;
      while (a1 != null && a1.aabb.minx <= rayab.maxx) {
        b = a1;
        a1 = a1.next;
      }
      a1 = b;
      while (a1 != null) {
        let tmp1: boolean;
        const _this2 = a1.aabb;
        if (
          rayab.miny <= _this2.maxy &&
          _this2.miny <= rayab.maxy &&
          rayab.minx <= _this2.maxx &&
          _this2.minx <= rayab.maxx
        ) {
          if (filter != null) {
            const _this3 = a1.shape.filter;
            tmp1 =
              (_this3.collisionMask & filter.collisionGroup) != 0 &&
              (filter.collisionMask & _this3.collisionGroup) != 0;
          } else {
            tmp1 = true;
          }
        } else {
          tmp1 = false;
        }
        if (tmp1) {
          const t1 = ray.aabbsect(a1.aabb);
          if (t1 >= 0 && t1 < mint) {
            const result1 =
              a1.shape.type == 0
                ? ray.circlesect(a1.shape.circle, inner, mint)
                : ray.polysect(a1.shape.polygon, inner, mint);
            if (result1 != null) {
              if (result1.zpp_inner.next != null) {
                throw new Error("Error: This object has been disposed of and cannot be used");
              }
              mint = result1.zpp_inner.toiDistance;
              if (minres != null) {
                if (minres.zpp_inner.next != null) {
                  throw new Error("Error: This object has been disposed of and cannot be used");
                }
                minres.zpp_inner.free();
              }
              minres = result1;
            }
          }
        }
        a1 = a1.prev;
      }
    } else {
      let a2: any = this.list;
      while (
        a2 != null &&
        a2.aabb.minx <= rayab.maxx &&
        a2.aabb.minx < ray.originx + ray.dirx * mint
      ) {
        let tmp2: boolean;
        const _this4 = a2.aabb;
        if (
          rayab.miny <= _this4.maxy &&
          _this4.miny <= rayab.maxy &&
          rayab.minx <= _this4.maxx &&
          _this4.minx <= rayab.maxx
        ) {
          if (filter != null) {
            const _this5 = a2.shape.filter;
            tmp2 =
              (_this5.collisionMask & filter.collisionGroup) != 0 &&
              (filter.collisionMask & _this5.collisionGroup) != 0;
          } else {
            tmp2 = true;
          }
        } else {
          tmp2 = false;
        }
        if (tmp2) {
          const t2 = ray.aabbsect(a2.aabb);
          if (t2 >= 0 && t2 < mint) {
            const result2 =
              a2.shape.type == 0
                ? ray.circlesect(a2.shape.circle, inner, mint)
                : ray.polysect(a2.shape.polygon, inner, mint);
            if (result2 != null) {
              if (result2.zpp_inner.next != null) {
                throw new Error("Error: This object has been disposed of and cannot be used");
              }
              mint = result2.zpp_inner.toiDistance;
              if (minres != null) {
                if (minres.zpp_inner.next != null) {
                  throw new Error("Error: This object has been disposed of and cannot be used");
                }
                minres.zpp_inner.free();
              }
              minres = result2;
            }
          }
        }
        a2 = a2.next;
      }
    }

    // Release pooled AABB
    const o = rayab;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o.wrap_min = o.wrap_max = null;
    o._invalidate = null;
    o._validate = null;
    o.next = ZPP_AABB.zpp_pool;
    ZPP_AABB.zpp_pool = o;

    return minres;
  }

  rayMultiCast(ray: any, inner: boolean, filter: any, output: any): any {
    this.sync_broadphase();
    ray.validate_dir();
    const rayab = ray.rayAABB();
    const ret = output == null ? new ZPP_SweepPhase._nape.geom.RayResultList() : output;

    if (ray.dirx == 0) {
      let a: any = this.list;
      while (a != null && a.aabb.minx <= rayab.minx) {
        let tmp: boolean;
        const _this = a.aabb;
        if (
          rayab.miny <= _this.maxy &&
          _this.miny <= rayab.maxy &&
          rayab.minx <= _this.maxx &&
          _this.minx <= rayab.maxx
        ) {
          if (filter != null) {
            const _this1 = a.shape.filter;
            tmp =
              (_this1.collisionMask & filter.collisionGroup) != 0 &&
              (filter.collisionMask & _this1.collisionGroup) != 0;
          } else {
            tmp = true;
          }
        } else {
          tmp = false;
        }
        if (tmp) {
          const t = ray.aabbsect(a.aabb);
          if (t >= 0) {
            if (a.shape.type == 0) {
              ray.circlesect2(a.shape.circle, inner, ret);
            } else {
              ray.polysect2(a.shape.polygon, inner, ret);
            }
          }
        }
        a = a.next;
      }
    } else if (ray.dirx < 0) {
      let a1: any = this.list;
      let b: any = null;
      while (a1 != null && a1.aabb.minx <= rayab.maxx) {
        b = a1;
        a1 = a1.next;
      }
      a1 = b;
      while (a1 != null) {
        let tmp1: boolean;
        const _this2 = a1.aabb;
        if (
          rayab.miny <= _this2.maxy &&
          _this2.miny <= rayab.maxy &&
          rayab.minx <= _this2.maxx &&
          _this2.minx <= rayab.maxx
        ) {
          if (filter != null) {
            const _this3 = a1.shape.filter;
            tmp1 =
              (_this3.collisionMask & filter.collisionGroup) != 0 &&
              (filter.collisionMask & _this3.collisionGroup) != 0;
          } else {
            tmp1 = true;
          }
        } else {
          tmp1 = false;
        }
        if (tmp1) {
          const t1 = ray.aabbsect(a1.aabb);
          if (t1 >= 0) {
            if (a1.shape.type == 0) {
              ray.circlesect2(a1.shape.circle, inner, ret);
            } else {
              ray.polysect2(a1.shape.polygon, inner, ret);
            }
          }
        }
        a1 = a1.prev;
      }
    } else {
      let a2: any = this.list;
      while (a2 != null && a2.aabb.minx <= rayab.maxx) {
        let tmp2: boolean;
        const _this4 = a2.aabb;
        if (
          rayab.miny <= _this4.maxy &&
          _this4.miny <= rayab.maxy &&
          rayab.minx <= _this4.maxx &&
          _this4.minx <= rayab.maxx
        ) {
          if (filter != null) {
            const _this5 = a2.shape.filter;
            tmp2 =
              (_this5.collisionMask & filter.collisionGroup) != 0 &&
              (filter.collisionMask & _this5.collisionGroup) != 0;
          } else {
            tmp2 = true;
          }
        } else {
          tmp2 = false;
        }
        if (tmp2) {
          const t2 = ray.aabbsect(a2.aabb);
          if (t2 >= 0) {
            if (a2.shape.type == 0) {
              ray.circlesect2(a2.shape.circle, inner, ret);
            } else {
              ray.polysect2(a2.shape.polygon, inner, ret);
            }
          }
        }
        a2 = a2.next;
      }
    }

    // Release pooled AABB
    const o = rayab;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o.wrap_min = o.wrap_max = null;
    o._invalidate = null;
    o._validate = null;
    o.next = ZPP_AABB.zpp_pool;
    ZPP_AABB.zpp_pool = o;

    return ret;
  }
}
