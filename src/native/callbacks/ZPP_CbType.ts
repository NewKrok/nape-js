/**
 * ZPP_CbType — Internal callback type for the nape physics engine.
 *
 * Manages three types of listener lists (interaction, body, constraint)
 * with priority-ordered insertion. Tracks interactors and constraints
 * that use this callback type, and invalidates callback sets on change.
 *
 * Converted from nape-compiled.js lines 48256–48482.
 */

import { ZPP_BodyListener } from "./ZPP_BodyListener";
import { ZPP_ConstraintListener } from "./ZPP_ConstraintListener";
import { ZPP_InteractionListener } from "./ZPP_InteractionListener";

export class ZPP_CbType {
  // --- Static: Haxe metadata ---

  // --- Static: namespace references ---
  static _zpp: any = null;

  // --- Static: ANY_* singleton CbType instances (set by _initEnums) ---
  static ANY_SHAPE: ZPP_CbType | null = null;
  static ANY_BODY: ZPP_CbType | null = null;
  static ANY_COMPOUND: ZPP_CbType | null = null;
  static ANY_CONSTRAINT: ZPP_CbType | null = null;

  /**
   * Initialize ANY_* singleton CbTypes. Called once from compiled factory.
   */
  static _initEnums(nape: any): void {
    ZPP_CbType.ANY_SHAPE = new nape.callbacks.CbType();
    ZPP_CbType.ANY_BODY = new nape.callbacks.CbType();
    ZPP_CbType.ANY_COMPOUND = new nape.callbacks.CbType();
    ZPP_CbType.ANY_CONSTRAINT = new nape.callbacks.CbType();
  }

  // --- Instance ---
  // outer: public CbType wrapper — any (circular import prevention)
  outer: any = null;
  userData: Record<string, unknown> | null = null;
  id = 0;

  // Callback sets that include this type — ZNPList_ZPP_CbSet (dynamic class, any)
  cbsets: any = null;

  // Registered interactors and constraints — ZNPList_ZPP_Interactor/ZNPList_ZPP_Constraint (dynamic, any)
  interactors: any = null;
  wrap_interactors: any = null;
  constraints: any = null;
  wrap_constraints: any = null;

  // Three listener lists (ordered by precedence) — ZNPList_* dynamic classes (any)
  listeners: any = null;
  bodylisteners: any = null;
  conlisteners: any = null;

  constructor() {
    const zpp = ZPP_CbType._zpp;
    this.id = zpp.ZPP_ID.CbType();
    this.listeners = new zpp.util.ZNPList_ZPP_InteractionListener();
    this.bodylisteners = new zpp.util.ZNPList_ZPP_BodyListener();
    this.conlisteners = new zpp.util.ZNPList_ZPP_ConstraintListener();
    this.constraints = new zpp.util.ZNPList_ZPP_Constraint();
    this.interactors = new zpp.util.ZNPList_ZPP_Interactor();
    this.cbsets = new zpp.util.ZNPList_ZPP_CbSet();
  }

  /** Sort comparator by id. */
  static setlt(a: ZPP_CbType, b: ZPP_CbType): boolean {
    return a.id < b.id;
  }

  // ========== Interactor / Constraint registration ==========

  addInteractor(intx: any): void {
    this.interactors.add(intx);
  }

  remInteractor(intx: any): void {
    this.interactors.remove(intx);
  }

  addConstraint(con: any): void {
    this.constraints.add(con);
  }

  remConstraint(con: any): void {
    this.constraints.remove(con);
  }

  // ========== Interaction listeners (priority-ordered) ==========

