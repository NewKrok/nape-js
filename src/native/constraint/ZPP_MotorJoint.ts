/**
 * ZPP_MotorJoint — Internal motor constraint between two bodies.
 *
 * A velocity-only constraint that drives angular velocity at a target rate.
 * No position correction (applyImpulsePos returns false).
 *
 * Converted from nape-compiled.js lines 24305–24610.
 */

import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_AngleJoint } from "./ZPP_AngleJoint";

type Any = any;

export class ZPP_MotorJoint extends ZPP_Constraint {
  static override __name__ = ["zpp_nape", "constraint", "ZPP_MotorJoint"];
  static __super__ = ZPP_Constraint;

  outer_zn: Any = null;
  ratio = 0.0;
  rate = 0.0;
  b1: Any = null;
  b2: Any = null;
  kMass = 0.0;
  jAcc = 0.0;
  jMax = 0.0;
  stepped = false;

  override __class__: Any = ZPP_MotorJoint;

  constructor() {
    super();
    this.jAcc = 0;
    this.stepped = false;
    this.__velocity = true;
  }

  bodyImpulse(b: Any): Any {
    const napeNs = ZPP_Constraint._nape;
    if (this.stepped) {
      if (b == this.b1) {
        return napeNs.geom.Vec3.get(0, 0, -this.jAcc);
      } else {
        return napeNs.geom.Vec3.get(0, 0, this.ratio * this.jAcc);
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
    const ret = new napeNs.constraint.MotorJoint(null, null, this.rate, this.ratio);
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
      throw new Error("Error: MotorJoint cannot be simulated with body1 == body2");
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
    this.kMass = this.b1.sinertia + this.ratio * this.ratio * this.b2.sinertia;
    this.kMass = 1.0 / this.kMass;
    this.jAcc *= dtratio;
    this.jMax = this.maxForce * dt;
    return false;
  }

  override warmStart(): void {
    this.b1.angvel -= this.b1.iinertia * this.jAcc;
    this.b2.angvel += this.ratio * this.b2.iinertia * this.jAcc;
  }

  override applyImpulseVel(): boolean {
    const E =
      this.ratio * (this.b2.angvel + this.b2.kinangvel) -
      this.b1.angvel -
      this.b1.kinangvel -
      this.rate;
    let j = -this.kMass * E;
    const jOld = this.jAcc;
    this.jAcc += j;
    if (this.breakUnderForce) {
      if (this.jAcc > this.jMax || this.jAcc < -this.jMax) {
        return true;
      }
    } else if (this.jAcc < -this.jMax) {
      this.jAcc = -this.jMax;
    } else if (this.jAcc > this.jMax) {
      this.jAcc = this.jMax;
    }
    j = this.jAcc - jOld;
    this.b1.angvel -= this.b1.iinertia * j;
    this.b2.angvel += this.ratio * this.b2.iinertia * j;
    return false;
  }

  override applyImpulsePos(): boolean {
    return false;
  }

  override draw(_g: Any): void {}
}
