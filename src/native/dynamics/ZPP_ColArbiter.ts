/**
 * ZPP_ColArbiter — Internal collision arbiter for the nape physics engine.
 *
 * The largest and most complex arbiter subclass. Handles collision contacts,
 * friction/restitution, contact point management, normal vector wrapping,
 * constraint mass matrices, warm-starting, velocity/position impulse solving.
 *
 * Converted from nape-compiled.js lines 30207–31854.
 */

import { ZPP_Arbiter } from "./ZPP_Arbiter";
import { ZPP_Contact } from "./ZPP_Contact";
import { ZPP_IContact } from "./ZPP_IContact";

type Any = any;

export class ZPP_ColArbiter extends ZPP_Arbiter {
  // --- Static: Haxe metadata ---
  static override __name__ = ["zpp_nape", "dynamics", "ZPP_ColArbiter"];
  static __super__ = ZPP_Arbiter;

  // --- Static: face type constants ---
  static FACE1 = 0;
  static FACE2 = 1;
  static CIRCLE = 2;

  // --- Static: object pool ---
  static zpp_pool: ZPP_ColArbiter | null = null;

  // --- Instance: outer wrapper reference ---
  outer_zn: Any = null;

  // --- Instance: friction/restitution properties ---
  dyn_fric = 0.0;
  stat_fric = 0.0;
  restitution = 0.0;
  rfric = 0.0;
  userdef_dyn_fric = false;
  userdef_stat_fric = false;
  userdef_restitution = false;
  userdef_rfric = false;

  // --- Instance: shape references ---
  s1: Any = null;
  s2: Any = null;

  // --- Instance: contact list (ZPP_Contact sentinel) ---
  contacts: ZPP_Contact;

  // --- Instance: contacts wrapper ---
  wrap_contacts: Any = null;

  // --- Instance: inner contact list (ZPP_IContact sentinel) ---
  innards: ZPP_IContact;

  // --- Instance: collision normal ---
  nx = 0.0;
  ny = 0.0;

  // --- Instance: normal wrapper ---
  wrap_normal: Any = null;

  // --- Instance: mass matrix ---
  kMassa = 0.0;
  kMassb = 0.0;
  kMassc = 0.0;
  Ka = 0.0;
  Kb = 0.0;
  Kc = 0.0;

  // --- Instance: rolling friction ---
  rMass = 0.0;
  jrAcc = 0.0;

  // --- Instance: contact arm projections ---
  rn1a = 0.0;
  rt1a = 0.0;
  rn1b = 0.0;
  rt1b = 0.0;
  rn2a = 0.0;
  rt2a = 0.0;
  rn2b = 0.0;
  rt2b = 0.0;

  // --- Instance: kinematic velocity offsets ---
  k1x = 0.0;
  k1y = 0.0;
  k2x = 0.0;
  k2y = 0.0;

  // --- Instance: surface velocity ---
  surfacex = 0.0;
  surfacey = 0.0;

  // --- Instance: collision geometry ---
  ptype: Any = null;
  lnormx = 0.0;
  lnormy = 0.0;
  lproj = 0.0;
  radius = 0.0;
  rev = false;
  biasCoef = 0.0;

  // --- Instance: reference edges ---
  __ref_edge1: Any = null;
  __ref_edge2: Any = null;
  __ref_vertex = 0;

  // --- Instance: contact point cache ---
  c1: Any = null;
  oc1: Any = null;
  c2: Any = null;
  oc2: Any = null;
  hc2 = false;
  hpc2 = false;

  // --- Instance: linked list next (for pool) ---
  declare next: ZPP_ColArbiter | null;

  // --- Instance: state ---
  stat = false;
  mutable = false;
  pre_dt = 0.0;

  // --- Instance: Haxe class reference ---
  override __class__: Any = ZPP_ColArbiter;

  constructor() {
    super();
    this.pre_dt = 0.0;
    this.mutable = false;
    this.stat = false;
    this.next = null;
    this.hpc2 = false;
    this.hc2 = false;
    this.oc2 = null;
    this.c2 = null;
    this.oc1 = null;
    this.c1 = null;
    this.__ref_vertex = 0;
    this.__ref_edge2 = null;
    this.__ref_edge1 = null;
    this.biasCoef = 0.0;
    this.rev = false;
    this.radius = 0.0;
    this.lproj = 0.0;
    this.lnormy = 0.0;
    this.lnormx = 0.0;
    this.surfacey = 0.0;
    this.surfacex = 0.0;
    this.k2y = 0.0;
    this.k2x = 0.0;
    this.k1y = 0.0;
    this.k1x = 0.0;
    this.rt2b = 0.0;
    this.rn2b = 0.0;
    this.rt2a = 0.0;
    this.rn2a = 0.0;
    this.rt1b = 0.0;
    this.rn1b = 0.0;
    this.rt1a = 0.0;
    this.rn1a = 0.0;
    this.jrAcc = 0.0;
    this.rMass = 0.0;
    this.Kc = 0.0;
    this.Kb = 0.0;
    this.Ka = 0.0;
    this.kMassc = 0.0;
    this.kMassb = 0.0;
    this.kMassa = 0.0;
    this.wrap_normal = null;
    this.ny = 0.0;
    this.nx = 0.0;
    this.innards = null as any;
    this.wrap_contacts = null;
    this.contacts = null as any;
    this.s2 = null;
    this.s1 = null;
    this.userdef_rfric = false;
    this.userdef_restitution = false;
    this.userdef_stat_fric = false;
    this.userdef_dyn_fric = false;
    this.rfric = 0.0;
    this.restitution = 0.0;
    this.stat_fric = 0.0;
    this.dyn_fric = 0.0;
    this.outer_zn = null;
    this.pre_dt = -1.0;
    this.contacts = new ZPP_Contact();
    this.innards = new ZPP_IContact();
    this.type = ZPP_Arbiter.COL;
    this.colarb = this;
  }

