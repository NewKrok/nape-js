/**
 * ZPP_LineJoint — Internal 2-body, 2-DOF line (sliding) constraint.
 *
 * Constrains body2's anchor (a2) to slide along the line defined by
 * body1's anchor (a1) and direction vector (n). The distance along
 * the line is bounded by [jointMin, jointMax].
 *
 * Converted from nape-compiled.js lines 23205–23304.
 */

import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_AngleJoint } from "./ZPP_AngleJoint";


export class ZPP_LineJoint extends ZPP_Constraint {
  static override __name__ = ["zpp_nape", "constraint", "ZPP_LineJoint"];
  static __super__ = ZPP_Constraint;
  static _wrapFn: ((zpp: ZPP_LineJoint) => any) | null = null;
  static _createFn: ((...args: any[]) => any) | null = null;

  outer_zn: any = null;
  scale = 0.0;
  jointMin = 0.0;
  jointMax = 0.0;
  equal = false;
  dot1 = 0.0;
  dot2 = 0.0;
  cx1 = 0.0;
  cx2 = 0.0;

  b1: any = null;
  a1localx = 0.0;
  a1localy = 0.0;
  a1relx = 0.0;
  a1rely = 0.0;
  wrap_a1: any = null;

  b2: any = null;
  a2localx = 0.0;
  a2localy = 0.0;
  a2relx = 0.0;
  a2rely = 0.0;
  wrap_a2: any = null;

  zip_n: any = null;
  nlocalx = 0.0;
  nlocaly = 0.0;
  nrelx = 0.0;
  nrely = 0.0;
  wrap_n: any = null;

