/**
 * ZPP_CallbackSet — Internal callback set for tracking interactor pair state.
 *
 * Tracks interaction state (COLLISION, SENSOR, FLUID) between two interactors.
 * Maintains a list of arbiters and acts as an intrusive linked list node.
 * Used by ZPP_Space to manage callback state across simulation steps.
 *
 * Converted from nape-compiled.js lines 33586–34153.
 */

export class ZPP_CallbackSet {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_CallbackSet"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_CallbackSet | null = null;

  // --- Static: namespace references ---
  static _zpp: any = null;

  // --- Instance: pair identification ---
  id = 0;
  di = 0;
  int1: any = null; // ZPP_Interactor — circular
  int2: any = null; // ZPP_Interactor — circular

  // --- Instance: arbiter list ---
  arbiters: any = null; // ZNPList_ZPP_Arbiter — dynamic class

  // --- Instance: interaction state ---
  COLLISIONstate: number | null = null;
  COLLISIONstamp: number | null = null;
  SENSORstate: number | null = null;
  SENSORstamp: number | null = null;
  FLUIDstate: number | null = null;
  FLUIDstamp: number | null = null;

  // --- Instance: linked list (ZNPList pattern) ---
  length = 0;
  pushmod = false;
  modified = false;
  _inuse = false;
  next: ZPP_CallbackSet | null = null;

  // --- Instance: lifecycle ---
  freed = false;
  lazydel = false;

  constructor() {
    this.arbiters = new ZPP_CallbackSet._zpp.util.ZNPList_ZPP_Arbiter();
  }

  // ========== Static factory ==========

