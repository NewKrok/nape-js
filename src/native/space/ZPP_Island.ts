/**
 * ZPP_Island — Internal island container for sleeping/waking groups.
 *
 * Acts as both a container (with comps list of ZPP_Component) and
 * an intrusive linked list of ZPP_Component nodes (ZNPList pattern).
 * Used by the space to group connected bodies/constraints for sleep detection.
 *
 * Converted from nape-compiled.js lines 33175–33539.
 */

import { ZPP_Component } from "./ZPP_Component";

export class ZPP_Island {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_Island"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_Island | null = null;

  // --- Static: namespace references ---
  static _zpp: any = null;

  // --- Instance: linked list (ZNPList pattern for ZPP_Component) ---
  length = 0;
  pushmod = false;
  modified = false;
  _inuse = false;
  next: ZPP_Component | null = null;

  // --- Instance: island-specific fields ---
  comps: any = null; // ZNPList_ZPP_Component — dynamic class
  sleep = false;
  waket = 0;

  constructor() {
    this.comps = new ZPP_Island._zpp.util.ZNPList_ZPP_Component();
  }

  // ========== Linked list methods (ZNPList pattern) ==========

  elem(): this {
    return this;
  }

  begin(): ZPP_Component | null {
    return this.next;
  }

  setbegin(i: ZPP_Component | null): void {
    this.next = i;
    this.modified = true;
    this.pushmod = true;
  }

  add(o: ZPP_Component): ZPP_Component {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  inlined_add(o: ZPP_Component): ZPP_Component {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  addAll(x: ZPP_Island): void {
    let cx_ite = x.next;
    while (cx_ite != null) {
      const i = cx_ite;
      this.add(i);
      cx_ite = cx_ite.next;
    }
  }

  insert(cur: ZPP_Component | null, o: ZPP_Component): ZPP_Component {
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

  inlined_insert(cur: ZPP_Component | null, o: ZPP_Component): ZPP_Component {
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

  pop_unsafe(): ZPP_Component {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  inlined_pop_unsafe(): ZPP_Component {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  remove(obj: ZPP_Component): void {
    let pre: ZPP_Component | null = null;
    let cur: ZPP_Component | null = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_Component;
        let ret: ZPP_Component | null;
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

  try_remove(obj: ZPP_Component): boolean {
    let pre: ZPP_Component | null = null;
    let cur: ZPP_Component | null = this.next;
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

  inlined_remove(obj: ZPP_Component): void {
    let pre: ZPP_Component | null = null;
    let cur: ZPP_Component | null = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_Component;
        let ret: ZPP_Component | null;
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

  inlined_try_remove(obj: ZPP_Component): boolean {
    let pre: ZPP_Component | null = null;
    let cur: ZPP_Component | null = this.next;
    let ret = false;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_Component;
        let ret1: ZPP_Component | null;
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

  erase(pre: ZPP_Component | null): ZPP_Component | null {
    let old: ZPP_Component;
    let ret: ZPP_Component | null;
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

  inlined_erase(pre: ZPP_Component | null): ZPP_Component | null {
    let old: ZPP_Component;
    let ret: ZPP_Component | null;
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

  splice(pre: ZPP_Component | null, n: number): ZPP_Component | null {
    while (n-- > 0 && pre!.next != null) this.erase(pre);
    return pre!.next;
  }

  clear(): void {}
  inlined_clear(): void {}

  reverse(): void {
    let cur: ZPP_Component | null = this.next;
    let pre: ZPP_Component | null = null;
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

  has(obj: ZPP_Component): boolean {
    let ret = false;
    let cx_ite: ZPP_Component | null = this.next;
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

  inlined_has(obj: ZPP_Component): boolean {
    let ret = false;
    let cx_ite: ZPP_Component | null = this.next;
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

  front(): ZPP_Component | null {
    return this.next;
  }

  back(): ZPP_Component | null {
    let ret: ZPP_Component | null = this.next;
    let cur = ret;
    while (cur != null) {
      ret = cur;
      cur = cur.next;
    }
    return ret;
  }

  iterator_at(ind: number): ZPP_Component | null {
    let ret: ZPP_Component | null = this.next;
    while (ind-- > 0 && ret != null) ret = ret.next;
    return ret;
  }

  at(ind: number): ZPP_Component | null {
    const it = this.iterator_at(ind);
    if (it != null) {
      return it;
    } else {
      return null;
    }
  }

  // ========== Pool callbacks ==========

  free(): void {}

  alloc(): void {
    this.waket = 0;
  }
}
