/**
 * ZPP_Circle — Internal circle shape for the nape physics engine.
 *
 * Extends ZPP_Shape (type=0). Stores radius, provides AABB/area/inertia
 * calculations, and handles localCOM wrappers for circles.
 *
 * Converted from nape-compiled.js lines 41496–41827.
 */

type Any = any;

export class ZPP_Circle {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "shape", "ZPP_Circle"];
  static __super__: Any = null;

  // --- Static: namespace references ---
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Static: init guard ---
  static _initialized = false;

  // --- Instance: circle-specific ---
  radius = 0;
  outer_zn: Any = null;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_Circle;

  // --- Stub declarations for methods inherited from ZPP_Shape/ZPP_Interactor ---
  body: Any;
  type!: number;
  circle: Any;
  polygon: Any;
  aabb: Any;
  localCOMx!: number;
  localCOMy!: number;
  worldCOMx!: number;
  worldCOMy!: number;
  zip_localCOM!: boolean;
  zip_worldCOM!: boolean;
  zip_aabb!: boolean;
  zip_sweepRadius!: boolean;
  area!: number;
  inertia!: number;
  angDrag!: number;
  sweepCoef!: number;
  sweepRadius!: number;
  material: Any;
  wrap_localCOM: Any;
  outer: Any;
  invalidate_area_inertia!: () => void;
  invalidate_angDrag!: () => void;
  invalidate_localCOM!: () => void;
  constructor() {
    this.radius = 0;
    this.outer_zn = null;
    // Call ZPP_Shape initializer (type=0 for circle)
    (this as Any)._initShape(0);
    this.circle = this;
    this.zip_localCOM = false;
  }

  static _init(): void {
    if (ZPP_Circle._initialized) return;
    ZPP_Circle._initialized = true;

    const zpp = ZPP_Circle._zpp;
    ZPP_Circle.__super__ = zpp.shape.ZPP_Shape;

    const srcProto = zpp.shape.ZPP_Shape.prototype;
    const dstProto = ZPP_Circle.prototype as Any;

    // Copy enumerable inherited properties (e.g., ZPP_Interactor methods)
    for (const k in srcProto) {
      if (k !== "__class__" && !Object.prototype.hasOwnProperty.call(dstProto, k)) {
        dstProto[k] = srcProto[k];
      }
    }
    // Copy non-enumerable own properties (TS class methods like _initShape)
    for (const k of Object.getOwnPropertyNames(srcProto)) {
      if (
        k !== "constructor" &&
        k !== "__class__" &&
        !Object.prototype.hasOwnProperty.call(dstProto, k)
      ) {
        dstProto[k] = srcProto[k];
      }
    }
  }

  __clear(): void {}

  invalidate_radius(): void {
    this.invalidate_area_inertia();
    this.invalidate_angDrag();
    this.zip_aabb = true;
    if (this.body != null) {
      this.body.zip_aabb = true;
    }
    if (this.body != null) {
      this.body.wake();
    }
  }

  localCOM_validate(): void {
    this.wrap_localCOM.zpp_inner.x = this.localCOMx;
    this.wrap_localCOM.zpp_inner.y = this.localCOMy;
  }

  localCOM_invalidate(x: Any): void {
    this.localCOMx = x.x;
    this.localCOMy = x.y;
    this.invalidate_localCOM();
    if (this.body != null) {
      this.body.wake();
    }
  }

  localCOM_immutable(): void {
    if (this.body != null && this.body.type === 1 && this.body.space != null) {
      throw new Error(
        "Error: Cannot modify localCOM of Circle added to a static Body whilst within a Space",
      );
    }
  }

  setupLocalCOM(): void {
    const zpp = ZPP_Circle._zpp;
    const nape = ZPP_Circle._nape;
    const x = this.localCOMx;
    const y = this.localCOMy;
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    let ret: Any;
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
      let ret1: Any;
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
    this.wrap_localCOM = ret;
    this.wrap_localCOM.zpp_inner._inuse = true;
    this.wrap_localCOM.zpp_inner._validate = this.localCOM_validate.bind(this);
    this.wrap_localCOM.zpp_inner._invalidate = this.localCOM_invalidate.bind(this);
    this.wrap_localCOM.zpp_inner._isimmutable = this.localCOM_immutable.bind(this);
  }

  __validate_aabb(): void {
    if (this.zip_worldCOM) {
      if (this.body != null) {
        this.zip_worldCOM = false;
        if (this.zip_localCOM) {
          this.zip_localCOM = false;
          if (this.type === 1) {
            this.polygon.__validate_localCOM();
          }
          if (this.wrap_localCOM != null) {
            this.wrap_localCOM.zpp_inner.x = this.localCOMx;
            this.wrap_localCOM.zpp_inner.y = this.localCOMy;
          }
        }
        const body = this.body;
        if (body.zip_axis) {
          body.zip_axis = false;
          body.axisx = Math.sin(body.rot);
          body.axisy = Math.cos(body.rot);
        }
        this.worldCOMx = body.posx + (body.axisy * this.localCOMx - body.axisx * this.localCOMy);
        this.worldCOMy = body.posy + (this.localCOMx * body.axisx + this.localCOMy * body.axisy);
      }
    }
    const rx = this.radius;
    const ry = this.radius;
    this.aabb.minx = this.worldCOMx - rx;
    this.aabb.miny = this.worldCOMy - ry;
    this.aabb.maxx = this.worldCOMx + rx;
    this.aabb.maxy = this.worldCOMy + ry;
  }

  _force_validate_aabb(): void {
    const body = this.body;
    this.worldCOMx = body.posx + (body.axisy * this.localCOMx - body.axisx * this.localCOMy);
    this.worldCOMy = body.posy + (this.localCOMx * body.axisx + this.localCOMy * body.axisy);
    this.aabb.minx = this.worldCOMx - this.radius;
    this.aabb.miny = this.worldCOMy - this.radius;
    this.aabb.maxx = this.worldCOMx + this.radius;
    this.aabb.maxy = this.worldCOMy + this.radius;
  }

  __validate_sweepRadius(): void {
    this.sweepCoef = Math.sqrt(this.localCOMx * this.localCOMx + this.localCOMy * this.localCOMy);
    this.sweepRadius = this.sweepCoef + this.radius;
  }

  __validate_area_inertia(): void {
    const r2 = this.radius * this.radius;
    this.area = r2 * Math.PI;
    this.inertia = r2 * 0.5 + (this.localCOMx * this.localCOMx + this.localCOMy * this.localCOMy);
  }

  __validate_angDrag(): void {
    const nape = ZPP_Circle._nape;
    const lc = this.localCOMx * this.localCOMx + this.localCOMy * this.localCOMy;
    const r2 = this.radius * this.radius;
    const skin = this.material.dynamicFriction * nape.Config.fluidAngularDragFriction;
    this.angDrag =
      (lc + 2 * r2) * skin +
      0.5 * nape.Config.fluidAngularDrag * (1 + nape.Config.fluidVacuumDrag) * lc;
    this.angDrag /= 2 * (lc + 0.5 * r2);
  }

  __scale(sx: number, sy: number): void {
    const factor = ((sx < 0 ? -sx : sx) + (sy < 0 ? -sy : sy)) / 2;
    this.radius *= factor < 0 ? -factor : factor;
    this.invalidate_radius();
    if (this.localCOMx * this.localCOMx + this.localCOMy * this.localCOMy > 0) {
      this.localCOMx *= sx;
      this.localCOMy *= sy;
      this.invalidate_localCOM();
    }
  }

  __translate(x: number, y: number): void {
    this.localCOMx += x;
    this.localCOMy += y;
    this.invalidate_localCOM();
  }

  __rotate(x: number, y: number): void {
    if (this.localCOMx * this.localCOMx + this.localCOMy * this.localCOMy > 0) {
      const tx = y * this.localCOMx - x * this.localCOMy;
      const ty = this.localCOMx * x + this.localCOMy * y;
      this.localCOMx = tx;
      this.localCOMy = ty;
      this.invalidate_localCOM();
    }
  }

  __transform(m: Any): void {
    let det = m.zpp_inner.a * m.zpp_inner.d - m.zpp_inner.b * m.zpp_inner.c;
    if (det < 0) {
      det = -det;
    }
    this.radius *= Math.sqrt(det);
    const t = m.zpp_inner.a * this.localCOMx + m.zpp_inner.b * this.localCOMy + m.zpp_inner.tx;
    this.localCOMy =
      m.zpp_inner.c * this.localCOMx + m.zpp_inner.d * this.localCOMy + m.zpp_inner.ty;
    this.localCOMx = t;
    this.invalidate_radius();
    this.invalidate_localCOM();
  }

  __copy(): Any {
    const nape = ZPP_Circle._nape;
    const ret = new nape.shape.Circle(this.radius).zpp_inner_zn;
    ret.localCOMx = this.localCOMx;
    ret.localCOMy = this.localCOMy;
    ret.zip_localCOM = false;
    return ret;
  }
}
