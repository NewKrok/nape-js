/**
 * ZPP_WeldJoint — Internal weld constraint between two bodies.
 *
 * A 3-DOF constraint that locks relative position (x, y) and angle
 * between two bodies, with an optional phase (target angle offset).
 * Uses a 3×3 effective-mass matrix (stored as upper triangular a/b/c/d/e/f).
 *
 * Converted from nape-compiled.js lines 28055–29046.
 */

import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_AngleJoint } from "./ZPP_AngleJoint";

type Any = any;

export class ZPP_WeldJoint extends ZPP_Constraint {
  static override __name__ = ["zpp_nape", "constraint", "ZPP_WeldJoint"];
  static __super__ = ZPP_Constraint;
  static _wrapFn: ((zpp: ZPP_WeldJoint) => Any) | null = null;
  static _createFn: ((...args: any[]) => any) | null = null;

  outer_zn: Any = null;
  b1: Any = null;
  b2: Any = null;

  a1localx = 0.0;
  a1localy = 0.0;
  a1relx = 0.0;
  a1rely = 0.0;
  wrap_a1: Any = null;

  a2localx = 0.0;
  a2localy = 0.0;
  a2relx = 0.0;
  a2rely = 0.0;
  wrap_a2: Any = null;

  phase = 0.0;

  // 3×3 effective-mass matrix (upper triangular)
  kMassa = 0.0;
  kMassb = 0.0;
  kMassc = 0.0;
  kMassd = 0.0;
  kMasse = 0.0;
  kMassf = 0.0;

  jAccx = 0.0;
  jAccy = 0.0;
  jAccz = 0.0;
  jMax = Infinity;
  gamma = 0.0;
  biasx = 0.0;
  biasy = 0.0;
  biasz = 0.0;
  stepped = false;

  override __class__: Any = ZPP_WeldJoint;

  constructor() {
    super();
    this.phase = 0;
    this.jAccx = 0;
    this.jAccy = 0;
    this.jAccz = 0;
    this.jMax = Infinity;
    this.stepped = false;
    this.a1localx = 0;
    this.a1localy = 0;
    this.a1relx = 0;
    this.a1rely = 0;
    this.a2localx = 0;
    this.a2localy = 0;
    this.a2relx = 0;
    this.a2rely = 0;
  }

  bodyImpulse(b: Any): Any {
    const napeNs = ZPP_Constraint._nape;
    if (this.stepped) {
      if (b == this.b1) {
        return napeNs.geom.Vec3.get(
          -this.jAccx,
          -this.jAccy,
          -(this.jAccy * this.a1relx - this.jAccx * this.a1rely + this.jAccz),
        );
      } else {
        return napeNs.geom.Vec3.get(
          this.jAccx,
          this.jAccy,
          this.jAccy * this.a2relx - this.jAccx * this.a2rely + this.jAccz,
        );
      }
    } else {
      return napeNs.geom.Vec3.get(0, 0, 0);
    }
  }

  override activeBodies(): void {
    if (this.b1 != null) {
      this.b1.constraints.add(this);
    }
    if (this.b2 != this.b1) {
      if (this.b2 != null) {
        this.b2.constraints.add(this);
      }
    }
  }

  override inactiveBodies(): void {
    if (this.b1 != null) {
      this.b1.constraints.remove(this);
    }
    if (this.b2 != this.b1) {
      if (this.b2 != null) {
        this.b2.constraints.remove(this);
      }
    }
  }

  validate_a1(): void {
    this.wrap_a1.zpp_inner.x = this.a1localx;
    this.wrap_a1.zpp_inner.y = this.a1localy;
  }

  invalidate_a1(x: Any): void {
    this.immutable_midstep("Constraint::" + "a1");
    this.a1localx = x.x;
    this.a1localy = x.y;
    this.wake();
  }

