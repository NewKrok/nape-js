/**
 * ZPP_Broadphase — Internal base broadphase container.
 *
 * Provides the interface and shared logic for broadphase collision detection.
 * Delegates to either a sweep-and-prune (ZPP_SweepPhase) or dynamic AABB tree
 * (ZPP_DynAABBPhase) implementation. Contains helper methods for creating
 * temporary AABB/circle shapes for spatial queries, and inlined AABB/worldCOM
 * validation logic used during shape synchronization.
 *
 * Converted from nape-compiled.js lines 25280–26724.
 */

export class ZPP_Broadphase {
  // --- Static: Haxe metadata ---

  // --- Static: lazy namespace references ---
  static _zpp: any = null;
  static _nape: any = null;

  // --- Instance fields ---
  space: any = null; // ZPP_Space — circular
  is_sweep: boolean = false;
  sweep: any = null; // ZPP_SweepPhase — circular
  dynab: any = null; // ZPP_DynAABBPhase — circular
  aabbShape: any = null; // ZPP_Shape — circular
  matrix: any = null; // ZPP_Mat23 — circular
  circShape: any = null; // ZPP_Shape — circular

  /**
   * Initialize instance fields on a target object.
   * Used by child class constructors (both TS and compiled) since
   * ES6 class constructors can't be called with .call().
   */
  static _initFields(self: any): void {
    self.space = null;
    self.is_sweep = false;
    self.sweep = null;
    self.dynab = null;
    self.aabbShape = null;
    self.matrix = null;
    self.circShape = null;
  }

  // ========== insert / remove / sync ==========

  insert(shape: any): void {
    if (this.is_sweep) {
      this.sweep.__insert(shape);
    } else {
      this.dynab.__insert(shape);
    }
  }

  remove(shape: any): void {
    if (this.is_sweep) {
      this.sweep.__remove(shape);
    } else {
      this.dynab.__remove(shape);
    }
  }

