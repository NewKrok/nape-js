/**
 * ZPP_FluidArbiter — Internal fluid arbiter for the nape physics engine.
 *
 * Handles fluid interaction physics: buoyancy forces, viscous drag,
 * angular damping. Manages a lazy Vec2 position wrapper for the centroid.
 *
 * Converted from nape-compiled.js lines 29522–30206.
 */

import { ZPP_Arbiter } from "./ZPP_Arbiter";

type Any = any;

export class ZPP_FluidArbiter extends ZPP_Arbiter {
  // --- Static: Haxe metadata ---
  static override __name__ = ["zpp_nape", "dynamics", "ZPP_FluidArbiter"];
  static __super__ = ZPP_Arbiter;

  // --- Static: object pool ---
  static zpp_pool: ZPP_FluidArbiter | null = null;

  // --- Instance: outer wrapper reference ---
  outer_zn: Any = null;

  // --- Instance: linked list next (for pool) ---
  declare next: ZPP_FluidArbiter | null;

  // --- Instance: centroid position ---
  centroidx = 0.0;
  centroidy = 0.0;

  // --- Instance: overlap area ---
  overlap = 0.0;

  // --- Instance: relative position offsets ---
  r1x = 0.0;
  r1y = 0.0;
  r2x = 0.0;
  r2y = 0.0;

  // --- Instance: drag state ---
  nodrag = false;

  // --- Instance: angular mass/damping ---
  wMass = 0.0;
  adamp = 0.0;
  agamma = 0.0;

  // --- Instance: velocity mass matrix ---
  vMassa = 0.0;
  vMassb = 0.0;
  vMassc = 0.0;

  // --- Instance: linear drag impulse ---
  dampx = 0.0;
  dampy = 0.0;

  // --- Instance: linear gamma ---
  lgamma = 0.0;

  // --- Instance: drag direction ---
  nx = 0.0;
  ny = 0.0;

  // --- Instance: buoyancy impulse ---
  buoyx = 0.0;
  buoyy = 0.0;

  // --- Instance: lazy Vec2 position wrapper ---
  wrap_position: Any = null;

  // --- Instance: mutability flag ---
  mutable = false;

  // --- Instance: previous dt for warm-starting ---
  pre_dt = 0.0;

  // --- Instance: Haxe class reference ---
  override __class__: Any = ZPP_FluidArbiter;

  constructor() {
    super();
    this.pre_dt = 0.0;
    this.mutable = false;
    this.wrap_position = null;
    this.buoyy = 0.0;
    this.buoyx = 0.0;
    this.ny = 0.0;
    this.nx = 0.0;
    this.lgamma = 0.0;
    this.dampy = 0.0;
    this.dampx = 0.0;
    this.vMassc = 0.0;
    this.vMassb = 0.0;
    this.vMassa = 0.0;
    this.agamma = 0.0;
    this.adamp = 0.0;
    this.wMass = 0.0;
    this.nodrag = false;
    this.r2y = 0.0;
    this.r2x = 0.0;
    this.r1y = 0.0;
    this.r1x = 0.0;
    this.overlap = 0.0;
    this.centroidy = 0.0;
    this.centroidx = 0.0;
    this.next = null;
    this.outer_zn = null;
    this.type = ZPP_Arbiter.FLUID;
    this.fluidarb = this;
    this.buoyx = 0;
    this.buoyy = 0;
    this.pre_dt = -1.0;
  }

  // ========== Pool callbacks ==========

  alloc(): void {}
  free(): void {}

  // ========== Position handling ==========

  position_validate(): void {
    if (!this.active) {
      throw new Error("Error: Arbiter not currently in use");
    }
    this.wrap_position.zpp_inner.x = this.centroidx;
    this.wrap_position.zpp_inner.y = this.centroidy;
  }

  position_invalidate(x: Any): void {
    this.centroidx = x.x;
    this.centroidy = x.y;
  }

