/**
 * ZPP_ColArbiter — Internal collision arbiter for the nape physics engine.
 *
 * The largest and most complex arbiter subclass. Handles collision contacts,
 * friction/restitution, contact point management, normal vector wrapping,
 * constraint mass matrices, warm-starting, velocity/position impulse solving.
 */

import { Config } from "../../Config";
import { ZPP_Arbiter } from "./ZPP_Arbiter";
import { ZPP_Contact } from "./ZPP_Contact";
import { ZPP_IContact } from "./ZPP_IContact";

export class ZPP_ColArbiter extends ZPP_Arbiter {
  // --- Static: face type constants ---
  static FACE1 = 0;
  static FACE2 = 1;
  static CIRCLE = 2;

  // --- Static: object pool ---
  static zpp_pool: ZPP_ColArbiter | null = null;

  // --- Instance: outer wrapper reference ---
  outer_zn: any = null;

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
  s1: any = null;
  s2: any = null;

  // --- Instance: contact list (ZPP_Contact sentinel) ---
  contacts: ZPP_Contact;

  // --- Instance: contacts wrapper ---
  wrap_contacts: any = null;

  // --- Instance: inner contact list (ZPP_IContact sentinel) ---
  innards: ZPP_IContact;

  // --- Instance: collision normal ---
  nx = 0.0;
  ny = 0.0;

  // --- Instance: normal wrapper ---
  wrap_normal: any = null;

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
  ptype: number = 0;
  lnormx = 0.0;
  lnormy = 0.0;
  lproj = 0.0;
  radius = 0.0;
  rev = false;
  biasCoef = 0.0;

  // --- Instance: reference edges ---
  __ref_edge1: any = null;
  __ref_edge2: any = null;
  __ref_vertex = 0;

  // --- Instance: separating-axis cache (last separating edge + owning shape) ---
  __sep_edge: any = null;
  __sep_owner: any = null;

  // --- Instance: contact point cache ---
  c1: ZPP_IContact = null as unknown as ZPP_IContact;
  oc1: ZPP_Contact = null as unknown as ZPP_Contact;
  c2: ZPP_IContact = null as unknown as ZPP_IContact;
  oc2: ZPP_Contact = null as unknown as ZPP_Contact;
  hc2 = false;
  hpc2 = false;

  // --- Instance: linked list next (for pool) ---
  declare next: ZPP_ColArbiter | null;

