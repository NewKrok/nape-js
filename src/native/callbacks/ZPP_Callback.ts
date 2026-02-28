/**
 * ZPP_Callback — Internal callback data holder for the nape physics engine.
 *
 * Stores callback event information (listener, event type, interactors, etc.)
 * and forms a doubly-linked list for callback queue management.
 *
 * Converted from nape-compiled.js lines 44587–44794, 133299–133300.
 */

type Any = any;

export class ZPP_Callback {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "callbacks", "ZPP_Callback"];

  // --- Static: namespace references ---
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Static: pool + internal flag ---
  static internal = false;
  static zpp_pool: ZPP_Callback | null = null;

  // --- Instance ---
  outer_body: Any = null;
  outer_con: Any = null;
  outer_int: Any = null;
  event = 0;
  listener: Any = null;
  space: Any = null;
  index = 0;
  next: ZPP_Callback | null = null;
  prev: ZPP_Callback | null = null;
  length = 0;
  int1: Any = null;
  int2: Any = null;
  set: Any = null;
  wrap_arbiters: Any = null;
  pre_arbiter: Any = null;
  pre_swapped = false;
  body: Any = null;
  constraint: Any = null;

  __class__: Any = ZPP_Callback;

  wrapper_body(): Any {
    if (this.outer_body == null) {
      ZPP_Callback.internal = true;
      this.outer_body = new ZPP_Callback._nape.callbacks.BodyCallback();
      ZPP_Callback.internal = false;
      this.outer_body.zpp_inner = this;
    }
    return this.outer_body;
  }

  wrapper_con(): Any {
    if (this.outer_con == null) {
      ZPP_Callback.internal = true;
      this.outer_con = new ZPP_Callback._nape.callbacks.ConstraintCallback();
      ZPP_Callback.internal = false;
      this.outer_con.zpp_inner = this;
    }
    return this.outer_con;
  }

  wrapper_int(): Any {
    const zpp = ZPP_Callback._zpp;
    if (this.outer_int == null) {
      ZPP_Callback.internal = true;
      this.outer_int = new ZPP_Callback._nape.callbacks.InteractionCallback();
      ZPP_Callback.internal = false;
      this.outer_int.zpp_inner = this;
    }
    if (this.wrap_arbiters == null) {
      this.wrap_arbiters = zpp.util.ZPP_ArbiterList.get(
        this.set.arbiters,
        true
      );
    } else {
      this.wrap_arbiters.zpp_inner.inner = this.set.arbiters;
    }
    this.wrap_arbiters.zpp_inner.zip_length = true;
    this.wrap_arbiters.zpp_inner.at_ite = null;
    return this.outer_int;
  }

  push(obj: ZPP_Callback): void {
    if (this.prev != null) {
      this.prev.next = obj;
    } else {
      this.next = obj;
    }
    obj.prev = this.prev;
    obj.next = null;
    this.prev = obj;
    this.length++;
  }

  push_rev(obj: ZPP_Callback): void {
    if (this.next != null) {
      this.next.prev = obj;
    } else {
      this.prev = obj;
    }
    obj.next = this.next;
    obj.prev = null;
    this.next = obj;
    this.length++;
  }

  pop(): ZPP_Callback {
    const ret = this.next!;
    this.next = ret.next;
    if (this.next == null) {
      this.prev = null;
    } else {
      this.next.prev = null;
    }
    this.length--;
    return ret;
  }

  pop_rev(): ZPP_Callback {
    const ret = this.prev!;
    this.prev = ret.prev;
    if (this.prev == null) {
      this.next = null;
    } else {
      this.prev.next = null;
    }
    this.length--;
    return ret;
  }

  empty(): boolean {
    return this.next == null;
  }

  clear(): void {
    while (!this.empty()) this.pop();
  }

  splice(o: ZPP_Callback): ZPP_Callback | null {
    const ret = o.next;
    if (o.prev == null) {
      this.next = o.next;
      if (this.next != null) {
        this.next.prev = null;
      } else {
        this.prev = null;
      }
    } else {
      o.prev.next = o.next;
      if (o.next != null) {
        o.next.prev = o.prev;
      } else {
        this.prev = o.prev;
      }
    }
    this.length--;
    return ret;
  }

  rotateL(): void {
    this.push(this.pop());
  }

  rotateR(): void {
    this.push_rev(this.pop_rev());
  }

  cycleNext(o: ZPP_Callback): ZPP_Callback | null {
    if (o.next == null) {
      return this.next;
    } else {
      return o.next;
    }
  }

  cyclePrev(o: ZPP_Callback): ZPP_Callback | null {
    if (o.prev == null) {
      return this.prev;
    } else {
      return o.prev;
    }
  }

  at(i: number): ZPP_Callback {
    let ret: Any = this.next;
    while (i-- != 0) ret = ret.next;
    return ret;
  }

  rev_at(i: number): ZPP_Callback {
    let ret: Any = this.prev;
    while (i-- != 0) ret = ret.prev;
    return ret;
  }

  free(): void {
    this.int1 = this.int2 = null;
    this.body = null;
    this.constraint = null;
    this.listener = null;
    if (this.wrap_arbiters != null) {
      this.wrap_arbiters.zpp_inner.inner = null;
    }
    this.set = null;
  }

  alloc(): void {}

  genarbs(): void {
    const zpp = ZPP_Callback._zpp;
    if (this.wrap_arbiters == null) {
      this.wrap_arbiters = zpp.util.ZPP_ArbiterList.get(
        this.set.arbiters,
        true
      );
    } else {
      this.wrap_arbiters.zpp_inner.inner = this.set.arbiters;
    }
    this.wrap_arbiters.zpp_inner.zip_length = true;
    this.wrap_arbiters.zpp_inner.at_ite = null;
  }
}