  // ========== Pool callbacks ==========

  alloc(): void {}

  free(): void {
    this.userdef_dyn_fric = false;
    this.userdef_stat_fric = false;
    this.userdef_restitution = false;
    this.userdef_rfric = false;
    this.__ref_edge1 = this.__ref_edge2 = null;
  }

  // ========== Normal handling ==========

  normal_validate(): void {
    if (this.cleared) {
      throw new Error("Error: Arbiter not currently in use");
    }
    this.wrap_normal.zpp_inner.x = this.nx;
    this.wrap_normal.zpp_inner.y = this.ny;
    if (this.ws1.id > this.ws2.id) {
      this.wrap_normal.zpp_inner.x = -this.wrap_normal.zpp_inner.x;
      this.wrap_normal.zpp_inner.y = -this.wrap_normal.zpp_inner.y;
    }
  }

  getnormal(): void {
    const zpp = ZPP_Arbiter._zpp;
    const napeNs = ZPP_Arbiter._nape;

    const x = 0;
    const y = 0;

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
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
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
    this.wrap_normal = ret;
    this.wrap_normal.zpp_inner._immutable = true;
    this.wrap_normal.zpp_inner._inuse = true;
    this.wrap_normal.zpp_inner._validate = this.normal_validate.bind(this);
  }

  // ========== Contact injection ==========

  injectContact(
    px: number,
    py: number,
    nx: number,
    ny: number,
    dist: number,
    hash: number,
    posOnly: boolean = false,
  ): ZPP_Contact {
    let c: ZPP_Contact | null = null;
    let cx_ite = this.contacts.next;
    while (cx_ite != null) {
      if (hash == cx_ite.hash) {
        c = cx_ite;
        break;
      }
      cx_ite = cx_ite.next;
    }

    if (c == null) {
      if (ZPP_Contact.zpp_pool == null) {
        c = new ZPP_Contact();
      } else {
        c = ZPP_Contact.zpp_pool;
        ZPP_Contact.zpp_pool = c.next;
        c.next = null;
      }
      const ci = c.inner;
      ci.jnAcc = ci.jtAcc = 0;
      c.hash = hash;
      c.fresh = true;
      c.arbiter = this;
      this.jrAcc = 0;

      // Add to contacts list
      c._inuse = true;
      c.next = this.contacts.next;
      this.contacts.next = c;
      this.contacts.modified = true;
      this.contacts.length++;

      this.innards.add(ci);
    } else {
      c.fresh = false;
    }

    c.px = px;
    c.py = py;
    this.nx = nx;
    this.ny = ny;
    c.dist = dist;
    c.stamp = this.stamp;
    c.posOnly = posOnly;
    return c;
  }

  // ========== Assign ==========

  assign(s1: Any, s2: Any, id: number, di: number): void {
    this.sup_assign(s1, s2, id, di);
    this.s1 = s1;
    this.s2 = s2;
    this._calcFrictionRestitution();
  }

  // ========== Material property calculations ==========

  calcProperties(): void {
    this._calcFrictionRestitution();
  }

  validate_props(): void {
    if (this.invalidated) {
      this.invalidated = false;
      this._calcFrictionRestitution();
    }
  }

  private _calcFrictionRestitution(): void {
    if (!this.userdef_restitution) {
      if (
        this.s1.material.elasticity <= -Infinity ||
        this.s2.material.elasticity <= -Infinity
      ) {
        this.restitution = 0;
      } else if (
        this.s1.material.elasticity >= Infinity ||
        this.s2.material.elasticity >= Infinity
      ) {
        this.restitution = 1;
      } else {
        this.restitution =
          (this.s1.material.elasticity + this.s2.material.elasticity) / 2;
      }
      if (this.restitution < 0) this.restitution = 0;
      if (this.restitution > 1) this.restitution = 1;
    }
    if (!this.userdef_dyn_fric) {
      this.dyn_fric = Math.sqrt(
        this.s1.material.dynamicFriction * this.s2.material.dynamicFriction,
      );
    }
    if (!this.userdef_stat_fric) {
      this.stat_fric = Math.sqrt(
        this.s1.material.staticFriction * this.s2.material.staticFriction,
      );
    }
    if (!this.userdef_rfric) {
      this.rfric = Math.sqrt(
        this.s1.material.rollingFriction * this.s2.material.rollingFriction,
      );
    }
  }

  // ========== Retire ==========

  retire(): void {
    this.sup_retire();

    // Clean up contacts
    while (this.contacts.next != null) {
      const ret = this.contacts.next;
      this.contacts.pop();
      ret.arbiter = null;
      ret.next = ZPP_Contact.zpp_pool;
      ZPP_Contact.zpp_pool = ret;

      const ret2 = this.innards.next!;
      this.innards.next = ret2.next;
      ret2._inuse = false;
      if (this.innards.next == null) {
        this.innards.pushmod = true;
      }
      this.innards.modified = true;
      this.innards.length--;
    }

    // Free and return to pool
    this.free();
    this.next = ZPP_ColArbiter.zpp_pool;
    ZPP_ColArbiter.zpp_pool = this;
    this.pre_dt = -1.0;
  }

  // ========== Mutability ==========

