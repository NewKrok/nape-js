/**
 * ZPP_UserConstraint — Internal N-DOF user-defined constraint with Cholesky decomposition.
 *
 * A generic constraint where the user supplies callbacks for effective mass,
 * velocity/position errors, impulse application, and clamping.  The solver
 * factorises the effective-mass matrix via Cholesky (solve/transform) and
 * drives the constraint each step through warmStart / applyImpulseVel /
 * applyImpulsePos.
 *
 * Converted from nape-compiled.js lines 27368–28037.
 */

import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_UserBody } from "./ZPP_UserBody";

type Any = any;

export class ZPP_UserConstraint extends ZPP_Constraint {
  static override __name__ = ["zpp_nape", "constraint", "ZPP_UserConstraint"];
  static __super__ = ZPP_Constraint;

  // Outer public-API wrapper (UserConstraint)
  outer_zn: Any = null;

  // Array of ZPP_UserBody entries — bodies referenced by this constraint
  bodies: ZPP_UserBody[] = null!;

  // Number of degrees of freedom
  dim = 0;

  // Accumulated impulse vector [dim]
  jAcc: number[] = null!;

  // Positional bias vector [dim]
  bias: number[] = null!;

  // Whether at least one step has been taken (for warm-starting)
  stepped = false;

  // Cholesky lower-triangular factor [dim × dim], stored row-major
  L: number[] = null!;

  // Temporary forward-substitution result [dim]
  y: number[] = null!;

  // Soft-constraint scaling factor
  soft = 0.0;

  // Soft-constraint gamma (regularisation term)
  gamma = 0.0;

  // True → velocity-only constraint (no position correction)
  velonly = false;

  // Maximum impulse magnitude this step (maxForce * dt)
  jMax = 0.0;

  // Effective mass matrix entries [dim*(dim+1)/2 upper triangle, or full dim×dim]
  Keff: number[] = null!;

  // Reusable Vec3 for impulse accumulation (kept alive across steps)
  vec3: Any = null;

  // Jacobian / working impulse vector [dim]
  J: number[] = null!;

  // Previous accumulated impulse (for delta impulse calculation) [dim]
  jOld: number[] = null!;

  override __class__: Any = ZPP_UserConstraint;

  constructor(dim: number, velonly: boolean) {
    super();
    this.bodies = [];
    this.dim = dim;
    this.velonly = velonly;
    this.jAcc = [];
    this.bias = [];
    this.L = [];
    this.J = [];
    this.jOld = [];
    this.y = [];
    this.Keff = [];
    this.vec3 = ZPP_Constraint._nape.geom.Vec3.get(0, 0, 0);
    for (let i = 0; i < dim; i++) {
      const tmp = (this.bias[i] = this.J[i] = this.jOld[i] = this.y[i] = 0.0);
      this.jAcc[i] = tmp;
      for (let j = 0; j < dim; j++) {
        this.L[i * dim + j] = 0.0;
      }
    }
    this.stepped = false;
  }

  // ---------------------------------------------------------------------------
  // Invalidation forwarding

  bindVec2_invalidate(_: Any): void {
    this.outer_zn.__invalidate();
  }

  // ---------------------------------------------------------------------------
  // Body management

  addBody(b: Any): void {
    let match: ZPP_UserBody | null = null;
    for (const x of this.bodies) {
      if (x.body === b) {
        match = x;
        break;
      }
    }
    if (match === null) {
      this.bodies.push(new ZPP_UserBody(1, b));
      if (this.active && this.space != null) {
        if (b != null) {
          b.constraints.add(this);
        }
      }
    } else {
      match.cnt++;
    }
  }

  remBody(b: Any): boolean {
    let match: ZPP_UserBody | null = null;
    const bl = this.bodies.length | 0;
    let i = 0;
    while (i < bl) {
      const x = this.bodies[i];
      if (x.body === b) {
        x.cnt--;
        if (x.cnt === 0) {
          if (bl > 0) {
            this.bodies[i] = this.bodies[bl - 1];
          }
          this.bodies.pop();
          if (this.active && this.space != null) {
            if (b != null) {
              b.constraints.remove(this);
            }
          }
        }
        match = x;
        break;
      }
      ++i;
    }
    return match != null;
  }

  // ---------------------------------------------------------------------------
  // Impulse query

