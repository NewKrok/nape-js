/**
 * ZPP_InteractionListener — Internal interaction/pre listener for the nape physics engine.
 *
 * Manages interaction event listeners (BEGIN/END/ONGOING/PRE) with dual handler
 * support (handleri for InteractionListener, handlerp for PreListener).
 * Contains complex set intersection logic for CbType/CbSet pair operations.
 *
 * Converted from nape-compiled.js lines 28138–30352, 112140–112151.
 */

import { ZPP_Listener } from "./ZPP_Listener";
import { ZNPList } from "../util/ZNPList";
import { ZPP_CbSet } from "./ZPP_CbSet";
import { ZPP_CbType } from "./ZPP_CbType";
import { ZPP_OptionType } from "./ZPP_OptionType";

export class ZPP_InteractionListener extends ZPP_Listener {
  static __name__ = ["zpp_nape", "callbacks", "ZPP_InteractionListener"];

  // --- Static: working lists for set operations (initialized at engine init time) ---
  static UCbSet: ZNPList<ZPP_CbSet> | null = null;
  static VCbSet: ZNPList<ZPP_CbSet> | null = null;
  static WCbSet: ZNPList<ZPP_CbSet> | null = null;
  static UCbType: ZNPList<ZPP_CbType> | null = null;
  static VCbType: ZNPList<ZPP_CbType> | null = null;
  static WCbType: ZNPList<ZPP_CbType> | null = null;

  // --- Instance ---
  outer_zni: any = null;
  outer_znp: any = null;
  itype = 0;
  options1!: ZPP_OptionType;
  options2!: ZPP_OptionType;
  handleri: any = null;
  allowSleepingCallbacks = false;
  pure = false;
  handlerp: any = null;

  constructor(options1: any, options2: any, event: number, type: number) {
    super();
    this.type = type;
    this.interaction = this;
    this.event = event;
    this.options1 = options1.zpp_inner;
    this.options2 = options2.zpp_inner;
    this.allowSleepingCallbacks = false;
  }

  setInteractionType(itype: number): void {
    this.itype = itype;
  }

  wake(): void {
    let ite1 = this.options1.includes.head;
    let ite2 = this.options2.includes.head;
    while (ite1 != null && ite2 != null) {
      const cb1 = ite1.elt!;
      const cb2 = ite2.elt!;
      if (cb1 == cb2) {
        let cx_ite = cb1.interactors.head;
        while (cx_ite != null) {
          const i = cx_ite.elt;
          i.wake();
          cx_ite = cx_ite.next;
        }
        ite1 = ite1.next;
        ite2 = ite2.next;
      } else if (cb1.id < cb2.id) {
        let cx_ite1 = cb1.interactors.head;
        while (cx_ite1 != null) {
          const i1 = cx_ite1.elt;
          i1.wake();
          cx_ite1 = cx_ite1.next;
        }
        ite1 = ite1.next;
      } else {
        let cx_ite2 = cb2.interactors.head;
        while (cx_ite2 != null) {
          const i2 = cx_ite2.elt;
          i2.wake();
          cx_ite2 = cx_ite2.next;
        }
        ite2 = ite2.next;
      }
    }
    while (ite1 != null) {
      let cx_ite3 = ite1.elt!.interactors.head;
      while (cx_ite3 != null) {
        const i3 = cx_ite3.elt;
        i3.wake();
        cx_ite3 = cx_ite3.next;
      }
      ite1 = ite1.next;
    }
    while (ite2 != null) {
      let cx_ite4 = ite2.elt!.interactors.head;
      while (cx_ite4 != null) {
        const i4 = cx_ite4.elt;
        i4.wake();
        cx_ite4 = cx_ite4.next;
      }
      ite2 = ite2.next;
    }
  }