  makemutable(): void {
    this.mutable = true;
    if (this.wrap_normal != null) {
      this.wrap_normal.zpp_inner._immutable = false;
    }
    if (this.wrap_contacts != null) {
      this.wrap_contacts.zpp_inner.immutable = false;
    }
  }

  makeimmutable(): void {
    this.mutable = false;
    if (this.wrap_normal != null) {
      this.wrap_normal.zpp_inner._immutable = true;
    }
    if (this.wrap_contacts != null) {
      this.wrap_contacts.zpp_inner.immutable = true;
    }
  }

  // ========== Contact list management ==========

  contacts_adder(_x: Any): void {
    throw new Error(
      "Error: Cannot add new contacts, information required is far too specific and detailed :)",
    );
  }

  contacts_subber(x: Any): void {
    let pre: ZPP_Contact | null = null;
    let prei: ZPP_IContact | null = null;
    let cx_itei: ZPP_IContact | null = this.innards.next;
    let cx_ite: ZPP_Contact | null = this.contacts.next;
    while (cx_ite != null) {
      if (cx_ite == x.zpp_inner) {
        this.contacts.erase(pre);
        this.innards.erase(prei);
        cx_ite.arbiter = null;
        cx_ite.next = ZPP_Contact.zpp_pool;
        ZPP_Contact.zpp_pool = cx_ite;
        break;
      }
      pre = cx_ite;
      prei = cx_itei;
      cx_itei = cx_itei!.next;
      cx_ite = cx_ite.next;
    }
  }

  setupcontacts(): void {
    const zpp = ZPP_Arbiter._zpp;
    this.wrap_contacts = zpp.util.ZPP_ContactList.get(this.contacts, true);
    this.wrap_contacts.zpp_inner.immutable = !this.mutable;
    this.wrap_contacts.zpp_inner.adder = this.contacts_adder.bind(this);
    this.wrap_contacts.zpp_inner.dontremove = true;
    this.wrap_contacts.zpp_inner.subber = this.contacts_subber.bind(this);
  }

  // ========== Cleanup expired contacts ==========

  cleanupContacts(): boolean {
    const napeNs = ZPP_Arbiter._nape;
    let fst = true;
    let pre: ZPP_Contact | null = null;
    let prei: ZPP_IContact | null = null;
    let cx_itei: ZPP_IContact | null = this.innards.next;
    this.hc2 = false;
    let cx_ite: ZPP_Contact | null = this.contacts.next;

    while (cx_ite != null) {
      const c = cx_ite;
      if (c.stamp + napeNs.Config.arbiterExpirationDelay < this.stamp) {
        // Expire contact
        const ret = ZPP_ColArbiter._eraseFromList(this.contacts, pre);
        cx_ite = ret;
        const ret1 = ZPP_ColArbiter._eraseFromList(this.innards, prei) as any;
        cx_itei = ret1;
        c.arbiter = null;
        c.next = ZPP_Contact.zpp_pool;
        ZPP_Contact.zpp_pool = c;
        continue;
      }

      const ci = c.inner;
      const pact = c.active;
      c.active = c.stamp == this.stamp;
      if (c.active) {
        if (fst) {
          fst = false;
          this.c1 = ci;
          this.oc1 = c;
        } else {
          this.hc2 = true;
          this.c2 = ci;
          this.oc2 = c;
        }
      }
      if (pact != c.active) {
        this.contacts.modified = true;
      }
      pre = cx_ite;
      prei = cx_itei;
      cx_itei = cx_itei!.next;
      cx_ite = cx_ite.next;
    }

    if (this.hc2) {
      this.hpc2 = true;
      if (this.oc1.posOnly) {
        let tmp = this.c1;
        this.c1 = this.c2;
        this.c2 = tmp;
        tmp = this.oc1;
        this.oc1 = this.oc2;
        this.oc2 = tmp;
        this.hc2 = false;
      } else if (this.oc2.posOnly) {
        this.hc2 = false;
      }
      if (this.oc1.posOnly) {
        fst = true;
      }
    } else {
      this.hpc2 = false;
    }
    return fst;
  }

  // ========== Pre-step (physics solver) ==========

