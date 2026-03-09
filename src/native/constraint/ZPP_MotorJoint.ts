/**
 * ZPP_MotorJoint — Internal class for motor joint constraints.
 *
 * Applies angular velocity to rotate bodies relative to each other.
 * Velocity-only constraint (no position correction).
 *
 * Converted from nape-compiled.js lines 23892–24197.
 */

import { getNape } from "../../core/engine";
import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_CopyHelper } from "./ZPP_CopyHelper";

export class ZPP_MotorJoint extends ZPP_Constraint {
  static override __name__ = ["zpp_nape", "constraint", "ZPP_MotorJoint"];
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
      let xr;
      if (this.b1.component == this.b1.component.parent) {
        xr = this.b1.component;
      } else {
        let obj = this.b1.component;
        let stack: any = null;
        while (obj != obj.parent) {
          const nxt = obj.parent;
          obj.parent = stack;
          stack = obj;
          obj = nxt;
        }
        while (stack != null) {
          const nxt1 = stack.parent;
          stack.parent = obj;
          stack = nxt1;
        }
        xr = obj;
      }
      let yr;
      if (this.component == this.component.parent) {
        yr = this.component;
      } else {
        let obj1 = this.component;
        let stack1: any = null;
        while (obj1 != obj1.parent) {
          const nxt2 = obj1.parent;
          obj1.parent = stack1;
          stack1 = obj1;
          obj1 = nxt2;
        }
        while (stack1 != null) {
          const nxt3 = stack1.parent;
          stack1.parent = obj1;
          stack1 = nxt3;
        }
        yr = obj1;
      }
      if (xr != yr) {
        if (xr.rank < yr.rank) {
          xr.parent = yr;
        } else if (xr.rank > yr.rank) {
          yr.parent = xr;
        } else {
          yr.parent = xr;
          xr.rank++;
        }
      }
    }
    if (this.b2.type == 2) {
      let xr1;
      if (this.b2.component == this.b2.component.parent) {
        xr1 = this.b2.component;
      } else {
        let obj2 = this.b2.component;
        let stack2: any = null;
        while (obj2 != obj2.parent) {
          const nxt4 = obj2.parent;
          obj2.parent = stack2;
          stack2 = obj2;
          obj2 = nxt4;
        }
        while (stack2 != null) {
          const nxt5 = stack2.parent;
          stack2.parent = obj2;
          stack2 = nxt5;
        }
        xr1 = obj2;
      }
      let yr1;
      if (this.component == this.component.parent) {
        yr1 = this.component;
      } else {
        let obj3 = this.component;
        let stack3: any = null;
        while (obj3 != obj3.parent) {
          const nxt6 = obj3.parent;
          obj3.parent = stack3;
          stack3 = obj3;
          obj3 = nxt6;
        }
        while (stack3 != null) {
          const nxt7 = stack3.parent;
          stack3.parent = obj3;
          stack3 = nxt7;
        }
        yr1 = obj3;
      }
      if (xr1 != yr1) {
        if (xr1.rank < yr1.rank) {
          xr1.parent = yr1;
        } else if (xr1.rank > yr1.rank) {
          yr1.parent = xr1;
        } else {
          yr1.parent = xr1;
          xr1.rank++;
        }
      }
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
}
