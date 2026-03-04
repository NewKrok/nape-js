/**
 * ZPP_Island — Internal island container for sleeping/waking groups.
 *
 * Acts as both a container (with comps list of ZPP_Component) and
 * an intrusive linked list of ZPP_Component nodes (ZNPList pattern).
 * Used by the space to group connected bodies/constraints for sleep detection.
 *
 * Converted from nape-compiled.js lines 33175–33539.
 */

type Any = any;

export class ZPP_Island {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_Island"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_Island | null = null;

  // --- Static: namespace references ---
  static _zpp: Any = null;

  // --- Instance: linked list (ZNPList pattern for ZPP_Component) ---
  length = 0;
  pushmod = false;
  modified = false;
  _inuse = false;
  next: Any = null;

  // --- Instance: island-specific fields ---
  comps: Any = null;
  sleep = false;
  waket = 0;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_Island;

  constructor() {
    this.comps = new ZPP_Island._zpp.util.ZNPList_ZPP_Component();
  }

  // ========== Linked list methods (ZNPList pattern) ==========

  elem(): this {
    return this;
  }

  begin(): Any {
    return this.next;
  }

  setbegin(i: Any): void {
    this.next = i;
    this.modified = true;
    this.pushmod = true;
  }

  add(o: Any): Any {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  inlined_add(o: Any): Any {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  addAll(x: Any): void {
    let cx_ite = x.next;
    while (cx_ite != null) {
      const i = cx_ite;
      this.add(i);
      cx_ite = cx_ite.next;
    }
  }

  insert(cur: Any, o: Any): Any {
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

  inlined_insert(cur: Any, o: Any): Any {
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
    const ret = this.next;
    this.next = ret.next;
    ret._inuse = false;
    if (this.next == null) {
      this.pushmod = true;
    }
    this.modified = true;
    this.length--;
  }

  inlined_pop(): void {
    const ret = this.next;
    this.next = ret.next;
    ret._inuse = false;
    if (this.next == null) {
      this.pushmod = true;
    }
    this.modified = true;
    this.length--;
  }

  pop_unsafe(): Any {
    const ret = this.next;
    this.pop();
    return ret;
  }

  inlined_pop_unsafe(): Any {
    const ret = this.next;
    this.pop();
    return ret;
  }

  remove(obj: Any): void {
    let pre: Any = null;
    let cur: Any = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: Any;
        let ret: Any;
        if (pre == null) {
          old = this.next;
          ret = old.next;
          this.next = ret;
          if (this.next == null) {
            this.pushmod = true;
          }
        } else {
          old = pre.next;
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

  try_remove(obj: Any): boolean {
    let pre: Any = null;
    let cur: Any = this.next;
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

  inlined_remove(obj: Any): void {
    let pre: Any = null;
    let cur: Any = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: Any;
        let ret: Any;
        if (pre == null) {
          old = this.next;
          ret = old.next;
          this.next = ret;
          if (this.next == null) {
            this.pushmod = true;
          }
        } else {
          old = pre.next;
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

  inlined_try_remove(obj: Any): boolean {
    let pre: Any = null;
    let cur: Any = this.next;
    let ret = false;
    while (cur != null) {
      if (cur == obj) {
        let old: Any;
        let ret1: Any;
        if (pre == null) {
          old = this.next;
          ret1 = old.next;
          this.next = ret1;
          if (this.next == null) {
            this.pushmod = true;
          }
        } else {
          old = pre.next;
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

  erase(pre: Any): Any {
    let old: Any;
    let ret: Any;
    if (pre == null) {
      old = this.next;
      ret = old.next;
      this.next = ret;
      if (this.next == null) {
        this.pushmod = true;
      }
    } else {
      old = pre.next;
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

  inlined_erase(pre: Any): Any {
    let old: Any;
    let ret: Any;
    if (pre == null) {
      old = this.next;
      ret = old.next;
      this.next = ret;
      if (this.next == null) {
        this.pushmod = true;
      }
    } else {
      old = pre.next;
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

  splice(pre: Any, n: number): Any {
    while (n-- > 0 && pre.next != null) this.erase(pre);
    return pre.next;
  }

  clear(): void {}
  inlined_clear(): void {}

  reverse(): void {
    let cur: Any = this.next;
    let pre: Any = null;
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

  has(obj: Any): boolean {
    let ret = false;
    let cx_ite = this.next;
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

  inlined_has(obj: Any): boolean {
    let ret = false;
    let cx_ite = this.next;
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

  front(): Any {
    return this.next;
  }

  back(): Any {
    let ret = this.next;
    let cur = ret;
    while (cur != null) {
      ret = cur;
      cur = cur.next;
    }
    return ret;
  }

  iterator_at(ind: number): Any {
    let ret = this.next;
    while (ind-- > 0 && ret != null) ret = ret.next;
    return ret;
  }

  at(ind: number): Any {
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
