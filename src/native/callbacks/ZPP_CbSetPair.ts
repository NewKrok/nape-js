/**
 * ZPP_CbSetPair — Internal callback set pair for the nape physics engine.
 *
 * Pairs two ZPP_CbSets and maintains a validated list of interaction listeners
 * compatible with both sets. Uses lazy validation.
 *
 * Converted from nape-compiled.js lines 45135–45319.
 */

type Any = any;

export class ZPP_CbSetPair {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "callbacks", "ZPP_CbSetPair"];

  // --- Static: namespace references ---
  static _zpp: Any = null;

  // --- Static: object pool ---
  static zpp_pool: ZPP_CbSetPair | null = null;

  // --- Instance ---
  a: Any = null;
  b: Any = null;
  next: ZPP_CbSetPair | null = null;
  zip_listeners = false;
  listeners: Any = null;

  __class__: Any = ZPP_CbSetPair;

  constructor() {
    const zpp = ZPP_CbSetPair._zpp;
    this.listeners = new zpp.util.ZNPList_ZPP_InteractionListener();
  }

  /** Factory with pooling. Orders a/b by CbSet.setlt. */
  static get(a: Any, b: Any): ZPP_CbSetPair {
    const zpp = ZPP_CbSetPair._zpp;
    let ret: ZPP_CbSetPair;
    if (ZPP_CbSetPair.zpp_pool == null) {
      ret = new ZPP_CbSetPair();
    } else {
      ret = ZPP_CbSetPair.zpp_pool;
      ZPP_CbSetPair.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.zip_listeners = true;
    if (zpp.callbacks.ZPP_CbSet.setlt(a, b)) {
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
    const zpp = ZPP_CbSetPair._zpp;
    if (!zpp.callbacks.ZPP_CbSet.setlt(x.a, y.a)) {
      if (x.a == y.a) {
        return zpp.callbacks.ZPP_CbSet.setlt(x.b, y.b);
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

  alloc(): void {
    this.zip_listeners = true;
  }

  /** Check if a listener is compatible with both sets in this pair. */
  compatible(i: Any): boolean {
    let tmp: boolean;
    const _this = i.options1;
    const xs = this.a.cbTypes;
    if (
      _this.nonemptyintersection(xs, _this.includes) &&
      !_this.nonemptyintersection(xs, _this.excludes)
    ) {
      const _this1 = i.options2;
      const xs1 = this.b.cbTypes;
      tmp =
        _this1.nonemptyintersection(xs1, _this1.includes) &&
        !_this1.nonemptyintersection(xs1, _this1.excludes);
    } else {
      tmp = false;
    }
    if (!tmp) {
      const _this2 = i.options2;
      const xs2 = this.a.cbTypes;
      if (
        _this2.nonemptyintersection(xs2, _this2.includes) &&
        !_this2.nonemptyintersection(xs2, _this2.excludes)
      ) {
        const _this3 = i.options1;
        const xs3 = this.b.cbTypes;
        if (_this3.nonemptyintersection(xs3, _this3.includes)) {
          return !_this3.nonemptyintersection(xs3, _this3.excludes);
        } else {
          return false;
        }
      } else {
        return false;
      }
    } else {
      return true;
    }
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
        let tmp: boolean;
        let tmp1: boolean;
        const _this = ax.options1;
        const xs = this.a.cbTypes;
        if (
          _this.nonemptyintersection(xs, _this.includes) &&
          !_this.nonemptyintersection(xs, _this.excludes)
        ) {
          const _this1 = ax.options2;
          const xs1 = this.b.cbTypes;
          tmp1 =
            _this1.nonemptyintersection(xs1, _this1.includes) &&
            !_this1.nonemptyintersection(xs1, _this1.excludes);
        } else {
          tmp1 = false;
        }
        if (!tmp1) {
          const _this2 = ax.options2;
          const xs2 = this.a.cbTypes;
          if (
            _this2.nonemptyintersection(xs2, _this2.includes) &&
            !_this2.nonemptyintersection(xs2, _this2.excludes)
          ) {
            const _this3 = ax.options1;
            const xs3 = this.b.cbTypes;
            tmp =
              _this3.nonemptyintersection(xs3, _this3.includes) &&
              !_this3.nonemptyintersection(xs3, _this3.excludes);
          } else {
            tmp = false;
          }
        } else {
          tmp = true;
        }
        if (tmp) {
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

  single_intersection(i: Any): boolean {
    const ite = this.listeners.head;
    if (ite != null && ite.elt == i) {
      return ite.next == null;
    } else {
      return false;
    }
  }

  forall(event: number, cb: (listener: Any) => void): void {
    let cx_ite = this.listeners.head;
    while (cx_ite != null) {
      const x = cx_ite.elt;
      if (x.event == event) {
        cb(x);
      }
      cx_ite = cx_ite.next;
    }
  }
}
