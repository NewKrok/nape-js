/**
 * ZPP_AngleJoint — Internal angular constraint between two bodies.
 *
 * Constrains the angle (ratio * b2.rot - b1.rot) to [jointMin, jointMax].
 * 1-DOF scalar constraint with slack detection and ratio scaling.
 *
 * Converted from nape-compiled.js lines 21828–22299.
 */

import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_CopyHelper } from "./ZPP_CopyHelper";

type Any = any;

export class ZPP_AngleJoint extends ZPP_Constraint {
  static override __name__ = ["zpp_nape", "constraint", "ZPP_AngleJoint"];
  static __super__ = ZPP_Constraint;

  outer_zn: Any = null;
  ratio = 1.0;
  jointMin = 0.0;
  jointMax = 0.0;
  slack = false;
  equal = false;
  scale = 0.0;
  b1: Any = null;
  b2: Any = null;
  kMass = 0.0;
  jAcc = 0.0;
  jMax = Infinity;
  gamma = 0.0;
  bias = 0.0;
  stepped = false;

  override __class__: Any = ZPP_AngleJoint;

  constructor() {
    super();
    this.jAcc = 0;
    this.slack = false;
    this.jMax = Infinity;
    this.stepped = false;
  }

  is_slack(): boolean {
    let slack: boolean;
    const C0 = this.ratio * this.b2.rot - this.b1.rot;
    let C = C0;
    if (this.equal) {
      C -= this.jointMax;
      slack = false;
      this.scale = 1.0;
    } else if (C < this.jointMin) {
      C = this.jointMin - C;
      this.scale = -1.0;
      slack = false;
    } else if (C > this.jointMax) {
      C -= this.jointMax;
      this.scale = 1.0;
      slack = false;
    } else {
      this.scale = 0.0;
      C = 0;
      slack = true;
    }
    return slack;
  }