  CbSetset(A: any, B: any, lambda: (a: ZPP_CbSet, b: ZPP_CbSet) => void): void {
    const zpp = ZPP_Listener._zpp;
    const U = ZPP_InteractionListener.UCbSet!;
    const V = ZPP_InteractionListener.VCbSet!;
    const W = ZPP_InteractionListener.WCbSet!;
    let aite = A.head;
    let bite = B.head;
    while (aite != null && bite != null) {
      const a = aite.elt;
      const b = bite.elt;
      if (a == b) {
        const ret = this._allocCbSetNode(zpp);
        ret.elt = a;
        ret.next = W.head;
        W.head = ret;
        W.modified = true;
        W.length++;
        aite = aite.next;
        bite = bite.next;
      } else if (zpp.callbacks.ZPP_CbSet.setlt(a, b)) {
        const ret1 = this._allocCbSetNode(zpp);
        ret1.elt = a;
        ret1.next = U.head;
        U.head = ret1;
        U.modified = true;
        U.length++;
        aite = aite.next;
      } else {
        const ret2 = this._allocCbSetNode(zpp);
        ret2.elt = b;
        ret2.next = V.head;
        V.head = ret2;
        V.modified = true;
        V.length++;
        bite = bite.next;
      }
    }
    while (aite != null) {
      const ret3 = this._allocCbSetNode(zpp);
      ret3.elt = aite.elt;
      ret3.next = U.head;
      U.head = ret3;
      U.modified = true;
      U.length++;
      aite = aite.next;
    }
    while (bite != null) {
      const ret4 = this._allocCbSetNode(zpp);
      ret4.elt = bite.elt;
      ret4.next = V.head;
      V.head = ret4;
      V.modified = true;
      V.length++;
      bite = bite.next;
    }
    while (U.head != null) {
      const x = U.pop_unsafe();
      let cx_ite = B.head;
      while (cx_ite != null) {
        lambda(x, cx_ite.elt);
        cx_ite = cx_ite.next;
      }
    }
    while (V.head != null) {
      const x1 = V.pop_unsafe();
      let cx_ite1 = W.head;
      while (cx_ite1 != null) {
        lambda(x1, cx_ite1.elt!);
        cx_ite1 = cx_ite1.next;
      }
    }
    while (W.head != null) {
      const x2 = W.pop_unsafe();
      lambda(x2, x2);
      let cx_ite2: any = W.head;
      while (cx_ite2 != null) {
        lambda(x2, cx_ite2.elt!);
        cx_ite2 = cx_ite2.next;
      }
    }
  }

  CbTypeset(A: any, B: any, lambda: (a: ZPP_CbType, b: ZPP_CbType) => void): void {
    const zpp = ZPP_Listener._zpp;
    const U = ZPP_InteractionListener.UCbType!;
    const V = ZPP_InteractionListener.VCbType!;
    const W = ZPP_InteractionListener.WCbType!;
    let aite = A.head;
    let bite = B.head;
    while (aite != null && bite != null) {
      const a = aite.elt;
      const b = bite.elt;
      if (a == b) {
        const ret = this._allocCbTypeNode(zpp);
        ret.elt = a;
        ret.next = W.head;
        W.head = ret;
        W.modified = true;
        W.length++;
        aite = aite.next;
        bite = bite.next;
      } else if (a.id < b.id) {
        const ret1 = this._allocCbTypeNode(zpp);
        ret1.elt = a;
        ret1.next = U.head;
        U.head = ret1;
        U.modified = true;
        U.length++;
        aite = aite.next;
      } else {
        const ret2 = this._allocCbTypeNode(zpp);
        ret2.elt = b;
        ret2.next = V.head;
        V.head = ret2;
        V.modified = true;
        V.length++;
        bite = bite.next;
      }
    }
    while (aite != null) {
      const ret3 = this._allocCbTypeNode(zpp);
      ret3.elt = aite.elt;
      ret3.next = U.head;
      U.head = ret3;
      U.modified = true;
      U.length++;
      aite = aite.next;
    }
    while (bite != null) {
      const ret4 = this._allocCbTypeNode(zpp);
      ret4.elt = bite.elt;
      ret4.next = V.head;
      V.head = ret4;
      V.modified = true;
      V.length++;
      bite = bite.next;
    }
    while (U.head != null) {
      const x = U.pop_unsafe()!;
      let cx_ite = B.head;
      while (cx_ite != null) {
        lambda(x, cx_ite.elt);
        cx_ite = cx_ite.next;
      }
    }
    while (V.head != null) {
      const x1 = V.pop_unsafe();
      let cx_ite1 = W.head;
      while (cx_ite1 != null) {
        lambda(x1, cx_ite1.elt!);
        cx_ite1 = cx_ite1.next;
      }
    }
    while (W.head != null) {
      const x2 = W.pop_unsafe();
      lambda(x2, x2);
      let cx_ite2: any = W.head;
      while (cx_ite2 != null) {
        lambda(x2, cx_ite2.elt!);
        cx_ite2 = cx_ite2.next;
      }
    }
  }

