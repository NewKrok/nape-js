/**
 * ZPP_IContact — Internal impulse/mass-matrix data for a contact point.
 *
 * Stores relative positions (r1, r2), mass matrices (nMass, tMass),
 * accumulated impulses (jnAcc, jtAcc), and friction/bounce coefficients.
 * Also acts as a linked list node/container (Haxe ZNPList pattern).
 *
 * Converted from nape-compiled.js lines 32346–32733.
 */

type Any = any;

export class ZPP_IContact {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "dynamics", "ZPP_IContact"];

  // --- Instance: linked list (ZNPList pattern) ---
  length = 0;
  pushmod = false;
  modified = false;
  _inuse = false;
  next: ZPP_IContact | null = null;

  // --- Instance: relative positions ---
  r1x = 0.0;
  r1y = 0.0;
  r2x = 0.0;
  r2y = 0.0;

  // --- Instance: mass matrices ---
  nMass = 0.0;
  tMass = 0.0;

  // --- Instance: coefficients ---
  bounce = 0.0;
  friction = 0.0;

  // --- Instance: accumulated impulses ---
  jnAcc = 0.0;
  jtAcc = 0.0;

  // --- Instance: last-frame relative positions ---
  lr1x = 0.0;
  lr1y = 0.0;
  lr2x = 0.0;
  lr2y = 0.0;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_IContact;

  // ========== Linked list methods (ZNPList pattern) ==========

  elem(): this {
    return this;
  }

  begin(): ZPP_IContact | null {
    return this.next;
  }

  setbegin(i: ZPP_IContact | null): void {
    this.next = i;
    this.modified = true;
    this.pushmod = true;
  }

  add(o: ZPP_IContact): ZPP_IContact {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  inlined_add(o: ZPP_IContact): ZPP_IContact {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  addAll(x: ZPP_IContact): void {
    let cx_ite = x.next;
    while (cx_ite != null) {
      const i = cx_ite;
      this.add(i);
      cx_ite = cx_ite.next;
    }
  }

  insert(cur: ZPP_IContact | null, o: ZPP_IContact): ZPP_IContact {
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

  inlined_insert(cur: ZPP_IContact | null, o: ZPP_IContact): ZPP_IContact {
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

  pop_unsafe(): ZPP_IContact {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  inlined_pop_unsafe(): ZPP_IContact {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  remove(obj: ZPP_IContact): void {
    let pre: ZPP_IContact | null = null;
    let cur: ZPP_IContact | null = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_IContact;
        let ret: ZPP_IContact | null;
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

  try_remove(obj: ZPP_IContact): boolean {
    let pre: ZPP_IContact | null = null;
    let cur: ZPP_IContact | null = this.next;
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

  inlined_remove(obj: ZPP_IContact): void {
    let pre: ZPP_IContact | null = null;
    let cur: ZPP_IContact | null = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_IContact;
        let ret: ZPP_IContact | null;
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

  inlined_try_remove(obj: ZPP_IContact): boolean {
    let pre: ZPP_IContact | null = null;
    let cur: ZPP_IContact | null = this.next;
    let ret = false;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_IContact;
        let ret1: ZPP_IContact | null;
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

  erase(pre: ZPP_IContact | null): ZPP_IContact | null {
    let old: ZPP_IContact;
    let ret: ZPP_IContact | null;
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

  inlined_erase(pre: ZPP_IContact | null): ZPP_IContact | null {
    let old: ZPP_IContact;
    let ret: ZPP_IContact | null;
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

  splice(pre: ZPP_IContact, n: number): ZPP_IContact | null {
    while (n-- > 0 && pre.next != null) this.erase(pre);
    return pre.next;
  }

  clear(): void {}
  inlined_clear(): void {}

  reverse(): void {
    let cur: ZPP_IContact | null = this.next;
    let pre: ZPP_IContact | null = null;
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

  has(obj: ZPP_IContact): boolean {
    let ret = false;
    let cx_ite: ZPP_IContact | null = this.next;
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

  inlined_has(obj: ZPP_IContact): boolean {
    let ret = false;
    let cx_ite: ZPP_IContact | null = this.next;
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

  front(): ZPP_IContact | null {
    return this.next;
  }

  back(): ZPP_IContact | null {
    let ret: ZPP_IContact | null = this.next;
    let cur = ret;
    while (cur != null) {
      ret = cur;
      cur = cur.next;
    }
    return ret;
  }

  iterator_at(ind: number): ZPP_IContact | null {
    let ret: ZPP_IContact | null = this.next;
    while (ind-- > 0 && ret != null) ret = ret.next;
    return ret;
  }

  at(ind: number): ZPP_IContact | null {
    const it = this.iterator_at(ind);
    if (it != null) {
      return it;
    } else {
      return null;
    }
  }
}
