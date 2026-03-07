/**
 * GeomVertexIterator — Iterator for circular doubly-linked vertex rings.
 *
 * Lazily creates Vec2 wrappers for each vertex on first access, binding
 * invalidation/validation callbacks to keep the wrapper in sync.
 *
 * Converted from nape-compiled.js lines 8382–8517.
 */

import { getNape } from "../core/engine";
import { ZPP_GeomVertexIterator } from "../native/geom/ZPP_GeomVertexIterator";
import { ZPP_Vec2 } from "../native/geom/ZPP_Vec2";
import { ZPP_PubPool } from "../native/util/ZPP_PubPool";


function GeomVertexIteratorCtor(this: any) {
  if (!ZPP_GeomVertexIterator.internal) {
    throw new Error("Error: Cannot instantiate GeomVertexIterator");
  }
}

GeomVertexIteratorCtor.__name__ = ["nape", "geom", "GeomVertexIterator"];

GeomVertexIteratorCtor.prototype.zpp_inner = null;

GeomVertexIteratorCtor.prototype.hasNext = function (this: any): boolean {
  if (this.zpp_inner == null) {
    throw new Error("Error: Iterator has been disposed");
  }
  const ret = this.zpp_inner.ptr != this.zpp_inner.start || this.zpp_inner.first;
  this.zpp_inner.first = false;
  if (!ret) {
    const o = this.zpp_inner;
    o.outer.zpp_inner = null;
    o.ptr = o.start = null;
    o.next = ZPP_GeomVertexIterator.zpp_pool;
    ZPP_GeomVertexIterator.zpp_pool = o;
  }
  return ret;
};

GeomVertexIteratorCtor.prototype.next = function (this: any): any {
  if (this.zpp_inner == null) {
    throw new Error("Error: Iterator has been disposed");
  }
  const vert = this.zpp_inner.ptr;
  if (vert.wrap == null) {
    const x = vert.x;
    const y = vert.y;

    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }

    const nape = getNape();
    let ret: any;
    if (ZPP_PubPool.poolVec2 == null) {
      ret = new nape.geom.Vec2();
    } else {
      ret = ZPP_PubPool.poolVec2;
      ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == ZPP_PubPool.nextVec2) {
        ZPP_PubPool.nextVec2 = null;
      }
    }

    if (ret.zpp_inner == null) {
      let zpp: any;
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
      ret.zpp_inner = zpp;
      ret.zpp_inner.outer = ret;
    } else {
      if (ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const inner = ret.zpp_inner;
      if (inner._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (inner._isimmutable != null) {
        inner._isimmutable();
      }
      if (!(inner.x == x && inner.y == y)) {
        inner.x = x;
        inner.y = y;
        if (inner._invalidate != null) {
          inner._invalidate(inner);
        }
      }
    }
    ret.zpp_inner.weak = false;
    vert.wrap = ret;
    vert.wrap.zpp_inner._inuse = true;
    vert.wrap.zpp_inner._invalidate = (n: any) => vert.modwrap(n);
    vert.wrap.zpp_inner._validate = () => vert.getwrap();
  }

  const result = vert.wrap;
  this.zpp_inner.ptr = this.zpp_inner.forward
    ? this.zpp_inner.ptr.next
    : this.zpp_inner.ptr.prev;
  return result;
};


// ---------------------------------------------------------------------------
// Register in nape namespace
// ---------------------------------------------------------------------------

const nape = getNape();
nape.geom.GeomVertexIterator = GeomVertexIteratorCtor;

export { GeomVertexIteratorCtor as GeomVertexIterator };