  with_uniquesets(fresh: boolean): void {
    const zpp = ZPP_Listener._zpp;
    let set: any;
    if (zpp.util.ZPP_Set_ZPP_CbSetPair.zpp_pool == null) {
      set = new zpp.util.ZPP_Set_ZPP_CbSetPair();
    } else {
      set = zpp.util.ZPP_Set_ZPP_CbSetPair.zpp_pool;
      zpp.util.ZPP_Set_ZPP_CbSetPair.zpp_pool = set.next;
      set.next = null;
    }
    set.lt = zpp.callbacks.ZPP_CbSetPair.setlt;

    // Use CbTypeset on options1/options2 includes, generating CbSetset pairs
    this.CbTypeset(
      this.options1.includes,
      this.options2.includes,
      (x: ZPP_CbType, y: ZPP_CbType) => {
        this.CbSetset(x.cbsets, y.cbsets, (a: ZPP_CbSet, b: ZPP_CbSet) => {
          a.validate();
          b.validate();
          if (zpp.callbacks.ZPP_CbSet.single_intersection(a, b, this)) {
            let pair: any;
            if (zpp.callbacks.ZPP_CbSetPair.zpp_pool == null) {
              pair = new zpp.callbacks.ZPP_CbSetPair();
            } else {
              pair = zpp.callbacks.ZPP_CbSetPair.zpp_pool;
              zpp.callbacks.ZPP_CbSetPair.zpp_pool = pair.next;
              pair.next = null;
            }
            pair.zip_listeners = true;
            if (zpp.callbacks.ZPP_CbSet.setlt(a, b)) {
              pair.a = a;
              pair.b = b;
            } else {
              pair.a = b;
              pair.b = a;
            }
            set.try_insert(pair);
          }
        });
      },
    );

    // Walk the set tree and call freshListenerType/nullListenerType
    if (set.parent != null) {
      let cur = set.parent;
      while (cur != null) {
        if (cur.prev != null) {
          cur = cur.prev;
        } else if (cur.next != null) {
          cur = cur.next;
        } else {
          const pair = cur.data;
          if (fresh) {
            this.space.freshListenerType(pair.a, pair.b);
          } else {
            this.space.nullListenerType(pair.a, pair.b);
          }
          const o10 = pair;
          o10.a = o10.b = null;
          o10.listeners.clear();
          o10.next = zpp.callbacks.ZPP_CbSetPair.zpp_pool;
          zpp.callbacks.ZPP_CbSetPair.zpp_pool = o10;
          const ret41 = cur.parent;
          if (ret41 != null) {
            if (cur == ret41.prev) {
              ret41.prev = null;
            } else {
              ret41.next = null;
            }
            cur.parent = null;
          }
          const o11 = cur;
          o11.data = null;
          o11.lt = null;
          o11.swapped = null;
          o11.next = zpp.util.ZPP_Set_ZPP_CbSetPair.zpp_pool;
          zpp.util.ZPP_Set_ZPP_CbSetPair.zpp_pool = o11;
          cur = ret41;
        }
      }
      set.parent = null;
    }
    const o12 = set;
    o12.data = null;
    o12.lt = null;
    o12.swapped = null;
    o12.next = zpp.util.ZPP_Set_ZPP_CbSetPair.zpp_pool;
    zpp.util.ZPP_Set_ZPP_CbSetPair.zpp_pool = o12;
  }

  with_union(lambda: (cb: ZPP_CbType) => void): void {
    let ite1 = this.options1.includes.head;
    let ite2 = this.options2.includes.head;
    while (ite1 != null && ite2 != null) {
      const cb1 = ite1.elt!;
      const cb2 = ite2.elt!;
      if (cb1 == cb2) {
        lambda(cb1);
        ite1 = ite1.next;
        ite2 = ite2.next;
      } else if (cb1.id < cb2.id) {
        lambda(cb1);
        ite1 = ite1.next;
      } else {
        lambda(cb2);
        ite2 = ite2.next;
      }
    }
    while (ite1 != null) {
      lambda(ite1.elt!);
      ite1 = ite1.next;
    }
    while (ite2 != null) {
      lambda(ite2.elt!);
      ite2 = ite2.next;
    }
  }

  addedToSpace(): void {
    const zpp = ZPP_Listener._zpp;
    const pre = this.type == 3;

    this.with_union((cb: ZPP_CbType) => {
      // Insert this listener into cb.listeners at precedence-sorted position
      let pre1: any = null;
      let cx_ite = cb.listeners.head;
      while (cx_ite != null) {
        const j = cx_ite.elt!;
        if (this.precedence > j.precedence || (this.precedence == j.precedence && this.id > j.id)) {
          break;
        }
        pre1 = cx_ite;
        cx_ite = cx_ite.next;
      }
      const _this = cb.listeners;
      let ret: any;
      if (zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool == null) {
        ret = new zpp.util.ZNPNode_ZPP_InteractionListener();
      } else {
        ret = zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool;
        zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = ret.next;
        ret.next = null;
      }
      ret.elt = this;
      const temp = ret;
      if (pre1 == null) {
        temp.next = _this.head;
        _this.head = temp;
      } else {
        temp.next = pre1.next;
        pre1.next = temp;
      }
      _this.pushmod = _this.modified = true;
      _this.length++;

      // Invalidate cbsets
      let cx_ite1 = cb.cbsets.head;
      while (cx_ite1 != null) {
        const cbset = cx_ite1.elt;
        cbset.zip_listeners = true;
        cbset.invalidate_pairs();
        cx_ite1 = cx_ite1.next;
      }

      // Wake interactors if this is a pre listener
      if (pre) {
        let cx_ite2 = cb.interactors.head;
        while (cx_ite2 != null) {
          cx_ite2.elt.wake();
          cx_ite2 = cx_ite2.next;
        }
      }
    });

    this.options1.handler = (cb: ZPP_CbType, included: boolean, added: boolean) =>
      this.cbtype_change1(cb, included, added);
    this.options2.handler = (cb: ZPP_CbType, included: boolean, added: boolean) =>
      this.cbtype_change2(cb, included, added);
    this.with_uniquesets(true);
  }