  preStep(dt: number): boolean {
    const napeNs = ZPP_Arbiter._nape;

    this.validate_props();

    if (this.pre_dt == -1.0) {
      this.pre_dt = dt;
    }
    const dtratio = dt / this.pre_dt;
    this.pre_dt = dt;
    const mass_sum = this.b1.smass + this.b2.smass;
    this.hc2 = false;
    let fst = true;
    const statType = this.b1.type != 2 || this.b2.type != 2;
    const bias = statType
      ? this.continuous
        ? napeNs.Config.contactContinuousStaticBiasCoef
        : napeNs.Config.contactStaticBiasCoef
      : this.continuous
        ? napeNs.Config.contactContinuousBiasCoef
        : napeNs.Config.contactBiasCoef;
    this.biasCoef = bias;
    this.continuous = false;

    // Contact iteration with expiration
    let pre: ZPP_Contact | null = null;
    let prei: ZPP_IContact | null = null;
    let cx_itei: ZPP_IContact | null = this.innards.next;
    let cx_ite: ZPP_Contact | null = this.contacts.next;

    while (cx_ite != null) {
      const c = cx_ite;
      if (c.stamp + napeNs.Config.arbiterExpirationDelay < this.stamp) {
        const ret = ZPP_ColArbiter._eraseFromList(this.contacts, pre);
        cx_ite = ret;
        const ret1 = ZPP_ColArbiter._eraseFromList(this.innards, prei) as any;
        cx_itei = ret1;
        c.arbiter = null;
        c.next = ZPP_Contact.zpp_pool;
        ZPP_Contact.zpp_pool = c;
        continue;
      }

      const ci = c.inner;
      const pact = c.active;
      c.active = c.stamp == this.stamp;

      if (c.active) {
        if (fst) {
          fst = false;
          this.c1 = ci;
          this.oc1 = c;
        } else {
          this.hc2 = true;
          this.c2 = ci;
          this.oc2 = c;
        }

        ci.r2x = c.px - this.b2.posx;
        ci.r2y = c.py - this.b2.posy;
        ci.r1x = c.px - this.b1.posx;
        ci.r1y = c.py - this.b1.posy;

        // Tangent effective mass
        let x = ci.r2x * this.nx + ci.r2y * this.ny;
        let kt = mass_sum + this.b2.sinertia * (x * x);
        x = ci.r1x * this.nx + ci.r1y * this.ny;
        kt += this.b1.sinertia * (x * x);
        ci.tMass =
          kt < napeNs.Config.epsilon * napeNs.Config.epsilon ? 0 : 1.0 / kt;

        // Normal effective mass
        x = this.ny * ci.r2x - this.nx * ci.r2y;
        let nt = mass_sum + this.b2.sinertia * (x * x);
        x = this.ny * ci.r1x - this.nx * ci.r1y;
        nt += this.b1.sinertia * (x * x);
        ci.nMass =
          nt < napeNs.Config.epsilon * napeNs.Config.epsilon ? 0 : 1.0 / nt;

        // Bounce velocity
        let vrx = 0.0;
        let vry = 0.0;
        let ang = this.b2.angvel + this.b2.kinangvel;
        vrx = this.b2.velx + this.b2.kinvelx - ci.r2y * ang;
        vry = this.b2.vely + this.b2.kinvely + ci.r2x * ang;
        ang = this.b1.angvel + this.b1.kinangvel;
        vrx -= this.b1.velx + this.b1.kinvelx - ci.r1y * ang;
        vry -= this.b1.vely + this.b1.kinvely + ci.r1x * ang;

        const vdot = this.nx * vrx + this.ny * vry;
        c.elasticity = this.restitution;
        ci.bounce = vdot * c.elasticity;
        if (ci.bounce > -napeNs.Config.elasticThreshold) {
          ci.bounce = 0;
        }

        // Friction selection
        const vdotT = vry * this.nx - vrx * this.ny;
        const thr = napeNs.Config.staticFrictionThreshold;
        if (vdotT * vdotT > thr * thr) {
          ci.friction = this.dyn_fric;
        } else {
          ci.friction = this.stat_fric;
        }

        ci.jnAcc *= dtratio;
        ci.jtAcc *= dtratio;
      }

      if (pact != c.active) {
        this.contacts.modified = true;
      }
      pre = cx_ite;
      prei = cx_itei;
      cx_itei = cx_itei!.next;
      cx_ite = cx_ite.next;
    }

    // Handle 2-contact case
    if (this.hc2) {
      this.hpc2 = true;
      if (this.oc1.posOnly) {
        let tmp = this.c1;
        this.c1 = this.c2;
        this.c2 = tmp;
        tmp = this.oc1;
        this.oc1 = this.oc2;
        this.oc2 = tmp;
        this.hc2 = false;
      } else if (this.oc2.posOnly) {
        this.hc2 = false;
      }
      if (this.oc1.posOnly) {
        fst = true;
      }
    } else {
      this.hpc2 = false;
    }

    this.jrAcc *= dtratio;

    if (!fst) {
      this.rn1a = this.ny * this.c1.r1x - this.nx * this.c1.r1y;
      this.rt1a = this.c1.r1x * this.nx + this.c1.r1y * this.ny;
      this.rn1b = this.ny * this.c1.r2x - this.nx * this.c1.r2y;
      this.rt1b = this.c1.r2x * this.nx + this.c1.r2y * this.ny;
      this.k1x =
        this.b2.kinvelx -
        this.c1.r2y * this.b2.kinangvel -
        (this.b1.kinvelx - this.c1.r1y * this.b1.kinangvel);
      this.k1y =
        this.b2.kinvely +
        this.c1.r2x * this.b2.kinangvel -
        (this.b1.kinvely + this.c1.r1x * this.b1.kinangvel);
    }

    if (this.hc2) {
      this.rn2a = this.ny * this.c2.r1x - this.nx * this.c2.r1y;
      this.rt2a = this.c2.r1x * this.nx + this.c2.r1y * this.ny;
      this.rn2b = this.ny * this.c2.r2x - this.nx * this.c2.r2y;
      this.rt2b = this.c2.r2x * this.nx + this.c2.r2y * this.ny;
      this.k2x =
        this.b2.kinvelx -
        this.c2.r2y * this.b2.kinangvel -
        (this.b1.kinvelx - this.c2.r1y * this.b1.kinangvel);
      this.k2y =
        this.b2.kinvely +
        this.c2.r2x * this.b2.kinangvel -
        (this.b1.kinvely + this.c2.r1x * this.b1.kinangvel);

      // 2x2 mass matrix
      this.kMassa =
        mass_sum +
        this.b1.sinertia * this.rn1a * this.rn1a +
        this.b2.sinertia * this.rn1b * this.rn1b;
      this.kMassb =
        mass_sum +
        this.b1.sinertia * this.rn1a * this.rn2a +
        this.b2.sinertia * this.rn1b * this.rn2b;
      this.kMassc =
        mass_sum +
        this.b1.sinertia * this.rn2a * this.rn2a +
        this.b2.sinertia * this.rn2b * this.rn2b;

      const norm =
        this.kMassa * this.kMassa +
        2 * this.kMassb * this.kMassb +
        this.kMassc * this.kMassc;

      if (
        norm <
        napeNs.Config.illConditionedThreshold *
          (this.kMassa * this.kMassc - this.kMassb * this.kMassb)
      ) {
        this.Ka = this.kMassa;
        this.Kb = this.kMassb;
        this.Kc = this.kMassc;
        // Invert 2x2 matrix
        const det = this.kMassa * this.kMassc - this.kMassb * this.kMassb;
        if (det !== det) {
          // NaN
          this.kMassa = this.kMassb = this.kMassc = 0;
        } else if (det == 0) {
          if (this.kMassa != 0) {
            this.kMassa = 1 / this.kMassa;
          } else {
            this.kMassa = 0;
          }
          if (this.kMassc != 0) {
            this.kMassc = 1 / this.kMassc;
          } else {
            this.kMassc = 0;
          }
          this.kMassb = 0;
        } else {
          const invDet = 1 / det;
          const t = this.kMassc * invDet;
          this.kMassc = this.kMassa * invDet;
          this.kMassa = t;
          this.kMassb *= -invDet;
        }
      } else {
        this.hc2 = false;
        if (this.oc2.dist < this.oc1.dist) {
          const t = this.c1;
          this.c1 = this.c2;
          this.c2 = t;
        }
        this.oc2.active = false;
        this.contacts.modified = true;
      }
    }

    // Surface velocity
    this.surfacex = this.b2.svelx;
    this.surfacey = this.b2.svely;
    this.surfacex += this.b1.svelx;
    this.surfacey += this.b1.svely;
    this.surfacex = -this.surfacex;
    this.surfacey = -this.surfacey;

    // Rolling mass
    this.rMass = this.b1.sinertia + this.b2.sinertia;
    if (this.rMass != 0) {
      this.rMass = 1 / this.rMass;
    }

    return fst;
  }

