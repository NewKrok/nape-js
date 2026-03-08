/**
 * ZPP_MixVec2List — Internal Vec2List subclass backed by a ZPP_Vec2 linked list.
 *
 * Unlike the standard Vec2List which uses a ZNPList_ZPP_Vec2, this class wraps
 * a raw ZPP_Vec2 intrusive linked list (sentinel node pattern: `inner.next` is
 * the first element). Used by ZPP_Polygon for its localVerts / globalVerts lists.
 *
 * Converted from nape-compiled.js lines 1181–1527.
 */

import { getNape } from "../../core/engine";
import { Vec2List as Vec2ListCtor } from "../../geom/Vec2List";
import { ZPP_Vec2 } from "../geom/ZPP_Vec2";

// ---------------------------------------------------------------------------
// Helper: ensure a ZPP_Vec2 has a public Vec2 wrapper.
// Same logic as ensureVec2Wrapper in Vec2List.ts.
// Returns the public Vec2 wrapper (any — circular import prevention).
// ---------------------------------------------------------------------------

function ensureVec2Wrapper(zpp: ZPP_Vec2): any {
  if (zpp.outer == null) {
    const nape = getNape();
    zpp.outer = new nape.geom.Vec2();
    const o = zpp.outer.zpp_inner;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o._isimmutable = null;
    o._validate = null;
    o._invalidate = null;
    o.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = o;
    zpp.outer.zpp_inner = zpp;
  }
  return zpp.outer;
}

// ---------------------------------------------------------------------------
// ZPP_MixVec2List constructor function (Haxe-compatible, extends Vec2ListCtor)
// ---------------------------------------------------------------------------

function ZPP_MixVec2ListCtor(this: any): void {
  this.at_index = 0;
  this.at_ite = null;
  this.zip_length = false;
  this._length = 0;
  this.inner = null;
  (Vec2ListCtor as any).call(this); // sets this.zpp_inner = new ZPP_Vec2List()
  this.at_ite = null;
  this.at_index = 0;
  this.zip_length = true;
  this._length = 0;
}

(ZPP_MixVec2ListCtor as any).__name__ = ["zpp_nape", "util", "ZPP_MixVec2List"];
(ZPP_MixVec2ListCtor as any).__super__ = Vec2ListCtor;

// Inherit all Vec2List prototype methods
for (const k in (Vec2ListCtor as any).prototype) {
  (ZPP_MixVec2ListCtor as any).prototype[k] = (Vec2ListCtor as any).prototype[k];
}

// ---------------------------------------------------------------------------
// Instance field defaults
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).prototype.inner = null;
(ZPP_MixVec2ListCtor as any).prototype._length = 0;
(ZPP_MixVec2ListCtor as any).prototype.zip_length = false;
(ZPP_MixVec2ListCtor as any).prototype.at_ite = null;
(ZPP_MixVec2ListCtor as any).prototype.at_index = 0;

// ---------------------------------------------------------------------------
// Static factory
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).get = function (list: any, immutable?: boolean): any {
  if (immutable == null) immutable = false;
  const ret = new (ZPP_MixVec2ListCtor as any)();
  ret.inner = list;
  ret.zpp_inner.immutable = immutable;
  return ret;
};

// ---------------------------------------------------------------------------
// Override: zpp_gl — compute length by traversing inner.next chain
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).prototype.zpp_gl = function (this: any): number {
  this.zpp_vm();
  if (this.zip_length) {
    this._length = 0;
    let cx_ite = this.inner.next;
    while (cx_ite != null) {
      this._length++;
      cx_ite = cx_ite.next;
    }
    this.zip_length = false;
  }
  return this._length;
};

// ---------------------------------------------------------------------------
// Override: zpp_vm — validate zpp_inner and check inner.modified
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).prototype.zpp_vm = function (this: any): void {
  this.zpp_inner.validate();
  if (this.inner.modified) {
    this.zip_length = true;
    this._length = 0;
    this.at_ite = null;
  }
};

// ---------------------------------------------------------------------------
// Override: at — index into inner.next chain with cached cursor
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).prototype.at = function (this: any, index: number): any {
  this.zpp_vm();
  if (index < 0 || index >= this.zpp_gl()) {
    throw new Error("Error: Index out of bounds");
  }
  if (this.zpp_inner.reverse_flag) {
    index = this.zpp_gl() - 1 - index;
  }
  if (index < this.at_index || this.at_ite == null) {
    this.at_index = 0;
    this.at_ite = this.inner.next;
  }
  while (this.at_index !== index) {
    this.at_index++;
    this.at_ite = this.at_ite.next;
  }
  return ensureVec2Wrapper(this.at_ite);
};

