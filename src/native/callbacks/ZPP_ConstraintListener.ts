/**
 * ZPP_ConstraintListener — Internal constraint listener for the nape physics engine.
 *
 * Manages constraint event listeners (WAKE/SLEEP/BREAK) with priority-ordered
 * insertion into CbType listener lists.
 *
 * Converted from nape-compiled.js lines 27498–27694.
 */

import { ZPP_Listener } from "./ZPP_Listener";

type Any = any;

export class ZPP_ConstraintListener extends ZPP_Listener {
  static __name__ = ["zpp_nape", "callbacks", "ZPP_ConstraintListener"];

  handler: Any = null;
  options: Any = null;
  outer_zn: Any = null;

  __class__: Any = ZPP_ConstraintListener;

  constructor(options: Any, event: number, handler: Any) {
    super();
    this.event = event;
    this.handler = handler;
    this.constraint = this;
    this.type = 1;
    this.options = options.zpp_inner;
  }

  immutable_options(): void {
    if (this.space != null && this.space.midstep) {
      throw new Error("Error: Cannot change listener type options during space.step()");
    }
  }

  addedToSpace(): void {
    const zpp = ZPP_Listener._zpp;
    this.options.handler = (cb: Any, included: boolean, added: boolean) =>
      this.cbtype_change(cb, included, added);
    let cx_ite = this.options.includes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      let pre: Any = null;
      let cx_ite1 = cb.conlisteners.head;
      while (cx_ite1 != null) {
        const j = cx_ite1.elt;
        if (this.precedence > j.precedence || (this.precedence == j.precedence && this.id > j.id)) {
          break;
        }
        pre = cx_ite1;
        cx_ite1 = cx_ite1.next;
      }
      const _this = cb.conlisteners;
      let ret: Any;
      if (zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool == null) {
        ret = new zpp.util.ZNPNode_ZPP_ConstraintListener();
      } else {
        ret = zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool;
        zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = ret.next;
        ret.next = null;
      }
      ret.elt = this;
      const temp = ret;
      if (pre == null) {
        temp.next = _this.head;
        _this.head = temp;
      } else {
        temp.next = pre.next;
        pre.next = temp;
      }
      _this.pushmod = _this.modified = true;
      _this.length++;
      let cx_ite2 = cb.cbsets.head;
      while (cx_ite2 != null) {
        const cb1 = cx_ite2.elt;
        cb1.zip_conlisteners = true;
        cx_ite2 = cx_ite2.next;
      }
      cx_ite = cx_ite.next;
    }
  }

  removedFromSpace(): void {
    let cx_ite = this.options.includes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      cb.conlisteners.remove(this);
      let cx_ite1 = cb.cbsets.head;
      while (cx_ite1 != null) {
        const cb1 = cx_ite1.elt;
        cb1.zip_conlisteners = true;
        cx_ite1 = cx_ite1.next;
      }
      cx_ite = cx_ite.next;
    }
    this.options.handler = null;
  }

  cbtype_change(cb: Any, included: boolean, added: boolean): void {
    this.removedFromSpace();
    const _this = this.options;
    if (included) {
      if (added) {
        _this.effect_change(cb, true, true);
      } else {
        _this.includes.remove(cb);
      }
    } else if (added) {
      _this.effect_change(cb, false, true);
    } else {
      _this.excludes.remove(cb);
    }
    this.addedToSpace();
  }

  invalidate_precedence(): void {
    if (this.space != null) {
      this.removedFromSpace();
      this.addedToSpace();
    }
  }

  swapEvent(newev: number): void {
    if (newev != 2 && newev != 3 && newev != 4) {
      throw new Error("Error: ConstraintListener event must be either WAKE or SLEEP only");
    }
    this.removedFromSpace();
    this.event = newev;
    this.addedToSpace();
  }
}
