import { ZPP_CbSet } from "./ZPP_CbSet";
import { ZNPList_ZPP_InteractionListener } from "../util/ZNPRegistry";
/**
 * ZPP_CbSetPair — Internal callback set pair for the nape physics engine.
 *
 * Pairs two ZPP_CbSets and maintains a validated list of interaction listeners
 * compatible with both sets. Uses lazy validation.
 */

export class ZPP_CbSetPair {
  // --- Static: namespace references ---

  // --- Static: object pool ---
  static zpp_pool: ZPP_CbSetPair | null = null;

  // --- Instance ---
  a: any = null;
  b: any = null;
  next: ZPP_CbSetPair | null = null;
  zip_listeners = false;
  listeners: any = null;

  constructor() {
    this.listeners = new ZNPList_ZPP_InteractionListener();
  }

  /** Factory with pooling. Orders a/b by CbSet.setlt. */
  static get(a: any, b: any): ZPP_CbSetPair {
    let ret: ZPP_CbSetPair;
    if (ZPP_CbSetPair.zpp_pool == null) {
      ret = new ZPP_CbSetPair();
    } else {
      ret = ZPP_CbSetPair.zpp_pool;
      ZPP_CbSetPair.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.zip_listeners = true;
    if (ZPP_CbSet.setlt(a, b)) {
      ret.a = a;
      ret.b = b;
    } else {
      ret.a = b;
      ret.b = a;
    }
    return ret;
  }

  /** Compare two pairs by their (a, b) ordering. */
  static setlt(x: ZPP_CbSetPair, y: ZPP_CbSetPair): boolean {
    if (!ZPP_CbSet.setlt(x.a, y.a)) {
      if (x.a == y.a) {
        return ZPP_CbSet.setlt(x.b, y.b);
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  free(): void {
    this.a = this.b = null;
    this.listeners.clear();
  }

  /**
   * Whether listener `i` matches this pair, in either orientation
   * (options1 ~ a and options2 ~ b, or options2 ~ a and options1 ~ b).
   */
  compatible(i: any): boolean {
    const ta = this.a.cbTypes;
    const tb = this.b.cbTypes;
    return (
      (i.options1.compatible(ta) && i.options2.compatible(tb)) ||
      (i.options2.compatible(ta) && i.options1.compatible(tb))
    );
  }

  invalidate(): void {
    this.zip_listeners = true;
  }

  validate(): void {
    if (this.zip_listeners) {
      this.zip_listeners = false;
      this.__validate();
    }
  }

  /** Rebuild listeners list from the intersection of both sets' listener lists. */
  __validate(): void {
    this.listeners.clear();
    let aite = this.a.listeners.head;
    let bite = this.b.listeners.head;
    while (aite != null && bite != null) {
      const ax = aite.elt;
      const bx = bite.elt;
      if (ax == bx) {
        if (this.compatible(ax)) {
          this.listeners.add(ax);
        }
        aite = aite.next;
        bite = bite.next;
      } else if (
        ax.precedence > bx.precedence ||
        (ax.precedence == bx.precedence && ax.id > bx.id)
      ) {
        aite = aite.next;
      } else {
        bite = bite.next;
      }
    }
  }

  empty_intersection(): boolean {
    return this.listeners.head == null;
  }

  single_intersection(i: any): boolean {
    const ite = this.listeners.head;
    if (ite != null && ite.elt == i) {
      return ite.next == null;
    } else {
      return false;
    }
  }
}
