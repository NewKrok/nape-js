/**
 * ZPP_PartitionPair — Internal edge pair for polygon triangulation.
 *
 * Doubles as a linked list node AND an edge pair (a, b) with sorted IDs.
 * Used by the Delaunay optimisation pass in ZPP_Triangular.
 *
 * Converted from nape-compiled.js lines 38764–39176.
 */

export class ZPP_PartitionPair {
  // --- Static: Haxe metadata ---

  // --- Static: object pool ---
  static zpp_pool: ZPP_PartitionPair | null = null;

  // --- Instance fields ---
  node: any = null;
  di = 0;
  id = 0;
  b: any = null;
  a: any = null;
  length = 0;
  pushmod = false;
  modified = false;
  _inuse = false;
  next: ZPP_PartitionPair | null = null;

  // --- Static methods ---

  static get(a: any, b: any): ZPP_PartitionPair {
    let ret: ZPP_PartitionPair;
    if (ZPP_PartitionPair.zpp_pool == null) {
      ret = new ZPP_PartitionPair();
    } else {
      ret = ZPP_PartitionPair.zpp_pool;
      ZPP_PartitionPair.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.a = a;
    ret.b = b;
    if (a.id < b.id) {
      ret.id = a.id;
      ret.di = b.id;
    } else {
      ret.id = b.id;
      ret.di = a.id;
    }
    return ret;
  }

  static edge_swap(a: ZPP_PartitionPair, b: ZPP_PartitionPair): void {
    const t = a.node;
    a.node = b.node;
    b.node = t;
  }

  static edge_lt(a: ZPP_PartitionPair, b: ZPP_PartitionPair): boolean {
    if (a.id >= b.id) {
      if (a.id == b.id) {
        return a.di < b.di;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  // --- Instance methods ---

  begin(): ZPP_PartitionPair | null {
    return this.next;
  }

  add(o: ZPP_PartitionPair): ZPP_PartitionPair {
    o._inuse = true;
    const temp = o;
    temp.next = this.next;
    this.next = temp;
    this.modified = true;
    this.length++;
    return o;
  }

  insert(cur: ZPP_PartitionPair | null, o: ZPP_PartitionPair): ZPP_PartitionPair {
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

  pop_unsafe(): ZPP_PartitionPair {
    const ret = this.next!;
    this.pop();
    return ret;
  }

  remove(obj: ZPP_PartitionPair): void {
    let pre: ZPP_PartitionPair | null = null;
    let cur: ZPP_PartitionPair | null = this.next;
    while (cur != null) {
      if (cur == obj) {
        let old: ZPP_PartitionPair;
        let ret1: ZPP_PartitionPair | null;
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
        break;
      }
      pre = cur;
      cur = cur.next;
    }
  }

  erase(pre: ZPP_PartitionPair | null): ZPP_PartitionPair | null {
    let old: ZPP_PartitionPair;
    let ret: ZPP_PartitionPair | null;
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
    let cur: ZPP_PartitionPair | null = this.next;
    let pre: ZPP_PartitionPair | null = null;
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

  has(obj: ZPP_PartitionPair): boolean {
    let ret = false;
    let cx_ite: ZPP_PartitionPair | null = this.next;
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

  iterator_at(ind: number): ZPP_PartitionPair | null {
    let ret: ZPP_PartitionPair | null = this.next;
    while (ind-- > 0 && ret != null) ret = ret.next;
    return ret;
  }

  at(ind: number): ZPP_PartitionPair | null {
    const it = this.iterator_at(ind);
    if (it != null) {
      return it;
    } else {
      return null;
    }
  }

  free(): void {
    this.a = this.b = null;
    this.node = null;
  }

  alloc(): void {}
}
