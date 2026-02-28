/**
 * ZPP_Vec2 — Internal 2D vector AND intrusive linked list for the nape physics engine.
 *
 * Serves three roles simultaneously (Haxe ZNPList template expansion):
 *   1. 2D vector data: x, y coordinates
 *   2. Intrusive linked list container: add/remove/insert/pop (head via `next`)
 *   3. Pooled object with wrapper/validation pattern
 *
 * Converted from nape-compiled.js lines 83820–84273, 134996.
 */

type Any = any;

export class ZPP_Vec2 {
  // --- Static: object pool ---
  static zpp_pool: ZPP_Vec2 | null = null;

  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_Vec2"];

  // --- Static: namespace references ---
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Instance: vector data ---
  x = 0.0;
  y = 0.0;

  // --- Instance: linked list ---
  next: ZPP_Vec2 | null = null;
  length = 0;
  modified = false;
  pushmod = false;

  // --- Instance: in-use tracking ---
  _inuse = false;

  // --- Instance: wrapper/pool ---
  weak = false;
  outer: Any = null;

  // --- Instance: immutability ---
  _immutable = false;
  _isimmutable: (() => void) | null = null;

  // --- Instance: validation callbacks ---
  _validate: (() => void) | null = null;
  _invalidate: ((self: ZPP_Vec2) => void) | null = null;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_Vec2;

