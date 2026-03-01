/**
 * ZPP_OptionType — Internal callback option type for the nape physics engine.
 *
 * Manages include/exclude lists of callback types with ordered insertion,
 * set intersection tests, and handler delegation for live changes.
 *
 * Converted from nape-compiled.js lines 51337–51655.
 */

type Any = any;

export class ZPP_OptionType {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "callbacks", "ZPP_OptionType"];

  // --- Static: namespace references ---
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Instance ---
  outer: Any = null;
  handler: ((val: Any, included: boolean, added: boolean) => void) | null = null;
  includes: Any = null;
  excludes: Any = null;
  wrap_includes: Any = null;
  wrap_excludes: Any = null;

  __class__: Any = ZPP_OptionType;

  constructor() {
    const zpp = ZPP_OptionType._zpp;
    this.includes = new zpp.util.ZNPList_ZPP_CbType();
    this.excludes = new zpp.util.ZNPList_ZPP_CbType();
  }

  /** Coerce a value to OptionType (null → new, OptionType → pass-through, CbType → including). */
  static argument(val: Any): Any {
    const napeNs = ZPP_OptionType._nape;
    if (val == null) {
      return new napeNs.callbacks.OptionType();
    } else if (val instanceof napeNs.callbacks.OptionType) {
      return val;
    } else {
      return new napeNs.callbacks.OptionType().including(val);
    }
  }

  setup_includes(): void {
    const zpp = ZPP_OptionType._zpp;
    this.wrap_includes = zpp.util.ZPP_CbTypeList.get(this.includes, true);
  }

  setup_excludes(): void {
    const zpp = ZPP_OptionType._zpp;
    this.wrap_excludes = zpp.util.ZPP_CbTypeList.get(this.excludes, true);
  }

  excluded(xs: Any): boolean {
    return this.nonemptyintersection(xs, this.excludes);
  }

  included(xs: Any): boolean {
    return this.nonemptyintersection(xs, this.includes);
  }

  compatible(xs: Any): boolean {
    if (this.nonemptyintersection(xs, this.includes)) {
      return !this.nonemptyintersection(xs, this.excludes);
    } else {
      return false;
    }
  }

  /** Check whether two sorted-by-id lists share any element. */
  nonemptyintersection(xs: Any, ys: Any): boolean {
    let ret = false;
    let xite = xs.head;
    let eite = ys.head;
    while (eite != null && xite != null) {
      const ex = eite.elt;
      const xi = xite.elt;
      if (ex == xi) {
        ret = true;
        break;
      } else if (ex.id < xi.id) {
        eite = eite.next;
      } else {
        xite = xite.next;
      }
    }
    return ret;
  }

  /** Insert into the ordered include or exclude list, using pool nodes. */
  private insertOrdered(list: Any, val: Any): void {
    const zpp = ZPP_OptionType._zpp;
    let pre: Any = null;
    let cx_ite = list.head;
    while (cx_ite != null) {
      const j = cx_ite.elt;
      if (val.id < j.id) break;
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
    let ret: Any;
    if (zpp.util.ZNPNode_ZPP_CbType.zpp_pool == null) {
      ret = new zpp.util.ZNPNode_ZPP_CbType();
    } else {
      ret = zpp.util.ZNPNode_ZPP_CbType.zpp_pool;
      zpp.util.ZNPNode_ZPP_CbType.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.elt = val;
    if (pre == null) {
      ret.next = list.head;
      list.head = ret;
    } else {
      ret.next = pre.next;
      pre.next = ret;
    }
    list.pushmod = list.modified = true;
    list.length++;
  }

  effect_change(val: Any, included: boolean, added: boolean): void {
    if (included) {
      if (added) {
        this.insertOrdered(this.includes, val);
      } else {
        this.includes.remove(val);
      }
    } else if (added) {
      this.insertOrdered(this.excludes, val);
    } else {
      this.excludes.remove(val);
    }
  }

  append_type(list: Any, val: Any): void {
    if (list == this.includes) {
      if (!this.includes.has(val)) {
        if (!this.excludes.has(val)) {
          if (this.handler != null) {
            this.handler(val, true, true);
          } else {
            this.insertOrdered(this.includes, val);
          }
        } else if (this.handler != null) {
          this.handler(val, false, false);
        } else {
          this.excludes.remove(val);
        }
      }
    } else if (!this.excludes.has(val)) {
      if (!this.includes.has(val)) {
        if (this.handler != null) {
          this.handler(val, false, true);
        } else {
          this.insertOrdered(this.excludes, val);
        }
      } else if (this.handler != null) {
        this.handler(val, true, false);
      } else {
        this.includes.remove(val);
      }
    }
  }

  set(options: ZPP_OptionType): this {
    if (options != (this as Any)) {
      while (this.includes.head != null) this.append_type(this.excludes, this.includes.head.elt);
      while (this.excludes.head != null) this.append_type(this.includes, this.excludes.head.elt);
      let cx_ite = options.excludes.head;
      while (cx_ite != null) {
        const i = cx_ite.elt;
        this.append_type(this.excludes, i);
        cx_ite = cx_ite.next;
      }
      let cx_ite1 = options.includes.head;
      while (cx_ite1 != null) {
        const i1 = cx_ite1.elt;
        this.append_type(this.includes, i1);
        cx_ite1 = cx_ite1.next;
      }
    }
    return this;
  }

  append(list: Any, val: Any): void {
    const napeNs = ZPP_OptionType._nape;
    if (val == null) {
      throw new Error("Error: Cannot append null, only CbType and CbType list values");
    }
    if (val instanceof napeNs.callbacks.CbType) {
      const cb = val;
      this.append_type(list, cb.zpp_inner);
    } else if (val instanceof napeNs.callbacks.CbTypeList) {
      const cbs = val;
      cbs.zpp_inner.valmod();
      const _g = napeNs.callbacks.CbTypeIterator.get(cbs);
      while (true) {
        _g.zpp_inner.zpp_inner.valmod();
        const _this = _g.zpp_inner;
        _this.zpp_inner.valmod();
        if (_this.zpp_inner.zip_length) {
          _this.zpp_inner.zip_length = false;
          _this.zpp_inner.user_length = _this.zpp_inner.inner.length;
        }
        const length = _this.zpp_inner.user_length;
        _g.zpp_critical = true;
        let tmp: boolean;
        if (_g.zpp_i < length) {
          tmp = true;
        } else {
          _g.zpp_next = napeNs.callbacks.CbTypeIterator.zpp_pool;
          napeNs.callbacks.CbTypeIterator.zpp_pool = _g;
          _g.zpp_inner = null;
          tmp = false;
        }
        if (!tmp) break;
        _g.zpp_critical = false;
        const cb1 = _g.zpp_inner.at(_g.zpp_i++);
        this.append_type(list, cb1.zpp_inner);
      }
    } else if (val instanceof Array) {
      const cbs1 = val;
      let _g1 = 0;
      while (_g1 < cbs1.length) {
        const cb2 = cbs1[_g1];
        ++_g1;
        if (!(cb2 instanceof napeNs.callbacks.CbType)) {
          throw new Error("Error: Cannot append non-CbType or CbType list value");
        }
        const cbx = cb2;
        this.append_type(list, cbx.zpp_inner);
      }
    } else {
      throw new Error("Error: Cannot append non-CbType or CbType list value");
    }
  }
}