  getposition(): void {
    const zpp = ZPP_Arbiter._zpp;
    const napeNs = ZPP_Arbiter._nape;

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
      ret1.x = 0;
      ret1.y = 0;
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
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == 0) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        tmp = ret.zpp_inner.y == 0;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = 0;
        ret.zpp_inner.y = 0;
        const _this3 = ret.zpp_inner;
        if (_this3._invalidate != null) {
          _this3._invalidate(_this3);
        }
      }
    }
    ret.zpp_inner.weak = false;
    this.wrap_position = ret;
    this.wrap_position.zpp_inner._inuse = true;
    this.wrap_position.zpp_inner._immutable = !this.mutable;
    this.wrap_position.zpp_inner._validate = this.position_validate.bind(this);
    this.wrap_position.zpp_inner._invalidate = this.position_invalidate.bind(this);
  }

  // ========== Assign ==========

  assign(s1: Any, s2: Any, id: number, di: number): void {
    this.sup_assign(s1, s2, id, di);
    this.nx = 0;
    this.ny = 1;
    this.dampx = 0;
    this.dampy = 0;
    this.adamp = 0.0;
  }

  // ========== Retire ==========

  retire(): void {
    this.sup_retire();
    // Return to pool
    this.next = ZPP_FluidArbiter.zpp_pool;
    ZPP_FluidArbiter.zpp_pool = this;
    this.pre_dt = -1.0;
  }

  // ========== Mutability ==========

  makemutable(): void {
    this.mutable = true;
    if (this.wrap_position != null) {
      this.wrap_position.zpp_inner._immutable = false;
    }
  }

  makeimmutable(): void {
    this.mutable = false;
    if (this.wrap_position != null) {
      this.wrap_position.zpp_inner._immutable = true;
    }
  }

  // ========== Inject overlap data ==========

  inject(area: number, cx: number, cy: number): void {
    this.overlap = area;
    this.centroidx = cx;
    this.centroidy = cy;
  }

  // ========== Pre-step (physics solver) ==========

  preStep(s: Any, dt: number): void {
    const napeNs = ZPP_Arbiter._nape;

    if (this.pre_dt == -1.0) {
      this.pre_dt = dt;
    }
    const dtratio = dt / this.pre_dt;
    this.pre_dt = dt;

    this.r1x = this.centroidx - this.b1.posx;
    this.r1y = this.centroidy - this.b1.posy;
    this.r2x = this.centroidx - this.b2.posx;
    this.r2y = this.centroidy - this.b2.posy;

    // Gravity for each shape
    let g1x = 0.0;
    let g1y = 0.0;
    if (this.ws1.fluidEnabled && this.ws1.fluidProperties.wrap_gravity != null) {
      g1x = this.ws1.fluidProperties.gravityx;
      g1y = this.ws1.fluidProperties.gravityy;
    } else {
      g1x = s.gravityx;
      g1y = s.gravityy;
    }

    let g2x = 0.0;
    let g2y = 0.0;
    if (this.ws2.fluidEnabled && this.ws2.fluidProperties.wrap_gravity != null) {
      g2x = this.ws2.fluidProperties.gravityx;
      g2y = this.ws2.fluidProperties.gravityy;
    } else {
      g2x = s.gravityx;
      g2y = s.gravityy;
    }

    // Buoyancy calculation
    let buoyx = 0;
    let buoyy = 0;
    if (this.ws1.fluidEnabled && this.ws2.fluidEnabled) {
      const mass1 = this.overlap * this.ws1.fluidProperties.density;
      const mass2 = this.overlap * this.ws2.fluidProperties.density;
      if (mass1 > mass2) {
        const t = mass1 + mass2;
        buoyx -= g1x * t;
        buoyy -= g1y * t;
      } else if (mass1 < mass2) {
        const t = mass1 + mass2;
        buoyx += g2x * t;
        buoyy += g2y * t;
      } else {
        let gx = 0.0;
        let gy = 0.0;
        gx = g1x + g2x;
        gy = g1y + g2y;
        const t = 0.5;
        gx *= t;
        gy *= t;
        if (
          this.ws1.worldCOMx * gx + this.ws1.worldCOMy * gy >
          this.ws2.worldCOMx * gx + this.ws2.worldCOMy * gy
        ) {
          const t2 = mass1 + mass2;
          buoyx -= gx * t2;
          buoyy -= gy * t2;
        } else {
          const t2 = mass1 + mass2;
          buoyx += gx * t2;
          buoyy += gy * t2;
        }
      }
    } else if (this.ws1.fluidEnabled) {
      const mass = this.overlap * this.ws1.fluidProperties.density;
      buoyx -= g1x * mass;
      buoyy -= g1y * mass;
    } else if (this.ws2.fluidEnabled) {
      const mass = this.overlap * this.ws2.fluidProperties.density;
      buoyx += g2x * mass;
      buoyy += g2y * mass;
    }

    buoyx *= dt;
    buoyy *= dt;
    this.buoyx = buoyx;
    this.buoyy = buoyy;

    // Apply buoyancy to bodies
    if (this.b1.type == 2) {
      this.b1.velx -= buoyx * this.b1.imass;
      this.b1.vely -= buoyy * this.b1.imass;
      this.b1.angvel -= (buoyy * this.r1x - buoyx * this.r1y) * this.b1.iinertia;
    }
    if (this.b2.type == 2) {
      this.b2.velx += buoyx * this.b2.imass;
      this.b2.vely += buoyy * this.b2.imass;
      this.b2.angvel += (buoyy * this.r2x - buoyx * this.r2y) * this.b2.iinertia;
    }

    // Viscous drag
    if (
      (!this.ws1.fluidEnabled || this.ws1.fluidProperties.viscosity == 0) &&
      (!this.ws2.fluidEnabled || this.ws2.fluidProperties.viscosity == 0)
    ) {
      this.nodrag = true;
      this.dampx = 0;
      this.dampy = 0;
      this.adamp = 0;
    } else {
      this.nodrag = false;

      // Angular viscosity
      let tViscosity = 0.0;
      if (this.ws1.fluidEnabled) {
        this.ws2.validate_angDrag();
        tViscosity +=
          (this.ws1.fluidProperties.viscosity * this.ws2.angDrag * this.overlap) /
          this.ws2.area;
      }
      if (this.ws2.fluidEnabled) {
        this.ws1.validate_angDrag();
        tViscosity +=
          (this.ws2.fluidProperties.viscosity * this.ws1.angDrag * this.overlap) /
          this.ws1.area;
      }

      if (tViscosity != 0) {
        const iSum = this.b1.sinertia + this.b2.sinertia;
        if (iSum != 0) {
          this.wMass = 1 / iSum;
        } else {
          this.wMass = 0.0;
        }
        tViscosity *= 0.0004;
        const omega = 2 * Math.PI * tViscosity;
        this.agamma = 1 / (dt * omega * (2 + omega * dt));
        const ig = 1 / (1 + this.agamma);
        this.agamma *= ig;
        this.wMass *= ig;
      } else {
        this.wMass = 0.0;
        this.agamma = 0.0;
      }

      // Relative velocity for drag direction
      const vrnx =
        this.b2.velx +
        this.b2.kinvelx -
        this.r2y * (this.b2.angvel + this.b2.kinangvel) -
        (this.b1.velx +
          this.b1.kinvelx -
          this.r1y * (this.b2.angvel + this.b2.kinangvel));
      const vrny =
        this.b2.vely +
        this.b2.kinvely +
        this.r2x * (this.b2.angvel + this.b2.kinangvel) -
        (this.b1.vely +
          this.b1.kinvely +
          this.r1x * (this.b1.angvel + this.b1.kinangvel));

      if (!(vrnx * vrnx + vrny * vrny < napeNs.Config.epsilon * napeNs.Config.epsilon)) {
        const d = vrnx * vrnx + vrny * vrny;
        const imag = 1.0 / Math.sqrt(d);
        this.nx = vrnx * imag;
        this.ny = vrny * imag;
      }

      // Linear viscosity
      let tViscosity1 = 0.0;
      if (this.ws1.fluidEnabled) {
        const f = (-this.ws1.fluidProperties.viscosity * this.overlap) / this.ws2.area;
        if (this.ws2.type == 0) {
          tViscosity1 -=
            (f * this.ws2.circle.radius * napeNs.Config.fluidLinearDrag) /
            (2 * this.ws2.circle.radius * Math.PI);
        } else {
          const poly = this.ws2.polygon;
          let bord = 0.0;
          let acc = 0.0;
          let cx_ite = poly.edges.head;
          while (cx_ite != null) {
            const ex = cx_ite.elt;
            bord += ex.length;
            let fact = f * ex.length * (ex.gnormx * this.nx + ex.gnormy * this.ny);
            if (fact > 0) {
              fact *= -napeNs.Config.fluidVacuumDrag;
            }
            acc -= fact * 0.5 * napeNs.Config.fluidLinearDrag;
            cx_ite = cx_ite.next;
          }
          tViscosity1 += acc / bord;
        }
      }
      if (this.ws2.fluidEnabled) {
        const f = (-this.ws2.fluidProperties.viscosity * this.overlap) / this.ws1.area;
        if (this.ws1.type == 0) {
          tViscosity1 -=
            (f * this.ws1.circle.radius * napeNs.Config.fluidLinearDrag) /
            (2 * this.ws1.circle.radius * Math.PI);
        } else {
          const poly = this.ws1.polygon;
          let bord = 0.0;
          let acc = 0.0;
          let cx_ite = poly.edges.head;
          while (cx_ite != null) {
            const ex = cx_ite.elt;
            bord += ex.length;
            let fact = f * ex.length * (ex.gnormx * this.nx + ex.gnormy * this.ny);
            if (fact > 0) {
              fact *= -napeNs.Config.fluidVacuumDrag;
            }
            acc -= fact * 0.5 * napeNs.Config.fluidLinearDrag;
            cx_ite = cx_ite.next;
          }
          tViscosity1 += acc / bord;
        }
      }

      if (tViscosity1 != 0) {
        const m = this.b1.smass + this.b2.smass;
        let Ka = m;
        let Kb = 0;
        let Kc = m;

        if (this.b1.sinertia != 0) {
          const X = this.r1x * this.b1.sinertia;
          const Y = this.r1y * this.b1.sinertia;
          Ka += Y * this.r1y;
          Kb += -Y * this.r1x;
          Kc += X * this.r1x;
        }
        if (this.b2.sinertia != 0) {
          const X = this.r2x * this.b2.sinertia;
          const Y = this.r2y * this.b2.sinertia;
          Ka += Y * this.r2y;
          Kb += -Y * this.r2x;
          Kc += X * this.r2x;
        }

        const det = Ka * Kc - Kb * Kb;
        if (det !== det) {
          // NaN
          Kc = 0;
          Kb = Kc;
          Ka = Kb;
        } else if (det == 0) {
          if (Ka != 0) {
            Ka = 1 / Ka;
          } else {
            Ka = 0;
          }
          if (Kc != 0) {
            Kc = 1 / Kc;
          } else {
            Kc = 0;
          }
          Kb = 0;
        } else {
          const invDet = 1 / det;
          const t = Kc * invDet;
          Kc = Ka * invDet;
          Ka = t;
          Kb *= -invDet;
        }

        this.vMassa = Ka;
        this.vMassb = Kb;
        this.vMassc = Kc;

        const omega1 = 2 * Math.PI * tViscosity1;
        this.lgamma = 1 / (dt * omega1 * (2 + omega1 * dt));
        const ig1 = 1 / (1 + this.lgamma);
        this.lgamma *= ig1;
        this.vMassa *= ig1;
        this.vMassb *= ig1;
        this.vMassc *= ig1;
      } else {
        this.vMassa = 0;
        this.vMassb = 0;
        this.vMassc = 0;
        this.lgamma = 0.0;
      }
    }

    // Warm-start scaling
    this.dampx *= dtratio;
    this.dampy *= dtratio;
    this.adamp *= dtratio;
  }

  // ========== Warm start ==========

  warmStart(): void {
    this.b1.velx -= this.dampx * this.b1.imass;
    this.b1.vely -= this.dampy * this.b1.imass;
    this.b2.velx += this.dampx * this.b2.imass;
    this.b2.vely += this.dampy * this.b2.imass;
    this.b1.angvel -=
      this.b1.iinertia * (this.dampy * this.r1x - this.dampx * this.r1y);
    this.b2.angvel +=
      this.b2.iinertia * (this.dampy * this.r2x - this.dampx * this.r2y);
    this.b1.angvel -= this.adamp * this.b1.iinertia;
    this.b2.angvel += this.adamp * this.b2.iinertia;
  }

  // ========== Apply velocity impulse ==========

  applyImpulseVel(): void {
    if (!this.nodrag) {
      const w1 = this.b1.angvel + this.b1.kinangvel;
      const w2 = this.b2.angvel + this.b2.kinangvel;

      let jx =
        this.b1.velx +
        this.b1.kinvelx -
        this.r1y * w1 -
        (this.b2.velx + this.b2.kinvelx - this.r2y * w2);
      let jy =
        this.b1.vely +
        this.b1.kinvely +
        this.r1x * w1 -
        (this.b2.vely + this.b2.kinvely + this.r2x * w2);

      const t = this.vMassa * jx + this.vMassb * jy;
      jy = this.vMassb * jx + this.vMassc * jy;
      jx = t;

      jx -= this.dampx * this.lgamma;
      jy -= this.dampy * this.lgamma;

      this.dampx += jx;
      this.dampy += jy;

      this.b1.velx -= jx * this.b1.imass;
      this.b1.vely -= jy * this.b1.imass;
      this.b2.velx += jx * this.b2.imass;
      this.b2.vely += jy * this.b2.imass;
      this.b1.angvel -= this.b1.iinertia * (jy * this.r1x - jx * this.r1y);
      this.b2.angvel += this.b2.iinertia * (jy * this.r2x - jx * this.r2y);

      const j_damp = (w1 - w2) * this.wMass - this.adamp * this.agamma;
      this.adamp += j_damp;
      this.b1.angvel -= j_damp * this.b1.iinertia;
      this.b2.angvel += j_damp * this.b2.iinertia;
    }
  }
}
