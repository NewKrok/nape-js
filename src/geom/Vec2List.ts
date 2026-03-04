/**
 * Vec2List — Typed list of Vec2 elements with custom wrapper creation.
 *
 * Unlike factory-generated lists, Vec2List has special logic in `at()`,
 * `pop()`, and `shift()` to create Vec2 wrappers on-demand around raw
 * ZPP_Vec2 objects, pooling the old wrapper's ZPP_Vec2 if needed.
 *
 * Vec2Iterator — Pooled iterator for Vec2List.
 *
 * Converted from nape-compiled.js lines 9416–10088 (Vec2Iterator + Vec2List).
 */

import { getNape } from "../core/engine";
import { ZPP_Vec2List } from "../native/util/ZPP_Vec2List";
import { ZPP_Vec2 } from "../native/geom/ZPP_Vec2";
import { ZPP_PubPool } from "../native/util/ZPP_PubPool";
import { Vec2 } from "./Vec2";

type Any = any;

// ---------------------------------------------------------------------------
// Helper: Ensure a ZPP_Vec2 has a public Vec2 wrapper. If the ZPP_Vec2
// already has a wrapper (`outer`), just return it. Otherwise create a new
// Vec2, pool the Vec2's default ZPP_Vec2, and re-bind the wrapper to point
// at the target ZPP_Vec2.
// ---------------------------------------------------------------------------

function ensureVec2Wrapper(zpp: Any): Any {
  if (zpp.outer == null) {
    const nape = getNape();
    zpp.outer = new nape.geom.Vec2();
    // Pool the default ZPP_Vec2 that the Vec2 constructor created
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
    // Re-bind wrapper to target ZPP_Vec2
    zpp.outer.zpp_inner = zpp;
  }
  return zpp.outer;
}

// ---------------------------------------------------------------------------
// Vec2Iterator
// ---------------------------------------------------------------------------

function Vec2Iterator(this: Any) {
  this.zpp_next = null;
  this.zpp_critical = false;
  this.zpp_i = 0;
  this.zpp_inner = null;
  if (!ZPP_Vec2List.internal) {
    throw new Error("Error: Cannot instantiate Vec2Iterator derp!");
  }
}

Vec2Iterator.__name__ = ["nape", "geom", "Vec2Iterator"];
Vec2Iterator.zpp_pool = null as Any;

Vec2Iterator.get = function (list: Any): Any {
  let ret: Any;
  if (Vec2Iterator.zpp_pool == null) {
    ZPP_Vec2List.internal = true;
    ret = new (Vec2Iterator as Any)();
    ZPP_Vec2List.internal = false;
  } else {
    ret = Vec2Iterator.zpp_pool;
    Vec2Iterator.zpp_pool = ret.zpp_next;
  }
  ret.zpp_i = 0;
  ret.zpp_inner = list;
  ret.zpp_critical = false;
  return ret;
};

Vec2Iterator.prototype.zpp_inner = null;
Vec2Iterator.prototype.zpp_i = null;
Vec2Iterator.prototype.zpp_critical = null;
Vec2Iterator.prototype.zpp_next = null;

Vec2Iterator.prototype.hasNext = function (this: Any): boolean {
  this.zpp_inner.zpp_inner.valmod();
  const length = this.zpp_inner.zpp_gl();
  this.zpp_critical = true;
  if (this.zpp_i < length) {
    return true;
  } else {
    this.zpp_next = Vec2Iterator.zpp_pool;
    Vec2Iterator.zpp_pool = this;
    this.zpp_inner = null;
    return false;
  }
};

Vec2Iterator.prototype.next = function (this: Any): Any {
  this.zpp_critical = false;
  return this.zpp_inner.at(this.zpp_i++);
};

Vec2Iterator.prototype.__class__ = Vec2Iterator;

// ---------------------------------------------------------------------------
// Vec2List
// ---------------------------------------------------------------------------

function Vec2ListCtor(this: Any) {
  this.zpp_inner = null;
  this.zpp_inner = new ZPP_Vec2List();
  this.zpp_inner.outer = this;
}

