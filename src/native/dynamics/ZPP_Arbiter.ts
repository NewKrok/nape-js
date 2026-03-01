/**
 * ZPP_Arbiter — Internal arbiter base class for the nape physics engine.
 *
 * Represents an interaction (collision, fluid, or sensor) between two shapes.
 * Manages body arbiter lists, pooled wrapper creation, and state tracking.
 * Subclassed by ZPP_ColArbiter, ZPP_FluidArbiter, and ZPP_SensorArbiter.
 *
 * Converted from nape-compiled.js lines 29044–29362, 80738–80766.
 */

type Any = any;

export class ZPP_Arbiter {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "dynamics", "ZPP_Arbiter"];

  // --- Static: namespace references (set during registration) ---
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Static: creation guard ---
  static internal = false;

  // --- Static: arbiter type constants ---
  static COL = 1;
  static FLUID = 4;
  static SENSOR = 2;

  // --- Static: arbiter type enum lookup (set at init time by compiled code) ---
  static types: Any[] = [];

  // --- Instance: public wrapper ---
  outer: Any = null;

  // --- Instance: hash-next for broadphase hash table ---
  hnext: ZPP_Arbiter | null = null;

  // --- Instance: IDs ---
  id = 0;
  di = 0;

  // --- Instance: stamps ---
  stamp = 0;
  up_stamp = 0;
  sleep_stamp = 0;
  endGenerated = 0;

  // --- Instance: state flags ---
  active = false;
  cleared = false;
  sleeping = false;
  present = 0;
  intchange = false;
  presentable = false;
  continuous = false;
  fresh = false;
  immState = 0;
  invalidated = false;

  // --- Instance: body/shape references ---
  b1: Any = null;
  b2: Any = null;
  ws1: Any = null;
  ws2: Any = null;

  // --- Instance: broadphase pair ---
  pair: Any = null;

  // --- Instance: arbiter type ---
  type = 0;

  // --- Instance: subclass references ---
  colarb: Any = null;
  fluidarb: Any = null;
  sensorarb: Any = null;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_Arbiter;

  constructor() {
    this.sensorarb = null;
    this.fluidarb = null;
    this.colarb = null;
    this.type = 0;
    this.pair = null;
    this.ws2 = null;
    this.ws1 = null;
    this.b2 = null;
    this.b1 = null;
    this.invalidated = false;
    this.immState = 0;
    this.fresh = false;
    this.continuous = false;
    this.presentable = false;
    this.intchange = false;
    this.present = 0;
    this.sleeping = false;
    this.cleared = false;
    this.active = false;
    this.endGenerated = 0;
    this.sleep_stamp = 0;
    this.up_stamp = 0;
    this.stamp = 0;
    this.di = 0;
    this.id = 0;
    this.hnext = null;
    this.outer = null;
  }

  // ========== Wrapper ==========

  wrapper(): Any {
    if (this.outer == null) {
      const nape = ZPP_Arbiter._nape;
      ZPP_Arbiter.internal = true;
      if (this.type == ZPP_Arbiter.COL) {
        this.colarb.outer_zn = new nape.dynamics.CollisionArbiter();
        this.outer = this.colarb.outer_zn;
      } else if (this.type == ZPP_Arbiter.FLUID) {
        this.fluidarb.outer_zn = new nape.dynamics.FluidArbiter();
        this.outer = this.fluidarb.outer_zn;
      } else {
        this.outer = new nape.dynamics.Arbiter();
      }
      this.outer.zpp_inner = this;
      ZPP_Arbiter.internal = false;
    }
    return this.outer;
  }

  // ========== State checks ==========

  inactiveme(): boolean {
    return !this.active;
  }

  acting(): boolean {
    if (this.active) {
      return (this.immState & 1) != 0;
    } else {
      return false;
    }
  }

  // ========== Feature swapping ==========

  swap_features(): void {
    let t: Any = this.b1;
    this.b1 = this.b2;
    this.b2 = t;
    t = this.ws1;
    this.ws1 = this.ws2;
    this.ws2 = t;
    t = this.colarb.s1;
    this.colarb.s1 = this.colarb.s2;
    this.colarb.s2 = t;
  }

  // ========== Lazy retire ==========

  lazyRetire(s: Any, b: Any): void {
    const zpp = ZPP_Arbiter._zpp;
    this.cleared = true;

    if (b == null || this.b2 == b) {
      ZPP_Arbiter._removeFromArbiterList(this.b1.arbiters, this, zpp);
    }
    if (b == null || this.b1 == b) {
      ZPP_Arbiter._removeFromArbiterList(this.b2.arbiters, this, zpp);
    }

    if (this.pair != null) {
      this.pair.arb = null;
      this.pair = null;
    }
    this.active = false;
    s.f_arbiters.modified = true;
  }

  // ========== Base assign (shared by subclasses) ==========

  sup_assign(s1: Any, s2: Any, id: number, di: number): void {
    const zpp = ZPP_Arbiter._zpp;
    this.b1 = s1.body;
    this.ws1 = s1;
    this.b2 = s2.body;
    this.ws2 = s2;
    this.id = id;
    this.di = di;

    ZPP_Arbiter._addToArbiterList(this.b1.arbiters, this, zpp);
    ZPP_Arbiter._addToArbiterList(this.b2.arbiters, this, zpp);

    this.active = true;
    this.present = 0;
    this.cleared = false;
    this.sleeping = false;
    this.fresh = false;
    this.presentable = false;
  }

  // ========== Base retire (shared by subclasses) ==========

  sup_retire(): void {
    const zpp = ZPP_Arbiter._zpp;
    if (!this.cleared) {
      ZPP_Arbiter._removeFromArbiterList(this.b1.arbiters, this, zpp);
      ZPP_Arbiter._removeFromArbiterList(this.b2.arbiters, this, zpp);

      if (this.pair != null) {
        this.pair.arb = null;
        this.pair = null;
      }
    }
    this.b1 = this.b2 = null;
    this.active = false;
    this.intchange = false;
  }

  // ========== Internal list helpers ==========

  /** Remove this arbiter from a ZNPList_ZPP_Arbiter */
  static _removeFromArbiterList(list: Any, arb: ZPP_Arbiter, zpp: Any): void {
    let pre: Any = null;
    let cur: Any = list.head;
    while (cur != null) {
      if (cur.elt == arb) {
        let old: Any;
        let ret: Any;
        if (pre == null) {
          old = list.head;
          ret = old.next;
          list.head = ret;
          if (list.head == null) {
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
        const o = old;
        o.elt = null;
        o.next = zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
        zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o;
        list.modified = true;
        list.length--;
        list.pushmod = true;
        break;
      }
      pre = cur;
      cur = cur.next;
    }
  }

  /** Add this arbiter to a ZNPList_ZPP_Arbiter */
  static _addToArbiterList(list: Any, arb: ZPP_Arbiter, zpp: Any): void {
    let ret: Any;
    if (zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool == null) {
      ret = new zpp.util.ZNPNode_ZPP_Arbiter();
    } else {
      ret = zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
      zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.elt = arb;
    const temp = ret;
    temp.next = list.head;
    list.head = temp;
    list.modified = true;
    list.length++;
  }
}
