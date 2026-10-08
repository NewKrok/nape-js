import { ZPP_Flags } from "../util/ZPP_Flags";
/**
 * ZPP_Broadphase — Internal base broadphase container.
 *
 * Provides the interface and shared logic for broadphase collision detection.
 * Delegates to either a sweep-and-prune (ZPP_SweepPhase) or dynamic AABB tree
 * (ZPP_DynAABBPhase) implementation. Contains helper methods for creating
 * temporary AABB/circle shapes for spatial queries, and inlined AABB/worldCOM
 * validation logic used during shape synchronization.
 */

export class ZPP_Broadphase {
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
      this.sweep.__sync(shape);
    } else {
      this.dynab.__sync(shape);
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
      // Set the corners directly. Upstream rescaled the previous rectangle
      // with a Mat23 (tx = minx - sx * oldMinx); after a tiny query far from
      // the origin sx * oldMinx is ~1e16 and the subtraction loses the next
      // query's position, so its result depended on the previous query.
      const verts = this.aabbShape.localVerts;
      verts.at(0).setxy(aabb.minx, aabb.miny);
      verts.at(1).setxy(aabb.maxx, aabb.miny);
      verts.at(2).setxy(aabb.maxx, aabb.maxy);
      verts.at(3).setxy(aabb.minx, aabb.maxy);
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
      const ret = nape.geom.Vec2.get(x1, y1);
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
