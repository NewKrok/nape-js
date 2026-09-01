import { ZNPList_ZPP_Arbiter, ZNPNode_ZPP_Arbiter } from "../util/ZNPRegistry";
/**
 * ZPP_CallbackSet — Internal callback set for tracking interactor pair state.
 *
 * Tracks interaction state (COLLISION, SENSOR, FLUID) between two interactors.
 * Maintains a list of arbiters and acts as an intrusive linked list node.
 * Used by ZPP_Space to manage callback state across simulation steps.
 *
 * Converted from nape-compiled.js lines 33586–34153.
 */

export class ZPP_CallbackSet {
  // --- Static: Haxe metadata ---

  // --- Static: object pool ---
  static zpp_pool: ZPP_CallbackSet | null = null;

  // --- Static: namespace references ---
  static _zpp: any = null;

  // --- Instance: pair identification ---
  id = 0;
  di = 0;
  int1: any = null; // ZPP_Interactor — circular
  int2: any = null; // ZPP_Interactor — circular

  // --- Instance: arbiter list ---
  arbiters: any = null; // ZNPList_ZPP_Arbiter — dynamic class

  // --- Instance: interaction state ---
  COLLISIONstate: number | null = null;
  COLLISIONstamp: number | null = null;
  SENSORstate: number | null = null;
  SENSORstamp: number | null = null;
  FLUIDstate: number | null = null;
  FLUIDstamp: number | null = null;

  // --- Instance: linked list (ZNPList pattern) ---
  length = 0;
  pushmod = false;
  modified = false;
  _inuse = false;
  next: ZPP_CallbackSet | null = null;

  // --- Instance: lifecycle ---
  freed = false;
  lazydel = false;

  constructor() {
    this.arbiters = new ZNPList_ZPP_Arbiter();
  }

  // ========== Static factory ==========

  static get(i1: any, i2: any): ZPP_CallbackSet {
    let ret: ZPP_CallbackSet;
    if (ZPP_CallbackSet.zpp_pool == null) {
      ret = new ZPP_CallbackSet();
    } else {
      ret = ZPP_CallbackSet.zpp_pool;
      ZPP_CallbackSet.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.freed = false;
    ret.lazydel = false;
    ret.COLLISIONstate = 1;
    ret.COLLISIONstamp = 0;
    ret.SENSORstate = 1;
    ret.SENSORstamp = 0;
    ret.FLUIDstate = 1;
    ret.FLUIDstamp = 0;
    if (i1.id < i2.id) {
      ret.int1 = i1;
      ret.int2 = i2;
    } else {
      ret.int1 = i2;
      ret.int2 = i1;
    }
    ret.id = ret.int1.id;
    ret.di = ret.int2.id;
    return ret;
  }

  // ========== Linked list methods (ZNPList pattern) ==========

  pop(): void {
    const ret = this.next!;
    this.next = ret.next;
    ret._inuse = false;
    if (this.next == null) {
      this.pushmod = true;
    }
    this.modified = true;
    this.length--;
  }

  pop_unsafe(): ZPP_CallbackSet {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  // ========== Arbiter management ==========

  remove_arb(x: any): void {
    const _this = this.arbiters;
    let pre: any = null;
    let cur = _this.head;
    while (cur != null) {
      if (cur.elt == x) {
        let old: any;
        let ret1: any;
        if (pre == null) {
          old = _this.head;
          ret1 = old.next;
          _this.head = ret1;
          if (_this.head == null) {
            _this.pushmod = true;
          }
        } else {
          old = pre.next;
          ret1 = old.next;
          pre.next = ret1;
          if (ret1 == null) {
            _this.pushmod = true;
          }
        }
        const o = old;
        o.elt = null;
        const ZNPNode = ZNPNode_ZPP_Arbiter;
        o.next = ZNPNode.zpp_pool;
        ZNPNode.zpp_pool = o;
        _this.modified = true;
        _this.length--;
        _this.pushmod = true;
        break;
      }
      pre = cur;
      cur = cur.next;
    }
  }

  empty_arb(type: number): boolean {
    let retvar = true;
    let cx_ite = this.arbiters.head;
    while (cx_ite != null) {
      const x = cx_ite.elt;
      if ((x.type & type) == 0) {
        cx_ite = cx_ite.next;
        continue;
      } else {
        retvar = false;
        break;
      }
    }
    return retvar;
  }
}