  /** Static factory with optional pooling and immutability. */
  static get(x: number, y: number, immutable?: boolean): ZPP_Vec2 {
    if (immutable == null) immutable = false;
    let ret: ZPP_Vec2;
    if (ZPP_Vec2.zpp_pool == null) {
      ret = new ZPP_Vec2();
    } else {
      ret = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.weak = false;
    ret._immutable = immutable;
    ret.x = x;
    ret.y = y;
    return ret;
  }

  // ========== Validation / Immutability ==========

  validate(): void {
    if (this._validate != null) this._validate();
  }

  invalidate(): void {
    if (this._invalidate != null) this._invalidate(this);
  }

  immutable(): void {
    if (this._immutable) {
      throw new Error("Error: Vec2 is immutable");
    }
    if (this._isimmutable != null) this._isimmutable();
  }

  // ========== Wrapper / Pool ==========

  wrapper(): Any {
    if (this.outer == null) {
      this.outer = new ZPP_Vec2._nape.geom.Vec2();
      const o = this.outer.zpp_inner;
      if (o.outer != null) {
        o.outer.zpp_inner = null;
        o.outer = null;
      }
      o._isimmutable = null;
      o._validate = null;
      o._invalidate = null;
      o.next = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = o;
      this.outer.zpp_inner = this;
    }
    return this.outer;
  }

  free(): void {
    if (this.outer != null) {
      this.outer.zpp_inner = null;
      this.outer = null;
    }
    this._isimmutable = null;
    this._validate = null;
    this._invalidate = null;
  }

  alloc(): void {
    this.weak = false;
  }

  // ========== Linked list operations ==========
  // ZPP_Vec2 doubles as its own intrusive linked list (Haxe ZNPList pattern).
  // `this.next` acts as the head pointer when the instance is used as a list.

  elem(): ZPP_Vec2 {
    return this;
  }

  begin(): ZPP_Vec2 | null {
    return this.next;
  }

  setbegin(i: ZPP_Vec2 | null): void {
    this.next = i;
    this.modified = true;
    this.pushmod = true;
  }

  add(o: ZPP_Vec2): ZPP_Vec2 {
    o._inuse = true;
    o.next = this.next;
    this.next = o;
    this.modified = true;
    this.length++;
    return o;
  }

  inlined_add(o: ZPP_Vec2): ZPP_Vec2 {
    o._inuse = true;
    o.next = this.next;
    this.next = o;
    this.modified = true;
    this.length++;
    return o;
  }

  addAll(x: ZPP_Vec2): void {
    let cx_ite = x.next;
    while (cx_ite != null) {
      this.add(cx_ite);
      cx_ite = cx_ite.next;
    }
  }

  insert(cur: ZPP_Vec2 | null, o: ZPP_Vec2): ZPP_Vec2 {
    o._inuse = true;
    if (cur == null) {
      o.next = this.next;
      this.next = o;
    } else {
      o.next = cur.next;
      cur.next = o;
    }
    this.pushmod = this.modified = true;
    this.length++;
    return o;
  }

  inlined_insert(cur: ZPP_Vec2 | null, o: ZPP_Vec2): ZPP_Vec2 {
    o._inuse = true;
    if (cur == null) {
      o.next = this.next;
      this.next = o;
    } else {
      o.next = cur.next;
      cur.next = o;
    }
    this.pushmod = this.modified = true;
    this.length++;
    return o;
  }

  pop(): void {
    const ret = this.next!;
    this.next = ret.next;
    ret._inuse = false;
    if (this.next == null) this.pushmod = true;
    this.modified = true;
    this.length--;
  }

  inlined_pop(): void {
    const ret = this.next!;
    this.next = ret.next;
    ret._inuse = false;
    if (this.next == null) this.pushmod = true;
    this.modified = true;
    this.length--;
  }

  pop_unsafe(): ZPP_Vec2 {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  inlined_pop_unsafe(): ZPP_Vec2 {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  remove(obj: ZPP_Vec2): void {
    let pre: ZPP_Vec2 | null = null;
    let cur = this.next;
    while (cur != null) {
      if (cur === obj) {
        let old: ZPP_Vec2;
        if (pre == null) {
          old = this.next!;
          this.next = old.next;
          if (this.next == null) this.pushmod = true;
        } else {
          old = pre.next!;
          pre.next = old.next;
          if (old.next == null) this.pushmod = true;
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

  try_remove(obj: ZPP_Vec2): boolean {
    let pre: ZPP_Vec2 | null = null;
    let cur = this.next;
    while (cur != null) {
      if (cur === obj) {
        this.erase(pre);
        return true;
      }
      pre = cur;
      cur = cur.next;
    }
    return false;
  }

  inlined_remove(obj: ZPP_Vec2): void {
    let pre: ZPP_Vec2 | null = null;
    let cur = this.next;
    while (cur != null) {
      if (cur === obj) {
        let old: ZPP_Vec2;
        if (pre == null) {
          old = this.next!;
          this.next = old.next;
          if (this.next == null) this.pushmod = true;
        } else {
          old = pre.next!;
          pre.next = old.next;
          if (old.next == null) this.pushmod = true;
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

  inlined_try_remove(obj: ZPP_Vec2): boolean {
    let pre: ZPP_Vec2 | null = null;
    let cur = this.next;
    while (cur != null) {
      if (cur === obj) {
        let old: ZPP_Vec2;
        if (pre == null) {
          old = this.next!;
          this.next = old.next;
          if (this.next == null) this.pushmod = true;
        } else {
          old = pre.next!;
          pre.next = old.next;
          if (old.next == null) this.pushmod = true;
        }
        old._inuse = false;
        this.modified = true;
        this.length--;
        this.pushmod = true;
        return true;
      }
      pre = cur;
      cur = cur.next;
    }
    return false;
  }

  erase(pre: ZPP_Vec2 | null): ZPP_Vec2 | null {
    let old: ZPP_Vec2;
    let ret: ZPP_Vec2 | null;
    if (pre == null) {
      old = this.next!;
      ret = old.next;
      this.next = ret;
      if (this.next == null) this.pushmod = true;
    } else {
      old = pre.next!;
      ret = old.next;
      pre.next = ret;
      if (ret == null) this.pushmod = true;
    }
    old._inuse = false;
    this.modified = true;
    this.length--;
    this.pushmod = true;
    return ret;
  }

  inlined_erase(pre: ZPP_Vec2 | null): ZPP_Vec2 | null {
    let old: ZPP_Vec2;
    let ret: ZPP_Vec2 | null;
    if (pre == null) {
      old = this.next!;
      ret = old.next;
      this.next = ret;
      if (this.next == null) this.pushmod = true;
    } else {
      old = pre.next!;
      ret = old.next;
      pre.next = ret;
      if (ret == null) this.pushmod = true;
    }
    old._inuse = false;
    this.modified = true;
    this.length--;
    this.pushmod = true;
    return ret;
  }

  splice(pre: ZPP_Vec2, n: number): ZPP_Vec2 | null {
    while (n-- > 0 && pre.next != null) this.erase(pre);
    return pre.next;
  }

  clear(): void {}

  inlined_clear(): void {}

  reverse(): void {
    let cur = this.next;
    let pre: ZPP_Vec2 | null = null;
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

  has(obj: ZPP_Vec2): boolean {
    let cx_ite = this.next;
    while (cx_ite != null) {
      if (cx_ite === obj) return true;
      cx_ite = cx_ite.next;
    }
    return false;
  }

  inlined_has(obj: ZPP_Vec2): boolean {
    let cx_ite = this.next;
    while (cx_ite != null) {
      if (cx_ite === obj) return true;
      cx_ite = cx_ite.next;
    }
    return false;
  }

  front(): ZPP_Vec2 | null {
    return this.next;
  }

  back(): ZPP_Vec2 | null {
    let ret = this.next;
    let cur = ret;
    while (cur != null) {
      ret = cur;
      cur = cur.next;
    }
    return ret;
  }

  iterator_at(ind: number): ZPP_Vec2 | null {
    let ret = this.next;
    while (ind-- > 0 && ret != null) ret = ret.next;
    return ret;
  }

  at(ind: number): ZPP_Vec2 | null {
    const it = this.iterator_at(ind);
    return it != null ? it : null;
  }

  // ========== Vector operations ==========

  copy(): ZPP_Vec2 {
    const x = this.x;
    const y = this.y;
    let ret: ZPP_Vec2;
    if (ZPP_Vec2.zpp_pool == null) {
      ret = new ZPP_Vec2();
    } else {
      ret = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.weak = false;
    ret._immutable = false;
    ret.x = x;
    ret.y = y;
    return ret;
  }

  toString(): string {
    return "{ x: " + this.x + " y: " + this.y + " }";
  }
}
