/**
 * ZPP_IContact — Internal impulse/mass-matrix data for a contact point.
 *
 * Stores relative positions (r1, r2), mass matrices (nMass, tMass),
 * accumulated impulses (jnAcc, jtAcc), and friction/bounce coefficients.
 * Also acts as a linked list node/container (Haxe ZNPList pattern).
 *
 * Converted from nape-compiled.js lines 32346–32733.
 */

export class ZPP_IContact {
  // --- Static: Haxe metadata ---

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

  // ========== Linked list methods (ZNPList pattern) ==========

  begin(): ZPP_IContact | null {
    return this.next;
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

  pop_unsafe(): ZPP_IContact {
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

  clear(): void {}

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
