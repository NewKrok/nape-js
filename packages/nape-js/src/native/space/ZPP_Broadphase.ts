import { ZPP_Vec2 } from "../geom/ZPP_Vec2";
import { ZPP_Flags } from "../util/ZPP_Flags";
import { ZPP_PubPool } from "../util/ZPP_PubPool";
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
  is_spatial_hash: boolean = false;
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
    self.is_spatial_hash = false;
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
        shape.validate_aabb();
      }
    } else {
      const _this5 = this.dynab;
      const node = shape.node;
      if (!node.synced) {
        if (!_this5.space.continuous) {
          shape.validate_aabb();
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
      if (ZPP_Flags.BodyType_STATIC == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.BodyType_STATIC = new nape.phys.BodyType();
        ZPP_Flags.internal = false;
      }
      const body = new nape.phys.Body(ZPP_Flags.BodyType_STATIC);
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
        throw new Error("Mat23::a cannot be NaN");
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
        throw new Error("Mat23::b cannot be NaN");
      }
      _this3.zpp_inner.b = b;
      const _this6 = _this3.zpp_inner;
      if (_this6._invalidate != null) {
        _this6._invalidate();
      }
      const _this7 = this.matrix;
      if (sy !== sy) {
        throw new Error("Mat23::d cannot be NaN");
      }
      _this7.zpp_inner.d = sy;
      const _this8 = _this7.zpp_inner;
      if (_this8._invalidate != null) {
        _this8._invalidate();
      }
      const _this9 = this.matrix;
      const tx = aabb.minx - sx * ab.minx;
      if (tx !== tx) {
        throw new Error("Mat23::tx cannot be NaN");
      }
      _this9.zpp_inner.tx = tx;
      const _this10 = _this9.zpp_inner;
      if (_this10._invalidate != null) {
        _this10._invalidate();
      }
      const _this11 = this.matrix;
      const ty = aabb.miny - sy * ab.miny;
      if (ty !== ty) {
        throw new Error("Mat23::ty cannot be NaN");
      }
      _this11.zpp_inner.ty = ty;
      const _this12 = _this11.zpp_inner;
      if (_this12._invalidate != null) {
        _this12._invalidate();
      }
      this.aabbShape.transform(this.matrix);
    }
    this.aabbShape.zpp_inner.validate_aabb();
    this.aabbShape.zpp_inner.polygon.validate_gaxi();
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
      if (ZPP_Flags.BodyType_STATIC == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.BodyType_STATIC = new nape.phys.BodyType();
        ZPP_Flags.internal = false;
      }
      const body = new nape.phys.Body(ZPP_Flags.BodyType_STATIC);
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
        throw new Error("Vec2 components cannot be NaN");
      }
      let ret: any;
      if (ZPP_PubPool.poolVec2 == null) {
        ret = new nape.geom.Vec2();
      } else {
        ret = ZPP_PubPool.poolVec2;
        ZPP_PubPool.poolVec2 = ret.zpp_pool;
        ret.zpp_pool = null;
        ret.zpp_disp = false;
        if (ret == ZPP_PubPool.nextVec2) {
          ZPP_PubPool.nextVec2 = null;
        }
      }
      if (ret.zpp_inner == null) {
        let ret1: any;
        if (ZPP_Vec2.zpp_pool == null) {
          ret1 = new ZPP_Vec2();
        } else {
          ret1 = ZPP_Vec2.zpp_pool;
          ZPP_Vec2.zpp_pool = ret1.next;
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
          throw new Error("Vec2 has been disposed and cannot be used!");
        }
        const _this1 = ret.zpp_inner;
        if (_this1._immutable) {
          throw new Error("Vec2 is immutable");
        }
        if (_this1._isimmutable != null) {
          _this1._isimmutable();
        }
        if (x1 !== x1 || y1 !== y1) {
          throw new Error("Vec2 components cannot be NaN");
        }
        let obj: boolean;
        if (ret != null && ret.zpp_disp) {
          throw new Error("Vec2 has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        if (ret.zpp_inner.x == x1) {
          if (ret != null && ret.zpp_disp) {
            throw new Error("Vec2 has been disposed and cannot be used!");
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
        throw new Error("Mat23::d cannot be NaN");
      }
      _this6.zpp_inner.d = ss;
      const _this7 = _this6.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate();
      }
      const a = _this6.zpp_inner.d;
      if (a !== a) {
        throw new Error("Mat23::a cannot be NaN");
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
        throw new Error("Mat23::b cannot be NaN");
      }
      _this9.zpp_inner.b = b;
      const _this12 = _this9.zpp_inner;
      if (_this12._invalidate != null) {
        _this12._invalidate();
      }
      const _this13 = this.matrix;
      const tx = x - ss * ci.localCOMx;
      if (tx !== tx) {
        throw new Error("Mat23::tx cannot be NaN");
      }
      _this13.zpp_inner.tx = tx;
      const _this14 = _this13.zpp_inner;
      if (_this14._invalidate != null) {
        _this14._invalidate();
      }
      const _this15 = this.matrix;
      const ty = y - ss * ci.localCOMy;
      if (ty !== ty) {
        throw new Error("Mat23::ty cannot be NaN");
      }
      _this15.zpp_inner.ty = ty;
      const _this16 = _this15.zpp_inner;
      if (_this16._invalidate != null) {
        _this16._invalidate();
      }
      this.circShape.transform(this.matrix);
    }
    this.circShape.zpp_inner.validate_aabb();
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
      s.polygon.validate_gaxi();
    }
    s.validate_aabb();
    s.validate_worldCOM();
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
