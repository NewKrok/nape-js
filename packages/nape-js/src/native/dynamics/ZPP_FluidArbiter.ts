/**
 * ZPP_FluidArbiter — Internal fluid arbiter for the nape physics engine.
 *
 * Handles fluid interaction physics: buoyancy forces, viscous drag,
 * angular damping. Manages a lazy Vec2 position wrapper for the centroid.
 *
 * Converted from nape-compiled.js lines 29522–30206.
 */

import { ZPP_Arbiter } from "./ZPP_Arbiter";
import { ZPP_Vec2 } from "../geom/ZPP_Vec2";
import { ZPP_PubPool } from "../util/ZPP_PubPool";

export class ZPP_FluidArbiter extends ZPP_Arbiter {
  // --- Static: Haxe metadata ---

  // --- Static: object pool ---
  static zpp_pool: ZPP_FluidArbiter | null = null;

  // --- Instance: outer wrapper reference ---
  outer_zn: any = null;

  // --- Instance: linked list next (for pool) ---
  declare next: ZPP_FluidArbiter | null;

  // --- Instance: centroid position ---
  centroidx = 0.0;
  centroidy = 0.0;

  // --- Instance: overlap area ---
  overlap = 0.0;

  // --- Instance: relative position offsets ---
  r1x = 0.0;
  r1y = 0.0;
  r2x = 0.0;
  r2y = 0.0;

  // --- Instance: drag state ---
  nodrag = false;

  // --- Instance: angular mass/damping ---
  wMass = 0.0;
  adamp = 0.0;
  agamma = 0.0;

  // --- Instance: velocity mass matrix ---
  vMassa = 0.0;
  vMassb = 0.0;
  vMassc = 0.0;

  // --- Instance: linear drag impulse ---
  dampx = 0.0;
  dampy = 0.0;

  // --- Instance: linear gamma ---
  lgamma = 0.0;

  // --- Instance: drag direction ---
  nx = 0.0;
  ny = 0.0;

  // --- Instance: buoyancy impulse ---
  buoyx = 0.0;
  buoyy = 0.0;

  // --- Instance: lazy Vec2 position wrapper ---
  wrap_position: any = null;

  // --- Instance: mutability flag ---
  mutable = false;

  // --- Instance: previous dt for warm-starting ---
  pre_dt = 0.0;

  // --- Instance: Haxe class reference ---

  constructor() {
    super();
    this.pre_dt = 0.0;
    this.mutable = false;
    this.wrap_position = null;
    this.buoyy = 0.0;
    this.buoyx = 0.0;
    this.ny = 0.0;
    this.nx = 0.0;
    this.lgamma = 0.0;
    this.dampy = 0.0;
    this.dampx = 0.0;
    this.vMassc = 0.0;
    this.vMassb = 0.0;
    this.vMassa = 0.0;
    this.agamma = 0.0;
    this.adamp = 0.0;
    this.wMass = 0.0;
    this.nodrag = false;
    this.r2y = 0.0;
    this.r2x = 0.0;
    this.r1y = 0.0;
    this.r1x = 0.0;
    this.overlap = 0.0;
    this.centroidy = 0.0;
    this.centroidx = 0.0;
    this.next = null;
    this.outer_zn = null;
    this.type = ZPP_Arbiter.FLUID;
    this.fluidarb = this;
    this.buoyx = 0;
    this.buoyy = 0;
    this.pre_dt = -1.0;
  }

  // ========== Pool callbacks ==========

  alloc(): void {}
  free(): void {}

  // ========== Position handling ==========

  position_validate(): void {
    if (!this.active) {
      throw new Error("Arbiter not currently in use");
    }
    this.wrap_position.zpp_inner.x = this.centroidx;
    this.wrap_position.zpp_inner.y = this.centroidy;
  }

  position_invalidate(x: any): void {
    this.centroidx = x.x;
    this.centroidy = x.y;
  }

  getposition(): void {
    const napeNs = ZPP_Arbiter._nape;

    let ret: any;
    if (ZPP_PubPool.poolVec2 == null) {
      ret = new napeNs.geom.Vec2();
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
      ret1.x = 0;
      ret1.y = 0;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      if (ret != null && ret.zpp_disp) {
        throw new Error("Vec2 has been disposed and cannot be used!");
      }
      const _this = ret.zpp_inner;
      if (_this._immutable) {
        throw new Error("Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == 0) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Vec2 has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        tmp = ret.zpp_inner.y == 0;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = 0;
        ret.zpp_inner.y = 0;
        const _this3 = ret.zpp_inner;
        if (_this3._invalidate != null) {
          _this3._invalidate(_this3);
        }
      }
    }
    ret.zpp_inner.weak = false;
    this.wrap_position = ret;
    this.wrap_position.zpp_inner._inuse = true;
    this.wrap_position.zpp_inner._immutable = !this.mutable;
    this.wrap_position.zpp_inner._validate = this.position_validate.bind(this);
    this.wrap_position.zpp_inner._invalidate = this.position_invalidate.bind(this);
  }
}