  bodyImpulse(b: Any): Any {
    for (let i = 0; i < this.dim; i++) {
      this.J[i] = this.jAcc[i];
    }
    const ret = ZPP_Constraint._nape.geom.Vec3.get(0, 0, 0);
    if (this.stepped) {
      this.outer_zn.__impulse(this.J, b.outer, ret);
    }
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Activation / deactivation

  activeBodies(): void {
    for (const bs of this.bodies) {
      if (bs.body != null) {
        bs.body.constraints.add(this);
      }
    }
  }

  inactiveBodies(): void {
    for (const bs of this.bodies) {
      if (bs.body != null) {
        bs.body.constraints.remove(this);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Copy

  copy(_dict: Any, _todo: Any): Any {
    const ret = this.outer_zn.__copy();
    this.copyto(ret);
    throw new Error("not done yet");
  }

  // ---------------------------------------------------------------------------
  // Validation

  validate(): void {
    for (const b of this.bodies) {
      if (b.body.space !== this.space) {
        throw new Error(
          "Error: Constraints must have each body within the same sapce to which the constraint has been assigned",
        );
      }
    }
    this.outer_zn.__validate();
  }

  // ---------------------------------------------------------------------------
  // Wake connected dynamic bodies

  wake_connected(): void {
    for (const b of this.bodies) {
      if (b.body.type === 2) {
        b.body.wake();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Union-find forest for island detection

  forest(): void {
    for (const b of this.bodies) {
      if (b.body.type === 2) {
        // Find root of b.body.component
        let xr: Any;
        if (b.body.component === b.body.component.parent) {
          xr = b.body.component;
        } else {
          let obj: Any = b.body.component;
          let stack: Any = null;
          while (obj !== obj.parent) {
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

        // Find root of this.component
        let yr: Any;
        if (this.component === this.component.parent) {
          yr = this.component;
        } else {
          let obj1: Any = this.component;
          let stack1: Any = null;
          while (obj1 !== obj1.parent) {
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

        // Union by rank
        if (xr !== yr) {
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
    }
  }

  // ---------------------------------------------------------------------------
  // Pair existence check (for broadphase)

  pair_exists(id: number, di: number): boolean {
    let ret = false;
    const bl = this.bodies.length | 0;
    for (let bi = 0; bi < bl; bi++) {
      const b = this.bodies[bi].body;
      for (let ci = bi + 1; ci < bl; ci++) {
        const c = this.bodies[ci].body;
        if ((b.id === id && c.id === di) || (b.id === di && c.id === id)) {
          ret = true;
          break;
        }
      }
      if (ret) {
        break;
      }
    }
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Break callback

  broken(): void {
    this.outer_zn.__broken();
  }

  // ---------------------------------------------------------------------------
  // Clear warm-start cache

  clearcache(): void {
    for (let i = 0; i < this.dim; i++) {
      this.jAcc[i] = 0.0;
    }
    this.pre_dt = -1.0;
  }

  // ---------------------------------------------------------------------------
  // Helpers: least squares norm and clamping

  lsq(v: number[]): number {
    let sum = 0.0;
    for (let i = 0; i < this.dim; i++) {
      sum += v[i] * v[i];
    }
    return sum;
  }

  _clamp(v: number[], max: number): void {
    const x = this.lsq(v);
    if (x > max * max) {
      const scale = max / Math.sqrt(x);
      for (let i = 0; i < this.dim; i++) {
        v[i] *= scale;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Cholesky factorisation of symmetric positive-(semi)definite matrix m.
  //
  // m is supplied as the upper triangle in row-major order (only lower indices
  // referenced here, matching the Haxe original).  Fills this.L (lower
  // triangular, row-major) and returns it.

  solve(m: number[]): number[] {
    let ind = 0;
    for (let j = 0; j < this.dim; j++) {
      let sum = 0.0;
      for (let k = 0; k < j - 1; k++) {
        sum += this.L[j * this.dim + k] * this.L[j * this.dim + k];
      }
      let rec = Math.sqrt(m[ind++] - sum);
      this.L[j * this.dim + j] = rec;
      if (rec !== 0) {
        rec = 1.0 / rec;
        for (let i = j + 1; i < this.dim; i++) {
          let sum1 = 0.0;
          for (let k1 = 0; k1 < j - 1; k1++) {
            sum1 += this.L[i * this.dim + k1] * this.L[j * this.dim + k1];
          }
          this.L[i * this.dim + j] = rec * (m[ind++] - sum1);
        }
      } else {
        for (let i1 = j + 1; i1 < this.dim; i1++) {
          this.L[i1 * this.dim + j] = 0.0;
        }
        ind += this.dim - j - 1;
      }
    }
    return this.L;
  }

  // ---------------------------------------------------------------------------
  // Forward and backward substitution (in-place on x, using L).
  //
  // Forward pass:  solve L y = x  →  stores result in this.y
  // Backward pass: solve L^T x = y  →  stores result back in x

  transform(L: number[], x: number[]): void {
    // Forward substitution: L y = x
    for (let i = 0; i < this.dim; i++) {
      let sum = x[i];
      const lii = L[i * this.dim + i];
      if (lii !== 0) {
        for (let k = 0; k < i; k++) {
          sum -= L[i * this.dim + k] * this.y[k];
        }
        this.y[i] = sum / lii;
      } else {
        this.y[i] = 0.0;
      }
    }
    // Backward substitution: L^T x = y
    for (let ix = 0; ix < this.dim; ix++) {
      const i1 = this.dim - 1 - ix;
      const lii1 = L[i1 * this.dim + i1];
      if (lii1 !== 0) {
        let sum1 = this.y[i1];
        for (let k1 = i1 + 1; k1 < this.dim; k1++) {
          sum1 -= L[k1 * this.dim + i1] * x[k1];
        }
        x[i1] = sum1 / lii1;
      } else {
        x[i1] = 0.0;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Solver: pre-step (compute bias, Cholesky factor, scale warm-start)

  preStep(dt: number): boolean {
    if (this.pre_dt === -1.0) {
      this.pre_dt = dt;
    }
    const dtratio = dt / this.pre_dt;
    this.pre_dt = dt;
    this.stepped = true;
    this.outer_zn.__prepare();
    this.outer_zn.__eff_mass(this.Keff);
    this.L = this.solve(this.Keff);
    if (!this.stiff && !this.velonly) {
      const omega = 2 * Math.PI * this.frequency;
      this.gamma = 1 / (dt * omega * (2 * this.damping + omega * dt));
      const ig = 1 / (1 + this.gamma);
      const biasCoef = dt * omega * omega * this.gamma;
      this.gamma *= ig;
      this.soft = ig;
      this.outer_zn.__position(this.bias);
      if (this.breakUnderError && this.lsq(this.bias) > this.maxError * this.maxError) {
        return true;
      }
      for (let i = 0; i < this.dim; i++) {
        this.bias[i] *= -biasCoef;
      }
      this._clamp(this.bias, this.maxError);
    } else {
      for (let i1 = 0; i1 < this.dim; i1++) {
        this.bias[i1] = 0.0;
      }
      this.gamma = 0.0;
      this.soft = 1.0;
    }
    for (let i2 = 0; i2 < this.dim; i2++) {
      this.jAcc[i2] *= dtratio;
    }
    this.jMax = this.maxForce * dt;
    return false;
  }

  // ---------------------------------------------------------------------------
  // Solver: warm-start (apply accumulated impulse from previous step)

  warmStart(): void {
    for (const bs of this.bodies) {
      const b = bs.body;
      this.outer_zn.__impulse(this.jAcc, b.outer, this.vec3);
      const t = b.imass;

      const b1 = b;
      const b2 = b1.velx;
      const _this = this.vec3;
      if (_this != null && _this.zpp_disp) {
        throw new Error("Error: " + "Vec3" + " has been disposed and cannot be used!");
      }
      const _this1 = _this.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      b1.velx = b2 + _this.zpp_inner.x * t;

      const b3 = b;
      const b4 = b3.vely;
      const _this2 = this.vec3;
      if (_this2 != null && _this2.zpp_disp) {
        throw new Error("Error: " + "Vec3" + " has been disposed and cannot be used!");
      }
      const _this3 = _this2.zpp_inner;
      if (_this3._validate != null) {
        _this3._validate();
      }
      b3.vely = b4 + _this2.zpp_inner.y * t;

      const b5 = b;
      const b6 = b5.angvel;
      const _this4 = this.vec3;
      if (_this4 != null && _this4.zpp_disp) {
        throw new Error("Error: " + "Vec3" + " has been disposed and cannot be used!");
      }
      const _this5 = _this4.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      b5.angvel = b6 + _this4.zpp_inner.z * b.iinertia;
    }
  }

  // ---------------------------------------------------------------------------
  // Solver: velocity impulse pass

  applyImpulseVel(): boolean {
    this.outer_zn.__velocity(this.J);
    for (let i = 0; i < this.dim; i++) {
      this.J[i] = this.bias[i] - this.J[i];
    }
    this.transform(this.L, this.J);
    for (let i1 = 0; i1 < this.dim; i1++) {
      this.jOld[i1] = this.jAcc[i1];
      this.jAcc[i1] += this.J[i1] = this.J[i1] * this.soft - this.jAcc[i1] * this.gamma;
    }
    this.outer_zn.__clamp(this.jAcc);
    if ((this.breakUnderForce || !this.stiff) && this.lsq(this.jAcc) > this.jMax * this.jMax) {
      if (this.breakUnderForce) {
        return true;
      } else if (!this.stiff) {
        this._clamp(this.jAcc, this.jMax);
      }
    }
    for (let i2 = 0; i2 < this.dim; i2++) {
      this.J[i2] = this.jAcc[i2] - this.jOld[i2];
    }
    for (const bs of this.bodies) {
      const b = bs.body;
      this.outer_zn.__impulse(this.J, b.outer, this.vec3);
      const t = b.imass;

      const b1 = b;
      const b2 = b1.velx;
      const _this = this.vec3;
      if (_this != null && _this.zpp_disp) {
        throw new Error("Error: " + "Vec3" + " has been disposed and cannot be used!");
      }
      const _this1 = _this.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      b1.velx = b2 + _this.zpp_inner.x * t;

      const b3 = b;
      const b4 = b3.vely;
      const _this2 = this.vec3;
      if (_this2 != null && _this2.zpp_disp) {
        throw new Error("Error: " + "Vec3" + " has been disposed and cannot be used!");
      }
      const _this3 = _this2.zpp_inner;
      if (_this3._validate != null) {
        _this3._validate();
      }
      b3.vely = b4 + _this2.zpp_inner.y * t;

      const b5 = b;
      const b6 = b5.angvel;
      const _this4 = this.vec3;
      if (_this4 != null && _this4.zpp_disp) {
        throw new Error("Error: " + "Vec3" + " has been disposed and cannot be used!");
      }
      const _this5 = _this4.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      b5.angvel = b6 + _this4.zpp_inner.z * b.iinertia;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Solver: position correction pass (Baumgarte)

  applyImpulsePos(): boolean {
    if (this.velonly) {
      return false;
    }
    this.outer_zn.__prepare();
    this.outer_zn.__position(this.J);
    const lj = this.lsq(this.J);
    if (this.breakUnderError && lj > this.maxError * this.maxError) {
      return true;
    } else if (
      lj <
      ZPP_Constraint._nape.Config.constraintLinearSlop *
        ZPP_Constraint._nape.Config.constraintLinearSlop
    ) {
      return false;
    }
    for (let i = 0; i < this.dim; i++) {
      this.J[i] *= -1;
    }
    this.outer_zn.__eff_mass(this.Keff);
    this.transform(this.solve(this.Keff), this.J);
    this.outer_zn.__clamp(this.J);
    for (const bs of this.bodies) {
      const b = bs.body;
      this.outer_zn.__impulse(this.J, b.outer, this.vec3);
      const t = b.imass;

      const b1 = b;
      const b2 = b1.posx;
      const _this = this.vec3;
      if (_this != null && _this.zpp_disp) {
        throw new Error("Error: " + "Vec3" + " has been disposed and cannot be used!");
      }
      const _this1 = _this.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      b1.posx = b2 + _this.zpp_inner.x * t;

      const b3 = b;
      const b4 = b3.posy;
      const _this2 = this.vec3;
      if (_this2 != null && _this2.zpp_disp) {
        throw new Error("Error: " + "Vec3" + " has been disposed and cannot be used!");
      }
      const _this3 = _this2.zpp_inner;
      if (_this3._validate != null) {
        _this3._validate();
      }
      b3.posy = b4 + _this2.zpp_inner.y * t;

      const _this4 = this.vec3;
      if (_this4 != null && _this4.zpp_disp) {
        throw new Error("Error: " + "Vec3" + " has been disposed and cannot be used!");
      }
      const _this5 = _this4.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      const dr = _this4.zpp_inner.z * b.iinertia;
      b.rot += dr;
      if (dr * dr > 0.0001) {
        b.axisx = Math.sin(b.rot);
        b.axisy = Math.cos(b.rot);
      } else {
        const d2 = dr * dr;
        const p = 1 - 0.5 * d2;
        const m = 1 - (d2 * d2) / 8;
        const nx = (p * b.axisx + dr * b.axisy) * m;
        b.axisy = (p * b.axisy - dr * b.axisx) * m;
        b.axisx = nx;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Debug draw forwarding

  draw(g: Any): void {
    this.outer_zn.__draw(g);
  }
}