  // ========== Warm start ==========

  warmStart(): void {
    let jx = this.nx * this.c1.jnAcc - this.ny * this.c1.jtAcc;
    let jy = this.ny * this.c1.jnAcc + this.nx * this.c1.jtAcc;
    this.b1.velx -= jx * this.b1.imass;
    this.b1.vely -= jy * this.b1.imass;
    this.b1.angvel -= this.b1.iinertia * (jy * this.c1.r1x - jx * this.c1.r1y);
    this.b2.velx += jx * this.b2.imass;
    this.b2.vely += jy * this.b2.imass;
    this.b2.angvel += this.b2.iinertia * (jy * this.c1.r2x - jx * this.c1.r2y);

    if (this.hc2) {
      jx = this.nx * this.c2.jnAcc - this.ny * this.c2.jtAcc;
      jy = this.ny * this.c2.jnAcc + this.nx * this.c2.jtAcc;
      this.b1.velx -= jx * this.b1.imass;
      this.b1.vely -= jy * this.b1.imass;
      this.b1.angvel -= this.b1.iinertia * (jy * this.c2.r1x - jx * this.c2.r1y);
      this.b2.velx += jx * this.b2.imass;
      this.b2.vely += jy * this.b2.imass;
      this.b2.angvel += this.b2.iinertia * (jy * this.c2.r2x - jx * this.c2.r2y);
    }

    this.b2.angvel += this.jrAcc * this.b2.iinertia;
    this.b1.angvel -= this.jrAcc * this.b1.iinertia;
  }

  // ========== Velocity impulse solver ==========

