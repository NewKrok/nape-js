/**
 * ZPP_CbSetManager — Internal callback set manager for the space.
 *
 * Manages a tree (ZPP_Set) of ZPP_CbSet instances, providing lookup and
 * pairing of callback sets for interactor pairs. Each space has one manager.
 *
 * Converted from nape-compiled.js lines 34154–34298.
 */

export class ZPP_CbSetManager {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_CbSetManager"];

  // --- Static: namespace references ---
  static _zpp: any = null;

  // --- Instance fields ---
  cbsets: any = null; // ZPP_Set_ZPP_CbSet — dynamic class
  space: any = null; // ZPP_Space — circular

  constructor(space: any) {
    const ZPP_Set_CbSet = ZPP_CbSetManager._zpp.util.ZPP_Set_ZPP_CbSet;
    if (ZPP_Set_CbSet.zpp_pool == null) {
      this.cbsets = new ZPP_Set_CbSet();
    } else {
      this.cbsets = ZPP_Set_CbSet.zpp_pool;
      ZPP_Set_CbSet.zpp_pool = this.cbsets.next;
      this.cbsets.next = null;
    }
    this.cbsets.lt = ZPP_CbSetManager._zpp.callbacks.ZPP_CbSet.setlt;
    this.space = space;
  }

  get(cbTypes: any): any {
    if (cbTypes.head == null) {
      return null;
    }
    const ZPP_CbSet = ZPP_CbSetManager._zpp.callbacks.ZPP_CbSet;
    let fake: any;
    if (ZPP_CbSet.zpp_pool == null) {
      fake = new ZPP_CbSet();
    } else {
      fake = ZPP_CbSet.zpp_pool;
      ZPP_CbSet.zpp_pool = fake.next;
      fake.next = null;
    }
    const faketypes = fake.cbTypes;
    fake.cbTypes = cbTypes;
    const res = this.cbsets.find_weak(fake);
    let ret: any;
    if (res != null) {
      ret = res.data;
    } else {
      const set = ZPP_CbSet.get(cbTypes);
      this.cbsets.insert(set);
      set.manager = this;
      ret = set;
    }
    fake.cbTypes = faketypes;
    const o = fake;
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
    o.next = ZPP_CbSet.zpp_pool;
    ZPP_CbSet.zpp_pool = o;
    return ret;
  }

  remove(set: any): void {
    const ZPP_CbSetPair = ZPP_CbSetManager._zpp.callbacks.ZPP_CbSetPair;
    this.cbsets.remove(set);
    while (set.cbpairs.head != null) {
      const pair = set.cbpairs.pop_unsafe();
      if (pair.a != pair.b) {
        if (set == pair.a) {
          pair.b.cbpairs.remove(pair);
        } else {
          pair.a.cbpairs.remove(pair);
        }
      }
      const o = pair;
      o.a = o.b = null;
      o.listeners.clear();
      o.next = ZPP_CbSetPair.zpp_pool;
      ZPP_CbSetPair.zpp_pool = o;
    }
    set.manager = null;
  }

  clear(): void {}

  validate(): void {
    if (!this.cbsets.empty()) {
      let set_ite = this.cbsets.parent;
      while (set_ite.prev != null) set_ite = set_ite.prev;
      while (set_ite != null) {
        const cb = set_ite.data;
        cb.validate();
        if (set_ite.next != null) {
          set_ite = set_ite.next;
          while (set_ite.prev != null) set_ite = set_ite.prev;
        } else {
          while (set_ite.parent != null && set_ite == set_ite.parent.next) set_ite = set_ite.parent;
          set_ite = set_ite.parent;
        }
      }
    }
  }

  pair(a: any, b: any): any {
    const ZPP_CbSet = ZPP_CbSetManager._zpp.callbacks.ZPP_CbSet;
    const ZPP_CbSetPair = ZPP_CbSetManager._zpp.callbacks.ZPP_CbSetPair;
    let ret: any = null;
    const pairs = a.cbpairs.length < b.cbpairs.length ? a.cbpairs : b.cbpairs;
    let cx_ite = pairs.head;
    while (cx_ite != null) {
      const p = cx_ite.elt;
      if ((p.a == a && p.b == b) || (p.a == b && p.b == a)) {
        ret = p;
        break;
      }
      cx_ite = cx_ite.next;
    }
    if (ret == null) {
      let ret1: any;
      if (ZPP_CbSetPair.zpp_pool == null) {
        ret1 = new ZPP_CbSetPair();
      } else {
        ret1 = ZPP_CbSetPair.zpp_pool;
        ZPP_CbSetPair.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.zip_listeners = true;
      if (ZPP_CbSet.setlt(a, b)) {
        ret1.a = a;
        ret1.b = b;
      } else {
        ret1.a = b;
        ret1.b = a;
      }
      ret = ret1;
      a.cbpairs.add(ret);
      if (b != a) {
        b.cbpairs.add(ret);
      }
    }
    if (ret.zip_listeners) {
      ret.zip_listeners = false;
      ret.__validate();
    }
    return ret;
  }

  valid_listener(i: any): boolean {
    return i.space == this.space;
  }
}