  setup_a1(): void {
    const napeNs = ZPP_Constraint._nape;
    const zpp = ZPP_Constraint._zpp;
    let x = this.a1localx;
    let y = this.a1localy;
    if (y == null) {
      y = 0;
    }
    if (x == null) {
      x = 0;
    }
    if (x != x || y != y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    let ret: Any;
    if (zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new napeNs.geom.Vec2();
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
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
      }
      const _this = ret.zpp_inner;
      if (_this._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      if (x != x || y != y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        tmp = ret.zpp_inner.y == y;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = x;
        ret.zpp_inner.y = y;
        const _this3 = ret.zpp_inner;
        if (_this3._invalidate != null) {
          _this3._invalidate(_this3);
        }
      }
    }
    ret.zpp_inner.weak = false;
    this.wrap_a1 = ret;
    this.wrap_a1.zpp_inner._inuse = true;
    this.wrap_a1.zpp_inner._validate = this.validate_a1.bind(this);
    this.wrap_a1.zpp_inner._invalidate = this.invalidate_a1.bind(this);
  }

  validate_a2(): void {
    this.wrap_a2.zpp_inner.x = this.a2localx;
    this.wrap_a2.zpp_inner.y = this.a2localy;
  }

  invalidate_a2(x: Any): void {
    this.immutable_midstep("Constraint::" + "a2");
    this.a2localx = x.x;
    this.a2localy = x.y;
    this.wake();
  }

  setup_a2(): void {
    const napeNs = ZPP_Constraint._nape;
    const zpp = ZPP_Constraint._zpp;
    let x = this.a2localx;
    let y = this.a2localy;
    if (y == null) {
      y = 0;
    }
    if (x == null) {
      x = 0;
    }
    if (x != x || y != y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    let ret: Any;
    if (zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new napeNs.geom.Vec2();
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
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
      }
      const _this = ret.zpp_inner;
      if (_this._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      if (x != x || y != y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        tmp = ret.zpp_inner.y == y;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = x;
        ret.zpp_inner.y = y;
        const _this3 = ret.zpp_inner;
        if (_this3._invalidate != null) {
          _this3._invalidate(_this3);
        }
      }
    }
    ret.zpp_inner.weak = false;
    this.wrap_a2 = ret;
    this.wrap_a2.zpp_inner._inuse = true;
    this.wrap_a2.zpp_inner._validate = this.validate_a2.bind(this);
    this.wrap_a2.zpp_inner._invalidate = this.invalidate_a2.bind(this);
  }

  override copy(dict: Any, todo: Any): Any {
    const _this = this.outer_zn;
    if (_this.zpp_inner_zn.wrap_a1 == null) {
      _this.zpp_inner_zn.setup_a1();
    }
    const ret = _this.zpp_inner_zn.wrap_a1;
    const _this1 = this.outer_zn;
    if (_this1.zpp_inner_zn.wrap_a2 == null) {
      _this1.zpp_inner_zn.setup_a2();
    }
    const ret1 = ZPP_WeldJoint._createFn!(null, null, ret, _this1.zpp_inner_zn.wrap_a2);
    this.copyto(ret1);
    ZPP_AngleJoint._copyBody(dict, todo, this.b1, ret1, "b1");
    ZPP_AngleJoint._copyBody(dict, todo, this.b2, ret1, "b2");
    return ret1;
  }

  override validate(): void {
    if (this.b1 == null || this.b2 == null) {
      throw new Error("Error: AngleJoint cannot be simulated null bodies");
    }
    if (this.b1 == this.b2) {
      throw new Error("Error: WeldJoint cannot be simulated with body1 == body2");
    }
    if (this.b1.space != this.space || this.b2.space != this.space) {
      throw new Error(
        "Error: Constraints must have each body within the same space to which the constraint has been assigned",
      );
    }
    if (this.b1.type != 2 && this.b2.type != 2) {
      throw new Error("Error: Constraints cannot have both bodies non-dynamic");
    }
  }

  override wake_connected(): void {
    if (this.b1 != null && this.b1.type == 2) {
      this.b1.wake();
    }
    if (this.b2 != null && this.b2.type == 2) {
      this.b2.wake();
    }
  }

  override forest(): void {
    if (this.b1.type == 2) {
      ZPP_Constraint._unionComponents(this.b1.component, this.component);
    }
    if (this.b2.type == 2) {
      ZPP_Constraint._unionComponents(this.b2.component, this.component);
    }
  }

  override pair_exists(id: number, di: number): boolean {
    if (!(this.b1.id == id && this.b2.id == di)) {
      if (this.b1.id == di) {
        return this.b2.id == id;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  override clearcache(): void {
    this.jAccx = 0;
    this.jAccy = 0;
    this.jAccz = 0;
    this.pre_dt = -1.0;
  }

  override preStep(dt: number): boolean {
    if (this.pre_dt == -1.0) {
      this.pre_dt = dt;
    }
    const dtratio = dt / this.pre_dt;
    this.pre_dt = dt;
    this.stepped = true;

    // Rotate local anchors into world space
    this.a1relx = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    this.a1rely = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    this.a2relx = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    this.a2rely = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;

    // Build 3×3 effective-mass matrix (upper triangular: a=00, b=01, c=02, d=11, e=12, f=22)
    const m = this.b1.smass + this.b2.smass;
    this.kMassa = m;
    this.kMassb = 0;
    this.kMassd = m;
    this.kMassc = 0;
    this.kMasse = 0;
    this.kMassf = 0;

    if (this.b1.sinertia != 0) {
      const X = this.a1relx * this.b1.sinertia;
      const Y = this.a1rely * this.b1.sinertia;
      this.kMassa += Y * this.a1rely;
      this.kMassb += -Y * this.a1relx;
      this.kMassd += X * this.a1relx;
      this.kMassc += -Y;
      this.kMasse += X;
      this.kMassf += this.b1.sinertia;
    }
    if (this.b2.sinertia != 0) {
      const X1 = this.a2relx * this.b2.sinertia;
      const Y1 = this.a2rely * this.b2.sinertia;
      this.kMassa += Y1 * this.a2rely;
      this.kMassb += -Y1 * this.a2relx;
      this.kMassd += X1 * this.a2relx;
      this.kMassc += -Y1;
      this.kMasse += X1;
      this.kMassf += this.b2.sinertia;
    }

    // Invert the 3×3 matrix
    const det =
      this.kMassa * (this.kMassd * this.kMassf - this.kMasse * this.kMasse) +
      this.kMassb * (this.kMassc * this.kMasse - this.kMassb * this.kMassf) +
      this.kMassc * (this.kMassb * this.kMasse - this.kMassc * this.kMassd);
    let flag: number;
    if (det != det) {
      // NaN — zero out entire matrix
      this.kMassa = 0;
      this.kMassb = 0;
      this.kMassd = 0;
      this.kMassc = 0;
      this.kMasse = 0;
      this.kMassf = 0;
      flag = 7;
    } else if (det == 0) {
      // Singular — fall back to diagonal inverse
      let flag1 = 0;
      if (this.kMassa != 0) {
        this.kMassa = 1 / this.kMassa;
      } else {
        this.kMassa = 0;
        flag1 |= 1;
      }
      if (this.kMassd != 0) {
        this.kMassd = 1 / this.kMassd;
      } else {
        this.kMassd = 0;
        flag1 |= 2;
      }
      if (this.kMassf != 0) {
        this.kMassf = 1 / this.kMassf;
      } else {
        this.kMassf = 0;
        flag1 |= 4;
      }
      this.kMassb = this.kMassc = this.kMasse = 0.0;
      flag = flag1;
    } else {
      const idet = 1 / det;
      const A = idet * (this.kMassd * this.kMassf - this.kMasse * this.kMasse);
      const B = idet * (this.kMasse * this.kMassc - this.kMassb * this.kMassf);
      const D = idet * (this.kMassa * this.kMassf - this.kMassc * this.kMassc);
      const C = idet * (this.kMassb * this.kMasse - this.kMassc * this.kMassd);
      const E = idet * (this.kMassb * this.kMassc - this.kMassa * this.kMasse);
      const F = idet * (this.kMassa * this.kMassd - this.kMassb * this.kMassb);
      this.kMassa = A;
      this.kMassb = B;
      this.kMassd = D;
      this.kMassc = C;
      this.kMasse = E;
      this.kMassf = F;
      flag = 0;
    }

    // Zero out accumulator for degenerate axes
    if ((flag & 1) != 0) {
      this.jAccx = 0;
    }
    if ((flag & 2) != 0) {
      this.jAccy = 0;
    }
    if ((flag & 4) != 0) {
      this.jAccz = 0;
    }

    if (!this.stiff) {
      const omega = 2 * Math.PI * this.frequency;
      this.gamma = 1 / (dt * omega * (2 * this.damping + omega * dt));
      const ig = 1 / (1 + this.gamma);
      const biasCoef = dt * omega * omega * this.gamma;
      this.gamma *= ig;
      const X2 = ig;
      this.kMassa *= X2;
      this.kMassb *= X2;
      this.kMassd *= X2;
      this.kMassc *= X2;
      this.kMasse *= X2;
      this.kMassf *= X2;
      this.biasx = this.b2.posx + this.a2relx - (this.b1.posx + this.a1relx);
      this.biasy = this.b2.posy + this.a2rely - (this.b1.posy + this.a1rely);
      this.biasz = this.b2.rot - this.b1.rot - this.phase;
      if (
        this.breakUnderError &&
        this.biasx * this.biasx + this.biasy * this.biasy + this.biasz * this.biasz >
          this.maxError * this.maxError
      ) {
        return true;
      }
      const t = -biasCoef;
      this.biasx *= t;
      this.biasy *= t;
      this.biasz *= t;
      const t2 = this.maxError;
      const ls = this.biasx * this.biasx + this.biasy * this.biasy + this.biasz * this.biasz;
      if (ls > t2 * t2) {
        const t3 = t2 * (1.0 / Math.sqrt(ls));
        this.biasx *= t3;
        this.biasy *= t3;
        this.biasz *= t3;
      }
    } else {
      this.biasx = 0;
      this.biasy = 0;
      this.biasz = 0;
      this.gamma = 0;
    }

    this.jAccx *= dtratio;
    this.jAccy *= dtratio;
    this.jAccz *= dtratio;
    this.jMax = this.maxForce * dt;
    return false;
  }

  override warmStart(): void {
    const t = this.b1.imass;
    this.b1.velx -= this.jAccx * t;
    this.b1.vely -= this.jAccy * t;
    const t1 = this.b2.imass;
    this.b2.velx += this.jAccx * t1;
    this.b2.vely += this.jAccy * t1;
    this.b1.angvel -=
      (this.jAccy * this.a1relx - this.jAccx * this.a1rely + this.jAccz) * this.b1.iinertia;
    this.b2.angvel +=
      (this.jAccy * this.a2relx - this.jAccx * this.a2rely + this.jAccz) * this.b2.iinertia;
  }

  override applyImpulseVel(): boolean {
    const Ex =
      this.b2.velx +
      this.b2.kinvelx -
      this.a2rely * (this.b2.angvel + this.b2.kinangvel) -
      (this.b1.velx + this.b1.kinvelx - this.a1rely * (this.b1.angvel + this.b1.kinangvel));
    const Ey =
      this.b2.vely +
      this.b2.kinvely +
      this.a2relx * (this.b2.angvel + this.b2.kinangvel) -
      (this.b1.vely + this.b1.kinvely + this.a1relx * (this.b1.angvel + this.b1.kinangvel));
    const Ez = this.b2.angvel + this.b2.kinangvel - this.b1.angvel - this.b1.kinangvel;

    let Jx = this.biasx - Ex;
    let Jy = this.biasy - Ey;
    let Jz = this.biasz - Ez;

    const X = this.kMassa * Jx + this.kMassb * Jy + this.kMassc * Jz;
    const Y = this.kMassb * Jx + this.kMassd * Jy + this.kMasse * Jz;
    Jz = this.kMassc * Jx + this.kMasse * Jy + this.kMassf * Jz;
    Jx = X;
    Jy = Y;

    Jx -= this.jAccx * this.gamma;
    Jy -= this.jAccy * this.gamma;
    Jz -= this.jAccz * this.gamma;

    const jOldx = this.jAccx;
    const jOldy = this.jAccy;
    const jOldz = this.jAccz;

    this.jAccx += Jx;
    this.jAccy += Jy;
    this.jAccz += Jz;

    if (this.breakUnderForce) {
      if (
        this.jAccx * this.jAccx + this.jAccy * this.jAccy + this.jAccz * this.jAccz >
        this.jMax * this.jMax
      ) {
        return true;
      }
    } else if (!this.stiff) {
      const t4 = this.jMax;
      const ls = this.jAccx * this.jAccx + this.jAccy * this.jAccy + this.jAccz * this.jAccz;
      if (ls > t4 * t4) {
        const t5 = t4 * (1.0 / Math.sqrt(ls));
        this.jAccx *= t5;
        this.jAccy *= t5;
        this.jAccz *= t5;
      }
    }

    Jx = this.jAccx - jOldx;
    Jy = this.jAccy - jOldy;
    Jz = this.jAccz - jOldz;

    const t7 = this.b1.imass;
    this.b1.velx -= Jx * t7;
    this.b1.vely -= Jy * t7;
    const t8 = this.b2.imass;
    this.b2.velx += Jx * t8;
    this.b2.vely += Jy * t8;
    this.b1.angvel -= (Jy * this.a1relx - Jx * this.a1rely + Jz) * this.b1.iinertia;
    this.b2.angvel += (Jy * this.a2relx - Jx * this.a2rely + Jz) * this.b2.iinertia;
    return false;
  }

  override applyImpulsePos(): boolean {
    const napeNs = ZPP_Constraint._nape;

    // Re-compute world-space anchors from current rotations
    const r1x = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    const r1y = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    const r2x = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    const r2y = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;

    // Position + angle error
    let Ex = this.b2.posx + r2x - (this.b1.posx + r1x);
    let Ey = this.b2.posy + r2y - (this.b1.posy + r1y);
    let Ez = this.b2.rot - this.b1.rot - this.phase;

    let Jx: number;
    let Jy: number;
    let Jz: number;

    if (this.breakUnderError && Ex * Ex + Ey * Ey + Ez * Ez > this.maxError * this.maxError) {
      return true;
    }

    // Skip correction if error is within slop thresholds
    let cont = true;
    if (
      Ex * Ex + Ey * Ey <
      napeNs.Config.constraintLinearSlop * napeNs.Config.constraintLinearSlop
    ) {
      cont = false;
      Ex = 0;
      Ey = 0;
    }
    const x = napeNs.Config.constraintAngularSlop;
    if (Ez * Ez < x * x) {
      if (!cont) {
        return false;
      } else {
        Ez = 0;
      }
    }

    // Half-step the error
    Ex *= 0.5;
    Ey *= 0.5;
    Ez *= 0.5;

    // Pre-correction for large positional errors
    if (Ex * Ex + Ey * Ey > 6) {
      const k = this.b1.smass + this.b2.smass;
      if (k > napeNs.Config.epsilon) {
        const ki = 0.75 / k;
        Jx = -Ex * ki;
        Jy = -Ey * ki;
        const t2 = 20;
        const ls = Jx * Jx + Jy * Jy;
        if (ls > t2 * t2) {
          const t3 = t2 * (1.0 / Math.sqrt(ls));
          Jx *= t3;
          Jy *= t3;
        }
        const t4 = this.b1.imass;
        this.b1.posx -= Jx * t4;
        this.b1.posy -= Jy * t4;
        const t5 = this.b2.imass;
        this.b2.posx += Jx * t5;
        this.b2.posy += Jy * t5;
        // Recompute error after pre-correction
        Ex = this.b2.posx + r2x - (this.b1.posx + r1x);
        Ey = this.b2.posy + r2y - (this.b1.posy + r1y);
        Ez = this.b2.rot - this.b1.rot - this.phase;
        Ex *= 0.5;
        Ey *= 0.5;
        Ez *= 0.5;
      }
    }

    // Build local 3×3 mass matrix for position correction
    const m = this.b1.smass + this.b2.smass;
    let Ka = m;
    let Kb = 0;
    let Kd = m;
    let Kc = 0;
    let Ke = 0;
    let Kf = 0;
    if (this.b1.sinertia != 0) {
      const X = r1x * this.b1.sinertia;
      const Y = r1y * this.b1.sinertia;
      Ka += Y * r1y;
      Kb += -Y * r1x;
      Kd += X * r1x;
      Kc += -Y;
      Ke += X;
      Kf += this.b1.sinertia;
    }
    if (this.b2.sinertia != 0) {
      const X1 = r2x * this.b2.sinertia;
      const Y1 = r2y * this.b2.sinertia;
      Ka += Y1 * r2y;
      Kb += -Y1 * r2x;
      Kd += X1 * r2x;
      Kc += -Y1;
      Ke += X1;
      Kf += this.b2.sinertia;
    }

    Jx = -Ex;
    Jy = -Ey;
    Jz = -Ez;

    // Clamp linear correction magnitude
    const t8 = 6;
    const ls1 = Jx * Jx + Jy * Jy;
    if (ls1 > t8 * t8) {
      const t9 = t8 * (1.0 / Math.sqrt(ls1));
      Jx *= t9;
      Jy *= t9;
    }

    // Clamp angular correction
    const a = -0.25;
    const _tmp = Jz < a; // mirror compiled local var (unused beyond mirroring)
    void _tmp;

    // Solve K * J = rhs
    const det = Ka * (Kd * Kf - Ke * Ke) + Kb * (Kc * Ke - Kb * Kf) + Kc * (Kb * Ke - Kc * Kd);
    if (det != det) {
      // NaN
      Jz = 0;
      Jy = Jz;
      Jx = Jy;
    } else if (det == 0) {
      if (Ka != 0) {
        Jx /= Ka;
      } else {
        Jx = 0;
      }
      if (Kd != 0) {
        Jy /= Kd;
      } else {
        Jy = 0;
      }
      if (Kf != 0) {
        Jz /= Kf;
      } else {
        Jz = 0;
      }
    } else {
      const idet = 1 / det;
      const B = Ke * Kc - Kb * Kf;
      const C = Kb * Ke - Kc * Kd;
      const E = Kb * Kc - Ka * Ke;
      const X2 = idet * (Jx * (Kd * Kf - Ke * Ke) + Jy * B + Jz * C);
      const Y2 = idet * (Jx * B + Jy * (Ka * Kf - Kc * Kc) + Jz * E);
      Jz = idet * (Jx * C + Jy * E + Jz * (Ka * Kd - Kb * Kb));
      Jx = X2;
      Jy = Y2;
    }

    // Apply positional impulse to b1
    const t10 = this.b1.imass;
    this.b1.posx -= Jx * t10;
    this.b1.posy -= Jy * t10;
    // Apply positional impulse to b2
    const t11 = this.b2.imass;
    this.b2.posx += Jx * t11;
    this.b2.posy += Jy * t11;

    // Apply rotational correction to b1 (small-angle optimized)
    const _b1 = this.b1;
    const dr = -(Jy * r1x - Jx * r1y + Jz) * this.b1.iinertia;
    ZPP_AngleJoint._rotateBody(_b1, dr);

    // Apply rotational correction to b2 (small-angle optimized)
    const _b2 = this.b2;
    const dr1 = (Jy * r2x - Jx * r2y + Jz) * this.b2.iinertia;
    ZPP_AngleJoint._rotateBody(_b2, dr1);

    return false;
  }

  override draw(_g: Any): void {}
}
