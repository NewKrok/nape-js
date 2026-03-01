/**
 * Listener — Base class for all physics event listeners.
 *
 * Provides common properties (type, event, precedence, space) and
 * toString() for all listener subclasses.
 *
 * Fully modernized from nape-compiled.js lines 231–433.
 */

import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_Listener } from "../native/callbacks/ZPP_Listener";
import { CbEvent } from "./CbEvent";
import { ListenerType } from "./ListenerType";
import { Space } from "../space/Space";

type Any = any;

/**
 * Convert a CbEvent singleton to the internal numeric event code.
 */
export function cbEventToNumber(event: CbEvent): number {
  if (event === CbEvent.BEGIN) return 0;
  if (event === CbEvent.END) return 1;
  if (event === CbEvent.WAKE) return 2;
  if (event === CbEvent.SLEEP) return 3;
  if (event === CbEvent.BREAK) return 4;
  if (event === CbEvent.PRE) return 5;
  if (event === CbEvent.ONGOING) return 6;
  return -1;
}

export class Listener {
  static __name__ = ["nape", "callbacks", "Listener"];

  zpp_inner: ZPP_Listener;

  get _inner(): Any {
    return this;
  }

  constructor() {
    if (!ZPP_Listener.internal) {
      throw new Error("Error: Cannot instantiate Listener derp!");
    }
    this.zpp_inner = null as Any;
  }

  static _wrap(inner: Any): Listener {
    if (inner instanceof Listener) return inner;
    if (!inner) return null as unknown as Listener;
    // If it's a raw compiled-code wrapper with zpp_inner, unwrap
    if (inner.zpp_inner && !(inner instanceof ZPP_Listener)) {
      return Listener._wrap(inner.zpp_inner);
    }
    if (inner instanceof ZPP_Listener) {
      return getOrCreate(inner, (zpp: ZPP_Listener) => {
        if (zpp.outer) return zpp.outer;
        const l = Object.create(Listener.prototype) as Listener;
        l.zpp_inner = zpp;
        zpp.outer = l;
        return l;
      });
    }
    return null as unknown as Listener;
  }

  get type(): ListenerType {
    return ZPP_Listener.types[this.zpp_inner.type];
  }

  get event(): CbEvent {
    return ZPP_Listener.events[this.zpp_inner.event];
  }

  set event(event: CbEvent) {
    if (event == null) {
      throw new Error("Error: Cannot set listener event type to null");
    }
    if (ZPP_Listener.events[this.zpp_inner.event] != event) {
      const xevent = cbEventToNumber(event);
      this.zpp_inner.swapEvent(xevent);
    }
  }

  get precedence(): number {
    return this.zpp_inner.precedence;
  }

  set precedence(precedence: number) {
    if (this.zpp_inner.precedence != precedence) {
      this.zpp_inner.precedence = precedence;
      this.zpp_inner.invalidate_precedence();
    }
  }

  get space(): Space | null {
    if (this.zpp_inner.space == null) {
      return null;
    } else {
      return Space._wrap(this.zpp_inner.space.outer);
    }
  }

  set space(space: Space | Any | null) {
    // Unwrap TS Space wrapper if needed (TS Space has _inner, compiled Space has zpp_inner)
    const compiledSpace = space != null ? (space._inner ?? space) : null;
    const currentCompiledSpace = this.zpp_inner.space == null ? null : this.zpp_inner.space.outer;
    if (currentCompiledSpace != compiledSpace) {
      if (this.zpp_inner.space != null) {
        this.zpp_inner.space.wrap_listeners.remove(this);
      }
      if (compiledSpace != null) {
        const _this = compiledSpace.zpp_inner.wrap_listeners;
        if (_this.zpp_inner.reverse_flag) {
          _this.push(this);
        } else {
          _this.unshift(this);
        }
      } else {
        this.zpp_inner.space = null;
      }
    }
  }

  toString(): string {
    const eventNames = ["BEGIN", "END", "WAKE", "SLEEP", "BREAK", "PRE", "ONGOING"];
    const event = eventNames[this.zpp_inner.event];
    if (this.zpp_inner.type == 0) {
      const body = this.zpp_inner.body;
      return (
        "BodyListener{" + event + "::" + String(body.outer_zn.zpp_inner_zn.options.outer) + "}"
      );
    } else if (this.zpp_inner.type == 1) {
      const con = this.zpp_inner.constraint;
      return (
        "ConstraintListener{" + event + "::" + String(con.outer_zn.zpp_inner_zn.options.outer) + "}"
      );
    } else {
      const con1 = this.zpp_inner.interaction;
      let itype: string;
      switch (con1.itype) {
        case 1:
          itype = "COLLISION";
          break;
        case 2:
          itype = "SENSOR";
          break;
        case 4:
          itype = "FLUID";
          break;
        default:
          itype = "ALL";
      }
      if (this.zpp_inner.type == 2) {
        return (
          "InteractionListener{" +
          event +
          "#" +
          itype +
          "::" +
          String(con1.outer_zni.zpp_inner_zn.options1.outer) +
          ":" +
          String(con1.outer_zni.zpp_inner_zn.options2.outer) +
          "}" +
          " precedence=" +
          this.zpp_inner.precedence
        );
      } else {
        return (
          "PreListener{" +
          itype +
          "::" +
          String(con1.outer_znp.zpp_inner_zn.options1.outer) +
          ":" +
          String(con1.outer_znp.zpp_inner_zn.options2.outer) +
          "}" +
          " precedence=" +
          this.zpp_inner.precedence
        );
      }
    }
  }
}

// Self-register in the compiled namespace
const nape = getNape();
nape.callbacks.Listener = Listener;
(Listener.prototype as Any).__class__ = Listener;