  applyImpulseVel(): void {
    const napeNs = ZPP_Arbiter._nape;

    let v1x =
      this.k1x +
      this.b2.velx -
      this.c1.r2y * this.b2.angvel -
      (this.b1.velx - this.c1.r1y * this.b1.angvel);
    let v1y =
      this.k1y +
      this.b2.vely +
      this.c1.r2x * this.b2.angvel -
      (this.b1.vely + this.c1.r1x * this.b1.angvel);

    // Tangent friction for contact 1
    let j = (v1y * this.nx - v1x * this.ny + this.surfacex) * this.c1.tMass;
    let jMax = this.c1.friction * this.c1.jnAcc;
    let jOld = this.c1.jtAcc;
    let cjAcc = jOld - j;
    if (cjAcc > jMax) cjAcc = jMax;
    else if (cjAcc < -jMax) cjAcc = -jMax;
    j = cjAcc - jOld;
    this.c1.jtAcc = cjAcc;

    let jx = -this.ny * j;
    let jy = this.nx * j;
    this.b2.velx += jx * this.b2.imass;
    this.b2.vely += jy * this.b2.imass;
    this.b1.velx -= jx * this.b1.imass;
    this.b1.vely -= jy * this.b1.imass;
    this.b2.angvel += this.rt1b * j * this.b2.iinertia;
    this.b1.angvel -= this.rt1a * j * this.b1.iinertia;

    if (this.hc2) {
      // Two-contact block solver
      let v2x =
        this.k2x +
        this.b2.velx -
        this.c2.r2y * this.b2.angvel -
        (this.b1.velx - this.c2.r1y * this.b1.angvel);
      let v2y =
        this.k2y +
        this.b2.vely +
        this.c2.r2x * this.b2.angvel -
        (this.b1.vely + this.c2.r1x * this.b1.angvel);

      // Tangent friction for contact 2
      j = (v2y * this.nx - v2x * this.ny + this.surfacex) * this.c2.tMass;
      jMax = this.c2.friction * this.c2.jnAcc;
      jOld = this.c2.jtAcc;
      cjAcc = jOld - j;
      if (cjAcc > jMax) cjAcc = jMax;
      else if (cjAcc < -jMax) cjAcc = -jMax;
      j = cjAcc - jOld;
      this.c2.jtAcc = cjAcc;

      jx = -this.ny * j;
      jy = this.nx * j;
      this.b2.velx += jx * this.b2.imass;
      this.b2.vely += jy * this.b2.imass;
      this.b1.velx -= jx * this.b1.imass;
      this.b1.vely -= jy * this.b1.imass;
      this.b2.angvel += this.rt2b * j * this.b2.iinertia;
      this.b1.angvel -= this.rt2a * j * this.b1.iinertia;

      // Recompute relative velocities
      v1x =
        this.k1x +
        this.b2.velx -
        this.c1.r2y * this.b2.angvel -
        (this.b1.velx - this.c1.r1y * this.b1.angvel);
      v1y =
        this.k1y +
        this.b2.vely +
        this.c1.r2x * this.b2.angvel -
        (this.b1.vely + this.c1.r1x * this.b1.angvel);
      v2x =
        this.k2x +
        this.b2.velx -
        this.c2.r2y * this.b2.angvel -
        (this.b1.velx - this.c2.r1y * this.b1.angvel);
      v2y =
        this.k2y +
        this.b2.vely +
        this.c2.r2x * this.b2.angvel -
        (this.b1.vely + this.c2.r1x * this.b1.angvel);

      // 2-contact normal solver (block solver)
      const ax = this.c1.jnAcc;
      const ay = this.c2.jnAcc;
      let jnx =
        v1x * this.nx +
        v1y * this.ny +
        this.surfacey +
        this.c1.bounce -
        (this.Ka * ax + this.Kb * ay);
      let jny =
        v2x * this.nx +
        v2y * this.ny +
        this.surfacey +
        this.c2.bounce -
        (this.Kb * ax + this.Kc * ay);

      let xx = -(this.kMassa * jnx + this.kMassb * jny);
      let xy = -(this.kMassb * jnx + this.kMassc * jny);

      if (xx >= 0 && xy >= 0) {
        jnx = xx - ax;
        jny = xy - ay;
        this.c1.jnAcc = xx;
        this.c2.jnAcc = xy;
      } else {
        xx = -this.c1.nMass * jnx;
        if (xx >= 0 && this.Kb * xx + jny >= 0) {
          jnx = xx - ax;
          jny = -ay;
          this.c1.jnAcc = xx;
          this.c2.jnAcc = 0;
        } else {
          xy = -this.c2.nMass * jny;
          if (xy >= 0 && this.Kb * xy + jnx >= 0) {
            jnx = -ax;
            jny = xy - ay;
            this.c1.jnAcc = 0;
            this.c2.jnAcc = xy;
          } else if (jnx >= 0 && jny >= 0) {
            jnx = -ax;
            jny = -ay;
            this.c1.jnAcc = this.c2.jnAcc = 0;
          } else {
            jnx = 0;
            jny = 0;
          }
        }
      }

      j = jnx + jny;
      jx = this.nx * j;
      jy = this.ny * j;
      this.b2.velx += jx * this.b2.imass;
      this.b2.vely += jy * this.b2.imass;
      this.b1.velx -= jx * this.b1.imass;
      this.b1.vely -= jy * this.b1.imass;
      this.b2.angvel += (this.rn1b * jnx + this.rn2b * jny) * this.b2.iinertia;
      this.b1.angvel -= (this.rn1a * jnx + this.rn2a * jny) * this.b1.iinertia;
    } else {
      // Single-contact solver
      if (this.radius != 0.0) {
        // Rolling friction
        const dw = this.b2.angvel - this.b1.angvel;
        j = dw * this.rMass;
        jMax = this.rfric * this.c1.jnAcc;
        jOld = this.jrAcc;
        this.jrAcc -= j;
        if (this.jrAcc > jMax) this.jrAcc = jMax;
        else if (this.jrAcc < -jMax) this.jrAcc = -jMax;
        j = this.jrAcc - jOld;
        this.b2.angvel += j * this.b2.iinertia;
        this.b1.angvel -= j * this.b1.iinertia;
      }

      v1x =
        this.k1x +
        this.b2.velx -
        this.c1.r2y * this.b2.angvel -
        (this.b1.velx - this.c1.r1y * this.b1.angvel);
      v1y =
        this.k1y +
        this.b2.vely +
        this.c1.r2x * this.b2.angvel -
        (this.b1.vely + this.c1.r1x * this.b1.angvel);

      // Normal impulse
      j =
        (this.c1.bounce + (this.nx * v1x + this.ny * v1y) + this.surfacey) *
        this.c1.nMass;
      jOld = this.c1.jnAcc;
      cjAcc = jOld - j;
      if (cjAcc < 0.0) cjAcc = 0.0;
      j = cjAcc - jOld;
      this.c1.jnAcc = cjAcc;

      jx = this.nx * j;
      jy = this.ny * j;
      this.b2.velx += jx * this.b2.imass;
      this.b2.vely += jy * this.b2.imass;
      this.b1.velx -= jx * this.b1.imass;
      this.b1.vely -= jy * this.b1.imass;
      this.b2.angvel += this.rn1b * j * this.b2.iinertia;
      this.b1.angvel -= this.rn1a * j * this.b1.iinertia;
    }
  }

  // ========== Position impulse solver ==========

