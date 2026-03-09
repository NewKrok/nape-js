/**
 * ZPP_Edge — Internal edge representation for polygon shapes.
 *
 * Each edge stores local/world normal, projection values, and vertex references.
 * Edges are pooled and belong to a ZPP_Polygon.
 *
 * Converted from nape-compiled.js lines 41828–42175.
 */

export class ZPP_Edge {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "shape", "ZPP_Edge"];

  // --- Static: object pool (linked list via `next`) ---
  static zpp_pool: ZPP_Edge | null = null;

  // --- Static: creation guard for public Edge wrapper ---
  static internal = false;

  // --- Static: namespace references ---
  static _nape: any = null;
  static _zpp: any = null;

  // --- Static: wrapper factory ---
  static _wrapFn: ((zpp: ZPP_Edge) => any) | null = null;

  // --- Instance: pool linked list ---
  next: ZPP_Edge | null = null;

  // --- Instance: parent polygon ---
  polygon: any = null;

  // --- Instance: public API wrapper ---
  outer: any = null;

  // --- Instance: local normal ---
  lnormx = 0;
  lnormy = 0;
  wrap_lnorm: any = null;

  // --- Instance: world normal ---
  gnormx = 0;
  gnormy = 0;
  wrap_gnorm: any = null;

  // --- Instance: edge length ---
  length = 0;

  // --- Instance: projections ---
  lprojection = 0;
  gprojection = 0;

  // --- Instance: vertex references ---
  lp0: any = null;
  gp0: any = null;
  lp1: any = null;
  gp1: any = null;

  // --- Instance: tangent projections ---
  tp0 = 0;
  tp1 = 0;

  constructor() {
    this.lnormx = 0;
    this.lnormy = 0;
    this.gnormx = 0;
    this.gnormy = 0;
    this.length = 0;
    this.lprojection = 0;
    this.gprojection = 0;
  }

  free(): void {
    this.polygon = null;
  }

  alloc(): void {}

  wrapper(): any {
    if (this.outer == null) {
      if (ZPP_Edge._wrapFn) {
        this.outer = ZPP_Edge._wrapFn(this);
      } else {
        ZPP_Edge.internal = true;
        this.outer = new ZPP_Edge._nape.shape.Edge();
        ZPP_Edge.internal = false;
        this.outer.zpp_inner = this;
      }
    }
    return this.outer;
  }

  lnorm_validate(): void {
    if (this.polygon == null) {
      throw new Error("Error: Edge not currently in use");
    }
    this.polygon.validate_laxi();
    this.wrap_lnorm.zpp_inner.x = this.lnormx;
    this.wrap_lnorm.zpp_inner.y = this.lnormy;
  }

  gnorm_validate(): void {
    if (this.polygon == null) {
      throw new Error("Error: Edge not currently in use");
    }
    if (this.polygon.body == null) {
      throw new Error(
        "Error: Edge worldNormal only makes sense if the parent Polygon is contained within a rigid body",
      );
    }
    this.polygon.validate_gaxi();
    this.wrap_gnorm.zpp_inner.x = this.gnormx;
    this.wrap_gnorm.zpp_inner.y = this.gnormy;
  }

  getlnorm(): void {
    const zpp = ZPP_Edge._zpp;
    const nape = ZPP_Edge._nape;
    const x = this.lnormx;
    const y = this.lnormy;
    if (x !== x || y !== y) {
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
      ret1.x = x;
      ret1.y = y;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      ret.zpp_inner.x = x;
      ret.zpp_inner.y = y;
    }
    ret.zpp_inner.weak = false;
    this.wrap_lnorm = ret;
    this.wrap_lnorm.zpp_inner._immutable = true;
    this.wrap_lnorm.zpp_inner._validate = this.lnorm_validate.bind(this);
  }

  getgnorm(): void {
    const zpp = ZPP_Edge._zpp;
    const nape = ZPP_Edge._nape;
    const x = this.gnormx;
    const y = this.gnormy;
    if (x !== x || y !== y) {
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
      ret1.x = x;
      ret1.y = y;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      ret.zpp_inner.x = x;
      ret.zpp_inner.y = y;
    }
    ret.zpp_inner.weak = false;
    this.wrap_gnorm = ret;
    this.wrap_gnorm.zpp_inner._immutable = true;
    this.wrap_gnorm.zpp_inner._validate = this.gnorm_validate.bind(this);
  }
}