  sync(shape: any): void {
    if (this.is_sweep) {
      if (!this.sweep.space.continuous) {
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
    } else {
      const _this5 = this.dynab;
      const node = shape.node;
      if (!node.synced) {
        if (!_this5.space.continuous) {
          if (shape.zip_aabb) {
            if (shape.body != null) {
              shape.zip_aabb = false;
              if (shape.type == 0) {
                const _this6 = shape.circle;
                if (_this6.zip_worldCOM) {
                  if (_this6.body != null) {
                    _this6.zip_worldCOM = false;
                    if (_this6.zip_localCOM) {
                      _this6.zip_localCOM = false;
                      if (_this6.type == 1) {
                        const _this7 = _this6.polygon;
                        if (_this7.lverts.next == null) {
                          throw new Error("Error: An empty polygon has no meaningful localCOM");
                        }
                        if (_this7.lverts.next.next == null) {
                          _this7.localCOMx = _this7.lverts.next.x;
                          _this7.localCOMy = _this7.lverts.next.y;
                        } else if (_this7.lverts.next.next.next == null) {
                          _this7.localCOMx = _this7.lverts.next.x;
                          _this7.localCOMy = _this7.lverts.next.y;
                          const t3 = 1.0;
                          _this7.localCOMx += _this7.lverts.next.next.x * t3;
                          _this7.localCOMy += _this7.lverts.next.next.y * t3;
                          const t4 = 0.5;
                          _this7.localCOMx *= t4;
                          _this7.localCOMy *= t4;
                        } else {
                          _this7.localCOMx = 0;
                          _this7.localCOMy = 0;
                          let area1 = 0.0;
                          let cx_ite3 = _this7.lverts.next;
                          let u1 = cx_ite3;
                          cx_ite3 = cx_ite3.next;
                          let v1 = cx_ite3;
                          cx_ite3 = cx_ite3.next;
                          while (cx_ite3 != null) {
                            const w3 = cx_ite3;
                            area1 += v1.x * (w3.y - u1.y);
                            const cf3 = w3.y * v1.x - w3.x * v1.y;
                            _this7.localCOMx += (v1.x + w3.x) * cf3;
                            _this7.localCOMy += (v1.y + w3.y) * cf3;
                            u1 = v1;
                            v1 = w3;
                            cx_ite3 = cx_ite3.next;
                          }
                          cx_ite3 = _this7.lverts.next;
                          const w4 = cx_ite3;
                          area1 += v1.x * (w4.y - u1.y);
                          const cf4 = w4.y * v1.x - w4.x * v1.y;
                          _this7.localCOMx += (v1.x + w4.x) * cf4;
                          _this7.localCOMy += (v1.y + w4.y) * cf4;
                          u1 = v1;
                          v1 = w4;
                          cx_ite3 = cx_ite3.next;
                          const w5 = cx_ite3;
                          area1 += v1.x * (w5.y - u1.y);
                          const cf5 = w5.y * v1.x - w5.x * v1.y;
                          _this7.localCOMx += (v1.x + w5.x) * cf5;
                          _this7.localCOMy += (v1.y + w5.y) * cf5;
                          area1 = 1 / (3 * area1);
                          const t5 = area1;
                          _this7.localCOMx *= t5;
                          _this7.localCOMy *= t5;
                        }
                      }
                      if (_this6.wrap_localCOM != null) {
                        _this6.wrap_localCOM.zpp_inner.x = _this6.localCOMx;
                        _this6.wrap_localCOM.zpp_inner.y = _this6.localCOMy;
                      }
                    }
                    const _this8 = _this6.body;
                    if (_this8.zip_axis) {
                      _this8.zip_axis = false;
                      _this8.axisx = Math.sin(_this8.rot);
                      _this8.axisy = Math.cos(_this8.rot);
                    }
                    _this6.worldCOMx =
                      _this6.body.posx +
                      (_this6.body.axisy * _this6.localCOMx - _this6.body.axisx * _this6.localCOMy);
                    _this6.worldCOMy =
                      _this6.body.posy +
                      (_this6.localCOMx * _this6.body.axisx + _this6.localCOMy * _this6.body.axisy);
                  }
                }
                const rx1 = _this6.radius;
                const ry1 = _this6.radius;
                _this6.aabb.minx = _this6.worldCOMx - rx1;
                _this6.aabb.miny = _this6.worldCOMy - ry1;
                _this6.aabb.maxx = _this6.worldCOMx + rx1;
                _this6.aabb.maxy = _this6.worldCOMy + ry1;
              } else {
                const _this9 = shape.polygon;
                if (_this9.zip_gverts) {
                  if (_this9.body != null) {
                    _this9.zip_gverts = false;
                    _this9.validate_lverts();
                    const _this10 = _this9.body;
                    if (_this10.zip_axis) {
                      _this10.zip_axis = false;
                      _this10.axisx = Math.sin(_this10.rot);
                      _this10.axisy = Math.cos(_this10.rot);
                    }
                    let li1 = _this9.lverts.next;
                    let cx_ite4 = _this9.gverts.next;
                    while (cx_ite4 != null) {
                      const g1 = cx_ite4;
                      const l1 = li1;
                      li1 = li1.next;
                      g1.x =
                        _this9.body.posx + (_this9.body.axisy * l1.x - _this9.body.axisx * l1.y);
                      g1.y =
                        _this9.body.posy + (l1.x * _this9.body.axisx + l1.y * _this9.body.axisy);
                      cx_ite4 = cx_ite4.next;
                    }
                  }
                }
                if (_this9.lverts.next == null) {
                  throw new Error("Error: An empty polygon has no meaningful bounds");
                }
                const p01 = _this9.gverts.next;
                _this9.aabb.minx = p01.x;
                _this9.aabb.miny = p01.y;
                _this9.aabb.maxx = p01.x;
                _this9.aabb.maxy = p01.y;
                let cx_ite5 = _this9.gverts.next.next;
                while (cx_ite5 != null) {
                  const p1 = cx_ite5;
                  if (p1.x < _this9.aabb.minx) {
                    _this9.aabb.minx = p1.x;
                  }
                  if (p1.x > _this9.aabb.maxx) {
                    _this9.aabb.maxx = p1.x;
                  }
                  if (p1.y < _this9.aabb.miny) {
                    _this9.aabb.miny = p1.y;
                  }
                  if (p1.y > _this9.aabb.maxy) {
                    _this9.aabb.maxy = p1.y;
                  }
                  cx_ite5 = cx_ite5.next;
                }
              }
            }
          }
        }
        let sync: boolean;
        if (node.dyn == (shape.body.type == 1 ? false : !shape.body.component.sleeping)) {
          const _this11 = node.aabb;
          const x = shape.aabb;
          sync = !(
            x.minx >= _this11.minx &&
            x.miny >= _this11.miny &&
            x.maxx <= _this11.maxx &&
            x.maxy <= _this11.maxy
          );
        } else {
          sync = true;
        }
        if (sync) {
          node.synced = true;
          node.snext = _this5.syncs;
          _this5.syncs = node;
        }
      }
    }
  }

  // ========== broadphase / clear (overridden by subclasses) ==========

  broadphase(_space: any, _discrete: boolean): void {}

  clear(): void {}

  // ========== Spatial queries (overridden by subclasses) ==========

  shapesUnderPoint(_x: number, _y: number, _filter: any, _output: any): any {
    return null;
  }

  bodiesUnderPoint(_x: number, _y: number, _filter: any, _output: any): any {
    return null;
  }

  // ========== updateAABBShape ==========

  updateAABBShape(aabb: any): void {
    const zpp = ZPP_Broadphase._zpp;
    const nape = ZPP_Broadphase._nape;

    if (this.aabbShape == null) {
      if (zpp.util.ZPP_Flags.BodyType_STATIC == null) {
        zpp.util.ZPP_Flags.internal = true;
        zpp.util.ZPP_Flags.BodyType_STATIC = new nape.phys.BodyType();
        zpp.util.ZPP_Flags.internal = false;
      }
      const body = new nape.phys.Body(zpp.util.ZPP_Flags.BodyType_STATIC);
      const _this = body.zpp_inner.wrap_shapes;
      const obj = (this.aabbShape = new nape.shape.Polygon(
        nape.shape.Polygon.rect(aabb.minx, aabb.miny, aabb.maxx - aabb.minx, aabb.maxy - aabb.miny),
      ));
      if (_this.zpp_inner.reverse_flag) {
        _this.push(obj);
      } else {
        _this.unshift(obj);
      }
    } else {
      const ab = this.aabbShape.zpp_inner.aabb;
      const sx = (aabb.maxx - aabb.minx) / (ab.maxx - ab.minx);
      const sy = (aabb.maxy - aabb.miny) / (ab.maxy - ab.miny);
      if (this.matrix == null) {
        this.matrix = new nape.geom.Mat23();
      }
      const _this1 = this.matrix;
      if (sx !== sx) {
        throw new Error("Error: Mat23::a cannot be NaN");
      }
      _this1.zpp_inner.a = sx;
      const _this2 = _this1.zpp_inner;
      if (_this2._invalidate != null) {
        _this2._invalidate();
      }
      const _this3 = this.matrix;
      const _this4 = this.matrix;
      _this4.zpp_inner.c = 0;
      const _this5 = _this4.zpp_inner;
      if (_this5._invalidate != null) {
        _this5._invalidate();
      }
      const b = _this4.zpp_inner.c;
      if (b !== b) {
        throw new Error("Error: Mat23::b cannot be NaN");
      }
      _this3.zpp_inner.b = b;
      const _this6 = _this3.zpp_inner;
      if (_this6._invalidate != null) {
        _this6._invalidate();
      }
      const _this7 = this.matrix;
      if (sy !== sy) {
        throw new Error("Error: Mat23::d cannot be NaN");
      }
      _this7.zpp_inner.d = sy;
      const _this8 = _this7.zpp_inner;
      if (_this8._invalidate != null) {
        _this8._invalidate();
      }
      const _this9 = this.matrix;
      const tx = aabb.minx - sx * ab.minx;
      if (tx !== tx) {
        throw new Error("Error: Mat23::tx cannot be NaN");
      }
      _this9.zpp_inner.tx = tx;
      const _this10 = _this9.zpp_inner;
      if (_this10._invalidate != null) {
        _this10._invalidate();
      }
      const _this11 = this.matrix;
      const ty = aabb.miny - sy * ab.miny;
      if (ty !== ty) {
        throw new Error("Error: Mat23::ty cannot be NaN");
      }
      _this11.zpp_inner.ty = ty;
      const _this12 = _this11.zpp_inner;
      if (_this12._invalidate != null) {
        _this12._invalidate();
      }
      this.aabbShape.transform(this.matrix);
    }
    const _this13 = this.aabbShape.zpp_inner;
    if (_this13.zip_aabb) {
      if (_this13.body != null) {
        _this13.zip_aabb = false;
        if (_this13.type == 0) {
          const _this14 = _this13.circle;
          if (_this14.zip_worldCOM) {
            if (_this14.body != null) {
              _this14.zip_worldCOM = false;
              if (_this14.zip_localCOM) {
                _this14.zip_localCOM = false;
                if (_this14.type == 1) {
                  const _this15 = _this14.polygon;
                  if (_this15.lverts.next == null) {
                    throw new Error("Error: An empty polygon has no meaningful localCOM");
                  }
                  if (_this15.lverts.next.next == null) {
                    _this15.localCOMx = _this15.lverts.next.x;
                    _this15.localCOMy = _this15.lverts.next.y;
                  } else if (_this15.lverts.next.next.next == null) {
                    _this15.localCOMx = _this15.lverts.next.x;
                    _this15.localCOMy = _this15.lverts.next.y;
                    const t = 1.0;
                    _this15.localCOMx += _this15.lverts.next.next.x * t;
                    _this15.localCOMy += _this15.lverts.next.next.y * t;
                    const t1 = 0.5;
                    _this15.localCOMx *= t1;
                    _this15.localCOMy *= t1;
                  } else {
                    _this15.localCOMx = 0;
                    _this15.localCOMy = 0;
                    let area = 0.0;
                    let cx_ite = _this15.lverts.next;
                    let u = cx_ite;
                    cx_ite = cx_ite.next;
                    let v = cx_ite;
                    cx_ite = cx_ite.next;
                    while (cx_ite != null) {
                      const w = cx_ite;
                      area += v.x * (w.y - u.y);
                      const cf = w.y * v.x - w.x * v.y;
                      _this15.localCOMx += (v.x + w.x) * cf;
                      _this15.localCOMy += (v.y + w.y) * cf;
                      u = v;
                      v = w;
                      cx_ite = cx_ite.next;
                    }
                    cx_ite = _this15.lverts.next;
                    const w1 = cx_ite;
                    area += v.x * (w1.y - u.y);
                    const cf1 = w1.y * v.x - w1.x * v.y;
                    _this15.localCOMx += (v.x + w1.x) * cf1;
                    _this15.localCOMy += (v.y + w1.y) * cf1;
                    u = v;
                    v = w1;
                    cx_ite = cx_ite.next;
                    const w2 = cx_ite;
                    area += v.x * (w2.y - u.y);
                    const cf2 = w2.y * v.x - w2.x * v.y;
                    _this15.localCOMx += (v.x + w2.x) * cf2;
                    _this15.localCOMy += (v.y + w2.y) * cf2;
                    area = 1 / (3 * area);
                    const t2 = area;
                    _this15.localCOMx *= t2;
                    _this15.localCOMy *= t2;
                  }
                }
                if (_this14.wrap_localCOM != null) {
                  _this14.wrap_localCOM.zpp_inner.x = _this14.localCOMx;
                  _this14.wrap_localCOM.zpp_inner.y = _this14.localCOMy;
                }
              }
              const _this16 = _this14.body;
              if (_this16.zip_axis) {
                _this16.zip_axis = false;
                _this16.axisx = Math.sin(_this16.rot);
                _this16.axisy = Math.cos(_this16.rot);
              }
              _this14.worldCOMx =
                _this14.body.posx +
                (_this14.body.axisy * _this14.localCOMx - _this14.body.axisx * _this14.localCOMy);
              _this14.worldCOMy =
                _this14.body.posy +
                (_this14.localCOMx * _this14.body.axisx + _this14.localCOMy * _this14.body.axisy);
            }
          }
          const rx = _this14.radius;
          const ry = _this14.radius;
          _this14.aabb.minx = _this14.worldCOMx - rx;
          _this14.aabb.miny = _this14.worldCOMy - ry;
          _this14.aabb.maxx = _this14.worldCOMx + rx;
          _this14.aabb.maxy = _this14.worldCOMy + ry;
        } else {
          const _this17 = _this13.polygon;
          if (_this17.zip_gverts) {
            if (_this17.body != null) {
              _this17.zip_gverts = false;
              _this17.validate_lverts();
              const _this18 = _this17.body;
              if (_this18.zip_axis) {
                _this18.zip_axis = false;
                _this18.axisx = Math.sin(_this18.rot);
                _this18.axisy = Math.cos(_this18.rot);
              }
              let li = _this17.lverts.next;
              let cx_ite1 = _this17.gverts.next;
              while (cx_ite1 != null) {
                const g = cx_ite1;
                const l = li;
                li = li.next;
                g.x = _this17.body.posx + (_this17.body.axisy * l.x - _this17.body.axisx * l.y);
                g.y = _this17.body.posy + (l.x * _this17.body.axisx + l.y * _this17.body.axisy);
                cx_ite1 = cx_ite1.next;
              }
            }
          }
          if (_this17.lverts.next == null) {
            throw new Error("Error: An empty polygon has no meaningful bounds");
          }
          const p0 = _this17.gverts.next;
          _this17.aabb.minx = p0.x;
          _this17.aabb.miny = p0.y;
          _this17.aabb.maxx = p0.x;
          _this17.aabb.maxy = p0.y;
          let cx_ite2 = _this17.gverts.next.next;
          while (cx_ite2 != null) {
            const p = cx_ite2;
            if (p.x < _this17.aabb.minx) {
              _this17.aabb.minx = p.x;
            }
            if (p.x > _this17.aabb.maxx) {
              _this17.aabb.maxx = p.x;
            }
            if (p.y < _this17.aabb.miny) {
              _this17.aabb.miny = p.y;
            }
            if (p.y > _this17.aabb.maxy) {
              _this17.aabb.maxy = p.y;
            }
            cx_ite2 = cx_ite2.next;
          }
        }
      }
    }
    const _this19 = this.aabbShape.zpp_inner.polygon;
    if (_this19.zip_gaxi) {
      if (_this19.body != null) {
        _this19.zip_gaxi = false;
        _this19.validate_laxi();
        const _this20 = _this19.body;
        if (_this20.zip_axis) {
          _this20.zip_axis = false;
          _this20.axisx = Math.sin(_this20.rot);
          _this20.axisy = Math.cos(_this20.rot);
        }
        if (_this19.zip_gverts) {
          if (_this19.body != null) {
            _this19.zip_gverts = false;
            _this19.validate_lverts();
            const _this21 = _this19.body;
            if (_this21.zip_axis) {
              _this21.zip_axis = false;
              _this21.axisx = Math.sin(_this21.rot);
              _this21.axisy = Math.cos(_this21.rot);
            }
            let li1 = _this19.lverts.next;
            let cx_ite3 = _this19.gverts.next;
            while (cx_ite3 != null) {
              const g1 = cx_ite3;
              const l1 = li1;
              li1 = li1.next;
              g1.x = _this19.body.posx + (_this19.body.axisy * l1.x - _this19.body.axisx * l1.y);
              g1.y = _this19.body.posy + (l1.x * _this19.body.axisx + l1.y * _this19.body.axisy);
              cx_ite3 = cx_ite3.next;
            }
          }
        }
        let ite = _this19.edges.head;
        let cx_ite4 = _this19.gverts.next;
        let u1 = cx_ite4;
        cx_ite4 = cx_ite4.next;
        while (cx_ite4 != null) {
          const v1 = cx_ite4;
          const e = ite.elt;
          ite = ite.next;
          e.gp0 = u1;
          e.gp1 = v1;
          e.gnormx = _this19.body.axisy * e.lnormx - _this19.body.axisx * e.lnormy;
          e.gnormy = e.lnormx * _this19.body.axisx + e.lnormy * _this19.body.axisy;
          e.gprojection =
            _this19.body.posx * e.gnormx + _this19.body.posy * e.gnormy + e.lprojection;
          if (e.wrap_gnorm != null) {
            e.wrap_gnorm.zpp_inner.x = e.gnormx;
            e.wrap_gnorm.zpp_inner.y = e.gnormy;
          }
          e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
          e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
          u1 = v1;
          cx_ite4 = cx_ite4.next;
        }
        const v2 = _this19.gverts.next;
        const e1 = ite.elt;
        ite = ite.next;
        e1.gp0 = u1;
        e1.gp1 = v2;
        e1.gnormx = _this19.body.axisy * e1.lnormx - _this19.body.axisx * e1.lnormy;
        e1.gnormy = e1.lnormx * _this19.body.axisx + e1.lnormy * _this19.body.axisy;
        e1.gprojection =
          _this19.body.posx * e1.gnormx + _this19.body.posy * e1.gnormy + e1.lprojection;
        if (e1.wrap_gnorm != null) {
          e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
          e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
        }
        e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
        e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
      }
    }
  }

  // ========== shapesInAABB / bodiesInAABB (overridden by subclasses) ==========

  shapesInAABB(
    _aabb: any,
    _strict: boolean,
    _containment: boolean,
    _filter: any,
    _output: any,
  ): any {
    return null;
  }

  bodiesInAABB(
    _aabb: any,
    _strict: boolean,
    _containment: boolean,
    _filter: any,
    _output: any,
  ): any {
    return null;
  }

  // ========== updateCircShape ==========

  updateCircShape(x: number, y: number, r: number): void {
    const zpp = ZPP_Broadphase._zpp;
    const nape = ZPP_Broadphase._nape;

    if (this.circShape == null) {
      if (zpp.util.ZPP_Flags.BodyType_STATIC == null) {
        zpp.util.ZPP_Flags.internal = true;
        zpp.util.ZPP_Flags.BodyType_STATIC = new nape.phys.BodyType();
        zpp.util.ZPP_Flags.internal = false;
      }
      const body = new nape.phys.Body(zpp.util.ZPP_Flags.BodyType_STATIC);
      const _this = body.zpp_inner.wrap_shapes;
      let x1: number = x;
      let y1: number = y;
      if (y1 == null) {
        y1 = 0;
      }
      if (x1 == null) {
        x1 = 0;
      }
      if (x1 !== x1 || y1 !== y1) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let ret: any;
      if (zpp.util.ZPP_PubPool.poolVec2 == null) {
        ret = new nape.geom.Vec2();
      } else {
        ret = zpp.util.ZPP_PubPool.poolVec2;
        zpp.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
        ret.zpp_pool = null;
        ret.zpp_disp = false;
        if (ret == zpp.util.ZPP_PubPool.nextVec2) {
          zpp.util.ZPP_PubPool.nextVec2 = null;
        }
      }
      if (ret.zpp_inner == null) {
        let ret1: any;
        if (zpp.geom.ZPP_Vec2.zpp_pool == null) {
          ret1 = new zpp.geom.ZPP_Vec2();
        } else {
          ret1 = zpp.geom.ZPP_Vec2.zpp_pool;
          zpp.geom.ZPP_Vec2.zpp_pool = ret1.next;
          ret1.next = null;
        }
        ret1.weak = false;
        ret1._immutable = false;
        ret1.x = x1;
        ret1.y = y1;
        ret.zpp_inner = ret1;
        ret.zpp_inner.outer = ret;
      } else {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this1 = ret.zpp_inner;
        if (_this1._immutable) {
          throw new Error("Error: Vec2 is immutable");
        }
        if (_this1._isimmutable != null) {
          _this1._isimmutable();
        }
        if (x1 !== x1 || y1 !== y1) {
          throw new Error("Error: Vec2 components cannot be NaN");
        }
        let obj: boolean;
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        if (ret.zpp_inner.x == x1) {
          if (ret != null && ret.zpp_disp) {
            throw new Error("Error: Vec2 has been disposed and cannot be used!");
          }
          const _this3 = ret.zpp_inner;
          if (_this3._validate != null) {
            _this3._validate();
          }
          obj = ret.zpp_inner.y == y1;
        } else {
          obj = false;
        }
        if (!obj) {
          ret.zpp_inner.x = x1;
          ret.zpp_inner.y = y1;
          const _this4 = ret.zpp_inner;
          if (_this4._invalidate != null) {
            _this4._invalidate(_this4);
          }
        }
      }
      ret.zpp_inner.weak = false;
      const obj1 = (this.circShape = new nape.shape.Circle(r, ret));
      if (_this.zpp_inner.reverse_flag) {
        _this.push(obj1);
      } else {
        _this.unshift(obj1);
      }
    } else {
      const ci = this.circShape.zpp_inner.circle;
      const ss = r / ci.radius;
      if (this.matrix == null) {
        this.matrix = new nape.geom.Mat23();
      }
      const _this5 = this.matrix;
      const _this6 = this.matrix;
      if (ss !== ss) {
        throw new Error("Error: Mat23::d cannot be NaN");
      }
      _this6.zpp_inner.d = ss;
      const _this7 = _this6.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate();
      }
      const a = _this6.zpp_inner.d;
      if (a !== a) {
        throw new Error("Error: Mat23::a cannot be NaN");
      }
      _this5.zpp_inner.a = a;
      const _this8 = _this5.zpp_inner;
      if (_this8._invalidate != null) {
        _this8._invalidate();
      }
      const _this9 = this.matrix;
      const _this10 = this.matrix;
      _this10.zpp_inner.c = 0;
      const _this11 = _this10.zpp_inner;
      if (_this11._invalidate != null) {
        _this11._invalidate();
      }
      const b = _this10.zpp_inner.c;
      if (b !== b) {
        throw new Error("Error: Mat23::b cannot be NaN");
      }
      _this9.zpp_inner.b = b;
      const _this12 = _this9.zpp_inner;
      if (_this12._invalidate != null) {
        _this12._invalidate();
      }
      const _this13 = this.matrix;
      const tx = x - ss * ci.localCOMx;
      if (tx !== tx) {
        throw new Error("Error: Mat23::tx cannot be NaN");
      }
      _this13.zpp_inner.tx = tx;
      const _this14 = _this13.zpp_inner;
      if (_this14._invalidate != null) {
        _this14._invalidate();
      }
      const _this15 = this.matrix;
      const ty = y - ss * ci.localCOMy;
      if (ty !== ty) {
        throw new Error("Error: Mat23::ty cannot be NaN");
      }
      _this15.zpp_inner.ty = ty;
      const _this16 = _this15.zpp_inner;
      if (_this16._invalidate != null) {
        _this16._invalidate();
      }
      this.circShape.transform(this.matrix);
    }
    const _this17 = this.circShape.zpp_inner;
    if (_this17.zip_aabb) {
      if (_this17.body != null) {
        _this17.zip_aabb = false;
        if (_this17.type == 0) {
          const _this18 = _this17.circle;
          if (_this18.zip_worldCOM) {
            if (_this18.body != null) {
              _this18.zip_worldCOM = false;
              if (_this18.zip_localCOM) {
                _this18.zip_localCOM = false;
                if (_this18.type == 1) {
                  const _this19 = _this18.polygon;
                  if (_this19.lverts.next == null) {
                    throw new Error("Error: An empty polygon has no meaningful localCOM");
                  }
                  if (_this19.lverts.next.next == null) {
                    _this19.localCOMx = _this19.lverts.next.x;
                    _this19.localCOMy = _this19.lverts.next.y;
                  } else if (_this19.lverts.next.next.next == null) {
                    _this19.localCOMx = _this19.lverts.next.x;
                    _this19.localCOMy = _this19.lverts.next.y;
                    const t = 1.0;
                    _this19.localCOMx += _this19.lverts.next.next.x * t;
                    _this19.localCOMy += _this19.lverts.next.next.y * t;
                    const t1 = 0.5;
                    _this19.localCOMx *= t1;
                    _this19.localCOMy *= t1;
                  } else {
                    _this19.localCOMx = 0;
                    _this19.localCOMy = 0;
                    let area = 0.0;
                    let cx_ite = _this19.lverts.next;
                    let u = cx_ite;
                    cx_ite = cx_ite.next;
                    let v = cx_ite;
                    cx_ite = cx_ite.next;
                    while (cx_ite != null) {
                      const w = cx_ite;
                      area += v.x * (w.y - u.y);
                      const cf = w.y * v.x - w.x * v.y;
                      _this19.localCOMx += (v.x + w.x) * cf;
                      _this19.localCOMy += (v.y + w.y) * cf;
                      u = v;
                      v = w;
                      cx_ite = cx_ite.next;
                    }
                    cx_ite = _this19.lverts.next;
                    const w1 = cx_ite;
                    area += v.x * (w1.y - u.y);
                    const cf1 = w1.y * v.x - w1.x * v.y;
                    _this19.localCOMx += (v.x + w1.x) * cf1;
                    _this19.localCOMy += (v.y + w1.y) * cf1;
                    u = v;
                    v = w1;
                    cx_ite = cx_ite.next;
                    const w2 = cx_ite;
                    area += v.x * (w2.y - u.y);
                    const cf2 = w2.y * v.x - w2.x * v.y;
                    _this19.localCOMx += (v.x + w2.x) * cf2;
                    _this19.localCOMy += (v.y + w2.y) * cf2;
                    area = 1 / (3 * area);
                    const t2 = area;
                    _this19.localCOMx *= t2;
                    _this19.localCOMy *= t2;
                  }
                }
                if (_this18.wrap_localCOM != null) {
                  _this18.wrap_localCOM.zpp_inner.x = _this18.localCOMx;
                  _this18.wrap_localCOM.zpp_inner.y = _this18.localCOMy;
                }
              }
              const _this20 = _this18.body;
              if (_this20.zip_axis) {
                _this20.zip_axis = false;
                _this20.axisx = Math.sin(_this20.rot);
                _this20.axisy = Math.cos(_this20.rot);
              }
              _this18.worldCOMx =
                _this18.body.posx +
                (_this18.body.axisy * _this18.localCOMx - _this18.body.axisx * _this18.localCOMy);
              _this18.worldCOMy =
                _this18.body.posy +
                (_this18.localCOMx * _this18.body.axisx + _this18.localCOMy * _this18.body.axisy);
            }
          }
          const rx = _this18.radius;
          const ry = _this18.radius;
          _this18.aabb.minx = _this18.worldCOMx - rx;
          _this18.aabb.miny = _this18.worldCOMy - ry;
          _this18.aabb.maxx = _this18.worldCOMx + rx;
          _this18.aabb.maxy = _this18.worldCOMy + ry;
        } else {
          const _this21 = _this17.polygon;
          if (_this21.zip_gverts) {
            if (_this21.body != null) {
              _this21.zip_gverts = false;
              _this21.validate_lverts();
              const _this22 = _this21.body;
              if (_this22.zip_axis) {
                _this22.zip_axis = false;
                _this22.axisx = Math.sin(_this22.rot);
                _this22.axisy = Math.cos(_this22.rot);
              }
              let li = _this21.lverts.next;
              let cx_ite1 = _this21.gverts.next;
              while (cx_ite1 != null) {
                const g = cx_ite1;
                const l = li;
                li = li.next;
                g.x = _this21.body.posx + (_this21.body.axisy * l.x - _this21.body.axisx * l.y);
                g.y = _this21.body.posy + (l.x * _this21.body.axisx + l.y * _this21.body.axisy);
                cx_ite1 = cx_ite1.next;
              }
            }
          }
          if (_this21.lverts.next == null) {
            throw new Error("Error: An empty polygon has no meaningful bounds");
          }
          const p0 = _this21.gverts.next;
          _this21.aabb.minx = p0.x;
          _this21.aabb.miny = p0.y;
          _this21.aabb.maxx = p0.x;
          _this21.aabb.maxy = p0.y;
          let cx_ite2 = _this21.gverts.next.next;
          while (cx_ite2 != null) {
            const p = cx_ite2;
            if (p.x < _this21.aabb.minx) {
              _this21.aabb.minx = p.x;
            }
            if (p.x > _this21.aabb.maxx) {
              _this21.aabb.maxx = p.x;
            }
            if (p.y < _this21.aabb.miny) {
              _this21.aabb.miny = p.y;
            }
            if (p.y > _this21.aabb.maxy) {
              _this21.aabb.maxy = p.y;
            }
            cx_ite2 = cx_ite2.next;
          }
        }
      }
    }
  }