  applyImpulsePos(): void {
    const napeNs = ZPP_Arbiter._nape;

    if (this.ptype == 2) {
      // Circle-circle
      this._applyImpulsePosCircle(napeNs);
    } else {
      // Edge-based
      this._applyImpulsePosEdge(napeNs);
    }
  }

  private _applyImpulsePosCircle(napeNs: Any): void {
    const c = this.c1;
    let r2x = this.b2.axisy * c.lr2x - this.b2.axisx * c.lr2y;
    let r2y = c.lr2x * this.b2.axisx + c.lr2y * this.b2.axisy;
    r2x += this.b2.posx;
    r2y += this.b2.posy;
    let r1x = this.b1.axisy * c.lr1x - this.b1.axisx * c.lr1y;
    let r1y = c.lr1x * this.b1.axisx + c.lr1y * this.b1.axisy;
    r1x += this.b1.posx;
    r1y += this.b1.posy;

    let dx1 = r2x - r1x;
    let dy1 = r2y - r1y;
    const dl = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const r = this.radius - napeNs.Config.collisionSlop;
    let err = dl - r;

    if (dx1 * this.nx + dy1 * this.ny < 0) {
      dx1 = -dx1;
      dy1 = -dy1;
      err -= this.radius;
    }

    if (err < 0) {
      if (dl < napeNs.Config.epsilon) {
        if (this.b1.smass != 0.0) {
          this.b1.posx += napeNs.Config.epsilon * 10;
        } else {
          this.b2.posx += napeNs.Config.epsilon * 10;
        }
      } else {
        const invDl = 1.0 / dl;
        dx1 *= invDl;
        dy1 *= invDl;
        const px = 0.5 * (r1x + r2x);
        const py = 0.5 * (r1y + r2y);
        const pen = dl - r;
        r1x = px - this.b1.posx;
        r1y = py - this.b1.posy;
        r2x = px - this.b2.posx;
        r2y = py - this.b2.posy;
        const rn1 = dy1 * r1x - dx1 * r1y;
        const rn2 = dy1 * r2x - dx1 * r2y;
        const K =
          this.b2.smass +
          rn2 * rn2 * this.b2.sinertia +
          this.b1.smass +
          rn1 * rn1 * this.b1.sinertia;
        if (K != 0) {
          const jn = (-this.biasCoef * pen) / K;
          const Jx = dx1 * jn;
          const Jy = dy1 * jn;
          this.b1.posx -= Jx * this.b1.imass;
          this.b1.posy -= Jy * this.b1.imass;
          ZPP_ColArbiter._rotateBody(this.b1, -rn1 * this.b1.iinertia * jn);
          this.b2.posx += Jx * this.b2.imass;
          this.b2.posy += Jy * this.b2.imass;
          ZPP_ColArbiter._rotateBody(this.b2, rn2 * this.b2.iinertia * jn);
        }
      }
    }
  }

