/**
 * ZPP_DistanceJoint — Internal 2-body, 1-DOF distance constraint.
 *
 * Constrains the distance between two anchor points (a1 on b1, a2 on b2)
 * to lie within [jointMin, jointMax]. Supports equal (exact) mode, slack
 * detection, soft (spring) and stiff modes, and position correction.
 *
 * Converted from nape-compiled.js lines 22329–23204.
 */

import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_AngleJoint } from "./ZPP_AngleJoint";
import { ZPP_PubPool } from "../util/ZPP_PubPool";
import { ZPP_Vec2 } from "../geom/ZPP_Vec2";

type Any = any;

export class ZPP_DistanceJoint extends ZPP_Constraint {
  static override __name__ = ["zpp_nape", "constraint", "ZPP_DistanceJoint"];
  static __super__ = ZPP_Constraint;
  static _wrapFn: ((zpp: ZPP_DistanceJoint) => Any) | null = null;
  static _createFn: ((...args: any[]) => any) | null = null;

  outer_zn: Any = null;
  jointMin = 0.0;
  jointMax = 0.0;
  slack = false;
  equal = false;
  nx = 0.0;
  ny = 0.0;
  cx1 = 0.0;
  cx2 = 0.0;
  b1: Any = null;
  b2: Any = null;
  a1localx = 0.0;
  a1localy = 0.0;
  a1relx = 0.0;
  a1rely = 0.0;
  a2localx = 0.0;
  a2localy = 0.0;
  a2relx = 0.0;
  a2rely = 0.0;
  wrap_a1: Any = null;
  wrap_a2: Any = null;
  kMass = 0.0;
  jAcc = 0.0;
  jMax = Infinity;
  gamma = 0.0;
  bias = 0.0;
  stepped = false;

  override __class__: Any = ZPP_DistanceJoint;

  constructor() {
    super();
    this.a1localx = 0;
    this.a1localy = 0;
    this.a1relx = 0;
    this.a1rely = 0;
    this.a2localx = 0;
    this.a2localy = 0;
    this.a2relx = 0;
    this.a2rely = 0;
    this.jAcc = 0;
    this.jMax = Infinity;
    this.stepped = false;
    this.cx1 = this.cx2 = 0;
  }

  is_slack(): boolean {
    let slack: boolean;
    this.a1relx = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    this.a1rely = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    this.a2relx = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    this.a2rely = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;
    const nx = this.b2.posx + this.a2relx - (this.b1.posx + this.a1relx);
    const ny = this.b2.posy + this.a2rely - (this.b1.posy + this.a1rely);
    let C = nx * nx + ny * ny;
    if (C < ZPP_Constraint._nape.Config.epsilon) {
      slack = true;
    } else {
      C = Math.sqrt(C);
      if (this.equal) {
        slack = false;
      } else if (C < this.jointMin) {
        slack = false;
      } else if (C > this.jointMax) {
        slack = false;
      } else {
        slack = true;
      }
    }
    return slack;
  }