  // ========== shapesInCircle / bodiesInCircle (overridden by subclasses) ==========

  shapesInCircle(
    _x: number,
    _y: number,
    _r: number,
    _containment: boolean,
    _filter: any,
    _output: any,
  ): any {
    return null;
  }

  bodiesInCircle(
    _x: number,
    _y: number,
    _r: number,
    _containment: boolean,
    _filter: any,
    _output: any,
  ): any {
    return null;
  }

  // ========== validateShape ==========

  validateShape(s: any): void {
    if (s.type == 1) {
      const _this = s.polygon;
      if (_this.zip_gaxi) {
        if (_this.body != null) {
          _this.zip_gaxi = false;
          _this.validate_laxi();
          const _this1 = _this.body;
          if (_this1.zip_axis) {
            _this1.zip_axis = false;
            _this1.axisx = Math.sin(_this1.rot);
            _this1.axisy = Math.cos(_this1.rot);
          }
          if (_this.zip_gverts) {
            if (_this.body != null) {
              _this.zip_gverts = false;
              _this.validate_lverts();
              const _this2 = _this.body;
              if (_this2.zip_axis) {
                _this2.zip_axis = false;
                _this2.axisx = Math.sin(_this2.rot);
                _this2.axisy = Math.cos(_this2.rot);
              }
              let li = _this.lverts.next;
              let cx_ite = _this.gverts.next;
              while (cx_ite != null) {
                const g = cx_ite;
                const l = li;
                li = li.next;
                g.x = _this.body.posx + (_this.body.axisy * l.x - _this.body.axisx * l.y);
                g.y = _this.body.posy + (l.x * _this.body.axisx + l.y * _this.body.axisy);
                cx_ite = cx_ite.next;
              }
            }
          }
          let ite = _this.edges.head;
          let cx_ite1 = _this.gverts.next;
          let u = cx_ite1;
          cx_ite1 = cx_ite1.next;
          while (cx_ite1 != null) {
            const v = cx_ite1;
            const e = ite.elt;
            ite = ite.next;
            e.gp0 = u;
            e.gp1 = v;
            e.gnormx = _this.body.axisy * e.lnormx - _this.body.axisx * e.lnormy;
            e.gnormy = e.lnormx * _this.body.axisx + e.lnormy * _this.body.axisy;
            e.gprojection = _this.body.posx * e.gnormx + _this.body.posy * e.gnormy + e.lprojection;
            if (e.wrap_gnorm != null) {
              e.wrap_gnorm.zpp_inner.x = e.gnormx;
              e.wrap_gnorm.zpp_inner.y = e.gnormy;
            }
            e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
            e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
            u = v;
            cx_ite1 = cx_ite1.next;
          }
          const v1 = _this.gverts.next;
          const e1 = ite.elt;
          ite = ite.next;
          e1.gp0 = u;
          e1.gp1 = v1;
          e1.gnormx = _this.body.axisy * e1.lnormx - _this.body.axisx * e1.lnormy;
          e1.gnormy = e1.lnormx * _this.body.axisx + e1.lnormy * _this.body.axisy;
          e1.gprojection =
            _this.body.posx * e1.gnormx + _this.body.posy * e1.gnormy + e1.lprojection;
          if (e1.wrap_gnorm != null) {
            e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
            e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
          }
          e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
          e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
        }
      }
    }
    if (s.zip_aabb) {
      if (s.body != null) {
        s.zip_aabb = false;
        if (s.type == 0) {
          const _this3 = s.circle;
          if (_this3.zip_worldCOM) {
            if (_this3.body != null) {
              _this3.zip_worldCOM = false;
              if (_this3.zip_localCOM) {
                _this3.zip_localCOM = false;
                if (_this3.type == 1) {
                  const _this4 = _this3.polygon;
                  if (_this4.lverts.next == null) {
                    throw new Error("Error: An empty polygon has no meaningful localCOM");
                  }
                  if (_this4.lverts.next.next == null) {
                    _this4.localCOMx = _this4.lverts.next.x;
                    _this4.localCOMy = _this4.lverts.next.y;
                  } else if (_this4.lverts.next.next.next == null) {
                    _this4.localCOMx = _this4.lverts.next.x;
                    _this4.localCOMy = _this4.lverts.next.y;
                    const t = 1.0;
                    _this4.localCOMx += _this4.lverts.next.next.x * t;
                    _this4.localCOMy += _this4.lverts.next.next.y * t;
                    const t1 = 0.5;
                    _this4.localCOMx *= t1;
                    _this4.localCOMy *= t1;
                  } else {
                    _this4.localCOMx = 0;
                    _this4.localCOMy = 0;
                    let area = 0.0;
                    let cx_ite2 = _this4.lverts.next;
                    let u1 = cx_ite2;
                    cx_ite2 = cx_ite2.next;
                    let v2 = cx_ite2;
                    cx_ite2 = cx_ite2.next;
                    while (cx_ite2 != null) {
                      const w = cx_ite2;
                      area += v2.x * (w.y - u1.y);
                      const cf = w.y * v2.x - w.x * v2.y;
                      _this4.localCOMx += (v2.x + w.x) * cf;
                      _this4.localCOMy += (v2.y + w.y) * cf;
                      u1 = v2;
                      v2 = w;
                      cx_ite2 = cx_ite2.next;
                    }
                    cx_ite2 = _this4.lverts.next;
                    const w1 = cx_ite2;
                    area += v2.x * (w1.y - u1.y);
                    const cf1 = w1.y * v2.x - w1.x * v2.y;
                    _this4.localCOMx += (v2.x + w1.x) * cf1;
                    _this4.localCOMy += (v2.y + w1.y) * cf1;
                    u1 = v2;
                    v2 = w1;
                    cx_ite2 = cx_ite2.next;
                    const w2 = cx_ite2;
                    area += v2.x * (w2.y - u1.y);
                    const cf2 = w2.y * v2.x - w2.x * v2.y;
                    _this4.localCOMx += (v2.x + w2.x) * cf2;
                    _this4.localCOMy += (v2.y + w2.y) * cf2;
                    area = 1 / (3 * area);
                    const t2 = area;
                    _this4.localCOMx *= t2;
                    _this4.localCOMy *= t2;
                  }
                }
                if (_this3.wrap_localCOM != null) {
                  _this3.wrap_localCOM.zpp_inner.x = _this3.localCOMx;
                  _this3.wrap_localCOM.zpp_inner.y = _this3.localCOMy;
                }
              }
              const _this5 = _this3.body;
              if (_this5.zip_axis) {
                _this5.zip_axis = false;
                _this5.axisx = Math.sin(_this5.rot);
                _this5.axisy = Math.cos(_this5.rot);
              }
              _this3.worldCOMx =
                _this3.body.posx +
                (_this3.body.axisy * _this3.localCOMx - _this3.body.axisx * _this3.localCOMy);
              _this3.worldCOMy =
                _this3.body.posy +
                (_this3.localCOMx * _this3.body.axisx + _this3.localCOMy * _this3.body.axisy);
            }
          }
          const rx = _this3.radius;
          const ry = _this3.radius;
          _this3.aabb.minx = _this3.worldCOMx - rx;
          _this3.aabb.miny = _this3.worldCOMy - ry;
          _this3.aabb.maxx = _this3.worldCOMx + rx;
          _this3.aabb.maxy = _this3.worldCOMy + ry;
        } else {
          const _this6 = s.polygon;
          if (_this6.zip_gverts) {
            if (_this6.body != null) {
              _this6.zip_gverts = false;
              _this6.validate_lverts();
              const _this7 = _this6.body;
              if (_this7.zip_axis) {
                _this7.zip_axis = false;
                _this7.axisx = Math.sin(_this7.rot);
                _this7.axisy = Math.cos(_this7.rot);
              }
              let li1 = _this6.lverts.next;
              let cx_ite3 = _this6.gverts.next;
              while (cx_ite3 != null) {
                const g1 = cx_ite3;
                const l1 = li1;
                li1 = li1.next;
                g1.x = _this6.body.posx + (_this6.body.axisy * l1.x - _this6.body.axisx * l1.y);
                g1.y = _this6.body.posy + (l1.x * _this6.body.axisx + l1.y * _this6.body.axisy);
                cx_ite3 = cx_ite3.next;
              }
            }
          }
          if (_this6.lverts.next == null) {
            throw new Error("Error: An empty polygon has no meaningful bounds");
          }
          const p0 = _this6.gverts.next;
          _this6.aabb.minx = p0.x;
          _this6.aabb.miny = p0.y;
          _this6.aabb.maxx = p0.x;
          _this6.aabb.maxy = p0.y;
          let cx_ite4 = _this6.gverts.next.next;
          while (cx_ite4 != null) {
            const p = cx_ite4;
            if (p.x < _this6.aabb.minx) {
              _this6.aabb.minx = p.x;
            }
            if (p.x > _this6.aabb.maxx) {
              _this6.aabb.maxx = p.x;
            }
            if (p.y < _this6.aabb.miny) {
              _this6.aabb.miny = p.y;
            }
            if (p.y > _this6.aabb.maxy) {
              _this6.aabb.maxy = p.y;
            }
            cx_ite4 = cx_ite4.next;
          }
        }
      }
    }
    if (s.zip_worldCOM) {
      if (s.body != null) {
        s.zip_worldCOM = false;
        if (s.zip_localCOM) {
          s.zip_localCOM = false;
          if (s.type == 1) {
            const _this8 = s.polygon;
            if (_this8.lverts.next == null) {
              throw new Error("Error: An empty polygon has no meaningful localCOM");
            }
            if (_this8.lverts.next.next == null) {
              _this8.localCOMx = _this8.lverts.next.x;
              _this8.localCOMy = _this8.lverts.next.y;
            } else if (_this8.lverts.next.next.next == null) {
              _this8.localCOMx = _this8.lverts.next.x;
              _this8.localCOMy = _this8.lverts.next.y;
              const t3 = 1.0;
              _this8.localCOMx += _this8.lverts.next.next.x * t3;
              _this8.localCOMy += _this8.lverts.next.next.y * t3;
              const t4 = 0.5;
              _this8.localCOMx *= t4;
              _this8.localCOMy *= t4;
            } else {
              _this8.localCOMx = 0;
              _this8.localCOMy = 0;
              let area1 = 0.0;
              let cx_ite5 = _this8.lverts.next;
              let u2 = cx_ite5;
              cx_ite5 = cx_ite5.next;
              let v3 = cx_ite5;
              cx_ite5 = cx_ite5.next;
              while (cx_ite5 != null) {
                const w3 = cx_ite5;
                area1 += v3.x * (w3.y - u2.y);
                const cf3 = w3.y * v3.x - w3.x * v3.y;
                _this8.localCOMx += (v3.x + w3.x) * cf3;
                _this8.localCOMy += (v3.y + w3.y) * cf3;
                u2 = v3;
                v3 = w3;
                cx_ite5 = cx_ite5.next;
              }
              cx_ite5 = _this8.lverts.next;
              const w4 = cx_ite5;
              area1 += v3.x * (w4.y - u2.y);
              const cf4 = w4.y * v3.x - w4.x * v3.y;
              _this8.localCOMx += (v3.x + w4.x) * cf4;
              _this8.localCOMy += (v3.y + w4.y) * cf4;
              u2 = v3;
              v3 = w4;
              cx_ite5 = cx_ite5.next;
              const w5 = cx_ite5;
              area1 += v3.x * (w5.y - u2.y);
              const cf5 = w5.y * v3.x - w5.x * v3.y;
              _this8.localCOMx += (v3.x + w5.x) * cf5;
              _this8.localCOMy += (v3.y + w5.y) * cf5;
              area1 = 1 / (3 * area1);
              const t5 = area1;
              _this8.localCOMx *= t5;
              _this8.localCOMy *= t5;
            }
          }
          if (s.wrap_localCOM != null) {
            s.wrap_localCOM.zpp_inner.x = s.localCOMx;
            s.wrap_localCOM.zpp_inner.y = s.localCOMy;
          }
        }
        const _this9 = s.body;
        if (_this9.zip_axis) {
          _this9.zip_axis = false;
          _this9.axisx = Math.sin(_this9.rot);
          _this9.axisy = Math.cos(_this9.rot);
        }
        s.worldCOMx = s.body.posx + (s.body.axisy * s.localCOMx - s.body.axisx * s.localCOMy);
        s.worldCOMy = s.body.posy + (s.localCOMx * s.body.axisx + s.localCOMy * s.body.axisy);
      }
    }
  }

  // ========== shapesInShape / bodiesInShape (overridden by subclasses) ==========

  shapesInShape(_shape: any, _containment: boolean, _filter: any, _output: any): any {
    return null;
  }

  bodiesInShape(_shape: any, _containment: boolean, _filter: any, _output: any): any {
    return null;
  }

  // ========== rayCast / rayMultiCast (overridden by subclasses) ==========

  rayCast(_ray: any, _inner: boolean, _filter: any): any {
    return null;
  }

  rayMultiCast(_ray: any, _inner: boolean, _filter: any, _output: any): any {
    return null;
  }
}
