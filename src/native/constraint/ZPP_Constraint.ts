/**
 * ZPP_Constraint — Internal base class for all constraints / joints.
 *
 * Manages activation/deactivation, callback types, space integration,
 * and provides stubs for solver methods overridden by joint subclasses.
 *
 * Converted from nape-compiled.js lines 21424–21827.
 */

import { ZPP_ID } from "../util/ZPP_ID";

export class ZPP_Constraint {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "constraint", "ZPP_Constraint"];

  /**
   * Namespace references, set by the compiled module after import.
   * _nape = the `nape` public namespace (for CbTypeIterator in copyto)
   * _zpp = the `zpp_nape` internal namespace (for ZNPList_*, ZPP_CbSet, etc.)
   */
  static _nape: any = null;
  static _zpp: any = null;

  // --- Instance fields ---
  outer: any = null;
  id: number = 0;
  userData: any = null;
  compound: any = null;
  space: any = null;
  active: boolean = false;
  stiff: boolean = false;
  frequency: number = 0.0;
  damping: number = 0.0;
  maxForce: number = 0.0;
  maxError: number = 0.0;
  breakUnderForce: boolean = false;
  breakUnderError: boolean = false;
  removeOnBreak: boolean = false;
  component: any = null;
  ignore: boolean = false;
  __velocity: boolean = false;
  cbTypes: any = null;
  cbSet: any = null;
  wrap_cbTypes: any = null;
  pre_dt: number = -1.0;

  __class__: any = ZPP_Constraint;

  constructor() {
    this._initBase();
  }

  /**
   * Initialise base constraint fields.
   * Extracted into a separate method because compiled joint subclasses
   * call `ZPP_Constraint.call(this)` — ES classes can't be invoked that
   * way, so the compiled wrapper delegates to this method instead.
   */
  _initBase(): void {
    const zpp = ZPP_Constraint._zpp;

    this.id = ZPP_ID.Constraint();
    this.stiff = true;
    this.active = true;
    this.ignore = false;
    this.frequency = 10;
    this.damping = 1;
    this.maxForce = Infinity;
    this.maxError = Infinity;
    this.breakUnderForce = false;
    this.removeOnBreak = true;
    this.pre_dt = -1.0;
    this.cbTypes = new zpp.util.ZNPList_ZPP_CbType();
  }

  // --- Stub methods (overridden by subclasses) ---
  clear(): void {}
  activeBodies(): void {}
  inactiveBodies(): void {}
  clearcache(): void {}
  validate(): void {}
  wake_connected(): void {}
  forest(): void {}
  broken(): void {}
  warmStart(): void {}
  draw(_g: any): void {}

  pair_exists(_id: any, _di: any): boolean {
    return false;
  }

  preStep(_dt: number): boolean {
    return false;
  }

  applyImpulseVel(): boolean {
    return false;
  }

  applyImpulsePos(): boolean {
    return false;
  }

  copy(_dict?: any, _todo?: any): any {
    return null;
  }

  // --- Mid-step guard ---
  immutable_midstep(name: string): void {
    if (this.space != null && this.space.midstep) {
      throw new Error("Error: Constraint::" + name + " cannot be set during space step()");
    }
  }

  // --- Callback types management ---
  setupcbTypes(): void {
    const zpp = ZPP_Constraint._zpp;
    this.wrap_cbTypes = zpp.util.ZPP_CbTypeList.get(this.cbTypes);
    this.wrap_cbTypes.zpp_inner.adder = this.wrap_cbTypes_adder.bind(this);
    this.wrap_cbTypes.zpp_inner.subber = this.wrap_cbTypes_subber.bind(this);
    this.wrap_cbTypes.zpp_inner.dontremove = true;
    this.wrap_cbTypes.zpp_inner._modifiable = this.immutable_cbTypes.bind(this);
  }

  immutable_cbTypes(): void {
    this.immutable_midstep("Constraint::cbTypes");
  }

  wrap_cbTypes_subber(pcb: any): void {
    const cb = pcb.zpp_inner;
    if (this.cbTypes.has(cb)) {
      if (this.space != null) {
        this.dealloc_cbSet();
        cb.constraints.remove(this);
      }
      this.cbTypes.remove(cb);
      if (this.space != null) {
        this.alloc_cbSet();
        this.wake();
      }
    }
  }

  wrap_cbTypes_adder(cb: any): boolean {
    this.insert_cbtype(cb.zpp_inner);
    return false;
  }

  insert_cbtype(cb: any): void {
    const zpp = ZPP_Constraint._zpp;
    if (!this.cbTypes.has(cb)) {
      if (this.space != null) {
        this.dealloc_cbSet();
        cb.constraints.add(this);
      }
      let pre: any = null;
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
      let ret;
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
      if (this.space != null) {
        this.alloc_cbSet();
        this.wake();
      }
    }
  }

  // --- CbSet management ---
  alloc_cbSet(): void {
    if ((this.cbSet = this.space.cbsets.get(this.cbTypes)) != null) {
      this.cbSet.count++;
      this.cbSet.constraints.add(this);
    }
  }

  dealloc_cbSet(): void {
    const zpp = ZPP_Constraint._zpp;
    if (this.cbSet != null) {
      this.cbSet.constraints.remove(this);
      if (--this.cbSet.count == 0) {
        this.space.cbsets.remove(this.cbSet);
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
        o.next = zpp.callbacks.ZPP_CbSet.zpp_pool;
        zpp.callbacks.ZPP_CbSet.zpp_pool = o;
      }
      this.cbSet = null;
    }
  }

  // --- Activation / space integration ---
  activate(): void {
    if (this.space != null) {
      this.activeInSpace();
    }
  }

  deactivate(): void {
    if (this.space != null) {
      this.inactiveOrOutSpace();
    }
  }

  addedToSpace(): void {
    if (this.active) {
      this.activeInSpace();
    }
    this.activeBodies();
    let cx_ite = this.cbTypes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      cb.constraints.add(this);
      cx_ite = cx_ite.next;
    }
  }

  removedFromSpace(): void {
    if (this.active) {
      this.inactiveOrOutSpace();
    }
    this.inactiveBodies();
    let cx_ite = this.cbTypes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      cb.constraints.remove(this);
      cx_ite = cx_ite.next;
    }
  }

  activeInSpace(): void {
    const zpp = ZPP_Constraint._zpp;
    this.alloc_cbSet();
    if (zpp.space.ZPP_Component.zpp_pool == null) {
      this.component = new zpp.space.ZPP_Component();
    } else {
      this.component = zpp.space.ZPP_Component.zpp_pool;
      zpp.space.ZPP_Component.zpp_pool = this.component.next;
      this.component.next = null;
    }
    this.component.isBody = false;
    this.component.constraint = this;
  }

  inactiveOrOutSpace(): void {
    const zpp = ZPP_Constraint._zpp;
    this.dealloc_cbSet();
    const o = this.component;
    o.body = null;
    o.constraint = null;
    o.next = zpp.space.ZPP_Component.zpp_pool;
    zpp.space.ZPP_Component.zpp_pool = o;
    this.component = null;
  }

  // --- Wake ---
  wake(): void {
    if (this.space != null) {
      this.space.wake_constraint(this);
    }
  }

  // --- Copy support ---
  copyto(ret: any): void {
    const nape = ZPP_Constraint._nape;

    const me = this.outer;
    if (me.zpp_inner.wrap_cbTypes == null) {
      me.zpp_inner.setupcbTypes();
    }
    const cbList = me.zpp_inner.wrap_cbTypes;
    cbList.zpp_inner.valmod();
    const _g = nape.callbacks.CbTypeIterator.get(cbList);
    while (true) {
      _g.zpp_inner.zpp_inner.valmod();
      const _this1 = _g.zpp_inner;
      _this1.zpp_inner.valmod();
      if (_this1.zpp_inner.zip_length) {
        _this1.zpp_inner.zip_length = false;
        _this1.zpp_inner.user_length = _this1.zpp_inner.inner.length;
      }
      const length = _this1.zpp_inner.user_length;
      _g.zpp_critical = true;
      let tmp;
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
      if (ret.zpp_inner.wrap_cbTypes == null) {
        ret.zpp_inner.setupcbTypes();
      }
      const _this2 = ret.zpp_inner.wrap_cbTypes;
      if (_this2.zpp_inner.reverse_flag) {
        _this2.push(cb);
      } else {
        _this2.unshift(cb);
      }
    }

    ret.zpp_inner.removeOnBreak = me.zpp_inner.removeOnBreak;

    const breakUnderError = me.zpp_inner.breakUnderError;
    if (ret.zpp_inner.breakUnderError != breakUnderError) {
      ret.zpp_inner.breakUnderError = breakUnderError;
      ret.zpp_inner.wake();
    }

    const breakUnderForce = me.zpp_inner.breakUnderForce;
    if (ret.zpp_inner.breakUnderForce != breakUnderForce) {
      ret.zpp_inner.breakUnderForce = breakUnderForce;
      ret.zpp_inner.wake();
    }

    const maxError = me.zpp_inner.maxError;
    if (maxError !== maxError) {
      throw new Error("Error: Constraint::maxError cannot be NaN");
    }
    if (maxError < 0) {
      throw new Error("Error: Constraint::maxError must be >=0");
    }
    if (ret.zpp_inner.maxError != maxError) {
      ret.zpp_inner.maxError = maxError;
      ret.zpp_inner.wake();
    }

    const maxForce = me.zpp_inner.maxForce;
    if (maxForce !== maxForce) {
      throw new Error("Error: Constraint::maxForce cannot be NaN");
    }
    if (maxForce < 0) {
      throw new Error("Error: Constraint::maxForce must be >=0");
    }
    if (ret.zpp_inner.maxForce != maxForce) {
      ret.zpp_inner.maxForce = maxForce;
      ret.zpp_inner.wake();
    }

    const damping = me.zpp_inner.damping;
    if (damping !== damping) {
      throw new Error("Error: Constraint::Damping cannot be Nan");
    }
    if (damping < 0) {
      throw new Error("Error: Constraint::Damping must be >=0");
    }
    if (ret.zpp_inner.damping != damping) {
      ret.zpp_inner.damping = damping;
      if (!ret.zpp_inner.stiff) {
        ret.zpp_inner.wake();
      }
    }

    const frequency = me.zpp_inner.frequency;
    if (frequency !== frequency) {
      throw new Error("Error: Constraint::Frequency cannot be NaN");
    }
    if (frequency <= 0) {
      throw new Error("Error: Constraint::Frequency must be >0");
    }
    if (ret.zpp_inner.frequency != frequency) {
      ret.zpp_inner.frequency = frequency;
      if (!ret.zpp_inner.stiff) {
        ret.zpp_inner.wake();
      }
    }

    const stiff = me.zpp_inner.stiff;
    if (ret.zpp_inner.stiff != stiff) {
      ret.zpp_inner.stiff = stiff;
      ret.zpp_inner.wake();
    }

    const ignore = me.zpp_inner.ignore;
    if (ret.zpp_inner.ignore != ignore) {
      ret.zpp_inner.ignore = ignore;
      ret.zpp_inner.wake();
    }

    const active = me.zpp_inner.active;
    if (ret.zpp_inner.active != active) {
      if (ret.zpp_inner.component != null) {
        ret.zpp_inner.component.woken = false;
      }
      ret.zpp_inner.clearcache();
      if (active) {
        ret.zpp_inner.active = active;
        ret.zpp_inner.activate();
        if (ret.zpp_inner.space != null) {
          if (ret.zpp_inner.component != null) {
            ret.zpp_inner.component.sleeping = true;
          }
          ret.zpp_inner.space.wake_constraint(ret.zpp_inner, true);
        }
      } else {
        if (ret.zpp_inner.space != null) {
          ret.zpp_inner.wake();
          ret.zpp_inner.space.live_constraints.remove(ret.zpp_inner);
        }
        ret.zpp_inner.active = active;
        ret.zpp_inner.deactivate();
      }
    }
  }

  // --- Static helpers for union-find (used by all joint subclasses) ---

  static _findRoot(comp: any): any {
    if (comp == comp.parent) {
      return comp;
    }
    let obj = comp;
    let stack: any = null;
    while (obj != obj.parent) {
      const nxt = obj.parent;
      obj.parent = stack;
      stack = obj;
      obj = nxt;
    }
    while (stack != null) {
      const nxt = stack.parent;
      stack.parent = obj;
      stack = nxt;
    }
    return obj;
  }

  static _unionComponents(a: any, b: any): void {
    const xr = ZPP_Constraint._findRoot(a);
    const yr = ZPP_Constraint._findRoot(b);
    if (xr != yr) {
      if (xr.rank < yr.rank) {
        xr.parent = yr;
      } else if (xr.rank > yr.rank) {
        yr.parent = xr;
      } else {
        yr.parent = xr;
        xr.rank++;
      }
    }
  }
}