  addint(x: ZPP_InteractionListener): void {
    const zpp = ZPP_CbType._zpp;
    // Find insertion point by precedence (descending), then id (descending)
    let pre: any = null;
    let cx_ite = this.listeners.head;
    while (cx_ite != null) {
      const j: ZPP_InteractionListener = cx_ite.elt;
      if (x.precedence > j.precedence || (x.precedence === j.precedence && x.id > j.id)) break;
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
    // Insert node from pool
    const list = this.listeners;
    let ret: any;
    if (zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool == null) {
      ret = new zpp.util.ZNPNode_ZPP_InteractionListener();
    } else {
      ret = zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool;
      zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.elt = x;
    if (pre == null) {
      ret.next = list.head;
      list.head = ret;
    } else {
      ret.next = pre.next;
      pre.next = ret;
    }
    list.pushmod = list.modified = true;
    list.length++;
    // Invalidate all callback sets
    let cb_ite = this.cbsets.head;
    while (cb_ite != null) {
      cb_ite.elt.zip_listeners = true;
      cb_ite.elt.invalidate_pairs();
      cb_ite = cb_ite.next;
    }
  }

  removeint(x: ZPP_InteractionListener): void {
    this.listeners.remove(x);
    let cx_ite = this.cbsets.head;
    while (cx_ite != null) {
      cx_ite.elt.zip_listeners = true;
      cx_ite.elt.invalidate_pairs();
      cx_ite = cx_ite.next;
    }
  }

  invalidateint(): void {
    let cx_ite = this.cbsets.head;
    while (cx_ite != null) {
      cx_ite.elt.zip_listeners = true;
      cx_ite.elt.invalidate_pairs();
      cx_ite = cx_ite.next;
    }
  }

  // ========== Body listeners (priority-ordered) ==========

  addbody(x: ZPP_BodyListener): void {
    const zpp = ZPP_CbType._zpp;
    let pre: any = null;
    let cx_ite = this.bodylisteners.head;
    while (cx_ite != null) {
      const j: ZPP_BodyListener = cx_ite.elt;
      if (x.precedence > j.precedence || (x.precedence === j.precedence && x.id > j.id)) break;
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
    const list = this.bodylisteners;
    let ret: any;
    if (zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool == null) {
      ret = new zpp.util.ZNPNode_ZPP_BodyListener();
    } else {
      ret = zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool;
      zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.elt = x;
    if (pre == null) {
      ret.next = list.head;
      list.head = ret;
    } else {
      ret.next = pre.next;
      pre.next = ret;
    }
    list.pushmod = list.modified = true;
    list.length++;
    let cb_ite = this.cbsets.head;
    while (cb_ite != null) {
      cb_ite.elt.zip_bodylisteners = true;
      cb_ite = cb_ite.next;
    }
  }

  removebody(x: ZPP_BodyListener): void {
    this.bodylisteners.remove(x);
    let cx_ite = this.cbsets.head;
    while (cx_ite != null) {
      cx_ite.elt.zip_bodylisteners = true;
      cx_ite = cx_ite.next;
    }
  }

  invalidatebody(): void {
    let cx_ite = this.cbsets.head;
    while (cx_ite != null) {
      cx_ite.elt.zip_bodylisteners = true;
      cx_ite = cx_ite.next;
    }
  }

  // ========== Constraint listeners (priority-ordered) ==========

  addconstraint(x: ZPP_ConstraintListener): void {
    const zpp = ZPP_CbType._zpp;
    let pre: any = null;
    let cx_ite = this.conlisteners.head;
    while (cx_ite != null) {
      const j: ZPP_ConstraintListener = cx_ite.elt;
      if (x.precedence > j.precedence || (x.precedence === j.precedence && x.id > j.id)) break;
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
    const list = this.conlisteners;
    let ret: any;
    if (zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool == null) {
      ret = new zpp.util.ZNPNode_ZPP_ConstraintListener();
    } else {
      ret = zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool;
      zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.elt = x;
    if (pre == null) {
      ret.next = list.head;
      list.head = ret;
    } else {
      ret.next = pre.next;
      pre.next = ret;
    }
    list.pushmod = list.modified = true;
    list.length++;
    let cb_ite = this.cbsets.head;
    while (cb_ite != null) {
      cb_ite.elt.zip_conlisteners = true;
      cb_ite = cb_ite.next;
    }
  }

  removeconstraint(x: ZPP_ConstraintListener): void {
    this.conlisteners.remove(x);
    let cx_ite = this.cbsets.head;
    while (cx_ite != null) {
      cx_ite.elt.zip_conlisteners = true;
      cx_ite = cx_ite.next;
    }
  }

  invalidateconstraint(): void {
    let cx_ite = this.cbsets.head;
    while (cx_ite != null) {
      cx_ite.elt.zip_conlisteners = true;
      cx_ite = cx_ite.next;
    }
  }
}
