/**
 * ZPP_PivotJoint — Internal 2-body, 2-DOF point-to-point constraint.
 *
 * Constrains two anchor points (a1 on b1, a2 on b2) to coincide.
 * Uses a 2×2 mass matrix (kMassa, kMassb, kMassc) for the symmetric
 * positive-semi-definite effective-mass inverse.
 *
 * Converted from nape-compiled.js lines 24611–25474.
 */

import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_AngleJoint } from "./ZPP_AngleJoint";

type Any = any;

export class ZPP_PivotJoint extends ZPP_Constraint {
  static override __name__ = ["zpp_nape", "constraint", "ZPP_PivotJoint"];
  static __super__ = ZPP_Constraint;

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
  kMassa = 0.0;
  kMassb = 0.0;
  kMassc = 0.0;
  jAccx = 0.0;
  jAccy = 0.0;
  jMax = Infinity;
  gamma = 0.0;
  biasx = 0.0;
  biasy = 0.0;
  stepped = false;

  override __class__: Any = ZPP_PivotJoint;

  constructor() {
    super();
    this.stepped = false;
    this.jAccx = 0;
    this.jAccy = 0;
    this.jMax = Infinity;
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
          -(this.jAccy * this.a1relx - this.jAccx * this.a1rely),
        );
      } else {
        return napeNs.geom.Vec3.get(
          this.jAccx,
          this.jAccy,
          this.jAccy * this.a2relx - this.jAccx * this.a2rely,
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
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
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
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
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
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
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
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
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
    const napeNs = ZPP_Constraint._nape;
    const _this = this.outer_zn;
    if (_this.zpp_inner_zn.wrap_a1 == null) {
      _this.zpp_inner_zn.setup_a1();
    }
    const ret = _this.zpp_inner_zn.wrap_a1;
    const _this1 = this.outer_zn;
    if (_this1.zpp_inner_zn.wrap_a2 == null) {
      _this1.zpp_inner_zn.setup_a2();
    }
    const ret1 = new napeNs.constraint.PivotJoint(null, null, ret, _this1.zpp_inner_zn.wrap_a2);
    this.copyto(ret1);
    ZPP_AngleJoint._copyBody(dict, todo, this.b1, ret1, "b1");
    ZPP_AngleJoint._copyBody(dict, todo, this.b2, ret1, "b2");
    return ret1;
  }

  override validate(): void {
    if (this.b1 == null || this.b2 == null) {
      throw new Error("Error: PivotJoint cannot be simulated null bodies");
    }
    if (this.b1 == this.b2) {
      throw new Error(
        "Error: PivotJoint cannot be simulated with body1 == body2 (body1=body2=" +
          this.b1.outer.toString() +
          ")",
      );
    }
    if (this.b1.space != this.space || this.b2.space != this.space) {
      throw new Error(
        "Error: Constraints must have each body within the same space to which the constraint has been assigned (body1=" +
          this.b1.outer.toString() +
          ", body2=" +
          this.b2.outer.toString() +
          ")",
      );
    }
    if (this.b1.type != 2 && this.b2.type != 2) {
      throw new Error(
        "Error: Constraints cannot have both bodies non-dynamic (body1=" +
          this.b1.outer.toString() +
          ", body2=" +
          this.b2.outer.toString() +
          ")",
      );
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
    this.pre_dt = -1.0;
  }

  override preStep(dt: number): boolean {
    if (this.pre_dt == -1.0) {
      this.pre_dt = dt;
    }
    const dtratio = dt / this.pre_dt;
    this.pre_dt = dt;
    this.stepped = true;
    this.a1relx = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    this.a1rely = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    this.a2relx = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    this.a2rely = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;
    const m = this.b1.smass + this.b2.smass;
    this.kMassa = m;
    this.kMassb = 0;
    this.kMassc = m;
    if (this.b1.sinertia != 0) {
      const X = this.a1relx * this.b1.sinertia;
      const Y = this.a1rely * this.b1.sinertia;
      this.kMassa += Y * this.a1rely;
      this.kMassb += -Y * this.a1relx;
      this.kMassc += X * this.a1relx;
    }
    if (this.b2.sinertia != 0) {
      const X1 = this.a2relx * this.b2.sinertia;
      const Y1 = this.a2rely * this.b2.sinertia;
      this.kMassa += Y1 * this.a2rely;
      this.kMassb += -Y1 * this.a2relx;
      this.kMassc += X1 * this.a2relx;
    }
    const det = this.kMassa * this.kMassc - this.kMassb * this.kMassb;
    let flag: number;
    if (det != det) {
      // NaN det → zero out mass matrix
      this.kMassa = this.kMassb = this.kMassc = 0;
      flag = 3;
    } else if (det == 0) {
      // Singular → diagonal fallback
      let flag1 = 0;
      if (this.kMassa != 0) {
        this.kMassa = 1 / this.kMassa;
      } else {
        this.kMassa = 0;
        flag1 |= 1;
      }
      if (this.kMassc != 0) {
        this.kMassc = 1 / this.kMassc;
      } else {
        this.kMassc = 0;
        flag1 |= 2;
      }
      this.kMassb = 0;
      flag = flag1;
    } else {
      // Normal 2×2 inverse
      const detInv = 1 / det;
      const t = this.kMassc * detInv;
      this.kMassc = this.kMassa * detInv;
      this.kMassa = t;
      this.kMassb *= -detInv;
      flag = 0;
    }
    if ((flag & 1) != 0) {
      this.jAccx = 0;
    }
    if ((flag & 2) != 0) {
      this.jAccy = 0;
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
      this.kMassc *= X2;
      this.biasx = this.b2.posx + this.a2relx - (this.b1.posx + this.a1relx);
      this.biasy = this.b2.posy + this.a2rely - (this.b1.posy + this.a1rely);
      if (
        this.breakUnderError &&
        this.biasx * this.biasx + this.biasy * this.biasy > this.maxError * this.maxError
      ) {
        return true;
      }
      const t1 = -biasCoef;
      this.biasx *= t1;
      this.biasy *= t1;
      const t2 = this.maxError;
      const ls = this.biasx * this.biasx + this.biasy * this.biasy;
      if (ls > t2 * t2) {
        const t3 = t2 * (1.0 / Math.sqrt(ls));
        this.biasx *= t3;
        this.biasy *= t3;
      }
    } else {
      this.biasx = 0;
      this.biasy = 0;
      this.gamma = 0;
    }
    const t4 = dtratio;
    this.jAccx *= t4;
    this.jAccy *= t4;
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
    this.b1.angvel -= (this.jAccy * this.a1relx - this.jAccx * this.a1rely) * this.b1.iinertia;
    this.b2.angvel += (this.jAccy * this.a2relx - this.jAccx * this.a2rely) * this.b2.iinertia;
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
    let Jx = this.biasx - Ex;
    let Jy = this.biasy - Ey;
    const t = this.kMassa * Jx + this.kMassb * Jy;
    Jy = this.kMassb * Jx + this.kMassc * Jy;
    Jx = t;
    const t1 = this.gamma;
    Jx -= this.jAccx * t1;
    Jy -= this.jAccy * t1;
    const jOldx = this.jAccx;
    const jOldy = this.jAccy;
    const t2 = 1.0;
    this.jAccx += Jx * t2;
    this.jAccy += Jy * t2;
    if (this.breakUnderForce) {
      if (this.jAccx * this.jAccx + this.jAccy * this.jAccy > this.jMax * this.jMax) {
        return true;
      }
    } else if (!this.stiff) {
      const t3 = this.jMax;
      const ls = this.jAccx * this.jAccx + this.jAccy * this.jAccy;
      if (ls > t3 * t3) {
        const t4 = t3 * (1.0 / Math.sqrt(ls));
        this.jAccx *= t4;
        this.jAccy *= t4;
      }
    }
    Jx = this.jAccx - jOldx;
    Jy = this.jAccy - jOldy;
    const t5 = this.b1.imass;
    this.b1.velx -= Jx * t5;
    this.b1.vely -= Jy * t5;
    const t6 = this.b2.imass;
    this.b2.velx += Jx * t6;
    this.b2.vely += Jy * t6;
    this.b1.angvel -= (Jy * this.a1relx - Jx * this.a1rely) * this.b1.iinertia;
    this.b2.angvel += (Jy * this.a2relx - Jx * this.a2rely) * this.b2.iinertia;
    return false;
  }

  override applyImpulsePos(): boolean {
    const napeNs = ZPP_Constraint._nape;
    const r1x = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    const r1y = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    const r2x = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    const r2y = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;
    let Ex = this.b2.posx + r2x - (this.b1.posx + r1x);
    let Ey = this.b2.posy + r2y - (this.b1.posy + r1y);
    if (this.breakUnderError && Ex * Ex + Ey * Ey > this.maxError * this.maxError) {
      return true;
    }
    if (
      Ex * Ex + Ey * Ey <
      napeNs.Config.constraintLinearSlop * napeNs.Config.constraintLinearSlop
    ) {
      return false;
    }
    const t = 0.5;
    Ex *= t;
    Ey *= t;
    let Jx: number;
    let Jy: number;
    if (Ex * Ex + Ey * Ey > 6) {
      const k = this.b1.smass + this.b2.smass;
      if (k > napeNs.Config.epsilon) {
        const kInv = 0.75 / k;
        Jx = -Ex * kInv;
        Jy = -Ey * kInv;
        const t1 = 20;
        const ls = Jx * Jx + Jy * Jy;
        if (ls > t1 * t1) {
          const t2 = t1 * (1.0 / Math.sqrt(ls));
          Jx *= t2;
          Jy *= t2;
        }
        const t3 = this.b1.imass;
        this.b1.posx -= Jx * t3;
        this.b1.posy -= Jy * t3;
        const t4 = this.b2.imass;
        this.b2.posx += Jx * t4;
        this.b2.posy += Jy * t4;
        Ex = this.b2.posx + r2x - (this.b1.posx + r1x);
        Ey = this.b2.posy + r2y - (this.b1.posy + r1y);
        const t5 = 0.5;
        Ex *= t5;
        Ey *= t5;
      }
    }
    const m = this.b1.smass + this.b2.smass;
    let Ka = m;
    let Kb = 0;
    let Kc = m;
    if (this.b1.sinertia != 0) {
      const X = r1x * this.b1.sinertia;
      const Y = r1y * this.b1.sinertia;
      Ka += Y * r1y;
      Kb += -Y * r1x;
      Kc += X * r1x;
    }
    if (this.b2.sinertia != 0) {
      const X1 = r2x * this.b2.sinertia;
      const Y1 = r2y * this.b2.sinertia;
      Ka += Y1 * r2y;
      Kb += -Y1 * r2x;
      Kc += X1 * r2x;
    }
    Jx = -Ex;
    Jy = -Ey;
    const t6 = 6;
    const ls1 = Jx * Jx + Jy * Jy;
    if (ls1 > t6 * t6) {
      const t7 = t6 * (1.0 / Math.sqrt(ls1));
      Jx *= t7;
      Jy *= t7;
    }
    const det = Ka * Kc - Kb * Kb;
    if (det != det) {
      // NaN det → zero impulse
      Jy = 0;
      Jx = 0;
    } else if (det == 0) {
      // Singular → diagonal solve
      if (Ka != 0) {
        Jx /= Ka;
      } else {
        Jx = 0;
      }
      if (Kc != 0) {
        Jy /= Kc;
      } else {
        Jy = 0;
      }
    } else {
      // Normal 2×2 solve
      const detInv = 1 / det;
      const t8 = detInv * (Kc * Jx - Kb * Jy);
      Jy = detInv * (Ka * Jy - Kb * Jx);
      Jx = t8;
    }
    const t9 = this.b1.imass;
    this.b1.posx -= Jx * t9;
    this.b1.posy -= Jy * t9;
    const t10 = this.b2.imass;
    this.b2.posx += Jx * t10;
    this.b2.posy += Jy * t10;
    const dr = -(Jy * r1x - Jx * r1y) * this.b1.iinertia;
    ZPP_AngleJoint._rotateBody(this.b1, dr);
    const dr1 = (Jy * r2x - Jx * r2y) * this.b2.iinertia;
    ZPP_AngleJoint._rotateBody(this.b2, dr1);
    return false;
  }

  override draw(_g: Any): void {}
}