// ---------------------------------------------------------------------------
// Override: push — append to inner list (or prepend when reversed)
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).prototype.push = function (this: any, obj: any): boolean {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  this.zpp_inner.modify_test();
  this.zpp_vm();
  if (obj.zpp_inner._inuse) {
    throw new Error("Error: Vec2 is already in use");
  }
  const cont = this.zpp_inner.adder != null ? this.zpp_inner.adder(obj) : true;
  if (cont) {
    if (this.zpp_inner.reverse_flag) {
      this.inner.add(obj.zpp_inner);
    } else {
      const ite = this.inner.iterator_at(this.zpp_gl() - 1);
      this.inner.insert(ite, obj.zpp_inner);
    }
    this.zpp_inner.invalidate();
    if (this.zpp_inner.post_adder != null) {
      this.zpp_inner.post_adder(obj);
    }
  }
  return cont;
};

// ---------------------------------------------------------------------------
// Override: unshift — prepend to inner list (or append when reversed)
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).prototype.unshift = function (this: any, obj: any): boolean {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  this.zpp_inner.modify_test();
  this.zpp_vm();
  if (obj.zpp_inner._inuse) {
    throw new Error("Error: Vec2 is already in use");
  }
  const cont = this.zpp_inner.adder != null ? this.zpp_inner.adder(obj) : true;
  if (cont) {
    if (this.zpp_inner.reverse_flag) {
      const ite = this.inner.iterator_at(this.zpp_gl() - 1);
      this.inner.insert(ite, obj.zpp_inner);
    } else {
      this.inner.add(obj.zpp_inner);
    }
    this.zpp_inner.invalidate();
    if (this.zpp_inner.post_adder != null) {
      this.zpp_inner.post_adder(obj);
    }
  }
  return cont;
};

// ---------------------------------------------------------------------------
// Override: pop — remove from end (or front when reversed)
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).prototype.pop = function (this: any): any {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  this.zpp_inner.modify_test();
  if (this.empty()) {
    throw new Error("Error: Cannot remove from empty list");
  }
  this.zpp_vm();
  let ret: any;
  if (this.zpp_inner.reverse_flag) {
    ret = this.inner.next; // first element = visible end when reversed
    const retx = ensureVec2Wrapper(ret);
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.inner.pop();
    }
  } else {
    if (this.at_ite != null && this.at_ite.next == null) {
      this.at_ite = null;
    }
    const ite = this.zpp_gl() === 1 ? null : this.inner.iterator_at(this.zpp_gl() - 2);
    ret = ite == null ? this.inner.next : ite.next;
    const retx = ensureVec2Wrapper(ret);
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.inner.erase(ite);
    }
  }
  this.zpp_inner.invalidate();
  return ensureVec2Wrapper(ret);
};

// ---------------------------------------------------------------------------
// Override: shift — remove from front (or back when reversed)
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).prototype.shift = function (this: any): any {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  this.zpp_inner.modify_test();
  if (this.empty()) {
    throw new Error("Error: Cannot remove from empty list");
  }
  this.zpp_vm();
  let ret: any;
  if (this.zpp_inner.reverse_flag) {
    if (this.at_ite != null && this.at_ite.next == null) {
      this.at_ite = null;
    }
    const ite = this.zpp_gl() === 1 ? null : this.inner.iterator_at(this.zpp_gl() - 2);
    ret = ite == null ? this.inner.next : ite.next;
    const retx = ensureVec2Wrapper(ret);
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.inner.erase(ite);
    }
  } else {
    ret = this.inner.next; // first element
    const retx = ensureVec2Wrapper(ret);
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.inner.pop();
    }
  }
  this.zpp_inner.invalidate();
  return ensureVec2Wrapper(ret);
};

// ---------------------------------------------------------------------------
// Override: remove — remove by Vec2 public wrapper
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).prototype.remove = function (this: any, obj: any): boolean {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  this.zpp_inner.modify_test();
  this.zpp_vm();
  let found = false;
  let cx_ite = this.inner.next;
  while (cx_ite != null) {
    if (obj.zpp_inner === cx_ite) {
      found = true;
      break;
    }
    cx_ite = cx_ite.next;
  }
  if (found) {
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(obj);
    }
    if (!this.zpp_inner.dontremove) {
      this.inner.remove(obj.zpp_inner);
    }
    this.zpp_inner.invalidate();
  }
  return found;
};

// ---------------------------------------------------------------------------
// Override: clear — loop calling pop/shift
// ---------------------------------------------------------------------------

(ZPP_MixVec2ListCtor as any).prototype.clear = function (this: any): void {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  if (this.zpp_inner.reverse_flag) {
    while (!this.empty()) this.pop();
  } else {
    while (!this.empty()) this.shift();
  }
};

// ---------------------------------------------------------------------------
// Register in compiled namespace
// ---------------------------------------------------------------------------

const nape = getNape();
const zpp = nape.__zpp;
zpp.util.ZPP_MixVec2List = ZPP_MixVec2ListCtor;

export { ZPP_MixVec2ListCtor as ZPP_MixVec2List };