  bodyImpulse(b: Any): Any {
    const napeNs = ZPP_Constraint._nape;
    if (this.stepped) {
      if (b == this.b1) {
        return napeNs.geom.Vec3.get(0, 0, -this.scale * this.jAcc);
      } else {
        return napeNs.geom.Vec3.get(0, 0, this.ratio * this.scale * this.jAcc);
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

  override copy(dict: Any, todo: Any): Any {
    const napeNs = ZPP_Constraint._nape;
    const ret = new napeNs.constraint.AngleJoint(
      null,
      null,
      this.jointMin,
      this.jointMax,
      this.ratio,
    );
    this.copyto(ret);
    ZPP_AngleJoint._copyBody(dict, todo, this.b1, ret, "b1");
    ZPP_AngleJoint._copyBody(dict, todo, this.b2, ret, "b2");
    return ret;
  }

  override validate(): void {
    if (this.b1 == null || this.b2 == null) {
      throw new Error("Error: AngleJoint cannot be simulated null bodies");
    }
    if (this.b1 == this.b2) {
      throw new Error("Error: AngleJoint cannot be simulated with body1 == body2");
    }
    if (this.b1.space != this.space || this.b2.space != this.space) {
      throw new Error(
        "Error: Constraints must have each body within the same space to which the constraint has been assigned",
      );
    }
    if (this.jointMin > this.jointMax) {
      throw new Error("Error: AngleJoint must have jointMin <= jointMax");
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
    this.slack = false;
  }

  override preStep(dt: number): boolean {
    if (this.pre_dt == -1.0) {
      this.pre_dt = dt;
    }
    const dtratio = dt / this.pre_dt;
    this.pre_dt = dt;
    this.stepped = true;
    this.equal = this.jointMin == this.jointMax;
    let C = this.ratio * this.b2.rot - this.b1.rot;
    if (this.equal) {
      C -= this.jointMax;
      this.slack = false;
      this.scale = 1.0;
    } else if (C < this.jointMin) {
      C = this.jointMin - C;
      this.scale = -1.0;
      this.slack = false;
    } else if (C > this.jointMax) {
      C -= this.jointMax;
      this.scale = 1.0;
      this.slack = false;
    } else {
      this.scale = 0.0;
      C = 0;
      this.slack = true;
    }
    const C1 = C;
    if (!this.slack) {
      this.kMass = this.b1.sinertia + this.ratio * this.ratio * this.b2.sinertia;
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
      this.b1.angvel -= this.scale * this.b1.iinertia * this.jAcc;
      this.b2.angvel += this.ratio * this.scale * this.b2.iinertia * this.jAcc;
    }
  }

  override applyImpulseVel(): boolean {
    if (this.slack) {
      return false;
    }
    const E =
      this.scale *
      (this.ratio * (this.b2.angvel + this.b2.kinangvel) - this.b1.angvel - this.b1.kinangvel);
    let j = this.kMass * (this.bias - E) - this.jAcc * this.gamma;
    const jOld = this.jAcc;
    this.jAcc += j;
    if (!this.equal && this.jAcc > 0) {
      this.jAcc = 0;
    }
    if (this.breakUnderForce && (this.jAcc > this.jMax || this.jAcc < -this.jMax)) {
      return true;
    }
    if (!this.stiff) {
      if (this.jAcc > this.jMax) {
        this.jAcc = this.jMax;
      } else if (this.jAcc < -this.jMax) {
        this.jAcc = -this.jMax;
      }
    }
    j = this.jAcc - jOld;
    this.b1.angvel -= this.scale * this.b1.iinertia * j;
    this.b2.angvel += this.ratio * this.scale * this.b2.iinertia * j;
    return false;
  }

  override applyImpulsePos(): boolean {
    let j: number;
    let slack: boolean;
    let C = this.ratio * this.b2.rot - this.b1.rot;
    if (this.equal) {
      C -= this.jointMax;
      slack = false;
      this.scale = 1.0;
    } else if (C < this.jointMin) {
      C = this.jointMin - C;
      this.scale = -1.0;
      slack = false;
    } else if (C > this.jointMax) {
      C -= this.jointMax;
      this.scale = 1.0;
      slack = false;
    } else {
      this.scale = 0.0;
      C = 0;
      slack = true;
    }
    const E = C;
    if (!slack) {
      if (this.breakUnderError && E * E > this.maxError * this.maxError) {
        return true;
      }
      const halfE = E * 0.5;
      j = -halfE * this.kMass;
      if (this.equal || j < 0) {
        ZPP_AngleJoint._rotateBody(this.b1, -this.scale * j * this.b1.iinertia);
        ZPP_AngleJoint._rotateBody(this.b2, this.ratio * this.scale * j * this.b2.iinertia);
      }
    }
    return false;
  }

  override draw(_g: Any): void {}

  // ========== Static helpers shared by all joints ==========

  /**
   * Small-angle-optimized body rotation. Used by all joints' applyImpulsePos.
   */
  static _rotateBody(body: Any, dr: number): void {
    body.rot += dr;
    if (dr * dr > 0.0001) {
      body.axisx = Math.sin(body.rot);
      body.axisy = Math.cos(body.rot);
    } else {
      const d2 = dr * dr;
      const p = 1 - 0.5 * d2;
      const m = 1 - (d2 * d2) / 8;
      const nx = (p * body.axisx + dr * body.axisy) * m;
      body.axisy = (p * body.axisy - dr * body.axisx) * m;
      body.axisx = nx;
    }
  }

  /**
   * Dict-lookup / deferred-todo body copying. Used by all joints' copy().
   */
  static _copyBody(dict: Any, todo: Any, srcBody: Any, ret: Any, field: string): void {
    if (dict != null && srcBody != null) {
      let b: Any = null;
      for (let _g = 0; _g < dict.length; _g++) {
        const idc = dict[_g];
        if (idc.id == srcBody.id) {
          b = idc.bc;
          break;
        }
      }
      if (b != null) {
        ret.zpp_inner_zn[field] = b.zpp_inner;
      } else {
        todo.push(
          ZPP_CopyHelper.todo(srcBody.id, function (body: Any) {
            ret.zpp_inner_zn[field] = body.zpp_inner;
          }),
        );
      }
    }
  }
}