  // --- Instance: state ---
  stat = false;
  mutable = false;
  pre_dt = 0.0;
  constructor() {
    super();
    this.pre_dt = 0.0;
    this.mutable = false;
    this.stat = false;
    this.next = null;
    this.hpc2 = false;
    this.hc2 = false;
    this.oc2 = null!;
    this.c2 = null!;
    this.oc1 = null!;
    this.c1 = null!;
    this.__ref_vertex = 0;
    this.__ref_edge2 = null;
    this.__ref_edge1 = null;
    this.__sep_edge = null;
    this.__sep_owner = null;
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

  free(): void {
    this.userdef_dyn_fric = false;
    this.userdef_stat_fric = false;
    this.userdef_restitution = false;
    this.userdef_rfric = false;
    this.__ref_edge1 = this.__ref_edge2 = null;
    this.__sep_edge = this.__sep_owner = null;
  }

  // ========== Normal handling ==========

  normal_validate(): void {
    if (this.cleared) {
      throw new Error("Arbiter not currently in use");
    }
    this.wrap_normal.zpp_inner.x = this.nx;
    this.wrap_normal.zpp_inner.y = this.ny;
    if (this.ws1.id > this.ws2.id) {
      this.wrap_normal.zpp_inner.x = -this.wrap_normal.zpp_inner.x;
      this.wrap_normal.zpp_inner.y = -this.wrap_normal.zpp_inner.y;
    }
  }

  getnormal(): void {
    const napeNs = ZPP_Arbiter._nape;

    const x = 0;
    const y = 0;

    const ret = napeNs.geom.Vec2.get(x, y);
    this.wrap_normal = ret;
    this.wrap_normal.zpp_inner._immutable = true;
    this.wrap_normal.zpp_inner._inuse = true;
    this.wrap_normal.zpp_inner._validate = this.normal_validate.bind(this);
  }

  // ========== Material property calculations ==========

  validate_props(): void {
    if (this.invalidated) {
      this.invalidated = false;
      this._calcFrictionRestitution();
    }
  }

  /** Recompute combined restitution / friction from both shapes' materials (skips user overrides). */
  _calcFrictionRestitution(): void {
    if (!this.userdef_restitution) {
      if (this.s1.material.elasticity <= -Infinity || this.s2.material.elasticity <= -Infinity) {
        this.restitution = 0;
      } else if (
        this.s1.material.elasticity >= Infinity ||
        this.s2.material.elasticity >= Infinity
      ) {
        this.restitution = 1;
      } else {
        this.restitution = (this.s1.material.elasticity + this.s2.material.elasticity) / 2;
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
      this.stat_fric = Math.sqrt(this.s1.material.staticFriction * this.s2.material.staticFriction);
    }
    if (!this.userdef_rfric) {
      this.rfric = Math.sqrt(this.s1.material.rollingFriction * this.s2.material.rollingFriction);
    }
  }

  // ========== Contact list management ==========

  contacts_adder(_x: any): void {
    throw new Error(
      "Error: Cannot add new contacts, information required is far too specific and detailed :)",
    );
  }

  contacts_subber(x: any): void {
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

  /**
   * Drops contacts that have not been refreshed within
   * `Config.arbiterExpirationDelay` steps, recomputes each remaining contact's
   * `active` flag and re-picks the primary/secondary contact (`c1`/`c2`),
   * preferring a non-position-only contact as `c1`.
   */
  cleanupContacts(): void {
    let fst = true;
    let pre: any = null;
    let prei: any = null;
    let cx_itei: any = this.innards.next;
    this.hc2 = false;
    let cx_ite = this.contacts.next;
    while (cx_ite != null) {
      const c = cx_ite;
      if (c.stamp + Config.arbiterExpirationDelay < this.stamp) {
        const contacts = this.contacts;
        let old: any;
        let ret: any;
        if (pre == null) {
          old = contacts.next;
          ret = old.next;
          contacts.next = ret;
          if (contacts.next == null) {
            contacts.pushmod = true;
          }
        } else {
          old = pre.next;
          ret = old.next;
          pre.next = ret;
          if (ret == null) {
            contacts.pushmod = true;
          }
        }
        old._inuse = false;
        contacts.modified = true;
        contacts.length--;
        contacts.pushmod = true;
        cx_ite = ret;
        const innards = this.innards;
        let oldi: any;
        let reti: any;
        if (prei == null) {
          oldi = innards.next;
          reti = oldi.next;
          innards.next = reti;
          if (innards.next == null) {
            innards.pushmod = true;
          }
        } else {
          oldi = prei.next;
          reti = oldi.next;
          prei.next = reti;
          if (reti == null) {
            innards.pushmod = true;
          }
        }
        oldi._inuse = false;
        innards.modified = true;
        innards.length--;
        innards.pushmod = true;
        cx_itei = reti;
        const o = c;
        o.arbiter = null;
        o.next = ZPP_Contact.zpp_pool;
        ZPP_Contact.zpp_pool = o;
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
      cx_itei = cx_itei.next;
      cx_ite = cx_ite.next;
    }
    if (this.hc2) {
      this.hpc2 = true;
      if (this.oc1.posOnly) {
        const tmp = this.c1;
        this.c1 = this.c2;
        this.c2 = tmp;
        const tmp2 = this.oc1;
        this.oc1 = this.oc2;
        this.oc2 = tmp2;
        this.hc2 = false;
      } else if (this.oc2.posOnly) {
        this.hc2 = false;
      }
    } else {
      this.hpc2 = false;
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
}