  removedFromSpace(): void {
    this.with_uniquesets(false);
    const pre = this.type == 3;

    this.with_union((cb: ZPP_CbType) => {
      cb.listeners.remove(this);
      let cx_ite = cb.cbsets.head;
      while (cx_ite != null) {
        const cbset = cx_ite.elt;
        cbset.zip_listeners = true;
        cbset.invalidate_pairs();
        cx_ite = cx_ite.next;
      }
      if (pre) {
        let cx_ite1 = cb.interactors.head;
        while (cx_ite1 != null) {
          cx_ite1.elt.wake();
          cx_ite1 = cx_ite1.next;
        }
      }
    });

    this.options1.handler = null;
    this.options2.handler = null;
  }

  invalidate_precedence(): void {
    if (this.space != null) {
      this.removedFromSpace();
      this.addedToSpace();
    }
  }

  cbtype_change1(cb: ZPP_CbType, included: boolean, added: boolean): void {
    this.cbtype_change(this.options1, cb, included, added);
  }

  cbtype_change2(cb: ZPP_CbType, included: boolean, added: boolean): void {
    this.cbtype_change(this.options2, cb, included, added);
  }

  cbtype_change(options: ZPP_OptionType, cb: ZPP_CbType, included: boolean, added: boolean): void {
    this.removedFromSpace();
    if (included) {
      if (added) {
        options.effect_change(cb, true, true);
      } else {
        options.includes.remove(cb);
      }
    } else if (added) {
      options.effect_change(cb, false, true);
    } else {
      options.excludes.remove(cb);
    }
    this.addedToSpace();
  }

  swapEvent(newev: number): void {
    if (this.type == 3) {
      throw new Error("Error: PreListener event can only be PRE");
    } else if (newev != 0 && newev != 1 && newev != 6) {
      throw new Error("Error: InteractionListener event must be either BEGIN, END, ONGOING");
    }
    this.removedFromSpace();
    this.event = newev;
    this.addedToSpace();
  }

  // --- Pool allocation helpers ---
  private _allocCbSetNode(zpp: any): any {
    let ret: any;
    if (zpp.util.ZNPNode_ZPP_CbSet.zpp_pool == null) {
      ret = new zpp.util.ZNPNode_ZPP_CbSet();
    } else {
      ret = zpp.util.ZNPNode_ZPP_CbSet.zpp_pool;
      zpp.util.ZNPNode_ZPP_CbSet.zpp_pool = ret.next;
      ret.next = null;
    }
    return ret;
  }

  private _allocCbTypeNode(zpp: any): any {
    let ret: any;
    if (zpp.util.ZNPNode_ZPP_CbType.zpp_pool == null) {
      ret = new zpp.util.ZNPNode_ZPP_CbType();
    } else {
      ret = zpp.util.ZNPNode_ZPP_CbType.zpp_pool;
      zpp.util.ZNPNode_ZPP_CbType.zpp_pool = ret.next;
      ret.next = null;
    }
    return ret;
  }

  /**
   * Initialize static working lists. Called once from compiled factory.
   */
  static _initStatics(zpp_nape: any): void {
    ZPP_InteractionListener.UCbSet = new zpp_nape.util.ZNPList_ZPP_CbSet() as ZNPList<ZPP_CbSet>;
    ZPP_InteractionListener.VCbSet = new zpp_nape.util.ZNPList_ZPP_CbSet() as ZNPList<ZPP_CbSet>;
    ZPP_InteractionListener.WCbSet = new zpp_nape.util.ZNPList_ZPP_CbSet() as ZNPList<ZPP_CbSet>;
    ZPP_InteractionListener.UCbType = new zpp_nape.util.ZNPList_ZPP_CbType() as ZNPList<ZPP_CbType>;
    ZPP_InteractionListener.VCbType = new zpp_nape.util.ZNPList_ZPP_CbType() as ZNPList<ZPP_CbType>;
    ZPP_InteractionListener.WCbType = new zpp_nape.util.ZNPList_ZPP_CbType() as ZNPList<ZPP_CbType>;
  }
}
