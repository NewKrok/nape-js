/**
 * GeomVertexIterator — Iterator for circular doubly-linked vertex rings.
 *
 * Lazily creates Vec2 wrappers for each vertex on first access, binding
 * invalidation/validation callbacks to keep the wrapper in sync.
 */

import { getNape } from "../core/engine";
import { installIterable } from "../util/iterable";
import { ZPP_GeomVertexIterator } from "../native/geom/ZPP_GeomVertexIterator";

function GeomVertexIteratorCtor(this: any) {
  if (!ZPP_GeomVertexIterator.internal) {
    throw new Error("Cannot instantiate GeomVertexIterator");
  }
}

GeomVertexIteratorCtor.prototype.zpp_inner = null;

GeomVertexIteratorCtor.prototype.hasNext = function (this: any): boolean {
  if (this.zpp_inner == null) {
    throw new Error("Iterator has been disposed");
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
    throw new Error("Iterator has been disposed");
  }
  const vert = this.zpp_inner.ptr;
  if (vert.wrap == null) {
    const x = vert.x;
    const y = vert.y;

    if (x !== x || y !== y) {
      throw new Error("Vec2 components cannot be NaN");
    }

    const nape = getNape();
    const ret = nape.geom.Vec2.get(x, y);
    vert.wrap = ret;
    vert.wrap.zpp_inner._inuse = true;
    vert.wrap.zpp_inner._invalidate = (n: any) => vert.modwrap(n);
    vert.wrap.zpp_inner._validate = () => vert.getwrap();
  }

  const result = vert.wrap;
  this.zpp_inner.ptr = this.zpp_inner.forward ? this.zpp_inner.ptr.next : this.zpp_inner.ptr.prev;
  return result;
};

// ES6 iterable protocol — GeomVertexIterator is itself an iterator, so it is
// its own source (e.g. `for (const v of polygon.getVertexIterator())`).
installIterable(GeomVertexIteratorCtor.prototype, (self) => self);

// ---------------------------------------------------------------------------
// Register in nape namespace
// ---------------------------------------------------------------------------

const nape = getNape();
nape.geom.GeomVertexIterator = GeomVertexIteratorCtor;

export { GeomVertexIteratorCtor as GeomVertexIterator };
