/**
 * ZPP_SpringJoint — Internal 2-body, 1-DOF spring/damper constraint.
 *
 * Always applies a spring force toward the rest length (no slack, no rigid mode).
 * Uses Hooke's law via the sequential impulse soft-constraint formulation:
 *   F = -k * (distance - restLength) - c * relativeVelocity
 *
 * The spring constant and damping coefficient are derived from the inherited
 * `frequency` (Hz) and `damping` (ratio) parameters on the base Constraint.
 */

import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_AngleJoint } from "./ZPP_AngleJoint";
import { ZPP_PubPool } from "../util/ZPP_PubPool";
import { ZPP_Vec2 } from "../geom/ZPP_Vec2";
import { Config } from "../../Config";

export class ZPP_SpringJoint extends ZPP_Constraint {
  static _wrapFn: ((zpp: ZPP_SpringJoint) => any) | null = null;
  static _createFn: ((...args: any[]) => any) | null = null;

  outer_zn: any = null;
  restLength = 0.0;
  nx = 0.0;
  ny = 0.0;
  cx1 = 0.0;
  cx2 = 0.0;
  b1: any = null;
  b2: any = null;
  a1localx = 0.0;
  a1localy = 0.0;
  a1relx = 0.0;
  a1rely = 0.0;
  a2localx = 0.0;
  a2localy = 0.0;
  a2relx = 0.0;
  a2rely = 0.0;
  wrap_a1: any = null;
  wrap_a2: any = null;
  kMass = 0.0;
  jAcc = 0.0;
  jMax = Infinity;
  gamma = 0.0;
  bias = 0.0;
  stepped = false;

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
    // Springs are always soft
    this.stiff = false;
    this.frequency = 8;
    this.damping = 1;
  }

  bodyImpulse(b: any): any {
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

  invalidate_a1(x: any): void {
    this.immutable_midstep("Constraint::" + "a1");
    this.a1localx = x.x;
    this.a1localy = x.y;
    this.wake();
  }

  setup_a1(): void {
    this.wrap_a1 = ZPP_SpringJoint._setupAnchorVec2(
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

  invalidate_a2(x: any): void {
    this.immutable_midstep("Constraint::" + "a2");
    this.a2localx = x.x;
    this.a2localy = x.y;
    this.wake();
  }

  setup_a2(): void {
    this.wrap_a2 = ZPP_SpringJoint._setupAnchorVec2(
      this.a2localx,
      this.a2localy,
      this.validate_a2.bind(this),
      this.invalidate_a2.bind(this),
    );
  }

  override copy(dict: any, todo: any): any {
    const _this = this.outer_zn;
    if (_this.zpp_inner_zn.wrap_a1 == null) {
      _this.zpp_inner_zn.setup_a1();
    }
    const ret_a1 = _this.zpp_inner_zn.wrap_a1;
    const _this1 = this.outer_zn;
    if (_this1.zpp_inner_zn.wrap_a2 == null) {
      _this1.zpp_inner_zn.setup_a2();
    }
    const ret = ZPP_SpringJoint._createFn!(
      null,
      null,
      ret_a1,
      _this1.zpp_inner_zn.wrap_a2,
      this.restLength,
    );
    this.copyto(ret);
    ZPP_AngleJoint._copyBody(dict, todo, this.b1, ret, "b1");
    ZPP_AngleJoint._copyBody(dict, todo, this.b2, ret, "b2");
    return ret;
  }

  override validate(): void {
    if (this.b1 == null || this.b2 == null) {
      throw new Error("SpringJoint cannot be simulated null bodies");
    }
    if (this.b1 == this.b2) {
      throw new Error("SpringJoint cannot be simulated with body1 == body2");
    }
    if (this.b1.space != this.space || this.b2.space != this.space) {
      throw new Error(
        "Error: Constraints must have each body within the same space to which the constraint has been assigned",
      );
    }
    if (this.b1.type != 2 && this.b2.type != 2) {
      throw new Error("Constraints cannot have both bodies non-dynamic");
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

    // Compute anchor world positions
    this.a1relx = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    this.a1rely = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    this.a2relx = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    this.a2rely = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;

    this.nx = this.b2.posx + this.a2relx - (this.b1.posx + this.a1relx);
    this.ny = this.b2.posy + this.a2rely - (this.b1.posy + this.a1rely);

    let dist = this.nx * this.nx + this.ny * this.ny;
    if (dist < Config.epsilon) {
      // Nearly coincident — pick arbitrary direction
      this.nx = 1;
      this.ny = 0;
      dist = 0;
    } else {
      dist = Math.sqrt(dist);
      const t = 1.0 / dist;
      this.nx *= t;
      this.ny *= t;
    }

    // Constraint error: distance from rest length
    const C = dist - this.restLength;

    // Jacobian cross products for rotation
    this.cx1 = this.ny * this.a1relx - this.nx * this.a1rely;
    this.cx2 = this.ny * this.a2relx - this.nx * this.a2rely;

    // Effective mass
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

    // Soft constraint parameters (spring is always soft)
    if (this.breakUnderError && C * C > this.maxError * this.maxError) {
      return true;
    }
    const omega = 2 * Math.PI * this.frequency;
    this.gamma = 1 / (dt * omega * (2 * this.damping + omega * dt));
    const ig = 1 / (1 + this.gamma);
    const biasCoef = dt * omega * omega * this.gamma;
    this.gamma *= ig;
    this.kMass *= ig;
    this.bias = -C * biasCoef;
    if (this.bias < -this.maxError) {
      this.bias = -this.maxError;
    } else if (this.bias > this.maxError) {
      this.bias = this.maxError;
    }

    // Warm-start scaling
    this.jAcc *= dtratio;
    this.jMax = this.maxForce * dt;

    return false;
  }

  override warmStart(): void {
    const t = this.b1.imass * this.jAcc;
    this.b1.velx -= this.nx * t;
    this.b1.vely -= this.ny * t;
    const t1 = this.b2.imass * this.jAcc;
    this.b2.velx += this.nx * t1;
    this.b2.vely += this.ny * t1;
    this.b1.angvel -= this.cx1 * this.b1.iinertia * this.jAcc;
    this.b2.angvel += this.cx2 * this.b2.iinertia * this.jAcc;
  }

  override applyImpulseVel(): boolean {
    const E =
      this.nx * (this.b2.velx + this.b2.kinvelx - this.b1.velx - this.b1.kinvelx) +
      this.ny * (this.b2.vely + this.b2.kinvely - this.b1.vely - this.b1.kinvely) +
      (this.b2.angvel + this.b2.kinangvel) * this.cx2 -
      (this.b1.angvel + this.b1.kinangvel) * this.cx1;

    let j = this.kMass * (this.bias - E) - this.jAcc * this.gamma;
    const jOld = this.jAcc;
    this.jAcc += j;

    // Break check
    if (this.breakUnderForce && Math.abs(this.jAcc) > this.jMax) {
      return true;
    }

    // Clamp impulse magnitude (spring can push and pull)
    if (this.jAcc < -this.jMax) {
      this.jAcc = -this.jMax;
    } else if (this.jAcc > this.jMax) {
      this.jAcc = this.jMax;
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
    // Springs don't do position correction — they only apply velocity impulses.
    // The spring force naturally corrects position over time.
    return false;
  }

  override draw(_g: any): void {}

  /**
   * Reuse the anchor Vec2 setup from ZPP_DistanceJoint.
   */
  static _setupAnchorVec2(
    localx: number,
    localy: number,
    validateFn: (() => void) | null,
    invalidateFn: ((vec: any) => void) | null,
  ): any {
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
      throw new Error("Vec2 components cannot be NaN");
    }
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
        throw new Error("Vec2 has been disposed and cannot be used!");
      }
      const _this = ret.zpp_inner;
      if (_this._immutable) {
        throw new Error("Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      if (x != x || y != y) {
        throw new Error("Vec2 components cannot be NaN");
      }
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Vec2 has been disposed and cannot be used!");
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