Vec2ListCtor.__name__ = ["nape", "geom", "Vec2List"];

Vec2ListCtor.fromArray = function (array: Any[]): Any {
  if (array == null) {
    throw new Error("Error: Cannot convert null Array to Nape list");
  }
  const nape = getNape();
  const ret = new nape.geom.Vec2List();
  for (let i = 0; i < array.length; i++) {
    ret.push(array[i]);
  }
  return ret;
};

Vec2ListCtor.prototype.zpp_inner = null;

Object.defineProperty(Vec2ListCtor.prototype, "length", {
  get: function (this: Any) {
    return this.get_length();
  },
});

Vec2ListCtor.prototype.get_length = function (this: Any): number {
  return this.zpp_gl();
};

Vec2ListCtor.prototype.zpp_gl = function (this: Any): number {
  this.zpp_inner.valmod();
  if (this.zpp_inner.zip_length) {
    this.zpp_inner.zip_length = false;
    this.zpp_inner.user_length = this.zpp_inner.inner.length;
  }
  return this.zpp_inner.user_length;
};

Vec2ListCtor.prototype.zpp_vm = function (this: Any): void {
  this.zpp_inner.valmod();
};

Vec2ListCtor.prototype.has = function (this: Any, obj: Any): boolean {
  this.zpp_vm();
  return this.zpp_inner.inner.has(obj.zpp_inner);
};

Vec2ListCtor.prototype.at = function (this: Any, index: number): Any {
  this.zpp_vm();
  if (index < 0 || index >= this.zpp_gl()) {
    throw new Error("Error: Index out of bounds");
  }
  if (this.zpp_inner.reverse_flag) {
    index = this.zpp_gl() - 1 - index;
  }
  if (index < this.zpp_inner.at_index || this.zpp_inner.at_ite == null) {
    this.zpp_inner.at_index = index;
    this.zpp_inner.at_ite = this.zpp_inner.inner.iterator_at(index);
  } else {
    while (this.zpp_inner.at_index != index) {
      this.zpp_inner.at_index++;
      this.zpp_inner.at_ite = this.zpp_inner.at_ite.next;
    }
  }
  return ensureVec2Wrapper(this.zpp_inner.at_ite.elt);
};

Vec2ListCtor.prototype.push = function (this: Any, obj: Any): boolean {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  this.zpp_inner.modify_test();
  this.zpp_vm();
  const cont = this.zpp_inner.adder != null ? this.zpp_inner.adder(obj) : true;
  if (cont) {
    if (this.zpp_inner.reverse_flag) {
      this.zpp_inner.inner.add(obj.zpp_inner);
    } else {
      if (this.zpp_inner.push_ite == null) {
        this.zpp_inner.push_ite = this.empty()
          ? null
          : this.zpp_inner.inner.iterator_at(this.zpp_gl() - 1);
      }
      this.zpp_inner.push_ite = this.zpp_inner.inner.insert(
        this.zpp_inner.push_ite,
        obj.zpp_inner,
      );
    }
    this.zpp_inner.invalidate();
    if (this.zpp_inner.post_adder != null) {
      this.zpp_inner.post_adder(obj);
    }
  }
  return cont;
};

Vec2ListCtor.prototype.unshift = function (this: Any, obj: Any): boolean {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  this.zpp_inner.modify_test();
  this.zpp_vm();
  const cont = this.zpp_inner.adder != null ? this.zpp_inner.adder(obj) : true;
  if (cont) {
    if (this.zpp_inner.reverse_flag) {
      if (this.zpp_inner.push_ite == null) {
        this.zpp_inner.push_ite = this.empty()
          ? null
          : this.zpp_inner.inner.iterator_at(this.zpp_gl() - 1);
      }
      this.zpp_inner.push_ite = this.zpp_inner.inner.insert(
        this.zpp_inner.push_ite,
        obj.zpp_inner,
      );
    } else {
      this.zpp_inner.inner.add(obj.zpp_inner);
    }
    this.zpp_inner.invalidate();
    if (this.zpp_inner.post_adder != null) {
      this.zpp_inner.post_adder(obj);
    }
  }
  return cont;
};

