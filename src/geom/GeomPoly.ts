import { getNape } from "../core/engine";
import { ZPP_GeomPoly } from "../native/geom/ZPP_GeomPoly";
import { ZPP_PubPool } from "../native/util/ZPP_PubPool";
import { ZPP_Flags } from "../native/util/ZPP_Flags";
import { Vec2 } from "./Vec2";
import { AABB } from "./AABB";
import "./Winding"; // Side-effect: register Winding in namespace before GeomPoly methods use it

type Any = any;

/**
 * A polygon represented as a circular doubly-linked list of vertices.
 *
 * Supports construction from Array<Vec2>, Vec2List, or another GeomPoly.
 * Provides geometric queries (area, winding, containment, convexity)
 * and decomposition algorithms (simple, monotone, convex, triangular).
 *
 * Converted from nape-compiled.js lines 16271–19420.
 */
export class GeomPoly {
  static __name__ = ["nape", "geom", "GeomPoly"];

  zpp_inner: ZPP_GeomPoly;
  zpp_pool: GeomPoly | null = null;
  zpp_disp: boolean = false;

  get _inner(): Any {
    return this;
  }

  constructor(vertices?: Any) {
    this.zpp_inner = new ZPP_GeomPoly(this);
    if (vertices != null) {
      GeomPoly._addVertices(this, vertices);
      this.skipForward(1);
      GeomPoly._disposeWeakInputs(vertices);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private _checkDisposed(): void {
    if (this.zpp_disp) {
      throw new Error("Error: GeomPoly has been disposed and cannot be used!");
    }
  }

  /** @internal Get compiled ZPP_GeomVert class */
  private static _gvClass(): Any {
    return getNape().__zpp.geom.ZPP_GeomVert;
  }

  /** @internal Create a ZPP_GeomVert from pool or new */
  private static _createVert(x: number, y: number): Any {
    const GV = GeomPoly._gvClass();
    let ret: Any;
    if (GV.zpp_pool == null) {
      ret = new GV();
    } else {
      ret = GV.zpp_pool;
      GV.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.forced = false;
    ret.x = x;
    ret.y = y;
    return ret;
  }

  /** @internal Insert vertex after current head (push pattern) */
  private static _pushVert(target: GeomPoly, obj: Any): void {
    if (target.zpp_inner.vertices == null) {
      target.zpp_inner.vertices = obj.prev = obj.next = obj;
    } else {
      obj.prev = target.zpp_inner.vertices;
      obj.next = target.zpp_inner.vertices.next;
      target.zpp_inner.vertices.next.prev = obj;
      target.zpp_inner.vertices.next = obj;
    }
    target.zpp_inner.vertices = obj;
  }

  /** @internal Insert vertex before current head (unshift pattern) */
  private static _unshiftVert(target: GeomPoly, obj: Any): void {
    if (target.zpp_inner.vertices == null) {
      target.zpp_inner.vertices = obj.prev = obj.next = obj;
    } else {
      obj.next = target.zpp_inner.vertices;
      obj.prev = target.zpp_inner.vertices.prev;
      target.zpp_inner.vertices.prev.next = obj;
      target.zpp_inner.vertices.prev = obj;
    }
    target.zpp_inner.vertices = obj;
  }

  /** @internal Free a vertex: cleanup wrap + return to pool */
  private static _freeVert(vert: Any): void {
    const GV = GeomPoly._gvClass();
    vert.free();
    vert.next = GV.zpp_pool;
    GV.zpp_pool = vert;
  }

  /** @internal Remove head, new head = prev (pop direction) */
  private _popHead(): Any {
    const v = this.zpp_inner.vertices;
    if (v.prev === v) {
      v.next = v.prev = null;
      this.zpp_inner.vertices = null;
    } else {
      const newHead = v.prev;
      v.prev.next = v.next;
      v.next.prev = v.prev;
      v.next = v.prev = null;
      this.zpp_inner.vertices = newHead;
    }
    return v;
  }

  /** @internal Remove head, new head = next (shift direction) */
  private _shiftHead(): Any {
    const v = this.zpp_inner.vertices;
    if (v.prev === v) {
      v.next = v.prev = null;
      this.zpp_inner.vertices = null;
    } else {
      const newHead = v.next;
      v.prev.next = v.next;
      v.next.prev = v.prev;
      v.next = v.prev = null;
      this.zpp_inner.vertices = newHead;
    }
    return v;
  }

  /** @internal Check if polygon is degenerate (< 3 vertices) */
  private _isDegenRing(): boolean {
    const v = this.zpp_inner.vertices;
    return v == null || v.next == null || v.prev === v.next;
  }

  /** @internal Iterate all vertices, calling fn for each */
  private _forEachVert(fn: (v: Any) => void): void {
    const F = this.zpp_inner.vertices;
    if (F != null) {
      let nite = F;
      do {
        fn(nite);
        nite = nite.next;
      } while (nite !== F);
    }
  }

  /** @internal Find extremal vertex (min/max of x or y) */
  private _extremalVert(prop: "x" | "y", findMin: boolean): Vec2 {
    this._checkDisposed();
    if (this.zpp_inner.vertices == null) {
      const label = findMin
        ? prop === "y"
          ? "topmost"
          : "leftmost"
        : prop === "y"
          ? "bottommost"
          : "rightmost";
      throw new Error("Error: empty GeomPoly has no defineable " + label + " vertex");
    }
    let best = this.zpp_inner.vertices;
    let cur = best.next;
    while (cur !== this.zpp_inner.vertices) {
      if (findMin ? cur[prop] < best[prop] : cur[prop] > best[prop]) {
        best = cur;
      }
      cur = cur.next;
    }
    return best.wrapper();
  }

  /** @internal Add vertices from constructor/get argument */
  private static _addVertices(target: GeomPoly, vertices: Any): void {
    const nape = getNape();

    if (vertices instanceof Array) {
      for (let i = 0; i < vertices.length; i++) {
        const vite = vertices[i];
        if (vite == null) {
          throw new Error("Error: Array<Vec2> contains null objects");
        }
        if (!(vite instanceof Vec2)) {
          throw new Error("Error: Array<Vec2> contains non Vec2 objects");
        }
        const v = vite as Vec2;
        if (v.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        v.zpp_inner.validate();
        const x = v.zpp_inner.x;
        v.zpp_inner.validate();
        const y = v.zpp_inner.y;
        const obj = GeomPoly._createVert(x, y);
        GeomPoly._pushVert(target, obj);
      }
    } else if (vertices instanceof nape.geom.Vec2List) {
      const iter = vertices.iterator();
      while (iter.hasNext()) {
        const v1 = iter.next();
        if (v1 == null) {
          throw new Error("Error: Vec2List contains null objects");
        }
        if (v1.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        v1.zpp_inner.validate();
        const x = v1.zpp_inner.x;
        v1.zpp_inner.validate();
        const y = v1.zpp_inner.y;
        const obj = GeomPoly._createVert(x, y);
        GeomPoly._pushVert(target, obj);
      }
    } else if (vertices instanceof GeomPoly) {
      if (vertices.zpp_disp) {
        throw new Error("Error: GeomPoly has been disposed and cannot be used!");
      }
      const verts = vertices.zpp_inner.vertices;
      if (verts != null) {
        let vite = verts;
        do {
          const obj = GeomPoly._createVert(vite.x, vite.y);
          GeomPoly._pushVert(target, obj);
          vite = vite.next;
        } while (vite !== verts);
      }
    } else {
      throw new Error(
        "Error: Invalid type for polygon object, should be Array<Vec2>, Vec2List, GeomPoly or for flash10+ flash.Vector<Vec2>",
      );
    }
  }

  /** @internal After copying, dispose weak Vec2 inputs */
  private static _disposeWeakInputs(vertices: Any): void {
    if (vertices instanceof Array) {
      let i = 0;
      while (i < vertices.length) {
        const cur = vertices[i] as Vec2;
        if (cur.zpp_inner && cur.zpp_inner.weak) {
          cur.dispose();
          vertices.splice(i, 1);
        } else {
          i++;
        }
      }
    } else if (vertices instanceof getNape().geom.Vec2List) {
      const lv = vertices;
      if (lv.zpp_inner._validate != null) {
        lv.zpp_inner._validate();
      }
      const ins = lv.zpp_inner.inner;
      let pre: Any = null;
      let cur = ins.head;
      while (cur != null) {
        const x = cur.elt;
        if (x.outer && x.outer.zpp_inner && x.outer.zpp_inner.weak) {
          cur = ins.erase(pre);
          if (x.outer.zpp_inner.weak) {
            x.outer.dispose();
          }
        } else {
          pre = cur;
          cur = cur.next;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Static factory
  // ---------------------------------------------------------------------------

  static get(vertices?: Any): GeomPoly {
    let ret: GeomPoly;
    if (ZPP_PubPool.poolGeomPoly == null) {
      ret = new GeomPoly();
    } else {
      ret = ZPP_PubPool.poolGeomPoly;
      ZPP_PubPool.poolGeomPoly = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret === ZPP_PubPool.nextGeomPoly) {
        ZPP_PubPool.nextGeomPoly = null;
      }
    }
    if (vertices != null) {
      GeomPoly._addVertices(ret, vertices);
      ret.skipForward(1);
      GeomPoly._disposeWeakInputs(vertices);
    }
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Query methods
  // ---------------------------------------------------------------------------

  empty(): boolean {
    this._checkDisposed();
    return this.zpp_inner.vertices == null;
  }

  size(): number {
    this._checkDisposed();
    let ret = 0;
    this._forEachVert(() => ret++);
    return ret;
  }

  iterator(): Any {
    this._checkDisposed();
    return getNape().__zpp.geom.ZPP_GeomVertexIterator.get(this.zpp_inner.vertices, true);
  }

  forwardIterator(): Any {
    this._checkDisposed();
    return getNape().__zpp.geom.ZPP_GeomVertexIterator.get(this.zpp_inner.vertices, true);
  }

  backwardsIterator(): Any {
    this._checkDisposed();
    return getNape().__zpp.geom.ZPP_GeomVertexIterator.get(this.zpp_inner.vertices, false);
  }

  current(): Vec2 {
    this._checkDisposed();
    if (this.zpp_inner.vertices == null) {
      throw new Error("Error: GeomPoly is empty");
    }
    return this.zpp_inner.vertices.wrapper();
  }

  // ---------------------------------------------------------------------------
  // Mutation methods
  // ---------------------------------------------------------------------------

  push(vertex: Vec2): this {
    this._checkDisposed();
    if (vertex != null && vertex.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (vertex == null) {
      throw new Error("Error: Cannot push null vertex");
    }
    vertex.zpp_inner.validate();
    const x = vertex.zpp_inner.x;
    vertex.zpp_inner.validate();
    const y = vertex.zpp_inner.y;
    const obj = GeomPoly._createVert(x, y);
    GeomPoly._pushVert(this, obj);
    if (vertex.zpp_inner.weak) {
      vertex.dispose();
    }
    return this;
  }

  pop(): this {
    this._checkDisposed();
    if (this.zpp_inner.vertices == null) {
      throw new Error("Error: Cannot pop from empty polygon");
    }
    const retv = this._popHead();
    GeomPoly._freeVert(retv);
    return this;
  }

  unshift(vertex: Vec2): this {
    this._checkDisposed();
    if (vertex != null && vertex.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (vertex == null) {
      throw new Error("Error: Cannot unshift null vertex");
    }
    vertex.zpp_inner.validate();
    const x = vertex.zpp_inner.x;
    vertex.zpp_inner.validate();
    const y = vertex.zpp_inner.y;
    const obj = GeomPoly._createVert(x, y);
    GeomPoly._unshiftVert(this, obj);
    if (vertex.zpp_inner.weak) {
      vertex.dispose();
    }
    return this;
  }

  shift(): this {
    this._checkDisposed();
    if (this.zpp_inner.vertices == null) {
      throw new Error("Error: Cannot shift from empty polygon");
    }
    const retv = this._shiftHead();
    GeomPoly._freeVert(retv);
    return this;
  }

  skipForward(times: number): this {
    this._checkDisposed();
    if (this.zpp_inner.vertices != null) {
      if (times > 0) {
        while (times-- > 0) this.zpp_inner.vertices = this.zpp_inner.vertices.next;
      } else if (times < 0) {
        while (times++ < 0) this.zpp_inner.vertices = this.zpp_inner.vertices.prev;
      }
    }
    return this;
  }

  skipBackwards(times: number): this {
    this._checkDisposed();
    return this.skipForward(-times);
  }

  erase(count: number): this {
    this._checkDisposed();
    while (count !== 0 && this.zpp_inner.vertices != null) {
      let retv: Any;
      if (count > 0) {
        retv = this._shiftHead();
        --count;
      } else {
        retv = this._popHead();
        ++count;
      }
      GeomPoly._freeVert(retv);
    }
    return this;
  }

  clear(): this {
    this._checkDisposed();
    while (this.zpp_inner.vertices != null) {
      const tmp = this._shiftHead();
      GeomPoly._freeVert(tmp);
    }
    return this;
  }

  copy(): GeomPoly {
    this._checkDisposed();
    const ret = GeomPoly.get();
    this._forEachVert((v: Any) => {
      const obj = GeomPoly._createVert(v.x, v.y);
      GeomPoly._pushVert(ret, obj);
    });
    return ret.skipForward(1);
  }

  dispose(): void {
    if (this.zpp_disp) {
      throw new Error("Error: GeomPoly has been disposed and cannot be used!");
    }
    this.clear();
    this.zpp_pool = null;
    if (ZPP_PubPool.nextGeomPoly != null) {
      ZPP_PubPool.nextGeomPoly.zpp_pool = this;
    } else {
      ZPP_PubPool.poolGeomPoly = this;
    }
    ZPP_PubPool.nextGeomPoly = this;
    this.zpp_disp = true;
  }

  // ---------------------------------------------------------------------------
  // Geometry queries
  // ---------------------------------------------------------------------------

  area(): number {
    this._checkDisposed();
    if (this._isDegenRing()) return 0.0;
    let area = 0.0;
    this._forEachVert((v: Any) => {
      area += v.x * (v.next.y - v.prev.y);
    });
    const result = area * 0.5;
    return result < 0 ? -result : result;
  }

  winding(): Any {
    this._checkDisposed();
    if (this._isDegenRing()) {
      if (ZPP_Flags.Winding_UNDEFINED == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.Winding_UNDEFINED = new (getNape().geom.Winding)();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.Winding_UNDEFINED;
    }
    let area = 0.0;
    this._forEachVert((v: Any) => {
      area += v.x * (v.next.y - v.prev.y);
    });
    const a = area * 0.5;
    if (a > 0) {
      if (ZPP_Flags.Winding_CLOCKWISE == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.Winding_CLOCKWISE = new (getNape().geom.Winding)();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.Winding_CLOCKWISE;
    } else if (a === 0) {
      if (ZPP_Flags.Winding_UNDEFINED == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.Winding_UNDEFINED = new (getNape().geom.Winding)();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.Winding_UNDEFINED;
    } else {
      if (ZPP_Flags.Winding_ANTICLOCKWISE == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.Winding_ANTICLOCKWISE = new (getNape().geom.Winding)();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.Winding_ANTICLOCKWISE;
    }
  }

  contains(point: Vec2): boolean {
    this._checkDisposed();
    if (point != null && point.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (point == null) {
      throw new Error("Error: GeomPoly::contains point cannot be null");
    }
    point.zpp_inner.validate();
    const px = point.zpp_inner.x;
    point.zpp_inner.validate();
    const py = point.zpp_inner.y;

    let ret = false;
    this._forEachVert((p: Any) => {
      const q = p.prev;
      if (
        ((p.y < py && q.y >= py) || (q.y < py && p.y >= py)) &&
        (p.x <= px || q.x <= px)
      ) {
        if (p.x + ((py - p.y) / (q.y - p.y)) * (q.x - p.x) < px) {
          ret = !ret;
        }
      }
    });

    if (point.zpp_inner.weak) {
      point.dispose();
    }
    return ret;
  }

  isClockwise(): boolean {
    const w = this.winding();
    if (ZPP_Flags.Winding_CLOCKWISE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.Winding_CLOCKWISE = new (getNape().geom.Winding)();
      ZPP_Flags.internal = false;
    }
    return w === ZPP_Flags.Winding_CLOCKWISE;
  }

  isConvex(): boolean {
    this._checkDisposed();
    if (this._isDegenRing()) return true;

    let neg = false;
    let pos = false;
    let ret = true;
    const F = this.zpp_inner.vertices;
    let nite = F;
    do {
      const v = nite;
      const u = v.prev;
      const w = v.next;
      const ax = w.x - v.x;
      const ay = w.y - v.y;
      const bx = v.x - u.x;
      const by = v.y - u.y;
      const dot = by * ax - bx * ay;
      if (dot > 0.0) pos = true;
      else if (dot < 0.0) neg = true;
      if (pos && neg) {
        ret = false;
        break;
      }
      nite = nite.next;
    } while (nite !== F);
    return ret;
  }

  isSimple(): boolean {
    this._checkDisposed();
    if (this._isDegenRing()) return true;
    return getNape().__zpp.geom.ZPP_Simple.isSimple(this.zpp_inner.vertices);
  }

  isMonotone(): boolean {
    this._checkDisposed();
    if (this._isDegenRing()) return true;
    return getNape().__zpp.geom.ZPP_Monotone.isMonotone(this.zpp_inner.vertices);
  }

  isDegenerate(): boolean {
    this._checkDisposed();
    if (this._isDegenRing()) return true;
    return this.area() < getNape().Config.epsilon;
  }

  // ---------------------------------------------------------------------------
  // Decomposition / simplification
  // ---------------------------------------------------------------------------

  simplify(epsilon: number): GeomPoly {
    this._checkDisposed();
    if (epsilon <= 0.0) {
      throw new Error("Error: Epsilon should be > 0 for simplifying a GeomPoly");
    }
    if (this._isDegenRing()) return this.copy();
    const x = getNape().__zpp.geom.ZPP_Simplify.simplify(this.zpp_inner.vertices, epsilon);
    const ret = GeomPoly.get();
    ret.zpp_inner.vertices = x;
    return ret;
  }

  simpleDecomposition(output?: Any): Any {
    this._checkDisposed();
    if (this._isDegenRing()) {
      throw new Error("Error: Cannot decompose a degenerate polygon");
    }
    const zpp = getNape().__zpp;
    const nape = getNape();
    const MPs = this.zpp_inner.vertices;
    if (zpp.geom.ZPP_PartitionedPoly.sharedGVList == null) {
      zpp.geom.ZPP_PartitionedPoly.sharedGVList = new (zpp.util.ZNPList_ZPP_GeomVert)();
    }
    const MPs1 = zpp.geom.ZPP_Simple.decompose(MPs, zpp.geom.ZPP_PartitionedPoly.sharedGVList);
    const ret = output == null ? new (nape.geom.GeomPolyList)() : output;
    while (MPs1.head != null) {
      const MP = MPs1.pop_unsafe();
      const x = GeomPoly.get();
      x.zpp_inner.vertices = MP;
      if (ret.zpp_inner.reverse_flag) {
        ret.push(x);
      } else {
        ret.unshift(x);
      }
    }
    return ret;
  }

  monotoneDecomposition(output?: Any): Any {
    this._checkDisposed();
    if (this._isDegenRing()) {
      throw new Error("Error: Cannot decompose a degenerate polygon");
    }
    const zpp = getNape().__zpp;
    const nape = getNape();
    const poly = this.zpp_inner.vertices;
    if (zpp.geom.ZPP_Monotone.sharedPPoly == null) {
      zpp.geom.ZPP_Monotone.sharedPPoly = new (zpp.geom.ZPP_PartitionedPoly)();
    }
    const poly1 = zpp.geom.ZPP_Monotone.decompose(poly, zpp.geom.ZPP_Monotone.sharedPPoly);
    if (zpp.geom.ZPP_PartitionedPoly.sharedGVList == null) {
      zpp.geom.ZPP_PartitionedPoly.sharedGVList = new (zpp.util.ZNPList_ZPP_GeomVert)();
    }
    const MPs = poly1.extract(zpp.geom.ZPP_PartitionedPoly.sharedGVList);
    const ret = output == null ? new (nape.geom.GeomPolyList)() : output;
    while (MPs.head != null) {
      const MP = MPs.pop_unsafe();
      const x = GeomPoly.get();
      x.zpp_inner.vertices = MP;
      if (ret.zpp_inner.reverse_flag) {
        ret.push(x);
      } else {
        ret.unshift(x);
      }
    }
    return ret;
  }

  convexDecomposition(delaunay: boolean = false, output?: Any): Any {
    this._checkDisposed();
    if (this._isDegenRing()) {
      throw new Error("Error: Cannot decompose a degenerate polygon");
    }
    const zpp = getNape().__zpp;
    const nape = getNape();
    const poly = this.zpp_inner.vertices;
    if (zpp.geom.ZPP_Monotone.sharedPPoly == null) {
      zpp.geom.ZPP_Monotone.sharedPPoly = new (zpp.geom.ZPP_PartitionedPoly)();
    }
    const poly1 = zpp.geom.ZPP_Monotone.decompose(poly, zpp.geom.ZPP_Monotone.sharedPPoly);
    if (zpp.geom.ZPP_PartitionedPoly.sharedPPList == null) {
      zpp.geom.ZPP_PartitionedPoly.sharedPPList = new (zpp.util.ZNPList_ZPP_PartitionedPoly)();
    }
    const MPs = poly1.extract_partitions(zpp.geom.ZPP_PartitionedPoly.sharedPPList);
    const ret = output == null ? new (nape.geom.GeomPolyList)() : output;
    while (MPs.head != null) {
      const MP = MPs.pop_unsafe();
      zpp.geom.ZPP_Triangular.triangulate(MP);
      if (delaunay) {
        zpp.geom.ZPP_Triangular.optimise(MP);
      }
      zpp.geom.ZPP_Convex.optimise(MP);
      if (zpp.geom.ZPP_PartitionedPoly.sharedGVList == null) {
        zpp.geom.ZPP_PartitionedPoly.sharedGVList = new (zpp.util.ZNPList_ZPP_GeomVert)();
      }
      const MQs = MP.extract(zpp.geom.ZPP_PartitionedPoly.sharedGVList);
      const o = MP;
      o.next = zpp.geom.ZPP_PartitionedPoly.zpp_pool;
      zpp.geom.ZPP_PartitionedPoly.zpp_pool = o;
      while (MQs.head != null) {
        const MQ = MQs.pop_unsafe();
        const x = GeomPoly.get();
        x.zpp_inner.vertices = MQ;
        if (ret.zpp_inner.reverse_flag) {
          ret.push(x);
        } else {
          ret.unshift(x);
        }
      }
    }
    return ret;
  }

  triangularDecomposition(delaunay: boolean = false, output?: Any): Any {
    this._checkDisposed();
    if (this._isDegenRing()) {
      throw new Error("Error: Cannot decompose a degenerate polygon");
    }
    const zpp = getNape().__zpp;
    const nape = getNape();
    const poly = this.zpp_inner.vertices;
    if (zpp.geom.ZPP_Monotone.sharedPPoly == null) {
      zpp.geom.ZPP_Monotone.sharedPPoly = new (zpp.geom.ZPP_PartitionedPoly)();
    }
    const poly1 = zpp.geom.ZPP_Monotone.decompose(poly, zpp.geom.ZPP_Monotone.sharedPPoly);
    if (zpp.geom.ZPP_PartitionedPoly.sharedPPList == null) {
      zpp.geom.ZPP_PartitionedPoly.sharedPPList = new (zpp.util.ZNPList_ZPP_PartitionedPoly)();
    }
    const MPs = poly1.extract_partitions(zpp.geom.ZPP_PartitionedPoly.sharedPPList);
    const ret = output == null ? new (nape.geom.GeomPolyList)() : output;
    while (MPs.head != null) {
      const MP = MPs.pop_unsafe();
      zpp.geom.ZPP_Triangular.triangulate(MP);
      if (delaunay) {
        zpp.geom.ZPP_Triangular.optimise(MP);
      }
      if (zpp.geom.ZPP_PartitionedPoly.sharedGVList == null) {
        zpp.geom.ZPP_PartitionedPoly.sharedGVList = new (zpp.util.ZNPList_ZPP_GeomVert)();
      }
      const MQs = MP.extract(zpp.geom.ZPP_PartitionedPoly.sharedGVList);
      const o = MP;
      o.next = zpp.geom.ZPP_PartitionedPoly.zpp_pool;
      zpp.geom.ZPP_PartitionedPoly.zpp_pool = o;
      while (MQs.head != null) {
        const MQ = MQs.pop_unsafe();
        const x = GeomPoly.get();
        x.zpp_inner.vertices = MQ;
        if (ret.zpp_inner.reverse_flag) {
          ret.push(x);
        } else {
          ret.unshift(x);
        }
      }
    }
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Transformation
  // ---------------------------------------------------------------------------

  inflate(inflation: number): GeomPoly {
    this._checkDisposed();
    const ret = GeomPoly.get();

    if (this.isClockwise()) {
      inflation = -inflation;
    }

    this._forEachVert((p: Any) => {
      const prev = p.prev;
      const next = p.next;

      // Edge vectors
      let ax = p.x - prev.x;
      let ay = p.y - prev.y;
      let bx = next.x - p.x;
      let by = next.y - p.y;

      // Perpendicular normals scaled by inflation
      let alen = Math.sqrt(ax * ax + ay * ay);
      let apx = (-ay / alen) * inflation;
      let apy = (ax / alen) * inflation;

      let blen = Math.sqrt(bx * bx + by * by);
      let bpx = (-by / blen) * inflation;
      let bpy = (bx / blen) * inflation;

      // Intersection of offset lines
      const bapx = bpx - apx;
      const bapy = bpy - apy;
      const num = by * bapx - bx * bapy;
      const t = num === 0 ? 0 : num / (by * ax - bx * ay);

      const px = p.x + apx + ax * t;
      const py = p.y + apy + ay * t;

      const v = Vec2.get(px, py);
      ret.push(v);
    });

    return ret.skipForward(1);
  }

  cut(
    start: Vec2,
    end: Vec2,
    boundedStart: boolean = false,
    boundedEnd: boolean = false,
    output?: Any,
  ): Any {
    this._checkDisposed();
    if (
      !(this._isDegenRing()
        ? true
        : getNape().__zpp.geom.ZPP_Simple.isSimple(this.zpp_inner.vertices))
    ) {
      throw new Error("Error: Cut requires a truly simple polygon");
    }
    if (start == null || end == null) {
      throw new Error("Error: Cannot cut with null start/end's");
    }
    if (start.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (end.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }

    const ret = getNape().__zpp.geom.ZPP_Cutter.run(
      this.zpp_inner.vertices,
      start,
      end,
      boundedStart,
      boundedEnd,
      output,
    );

    if (start.zpp_inner.weak) {
      start.dispose();
    }
    if (end.zpp_inner.weak) {
      end.dispose();
    }
    return ret;
  }

  transform(matrix: Any): this {
    this._checkDisposed();
    if (matrix == null) {
      throw new Error("Error: Cannot transform by null matrix");
    }
    this._forEachVert((v: Any) => {
      const t =
        matrix.zpp_inner.a * v.x +
        matrix.zpp_inner.b * v.y +
        matrix.zpp_inner.tx;
      v.y =
        matrix.zpp_inner.c * v.x +
        matrix.zpp_inner.d * v.y +
        matrix.zpp_inner.ty;
      v.x = t;
    });
    return this;
  }

  bounds(): Any {
    this._checkDisposed();
    if (this.zpp_inner.vertices == null) {
      throw new Error("Error: empty GeomPoly has no defineable bounds");
    }
    let minx = 1e100;
    let miny = 1e100;
    let maxx = -1e100;
    let maxy = -1e100;
    this._forEachVert((v: Any) => {
      if (v.x < minx) minx = v.x;
      if (v.y < miny) miny = v.y;
      if (v.x > maxx) maxx = v.x;
      if (v.y > maxy) maxy = v.y;
    });
    return new AABB(minx, miny, maxx - minx, maxy - miny);
  }

  top(): Vec2 {
    return this._extremalVert("y", true);
  }

  bottom(): Vec2 {
    return this._extremalVert("y", false);
  }

  left(): Vec2 {
    return this._extremalVert("x", true);
  }

  right(): Vec2 {
    return this._extremalVert("x", false);
  }

  // ---------------------------------------------------------------------------
  // String representation
  // ---------------------------------------------------------------------------

  toString(): string {
    let ret = "GeomPoly[";
    const F = this.zpp_inner.vertices;
    if (F != null) {
      let nite = F;
      do {
        if (nite !== F) ret += ",";
        ret += "{" + nite.x + "," + nite.y + "}";
        nite = nite.next;
      } while (nite !== F);
    }
    return ret + "]";
  }
}

// Self-register in the compiled namespace
const nape = getNape();
nape.geom.GeomPoly = GeomPoly;
(GeomPoly.prototype as Any).__class__ = GeomPoly;
