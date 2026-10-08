/**
 * ZPP_BodyListener — Internal body listener for the nape physics engine.
 *
 * Manages body event listeners (WAKE/SLEEP) with priority-ordered insertion
 * into CbType listener lists. Handles option changes and re-registration.
 */

import { ZPP_Listener } from "./ZPP_Listener";

export class ZPP_BodyListener extends ZPP_Listener {
  handler: any = null;
  options: any = null;
  outer_zn: any = null;

  constructor(options: any, event: number, handler: any) {
    super();
    this.event = event;
    this.handler = handler;
    this.body = this;
    this.type = 0;
    this.options = options.zpp_inner;
  }

  addedToSpace(): void {
    this.options.handler = (cb: any, included: boolean, added: boolean) =>
      this.cbtype_change(cb, included, added);
    let cx_ite = this.options.includes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      let pre: any = null;
      let cx_ite1 = cb.bodylisteners.head;
      while (cx_ite1 != null) {
        const j = cx_ite1.elt;
        if (this.precedence > j.precedence || (this.precedence == j.precedence && this.id > j.id)) {
          break;
        }
        pre = cx_ite1;
        cx_ite1 = cx_ite1.next;
      }
      cb.bodylisteners.insert(pre, this);
      let cx_ite2 = cb.cbsets.head;
      while (cx_ite2 != null) {
        const cb1 = cx_ite2.elt;
        cb1.zip_bodylisteners = true;
        cx_ite2 = cx_ite2.next;
      }
      cx_ite = cx_ite.next;
    }
  }

  removedFromSpace(): void {
    let cx_ite = this.options.includes.head;
    while (cx_ite != null) {
      const cb = cx_ite.elt;
      cb.bodylisteners.remove(this);
      let cx_ite1 = cb.cbsets.head;
      while (cx_ite1 != null) {
        const cb1 = cx_ite1.elt;
        cb1.zip_bodylisteners = true;
        cx_ite1 = cx_ite1.next;
      }
      cx_ite = cx_ite.next;
    }
    this.options.handler = null;
  }

  cbtype_change(cb: any, included: boolean, added: boolean): void {
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
    if (newev != 2 && newev != 3) {
      throw new Error("BodyListener event must be either WAKE or SLEEP only");
    }
    this.removedFromSpace();
    this.event = newev;
    this.addedToSpace();
  }
}