  static get(i1: any, i2: any): ZPP_CallbackSet {
    let ret: ZPP_CallbackSet;
    if (ZPP_CallbackSet.zpp_pool == null) {
      ret = new ZPP_CallbackSet();
    } else {
      ret = ZPP_CallbackSet.zpp_pool;
      ZPP_CallbackSet.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.freed = false;
    ret.lazydel = false;
    ret.COLLISIONstate = 1;
    ret.COLLISIONstamp = 0;
    ret.SENSORstate = 1;
    ret.SENSORstamp = 0;
    ret.FLUIDstate = 1;
    ret.FLUIDstamp = 0;
    if (i1.id < i2.id) {
      ret.int1 = i1;
      ret.int2 = i2;
    } else {
      ret.int1 = i2;
      ret.int2 = i1;
    }
    ret.id = ret.int1.id;
    ret.di = ret.int2.id;
    return ret;
  }

  // ========== Linked list methods (ZNPList pattern) ==========

  elem(): this {
    return this;
  }

  begin(): ZPP_CallbackSet | null {
    return this.next;
  }

  setbegin(i: ZPP_CallbackSet | null): void {
    this.next = i;
    this.modified = true;
    this.pushmod = true;
  }

  add(o: ZPP_CallbackSet): ZPP_CallbackSet {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  inlined_add(o: ZPP_CallbackSet): ZPP_CallbackSet {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  addAll(x: ZPP_CallbackSet): void {
    let cx_ite: ZPP_CallbackSet | null = x.next;
    while (cx_ite != null) {
      const i = cx_ite;
      this.add(i);
      cx_ite = cx_ite.next;
    }
  }

  insert(cur: ZPP_CallbackSet | null, o: ZPP_CallbackSet): ZPP_CallbackSet {
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

  inlined_insert(cur: ZPP_CallbackSet | null, o: ZPP_CallbackSet): ZPP_CallbackSet {
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

  pop_unsafe(): ZPP_CallbackSet {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  inlined_pop_unsafe(): ZPP_CallbackSet {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  remove(obj: ZPP_CallbackSet): void {
    let pre: ZPP_CallbackSet | null = null;
    let cur: ZPP_CallbackSet | null = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_CallbackSet;
        let ret: ZPP_CallbackSet | null;
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

  try_remove(obj: ZPP_CallbackSet): boolean {
    let pre: ZPP_CallbackSet | null = null;
    let cur: ZPP_CallbackSet | null = this.next;
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

  inlined_remove(obj: ZPP_CallbackSet): void {
    let pre: ZPP_CallbackSet | null = null;
    let cur: ZPP_CallbackSet | null = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_CallbackSet;
        let ret: ZPP_CallbackSet | null;
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

  inlined_try_remove(obj: ZPP_CallbackSet): boolean {
    let pre: ZPP_CallbackSet | null = null;
    let cur: ZPP_CallbackSet | null = this.next;
    let ret = false;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_CallbackSet;
        let ret1: ZPP_CallbackSet | null;
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

  erase(pre: ZPP_CallbackSet | null): ZPP_CallbackSet | null {
    let old: ZPP_CallbackSet;
    let ret: ZPP_CallbackSet | null;
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

  inlined_erase(pre: ZPP_CallbackSet | null): ZPP_CallbackSet | null {
    let old: ZPP_CallbackSet;
    let ret: ZPP_CallbackSet | null;
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

  splice(pre: ZPP_CallbackSet, n: number): ZPP_CallbackSet | null {
    while (n-- > 0 && pre.next != null) this.erase(pre);
    return pre.next;
  }

  clear(): void {}
  inlined_clear(): void {}

  reverse(): void {
    let cur: ZPP_CallbackSet | null = this.next;
    let pre: ZPP_CallbackSet | null = null;
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

  has(obj: ZPP_CallbackSet): boolean {
    let ret = false;
    let cx_ite: ZPP_CallbackSet | null = this.next;
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

  inlined_has(obj: ZPP_CallbackSet): boolean {
    let ret = false;
    let cx_ite: ZPP_CallbackSet | null = this.next;
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

  front(): ZPP_CallbackSet | null {
    return this.next;
  }

  back(): ZPP_CallbackSet | null {
    let ret: ZPP_CallbackSet | null = this.next;
    let cur = ret;
    while (cur != null) {
      ret = cur;
      cur = cur.next;
    }
    return ret;
  }

  iterator_at(ind: number): ZPP_CallbackSet | null {
    let ret: ZPP_CallbackSet | null = this.next;
    while (ind-- > 0 && ret != null) ret = ret.next;
    return ret;
  }

  at(ind: number): ZPP_CallbackSet | null {
    const it = this.iterator_at(ind);
    if (it != null) {
      return it;
    } else {
      return null;
    }
  }

  // ========== Pool callbacks ==========

  free(): void {
    this.int1 = this.int2 = null;
    this.id = this.di = -1;
    this.freed = true;
  }

  alloc(): void {
    this.freed = false;
    this.lazydel = false;
    this.COLLISIONstate = 1;
    this.COLLISIONstamp = 0;
    this.SENSORstate = 1;
    this.SENSORstamp = 0;
    this.FLUIDstate = 1;
    this.FLUIDstamp = 0;
  }

  // ========== Arbiter management ==========

  add_arb(x: any): boolean {
    let ret = false;
    let cx_ite = this.arbiters.head;
    while (cx_ite != null) {
      const npite = cx_ite.elt;
      if (npite == x) {
        ret = true;
        break;
      }
      cx_ite = cx_ite.next;
    }
    if (!ret) {
      const _this = this.arbiters;
      let ret1: any;
      const ZNPNode = ZPP_CallbackSet._zpp.util.ZNPNode_ZPP_Arbiter;
      if (ZNPNode.zpp_pool == null) {
        ret1 = new ZNPNode();
      } else {
        ret1 = ZNPNode.zpp_pool;
        ZNPNode.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.elt = x;
      const temp = ret1;
      temp.next = _this.head;
      _this.head = temp;
      _this.modified = true;
      _this.length++;
      return true;
    } else {
      return false;
    }
  }

  try_remove_arb(x: any): boolean {
    const _this = this.arbiters;
    let pre: any = null;
    let cur = _this.head;
    let ret = false;
    while (cur != null) {
      if (cur.elt == x) {
        let old: any;
        let ret1: any;
        if (pre == null) {
          old = _this.head;
          ret1 = old.next;
          _this.head = ret1;
          if (_this.head == null) {
            _this.pushmod = true;
          }
        } else {
          old = pre.next;
          ret1 = old.next;
          pre.next = ret1;
          if (ret1 == null) {
            _this.pushmod = true;
          }
        }
        const o = old;
        o.elt = null;
        const ZNPNode = ZPP_CallbackSet._zpp.util.ZNPNode_ZPP_Arbiter;
        o.next = ZNPNode.zpp_pool;
        ZNPNode.zpp_pool = o;
        _this.modified = true;
        _this.length--;
        _this.pushmod = true;
        ret = true;
        break;
      }
      pre = cur;
      cur = cur.next;
    }
    return ret;
  }

  remove_arb(x: any): void {
    const _this = this.arbiters;
    let pre: any = null;
    let cur = _this.head;
    while (cur != null) {
      if (cur.elt == x) {
        let old: any;
        let ret1: any;
        if (pre == null) {
          old = _this.head;
          ret1 = old.next;
          _this.head = ret1;
          if (_this.head == null) {
            _this.pushmod = true;
          }
        } else {
          old = pre.next;
          ret1 = old.next;
          pre.next = ret1;
          if (ret1 == null) {
            _this.pushmod = true;
          }
        }
        const o = old;
        o.elt = null;
        const ZNPNode = ZPP_CallbackSet._zpp.util.ZNPNode_ZPP_Arbiter;
        o.next = ZNPNode.zpp_pool;
        ZNPNode.zpp_pool = o;
        _this.modified = true;
        _this.length--;
        _this.pushmod = true;
        break;
      }
      pre = cur;
      cur = cur.next;
    }
  }

  empty_arb(type: number): boolean {
    let retvar = true;
    let cx_ite = this.arbiters.head;
    while (cx_ite != null) {
      const x = cx_ite.elt;
      if ((x.type & type) == 0) {
        cx_ite = cx_ite.next;
        continue;
      } else {
        retvar = false;
        break;
      }
    }
    return retvar;
  }

  really_empty(): boolean {
    return this.arbiters.head == null;
  }

  sleeping(): boolean {
    let ret = true;
    let cx_ite = this.arbiters.head;
    while (cx_ite != null) {
      const x = cx_ite.elt;
      if (x.sleeping) {
        cx_ite = cx_ite.next;
        continue;
      } else {
        ret = false;
        break;
      }
    }
    return ret;
  }
}
