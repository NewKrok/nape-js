/**
 * ZPP_Contact — Internal contact point representation for the nape physics engine.
 *
 * Stores contact point data (position, distance, hash, stamp, etc.) and
 * manages a lazy Vec2 position wrapper. Also acts as a linked list
 * node/container (Haxe ZNPList pattern). Each contact holds a reference to
 * a ZPP_IContact for impulse/mass data.
 *
 * Converted from nape-compiled.js lines 31853–32345, 81644–81645.
 */

import { ZPP_IContact } from "./ZPP_IContact";

type Any = any;

export class ZPP_Contact {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "dynamics", "ZPP_Contact"];

  // --- Static: namespace references (set during registration) ---
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Static: object pool ---
  static zpp_pool: ZPP_Contact | null = null;

  // --- Static: creation guard for Contact wrapper ---
  static internal = false;

  // --- Static: wrapper factory callback (set by Contact.ts) ---
  static _wrapFn: ((zpp: ZPP_Contact) => Any) | null = null;

  // --- Instance: public wrapper ---
  outer: Any = null;

  // --- Instance: contact position ---
  px = 0.0;
  py = 0.0;

  // --- Instance: lazy Vec2 position wrapper ---
  wrap_position: Any = null;

  // --- Instance: arbiter reference (ZPP_ColArbiter, not yet extracted) ---
  arbiter: Any = null;

  // --- Instance: inner impulse data ---
  inner: ZPP_IContact;

  // --- Instance: contact state ---
  active = false;
  posOnly = false;
  stamp = 0;
  hash = 0;
  fresh = false;
  dist = 0.0;
  elasticity = 0.0;

  // --- Instance: linked list (ZNPList pattern) ---
  length = 0;
  pushmod = false;
  modified = false;
  _inuse = false;
  next: ZPP_Contact | null = null;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_Contact;

  constructor() {
    this.length = 0;
    this.pushmod = false;
    this.modified = false;
    this._inuse = false;
    this.next = null;
    this.elasticity = 0.0;
    this.dist = 0.0;
    this.fresh = false;
    this.hash = 0;
    this.stamp = 0;
    this.posOnly = false;
    this.active = false;
    this.inner = null as any;
    this.arbiter = null;
    this.wrap_position = null;
    this.py = 0.0;
    this.px = 0.0;
    this.outer = null;
    this.inner = new ZPP_IContact();
  }

  // ========== Wrapper ==========

  wrapper(): Any {
    if (this.outer == null) {
      if (ZPP_Contact._wrapFn) {
        this.outer = ZPP_Contact._wrapFn(this);
      } else {
        // Legacy fallback: create wrapper via compiled namespace
        ZPP_Contact.internal = true;
        this.outer = new ZPP_Contact._nape.dynamics.Contact();
        ZPP_Contact.internal = false;
        this.outer.zpp_inner = this;
      }
    }
    return this.outer;
  }

  // ========== Position handling ==========

  position_validate(): void {
    if (this.inactiveme()) {
      throw new Error("Error: Contact not currently in use");
    }
    this.wrap_position.zpp_inner.x = this.px;
    this.wrap_position.zpp_inner.y = this.py;
  }

  getposition(): void {
    const zpp = ZPP_Contact._zpp;
    const napeNs = ZPP_Contact._nape;

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
      ret1.x = 0;
      ret1.y = 0;
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
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == 0) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        tmp = ret.zpp_inner.y == 0;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = 0;
        ret.zpp_inner.y = 0;
        const _this3 = ret.zpp_inner;
        if (_this3._invalidate != null) {
          _this3._invalidate(_this3);
        }
      }
    }
    ret.zpp_inner.weak = false;
    this.wrap_position = ret;
    this.wrap_position.zpp_inner._inuse = true;
    this.wrap_position.zpp_inner._immutable = true;
    this.wrap_position.zpp_inner._validate = this.position_validate.bind(this);
  }

  // ========== Active check ==========

  inactiveme(): boolean {
    return !(this.active && this.arbiter != null && !!this.arbiter.active);
  }

  // ========== Pool management ==========

  free(): void {
    this.arbiter = null;
  }

  alloc(): void {}

  // ========== Linked list methods (ZNPList pattern) ==========

  elem(): this {
    return this;
  }

  begin(): ZPP_Contact | null {
    return this.next;
  }

  setbegin(i: ZPP_Contact | null): void {
    this.next = i;
    this.modified = true;
    this.pushmod = true;
  }

  add(o: ZPP_Contact): ZPP_Contact {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  inlined_add(o: ZPP_Contact): ZPP_Contact {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  addAll(x: ZPP_Contact): void {
    let cx_ite = x.next;
    while (cx_ite != null) {
      const i = cx_ite;
      this.add(i);
      cx_ite = cx_ite.next;
    }
  }

  insert(cur: ZPP_Contact | null, o: ZPP_Contact): ZPP_Contact {
    o._inuse = true;
    const temp = o;
    if (cur == null) {
      temp.next = this.next;
      this.next = temp;
    } else {
      temp.next = cur.next;
      cur.next = temp;
    }
    this.pushmod = this.modified = true;
    this.length++;
    return temp;
  }

  inlined_insert(cur: ZPP_Contact | null, o: ZPP_Contact): ZPP_Contact {
    o._inuse = true;
    const temp = o;
    if (cur == null) {
      temp.next = this.next;
      this.next = temp;
    } else {
      temp.next = cur.next;
      cur.next = temp;
    }
    this.pushmod = this.modified = true;
    this.length++;
    return temp;
  }

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

  inlined_pop(): void {
    const ret = this.next!;
    this.next = ret.next;
    ret._inuse = false;
    if (this.next == null) {
      this.pushmod = true;
    }
    this.modified = true;
    this.length--;
  }

  pop_unsafe(): ZPP_Contact {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  inlined_pop_unsafe(): ZPP_Contact {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  remove(obj: ZPP_Contact): void {
    let pre: ZPP_Contact | null = null;
    let cur: ZPP_Contact | null = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_Contact;
        let ret: ZPP_Contact | null;
        if (pre == null) {
          old = this.next!;
          ret = old.next;
          this.next = ret;
          if (this.next == null) {
            this.pushmod = true;
          }
        } else {
          old = pre.next!;
          ret = old.next;
          pre.next = ret;
          if (ret == null) {
            this.pushmod = true;
          }
        }
        old._inuse = false;
        this.modified = true;
        this.length--;
        this.pushmod = true;
        break;
      }
      pre = cur;
      cur = cur.next;
    }
  }

  try_remove(obj: ZPP_Contact): boolean {
    let pre: ZPP_Contact | null = null;
    let cur: ZPP_Contact | null = this.next;
    let ret = false;
    while (cur != null) {
      if (cur == obj) {
        this.erase(pre);
        ret = true;
        break;
      }
      pre = cur;
      cur = cur.next;
    }
    return ret;
  }

  inlined_remove(obj: ZPP_Contact): void {
    let pre: ZPP_Contact | null = null;
    let cur: ZPP_Contact | null = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_Contact;
        let ret: ZPP_Contact | null;
        if (pre == null) {
          old = this.next!;
          ret = old.next;
          this.next = ret;
          if (this.next == null) {
            this.pushmod = true;
          }
        } else {
          old = pre.next!;
          ret = old.next;
          pre.next = ret;
          if (ret == null) {
            this.pushmod = true;
          }
        }
        old._inuse = false;
        this.modified = true;
        this.length--;
        this.pushmod = true;
        break;
      }
      pre = cur;
      cur = cur.next;
    }
  }

  inlined_try_remove(obj: ZPP_Contact): boolean {
    let pre: ZPP_Contact | null = null;
    let cur: ZPP_Contact | null = this.next;
    let ret = false;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_Contact;
        let ret1: ZPP_Contact | null;
        if (pre == null) {
          old = this.next!;
          ret1 = old.next;
          this.next = ret1;
          if (this.next == null) {
            this.pushmod = true;
          }
        } else {
          old = pre.next!;
          ret1 = old.next;
          pre.next = ret1;
          if (ret1 == null) {
            this.pushmod = true;
          }
        }
        old._inuse = false;
        this.modified = true;
        this.length--;
        this.pushmod = true;
        ret = true;
        break;
      }
      pre = cur;
      cur = cur.next;
    }
    return ret;
  }

  erase(pre: ZPP_Contact | null): ZPP_Contact | null {
    let old: ZPP_Contact;
    let ret: ZPP_Contact | null;
    if (pre == null) {
      old = this.next!;
      ret = old.next;
      this.next = ret;
      if (this.next == null) {
        this.pushmod = true;
      }
    } else {
      old = pre.next!;
      ret = old.next;
      pre.next = ret;
      if (ret == null) {
        this.pushmod = true;
      }
    }
    old._inuse = false;
    this.modified = true;
    this.length--;
    this.pushmod = true;
    return ret;
  }

  inlined_erase(pre: ZPP_Contact | null): ZPP_Contact | null {
    let old: ZPP_Contact;
    let ret: ZPP_Contact | null;
    if (pre == null) {
      old = this.next!;
      ret = old.next;
      this.next = ret;
      if (this.next == null) {
        this.pushmod = true;
      }
    } else {
      old = pre.next!;
      ret = old.next;
      pre.next = ret;
      if (ret == null) {
        this.pushmod = true;
      }
    }
    old._inuse = false;
    this.modified = true;
    this.length--;
    this.pushmod = true;
    return ret;
  }

  splice(pre: ZPP_Contact, n: number): ZPP_Contact | null {
    while (n-- > 0 && pre.next != null) this.erase(pre);
    return pre.next;
  }

  clear(): void {}
  inlined_clear(): void {}

  reverse(): void {
    let cur: ZPP_Contact | null = this.next;
    let pre: ZPP_Contact | null = null;
    while (cur != null) {
      const nx = cur.next;
      cur.next = pre;
      this.next = cur;
      pre = cur;
      cur = nx;
    }
    this.modified = true;
    this.pushmod = true;
  }

  empty(): boolean {
    return this.next == null;
  }

  size(): number {
    return this.length;
  }

  has(obj: ZPP_Contact): boolean {
    let ret = false;
    let cx_ite: ZPP_Contact | null = this.next;
    while (cx_ite != null) {
      const npite = cx_ite;
      if (npite == obj) {
        ret = true;
        break;
      }
      cx_ite = cx_ite.next;
    }
    return ret;
  }

  inlined_has(obj: ZPP_Contact): boolean {
    let ret = false;
    let cx_ite: ZPP_Contact | null = this.next;
    while (cx_ite != null) {
      const npite = cx_ite;
      if (npite == obj) {
        ret = true;
        break;
      }
      cx_ite = cx_ite.next;
    }
    return ret;
  }

  front(): ZPP_Contact | null {
    return this.next;
  }

  back(): ZPP_Contact | null {
    let ret: ZPP_Contact | null = this.next;
    let cur = ret;
    while (cur != null) {
      ret = cur;
      cur = cur.next;
    }
    return ret;
  }

  iterator_at(ind: number): ZPP_Contact | null {
    let ret: ZPP_Contact | null = this.next;
    while (ind-- > 0 && ret != null) ret = ret.next;
    return ret;
  }

  at(ind: number): ZPP_Contact | null {
    const it = this.iterator_at(ind);
    if (it != null) {
      return it;
    } else {
      return null;
    }
  }
}
