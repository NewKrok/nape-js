/**
 * ZPP_CbType — Internal callback type for the nape physics engine.
 *
 * Manages three types of listener lists (interaction, body, constraint)
 * with priority-ordered insertion. Tracks interactors and constraints
 * that use this callback type, and invalidates callback sets on change.
 *
 * Converted from nape-compiled.js lines 48256–48482.
 */

type Any = any;

export class ZPP_CbType {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "callbacks", "ZPP_CbType"];

  // --- Static: namespace references ---
  static _zpp: Any = null;

  // --- Instance ---
  outer: Any = null;
  userData: Any = null;
  id = 0;

  // Callback sets that include this type
  cbsets: Any = null;

  // Registered interactors and constraints
  interactors: Any = null;
  wrap_interactors: Any = null;
  constraints: Any = null;
  wrap_constraints: Any = null;

  // Three listener lists (ordered by precedence)
  listeners: Any = null;
  bodylisteners: Any = null;
  conlisteners: Any = null;

  __class__: Any = ZPP_CbType;

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

  addInteractor(intx: Any): void {
    this.interactors.add(intx);
  }

  remInteractor(intx: Any): void {
    this.interactors.remove(intx);
  }

  addConstraint(con: Any): void {
    this.constraints.add(con);
  }

  remConstraint(con: Any): void {
    this.constraints.remove(con);
  }

  // ========== Interaction listeners (priority-ordered) ==========

  addint(x: Any): void {
    const zpp = ZPP_CbType._zpp;
    // Find insertion point by precedence (descending), then id (descending)
    let pre: Any = null;
    let cx_ite = this.listeners.head;
    while (cx_ite != null) {
      const j = cx_ite.elt;
      if (x.precedence > j.precedence || (x.precedence === j.precedence && x.id > j.id)) break;
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
    // Insert node from pool
    const list = this.listeners;
    let ret: Any;
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

  removeint(x: Any): void {
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

  addbody(x: Any): void {
    const zpp = ZPP_CbType._zpp;
    let pre: Any = null;
    let cx_ite = this.bodylisteners.head;
    while (cx_ite != null) {
      const j = cx_ite.elt;
      if (x.precedence > j.precedence || (x.precedence === j.precedence && x.id > j.id)) break;
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
    const list = this.bodylisteners;
    let ret: Any;
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

  removebody(x: Any): void {
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

  addconstraint(x: Any): void {
    const zpp = ZPP_CbType._zpp;
    let pre: Any = null;
    let cx_ite = this.conlisteners.head;
    while (cx_ite != null) {
      const j = cx_ite.elt;
      if (x.precedence > j.precedence || (x.precedence === j.precedence && x.id > j.id)) break;
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
    const list = this.conlisteners;
    let ret: Any;
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

  removeconstraint(x: Any): void {
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