Vec2ListCtor.prototype.pop = function (this: Any): Any {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  this.zpp_inner.modify_test();
  if (this.empty()) {
    throw new Error("Error: Cannot remove from empty list");
  }
  this.zpp_vm();
  let ret: Any;
  if (this.zpp_inner.reverse_flag) {
    ret = this.zpp_inner.inner.head.elt;
    const retx = ensureVec2Wrapper(ret);
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.zpp_inner.inner.pop();
    }
  } else {
    if (this.zpp_inner.at_ite != null && this.zpp_inner.at_ite.next == null) {
      this.zpp_inner.at_ite = null;
    }
    const ite =
      this.zpp_gl() == 1
        ? null
        : this.zpp_inner.inner.iterator_at(this.zpp_gl() - 2);
    ret = ite == null ? this.zpp_inner.inner.head.elt : ite.next.elt;
    const retx = ensureVec2Wrapper(ret);
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.zpp_inner.inner.erase(ite);
    }
  }
  this.zpp_inner.invalidate();
  return ensureVec2Wrapper(ret);
};

Vec2ListCtor.prototype.shift = function (this: Any): Any {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  this.zpp_inner.modify_test();
  if (this.empty()) {
    throw new Error("Error: Cannot remove from empty list");
  }
  this.zpp_vm();
  let ret: Any;
  if (this.zpp_inner.reverse_flag) {
    if (this.zpp_inner.at_ite != null && this.zpp_inner.at_ite.next == null) {
      this.zpp_inner.at_ite = null;
    }
    const ite =
      this.zpp_gl() == 1
        ? null
        : this.zpp_inner.inner.iterator_at(this.zpp_gl() - 2);
    ret = ite == null ? this.zpp_inner.inner.head.elt : ite.next.elt;
    const retx = ensureVec2Wrapper(ret);
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.zpp_inner.inner.erase(ite);
    }
  } else {
    ret = this.zpp_inner.inner.head.elt;
    const retx = ensureVec2Wrapper(ret);
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.zpp_inner.inner.pop();
    }
  }
  this.zpp_inner.invalidate();
  return ensureVec2Wrapper(ret);
};

Vec2ListCtor.prototype.add = function (this: Any, obj: Any): boolean {
  if (this.zpp_inner.reverse_flag) {
    return this.push(obj);
  } else {
    return this.unshift(obj);
  }
};

Vec2ListCtor.prototype.remove = function (this: Any, obj: Any): boolean {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  this.zpp_inner.modify_test();
  this.zpp_vm();
  let found = false;
  let cx_ite = this.zpp_inner.inner.head;
  while (cx_ite != null) {
    if (cx_ite.elt == obj.zpp_inner) {
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
      this.zpp_inner.inner.remove(obj.zpp_inner);
    }
    this.zpp_inner.invalidate();
  }
  return found;
};

Vec2ListCtor.prototype.clear = function (this: Any): void {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: Vec2List is immutable");
  }
  if (this.zpp_inner.reverse_flag) {
    while (!this.empty()) this.pop();
  } else {
    while (!this.empty()) this.shift();
  }
};

Vec2ListCtor.prototype.empty = function (this: Any): boolean {
  return this.zpp_gl() == 0;
};

Vec2ListCtor.prototype.iterator = function (this: Any): Any {
  this.zpp_vm();
  return Vec2Iterator.get(this);
};

