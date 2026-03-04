/**
 * ZPP_Interactor — Internal base class for all interactable objects.
 *
 * Shared base for ZPP_Body, ZPP_Compound, and ZPP_Shape.
 * Manages callback types (cbTypes), callback sets (cbSet/cbsets),
 * interaction groups, and space add/remove lifecycle.
 *
 * Converted from nape-compiled.js lines 24862–25239.
 */

import { ZPP_ID } from "../util/ZPP_ID";
import { ZPP_CbSet } from "../callbacks/ZPP_CbSet";

type Any = any;

export class ZPP_Interactor {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "phys", "ZPP_Interactor"];

  /**
   * Namespace references, set by the compiled module after import.
   * _nape = the `nape` public namespace
   * _zpp = the `zpp_nape` internal namespace
   */
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Instance fields ---
  outer_i: Any = null;
  id: number = 0;
  userData: Any = null;
  ishape: Any = null;
  ibody: Any = null;
  icompound: Any = null;
  wrap_cbTypes: Any = null;
  cbSet: Any = null;
  cbTypes: Any = null;
  group: Any = null;
  cbsets: Any = null;

  __class__: Any = ZPP_Interactor;

  constructor() {
    ZPP_Interactor.initFields(this);
  }

  /**
   * Initialize interactor fields on an instance.
   * Called by child classes (ZPP_Body, ZPP_Compound, ZPP_Shape)
   * instead of ZPP_Interactor.call(this).
   */
  static initFields(inst: Any): void {
    const zpp = ZPP_Interactor._zpp;
    inst.wrap_cbTypes = null;
    inst.cbSet = null;
    inst.cbTypes = null;
    inst.group = null;
    inst.cbsets = null;
    inst.icompound = null;
    inst.ibody = null;
    inst.ishape = null;
    inst.userData = null;
    inst.id = 0;
    inst.outer_i = null;
    inst.id = ZPP_ID.Interactor();
    inst.cbsets = new zpp.util.ZNPList_ZPP_CallbackSet();
    inst.cbTypes = new zpp.util.ZNPList_ZPP_CbType();
  }

  // --- Static methods ---

  static get(i1: Any, i2: Any): Any {
    const id = i1.id < i2.id ? i1.id : i2.id;
    const di = i1.id < i2.id ? i2.id : i1.id;
    const xs = i1.cbsets.length < i2.cbsets.length ? i1.cbsets : i2.cbsets;
    let ret: Any = null;
    let cx_ite = xs.head;
    while (cx_ite != null) {
      const x = cx_ite.elt;
      if (x.id == id && x.di == di) {
        ret = x;
        break;
      }
      cx_ite = cx_ite.next;
    }
    return ret;
  }

  static int_callback(set: Any, x: Any, cb: Any): void {
    const o1 = set.int1;
    const o2 = set.int2;
    let tmp: boolean;
    const _this = x.options1;
    const xs = o1.cbTypes;
    if (
      _this.nonemptyintersection(xs, _this.includes) &&
      !_this.nonemptyintersection(xs, _this.excludes)
    ) {
      const _this1 = x.options2;
      const xs1 = o2.cbTypes;
      tmp =
        _this1.nonemptyintersection(xs1, _this1.includes) &&
        !_this1.nonemptyintersection(xs1, _this1.excludes);
    } else {
      tmp = false;
    }
    if (tmp) {
      cb.int1 = o1;
      cb.int2 = o2;
    } else {
      cb.int1 = o2;
      cb.int2 = o1;
    }
  }

  // --- Prototype methods ---

  isShape(): boolean {
    return this.ishape != null;
  }

  isBody(): boolean {
    return this.ibody != null;
  }

  isCompound(): boolean {
    return this.icompound != null;
  }

  __iaddedToSpace(): void {
    if (this.group != null) {
      this.group.interactors.add(this);
    }
    let cx_ite = this.cbTypes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      cb.interactors.add(this);
      cx_ite = cx_ite.next;
    }
    this.alloc_cbSet();
  }

  __iremovedFromSpace(): void {
    if (this.group != null) {
      this.group.interactors.remove(this);
    }
    let cx_ite = this.cbTypes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      cb.interactors.remove(this);
      cx_ite = cx_ite.next;
    }
    this.dealloc_cbSet();
  }

  wake(): void {
    if (this.ishape != null) {
      const body = this.ishape.body;
      if (body != null && body.space != null) {
        body.space.non_inlined_wake(body);
      }
    } else if (this.ibody != null) {
      if (this.ibody.space != null) {
        this.ibody.space.non_inlined_wake(this.ibody);
      }
    } else if (this.icompound.space != null) {
      this.icompound.space.wakeCompound(this.icompound);
    }
  }

  private _getSpace(): Any {
    if (this.ishape != null) {
      return this.ishape.body == null ? null : this.ishape.body.space;
    } else if (this.ibody != null) {
      return this.ibody.space;
    } else {
      return this.icompound.space;
    }
  }

  getSpace(): Any {
    return this._getSpace();
  }

  setupcbTypes(): void {
    const zpp = ZPP_Interactor._zpp;
    const nape = ZPP_Interactor._nape;
    this.wrap_cbTypes = zpp.util.ZPP_CbTypeList.get(this.cbTypes);
    this.wrap_cbTypes.zpp_inner.adder = this.wrap_cbTypes_adder.bind(this);
    this.wrap_cbTypes.zpp_inner.subber = this.wrap_cbTypes_subber.bind(this);
    this.wrap_cbTypes.zpp_inner.dontremove = true;
    this.wrap_cbTypes.zpp_inner._modifiable =
      this.immutable_cbTypes.bind(this);
  }

  immutable_cbTypes(): void {
    this.immutable_midstep("Interactor::cbTypes");
  }

  wrap_cbTypes_subber(pcb: Any): void {
    const cb = pcb.zpp_inner;
    if (this.cbTypes.has(cb)) {
      const space = this._getSpace();
      if (space != null) {
        this.dealloc_cbSet();
        cb.interactors.remove(this);
      }
      this.cbTypes.remove(cb);
      if (space != null) {
        this.alloc_cbSet();
        this.wake();
      }
    }
  }

  wrap_cbTypes_adder(cb: Any): boolean {
    this.insert_cbtype(cb.zpp_inner);
    return false;
  }

  insert_cbtype(cb: Any): void {
    const zpp = ZPP_Interactor._zpp;
    if (!this.cbTypes.has(cb)) {
      const space = this._getSpace();
      if (space != null) {
        this.dealloc_cbSet();
        cb.interactors.add(this);
      }
      let pre: Any = null;
      let cx_ite = this.cbTypes.head;
      while (cx_ite != null) {
        const j = cx_ite.elt;
        if (cb.id < j.id) {
          break;
        }
        pre = cx_ite;
        cx_ite = cx_ite.next;
      }
      const _this = this.cbTypes;
      let ret: Any;
      if (zpp.util.ZNPNode_ZPP_CbType.zpp_pool == null) {
        ret = new zpp.util.ZNPNode_ZPP_CbType();
      } else {
        ret = zpp.util.ZNPNode_ZPP_CbType.zpp_pool;
        zpp.util.ZNPNode_ZPP_CbType.zpp_pool = ret.next;
        ret.next = null;
      }
      ret.elt = cb;
      const temp = ret;
      if (pre == null) {
        temp.next = _this.head;
        _this.head = temp;
      } else {
        temp.next = pre.next;
        pre.next = temp;
      }
      _this.pushmod = _this.modified = true;
      _this.length++;
      if (space != null) {
        this.alloc_cbSet();
        this.wake();
      }
    }
  }

  alloc_cbSet(): void {
    const space = this._getSpace();
    if ((this.cbSet = space.cbsets.get(this.cbTypes)) != null) {
      this.cbSet.count++;
      this.cbSet.interactors.add(this);
      this.cbSet.validate();
      space.freshInteractorType(this);
    }
  }

  dealloc_cbSet(): void {
    const space = this._getSpace();
    if (this.cbSet != null) {
      this.cbSet.interactors.remove(this);
      space.nullInteractorType(this);
      if (--this.cbSet.count == 0) {
        space.cbsets.remove(this.cbSet);
        const o = this.cbSet;
        o.listeners.clear();
        o.zip_listeners = true;
        o.bodylisteners.clear();
        o.zip_bodylisteners = true;
        o.conlisteners.clear();
        o.zip_conlisteners = true;
        while (o.cbTypes.head != null) {
          const cb = o.cbTypes.pop_unsafe();
          cb.cbsets.remove(o);
        }
        o.next = ZPP_CbSet.zpp_pool;
        ZPP_CbSet.zpp_pool = o;
      }
      this.cbSet = null;
    }
  }

  setGroup(group: Any): void {
    if (this.group != group) {
      const inspace = this._getSpace() != null;
      if (inspace && this.group != null) {
        this.group.interactors.remove(this);
      }
      this.group = group;
      if (inspace && group != null) {
        group.interactors.add(this);
      }
      if (inspace) {
        if (this.ishape != null) {
          this.ishape.body.wake();
        } else if (this.ibody != null) {
          this.ibody.wake();
        } else {
          this.icompound.wake();
        }
      }
    }
  }

  immutable_midstep(n: string): void {
    if (this.ibody != null) {
      const _this = this.ibody;
      if (_this.space != null && _this.space.midstep) {
        throw new Error(
          "Error: " + n + " cannot be set during a space step()"
        );
      }
    } else if (this.ishape != null) {
      this.ishape.__immutable_midstep(n);
    } else {
      this.icompound.__imutable_midstep(n);
    }
  }

  lookup_group(): Any {
    let cur: Any = this;
    while (cur != null && cur.group == null) {
      if (cur.ishape != null) {
        cur = cur.ishape.body;
      } else if (cur.icompound != null) {
        cur = cur.icompound.compound;
      } else {
        cur = cur.ibody.compound;
      }
    }
    if (cur == null) {
      return null;
    } else {
      return cur.group;
    }
  }

  copyto(ret: Any): void {
    const nape = ZPP_Interactor._nape;
    ret.zpp_inner_i.group = this.group;
    const _this = this.outer_i;
    if (_this.zpp_inner_i.wrap_cbTypes == null) {
      _this.zpp_inner_i.setupcbTypes();
    }
    const _this1 = _this.zpp_inner_i.wrap_cbTypes;
    _this1.zpp_inner.valmod();
    const _g = nape.callbacks.CbTypeIterator.get(_this1);
    while (true) {
      _g.zpp_inner.zpp_inner.valmod();
      const _this2 = _g.zpp_inner;
      _this2.zpp_inner.valmod();
      if (_this2.zpp_inner.zip_length) {
        _this2.zpp_inner.zip_length = false;
        _this2.zpp_inner.user_length = _this2.zpp_inner.inner.length;
      }
      const length = _this2.zpp_inner.user_length;
      _g.zpp_critical = true;
      let tmp: boolean;
      if (_g.zpp_i < length) {
        tmp = true;
      } else {
        _g.zpp_next = nape.callbacks.CbTypeIterator.zpp_pool;
        nape.callbacks.CbTypeIterator.zpp_pool = _g;
        _g.zpp_inner = null;
        tmp = false;
      }
      if (!tmp) {
        break;
      }
      _g.zpp_critical = false;
      const cb = _g.zpp_inner.at(_g.zpp_i++);
      if (ret.zpp_inner_i.wrap_cbTypes == null) {
        ret.zpp_inner_i.setupcbTypes();
      }
      const _this3 = ret.zpp_inner_i.wrap_cbTypes;
      if (_this3.zpp_inner.reverse_flag) {
        _this3.push(cb);
      } else {
        _this3.unshift(cb);
      }
    }
    if (this.userData != null) {
      ret.zpp_inner_i.userData = Object.assign({}, this.userData);
    }
  }

  // --- Module initialization ---
  static _initialized = false;

  static _init(zpp: Any, nape: Any): void {
    if (ZPP_Interactor._initialized) return;
    ZPP_Interactor._initialized = true;
    ZPP_Interactor._zpp = zpp;
    ZPP_Interactor._nape = nape;
  }
}
