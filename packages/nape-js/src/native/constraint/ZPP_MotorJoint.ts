/**
 * ZPP_MotorJoint — Internal class for motor joint constraints.
 *
 * Applies angular velocity to rotate bodies relative to each other.
 * Velocity-only constraint (no position correction).
 */

import { getNape } from "../../core/engine";
import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_CopyHelper } from "./ZPP_CopyHelper";

export class ZPP_MotorJoint extends ZPP_Constraint {
  static _wrapFn: ((zpp: ZPP_MotorJoint) => any) | null = null;
  static _createFn: ((...args: any[]) => any) | null = null;

  // Joint-specific fields
  outer_zn: any = null;
  ratio: number = 0.0;
  rate: number = 0.0;

  // Body references (ZPP_Body instances)
  b1: any = null;
  b2: any = null;

  // Solver fields
  kMass: number = 0.0;
  jAcc: number = 0.0;
  jMax: number = 0.0;
  stepped: boolean = false;

  constructor() {
    super();
    this.jAcc = 0;
    this.stepped = false;
    this.__velocity = true;
  }

  bodyImpulse(b: any): any {
    const nape = getNape();
    if (this.stepped) {
      if (b == this.b1) {
        return nape.geom.Vec3.get(0, 0, -this.jAcc);
      } else {
        return nape.geom.Vec3.get(0, 0, this.ratio * this.jAcc);
      }
    } else {
      return nape.geom.Vec3.get(0, 0, 0);
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

  override copy(dict?: any, todo?: any): any {
    const ret = ZPP_MotorJoint._createFn!(null, null, this.rate, this.ratio);
    this.copyto(ret);
    if (dict != null && this.b1 != null) {
      let b = null;
      let _g = 0;
      while (_g < dict.length) {
        const idc = dict[_g];
        ++_g;
        if (idc.id == this.b1.id) {
          b = idc.bc;
          break;
        }
      }
      if (b != null) {
        ret.zpp_inner.b1 = b.zpp_inner;
      } else {
        todo.push(
          ZPP_CopyHelper.todo(this.b1.id, (b1: any) => {
            ret.zpp_inner.b1 = b1.zpp_inner;
          }),
        );
      }
    }
    if (dict != null && this.b2 != null) {
      let b2 = null;
      let _g1 = 0;
      while (_g1 < dict.length) {
        const idc1 = dict[_g1];
        ++_g1;
        if (idc1.id == this.b2.id) {
          b2 = idc1.bc;
          break;
        }
      }
      if (b2 != null) {
        ret.zpp_inner.b2 = b2.zpp_inner;
      } else {
        todo.push(
          ZPP_CopyHelper.todo(this.b2.id, (b3: any) => {
            ret.zpp_inner.b2 = b3.zpp_inner;
          }),
        );
      }
    }
    return ret;
  }

  override validate(): void {
    // Note: "AngleJoint" in the first error message matches the original Haxe source
    if (this.b1 == null || this.b2 == null) {
      throw new Error("AngleJoint cannot be simulated null bodies");
    }
    if (this.b1 == this.b2) {
      throw new Error("MotorJoint cannot be simulated with body1 == body2");
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

  override pair_exists(id: any, di: any): boolean {
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
    // Neither body can rotate: no impulse can act (as in AngleJoint). 1/0
    // here made every impulse Infinity * 0 = NaN, poisoning both bodies.
    if (this.kMass != 0) {
      this.kMass = 1.0 / this.kMass;
    } else {
      this.jAcc = 0;
    }
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
}
