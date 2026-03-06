/**
 * ZPP_AngleJoint — Internal class for angle joint constraints.
 *
 * Constrains the relative angle between two bodies within min/max bounds.
 * Contains the complete solver logic (preStep, warmStart, impulse application).
 *
 * Converted from nape-compiled.js lines 21441–21912.
 */

import { getNape } from "../../core/engine";
import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_CopyHelper } from "./ZPP_CopyHelper";

type Any = any;

export class ZPP_AngleJoint extends ZPP_Constraint {
  static override __name__ = ["zpp_nape", "constraint", "ZPP_AngleJoint"];
  static _wrapFn: ((zpp: ZPP_AngleJoint) => Any) | null = null;
  static _createFn: ((...args: any[]) => any) | null = null;

  // Joint-specific fields
  outer_zn: Any = null;
  ratio: number = 0.0;
  jointMin: number = 0.0;
  jointMax: number = 0.0;
  slack: boolean = false;
  equal: boolean = false;
  scale: number = 0.0;

  // Body references (ZPP_Body instances)
  b1: Any = null;
  b2: Any = null;

  // Solver fields
  kMass: number = 0.0;
  jAcc: number = 0.0;
  jMax: number = 0.0;
  gamma: number = 0.0;
  bias: number = 0.0;
  stepped: boolean = false;

  override __class__: Any = ZPP_AngleJoint;

  constructor() {
    super();
    this.ratio = 1;
    this.jAcc = 0;
    this.slack = false;
    this.jMax = Infinity;
    this.stepped = false;
  }

  is_slack(): boolean {
    const C = this.ratio * this.b2.rot - this.b1.rot;
    if (this.equal) {
      this.scale = 1.0;
      return false;
    } else if (C < this.jointMin) {
      this.scale = -1.0;
      return false;
    } else if (C > this.jointMax) {
      this.scale = 1.0;
      return false;
    } else {
      this.scale = 0.0;
      return true;
    }
  }

  bodyImpulse(b: Any): Any {
    const nape = getNape();
    if (this.stepped) {
      if (b == this.b1) {
        return nape.geom.Vec3.get(0, 0, -this.scale * this.jAcc);
      } else {
        return nape.geom.Vec3.get(0, 0, this.ratio * this.scale * this.jAcc);
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

  override copy(dict?: Any, todo?: Any): Any {
    const ret = ZPP_AngleJoint._createFn!(
      null,
      null,
      this.jointMin,
      this.jointMax,
      this.ratio,
    );
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
          ZPP_CopyHelper.todo(this.b1.id, (b1: Any) => {
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
          ZPP_CopyHelper.todo(this.b2.id, (b3: Any) => {
            ret.zpp_inner.b2 = b3.zpp_inner;
          }),
        );
      }
    }
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
      let xr;
      if (this.b1.component == this.b1.component.parent) {
        xr = this.b1.component;
      } else {
        let obj = this.b1.component;
        let stack: Any = null;
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
        let stack1: Any = null;
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
        let stack2: Any = null;
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
        let stack3: Any = null;
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

  override pair_exists(id: Any, di: Any): boolean {
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
    let C = this.ratio * this.b2.rot - this.b1.rot;
    let slack: boolean;
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
      const E2 = E * 0.5;
      const j = -E2 * this.kMass;
      if (this.equal || j < 0) {
        const _this = this.b1;
        const dr = -this.scale * j * this.b1.iinertia;
        _this.rot += dr;
        if (dr * dr > 0.0001) {
          _this.axisx = Math.sin(_this.rot);
          _this.axisy = Math.cos(_this.rot);
        } else {
          const d2 = dr * dr;
          const p = 1 - 0.5 * d2;
          const m = 1 - (d2 * d2) / 8;
          const nx = (p * _this.axisx + dr * _this.axisy) * m;
          _this.axisy = (p * _this.axisy - dr * _this.axisx) * m;
          _this.axisx = nx;
        }
        const _this1 = this.b2;
        const dr1 = this.ratio * this.scale * j * this.b2.iinertia;
        _this1.rot += dr1;
        if (dr1 * dr1 > 0.0001) {
          _this1.axisx = Math.sin(_this1.rot);
          _this1.axisy = Math.cos(_this1.rot);
        } else {
          const d21 = dr1 * dr1;
          const p1 = 1 - 0.5 * d21;
          const m1 = 1 - (d21 * d21) / 8;
          const nx1 = (p1 * _this1.axisx + dr1 * _this1.axisy) * m1;
          _this1.axisy = (p1 * _this1.axisy - dr1 * _this1.axisx) * m1;
          _this1.axisx = nx1;
        }
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