  kMassa = 0.0;
  kMassb = 0.0;
  kMassc = 0.0;
  jAccx = 0.0;
  jAccy = 0.0;
  jMax: any = null;
  gamma: any = null;
  biasx = 0.0;
  biasy = 0.0;
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
    this.nlocalx = 0;
    this.nlocaly = 0;
    this.nrelx = 0;
    this.nrely = 0;
    this.jAccx = 0;
    this.jAccy = 0;
    this.jMax = Infinity;
    this.jointMin = -Infinity;
    this.jointMax = Infinity;
    this.stepped = false;
  }

  // ---- Vec2 anchor/direction setup helpers ----

  /**
   * Creates or recycles a Vec2 from the public pool, sets its x/y,
   * wires up _validate/_invalidate callbacks, and stores it in the given
   * wrapper field. Used by setup_a1, setup_a2, and setup_n.
   */
  private _setupVec2(
    x: number,
    y: number,
    validateFn: () => void,
    invalidateFn: (v: any) => void,
  ): any {
    const napeNs = ZPP_Constraint._nape;
    const zpp = ZPP_Constraint._zpp;

    if (y == null) {
      y = 0;
    }
    if (x == null) {
      x = 0;
    }
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }

    let ret: any;
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
      let ret1: any;
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
      if (x !== x || y !== y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      let tmp: boolean;
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
    ret.zpp_inner._inuse = true;
    ret.zpp_inner._validate = validateFn;
    ret.zpp_inner._invalidate = invalidateFn;
    return ret;
  }

  // ---- a1 ----

  validate_a1(): void {
    this.wrap_a1.zpp_inner.x = this.a1localx;
    this.wrap_a1.zpp_inner.y = this.a1localy;
  }

  invalidate_a1(x: any): void {
    this.immutable_midstep("Constraint::a1");
    this.a1localx = x.x;
    this.a1localy = x.y;
    this.wake();
  }

  setup_a1(): void {
    this.wrap_a1 = this._setupVec2(
      this.a1localx,
      this.a1localy,
      this.validate_a1.bind(this),
      this.invalidate_a1.bind(this),
    );
  }

  // ---- a2 ----

  validate_a2(): void {
    this.wrap_a2.zpp_inner.x = this.a2localx;
    this.wrap_a2.zpp_inner.y = this.a2localy;
  }

  invalidate_a2(x: any): void {
    this.immutable_midstep("Constraint::a2");
    this.a2localx = x.x;
    this.a2localy = x.y;
    this.wake();
  }

  setup_a2(): void {
    this.wrap_a2 = this._setupVec2(
      this.a2localx,
      this.a2localy,
      this.validate_a2.bind(this),
      this.invalidate_a2.bind(this),
    );
  }

  // ---- n (direction vector) ----

  validate_n(): void {
    this.wrap_n.zpp_inner.x = this.nlocalx;
    this.wrap_n.zpp_inner.y = this.nlocaly;
  }

  invalidate_n(x: any): void {
    this.immutable_midstep("Constraint::n");
    this.nlocalx = x.x;
    this.nlocaly = x.y;
    this.zip_n = true;
    this.wake();
  }

  setup_n(): void {
    this.wrap_n = this._setupVec2(
      this.nlocalx,
      this.nlocaly,
      this.validate_n.bind(this),
      this.invalidate_n.bind(this),
    );
  }

  validate_norm(): void {
    if (this.zip_n) {
      this.zip_n = false;
      const d = this.nlocalx * this.nlocalx + this.nlocaly * this.nlocaly;
      const imag = 1.0 / Math.sqrt(d);
      const t = imag;
      this.nlocalx *= t;
      this.nlocaly *= t;
    }
  }

  // ---- Core constraint methods ----

  bodyImpulse(b: any): any {
    const napeNs = ZPP_Constraint._nape;
    if (this.stepped) {
      const jx = this.scale * this.nrelx * this.jAccy - this.nrely * this.jAccx;
      const jy = this.nrelx * this.jAccx + this.scale * this.nrely * this.jAccy;
      if (b == this.b1) {
        return napeNs.geom.Vec3.get(-jx, -jy, this.scale * this.cx1 * jy - this.dot1 * jx);
      } else {
        return napeNs.geom.Vec3.get(jx, jy, this.scale * this.cx1 * jy - this.dot1 * jx);
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

  override copy(dict: any, todo: any): any {
    const _this = this.outer_zn;
    if (_this.zpp_inner_zn.wrap_a1 == null) {
      _this.zpp_inner_zn.setup_a1();
    }
    const ret = _this.zpp_inner_zn.wrap_a1;
    const _this1 = this.outer_zn;
    if (_this1.zpp_inner_zn.wrap_a2 == null) {
      _this1.zpp_inner_zn.setup_a2();
    }
    const ret1 = _this1.zpp_inner_zn.wrap_a2;
    const _this2 = this.outer_zn;
    if (_this2.zpp_inner_zn.wrap_n == null) {
      _this2.zpp_inner_zn.setup_n();
    }
    const ret2 = ZPP_LineJoint._createFn!(
      null,
      null,
      ret,
      ret1,
      _this2.zpp_inner_zn.wrap_n,
      this.jointMin,
      this.jointMax,
    );
    this.copyto(ret2);
    ZPP_AngleJoint._copyBody(dict, todo, this.b1, ret2, "b1");
    ZPP_AngleJoint._copyBody(dict, todo, this.b2, ret2, "b2");
    return ret2;
  }

  override validate(): void {
    const napeNs = ZPP_Constraint._nape;
    if (this.b1 == null || this.b2 == null) {
      throw new Error("Error: AngleJoint cannot be simulated null bodies");
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
    if (this.nlocalx * this.nlocalx + this.nlocaly * this.nlocaly < napeNs.Config.epsilon) {
      throw new Error("Error: DistanceJoint direction must be non-degenerate");
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
    this.pre_dt = -1.0;
  }

  override preStep(dt: number): boolean {
    if (this.pre_dt == -1.0) {
      this.pre_dt = dt;
    }
    const dtratio = dt / this.pre_dt;
    this.pre_dt = dt;
    this.equal = this.jointMin == this.jointMax;
    this.stepped = true;

    this.validate_norm();

    this.a1relx = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    this.a1rely = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    this.nrelx = this.b1.axisy * this.nlocalx - this.b1.axisx * this.nlocaly;
    this.nrely = this.nlocalx * this.b1.axisx + this.nlocaly * this.b1.axisy;
    this.a2relx = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    this.a2rely = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;

    const dx = this.b2.posx + this.a2relx - this.b1.posx - this.a1relx;
    const dy = this.b2.posy + this.a2rely - this.b1.posy - this.a1rely;
    const Cx = dy * this.nrelx - dx * this.nrely;
    let Cy = this.nrelx * dx + this.nrely * dy;

    if (this.equal) {
      Cy -= this.jointMin;
      this.scale = 1.0;
    } else if (Cy > this.jointMax) {
      Cy -= this.jointMax;
      this.scale = 1.0;
    } else if (Cy < this.jointMin) {
      Cy = this.jointMin - Cy;
      this.scale = -1.0;
    } else {
      Cy = 0;
      this.scale = 0;
    }

    const drx = dx + this.a1relx;
    const dry = dy + this.a1rely;
    this.dot1 = this.nrelx * drx + this.nrely * dry;
    this.cx1 = dry * this.nrelx - drx * this.nrely;
    this.dot2 = this.nrelx * this.a2relx + this.nrely * this.a2rely;
    this.cx2 = this.a2rely * this.nrelx - this.a2relx * this.nrely;

    this.kMassa =
      this.b1.smass +
      this.b2.smass +
      this.dot1 * this.dot1 * this.b1.sinertia +
      this.dot2 * this.dot2 * this.b2.sinertia;
    this.kMassb =
      -this.scale *
      (this.dot1 * this.cx1 * this.b1.sinertia + this.dot2 * this.cx2 * this.b2.sinertia);
    this.kMassc =
      this.scale *
      this.scale *
      (this.b1.smass +
        this.b2.smass +
        this.cx1 * this.cx1 * this.b1.sinertia +
        this.cx2 * this.cx2 * this.b2.sinertia);

    const det = this.kMassa * this.kMassc - this.kMassb * this.kMassb;
    let flag: number;
    if (det !== det) {
      this.kMassa = this.kMassb = this.kMassc = 0;
      flag = 3;
    } else if (det == 0) {
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
      if (this.breakUnderError && Cx * Cx + Cy * Cy > this.maxError * this.maxError) {
        return true;
      }
      const omega = 2 * Math.PI * this.frequency;
      this.gamma = 1 / (dt * omega * (2 * this.damping + omega * dt));
      const ig = 1 / (1 + this.gamma);
      const biasCoef = dt * omega * omega * this.gamma;
      this.gamma *= ig;
      const X = ig;
      this.kMassa *= X;
      this.kMassb *= X;
      this.kMassc *= X;
      this.biasx = Cx;
      this.biasy = Cy;
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
      this.gamma = 0;
      this.biasx = 0;
      this.biasy = 0;
    }

    const t4 = dtratio;
    this.jAccx *= t4;
    this.jAccy *= t4;
    this.jMax = this.maxForce * dt;

    return false;
  }

  override warmStart(): void {
    const J2x = this.scale * this.nrelx * this.jAccy - this.nrely * this.jAccx;
    const J2y = this.nrelx * this.jAccx + this.scale * this.nrely * this.jAccy;
    const t = this.b1.imass;
    this.b1.velx -= J2x * t;
    this.b1.vely -= J2y * t;
    const t1 = this.b2.imass;
    this.b2.velx += J2x * t1;
    this.b2.vely += J2y * t1;
    this.b1.angvel +=
      (this.scale * this.cx1 * this.jAccy - this.dot1 * this.jAccx) * this.b1.iinertia;
    this.b2.angvel +=
      (this.dot2 * this.jAccx - this.scale * this.cx2 * this.jAccy) * this.b2.iinertia;
  }

  override applyImpulseVel(): boolean {
    let dvx = this.b2.velx - this.b1.velx;
    let dvy = this.b2.vely - this.b1.vely;
    dvx += this.b2.kinvelx - this.b1.kinvelx;
    dvy += this.b2.kinvely - this.b1.kinvely;
    const Ex =
      dvy * this.nrelx -
      dvx * this.nrely +
      (this.b2.angvel + this.b2.kinangvel) * this.dot2 -
      (this.b1.angvel + this.b1.kinangvel) * this.dot1;
    const Ey =
      this.scale *
      (this.nrelx * dvx +
        this.nrely * dvy -
        (this.b2.angvel + this.b2.kinangvel) * this.cx2 +
        (this.b1.angvel + this.b1.kinangvel) * this.cx1);

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
    this.jAccx += Jx;
    this.jAccy += Jy;

    if (this.jAccy > 0) {
      this.jAccy = 0;
    }

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

    const djx = this.jAccx - jOldx;
    const djy = this.jAccy - jOldy;
    const J2x = this.scale * this.nrelx * djy - this.nrely * djx;
    const J2y = this.nrelx * djx + this.scale * this.nrely * djy;
    const t5 = this.b1.imass;
    this.b1.velx -= J2x * t5;
    this.b1.vely -= J2y * t5;
    const t6 = this.b2.imass;
    this.b2.velx += J2x * t6;
    this.b2.vely += J2y * t6;
    this.b1.angvel += (this.scale * this.cx1 * djy - this.dot1 * djx) * this.b1.iinertia;
    this.b2.angvel += (this.dot2 * djx - this.scale * this.cx2 * djy) * this.b2.iinertia;

    return false;
  }

  override applyImpulsePos(): boolean {
    const napeNs = ZPP_Constraint._nape;

    const nx = this.b1.axisy * this.nlocalx - this.b1.axisx * this.nlocaly;
    const ny = this.nlocalx * this.b1.axisx + this.nlocaly * this.b1.axisy;

    const r1x = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    const r1y = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;

    const r2x = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    const r2y = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;

    let dx = this.b2.posx + r2x - this.b1.posx - r1x;
    let dy = this.b2.posy + r2y - this.b1.posy - r1y;
    let scale: number;
    let Ex = dy * nx - dx * ny;
    let Ey = nx * dx + ny * dy;

    if (this.equal) {
      Ey -= this.jointMin;
      scale = 1.0;
    } else if (Ey > this.jointMax) {
      Ey -= this.jointMax;
      scale = 1.0;
    } else if (Ey < this.jointMin) {
      Ey = this.jointMin - Ey;
      scale = -1.0;
    } else {
      Ey = 0;
      scale = 0;
    }

    if (this.breakUnderError && Ex * Ex + Ey * Ey > this.maxError * this.maxError) {
      return true;
    }

    if (
      Ex * Ex + Ey * Ey <
      napeNs.Config.constraintLinearSlop * napeNs.Config.constraintLinearSlop
    ) {
      return false;
    }

    let Jx;
    let Jy;
    const t = 0.5;
    Ex *= t;
    Ey *= t;

    if (Ex * Ex + Ey * Ey > 6) {
      const k = this.b1.smass + this.b2.smass;
      if (k > napeNs.Config.epsilon) {
        const kInv = 0.8 / k;
        const Jx1 = kInv * (ny * Ex - scale * nx * Ey);
        const Jy1 = kInv * (nx * Ex * scale - ny * Ex);
        const t1 = this.b1.imass;
        this.b1.posx -= Jx1 * t1;
        this.b1.posy -= Jy1 * t1;
        const t2 = this.b2.imass;
        this.b2.posx += Jx1 * t2;
        this.b2.posy += Jy1 * t2;
        dx = this.b2.posx + r2x - this.b1.posx - r1x;
        dy = this.b2.posy + r2y - this.b1.posy - r1y;
        Ex = dy * nx - dx * ny;
        Ey = nx * dx + ny * dy;
        if (this.equal) {
          Ey -= this.jointMin;
          scale = 1.0;
        } else if (Ey > this.jointMax) {
          Ey -= this.jointMax;
          scale = 1.0;
        } else if (Ey < this.jointMin) {
          Ey = this.jointMin - Ey;
          scale = -1.0;
        } else {
          Ey = 0;
          scale = 0;
        }
        const t3 = 0.5;
        Ex *= t3;
        Ey *= t3;
      }
    }

    const drx = dx + r1x;
    const dry = dy + r1y;
    const dot1 = nx * drx + ny * dry;
    const cx1 = dry * nx - drx * ny;
    const dot2 = nx * r2x + ny * r2y;
    const cx2 = r2y * nx - r2x * ny;
    const Ka =
      this.b1.smass +
      this.b2.smass +
      dot1 * dot1 * this.b1.sinertia +
      dot2 * dot2 * this.b2.sinertia;
    const Kb = -scale * (dot1 * cx1 * this.b1.sinertia + dot2 * cx2 * this.b2.sinertia);
    const Kc =
      scale *
      scale *
      (this.b1.smass + this.b2.smass + cx1 * cx1 * this.b1.sinertia + cx2 * cx2 * this.b2.sinertia);

    Jx = -Ex;
    Jy = -Ey;
    const det = Ka * Kc - Kb * Kb;
    if (det !== det) {
      Jy = 0;
      Jx = Jy;
    } else if (det == 0) {
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
      const detInv = 1 / det;
      const t4 = detInv * (Kc * Jx - Kb * Jy);
      Jy = detInv * (Ka * Jy - Kb * Jx);
      Jx = t4;
    }

    if (Jy > 0) {
      Jy = 0;
    }

    const J2x = scale * nx * Jy - ny * Jx;
    const J2y = nx * Jx + scale * ny * Jy;
    const t5 = this.b1.imass;
    this.b1.posx -= J2x * t5;
    this.b1.posy -= J2y * t5;
    const t6 = this.b2.imass;
    this.b2.posx += J2x * t6;
    this.b2.posy += J2y * t6;

    ZPP_AngleJoint._rotateBody(this.b1, (scale * cx1 * Jy - dot1 * Jx) * this.b1.iinertia);
    ZPP_AngleJoint._rotateBody(this.b2, (dot2 * Jx - scale * cx2 * Jy) * this.b2.iinertia);

    return false;
  }

  override draw(_g: any): void {}
}