Vec2ListCtor.prototype.copy = function (this: Any, deep?: boolean): Any {
  if (deep == null) deep = false;
  const nape = getNape();
  const ret = new nape.geom.Vec2List();
  const it = Vec2Iterator.get(this);
  while (it.hasNext()) {
    const i = it.next();
    let elem: Any;
    if (deep) {
      // Deep copy: create a new Vec2 with same coordinates
      if (i != null && i.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this = i.zpp_inner;
      if (_this._validate != null) _this._validate();
      const x = i.zpp_inner.x;
      const _this2 = i.zpp_inner;
      if (_this2._validate != null) _this2._validate();
      const y = i.zpp_inner.y;

      let copy: Any;
      if (ZPP_PubPool.poolVec2 == null) {
        copy = new nape.geom.Vec2();
      } else {
        copy = ZPP_PubPool.poolVec2;
        ZPP_PubPool.poolVec2 = copy.zpp_pool;
        copy.zpp_pool = null;
        copy.zpp_disp = false;
        if (copy == ZPP_PubPool.nextVec2) {
          ZPP_PubPool.nextVec2 = null;
        }
      }
      if (copy.zpp_inner == null) {
        let zpp: Any;
        if (ZPP_Vec2.zpp_pool == null) {
          zpp = new ZPP_Vec2();
        } else {
          zpp = ZPP_Vec2.zpp_pool;
          ZPP_Vec2.zpp_pool = zpp.next;
          zpp.next = null;
        }
        zpp.weak = false;
        zpp._immutable = false;
        zpp.x = x;
        zpp.y = y;
        copy.zpp_inner = zpp;
        copy.zpp_inner.outer = copy;
      } else {
        copy.zpp_inner.x = x;
        copy.zpp_inner.y = y;
        if (copy.zpp_inner._invalidate != null) {
          copy.zpp_inner._invalidate(copy.zpp_inner);
        }
      }
      copy.zpp_inner.weak = false;
      elem = copy;
    } else {
      elem = i;
    }
    ret.push(elem);
  }
  return ret;
};

Vec2ListCtor.prototype.merge = function (this: Any, xs: Any): void {
  if (xs == null) {
    throw new Error("Error: Cannot merge with null list");
  }
  const it = xs.iterator();
  while (it.hasNext()) {
    const x = it.next();
    if (!this.has(x)) {
      this.add(x);
    }
  }
};

Vec2ListCtor.prototype.toString = function (this: Any): string {
  let ret = "[";
  let fst = true;
  const it = Vec2Iterator.get(this);
  while (it.hasNext()) {
    const i = it.next();
    if (!fst) ret += ",";
    ret += i == null ? "NULL" : i.toString();
    fst = false;
  }
  return ret + "]";
};

Vec2ListCtor.prototype.foreach = function (this: Any, lambda: Any): Any {
  if (lambda == null) {
    throw new Error("Error: Cannot execute null on list elements");
  }
  const it = this.iterator();
  while (it.hasNext()) {
    try {
      lambda(it.next());
    } catch {
      it.zpp_next = Vec2Iterator.zpp_pool;
      Vec2Iterator.zpp_pool = it;
      it.zpp_inner = null;
      break;
    }
  }
  return this;
};

Vec2ListCtor.prototype.filter = function (this: Any, lambda: Any): Any {
  if (lambda == null) {
    throw new Error("Error: Cannot select elements of list with null");
  }
  let i = 0;
  while (i < this.zpp_gl()) {
    const x = this.at(i);
    try {
      if (lambda(x)) {
        ++i;
      } else {
        this.remove(x);
      }
    } catch {
      break;
    }
  }
  return this;
};

Vec2ListCtor.prototype.__class__ = Vec2ListCtor;

// ---------------------------------------------------------------------------
// Register in nape namespace
// ---------------------------------------------------------------------------

const nape = getNape();
nape.geom.Vec2Iterator = Vec2Iterator;
nape.geom.Vec2List = Vec2ListCtor;

// Fix up ZPP_MixVec2List: it copied prototype methods from the old compiled
// Vec2List stub at init time. Re-copy from the new TS prototype for methods
// that ZPP_MixVec2List doesn't override (has, add, empty, iterator, copy,
// merge, toString, foreach, filter, get_length, zpp_gl, zpp_vm).
const MixVec2List = nape.__zpp?.util?.ZPP_MixVec2List;
if (MixVec2List) {
  for (const k in Vec2ListCtor.prototype) {
    if (
      !Object.prototype.hasOwnProperty.call(MixVec2List.prototype, k) ||
      k === "__class__"
    ) {
      if (k !== "__class__") {
        MixVec2List.prototype[k] = (Vec2ListCtor.prototype as Any)[k];
      }
    }
  }
}

export { Vec2ListCtor as Vec2List, Vec2Iterator };