  private _applyImpulsePosEdge(napeNs: Any): void {
    let gnormx: number;
    let gnormy: number;
    let gproj: number;
    let clip1x: number;
    let clip1y: number;
    let clip2x = 0;
    let clip2y = 0;

    if (this.ptype == 0) {
      gnormx = this.b1.axisy * this.lnormx - this.b1.axisx * this.lnormy;
      gnormy = this.lnormx * this.b1.axisx + this.lnormy * this.b1.axisy;
      gproj = this.lproj + (gnormx * this.b1.posx + gnormy * this.b1.posy);
      clip1x = this.b2.axisy * this.c1.lr1x - this.b2.axisx * this.c1.lr1y;
      clip1y = this.c1.lr1x * this.b2.axisx + this.c1.lr1y * this.b2.axisy;
      clip1x += this.b2.posx;
      clip1y += this.b2.posy;
      if (this.hpc2) {
        clip2x = this.b2.axisy * this.c2.lr1x - this.b2.axisx * this.c2.lr1y;
        clip2y = this.c2.lr1x * this.b2.axisx + this.c2.lr1y * this.b2.axisy;
        clip2x += this.b2.posx;
        clip2y += this.b2.posy;
      }
    } else {
      gnormx = this.b2.axisy * this.lnormx - this.b2.axisx * this.lnormy;
      gnormy = this.lnormx * this.b2.axisx + this.lnormy * this.b2.axisy;
      gproj = this.lproj + (gnormx * this.b2.posx + gnormy * this.b2.posy);
      clip1x = this.b1.axisy * this.c1.lr1x - this.b1.axisx * this.c1.lr1y;
      clip1y = this.c1.lr1x * this.b1.axisx + this.c1.lr1y * this.b1.axisy;
      clip1x += this.b1.posx;
      clip1y += this.b1.posy;
      if (this.hpc2) {
        clip2x = this.b1.axisy * this.c2.lr1x - this.b1.axisx * this.c2.lr1y;
        clip2y = this.c2.lr1x * this.b1.axisx + this.c2.lr1y * this.b1.axisy;
        clip2x += this.b1.posx;
        clip2y += this.b1.posy;
      }
    }

    let err1 = clip1x * gnormx + clip1y * gnormy - gproj - this.radius;
    err1 += napeNs.Config.collisionSlop;
    let err2 = 0.0;
    if (this.hpc2) {
      err2 = clip2x * gnormx + clip2y * gnormy - gproj - this.radius;
      err2 += napeNs.Config.collisionSlop;
    }

    if (err1 < 0 || err2 < 0) {
      if (this.rev) {
        gnormx = -gnormx;
        gnormy = -gnormy;
      }

      const c1r1x = clip1x - this.b1.posx;
      const c1r1y = clip1y - this.b1.posy;
      const c1r2x = clip1x - this.b2.posx;
      const c1r2y = clip1y - this.b2.posy;

      if (this.hpc2) {
        const c2r1x = clip2x - this.b1.posx;
        const c2r1y = clip2y - this.b1.posy;
        const c2r2x = clip2x - this.b2.posx;
        const c2r2y = clip2y - this.b2.posy;
        const rn1a = gnormy * c1r1x - gnormx * c1r1y;
        const rn1b = gnormy * c1r2x - gnormx * c1r2y;
        const rn2a = gnormy * c2r1x - gnormx * c2r1y;
        const rn2b = gnormy * c2r2x - gnormx * c2r2y;
        const mass_sum = this.b1.smass + this.b2.smass;
        this.kMassa =
          mass_sum + this.b1.sinertia * rn1a * rn1a + this.b2.sinertia * rn1b * rn1b;
        this.kMassb =
          mass_sum + this.b1.sinertia * rn1a * rn2a + this.b2.sinertia * rn1b * rn2b;
        this.kMassc =
          mass_sum + this.b1.sinertia * rn2a * rn2a + this.b2.sinertia * rn2b * rn2b;

        const Ka = this.kMassa;
        const Kb = this.kMassb;
        const Kc = this.kMassc;
        const bx = err1 * this.biasCoef;
        const by = err2 * this.biasCoef;

        // Solve 2-contact position
        while (true) {
          let xx = -bx;
          let xy = -by;

          const det = this.kMassa * this.kMassc - this.kMassb * this.kMassb;
          if (det !== det) {
            // NaN
            xx = 0;
            xy = 0;
          } else if (det == 0) {
            if (this.kMassa != 0) xx /= this.kMassa;
            else xx = 0;
            if (this.kMassc != 0) xy /= this.kMassc;
            else xy = 0;
          } else {
            const invDet = 1 / det;
            const t = invDet * (this.kMassc * xx - this.kMassb * xy);
            xy = invDet * (this.kMassa * xy - this.kMassb * xx);
            xx = t;
          }

          if (xx >= 0 && xy >= 0) {
            ZPP_ColArbiter._applyPosImpulse2(
              this.b1, this.b2, gnormx, gnormy, xx, xy, rn1a, rn2a, rn1b, rn2b,
            );
            break;
          }

          xx = -bx / Ka;
          xy = 0;
          if (xx >= 0 && Kb * xx + by >= 0) {
            ZPP_ColArbiter._applyPosImpulse2(
              this.b1, this.b2, gnormx, gnormy, xx, xy, rn1a, rn2a, rn1b, rn2b,
            );
            break;
          }

          xx = 0;
          xy = -by / Kc;
          if (xy >= 0 && Kb * xy + bx >= 0) {
            ZPP_ColArbiter._applyPosImpulse2(
              this.b1, this.b2, gnormx, gnormy, xx, xy, rn1a, rn2a, rn1b, rn2b,
            );
            break;
          }

          break;
        }
      } else {
        // Single contact position correction
        const rn1 = gnormy * c1r1x - gnormx * c1r1y;
        const rn2 = gnormy * c1r2x - gnormx * c1r2y;
        const K =
          this.b2.smass +
          rn2 * rn2 * this.b2.sinertia +
          this.b1.smass +
          rn1 * rn1 * this.b1.sinertia;
        if (K != 0) {
          const jn = (-this.biasCoef * err1) / K;
          const Jx = gnormx * jn;
          const Jy = gnormy * jn;
          this.b1.posx -= Jx * this.b1.imass;
          this.b1.posy -= Jy * this.b1.imass;
          ZPP_ColArbiter._rotateBody(this.b1, -rn1 * this.b1.iinertia * jn);
          this.b2.posx += Jx * this.b2.imass;
          this.b2.posy += Jy * this.b2.imass;
          ZPP_ColArbiter._rotateBody(this.b2, rn2 * this.b2.iinertia * jn);
        }
      }
    }
  }

  // ========== Internal helpers ==========

  /** Erase element after `pre` from a linked list sentinel, return next element */
  private static _eraseFromList(list: Any, pre: Any): Any {
    let old: Any;
    let ret: Any;
    if (pre == null) {
      old = list.next;
      ret = old.next;
      list.next = ret;
      if (list.next == null) {
        list.pushmod = true;
      }
    } else {
      old = pre.next;
      ret = old.next;
      pre.next = ret;
      if (ret == null) {
        list.pushmod = true;
      }
    }
    old._inuse = false;
    list.modified = true;
    list.length--;
    list.pushmod = true;
    return ret;
  }

  /** Rotate body by small angle (with fast approximation for small dr) */
  private static _rotateBody(body: Any, dr: number): void {
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

  /** Apply 2-contact position impulse */
  private static _applyPosImpulse2(
    b1: Any,
    b2: Any,
    gnormx: number,
    gnormy: number,
    xx: number,
    xy: number,
    rn1a: number,
    rn2a: number,
    rn1b: number,
    rn2b: number,
  ): void {
    const t1 = (xx + xy) * b1.imass;
    b1.posx -= gnormx * t1;
    b1.posy -= gnormy * t1;
    ZPP_ColArbiter._rotateBody(b1, -b1.iinertia * (rn1a * xx + rn2a * xy));

    const t2 = (xx + xy) * b2.imass;
    b2.posx += gnormx * t2;
    b2.posy += gnormy * t2;
    ZPP_ColArbiter._rotateBody(b2, b2.iinertia * (rn1b * xx + rn2b * xy));
  }
}
