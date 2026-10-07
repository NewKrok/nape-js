/**
 * ZPP_Contact — Internal contact point representation for the nape physics engine.
 *
 * Stores contact point data (position, distance, hash, stamp, etc.) and
 * manages a lazy Vec2 position wrapper. Also acts as a linked list
 * node/container (Haxe ZNPList pattern). Each contact holds a reference to
 * a ZPP_IContact for impulse/mass data.
 */

import { ZPP_IContact } from "./ZPP_IContact";

export class ZPP_Contact {
  // --- Static: namespace references (set during registration) ---
  static _nape: any = null;

  // --- Static: object pool ---
  static zpp_pool: ZPP_Contact | null = null;

  // --- Static: creation guard for Contact wrapper ---
  static internal = false;

  // --- Static: wrapper factory callback (set by Contact.ts) ---
  static _wrapFn: ((zpp: ZPP_Contact) => any) | null = null;

  // --- Instance: public wrapper ---
  outer: any = null;

  // --- Instance: contact position ---
  px = 0.0;
  py = 0.0;

  // --- Instance: lazy Vec2 position wrapper ---
  wrap_position: any = null;

  // --- Instance: arbiter reference (ZPP_ColArbiter) ---
  arbiter: any = null;

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

  wrapper(): any {
    if (this.outer == null) {
      this.outer = ZPP_Contact._wrapFn!(this);
    }
    return this.outer;
  }

  // ========== Position handling ==========

  position_validate(): void {
    if (this.inactiveme()) {
      throw new Error("Contact not currently in use");
    }
    this.wrap_position.zpp_inner.x = this.px;
    this.wrap_position.zpp_inner.y = this.py;
  }

  getposition(): void {
    const napeNs = ZPP_Contact._nape;

    const ret = napeNs.geom.Vec2.get(0, 0);
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

  // ========== Linked list methods (ZNPList pattern) ==========

  add(o: ZPP_Contact): ZPP_Contact {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
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

  pop_unsafe(): ZPP_Contact {
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

  clear(): void {}

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