  bodyImpulse(b: Any): Any {
    const napeNs = ZPP_Constraint._nape;
    if (this.stepped) {
      if (b == this.b1) {
        return napeNs.geom.Vec3.get(
          -this.jAcc * this.nx,
          -this.jAcc * this.ny,
          -this.cx1 * this.jAcc,
        );
      } else {
        return napeNs.geom.Vec3.get(this.jAcc * this.nx, this.jAcc * this.ny, this.cx2 * this.jAcc);
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
    this.wrap_a1 = ZPP_DistanceJoint._setupAnchorVec2(
      this.a1localx,
      this.a1localy,
      this.validate_a1.bind(this),
      this.invalidate_a1.bind(this),
    );
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
    this.wrap_a2 = ZPP_DistanceJoint._setupAnchorVec2(
      this.a2localx,
      this.a2localy,
      this.validate_a2.bind(this),
      this.invalidate_a2.bind(this),
    );
  }

  override copy(dict: Any, todo: Any): Any {
    const _this = this.outer_zn;
    if (_this.zpp_inner_zn.wrap_a1 == null) {
      _this.zpp_inner_zn.setup_a1();
    }
    const ret_a1 = _this.zpp_inner_zn.wrap_a1;
    const _this1 = this.outer_zn;
    if (_this1.zpp_inner_zn.wrap_a2 == null) {
      _this1.zpp_inner_zn.setup_a2();
    }
    const ret = ZPP_DistanceJoint._createFn!(
      null,
      null,
      ret_a1,
      _this1.zpp_inner_zn.wrap_a2,
      this.jointMin,
      this.jointMax,
    );
    this.copyto(ret);
    ZPP_AngleJoint._copyBody(dict, todo, this.b1, ret, "b1");
    ZPP_AngleJoint._copyBody(dict, todo, this.b2, ret, "b2");
    return ret;
  }

  override validate(): void {
    if (this.b1 == null || this.b2 == null) {
      throw new Error("Error: DistanceJoint cannot be simulated null bodies");
    }
    if (this.b1 == this.b2) {
      throw new Error("Error: DistanceJoint cannot be simulated with body1 == body2");
    }
    if (this.b1.space != this.space || this.b2.space != this.space) {
      throw new Error(
        "Error: Constraints must have each body within the same space to which the constraint has been assigned",
      );
    }
    if (this.jointMin > this.jointMax) {
      throw new Error("Error: DistanceJoint must have jointMin <= jointMax");
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
    this.jAcc = 0;
    this.pre_dt = -1.0;
  }

  override preStep(dt: number): boolean {
    if (this.pre_dt == -1.0) {
      this.pre_dt = dt;
    }
    const dtratio = dt / this.pre_dt;
    this.pre_dt = dt;
    this.stepped = true;
    this.equal = this.jointMin == this.jointMax;
    this.a1relx = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    this.a1rely = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    this.a2relx = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    this.a2rely = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;
    this.nx = this.b2.posx + this.a2relx - (this.b1.posx + this.a1relx);
    this.ny = this.b2.posy + this.a2rely - (this.b1.posy + this.a1rely);
    let C = this.nx * this.nx + this.ny * this.ny;
    if (C < ZPP_Constraint._nape.Config.epsilon) {
      this.nx = 0;
      this.ny = 0;
      C = 0;
      this.slack = true;
    } else {
      C = Math.sqrt(C);
      const t = 1.0 / C;
      this.nx *= t;
      this.ny *= t;
      if (this.equal) {
        C -= this.jointMax;
        this.slack = false;
      } else if (C < this.jointMin) {
        C = this.jointMin - C;
        this.nx = -this.nx;
        this.ny = -this.ny;
        this.slack = false;
      } else if (C > this.jointMax) {
        C -= this.jointMax;
        this.slack = false;
      } else {
        this.nx = 0;
        this.ny = 0;
        C = 0;
        this.slack = true;
      }
    }
    const C1 = C;
    if (!this.slack) {
      this.cx1 = this.ny * this.a1relx - this.nx * this.a1rely;
      this.cx2 = this.ny * this.a2relx - this.nx * this.a2rely;
      this.kMass =
        this.b1.smass +
        this.b2.smass +
        this.cx1 * this.cx1 * this.b1.sinertia +
        this.cx2 * this.cx2 * this.b2.sinertia;
      if (this.kMass != 0) {
        this.kMass = 1 / this.kMass;
      } else {
        this.jAcc = 0;
      }
      if (!this.stiff) {
        if (this.breakUnderError && C1 * C1 > this.maxError * this.maxError) {
          return true;
        }
        const omega = 2 * Math.PI * this.frequency;
        this.gamma = 1 / (dt * omega * (2 * this.damping + omega * dt));
        const ig = 1 / (1 + this.gamma);
        const biasCoef = dt * omega * omega * this.gamma;
        this.gamma *= ig;
        this.kMass *= ig;
        this.bias = -C1 * biasCoef;
        if (this.bias < -this.maxError) {
          this.bias = -this.maxError;
        } else if (this.bias > this.maxError) {
          this.bias = this.maxError;
        }
      } else {
        this.bias = 0;
        this.gamma = 0;
      }
      this.jAcc *= dtratio;
      this.jMax = this.maxForce * dt;
    }
    return false;
  }

  override warmStart(): void {
    if (!this.slack) {
      const t = this.b1.imass * this.jAcc;
      this.b1.velx -= this.nx * t;
      this.b1.vely -= this.ny * t;
      const t1 = this.b2.imass * this.jAcc;
      this.b2.velx += this.nx * t1;
      this.b2.vely += this.ny * t1;
      this.b1.angvel -= this.cx1 * this.b1.iinertia * this.jAcc;
      this.b2.angvel += this.cx2 * this.b2.iinertia * this.jAcc;
    }
  }

  override applyImpulseVel(): boolean {
    if (this.slack) {
      return false;
    }
    const E =
      this.nx * (this.b2.velx + this.b2.kinvelx - this.b1.velx - this.b1.kinvelx) +
      this.ny * (this.b2.vely + this.b2.kinvely - this.b1.vely - this.b1.kinvely) +
      (this.b2.angvel + this.b2.kinangvel) * this.cx2 -
      (this.b1.angvel + this.b1.kinangvel) * this.cx1;
    let j = this.kMass * (this.bias - E) - this.jAcc * this.gamma;
    const jOld = this.jAcc;
    this.jAcc += j;
    if (!this.equal && this.jAcc > 0) {
      this.jAcc = 0;
    }
    if (this.breakUnderForce && this.jAcc < -this.jMax) {
      return true;
    }
    if (!this.stiff) {
      if (this.jAcc < -this.jMax) {
        this.jAcc = -this.jMax;
      }
    }
    j = this.jAcc - jOld;
    const t = this.b1.imass * j;
    this.b1.velx -= this.nx * t;
    this.b1.vely -= this.ny * t;
    const t1 = this.b2.imass * j;
    this.b2.velx += this.nx * t1;
    this.b2.vely += this.ny * t1;
    this.b1.angvel -= this.cx1 * this.b1.iinertia * j;
    this.b2.angvel += this.cx2 * this.b2.iinertia * j;
    return false;
  }

  override applyImpulsePos(): boolean {
    let j: number;
    const r1x = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    const r1y = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    const r2x = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    const r2y = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;
    let slack: boolean;
    let nx = this.b2.posx + r2x - (this.b1.posx + r1x);
    let ny = this.b2.posy + r2y - (this.b1.posy + r1y);
    let C = nx * nx + ny * ny;
    if (C < ZPP_Constraint._nape.Config.epsilon) {
      nx = 0;
      ny = 0;
      C = 0;
      slack = true;
    } else {
      C = Math.sqrt(C);
      const t = 1.0 / C;
      nx *= t;
      ny *= t;
      if (this.equal) {
        C -= this.jointMax;
        slack = false;
      } else if (C < this.jointMin) {
        C = this.jointMin - C;
        nx = -nx;
        ny = -ny;
        slack = false;
      } else if (C > this.jointMax) {
        C -= this.jointMax;
        slack = false;
      } else {
        nx = 0;
        ny = 0;
        C = 0;
        slack = true;
      }
    }
    let E = C;
    if (!slack) {
      if (this.breakUnderError && E * E > this.maxError * this.maxError) {
        return true;
      }
      if (
        E * E <
        ZPP_Constraint._nape.Config.constraintLinearSlop *
          ZPP_Constraint._nape.Config.constraintLinearSlop
      ) {
        return false;
      }
      E *= 0.5;
      if (E * E > 6) {
        const k = this.b1.smass + this.b2.smass;
        if (k > ZPP_Constraint._nape.Config.epsilon) {
          const kInv = 0.75 / k;
          j = -E * kInv;
          if (this.equal || j < 0) {
            const t1 = j * this.b1.imass;
            this.b1.posx -= nx * t1;
            this.b1.posy -= ny * t1;
            const t2 = j * this.b2.imass;
            this.b2.posx += nx * t2;
            this.b2.posy += ny * t2;
            nx = this.b2.posx + r2x - (this.b1.posx + r1x);
            ny = this.b2.posy + r2y - (this.b1.posy + r1y);
            let C1 = nx * nx + ny * ny;
            if (C1 < ZPP_Constraint._nape.Config.epsilon) {
              nx = 0;
              ny = 0;
              C1 = 0;
            } else {
              C1 = Math.sqrt(C1);
              const t3 = 1.0 / C1;
              nx *= t3;
              ny *= t3;
              if (this.equal) {
                C1 -= this.jointMax;
              } else if (C1 < this.jointMin) {
                C1 = this.jointMin - C1;
                nx = -nx;
                ny = -ny;
              } else if (C1 > this.jointMax) {
                C1 -= this.jointMax;
              } else {
                nx = 0;
                ny = 0;
                C1 = 0;
              }
            }
            E = C1;
            E *= 0.5;
          }
        }
      }
      const cx1 = ny * r1x - nx * r1y;
      const cx2 = ny * r2x - nx * r2y;
      let k1 =
        this.b1.smass + this.b2.smass + cx1 * cx1 * this.b1.sinertia + cx2 * cx2 * this.b2.sinertia;
      if (k1 != 0) {
        k1 = 1 / k1;
      }
      j = -E * k1;
      if (this.equal || j < 0) {
        const t4 = this.b1.imass * j;
        this.b1.posx -= nx * t4;
        this.b1.posy -= ny * t4;
        const t5 = this.b2.imass * j;
        this.b2.posx += nx * t5;
        this.b2.posy += ny * t5;
        ZPP_AngleJoint._rotateBody(this.b1, -cx1 * this.b1.iinertia * j);
        ZPP_AngleJoint._rotateBody(this.b2, cx2 * this.b2.iinertia * j);
      }
    }
    return false;
  }

  override draw(_g: Any): void {}

  // ========== Static helper: pooled Vec2 wrapper for anchor points ==========

  /**
   * Creates (or reuses from pool) a public Vec2 wrapper for a constraint anchor
   * point stored as (localx, localy). Installs the given validate and invalidate
   * callbacks so that the Vec2 stays in sync with the internal coordinate fields.
   *
   * Shared by all anchor-based joints (DistanceJoint, PivotJoint, LineJoint, etc.)
   */
  static _setupAnchorVec2(
    localx: number,
    localy: number,
    validateFn: (() => void) | null,
    invalidateFn: ((vec: Any) => void) | null,
  ): Any {
    const napeNs = ZPP_Constraint._nape;
    let x = localx;
    let y = localy;
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
      let inner: ZPP_Vec2;
      if (ZPP_Vec2.zpp_pool == null) {
        inner = new ZPP_Vec2();
      } else {
        inner = ZPP_Vec2.zpp_pool;
        ZPP_Vec2.zpp_pool = inner.next;
        inner.next = null;
      }
      inner.weak = false;
      inner._immutable = false;
      inner.x = x;
      inner.y = y;
      ret.zpp_inner = inner;
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
    ret.zpp_inner._inuse = true;
    ret.zpp_inner._validate = validateFn;
    ret.zpp_inner._invalidate = invalidateFn;
    return ret;
  }
}
