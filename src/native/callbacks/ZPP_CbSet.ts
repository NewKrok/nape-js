/**
 * ZPP_CbSet — Internal callback set for the nape physics engine.
 *
 * Groups callback types together for efficient listener matching.
 * Maintains lazily-validated lists of interaction, body, and constraint listeners.
 * Tracks interactors and constraints that belong to this set.
 *
 * Converted from nape-compiled.js lines 44594–45134, 132797.
 */

type Any = any;

export class ZPP_CbSet {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "callbacks", "ZPP_CbSet"];

  // --- Static: namespace references ---
  static _zpp: Any = null;

  // --- Static: object pool ---
  static zpp_pool: ZPP_CbSet | null = null;

  // --- Instance ---
  cbTypes: Any = null;
  count = 0;
  next: ZPP_CbSet | null = null;
  id = 0;
  manager: Any = null;
  cbpairs: Any = null;

  listeners: Any = null;
  zip_listeners = false;

  bodylisteners: Any = null;
  zip_bodylisteners = false;

  conlisteners: Any = null;
  zip_conlisteners = false;

  interactors: Any = null;
  wrap_interactors: Any = null;
  constraints: Any = null;
  wrap_constraints: Any = null;

  __class__: Any = ZPP_CbSet;

  constructor() {
    const zpp = ZPP_CbSet._zpp;
    this.cbTypes = new zpp.util.ZNPList_ZPP_CbType();
    this.listeners = new zpp.util.ZNPList_ZPP_InteractionListener();
    this.zip_listeners = true;
    this.bodylisteners = new zpp.util.ZNPList_ZPP_BodyListener();
    this.zip_bodylisteners = true;
    this.conlisteners = new zpp.util.ZNPList_ZPP_ConstraintListener();
    this.zip_conlisteners = true;
    this.constraints = new zpp.util.ZNPList_ZPP_Constraint();
    this.interactors = new zpp.util.ZNPList_ZPP_Interactor();
    this.id = zpp.ZPP_ID.CbSet();
    this.cbpairs = new zpp.util.ZNPList_ZPP_CbSetPair();
  }

  // ========== Static methods ==========

  /** Lexicographic compare by cbTypes ids. */
  static setlt(a: ZPP_CbSet, b: ZPP_CbSet): boolean {
    let i = a.cbTypes.head;
    let j = b.cbTypes.head;
    while (i != null && j != null) {
      const ca = i.elt;
      const cb = j.elt;
      if (ca.id < cb.id) return true;
      if (cb.id < ca.id) return false;
      i = i.next;
      j = j.next;
    }
    if (j != null) {
      return i == null;
    } else {
      return false;
    }
  }

  /** Factory with pooling. Populates cbTypes from given list. */
  static get(cbTypes: Any): ZPP_CbSet {
    let ret: ZPP_CbSet;
    if (ZPP_CbSet.zpp_pool == null) {
      ret = new ZPP_CbSet();
    } else {
      ret = ZPP_CbSet.zpp_pool;
      ZPP_CbSet.zpp_pool = ret.next;
      ret.next = null;
    }
    let ite: Any = null;
    let cx_ite = cbTypes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      ite = ret.cbTypes.insert(ite, cb);
      cb.cbsets.add(ret);
      cx_ite = cx_ite.next;
    }
    return ret;
  }

  /** Check if a listener is compatible with sets a and b. */
  static compatible(i: Any, a: ZPP_CbSet, b: ZPP_CbSet): boolean {
    let tmp: boolean;
    const _this = i.options1;
    const xs = a.cbTypes;
    if (
      _this.nonemptyintersection(xs, _this.includes) &&
      !_this.nonemptyintersection(xs, _this.excludes)
    ) {
      const _this1 = i.options2;
      const xs1 = b.cbTypes;
      tmp =
        _this1.nonemptyintersection(xs1, _this1.includes) &&
        !_this1.nonemptyintersection(xs1, _this1.excludes);
    } else {
      tmp = false;
    }
    if (!tmp) {
      const _this2 = i.options2;
      const xs2 = a.cbTypes;
      if (
        _this2.nonemptyintersection(xs2, _this2.includes) &&
        !_this2.nonemptyintersection(xs2, _this2.excludes)
      ) {
        const _this3 = i.options1;
        const xs3 = b.cbTypes;
        if (_this3.nonemptyintersection(xs3, _this3.includes)) {
          return !_this3.nonemptyintersection(xs3, _this3.excludes);
        } else {
          return false;
        }
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  /** Helper: find or create a CbSetPair for sets a and b. */
  private static findOrCreatePair(a: ZPP_CbSet, b: ZPP_CbSet): Any {
    const zpp = ZPP_CbSet._zpp;
    let ret: Any = null;
    const pairs = a.cbpairs.length < b.cbpairs.length ? a.cbpairs : b.cbpairs;
    let cx_ite = pairs.head;
    while (cx_ite != null) {
      const p = cx_ite.elt;
      if ((p.a == a && p.b == b) || (p.a == b && p.b == a)) {
        ret = p;
        break;
      }
      cx_ite = cx_ite.next;
    }
    if (ret == null) {
      let ret1: Any;
      if (zpp.callbacks.ZPP_CbSetPair.zpp_pool == null) {
        ret1 = new zpp.callbacks.ZPP_CbSetPair();
      } else {
        ret1 = zpp.callbacks.ZPP_CbSetPair.zpp_pool;
        zpp.callbacks.ZPP_CbSetPair.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.zip_listeners = true;
      if (ZPP_CbSet.setlt(a, b)) {
        ret1.a = a;
        ret1.b = b;
      } else {
        ret1.a = b;
        ret1.b = a;
      }
      ret = ret1;
      a.cbpairs.add(ret);
      if (b != a) {
        b.cbpairs.add(ret);
      }
    }
    if (ret.zip_listeners) {
      ret.zip_listeners = false;
      ret.__validate();
    }
    return ret;
  }

  static empty_intersection(a: ZPP_CbSet, b: ZPP_CbSet): boolean {
    const ret = ZPP_CbSet.findOrCreatePair(a, b);
    return ret.listeners.head == null;
  }

  static single_intersection(a: ZPP_CbSet, b: ZPP_CbSet, i: Any): boolean {
    const ret = ZPP_CbSet.findOrCreatePair(a, b);
    const ite = ret.listeners.head;
    if (ite != null && ite.elt == i) {
      return ite.next == null;
    } else {
      return false;
    }
  }

  static find_all(a: ZPP_CbSet, b: ZPP_CbSet, event: number, cb: (listener: Any) => void): void {
    const ret = ZPP_CbSet.findOrCreatePair(a, b);
    let cx_ite1 = ret.listeners.head;
    while (cx_ite1 != null) {
      const x = cx_ite1.elt;
      if (x.event == event) {
        cb(x);
      }
      cx_ite1 = cx_ite1.next;
    }
  }

  // ========== Instance methods ==========

  increment(): void {
    this.count++;
  }

  decrement(): boolean {
    return --this.count == 0;
  }

  invalidate_pairs(): void {
    let cx_ite = this.cbpairs.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      cb.zip_listeners = true;
      cx_ite = cx_ite.next;
    }
  }

  invalidate_listeners(): void {
    this.zip_listeners = true;
    this.invalidate_pairs();
  }

  validate_listeners(): void {
    if (this.zip_listeners) {
      this.zip_listeners = false;
      this.realvalidate_listeners();
    }
  }

  realvalidate_listeners(): void {
    const zpp = ZPP_CbSet._zpp;
    this.listeners.clear();
    let cx_ite = this.cbTypes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      let npre: Any = null;
      let nite = this.listeners.head;
      let cite = cb.listeners.head;
      while (cite != null) {
        const cx = cite.elt;
        if (nite != null && nite.elt == cx) {
          cite = cite.next;
          npre = nite;
          nite = nite.next;
        } else {
          let tmp: boolean;
          if (nite != null) {
            const b = nite.elt;
            tmp = cx.precedence > b.precedence || (cx.precedence == b.precedence && cx.id > b.id);
          } else {
            tmp = true;
          }
          if (tmp) {
            if (cx.space == this.manager.space) {
              const _this = this.listeners;
              let ret: Any;
              if (zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool == null) {
                ret = new zpp.util.ZNPNode_ZPP_InteractionListener();
              } else {
                ret = zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool;
                zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = ret.next;
                ret.next = null;
              }
              ret.elt = cx;
              const temp = ret;
              if (npre == null) {
                temp.next = _this.head;
                _this.head = temp;
              } else {
                temp.next = npre.next;
                npre.next = temp;
              }
              _this.pushmod = _this.modified = true;
              _this.length++;
              npre = temp;
            }
            cite = cite.next;
          } else {
            npre = nite;
            nite = nite.next;
          }
        }
      }
      cx_ite = cx_ite.next;
    }
  }

  invalidate_bodylisteners(): void {
    this.zip_bodylisteners = true;
  }

  validate_bodylisteners(): void {
    if (this.zip_bodylisteners) {
      this.zip_bodylisteners = false;
      this.realvalidate_bodylisteners();
    }
  }

  realvalidate_bodylisteners(): void {
    const zpp = ZPP_CbSet._zpp;
    this.bodylisteners.clear();
    let cx_ite = this.cbTypes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      let npre: Any = null;
      let nite = this.bodylisteners.head;
      let cite = cb.bodylisteners.head;
      while (cite != null) {
        const cx = cite.elt;
        if (nite != null && nite.elt == cx) {
          cite = cite.next;
          npre = nite;
          nite = nite.next;
        } else {
          let tmp: boolean;
          if (nite != null) {
            const b = nite.elt;
            tmp = cx.precedence > b.precedence || (cx.precedence == b.precedence && cx.id > b.id);
          } else {
            tmp = true;
          }
          if (tmp) {
            const _this = cx.options;
            if (
              !_this.nonemptyintersection(this.cbTypes, _this.excludes) &&
              cx.space == this.manager.space
            ) {
              const _this1 = this.bodylisteners;
              let ret: Any;
              if (zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool == null) {
                ret = new zpp.util.ZNPNode_ZPP_BodyListener();
              } else {
                ret = zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool;
                zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool = ret.next;
                ret.next = null;
              }
              ret.elt = cx;
              const temp = ret;
              if (npre == null) {
                temp.next = _this1.head;
                _this1.head = temp;
              } else {
                temp.next = npre.next;
                npre.next = temp;
              }
              _this1.pushmod = _this1.modified = true;
              _this1.length++;
              npre = temp;
            }
            cite = cite.next;
          } else {
            npre = nite;
            nite = nite.next;
          }
        }
      }
      cx_ite = cx_ite.next;
    }
  }

  invalidate_conlisteners(): void {
    this.zip_conlisteners = true;
  }

  validate_conlisteners(): void {
    if (this.zip_conlisteners) {
      this.zip_conlisteners = false;
      this.realvalidate_conlisteners();
    }
  }

  realvalidate_conlisteners(): void {
    const zpp = ZPP_CbSet._zpp;
    this.conlisteners.clear();
    let cx_ite = this.cbTypes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      let npre: Any = null;
      let nite = this.conlisteners.head;
      let cite = cb.conlisteners.head;
      while (cite != null) {
        const cx = cite.elt;
        if (nite != null && nite.elt == cx) {
          cite = cite.next;
          npre = nite;
          nite = nite.next;
        } else {
          let tmp: boolean;
          if (nite != null) {
            const b = nite.elt;
            tmp = cx.precedence > b.precedence || (cx.precedence == b.precedence && cx.id > b.id);
          } else {
            tmp = true;
          }
          if (tmp) {
            const _this = cx.options;
            if (
              !_this.nonemptyintersection(this.cbTypes, _this.excludes) &&
              cx.space == this.manager.space
            ) {
              const _this1 = this.conlisteners;
              let ret: Any;
              if (zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool == null) {
                ret = new zpp.util.ZNPNode_ZPP_ConstraintListener();
              } else {
                ret = zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool;
                zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = ret.next;
                ret.next = null;
              }
              ret.elt = cx;
              const temp = ret;
              if (npre == null) {
                temp.next = _this1.head;
                _this1.head = temp;
              } else {
                temp.next = npre.next;
                npre.next = temp;
              }
              _this1.pushmod = _this1.modified = true;
              _this1.length++;
              npre = temp;
            }
            cite = cite.next;
          } else {
            npre = nite;
            nite = nite.next;
          }
        }
      }
      cx_ite = cx_ite.next;
    }
  }

  validate(): void {
    if (this.zip_listeners) {
      this.zip_listeners = false;
      this.realvalidate_listeners();
    }
    if (this.zip_bodylisteners) {
      this.zip_bodylisteners = false;
      this.realvalidate_bodylisteners();
    }
    if (this.zip_conlisteners) {
      this.zip_conlisteners = false;
      this.realvalidate_conlisteners();
    }
  }

  addConstraint(con: Any): void {
    this.constraints.add(con);
  }

  addInteractor(intx: Any): void {
    this.interactors.add(intx);
  }

  remConstraint(con: Any): void {
    this.constraints.remove(con);
  }

  remInteractor(intx: Any): void {
    this.interactors.remove(intx);
  }

  free(): void {
    this.listeners.clear();
    this.zip_listeners = true;
    this.bodylisteners.clear();
    this.zip_bodylisteners = true;
    this.conlisteners.clear();
    this.zip_conlisteners = true;
    while (this.cbTypes.head != null) {
      const cb = this.cbTypes.pop_unsafe();
      cb.cbsets.remove(this);
    }
  }

  alloc(): void {}
}
