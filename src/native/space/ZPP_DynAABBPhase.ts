/**
 * ZPP_DynAABBPhase — Internal dynamic AABB broadphase implementation.
 *
 * Extends ZPP_Broadphase with a pair of dynamic AABB trees (static + dynamic).
 * Performs broadphase collision detection using tree overlap queries, plus
 * spatial queries (shapes/bodies under point, in AABB, in circle, in shape,
 * raycasting).
 *
 * Converted from nape-compiled.js lines 25298–30222.
 */

import { ZPP_AABB } from "../geom/ZPP_AABB";
import { ZPP_Vec2 } from "../geom/ZPP_Vec2";
import { ZPP_Collide } from "../geom/ZPP_Collide";
import { ZPP_AABBTree } from "./ZPP_AABBTree";
import { ZPP_AABBNode } from "./ZPP_AABBNode";
import { ZPP_AABBPair } from "./ZPP_AABBPair";
import { ZPP_Broadphase } from "./ZPP_Broadphase";

type Any = any;

export class ZPP_DynAABBPhase {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_DynAABBPhase"];
  static __super__: Any = null;

  // --- Static: namespace references ---
  static _zpp: Any = null;
  static _nape: Any = null;

  // --- Static: constants ---
  static FATTEN = 3.0;
  static VEL_STEPS = 2.0;

  // --- Instance fields ---
  stree: ZPP_AABBTree;
  dtree: ZPP_AABBTree;
  pairs: ZPP_AABBPair | null = null;
  syncs: ZPP_AABBNode | null = null;
  moves: ZPP_AABBNode | null = null;
  treeStack: Any = null;
  treeStack2: Any = null;
  failed: Any = null;
  openlist: Any = null;
  space: Any = null;
  is_sweep = false;
  sweep: Any = null;
  dynab: Any = null;
  aabbShape: Any = null;
  matrix: Any = null;
  circShape: Any = null;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_DynAABBPhase;

  constructor(space: Any) {
    ZPP_Broadphase._initFields(this);
    this.space = space;
    this.is_sweep = false;
    this.dynab = this;
    this.stree = new ZPP_AABBTree();
    this.dtree = new ZPP_AABBTree();
  }

  // ========== Inheritance init ==========

  static _init(): void {
    ZPP_DynAABBPhase.__super__ = ZPP_DynAABBPhase._zpp.space.ZPP_Broadphase;
    const parentProto = ZPP_DynAABBPhase._zpp.space.ZPP_Broadphase.prototype;
    Object.getOwnPropertyNames(parentProto).forEach((k) => {
      if (k !== "constructor" && !(k in ZPP_DynAABBPhase.prototype)) {
        (ZPP_DynAABBPhase.prototype as Any)[k] = parentProto[k];
      }
    });
  }

  // ========== dyn ==========

  dyn(shape: Any): Any {
    if (shape.body.type == 1) {
      return false;
    } else {
      return !shape.body.component.sleeping;
    }
  }

  // ========== __insert ==========

  __insert(shape: Any): Any {
    let node;
    if (ZPP_AABBNode.zpp_pool == null) {
      node = new ZPP_AABBNode();
    } else {
      node = ZPP_AABBNode.zpp_pool;
      ZPP_AABBNode.zpp_pool = node.next;
      node.next = null;
    }
    if (ZPP_AABB.zpp_pool == null) {
      node.aabb = new ZPP_AABB();
    } else {
      node.aabb = ZPP_AABB.zpp_pool;
      ZPP_AABB.zpp_pool = node.aabb.next;
      node.aabb.next = null;
    }
    node.moved = false;
    node.synced = false;
    node.first_sync = false;
    node.shape = shape;
    shape.node = node;
    node.synced = true;
    node.first_sync = true;
    node.snext = this.syncs;
    this.syncs = node;
  }

  // ========== __remove ==========

  __remove(shape: Any): Any {
    let node = shape.node;
    if (!node.first_sync) {
      if (node.dyn) {
        this.dtree.removeLeaf(node);
      } else {
        this.stree.removeLeaf(node);
      }
    }
    shape.node = null;
    if (node.synced) {
      let pre = null;
      let cur = this.syncs;
      while (cur != null) {
        if (cur == node) {
          break;
        }
        pre = cur;
        cur = cur.snext;
      }
      if (pre == null) {
        this.syncs = cur.snext;
      } else {
        pre.snext = cur.snext;
      }
      cur.snext = null;
      node.synced = false;
    }
    if (node.moved) {
      let pre1 = null;
      let cur1 = this.moves;
      while (cur1 != null) {
        if (cur1 == node) {
          break;
        }
        pre1 = cur1;
        cur1 = cur1.mnext;
      }
      if (pre1 == null) {
        this.moves = cur1.mnext;
      } else {
        pre1.mnext = cur1.mnext;
      }
      cur1.mnext = null;
      node.moved = false;
    }
    let pre2 = null;
    let cur2 = this.pairs;
    while (cur2 != null) {
      let nxt = cur2.next;
      if (cur2.n1 == node || cur2.n2 == node) {
        if (pre2 == null) {
          this.pairs = nxt;
        } else {
          pre2.next = nxt;
        }
        if (cur2.arb != null) {
          cur2.arb.pair = null;
        }
        cur2.arb = null;
        cur2.n1.shape.pairs.remove(cur2);
        cur2.n2.shape.pairs.remove(cur2);
        let o = cur2;
        o.n1 = o.n2 = null;
        o.sleeping = false;
        o.next = ZPP_AABBPair.zpp_pool;
        ZPP_AABBPair.zpp_pool = o;
        cur2 = nxt;
        continue;
      }
      pre2 = cur2;
      cur2 = nxt;
    }
    while (shape.pairs.head != null) {
      let cur3 = shape.pairs.pop_unsafe();
      if (cur3.n1 == node) {
        cur3.n2.shape.pairs.remove(cur3);
      } else {
        cur3.n1.shape.pairs.remove(cur3);
      }
      if (cur3.arb != null) {
        cur3.arb.pair = null;
      }
      cur3.arb = null;
      let o1 = cur3;
      o1.n1 = o1.n2 = null;
      o1.sleeping = false;
      o1.next = ZPP_AABBPair.zpp_pool;
      ZPP_AABBPair.zpp_pool = o1;
    }
    let o2 = node;
    o2.height = -1;
    let o3 = o2.aabb;
    if (o3.outer != null) {
      o3.outer.zpp_inner = null;
      o3.outer = null;
    }
    o3.wrap_min = o3.wrap_max = null;
    o3._invalidate = null;
    o3._validate = null;
    o3.next = ZPP_AABB.zpp_pool;
    ZPP_AABB.zpp_pool = o3;
    o2.child1 = o2.child2 = o2.parent = null;
    o2.next = null;
    o2.snext = null;
    o2.mnext = null;
    o2.next = ZPP_AABBNode.zpp_pool;
    ZPP_AABBNode.zpp_pool = o2;
  }

  // ========== __sync ==========

  __sync(shape: Any): Any {
    let node = shape.node;
    if (!node.synced) {
      if (!this.space.continuous) {
        if (shape.zip_aabb) {
          if (shape.body != null) {
            shape.zip_aabb = false;
            if (shape.type == 0) {
              let _this = shape.circle;
              if (_this.zip_worldCOM) {
                if (_this.body != null) {
                  _this.zip_worldCOM = false;
                  if (_this.zip_localCOM) {
                    _this.zip_localCOM = false;
                    if (_this.type == 1) {
                      let _this1 = _this.polygon;
                      if (_this1.lverts.next == null) {
                        throw new Error(
                          "Error: An empty polygon has no meaningful localCOM"
                        );
                      }
                      if (_this1.lverts.next.next == null) {
                        _this1.localCOMx = _this1.lverts.next.x;
                        _this1.localCOMy = _this1.lverts.next.y;
                      } else if (_this1.lverts.next.next.next == null) {
                        _this1.localCOMx = _this1.lverts.next.x;
                        _this1.localCOMy = _this1.lverts.next.y;
                        let t = 1.0;
                        _this1.localCOMx += _this1.lverts.next.next.x * t;
                        _this1.localCOMy += _this1.lverts.next.next.y * t;
                        let t1 = 0.5;
                        _this1.localCOMx *= t1;
                        _this1.localCOMy *= t1;
                      } else {
                        _this1.localCOMx = 0;
                        _this1.localCOMy = 0;
                        let area = 0.0;
                        let cx_ite = _this1.lverts.next;
                        let u = cx_ite;
                        cx_ite = cx_ite.next;
                        let v = cx_ite;
                        cx_ite = cx_ite.next;
                        while (cx_ite != null) {
                          let w = cx_ite;
                          area += v.x * (w.y - u.y);
                          let cf = w.y * v.x - w.x * v.y;
                          _this1.localCOMx += (v.x + w.x) * cf;
                          _this1.localCOMy += (v.y + w.y) * cf;
                          u = v;
                          v = w;
                          cx_ite = cx_ite.next;
                        }
                        cx_ite = _this1.lverts.next;
                        let w1 = cx_ite;
                        area += v.x * (w1.y - u.y);
                        let cf1 = w1.y * v.x - w1.x * v.y;
                        _this1.localCOMx += (v.x + w1.x) * cf1;
                        _this1.localCOMy += (v.y + w1.y) * cf1;
                        u = v;
                        v = w1;
                        cx_ite = cx_ite.next;
                        let w2 = cx_ite;
                        area += v.x * (w2.y - u.y);
                        let cf2 = w2.y * v.x - w2.x * v.y;
                        _this1.localCOMx += (v.x + w2.x) * cf2;
                        _this1.localCOMy += (v.y + w2.y) * cf2;
                        area = 1 / (3 * area);
                        let t2 = area;
                        _this1.localCOMx *= t2;
                        _this1.localCOMy *= t2;
                      }
                    }
                    if (_this.wrap_localCOM != null) {
                      _this.wrap_localCOM.zpp_inner.x = _this.localCOMx;
                      _this.wrap_localCOM.zpp_inner.y = _this.localCOMy;
                    }
                  }
                  let _this2 = _this.body;
                  if (_this2.zip_axis) {
                    _this2.zip_axis = false;
                    _this2.axisx = Math.sin(_this2.rot);
                    _this2.axisy = Math.cos(_this2.rot);
                  }
                  _this.worldCOMx =
                    _this.body.posx +
                    (_this.body.axisy * _this.localCOMx -
                      _this.body.axisx * _this.localCOMy);
                  _this.worldCOMy =
                    _this.body.posy +
                    (_this.localCOMx * _this.body.axisx +
                      _this.localCOMy * _this.body.axisy);
                }
              }
              let rx = _this.radius;
              let ry = _this.radius;
              _this.aabb.minx = _this.worldCOMx - rx;
              _this.aabb.miny = _this.worldCOMy - ry;
              _this.aabb.maxx = _this.worldCOMx + rx;
              _this.aabb.maxy = _this.worldCOMy + ry;
            } else {
              let _this3 = shape.polygon;
              if (_this3.zip_gverts) {
                if (_this3.body != null) {
                  _this3.zip_gverts = false;
                  _this3.validate_lverts();
                  let _this4 = _this3.body;
                  if (_this4.zip_axis) {
                    _this4.zip_axis = false;
                    _this4.axisx = Math.sin(_this4.rot);
                    _this4.axisy = Math.cos(_this4.rot);
                  }
                  let li = _this3.lverts.next;
                  let cx_ite1 = _this3.gverts.next;
                  while (cx_ite1 != null) {
                    let g = cx_ite1;
                    let l = li;
                    li = li.next;
                    g.x =
                      _this3.body.posx +
                      (_this3.body.axisy * l.x - _this3.body.axisx * l.y);
                    g.y =
                      _this3.body.posy +
                      (l.x * _this3.body.axisx + l.y * _this3.body.axisy);
                    cx_ite1 = cx_ite1.next;
                  }
                }
              }
              if (_this3.lverts.next == null) {
                throw new Error(
                  "Error: An empty polygon has no meaningful bounds"
                );
              }
              let p0 = _this3.gverts.next;
              _this3.aabb.minx = p0.x;
              _this3.aabb.miny = p0.y;
              _this3.aabb.maxx = p0.x;
              _this3.aabb.maxy = p0.y;
              let cx_ite2 = _this3.gverts.next.next;
              while (cx_ite2 != null) {
                let p = cx_ite2;
                if (p.x < _this3.aabb.minx) {
                  _this3.aabb.minx = p.x;
                }
                if (p.x > _this3.aabb.maxx) {
                  _this3.aabb.maxx = p.x;
                }
                if (p.y < _this3.aabb.miny) {
                  _this3.aabb.miny = p.y;
                }
                if (p.y > _this3.aabb.maxy) {
                  _this3.aabb.maxy = p.y;
                }
                cx_ite2 = cx_ite2.next;
              }
            }
          }
        }
      }
      let sync;
      if (
        node.dyn ==
        (shape.body.type == 1 ? false : !shape.body.component.sleeping)
      ) {
        let _this5 = node.aabb;
        let x = shape.aabb;
        sync = !(
          x.minx >= _this5.minx &&
          x.miny >= _this5.miny &&
          x.maxx <= _this5.maxx &&
          x.maxy <= _this5.maxy
        );
      } else {
        sync = true;
      }
      if (sync) {
        node.synced = true;
        node.snext = this.syncs;
        this.syncs = node;
      }
    }
  }

  // ========== sync_broadphase ==========

  sync_broadphase(): Any {
    this.space.validation();
    if (this.syncs != null) {
      if (this.moves == null) {
        let node = this.syncs;
        while (node != null) {
          let shape = node.shape;
          if (!node.first_sync) {
            let tree = node.dyn ? this.dtree : this.stree;
            if (node == tree.root) {
              tree.root = null;
            } else {
              let parent = node.parent;
              let gparent = parent.parent;
              let sibling =
                parent.child1 == node ? parent.child2 : parent.child1;
              if (gparent != null) {
                if (gparent.child1 == parent) {
                  gparent.child1 = sibling;
                } else {
                  gparent.child2 = sibling;
                }
                sibling.parent = gparent;
                let o = parent;
                o.height = -1;
                let o1 = o.aabb;
                if (o1.outer != null) {
                  o1.outer.zpp_inner = null;
                  o1.outer = null;
                }
                o1.wrap_min = o1.wrap_max = null;
                o1._invalidate = null;
                o1._validate = null;
                o1.next = ZPP_AABB.zpp_pool;
                ZPP_AABB.zpp_pool = o1;
                o.child1 = o.child2 = o.parent = null;
                o.next = null;
                o.snext = null;
                o.mnext = null;
                o.next = ZPP_AABBNode.zpp_pool;
                ZPP_AABBNode.zpp_pool = o;
                let node1 = gparent;
                while (node1 != null) {
                  if (node1.child1 == null || node1.height < 2) {
                    node1 = node1;
                  } else {
                    let b = node1.child1;
                    let c = node1.child2;
                    let balance = c.height - b.height;
                    if (balance > 1) {
                      let f = c.child1;
                      let g = c.child2;
                      c.child1 = node1;
                      c.parent = node1.parent;
                      node1.parent = c;
                      if (c.parent != null) {
                        if (c.parent.child1 == node1) {
                          c.parent.child1 = c;
                        } else {
                          c.parent.child2 = c;
                        }
                      } else {
                        tree.root = c;
                      }
                      if (f.height > g.height) {
                        c.child2 = f;
                        node1.child2 = g;
                        g.parent = node1;
                        let _this = node1.aabb;
                        let a = b.aabb;
                        let b1 = g.aabb;
                        _this.minx = a.minx < b1.minx ? a.minx : b1.minx;
                        _this.miny = a.miny < b1.miny ? a.miny : b1.miny;
                        _this.maxx = a.maxx > b1.maxx ? a.maxx : b1.maxx;
                        _this.maxy = a.maxy > b1.maxy ? a.maxy : b1.maxy;
                        let _this1 = c.aabb;
                        let a1 = node1.aabb;
                        let b2 = f.aabb;
                        _this1.minx = a1.minx < b2.minx ? a1.minx : b2.minx;
                        _this1.miny = a1.miny < b2.miny ? a1.miny : b2.miny;
                        _this1.maxx = a1.maxx > b2.maxx ? a1.maxx : b2.maxx;
                        _this1.maxy = a1.maxy > b2.maxy ? a1.maxy : b2.maxy;
                        let x = b.height;
                        let y = g.height;
                        node1.height = 1 + (x > y ? x : y);
                        let x1 = node1.height;
                        let y1 = f.height;
                        c.height = 1 + (x1 > y1 ? x1 : y1);
                      } else {
                        c.child2 = g;
                        node1.child2 = f;
                        f.parent = node1;
                        let _this2 = node1.aabb;
                        let a2 = b.aabb;
                        let b3 = f.aabb;
                        _this2.minx = a2.minx < b3.minx ? a2.minx : b3.minx;
                        _this2.miny = a2.miny < b3.miny ? a2.miny : b3.miny;
                        _this2.maxx = a2.maxx > b3.maxx ? a2.maxx : b3.maxx;
                        _this2.maxy = a2.maxy > b3.maxy ? a2.maxy : b3.maxy;
                        let _this3 = c.aabb;
                        let a3 = node1.aabb;
                        let b4 = g.aabb;
                        _this3.minx = a3.minx < b4.minx ? a3.minx : b4.minx;
                        _this3.miny = a3.miny < b4.miny ? a3.miny : b4.miny;
                        _this3.maxx = a3.maxx > b4.maxx ? a3.maxx : b4.maxx;
                        _this3.maxy = a3.maxy > b4.maxy ? a3.maxy : b4.maxy;
                        let x2 = b.height;
                        let y2 = f.height;
                        node1.height = 1 + (x2 > y2 ? x2 : y2);
                        let x3 = node1.height;
                        let y3 = g.height;
                        c.height = 1 + (x3 > y3 ? x3 : y3);
                      }
                      node1 = c;
                    } else if (balance < -1) {
                      let f1 = b.child1;
                      let g1 = b.child2;
                      b.child1 = node1;
                      b.parent = node1.parent;
                      node1.parent = b;
                      if (b.parent != null) {
                        if (b.parent.child1 == node1) {
                          b.parent.child1 = b;
                        } else {
                          b.parent.child2 = b;
                        }
                      } else {
                        tree.root = b;
                      }
                      if (f1.height > g1.height) {
                        b.child2 = f1;
                        node1.child1 = g1;
                        g1.parent = node1;
                        let _this4 = node1.aabb;
                        let a4 = c.aabb;
                        let b5 = g1.aabb;
                        _this4.minx = a4.minx < b5.minx ? a4.minx : b5.minx;
                        _this4.miny = a4.miny < b5.miny ? a4.miny : b5.miny;
                        _this4.maxx = a4.maxx > b5.maxx ? a4.maxx : b5.maxx;
                        _this4.maxy = a4.maxy > b5.maxy ? a4.maxy : b5.maxy;
                        let _this5 = b.aabb;
                        let a5 = node1.aabb;
                        let b6 = f1.aabb;
                        _this5.minx = a5.minx < b6.minx ? a5.minx : b6.minx;
                        _this5.miny = a5.miny < b6.miny ? a5.miny : b6.miny;
                        _this5.maxx = a5.maxx > b6.maxx ? a5.maxx : b6.maxx;
                        _this5.maxy = a5.maxy > b6.maxy ? a5.maxy : b6.maxy;
                        let x4 = c.height;
                        let y4 = g1.height;
                        node1.height = 1 + (x4 > y4 ? x4 : y4);
                        let x5 = node1.height;
                        let y5 = f1.height;
                        b.height = 1 + (x5 > y5 ? x5 : y5);
                      } else {
                        b.child2 = g1;
                        node1.child1 = f1;
                        f1.parent = node1;
                        let _this6 = node1.aabb;
                        let a6 = c.aabb;
                        let b7 = f1.aabb;
                        _this6.minx = a6.minx < b7.minx ? a6.minx : b7.minx;
                        _this6.miny = a6.miny < b7.miny ? a6.miny : b7.miny;
                        _this6.maxx = a6.maxx > b7.maxx ? a6.maxx : b7.maxx;
                        _this6.maxy = a6.maxy > b7.maxy ? a6.maxy : b7.maxy;
                        let _this7 = b.aabb;
                        let a7 = node1.aabb;
                        let b8 = g1.aabb;
                        _this7.minx = a7.minx < b8.minx ? a7.minx : b8.minx;
                        _this7.miny = a7.miny < b8.miny ? a7.miny : b8.miny;
                        _this7.maxx = a7.maxx > b8.maxx ? a7.maxx : b8.maxx;
                        _this7.maxy = a7.maxy > b8.maxy ? a7.maxy : b8.maxy;
                        let x6 = c.height;
                        let y6 = f1.height;
                        node1.height = 1 + (x6 > y6 ? x6 : y6);
                        let x7 = node1.height;
                        let y7 = g1.height;
                        b.height = 1 + (x7 > y7 ? x7 : y7);
                      }
                      node1 = b;
                    } else {
                      node1 = node1;
                    }
                  }
                  let child1 = node1.child1;
                  let child2 = node1.child2;
                  let _this8 = node1.aabb;
                  let a8 = child1.aabb;
                  let b9 = child2.aabb;
                  _this8.minx = a8.minx < b9.minx ? a8.minx : b9.minx;
                  _this8.miny = a8.miny < b9.miny ? a8.miny : b9.miny;
                  _this8.maxx = a8.maxx > b9.maxx ? a8.maxx : b9.maxx;
                  _this8.maxy = a8.maxy > b9.maxy ? a8.maxy : b9.maxy;
                  let x8 = child1.height;
                  let y8 = child2.height;
                  node1.height = 1 + (x8 > y8 ? x8 : y8);
                  node1 = node1.parent;
                }
              } else {
                tree.root = sibling;
                sibling.parent = null;
                let o2 = parent;
                o2.height = -1;
                let o3 = o2.aabb;
                if (o3.outer != null) {
                  o3.outer.zpp_inner = null;
                  o3.outer = null;
                }
                o3.wrap_min = o3.wrap_max = null;
                o3._invalidate = null;
                o3._validate = null;
                o3.next = ZPP_AABB.zpp_pool;
                ZPP_AABB.zpp_pool = o3;
                o2.child1 = o2.child2 = o2.parent = null;
                o2.next = null;
                o2.snext = null;
                o2.mnext = null;
                o2.next = ZPP_AABBNode.zpp_pool;
                ZPP_AABBNode.zpp_pool = o2;
              }
            }
          } else {
            node.first_sync = false;
          }
          let aabb = node.aabb;
          if (!this.space.continuous) {
            if (shape.zip_aabb) {
              if (shape.body != null) {
                shape.zip_aabb = false;
                if (shape.type == 0) {
                  let _this9 = shape.circle;
                  if (_this9.zip_worldCOM) {
                    if (_this9.body != null) {
                      _this9.zip_worldCOM = false;
                      if (_this9.zip_localCOM) {
                        _this9.zip_localCOM = false;
                        if (_this9.type == 1) {
                          let _this10 = _this9.polygon;
                          if (_this10.lverts.next == null) {
                            throw new Error(
                              "Error: An empty polygon has no meaningful localCOM"
                            );
                          }
                          if (_this10.lverts.next.next == null) {
                            _this10.localCOMx = _this10.lverts.next.x;
                            _this10.localCOMy = _this10.lverts.next.y;
                          } else if (_this10.lverts.next.next.next == null) {
                            _this10.localCOMx = _this10.lverts.next.x;
                            _this10.localCOMy = _this10.lverts.next.y;
                            let t = 1.0;
                            _this10.localCOMx += _this10.lverts.next.next.x * t;
                            _this10.localCOMy += _this10.lverts.next.next.y * t;
                            let t1 = 0.5;
                            _this10.localCOMx *= t1;
                            _this10.localCOMy *= t1;
                          } else {
                            _this10.localCOMx = 0;
                            _this10.localCOMy = 0;
                            let area = 0.0;
                            let cx_ite = _this10.lverts.next;
                            let u = cx_ite;
                            cx_ite = cx_ite.next;
                            let v = cx_ite;
                            cx_ite = cx_ite.next;
                            while (cx_ite != null) {
                              let w = cx_ite;
                              area += v.x * (w.y - u.y);
                              let cf = w.y * v.x - w.x * v.y;
                              _this10.localCOMx += (v.x + w.x) * cf;
                              _this10.localCOMy += (v.y + w.y) * cf;
                              u = v;
                              v = w;
                              cx_ite = cx_ite.next;
                            }
                            cx_ite = _this10.lverts.next;
                            let w1 = cx_ite;
                            area += v.x * (w1.y - u.y);
                            let cf1 = w1.y * v.x - w1.x * v.y;
                            _this10.localCOMx += (v.x + w1.x) * cf1;
                            _this10.localCOMy += (v.y + w1.y) * cf1;
                            u = v;
                            v = w1;
                            cx_ite = cx_ite.next;
                            let w2 = cx_ite;
                            area += v.x * (w2.y - u.y);
                            let cf2 = w2.y * v.x - w2.x * v.y;
                            _this10.localCOMx += (v.x + w2.x) * cf2;
                            _this10.localCOMy += (v.y + w2.y) * cf2;
                            area = 1 / (3 * area);
                            let t2 = area;
                            _this10.localCOMx *= t2;
                            _this10.localCOMy *= t2;
                          }
                        }
                        if (_this9.wrap_localCOM != null) {
                          _this9.wrap_localCOM.zpp_inner.x = _this9.localCOMx;
                          _this9.wrap_localCOM.zpp_inner.y = _this9.localCOMy;
                        }
                      }
                      let _this11 = _this9.body;
                      if (_this11.zip_axis) {
                        _this11.zip_axis = false;
                        _this11.axisx = Math.sin(_this11.rot);
                        _this11.axisy = Math.cos(_this11.rot);
                      }
                      _this9.worldCOMx =
                        _this9.body.posx +
                        (_this9.body.axisy * _this9.localCOMx -
                          _this9.body.axisx * _this9.localCOMy);
                      _this9.worldCOMy =
                        _this9.body.posy +
                        (_this9.localCOMx * _this9.body.axisx +
                          _this9.localCOMy * _this9.body.axisy);
                    }
                  }
                  let rx = _this9.radius;
                  let ry = _this9.radius;
                  _this9.aabb.minx = _this9.worldCOMx - rx;
                  _this9.aabb.miny = _this9.worldCOMy - ry;
                  _this9.aabb.maxx = _this9.worldCOMx + rx;
                  _this9.aabb.maxy = _this9.worldCOMy + ry;
                } else {
                  let _this12 = shape.polygon;
                  if (_this12.zip_gverts) {
                    if (_this12.body != null) {
                      _this12.zip_gverts = false;
                      _this12.validate_lverts();
                      let _this13 = _this12.body;
                      if (_this13.zip_axis) {
                        _this13.zip_axis = false;
                        _this13.axisx = Math.sin(_this13.rot);
                        _this13.axisy = Math.cos(_this13.rot);
                      }
                      let li = _this12.lverts.next;
                      let cx_ite1 = _this12.gverts.next;
                      while (cx_ite1 != null) {
                        let g2 = cx_ite1;
                        let l = li;
                        li = li.next;
                        g2.x =
                          _this12.body.posx +
                          (_this12.body.axisy * l.x - _this12.body.axisx * l.y);
                        g2.y =
                          _this12.body.posy +
                          (l.x * _this12.body.axisx + l.y * _this12.body.axisy);
                        cx_ite1 = cx_ite1.next;
                      }
                    }
                  }
                  if (_this12.lverts.next == null) {
                    throw new Error(
                      "Error: An empty polygon has no meaningful bounds"
                    );
                  }
                  let p0 = _this12.gverts.next;
                  _this12.aabb.minx = p0.x;
                  _this12.aabb.miny = p0.y;
                  _this12.aabb.maxx = p0.x;
                  _this12.aabb.maxy = p0.y;
                  let cx_ite2 = _this12.gverts.next.next;
                  while (cx_ite2 != null) {
                    let p = cx_ite2;
                    if (p.x < _this12.aabb.minx) {
                      _this12.aabb.minx = p.x;
                    }
                    if (p.x > _this12.aabb.maxx) {
                      _this12.aabb.maxx = p.x;
                    }
                    if (p.y < _this12.aabb.miny) {
                      _this12.aabb.miny = p.y;
                    }
                    if (p.y > _this12.aabb.maxy) {
                      _this12.aabb.maxy = p.y;
                    }
                    cx_ite2 = cx_ite2.next;
                  }
                }
              }
            }
          }
          let a9 = shape.aabb;
          aabb.minx = a9.minx - 3.0;
          aabb.miny = a9.miny - 3.0;
          aabb.maxx = a9.maxx + 3.0;
          aabb.maxy = a9.maxy + 3.0;
          let tree1 = (node.dyn =
            shape.body.type == 1 ? false : !shape.body.component.sleeping)
            ? this.dtree
            : this.stree;
          if (tree1.root == null) {
            tree1.root = node;
            tree1.root.parent = null;
          } else {
            let leafaabb = node.aabb;
            let node2 = tree1.root;
            while (node2.child1 != null) {
              let child11 = node2.child1;
              let child21 = node2.child2;
              let _this14 = node2.aabb;
              let area1 =
                (_this14.maxx - _this14.minx + (_this14.maxy - _this14.miny)) *
                2;
              let _this15 = ZPP_AABBTree.tmpaabb;
              let a10 = node2.aabb;
              _this15.minx =
                a10.minx < leafaabb.minx ? a10.minx : leafaabb.minx;
              _this15.miny =
                a10.miny < leafaabb.miny ? a10.miny : leafaabb.miny;
              _this15.maxx =
                a10.maxx > leafaabb.maxx ? a10.maxx : leafaabb.maxx;
              _this15.maxy =
                a10.maxy > leafaabb.maxy ? a10.maxy : leafaabb.maxy;
              let _this16 = ZPP_AABBTree.tmpaabb;
              let carea =
                (_this16.maxx - _this16.minx + (_this16.maxy - _this16.miny)) *
                2;
              let cost = 2 * carea;
              let icost = 2 * (carea - area1);
              let _this17 = ZPP_AABBTree.tmpaabb;
              let b10 = child11.aabb;
              _this17.minx =
                leafaabb.minx < b10.minx ? leafaabb.minx : b10.minx;
              _this17.miny =
                leafaabb.miny < b10.miny ? leafaabb.miny : b10.miny;
              _this17.maxx =
                leafaabb.maxx > b10.maxx ? leafaabb.maxx : b10.maxx;
              _this17.maxy =
                leafaabb.maxy > b10.maxy ? leafaabb.maxy : b10.maxy;
              let cost1;
              if (child11.child1 == null) {
                let _this18 = ZPP_AABBTree.tmpaabb;
                cost1 =
                  (_this18.maxx -
                    _this18.minx +
                    (_this18.maxy - _this18.miny)) *
                    2 +
                  icost;
              } else {
                let _this19 = child11.aabb;
                let oarea =
                  (_this19.maxx -
                    _this19.minx +
                    (_this19.maxy - _this19.miny)) *
                  2;
                let _this20 = ZPP_AABBTree.tmpaabb;
                let narea =
                  (_this20.maxx -
                    _this20.minx +
                    (_this20.maxy - _this20.miny)) *
                  2;
                cost1 = narea - oarea + icost;
              }
              let _this21 = ZPP_AABBTree.tmpaabb;
              let b11 = child21.aabb;
              _this21.minx =
                leafaabb.minx < b11.minx ? leafaabb.minx : b11.minx;
              _this21.miny =
                leafaabb.miny < b11.miny ? leafaabb.miny : b11.miny;
              _this21.maxx =
                leafaabb.maxx > b11.maxx ? leafaabb.maxx : b11.maxx;
              _this21.maxy =
                leafaabb.maxy > b11.maxy ? leafaabb.maxy : b11.maxy;
              let cost2;
              if (child21.child1 == null) {
                let _this22 = ZPP_AABBTree.tmpaabb;
                cost2 =
                  (_this22.maxx -
                    _this22.minx +
                    (_this22.maxy - _this22.miny)) *
                    2 +
                  icost;
              } else {
                let _this23 = child21.aabb;
                let oarea1 =
                  (_this23.maxx -
                    _this23.minx +
                    (_this23.maxy - _this23.miny)) *
                  2;
                let _this24 = ZPP_AABBTree.tmpaabb;
                let narea1 =
                  (_this24.maxx -
                    _this24.minx +
                    (_this24.maxy - _this24.miny)) *
                  2;
                cost2 = narea1 - oarea1 + icost;
              }
              if (cost < cost1 && cost < cost2) {
                break;
              } else {
                node2 = cost1 < cost2 ? child11 : child21;
              }
            }
            let sibling1 = node2;
            let oparent = sibling1.parent;
            let nparent;
            if (ZPP_AABBNode.zpp_pool == null) {
              nparent = new ZPP_AABBNode();
            } else {
              nparent = ZPP_AABBNode.zpp_pool;
              ZPP_AABBNode.zpp_pool = nparent.next;
              nparent.next = null;
            }
            if (ZPP_AABB.zpp_pool == null) {
              nparent.aabb = new ZPP_AABB();
            } else {
              nparent.aabb = ZPP_AABB.zpp_pool;
              ZPP_AABB.zpp_pool = nparent.aabb.next;
              nparent.aabb.next = null;
            }
            nparent.moved = false;
            nparent.synced = false;
            nparent.first_sync = false;
            nparent.parent = oparent;
            let _this25 = nparent.aabb;
            let b12 = sibling1.aabb;
            _this25.minx = leafaabb.minx < b12.minx ? leafaabb.minx : b12.minx;
            _this25.miny = leafaabb.miny < b12.miny ? leafaabb.miny : b12.miny;
            _this25.maxx = leafaabb.maxx > b12.maxx ? leafaabb.maxx : b12.maxx;
            _this25.maxy = leafaabb.maxy > b12.maxy ? leafaabb.maxy : b12.maxy;
            nparent.height = sibling1.height + 1;
            if (oparent != null) {
              if (oparent.child1 == sibling1) {
                oparent.child1 = nparent;
              } else {
                oparent.child2 = nparent;
              }
              nparent.child1 = sibling1;
              nparent.child2 = node;
              sibling1.parent = nparent;
              node.parent = nparent;
            } else {
              nparent.child1 = sibling1;
              nparent.child2 = node;
              sibling1.parent = nparent;
              node.parent = nparent;
              tree1.root = nparent;
            }
            node2 = node.parent;
            while (node2 != null) {
              if (node2.child1 == null || node2.height < 2) {
                node2 = node2;
              } else {
                let b13 = node2.child1;
                let c1 = node2.child2;
                let balance1 = c1.height - b13.height;
                if (balance1 > 1) {
                  let f2 = c1.child1;
                  let g3 = c1.child2;
                  c1.child1 = node2;
                  c1.parent = node2.parent;
                  node2.parent = c1;
                  if (c1.parent != null) {
                    if (c1.parent.child1 == node2) {
                      c1.parent.child1 = c1;
                    } else {
                      c1.parent.child2 = c1;
                    }
                  } else {
                    tree1.root = c1;
                  }
                  if (f2.height > g3.height) {
                    c1.child2 = f2;
                    node2.child2 = g3;
                    g3.parent = node2;
                    let _this26 = node2.aabb;
                    let a11 = b13.aabb;
                    let b14 = g3.aabb;
                    _this26.minx = a11.minx < b14.minx ? a11.minx : b14.minx;
                    _this26.miny = a11.miny < b14.miny ? a11.miny : b14.miny;
                    _this26.maxx = a11.maxx > b14.maxx ? a11.maxx : b14.maxx;
                    _this26.maxy = a11.maxy > b14.maxy ? a11.maxy : b14.maxy;
                    let _this27 = c1.aabb;
                    let a12 = node2.aabb;
                    let b15 = f2.aabb;
                    _this27.minx = a12.minx < b15.minx ? a12.minx : b15.minx;
                    _this27.miny = a12.miny < b15.miny ? a12.miny : b15.miny;
                    _this27.maxx = a12.maxx > b15.maxx ? a12.maxx : b15.maxx;
                    _this27.maxy = a12.maxy > b15.maxy ? a12.maxy : b15.maxy;
                    let x9 = b13.height;
                    let y9 = g3.height;
                    node2.height = 1 + (x9 > y9 ? x9 : y9);
                    let x10 = node2.height;
                    let y10 = f2.height;
                    c1.height = 1 + (x10 > y10 ? x10 : y10);
                  } else {
                    c1.child2 = g3;
                    node2.child2 = f2;
                    f2.parent = node2;
                    let _this28 = node2.aabb;
                    let a13 = b13.aabb;
                    let b16 = f2.aabb;
                    _this28.minx = a13.minx < b16.minx ? a13.minx : b16.minx;
                    _this28.miny = a13.miny < b16.miny ? a13.miny : b16.miny;
                    _this28.maxx = a13.maxx > b16.maxx ? a13.maxx : b16.maxx;
                    _this28.maxy = a13.maxy > b16.maxy ? a13.maxy : b16.maxy;
                    let _this29 = c1.aabb;
                    let a14 = node2.aabb;
                    let b17 = g3.aabb;
                    _this29.minx = a14.minx < b17.minx ? a14.minx : b17.minx;
                    _this29.miny = a14.miny < b17.miny ? a14.miny : b17.miny;
                    _this29.maxx = a14.maxx > b17.maxx ? a14.maxx : b17.maxx;
                    _this29.maxy = a14.maxy > b17.maxy ? a14.maxy : b17.maxy;
                    let x11 = b13.height;
                    let y11 = f2.height;
                    node2.height = 1 + (x11 > y11 ? x11 : y11);
                    let x12 = node2.height;
                    let y12 = g3.height;
                    c1.height = 1 + (x12 > y12 ? x12 : y12);
                  }
                  node2 = c1;
                } else if (balance1 < -1) {
                  let f3 = b13.child1;
                  let g4 = b13.child2;
                  b13.child1 = node2;
                  b13.parent = node2.parent;
                  node2.parent = b13;
                  if (b13.parent != null) {
                    if (b13.parent.child1 == node2) {
                      b13.parent.child1 = b13;
                    } else {
                      b13.parent.child2 = b13;
                    }
                  } else {
                    tree1.root = b13;
                  }
                  if (f3.height > g4.height) {
                    b13.child2 = f3;
                    node2.child1 = g4;
                    g4.parent = node2;
                    let _this30 = node2.aabb;
                    let a15 = c1.aabb;
                    let b18 = g4.aabb;
                    _this30.minx = a15.minx < b18.minx ? a15.minx : b18.minx;
                    _this30.miny = a15.miny < b18.miny ? a15.miny : b18.miny;
                    _this30.maxx = a15.maxx > b18.maxx ? a15.maxx : b18.maxx;
                    _this30.maxy = a15.maxy > b18.maxy ? a15.maxy : b18.maxy;
                    let _this31 = b13.aabb;
                    let a16 = node2.aabb;
                    let b19 = f3.aabb;
                    _this31.minx = a16.minx < b19.minx ? a16.minx : b19.minx;
                    _this31.miny = a16.miny < b19.miny ? a16.miny : b19.miny;
                    _this31.maxx = a16.maxx > b19.maxx ? a16.maxx : b19.maxx;
                    _this31.maxy = a16.maxy > b19.maxy ? a16.maxy : b19.maxy;
                    let x13 = c1.height;
                    let y13 = g4.height;
                    node2.height = 1 + (x13 > y13 ? x13 : y13);
                    let x14 = node2.height;
                    let y14 = f3.height;
                    b13.height = 1 + (x14 > y14 ? x14 : y14);
                  } else {
                    b13.child2 = g4;
                    node2.child1 = f3;
                    f3.parent = node2;
                    let _this32 = node2.aabb;
                    let a17 = c1.aabb;
                    let b20 = f3.aabb;
                    _this32.minx = a17.minx < b20.minx ? a17.minx : b20.minx;
                    _this32.miny = a17.miny < b20.miny ? a17.miny : b20.miny;
                    _this32.maxx = a17.maxx > b20.maxx ? a17.maxx : b20.maxx;
                    _this32.maxy = a17.maxy > b20.maxy ? a17.maxy : b20.maxy;
                    let _this33 = b13.aabb;
                    let a18 = node2.aabb;
                    let b21 = g4.aabb;
                    _this33.minx = a18.minx < b21.minx ? a18.minx : b21.minx;
                    _this33.miny = a18.miny < b21.miny ? a18.miny : b21.miny;
                    _this33.maxx = a18.maxx > b21.maxx ? a18.maxx : b21.maxx;
                    _this33.maxy = a18.maxy > b21.maxy ? a18.maxy : b21.maxy;
                    let x15 = c1.height;
                    let y15 = f3.height;
                    node2.height = 1 + (x15 > y15 ? x15 : y15);
                    let x16 = node2.height;
                    let y16 = g4.height;
                    b13.height = 1 + (x16 > y16 ? x16 : y16);
                  }
                  node2 = b13;
                } else {
                  node2 = node2;
                }
              }
              let child12 = node2.child1;
              let child22 = node2.child2;
              let x17 = child12.height;
              let y17 = child22.height;
              node2.height = 1 + (x17 > y17 ? x17 : y17);
              let _this34 = node2.aabb;
              let a19 = child12.aabb;
              let b22 = child22.aabb;
              _this34.minx = a19.minx < b22.minx ? a19.minx : b22.minx;
              _this34.miny = a19.miny < b22.miny ? a19.miny : b22.miny;
              _this34.maxx = a19.maxx > b22.maxx ? a19.maxx : b22.maxx;
              _this34.maxy = a19.maxy > b22.maxy ? a19.maxy : b22.maxy;
              node2 = node2.parent;
            }
          }
          node.synced = false;
          node.moved = true;
          node.mnext = node.snext;
          node.snext = null;
          node = node.mnext;
        }
        let t3 = this.syncs;
        this.syncs = this.moves;
        this.moves = t3;
      } else {
        while (this.syncs != null) {
          let ret = this.syncs;
          this.syncs = ret.snext;
          ret.snext = null;
          let node3 = ret;
          let shape1 = node3.shape;
          if (!node3.first_sync) {
            let tree2 = node3.dyn ? this.dtree : this.stree;
            if (node3 == tree2.root) {
              tree2.root = null;
            } else {
              let parent1 = node3.parent;
              let gparent1 = parent1.parent;
              let sibling2 =
                parent1.child1 == node3 ? parent1.child2 : parent1.child1;
              if (gparent1 != null) {
                if (gparent1.child1 == parent1) {
                  gparent1.child1 = sibling2;
                } else {
                  gparent1.child2 = sibling2;
                }
                sibling2.parent = gparent1;
                let o4 = parent1;
                o4.height = -1;
                let o5 = o4.aabb;
                if (o5.outer != null) {
                  o5.outer.zpp_inner = null;
                  o5.outer = null;
                }
                o5.wrap_min = o5.wrap_max = null;
                o5._invalidate = null;
                o5._validate = null;
                o5.next = ZPP_AABB.zpp_pool;
                ZPP_AABB.zpp_pool = o5;
                o4.child1 = o4.child2 = o4.parent = null;
                o4.next = null;
                o4.snext = null;
                o4.mnext = null;
                o4.next = ZPP_AABBNode.zpp_pool;
                ZPP_AABBNode.zpp_pool = o4;
                let node4 = gparent1;
                while (node4 != null) {
                  if (node4.child1 == null || node4.height < 2) {
                    node4 = node4;
                  } else {
                    let b23 = node4.child1;
                    let c2 = node4.child2;
                    let balance2 = c2.height - b23.height;
                    if (balance2 > 1) {
                      let f4 = c2.child1;
                      let g5 = c2.child2;
                      c2.child1 = node4;
                      c2.parent = node4.parent;
                      node4.parent = c2;
                      if (c2.parent != null) {
                        if (c2.parent.child1 == node4) {
                          c2.parent.child1 = c2;
                        } else {
                          c2.parent.child2 = c2;
                        }
                      } else {
                        tree2.root = c2;
                      }
                      if (f4.height > g5.height) {
                        c2.child2 = f4;
                        node4.child2 = g5;
                        g5.parent = node4;
                        let _this35 = node4.aabb;
                        let a20 = b23.aabb;
                        let b24 = g5.aabb;
                        _this35.minx =
                          a20.minx < b24.minx ? a20.minx : b24.minx;
                        _this35.miny =
                          a20.miny < b24.miny ? a20.miny : b24.miny;
                        _this35.maxx =
                          a20.maxx > b24.maxx ? a20.maxx : b24.maxx;
                        _this35.maxy =
                          a20.maxy > b24.maxy ? a20.maxy : b24.maxy;
                        let _this36 = c2.aabb;
                        let a21 = node4.aabb;
                        let b25 = f4.aabb;
                        _this36.minx =
                          a21.minx < b25.minx ? a21.minx : b25.minx;
                        _this36.miny =
                          a21.miny < b25.miny ? a21.miny : b25.miny;
                        _this36.maxx =
                          a21.maxx > b25.maxx ? a21.maxx : b25.maxx;
                        _this36.maxy =
                          a21.maxy > b25.maxy ? a21.maxy : b25.maxy;
                        let x18 = b23.height;
                        let y18 = g5.height;
                        node4.height = 1 + (x18 > y18 ? x18 : y18);
                        let x19 = node4.height;
                        let y19 = f4.height;
                        c2.height = 1 + (x19 > y19 ? x19 : y19);
                      } else {
                        c2.child2 = g5;
                        node4.child2 = f4;
                        f4.parent = node4;
                        let _this37 = node4.aabb;
                        let a22 = b23.aabb;
                        let b26 = f4.aabb;
                        _this37.minx =
                          a22.minx < b26.minx ? a22.minx : b26.minx;
                        _this37.miny =
                          a22.miny < b26.miny ? a22.miny : b26.miny;
                        _this37.maxx =
                          a22.maxx > b26.maxx ? a22.maxx : b26.maxx;
                        _this37.maxy =
                          a22.maxy > b26.maxy ? a22.maxy : b26.maxy;
                        let _this38 = c2.aabb;
                        let a23 = node4.aabb;
                        let b27 = g5.aabb;
                        _this38.minx =
                          a23.minx < b27.minx ? a23.minx : b27.minx;
                        _this38.miny =
                          a23.miny < b27.miny ? a23.miny : b27.miny;
                        _this38.maxx =
                          a23.maxx > b27.maxx ? a23.maxx : b27.maxx;
                        _this38.maxy =
                          a23.maxy > b27.maxy ? a23.maxy : b27.maxy;
                        let x20 = b23.height;
                        let y20 = f4.height;
                        node4.height = 1 + (x20 > y20 ? x20 : y20);
                        let x21 = node4.height;
                        let y21 = g5.height;
                        c2.height = 1 + (x21 > y21 ? x21 : y21);
                      }
                      node4 = c2;
                    } else if (balance2 < -1) {
                      let f5 = b23.child1;
                      let g6 = b23.child2;
                      b23.child1 = node4;
                      b23.parent = node4.parent;
                      node4.parent = b23;
                      if (b23.parent != null) {
                        if (b23.parent.child1 == node4) {
                          b23.parent.child1 = b23;
                        } else {
                          b23.parent.child2 = b23;
                        }
                      } else {
                        tree2.root = b23;
                      }
                      if (f5.height > g6.height) {
                        b23.child2 = f5;
                        node4.child1 = g6;
                        g6.parent = node4;
                        let _this39 = node4.aabb;
                        let a24 = c2.aabb;
                        let b28 = g6.aabb;
                        _this39.minx =
                          a24.minx < b28.minx ? a24.minx : b28.minx;
                        _this39.miny =
                          a24.miny < b28.miny ? a24.miny : b28.miny;
                        _this39.maxx =
                          a24.maxx > b28.maxx ? a24.maxx : b28.maxx;
                        _this39.maxy =
                          a24.maxy > b28.maxy ? a24.maxy : b28.maxy;
                        let _this40 = b23.aabb;
                        let a25 = node4.aabb;
                        let b29 = f5.aabb;
                        _this40.minx =
                          a25.minx < b29.minx ? a25.minx : b29.minx;
                        _this40.miny =
                          a25.miny < b29.miny ? a25.miny : b29.miny;
                        _this40.maxx =
                          a25.maxx > b29.maxx ? a25.maxx : b29.maxx;
                        _this40.maxy =
                          a25.maxy > b29.maxy ? a25.maxy : b29.maxy;
                        let x22 = c2.height;
                        let y22 = g6.height;
                        node4.height = 1 + (x22 > y22 ? x22 : y22);
                        let x23 = node4.height;
                        let y23 = f5.height;
                        b23.height = 1 + (x23 > y23 ? x23 : y23);
                      } else {
                        b23.child2 = g6;
                        node4.child1 = f5;
                        f5.parent = node4;
                        let _this41 = node4.aabb;
                        let a26 = c2.aabb;
                        let b30 = f5.aabb;
                        _this41.minx =
                          a26.minx < b30.minx ? a26.minx : b30.minx;
                        _this41.miny =
                          a26.miny < b30.miny ? a26.miny : b30.miny;
                        _this41.maxx =
                          a26.maxx > b30.maxx ? a26.maxx : b30.maxx;
                        _this41.maxy =
                          a26.maxy > b30.maxy ? a26.maxy : b30.maxy;
                        let _this42 = b23.aabb;
                        let a27 = node4.aabb;
                        let b31 = g6.aabb;
                        _this42.minx =
                          a27.minx < b31.minx ? a27.minx : b31.minx;
                        _this42.miny =
                          a27.miny < b31.miny ? a27.miny : b31.miny;
                        _this42.maxx =
                          a27.maxx > b31.maxx ? a27.maxx : b31.maxx;
                        _this42.maxy =
                          a27.maxy > b31.maxy ? a27.maxy : b31.maxy;
                        let x24 = c2.height;
                        let y24 = f5.height;
                        node4.height = 1 + (x24 > y24 ? x24 : y24);
                        let x25 = node4.height;
                        let y25 = g6.height;
                        b23.height = 1 + (x25 > y25 ? x25 : y25);
                      }
                      node4 = b23;
                    } else {
                      node4 = node4;
                    }
                  }
                  let child13 = node4.child1;
                  let child23 = node4.child2;
                  let _this43 = node4.aabb;
                  let a28 = child13.aabb;
                  let b32 = child23.aabb;
                  _this43.minx = a28.minx < b32.minx ? a28.minx : b32.minx;
                  _this43.miny = a28.miny < b32.miny ? a28.miny : b32.miny;
                  _this43.maxx = a28.maxx > b32.maxx ? a28.maxx : b32.maxx;
                  _this43.maxy = a28.maxy > b32.maxy ? a28.maxy : b32.maxy;
                  let x26 = child13.height;
                  let y26 = child23.height;
                  node4.height = 1 + (x26 > y26 ? x26 : y26);
                  node4 = node4.parent;
                }
              } else {
                tree2.root = sibling2;
                sibling2.parent = null;
                let o6 = parent1;
                o6.height = -1;
                let o7 = o6.aabb;
                if (o7.outer != null) {
                  o7.outer.zpp_inner = null;
                  o7.outer = null;
                }
                o7.wrap_min = o7.wrap_max = null;
                o7._invalidate = null;
                o7._validate = null;
                o7.next = ZPP_AABB.zpp_pool;
                ZPP_AABB.zpp_pool = o7;
                o6.child1 = o6.child2 = o6.parent = null;
                o6.next = null;
                o6.snext = null;
                o6.mnext = null;
                o6.next = ZPP_AABBNode.zpp_pool;
                ZPP_AABBNode.zpp_pool = o6;
              }
            }
          } else {
            node3.first_sync = false;
          }
          let aabb1 = node3.aabb;
          if (!this.space.continuous) {
            if (shape1.zip_aabb) {
              if (shape1.body != null) {
                shape1.zip_aabb = false;
                if (shape1.type == 0) {
                  let _this44 = shape1.circle;
                  if (_this44.zip_worldCOM) {
                    if (_this44.body != null) {
                      _this44.zip_worldCOM = false;
                      if (_this44.zip_localCOM) {
                        _this44.zip_localCOM = false;
                        if (_this44.type == 1) {
                          let _this45 = _this44.polygon;
                          if (_this45.lverts.next == null) {
                            throw new Error(
                              "Error: An empty polygon has no meaningful localCOM"
                            );
                          }
                          if (_this45.lverts.next.next == null) {
                            _this45.localCOMx = _this45.lverts.next.x;
                            _this45.localCOMy = _this45.lverts.next.y;
                          } else if (_this45.lverts.next.next.next == null) {
                            _this45.localCOMx = _this45.lverts.next.x;
                            _this45.localCOMy = _this45.lverts.next.y;
                            let t4 = 1.0;
                            _this45.localCOMx +=
                              _this45.lverts.next.next.x * t4;
                            _this45.localCOMy +=
                              _this45.lverts.next.next.y * t4;
                            let t5 = 0.5;
                            _this45.localCOMx *= t5;
                            _this45.localCOMy *= t5;
                          } else {
                            _this45.localCOMx = 0;
                            _this45.localCOMy = 0;
                            let area2 = 0.0;
                            let cx_ite3 = _this45.lverts.next;
                            let u1 = cx_ite3;
                            cx_ite3 = cx_ite3.next;
                            let v1 = cx_ite3;
                            cx_ite3 = cx_ite3.next;
                            while (cx_ite3 != null) {
                              let w3 = cx_ite3;
                              area2 += v1.x * (w3.y - u1.y);
                              let cf3 = w3.y * v1.x - w3.x * v1.y;
                              _this45.localCOMx += (v1.x + w3.x) * cf3;
                              _this45.localCOMy += (v1.y + w3.y) * cf3;
                              u1 = v1;
                              v1 = w3;
                              cx_ite3 = cx_ite3.next;
                            }
                            cx_ite3 = _this45.lverts.next;
                            let w4 = cx_ite3;
                            area2 += v1.x * (w4.y - u1.y);
                            let cf4 = w4.y * v1.x - w4.x * v1.y;
                            _this45.localCOMx += (v1.x + w4.x) * cf4;
                            _this45.localCOMy += (v1.y + w4.y) * cf4;
                            u1 = v1;
                            v1 = w4;
                            cx_ite3 = cx_ite3.next;
                            let w5 = cx_ite3;
                            area2 += v1.x * (w5.y - u1.y);
                            let cf5 = w5.y * v1.x - w5.x * v1.y;
                            _this45.localCOMx += (v1.x + w5.x) * cf5;
                            _this45.localCOMy += (v1.y + w5.y) * cf5;
                            area2 = 1 / (3 * area2);
                            let t6 = area2;
                            _this45.localCOMx *= t6;
                            _this45.localCOMy *= t6;
                          }
                        }
                        if (_this44.wrap_localCOM != null) {
                          _this44.wrap_localCOM.zpp_inner.x = _this44.localCOMx;
                          _this44.wrap_localCOM.zpp_inner.y = _this44.localCOMy;
                        }
                      }
                      let _this46 = _this44.body;
                      if (_this46.zip_axis) {
                        _this46.zip_axis = false;
                        _this46.axisx = Math.sin(_this46.rot);
                        _this46.axisy = Math.cos(_this46.rot);
                      }
                      _this44.worldCOMx =
                        _this44.body.posx +
                        (_this44.body.axisy * _this44.localCOMx -
                          _this44.body.axisx * _this44.localCOMy);
                      _this44.worldCOMy =
                        _this44.body.posy +
                        (_this44.localCOMx * _this44.body.axisx +
                          _this44.localCOMy * _this44.body.axisy);
                    }
                  }
                  let rx1 = _this44.radius;
                  let ry1 = _this44.radius;
                  _this44.aabb.minx = _this44.worldCOMx - rx1;
                  _this44.aabb.miny = _this44.worldCOMy - ry1;
                  _this44.aabb.maxx = _this44.worldCOMx + rx1;
                  _this44.aabb.maxy = _this44.worldCOMy + ry1;
                } else {
                  let _this47 = shape1.polygon;
                  if (_this47.zip_gverts) {
                    if (_this47.body != null) {
                      _this47.zip_gverts = false;
                      _this47.validate_lverts();
                      let _this48 = _this47.body;
                      if (_this48.zip_axis) {
                        _this48.zip_axis = false;
                        _this48.axisx = Math.sin(_this48.rot);
                        _this48.axisy = Math.cos(_this48.rot);
                      }
                      let li1 = _this47.lverts.next;
                      let cx_ite4 = _this47.gverts.next;
                      while (cx_ite4 != null) {
                        let g7 = cx_ite4;
                        let l1 = li1;
                        li1 = li1.next;
                        g7.x =
                          _this47.body.posx +
                          (_this47.body.axisy * l1.x -
                            _this47.body.axisx * l1.y);
                        g7.y =
                          _this47.body.posy +
                          (l1.x * _this47.body.axisx +
                            l1.y * _this47.body.axisy);
                        cx_ite4 = cx_ite4.next;
                      }
                    }
                  }
                  if (_this47.lverts.next == null) {
                    throw new Error(
                      "Error: An empty polygon has no meaningful bounds"
                    );
                  }
                  let p01 = _this47.gverts.next;
                  _this47.aabb.minx = p01.x;
                  _this47.aabb.miny = p01.y;
                  _this47.aabb.maxx = p01.x;
                  _this47.aabb.maxy = p01.y;
                  let cx_ite5 = _this47.gverts.next.next;
                  while (cx_ite5 != null) {
                    let p1 = cx_ite5;
                    if (p1.x < _this47.aabb.minx) {
                      _this47.aabb.minx = p1.x;
                    }
                    if (p1.x > _this47.aabb.maxx) {
                      _this47.aabb.maxx = p1.x;
                    }
                    if (p1.y < _this47.aabb.miny) {
                      _this47.aabb.miny = p1.y;
                    }
                    if (p1.y > _this47.aabb.maxy) {
                      _this47.aabb.maxy = p1.y;
                    }
                    cx_ite5 = cx_ite5.next;
                  }
                }
              }
            }
          }
          let a29 = shape1.aabb;
          aabb1.minx = a29.minx - 3.0;
          aabb1.miny = a29.miny - 3.0;
          aabb1.maxx = a29.maxx + 3.0;
          aabb1.maxy = a29.maxy + 3.0;
          let tree3 = (node3.dyn =
            shape1.body.type == 1 ? false : !shape1.body.component.sleeping)
            ? this.dtree
            : this.stree;
          if (tree3.root == null) {
            tree3.root = node3;
            tree3.root.parent = null;
          } else {
            let leafaabb1 = node3.aabb;
            let node5 = tree3.root;
            while (node5.child1 != null) {
              let child14 = node5.child1;
              let child24 = node5.child2;
              let _this49 = node5.aabb;
              let area3 =
                (_this49.maxx - _this49.minx + (_this49.maxy - _this49.miny)) *
                2;
              let _this50 = ZPP_AABBTree.tmpaabb;
              let a30 = node5.aabb;
              _this50.minx =
                a30.minx < leafaabb1.minx ? a30.minx : leafaabb1.minx;
              _this50.miny =
                a30.miny < leafaabb1.miny ? a30.miny : leafaabb1.miny;
              _this50.maxx =
                a30.maxx > leafaabb1.maxx ? a30.maxx : leafaabb1.maxx;
              _this50.maxy =
                a30.maxy > leafaabb1.maxy ? a30.maxy : leafaabb1.maxy;
              let _this51 = ZPP_AABBTree.tmpaabb;
              let carea1 =
                (_this51.maxx - _this51.minx + (_this51.maxy - _this51.miny)) *
                2;
              let cost3 = 2 * carea1;
              let icost1 = 2 * (carea1 - area3);
              let _this52 = ZPP_AABBTree.tmpaabb;
              let b33 = child14.aabb;
              _this52.minx =
                leafaabb1.minx < b33.minx ? leafaabb1.minx : b33.minx;
              _this52.miny =
                leafaabb1.miny < b33.miny ? leafaabb1.miny : b33.miny;
              _this52.maxx =
                leafaabb1.maxx > b33.maxx ? leafaabb1.maxx : b33.maxx;
              _this52.maxy =
                leafaabb1.maxy > b33.maxy ? leafaabb1.maxy : b33.maxy;
              let cost11;
              if (child14.child1 == null) {
                let _this53 = ZPP_AABBTree.tmpaabb;
                cost11 =
                  (_this53.maxx -
                    _this53.minx +
                    (_this53.maxy - _this53.miny)) *
                    2 +
                  icost1;
              } else {
                let _this54 = child14.aabb;
                let oarea2 =
                  (_this54.maxx -
                    _this54.minx +
                    (_this54.maxy - _this54.miny)) *
                  2;
                let _this55 = ZPP_AABBTree.tmpaabb;
                let narea2 =
                  (_this55.maxx -
                    _this55.minx +
                    (_this55.maxy - _this55.miny)) *
                  2;
                cost11 = narea2 - oarea2 + icost1;
              }
              let _this56 = ZPP_AABBTree.tmpaabb;
              let b34 = child24.aabb;
              _this56.minx =
                leafaabb1.minx < b34.minx ? leafaabb1.minx : b34.minx;
              _this56.miny =
                leafaabb1.miny < b34.miny ? leafaabb1.miny : b34.miny;
              _this56.maxx =
                leafaabb1.maxx > b34.maxx ? leafaabb1.maxx : b34.maxx;
              _this56.maxy =
                leafaabb1.maxy > b34.maxy ? leafaabb1.maxy : b34.maxy;
              let cost21;
              if (child24.child1 == null) {
                let _this57 = ZPP_AABBTree.tmpaabb;
                cost21 =
                  (_this57.maxx -
                    _this57.minx +
                    (_this57.maxy - _this57.miny)) *
                    2 +
                  icost1;
              } else {
                let _this58 = child24.aabb;
                let oarea3 =
                  (_this58.maxx -
                    _this58.minx +
                    (_this58.maxy - _this58.miny)) *
                  2;
                let _this59 = ZPP_AABBTree.tmpaabb;
                let narea3 =
                  (_this59.maxx -
                    _this59.minx +
                    (_this59.maxy - _this59.miny)) *
                  2;
                cost21 = narea3 - oarea3 + icost1;
              }
              if (cost3 < cost11 && cost3 < cost21) {
                break;
              } else {
                node5 = cost11 < cost21 ? child14 : child24;
              }
            }
            let sibling3 = node5;
            let oparent1 = sibling3.parent;
            let nparent1;
            if (ZPP_AABBNode.zpp_pool == null) {
              nparent1 = new ZPP_AABBNode();
            } else {
              nparent1 = ZPP_AABBNode.zpp_pool;
              ZPP_AABBNode.zpp_pool = nparent1.next;
              nparent1.next = null;
            }
            if (ZPP_AABB.zpp_pool == null) {
              nparent1.aabb = new ZPP_AABB();
            } else {
              nparent1.aabb = ZPP_AABB.zpp_pool;
              ZPP_AABB.zpp_pool = nparent1.aabb.next;
              nparent1.aabb.next = null;
            }
            nparent1.moved = false;
            nparent1.synced = false;
            nparent1.first_sync = false;
            nparent1.parent = oparent1;
            let _this60 = nparent1.aabb;
            let b35 = sibling3.aabb;
            _this60.minx =
              leafaabb1.minx < b35.minx ? leafaabb1.minx : b35.minx;
            _this60.miny =
              leafaabb1.miny < b35.miny ? leafaabb1.miny : b35.miny;
            _this60.maxx =
              leafaabb1.maxx > b35.maxx ? leafaabb1.maxx : b35.maxx;
            _this60.maxy =
              leafaabb1.maxy > b35.maxy ? leafaabb1.maxy : b35.maxy;
            nparent1.height = sibling3.height + 1;
            if (oparent1 != null) {
              if (oparent1.child1 == sibling3) {
                oparent1.child1 = nparent1;
              } else {
                oparent1.child2 = nparent1;
              }
              nparent1.child1 = sibling3;
              nparent1.child2 = node3;
              sibling3.parent = nparent1;
              node3.parent = nparent1;
            } else {
              nparent1.child1 = sibling3;
              nparent1.child2 = node3;
              sibling3.parent = nparent1;
              node3.parent = nparent1;
              tree3.root = nparent1;
            }
            node5 = node3.parent;
            while (node5 != null) {
              if (node5.child1 == null || node5.height < 2) {
                node5 = node5;
              } else {
                let b36 = node5.child1;
                let c3 = node5.child2;
                let balance3 = c3.height - b36.height;
                if (balance3 > 1) {
                  let f6 = c3.child1;
                  let g8 = c3.child2;
                  c3.child1 = node5;
                  c3.parent = node5.parent;
                  node5.parent = c3;
                  if (c3.parent != null) {
                    if (c3.parent.child1 == node5) {
                      c3.parent.child1 = c3;
                    } else {
                      c3.parent.child2 = c3;
                    }
                  } else {
                    tree3.root = c3;
                  }
                  if (f6.height > g8.height) {
                    c3.child2 = f6;
                    node5.child2 = g8;
                    g8.parent = node5;
                    let _this61 = node5.aabb;
                    let a31 = b36.aabb;
                    let b37 = g8.aabb;
                    _this61.minx = a31.minx < b37.minx ? a31.minx : b37.minx;
                    _this61.miny = a31.miny < b37.miny ? a31.miny : b37.miny;
                    _this61.maxx = a31.maxx > b37.maxx ? a31.maxx : b37.maxx;
                    _this61.maxy = a31.maxy > b37.maxy ? a31.maxy : b37.maxy;
                    let _this62 = c3.aabb;
                    let a32 = node5.aabb;
                    let b38 = f6.aabb;
                    _this62.minx = a32.minx < b38.minx ? a32.minx : b38.minx;
                    _this62.miny = a32.miny < b38.miny ? a32.miny : b38.miny;
                    _this62.maxx = a32.maxx > b38.maxx ? a32.maxx : b38.maxx;
                    _this62.maxy = a32.maxy > b38.maxy ? a32.maxy : b38.maxy;
                    let x27 = b36.height;
                    let y27 = g8.height;
                    node5.height = 1 + (x27 > y27 ? x27 : y27);
                    let x28 = node5.height;
                    let y28 = f6.height;
                    c3.height = 1 + (x28 > y28 ? x28 : y28);
                  } else {
                    c3.child2 = g8;
                    node5.child2 = f6;
                    f6.parent = node5;
                    let _this63 = node5.aabb;
                    let a33 = b36.aabb;
                    let b39 = f6.aabb;
                    _this63.minx = a33.minx < b39.minx ? a33.minx : b39.minx;
                    _this63.miny = a33.miny < b39.miny ? a33.miny : b39.miny;
                    _this63.maxx = a33.maxx > b39.maxx ? a33.maxx : b39.maxx;
                    _this63.maxy = a33.maxy > b39.maxy ? a33.maxy : b39.maxy;
                    let _this64 = c3.aabb;
                    let a34 = node5.aabb;
                    let b40 = g8.aabb;
                    _this64.minx = a34.minx < b40.minx ? a34.minx : b40.minx;
                    _this64.miny = a34.miny < b40.miny ? a34.miny : b40.miny;
                    _this64.maxx = a34.maxx > b40.maxx ? a34.maxx : b40.maxx;
                    _this64.maxy = a34.maxy > b40.maxy ? a34.maxy : b40.maxy;
                    let x29 = b36.height;
                    let y29 = f6.height;
                    node5.height = 1 + (x29 > y29 ? x29 : y29);
                    let x30 = node5.height;
                    let y30 = g8.height;
                    c3.height = 1 + (x30 > y30 ? x30 : y30);
                  }
                  node5 = c3;
                } else if (balance3 < -1) {
                  let f7 = b36.child1;
                  let g9 = b36.child2;
                  b36.child1 = node5;
                  b36.parent = node5.parent;
                  node5.parent = b36;
                  if (b36.parent != null) {
                    if (b36.parent.child1 == node5) {
                      b36.parent.child1 = b36;
                    } else {
                      b36.parent.child2 = b36;
                    }
                  } else {
                    tree3.root = b36;
                  }
                  if (f7.height > g9.height) {
                    b36.child2 = f7;
                    node5.child1 = g9;
                    g9.parent = node5;
                    let _this65 = node5.aabb;
                    let a35 = c3.aabb;
                    let b41 = g9.aabb;
                    _this65.minx = a35.minx < b41.minx ? a35.minx : b41.minx;
                    _this65.miny = a35.miny < b41.miny ? a35.miny : b41.miny;
                    _this65.maxx = a35.maxx > b41.maxx ? a35.maxx : b41.maxx;
                    _this65.maxy = a35.maxy > b41.maxy ? a35.maxy : b41.maxy;
                    let _this66 = b36.aabb;
                    let a36 = node5.aabb;
                    let b42 = f7.aabb;
                    _this66.minx = a36.minx < b42.minx ? a36.minx : b42.minx;
                    _this66.miny = a36.miny < b42.miny ? a36.miny : b42.miny;
                    _this66.maxx = a36.maxx > b42.maxx ? a36.maxx : b42.maxx;
                    _this66.maxy = a36.maxy > b42.maxy ? a36.maxy : b42.maxy;
                    let x31 = c3.height;
                    let y31 = g9.height;
                    node5.height = 1 + (x31 > y31 ? x31 : y31);
                    let x32 = node5.height;
                    let y32 = f7.height;
                    b36.height = 1 + (x32 > y32 ? x32 : y32);
                  } else {
                    b36.child2 = g9;
                    node5.child1 = f7;
                    f7.parent = node5;
                    let _this67 = node5.aabb;
                    let a37 = c3.aabb;
                    let b43 = f7.aabb;
                    _this67.minx = a37.minx < b43.minx ? a37.minx : b43.minx;
                    _this67.miny = a37.miny < b43.miny ? a37.miny : b43.miny;
                    _this67.maxx = a37.maxx > b43.maxx ? a37.maxx : b43.maxx;
                    _this67.maxy = a37.maxy > b43.maxy ? a37.maxy : b43.maxy;
                    let _this68 = b36.aabb;
                    let a38 = node5.aabb;
                    let b44 = g9.aabb;
                    _this68.minx = a38.minx < b44.minx ? a38.minx : b44.minx;
                    _this68.miny = a38.miny < b44.miny ? a38.miny : b44.miny;
                    _this68.maxx = a38.maxx > b44.maxx ? a38.maxx : b44.maxx;
                    _this68.maxy = a38.maxy > b44.maxy ? a38.maxy : b44.maxy;
                    let x33 = c3.height;
                    let y33 = f7.height;
                    node5.height = 1 + (x33 > y33 ? x33 : y33);
                    let x34 = node5.height;
                    let y34 = g9.height;
                    b36.height = 1 + (x34 > y34 ? x34 : y34);
                  }
                  node5 = b36;
                } else {
                  node5 = node5;
                }
              }
              let child15 = node5.child1;
              let child25 = node5.child2;
              let x35 = child15.height;
              let y35 = child25.height;
              node5.height = 1 + (x35 > y35 ? x35 : y35);
              let _this69 = node5.aabb;
              let a39 = child15.aabb;
              let b45 = child25.aabb;
              _this69.minx = a39.minx < b45.minx ? a39.minx : b45.minx;
              _this69.miny = a39.miny < b45.miny ? a39.miny : b45.miny;
              _this69.maxx = a39.maxx > b45.maxx ? a39.maxx : b45.maxx;
              _this69.maxy = a39.maxy > b45.maxy ? a39.maxy : b45.maxy;
              node5 = node5.parent;
            }
          }
          node3.synced = false;
          if (!node3.moved) {
            node3.moved = true;
            node3.mnext = this.moves;
            this.moves = node3;
          }
        }
      }
    }
  }

  // ========== broadphase ==========

  broadphase(space: Any, discrete: Any): Any {
    let node = this.syncs;
    while (node != null) {
      let shape = node.shape;
      if (!node.first_sync) {
        let tree = node.dyn ? this.dtree : this.stree;
        if (node == tree.root) {
          tree.root = null;
        } else {
          let parent = node.parent;
          let gparent = parent.parent;
          let sibling = parent.child1 == node ? parent.child2 : parent.child1;
          if (gparent != null) {
            if (gparent.child1 == parent) {
              gparent.child1 = sibling;
            } else {
              gparent.child2 = sibling;
            }
            sibling.parent = gparent;
            let o = parent;
            o.height = -1;
            let o1 = o.aabb;
            if (o1.outer != null) {
              o1.outer.zpp_inner = null;
              o1.outer = null;
            }
            o1.wrap_min = o1.wrap_max = null;
            o1._invalidate = null;
            o1._validate = null;
            o1.next = ZPP_AABB.zpp_pool;
            ZPP_AABB.zpp_pool = o1;
            o.child1 = o.child2 = o.parent = null;
            o.next = null;
            o.snext = null;
            o.mnext = null;
            o.next = ZPP_AABBNode.zpp_pool;
            ZPP_AABBNode.zpp_pool = o;
            let node1 = gparent;
            while (node1 != null) {
              if (node1.child1 == null || node1.height < 2) {
                node1 = node1;
              } else {
                let b = node1.child1;
                let c = node1.child2;
                let balance = c.height - b.height;
                if (balance > 1) {
                  let f = c.child1;
                  let g = c.child2;
                  c.child1 = node1;
                  c.parent = node1.parent;
                  node1.parent = c;
                  if (c.parent != null) {
                    if (c.parent.child1 == node1) {
                      c.parent.child1 = c;
                    } else {
                      c.parent.child2 = c;
                    }
                  } else {
                    tree.root = c;
                  }
                  if (f.height > g.height) {
                    c.child2 = f;
                    node1.child2 = g;
                    g.parent = node1;
                    let _this = node1.aabb;
                    let a = b.aabb;
                    let b1 = g.aabb;
                    _this.minx = a.minx < b1.minx ? a.minx : b1.minx;
                    _this.miny = a.miny < b1.miny ? a.miny : b1.miny;
                    _this.maxx = a.maxx > b1.maxx ? a.maxx : b1.maxx;
                    _this.maxy = a.maxy > b1.maxy ? a.maxy : b1.maxy;
                    let _this1 = c.aabb;
                    let a1 = node1.aabb;
                    let b2 = f.aabb;
                    _this1.minx = a1.minx < b2.minx ? a1.minx : b2.minx;
                    _this1.miny = a1.miny < b2.miny ? a1.miny : b2.miny;
                    _this1.maxx = a1.maxx > b2.maxx ? a1.maxx : b2.maxx;
                    _this1.maxy = a1.maxy > b2.maxy ? a1.maxy : b2.maxy;
                    let x = b.height;
                    let y = g.height;
                    node1.height = 1 + (x > y ? x : y);
                    let x1 = node1.height;
                    let y1 = f.height;
                    c.height = 1 + (x1 > y1 ? x1 : y1);
                  } else {
                    c.child2 = g;
                    node1.child2 = f;
                    f.parent = node1;
                    let _this2 = node1.aabb;
                    let a2 = b.aabb;
                    let b3 = f.aabb;
                    _this2.minx = a2.minx < b3.minx ? a2.minx : b3.minx;
                    _this2.miny = a2.miny < b3.miny ? a2.miny : b3.miny;
                    _this2.maxx = a2.maxx > b3.maxx ? a2.maxx : b3.maxx;
                    _this2.maxy = a2.maxy > b3.maxy ? a2.maxy : b3.maxy;
                    let _this3 = c.aabb;
                    let a3 = node1.aabb;
                    let b4 = g.aabb;
                    _this3.minx = a3.minx < b4.minx ? a3.minx : b4.minx;
                    _this3.miny = a3.miny < b4.miny ? a3.miny : b4.miny;
                    _this3.maxx = a3.maxx > b4.maxx ? a3.maxx : b4.maxx;
                    _this3.maxy = a3.maxy > b4.maxy ? a3.maxy : b4.maxy;
                    let x2 = b.height;
                    let y2 = f.height;
                    node1.height = 1 + (x2 > y2 ? x2 : y2);
                    let x3 = node1.height;
                    let y3 = g.height;
                    c.height = 1 + (x3 > y3 ? x3 : y3);
                  }
                  node1 = c;
                } else if (balance < -1) {
                  let f1 = b.child1;
                  let g1 = b.child2;
                  b.child1 = node1;
                  b.parent = node1.parent;
                  node1.parent = b;
                  if (b.parent != null) {
                    if (b.parent.child1 == node1) {
                      b.parent.child1 = b;
                    } else {
                      b.parent.child2 = b;
                    }
                  } else {
                    tree.root = b;
                  }
                  if (f1.height > g1.height) {
                    b.child2 = f1;
                    node1.child1 = g1;
                    g1.parent = node1;
                    let _this4 = node1.aabb;
                    let a4 = c.aabb;
                    let b5 = g1.aabb;
                    _this4.minx = a4.minx < b5.minx ? a4.minx : b5.minx;
                    _this4.miny = a4.miny < b5.miny ? a4.miny : b5.miny;
                    _this4.maxx = a4.maxx > b5.maxx ? a4.maxx : b5.maxx;
                    _this4.maxy = a4.maxy > b5.maxy ? a4.maxy : b5.maxy;
                    let _this5 = b.aabb;
                    let a5 = node1.aabb;
                    let b6 = f1.aabb;
                    _this5.minx = a5.minx < b6.minx ? a5.minx : b6.minx;
                    _this5.miny = a5.miny < b6.miny ? a5.miny : b6.miny;
                    _this5.maxx = a5.maxx > b6.maxx ? a5.maxx : b6.maxx;
                    _this5.maxy = a5.maxy > b6.maxy ? a5.maxy : b6.maxy;
                    let x4 = c.height;
                    let y4 = g1.height;
                    node1.height = 1 + (x4 > y4 ? x4 : y4);
                    let x5 = node1.height;
                    let y5 = f1.height;
                    b.height = 1 + (x5 > y5 ? x5 : y5);
                  } else {
                    b.child2 = g1;
                    node1.child1 = f1;
                    f1.parent = node1;
                    let _this6 = node1.aabb;
                    let a6 = c.aabb;
                    let b7 = f1.aabb;
                    _this6.minx = a6.minx < b7.minx ? a6.minx : b7.minx;
                    _this6.miny = a6.miny < b7.miny ? a6.miny : b7.miny;
                    _this6.maxx = a6.maxx > b7.maxx ? a6.maxx : b7.maxx;
                    _this6.maxy = a6.maxy > b7.maxy ? a6.maxy : b7.maxy;
                    let _this7 = b.aabb;
                    let a7 = node1.aabb;
                    let b8 = g1.aabb;
                    _this7.minx = a7.minx < b8.minx ? a7.minx : b8.minx;
                    _this7.miny = a7.miny < b8.miny ? a7.miny : b8.miny;
                    _this7.maxx = a7.maxx > b8.maxx ? a7.maxx : b8.maxx;
                    _this7.maxy = a7.maxy > b8.maxy ? a7.maxy : b8.maxy;
                    let x6 = c.height;
                    let y6 = f1.height;
                    node1.height = 1 + (x6 > y6 ? x6 : y6);
                    let x7 = node1.height;
                    let y7 = g1.height;
                    b.height = 1 + (x7 > y7 ? x7 : y7);
                  }
                  node1 = b;
                } else {
                  node1 = node1;
                }
              }
              let child1 = node1.child1;
              let child2 = node1.child2;
              let _this8 = node1.aabb;
              let a8 = child1.aabb;
              let b9 = child2.aabb;
              _this8.minx = a8.minx < b9.minx ? a8.minx : b9.minx;
              _this8.miny = a8.miny < b9.miny ? a8.miny : b9.miny;
              _this8.maxx = a8.maxx > b9.maxx ? a8.maxx : b9.maxx;
              _this8.maxy = a8.maxy > b9.maxy ? a8.maxy : b9.maxy;
              let x8 = child1.height;
              let y8 = child2.height;
              node1.height = 1 + (x8 > y8 ? x8 : y8);
              node1 = node1.parent;
            }
          } else {
            tree.root = sibling;
            sibling.parent = null;
            let o2 = parent;
            o2.height = -1;
            let o3 = o2.aabb;
            if (o3.outer != null) {
              o3.outer.zpp_inner = null;
              o3.outer = null;
            }
            o3.wrap_min = o3.wrap_max = null;
            o3._invalidate = null;
            o3._validate = null;
            o3.next = ZPP_AABB.zpp_pool;
            ZPP_AABB.zpp_pool = o3;
            o2.child1 = o2.child2 = o2.parent = null;
            o2.next = null;
            o2.snext = null;
            o2.mnext = null;
            o2.next = ZPP_AABBNode.zpp_pool;
            ZPP_AABBNode.zpp_pool = o2;
          }
        }
      } else {
        node.first_sync = false;
      }
      let aabb = node.aabb;
      if (!space.continuous) {
        if (shape.zip_aabb) {
          if (shape.body != null) {
            shape.zip_aabb = false;
            if (shape.type == 0) {
              let _this9 = shape.circle;
              if (_this9.zip_worldCOM) {
                if (_this9.body != null) {
                  _this9.zip_worldCOM = false;
                  if (_this9.zip_localCOM) {
                    _this9.zip_localCOM = false;
                    if (_this9.type == 1) {
                      let _this10 = _this9.polygon;
                      if (_this10.lverts.next == null) {
                        throw new Error(
                          "Error: An empty polygon has no meaningful localCOM"
                        );
                      }
                      if (_this10.lverts.next.next == null) {
                        _this10.localCOMx = _this10.lverts.next.x;
                        _this10.localCOMy = _this10.lverts.next.y;
                      } else if (_this10.lverts.next.next.next == null) {
                        _this10.localCOMx = _this10.lverts.next.x;
                        _this10.localCOMy = _this10.lverts.next.y;
                        let t = 1.0;
                        _this10.localCOMx += _this10.lverts.next.next.x * t;
                        _this10.localCOMy += _this10.lverts.next.next.y * t;
                        let t1 = 0.5;
                        _this10.localCOMx *= t1;
                        _this10.localCOMy *= t1;
                      } else {
                        _this10.localCOMx = 0;
                        _this10.localCOMy = 0;
                        let area = 0.0;
                        let cx_ite = _this10.lverts.next;
                        let u = cx_ite;
                        cx_ite = cx_ite.next;
                        let v = cx_ite;
                        cx_ite = cx_ite.next;
                        while (cx_ite != null) {
                          let w = cx_ite;
                          area += v.x * (w.y - u.y);
                          let cf = w.y * v.x - w.x * v.y;
                          _this10.localCOMx += (v.x + w.x) * cf;
                          _this10.localCOMy += (v.y + w.y) * cf;
                          u = v;
                          v = w;
                          cx_ite = cx_ite.next;
                        }
                        cx_ite = _this10.lverts.next;
                        let w1 = cx_ite;
                        area += v.x * (w1.y - u.y);
                        let cf1 = w1.y * v.x - w1.x * v.y;
                        _this10.localCOMx += (v.x + w1.x) * cf1;
                        _this10.localCOMy += (v.y + w1.y) * cf1;
                        u = v;
                        v = w1;
                        cx_ite = cx_ite.next;
                        let w2 = cx_ite;
                        area += v.x * (w2.y - u.y);
                        let cf2 = w2.y * v.x - w2.x * v.y;
                        _this10.localCOMx += (v.x + w2.x) * cf2;
                        _this10.localCOMy += (v.y + w2.y) * cf2;
                        area = 1 / (3 * area);
                        let t2 = area;
                        _this10.localCOMx *= t2;
                        _this10.localCOMy *= t2;
                      }
                    }
                    if (_this9.wrap_localCOM != null) {
                      _this9.wrap_localCOM.zpp_inner.x = _this9.localCOMx;
                      _this9.wrap_localCOM.zpp_inner.y = _this9.localCOMy;
                    }
                  }
                  let _this11 = _this9.body;
                  if (_this11.zip_axis) {
                    _this11.zip_axis = false;
                    _this11.axisx = Math.sin(_this11.rot);
                    _this11.axisy = Math.cos(_this11.rot);
                  }
                  _this9.worldCOMx =
                    _this9.body.posx +
                    (_this9.body.axisy * _this9.localCOMx -
                      _this9.body.axisx * _this9.localCOMy);
                  _this9.worldCOMy =
                    _this9.body.posy +
                    (_this9.localCOMx * _this9.body.axisx +
                      _this9.localCOMy * _this9.body.axisy);
                }
              }
              let rx = _this9.radius;
              let ry = _this9.radius;
              _this9.aabb.minx = _this9.worldCOMx - rx;
              _this9.aabb.miny = _this9.worldCOMy - ry;
              _this9.aabb.maxx = _this9.worldCOMx + rx;
              _this9.aabb.maxy = _this9.worldCOMy + ry;
            } else {
              let _this12 = shape.polygon;
              if (_this12.zip_gverts) {
                if (_this12.body != null) {
                  _this12.zip_gverts = false;
                  _this12.validate_lverts();
                  let _this13 = _this12.body;
                  if (_this13.zip_axis) {
                    _this13.zip_axis = false;
                    _this13.axisx = Math.sin(_this13.rot);
                    _this13.axisy = Math.cos(_this13.rot);
                  }
                  let li = _this12.lverts.next;
                  let cx_ite1 = _this12.gverts.next;
                  while (cx_ite1 != null) {
                    let g2 = cx_ite1;
                    let l = li;
                    li = li.next;
                    g2.x =
                      _this12.body.posx +
                      (_this12.body.axisy * l.x - _this12.body.axisx * l.y);
                    g2.y =
                      _this12.body.posy +
                      (l.x * _this12.body.axisx + l.y * _this12.body.axisy);
                    cx_ite1 = cx_ite1.next;
                  }
                }
              }
              if (_this12.lverts.next == null) {
                throw new Error(
                  "Error: An empty polygon has no meaningful bounds"
                );
              }
              let p0 = _this12.gverts.next;
              _this12.aabb.minx = p0.x;
              _this12.aabb.miny = p0.y;
              _this12.aabb.maxx = p0.x;
              _this12.aabb.maxy = p0.y;
              let cx_ite2 = _this12.gverts.next.next;
              while (cx_ite2 != null) {
                let p = cx_ite2;
                if (p.x < _this12.aabb.minx) {
                  _this12.aabb.minx = p.x;
                }
                if (p.x > _this12.aabb.maxx) {
                  _this12.aabb.maxx = p.x;
                }
                if (p.y < _this12.aabb.miny) {
                  _this12.aabb.miny = p.y;
                }
                if (p.y > _this12.aabb.maxy) {
                  _this12.aabb.maxy = p.y;
                }
                cx_ite2 = cx_ite2.next;
              }
            }
          }
        }
      }
      let a9 = shape.aabb;
      aabb.minx = a9.minx - 3.0;
      aabb.miny = a9.miny - 3.0;
      aabb.maxx = a9.maxx + 3.0;
      aabb.maxy = a9.maxy + 3.0;
      let tree1 = (node.dyn =
        shape.body.type == 1 ? false : !shape.body.component.sleeping)
        ? this.dtree
        : this.stree;
      if (tree1.root == null) {
        tree1.root = node;
        tree1.root.parent = null;
      } else {
        let leafaabb = node.aabb;
        let node2 = tree1.root;
        while (node2.child1 != null) {
          let child11 = node2.child1;
          let child21 = node2.child2;
          let _this14 = node2.aabb;
          let area1 =
            (_this14.maxx - _this14.minx + (_this14.maxy - _this14.miny)) * 2;
          let _this15 = ZPP_AABBTree.tmpaabb;
          let a10 = node2.aabb;
          _this15.minx = a10.minx < leafaabb.minx ? a10.minx : leafaabb.minx;
          _this15.miny = a10.miny < leafaabb.miny ? a10.miny : leafaabb.miny;
          _this15.maxx = a10.maxx > leafaabb.maxx ? a10.maxx : leafaabb.maxx;
          _this15.maxy = a10.maxy > leafaabb.maxy ? a10.maxy : leafaabb.maxy;
          let _this16 = ZPP_AABBTree.tmpaabb;
          let carea =
            (_this16.maxx - _this16.minx + (_this16.maxy - _this16.miny)) * 2;
          let cost = 2 * carea;
          let icost = 2 * (carea - area1);
          let _this17 = ZPP_AABBTree.tmpaabb;
          let b10 = child11.aabb;
          _this17.minx = leafaabb.minx < b10.minx ? leafaabb.minx : b10.minx;
          _this17.miny = leafaabb.miny < b10.miny ? leafaabb.miny : b10.miny;
          _this17.maxx = leafaabb.maxx > b10.maxx ? leafaabb.maxx : b10.maxx;
          _this17.maxy = leafaabb.maxy > b10.maxy ? leafaabb.maxy : b10.maxy;
          let cost1;
          if (child11.child1 == null) {
            let _this18 = ZPP_AABBTree.tmpaabb;
            cost1 =
              (_this18.maxx - _this18.minx + (_this18.maxy - _this18.miny)) *
                2 +
              icost;
          } else {
            let _this19 = child11.aabb;
            let oarea =
              (_this19.maxx - _this19.minx + (_this19.maxy - _this19.miny)) * 2;
            let _this20 = ZPP_AABBTree.tmpaabb;
            let narea =
              (_this20.maxx - _this20.minx + (_this20.maxy - _this20.miny)) * 2;
            cost1 = narea - oarea + icost;
          }
          let _this21 = ZPP_AABBTree.tmpaabb;
          let b11 = child21.aabb;
          _this21.minx = leafaabb.minx < b11.minx ? leafaabb.minx : b11.minx;
          _this21.miny = leafaabb.miny < b11.miny ? leafaabb.miny : b11.miny;
          _this21.maxx = leafaabb.maxx > b11.maxx ? leafaabb.maxx : b11.maxx;
          _this21.maxy = leafaabb.maxy > b11.maxy ? leafaabb.maxy : b11.maxy;
          let cost2;
          if (child21.child1 == null) {
            let _this22 = ZPP_AABBTree.tmpaabb;
            cost2 =
              (_this22.maxx - _this22.minx + (_this22.maxy - _this22.miny)) *
                2 +
              icost;
          } else {
            let _this23 = child21.aabb;
            let oarea1 =
              (_this23.maxx - _this23.minx + (_this23.maxy - _this23.miny)) * 2;
            let _this24 = ZPP_AABBTree.tmpaabb;
            let narea1 =
              (_this24.maxx - _this24.minx + (_this24.maxy - _this24.miny)) * 2;
            cost2 = narea1 - oarea1 + icost;
          }
          if (cost < cost1 && cost < cost2) {
            break;
          } else {
            node2 = cost1 < cost2 ? child11 : child21;
          }
        }
        let sibling1 = node2;
        let oparent = sibling1.parent;
        let nparent;
        if (ZPP_AABBNode.zpp_pool == null) {
          nparent = new ZPP_AABBNode();
        } else {
          nparent = ZPP_AABBNode.zpp_pool;
          ZPP_AABBNode.zpp_pool = nparent.next;
          nparent.next = null;
        }
        if (ZPP_AABB.zpp_pool == null) {
          nparent.aabb = new ZPP_AABB();
        } else {
          nparent.aabb = ZPP_AABB.zpp_pool;
          ZPP_AABB.zpp_pool = nparent.aabb.next;
          nparent.aabb.next = null;
        }
        nparent.moved = false;
        nparent.synced = false;
        nparent.first_sync = false;
        nparent.parent = oparent;
        let _this25 = nparent.aabb;
        let b12 = sibling1.aabb;
        _this25.minx = leafaabb.minx < b12.minx ? leafaabb.minx : b12.minx;
        _this25.miny = leafaabb.miny < b12.miny ? leafaabb.miny : b12.miny;
        _this25.maxx = leafaabb.maxx > b12.maxx ? leafaabb.maxx : b12.maxx;
        _this25.maxy = leafaabb.maxy > b12.maxy ? leafaabb.maxy : b12.maxy;
        nparent.height = sibling1.height + 1;
        if (oparent != null) {
          if (oparent.child1 == sibling1) {
            oparent.child1 = nparent;
          } else {
            oparent.child2 = nparent;
          }
          nparent.child1 = sibling1;
          nparent.child2 = node;
          sibling1.parent = nparent;
          node.parent = nparent;
        } else {
          nparent.child1 = sibling1;
          nparent.child2 = node;
          sibling1.parent = nparent;
          node.parent = nparent;
          tree1.root = nparent;
        }
        node2 = node.parent;
        while (node2 != null) {
          if (node2.child1 == null || node2.height < 2) {
            node2 = node2;
          } else {
            let b13 = node2.child1;
            let c1 = node2.child2;
            let balance1 = c1.height - b13.height;
            if (balance1 > 1) {
              let f2 = c1.child1;
              let g3 = c1.child2;
              c1.child1 = node2;
              c1.parent = node2.parent;
              node2.parent = c1;
              if (c1.parent != null) {
                if (c1.parent.child1 == node2) {
                  c1.parent.child1 = c1;
                } else {
                  c1.parent.child2 = c1;
                }
              } else {
                tree1.root = c1;
              }
              if (f2.height > g3.height) {
                c1.child2 = f2;
                node2.child2 = g3;
                g3.parent = node2;
                let _this26 = node2.aabb;
                let a11 = b13.aabb;
                let b14 = g3.aabb;
                _this26.minx = a11.minx < b14.minx ? a11.minx : b14.minx;
                _this26.miny = a11.miny < b14.miny ? a11.miny : b14.miny;
                _this26.maxx = a11.maxx > b14.maxx ? a11.maxx : b14.maxx;
                _this26.maxy = a11.maxy > b14.maxy ? a11.maxy : b14.maxy;
                let _this27 = c1.aabb;
                let a12 = node2.aabb;
                let b15 = f2.aabb;
                _this27.minx = a12.minx < b15.minx ? a12.minx : b15.minx;
                _this27.miny = a12.miny < b15.miny ? a12.miny : b15.miny;
                _this27.maxx = a12.maxx > b15.maxx ? a12.maxx : b15.maxx;
                _this27.maxy = a12.maxy > b15.maxy ? a12.maxy : b15.maxy;
                let x9 = b13.height;
                let y9 = g3.height;
                node2.height = 1 + (x9 > y9 ? x9 : y9);
                let x10 = node2.height;
                let y10 = f2.height;
                c1.height = 1 + (x10 > y10 ? x10 : y10);
              } else {
                c1.child2 = g3;
                node2.child2 = f2;
                f2.parent = node2;
                let _this28 = node2.aabb;
                let a13 = b13.aabb;
                let b16 = f2.aabb;
                _this28.minx = a13.minx < b16.minx ? a13.minx : b16.minx;
                _this28.miny = a13.miny < b16.miny ? a13.miny : b16.miny;
                _this28.maxx = a13.maxx > b16.maxx ? a13.maxx : b16.maxx;
                _this28.maxy = a13.maxy > b16.maxy ? a13.maxy : b16.maxy;
                let _this29 = c1.aabb;
                let a14 = node2.aabb;
                let b17 = g3.aabb;
                _this29.minx = a14.minx < b17.minx ? a14.minx : b17.minx;
                _this29.miny = a14.miny < b17.miny ? a14.miny : b17.miny;
                _this29.maxx = a14.maxx > b17.maxx ? a14.maxx : b17.maxx;
                _this29.maxy = a14.maxy > b17.maxy ? a14.maxy : b17.maxy;
                let x11 = b13.height;
                let y11 = f2.height;
                node2.height = 1 + (x11 > y11 ? x11 : y11);
                let x12 = node2.height;
                let y12 = g3.height;
                c1.height = 1 + (x12 > y12 ? x12 : y12);
              }
              node2 = c1;
            } else if (balance1 < -1) {
              let f3 = b13.child1;
              let g4 = b13.child2;
              b13.child1 = node2;
              b13.parent = node2.parent;
              node2.parent = b13;
              if (b13.parent != null) {
                if (b13.parent.child1 == node2) {
                  b13.parent.child1 = b13;
                } else {
                  b13.parent.child2 = b13;
                }
              } else {
                tree1.root = b13;
              }
              if (f3.height > g4.height) {
                b13.child2 = f3;
                node2.child1 = g4;
                g4.parent = node2;
                let _this30 = node2.aabb;
                let a15 = c1.aabb;
                let b18 = g4.aabb;
                _this30.minx = a15.minx < b18.minx ? a15.minx : b18.minx;
                _this30.miny = a15.miny < b18.miny ? a15.miny : b18.miny;
                _this30.maxx = a15.maxx > b18.maxx ? a15.maxx : b18.maxx;
                _this30.maxy = a15.maxy > b18.maxy ? a15.maxy : b18.maxy;
                let _this31 = b13.aabb;
                let a16 = node2.aabb;
                let b19 = f3.aabb;
                _this31.minx = a16.minx < b19.minx ? a16.minx : b19.minx;
                _this31.miny = a16.miny < b19.miny ? a16.miny : b19.miny;
                _this31.maxx = a16.maxx > b19.maxx ? a16.maxx : b19.maxx;
                _this31.maxy = a16.maxy > b19.maxy ? a16.maxy : b19.maxy;
                let x13 = c1.height;
                let y13 = g4.height;
                node2.height = 1 + (x13 > y13 ? x13 : y13);
                let x14 = node2.height;
                let y14 = f3.height;
                b13.height = 1 + (x14 > y14 ? x14 : y14);
              } else {
                b13.child2 = g4;
                node2.child1 = f3;
                f3.parent = node2;
                let _this32 = node2.aabb;
                let a17 = c1.aabb;
                let b20 = f3.aabb;
                _this32.minx = a17.minx < b20.minx ? a17.minx : b20.minx;
                _this32.miny = a17.miny < b20.miny ? a17.miny : b20.miny;
                _this32.maxx = a17.maxx > b20.maxx ? a17.maxx : b20.maxx;
                _this32.maxy = a17.maxy > b20.maxy ? a17.maxy : b20.maxy;
                let _this33 = b13.aabb;
                let a18 = node2.aabb;
                let b21 = g4.aabb;
                _this33.minx = a18.minx < b21.minx ? a18.minx : b21.minx;
                _this33.miny = a18.miny < b21.miny ? a18.miny : b21.miny;
                _this33.maxx = a18.maxx > b21.maxx ? a18.maxx : b21.maxx;
                _this33.maxy = a18.maxy > b21.maxy ? a18.maxy : b21.maxy;
                let x15 = c1.height;
                let y15 = f3.height;
                node2.height = 1 + (x15 > y15 ? x15 : y15);
                let x16 = node2.height;
                let y16 = g4.height;
                b13.height = 1 + (x16 > y16 ? x16 : y16);
              }
              node2 = b13;
            } else {
              node2 = node2;
            }
          }
          let child12 = node2.child1;
          let child22 = node2.child2;
          let x17 = child12.height;
          let y17 = child22.height;
          node2.height = 1 + (x17 > y17 ? x17 : y17);
          let _this34 = node2.aabb;
          let a19 = child12.aabb;
          let b22 = child22.aabb;
          _this34.minx = a19.minx < b22.minx ? a19.minx : b22.minx;
          _this34.miny = a19.miny < b22.miny ? a19.miny : b22.miny;
          _this34.maxx = a19.maxx > b22.maxx ? a19.maxx : b22.maxx;
          _this34.maxy = a19.maxy > b22.maxy ? a19.maxy : b22.maxy;
          node2 = node2.parent;
        }
      }
      node.synced = false;
      node = node.snext;
    }
    while (this.syncs != null) {
      let ret = this.syncs;
      this.syncs = ret.snext;
      ret.snext = null;
      let leaf = ret;
      if (leaf.moved) {
        continue;
      }
      leaf.moved = false;
      let lshape = leaf.shape;
      let lbody = lshape.body;
      if (lbody.component.sleeping) {
        continue;
      }
      let ab = leaf.aabb;
      let stack = null;
      if (this.dtree.root != null) {
        this.dtree.root.next = stack;
        stack = this.dtree.root;
      }
      while (stack != null) {
        let ret1 = stack;
        stack = ret1.next;
        ret1.next = null;
        let node3 = ret1;
        if (node3 == leaf) {
          continue;
        }
        if (node3.child1 == null) {
          let shape1 = node3.shape;
          if (
            shape1.body != lshape.body &&
            !(shape1.body.type == 1 && lshape.body.type == 1)
          ) {
            let x18 = node3.aabb;
            if (
              x18.miny <= ab.maxy &&
              ab.miny <= x18.maxy &&
              x18.minx <= ab.maxx &&
              ab.minx <= x18.maxx
            ) {
              let id;
              let di;
              if (lshape.id < shape1.id) {
                id = lshape.id;
                di = shape1.id;
              } else {
                id = shape1.id;
                di = lshape.id;
              }
              let s =
                lshape.pairs.length < shape1.pairs.length ? lshape : shape1;
              let p1 = null;
              let cx_ite3 = s.pairs.head;
              while (cx_ite3 != null) {
                let px = cx_ite3.elt;
                if (px.id == id && px.di == di) {
                  p1 = px;
                  break;
                }
                cx_ite3 = cx_ite3.next;
              }
              if (p1 != null) {
                if (p1.sleeping) {
                  p1.sleeping = false;
                  p1.next = this.pairs;
                  this.pairs = p1;
                  p1.first = true;
                }
                continue;
              }
              if (ZPP_AABBPair.zpp_pool == null) {
                p1 = new ZPP_AABBPair();
              } else {
                p1 = ZPP_AABBPair.zpp_pool;
                ZPP_AABBPair.zpp_pool = p1.next;
                p1.next = null;
              }
              p1.n1 = leaf;
              p1.n2 = node3;
              p1.id = id;
              p1.di = di;
              p1.next = this.pairs;
              this.pairs = p1;
              p1.first = true;
              let _this35 = lshape.pairs;
              let ret2;
              if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool == null) {
                ret2 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair)();
              } else {
                ret2 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
                ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = ret2.next;
                ret2.next = null;
              }
              ret2.elt = p1;
              let temp = ret2;
              temp.next = _this35.head;
              _this35.head = temp;
              _this35.modified = true;
              _this35.length++;
              let _this36 = shape1.pairs;
              let ret3;
              if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool == null) {
                ret3 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair)();
              } else {
                ret3 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
                ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = ret3.next;
                ret3.next = null;
              }
              ret3.elt = p1;
              let temp1 = ret3;
              temp1.next = _this36.head;
              _this36.head = temp1;
              _this36.modified = true;
              _this36.length++;
            }
          }
        } else {
          let x19 = node3.aabb;
          if (
            x19.miny <= ab.maxy &&
            ab.miny <= x19.maxy &&
            x19.minx <= ab.maxx &&
            ab.minx <= x19.maxx
          ) {
            if (node3.child1 != null) {
              node3.child1.next = stack;
              stack = node3.child1;
            }
            if (node3.child2 != null) {
              node3.child2.next = stack;
              stack = node3.child2;
            }
          }
        }
      }
      if (this.stree.root != null) {
        this.stree.root.next = stack;
        stack = this.stree.root;
      }
      while (stack != null) {
        let ret4 = stack;
        stack = ret4.next;
        ret4.next = null;
        let node4 = ret4;
        if (node4 == leaf) {
          continue;
        }
        if (node4.child1 == null) {
          let shape2 = node4.shape;
          if (
            shape2.body != lshape.body &&
            !(shape2.body.type == 1 && lshape.body.type == 1)
          ) {
            let x20 = node4.aabb;
            if (
              x20.miny <= ab.maxy &&
              ab.miny <= x20.maxy &&
              x20.minx <= ab.maxx &&
              ab.minx <= x20.maxx
            ) {
              let id1;
              let di1;
              if (lshape.id < shape2.id) {
                id1 = lshape.id;
                di1 = shape2.id;
              } else {
                id1 = shape2.id;
                di1 = lshape.id;
              }
              let s1 =
                lshape.pairs.length < shape2.pairs.length ? lshape : shape2;
              let p2 = null;
              let cx_ite4 = s1.pairs.head;
              while (cx_ite4 != null) {
                let px1 = cx_ite4.elt;
                if (px1.id == id1 && px1.di == di1) {
                  p2 = px1;
                  break;
                }
                cx_ite4 = cx_ite4.next;
              }
              if (p2 != null) {
                if (p2.sleeping) {
                  p2.sleeping = false;
                  p2.next = this.pairs;
                  this.pairs = p2;
                  p2.first = true;
                }
                continue;
              }
              if (ZPP_AABBPair.zpp_pool == null) {
                p2 = new ZPP_AABBPair();
              } else {
                p2 = ZPP_AABBPair.zpp_pool;
                ZPP_AABBPair.zpp_pool = p2.next;
                p2.next = null;
              }
              p2.n1 = leaf;
              p2.n2 = node4;
              p2.id = id1;
              p2.di = di1;
              p2.next = this.pairs;
              this.pairs = p2;
              p2.first = true;
              let _this37 = lshape.pairs;
              let ret5;
              if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool == null) {
                ret5 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair)();
              } else {
                ret5 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
                ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = ret5.next;
                ret5.next = null;
              }
              ret5.elt = p2;
              let temp2 = ret5;
              temp2.next = _this37.head;
              _this37.head = temp2;
              _this37.modified = true;
              _this37.length++;
              let _this38 = shape2.pairs;
              let ret6;
              if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool == null) {
                ret6 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair)();
              } else {
                ret6 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
                ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = ret6.next;
                ret6.next = null;
              }
              ret6.elt = p2;
              let temp3 = ret6;
              temp3.next = _this38.head;
              _this38.head = temp3;
              _this38.modified = true;
              _this38.length++;
            }
          }
        } else {
          let x21 = node4.aabb;
          if (
            x21.miny <= ab.maxy &&
            ab.miny <= x21.maxy &&
            x21.minx <= ab.maxx &&
            ab.minx <= x21.maxx
          ) {
            if (node4.child1 != null) {
              node4.child1.next = stack;
              stack = node4.child1;
            }
            if (node4.child2 != null) {
              node4.child2.next = stack;
              stack = node4.child2;
            }
          }
        }
      }
    }
    while (this.moves != null) {
      let ret7 = this.moves;
      this.moves = ret7.mnext;
      ret7.mnext = null;
      let leaf1 = ret7;
      leaf1.moved = false;
      let lshape1 = leaf1.shape;
      let lbody1 = lshape1.body;
      if (lbody1.component.sleeping) {
        continue;
      }
      let ab1 = leaf1.aabb;
      let stack1 = null;
      if (this.dtree.root != null) {
        this.dtree.root.next = stack1;
        stack1 = this.dtree.root;
      }
      while (stack1 != null) {
        let ret8 = stack1;
        stack1 = ret8.next;
        ret8.next = null;
        let node5 = ret8;
        if (node5 == leaf1) {
          continue;
        }
        if (node5.child1 == null) {
          let shape3 = node5.shape;
          if (
            shape3.body != lshape1.body &&
            !(shape3.body.type == 1 && lshape1.body.type == 1)
          ) {
            let x22 = node5.aabb;
            if (
              x22.miny <= ab1.maxy &&
              ab1.miny <= x22.maxy &&
              x22.minx <= ab1.maxx &&
              ab1.minx <= x22.maxx
            ) {
              let id2;
              let di2;
              if (lshape1.id < shape3.id) {
                id2 = lshape1.id;
                di2 = shape3.id;
              } else {
                id2 = shape3.id;
                di2 = lshape1.id;
              }
              let s2 =
                lshape1.pairs.length < shape3.pairs.length ? lshape1 : shape3;
              let p3 = null;
              let cx_ite5 = s2.pairs.head;
              while (cx_ite5 != null) {
                let px2 = cx_ite5.elt;
                if (px2.id == id2 && px2.di == di2) {
                  p3 = px2;
                  break;
                }
                cx_ite5 = cx_ite5.next;
              }
              if (p3 != null) {
                if (p3.sleeping) {
                  p3.sleeping = false;
                  p3.next = this.pairs;
                  this.pairs = p3;
                  p3.first = true;
                }
                continue;
              }
              if (ZPP_AABBPair.zpp_pool == null) {
                p3 = new ZPP_AABBPair();
              } else {
                p3 = ZPP_AABBPair.zpp_pool;
                ZPP_AABBPair.zpp_pool = p3.next;
                p3.next = null;
              }
              p3.n1 = leaf1;
              p3.n2 = node5;
              p3.id = id2;
              p3.di = di2;
              p3.next = this.pairs;
              this.pairs = p3;
              p3.first = true;
              let _this39 = lshape1.pairs;
              let ret9;
              if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool == null) {
                ret9 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair)();
              } else {
                ret9 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
                ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = ret9.next;
                ret9.next = null;
              }
              ret9.elt = p3;
              let temp4 = ret9;
              temp4.next = _this39.head;
              _this39.head = temp4;
              _this39.modified = true;
              _this39.length++;
              let _this40 = shape3.pairs;
              let ret10;
              if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool == null) {
                ret10 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair)();
              } else {
                ret10 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
                ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = ret10.next;
                ret10.next = null;
              }
              ret10.elt = p3;
              let temp5 = ret10;
              temp5.next = _this40.head;
              _this40.head = temp5;
              _this40.modified = true;
              _this40.length++;
            }
          }
        } else {
          let x23 = node5.aabb;
          if (
            x23.miny <= ab1.maxy &&
            ab1.miny <= x23.maxy &&
            x23.minx <= ab1.maxx &&
            ab1.minx <= x23.maxx
          ) {
            if (node5.child1 != null) {
              node5.child1.next = stack1;
              stack1 = node5.child1;
            }
            if (node5.child2 != null) {
              node5.child2.next = stack1;
              stack1 = node5.child2;
            }
          }
        }
      }
      if (this.stree.root != null) {
        this.stree.root.next = stack1;
        stack1 = this.stree.root;
      }
      while (stack1 != null) {
        let ret11 = stack1;
        stack1 = ret11.next;
        ret11.next = null;
        let node6 = ret11;
        if (node6 == leaf1) {
          continue;
        }
        if (node6.child1 == null) {
          let shape4 = node6.shape;
          if (
            shape4.body != lshape1.body &&
            !(shape4.body.type == 1 && lshape1.body.type == 1)
          ) {
            let x24 = node6.aabb;
            if (
              x24.miny <= ab1.maxy &&
              ab1.miny <= x24.maxy &&
              x24.minx <= ab1.maxx &&
              ab1.minx <= x24.maxx
            ) {
              let id3;
              let di3;
              if (lshape1.id < shape4.id) {
                id3 = lshape1.id;
                di3 = shape4.id;
              } else {
                id3 = shape4.id;
                di3 = lshape1.id;
              }
              let s3 =
                lshape1.pairs.length < shape4.pairs.length ? lshape1 : shape4;
              let p4 = null;
              let cx_ite6 = s3.pairs.head;
              while (cx_ite6 != null) {
                let px3 = cx_ite6.elt;
                if (px3.id == id3 && px3.di == di3) {
                  p4 = px3;
                  break;
                }
                cx_ite6 = cx_ite6.next;
              }
              if (p4 != null) {
                if (p4.sleeping) {
                  p4.sleeping = false;
                  p4.next = this.pairs;
                  this.pairs = p4;
                  p4.first = true;
                }
                continue;
              }
              if (ZPP_AABBPair.zpp_pool == null) {
                p4 = new ZPP_AABBPair();
              } else {
                p4 = ZPP_AABBPair.zpp_pool;
                ZPP_AABBPair.zpp_pool = p4.next;
                p4.next = null;
              }
              p4.n1 = leaf1;
              p4.n2 = node6;
              p4.id = id3;
              p4.di = di3;
              p4.next = this.pairs;
              this.pairs = p4;
              p4.first = true;
              let _this41 = lshape1.pairs;
              let ret12;
              if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool == null) {
                ret12 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair)();
              } else {
                ret12 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
                ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = ret12.next;
                ret12.next = null;
              }
              ret12.elt = p4;
              let temp6 = ret12;
              temp6.next = _this41.head;
              _this41.head = temp6;
              _this41.modified = true;
              _this41.length++;
              let _this42 = shape4.pairs;
              let ret13;
              if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool == null) {
                ret13 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair)();
              } else {
                ret13 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
                ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = ret13.next;
                ret13.next = null;
              }
              ret13.elt = p4;
              let temp7 = ret13;
              temp7.next = _this42.head;
              _this42.head = temp7;
              _this42.modified = true;
              _this42.length++;
            }
          }
        } else {
          let x25 = node6.aabb;
          if (
            x25.miny <= ab1.maxy &&
            ab1.miny <= x25.maxy &&
            x25.minx <= ab1.maxx &&
            ab1.minx <= x25.maxx
          ) {
            if (node6.child1 != null) {
              node6.child1.next = stack1;
              stack1 = node6.child1;
            }
            if (node6.child2 != null) {
              node6.child2.next = stack1;
              stack1 = node6.child2;
            }
          }
        }
      }
    }
    let pre = null;
    let cur = this.pairs;
    while (cur != null) {
      let tmp;
      if (!cur.first) {
        let _this43 = cur.n1.aabb;
        let x26 = cur.n2.aabb;
        tmp = !(
          x26.miny <= _this43.maxy &&
          _this43.miny <= x26.maxy &&
          x26.minx <= _this43.maxx &&
          _this43.minx <= x26.maxx
        );
      } else {
        tmp = false;
      }
      if (tmp) {
        if (pre == null) {
          this.pairs = cur.next;
        } else {
          pre.next = cur.next;
        }
        let _this44 = cur.n1.shape.pairs;
        let pre1 = null;
        let cur1 = _this44.head;
        let ret14 = false;
        while (cur1 != null) {
          if (cur1.elt == cur) {
            let old;
            let ret15;
            if (pre1 == null) {
              old = _this44.head;
              ret15 = old.next;
              _this44.head = ret15;
              if (_this44.head == null) {
                _this44.pushmod = true;
              }
            } else {
              old = pre1.next;
              ret15 = old.next;
              pre1.next = ret15;
              if (ret15 == null) {
                _this44.pushmod = true;
              }
            }
            let o4 = old;
            o4.elt = null;
            o4.next = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
            ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = o4;
            _this44.modified = true;
            _this44.length--;
            _this44.pushmod = true;
            ret14 = true;
            break;
          }
          pre1 = cur1;
          cur1 = cur1.next;
        }
        let _this45 = cur.n2.shape.pairs;
        let pre2 = null;
        let cur2 = _this45.head;
        let ret16 = false;
        while (cur2 != null) {
          if (cur2.elt == cur) {
            let old1;
            let ret17;
            if (pre2 == null) {
              old1 = _this45.head;
              ret17 = old1.next;
              _this45.head = ret17;
              if (_this45.head == null) {
                _this45.pushmod = true;
              }
            } else {
              old1 = pre2.next;
              ret17 = old1.next;
              pre2.next = ret17;
              if (ret17 == null) {
                _this45.pushmod = true;
              }
            }
            let o5 = old1;
            o5.elt = null;
            o5.next = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
            ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = o5;
            _this45.modified = true;
            _this45.length--;
            _this45.pushmod = true;
            ret16 = true;
            break;
          }
          pre2 = cur2;
          cur2 = cur2.next;
        }
        let nxt = cur.next;
        if (cur.arb != null) {
          cur.arb.pair = null;
        }
        cur.arb = null;
        let o6 = cur;
        o6.n1 = o6.n2 = null;
        o6.sleeping = false;
        o6.next = ZPP_AABBPair.zpp_pool;
        ZPP_AABBPair.zpp_pool = o6;
        cur = nxt;
        continue;
      }
      let s11 = cur.n1.shape;
      let b110 = s11.body;
      let s21 = cur.n2.shape;
      let b23 = s21.body;
      if (!cur.first) {
        if (
          (b110.component.sleeping || b110.type == 1) &&
          (b23.component.sleeping || b23.type == 1)
        ) {
          cur.sleeping = true;
          if (pre == null) {
            this.pairs = cur.next;
          } else {
            pre.next = cur.next;
          }
          cur = cur.next;
          continue;
        }
      }
      cur.first = false;
      let _this46 = s11.aabb;
      let x27 = s21.aabb;
      if (
        x27.miny <= _this46.maxy &&
        _this46.miny <= x27.maxy &&
        x27.minx <= _this46.maxx &&
        _this46.minx <= x27.maxx
      ) {
        let oarb = cur.arb;
        if (discrete) {
          cur.arb = space.narrowPhase(
            s11,
            s21,
            b110.type != 2 || b23.type != 2,
            cur.arb,
            false
          );
        } else {
          cur.arb = space.continuousEvent(
            s11,
            s21,
            b110.type != 2 || b23.type != 2,
            cur.arb,
            false
          );
        }
        if (cur.arb == null) {
          if (oarb != null) {
            oarb.pair = null;
          }
        } else {
          cur.arb.pair = cur;
        }
      }
      pre = cur;
      cur = cur.next;
    }
  }

  // ========== clear ==========

  clear(): Any {
    while (this.syncs != null) {
      let next = this.syncs.snext;
      this.syncs.snext = null;
      if (this.syncs.first_sync) {
        this.syncs.shape.node = null;
        this.syncs.shape.removedFromSpace();
        this.syncs.shape = null;
      }
      this.syncs = next;
    }
    while (this.moves != null) {
      let next1 = this.moves.mnext;
      this.moves.mnext = null;
      if (this.moves.first_sync) {
        this.moves.shape.node = null;
        this.moves.shape.removedFromSpace();
        this.moves.shape = null;
      }
      this.moves = next1;
    }
    while (this.pairs != null) {
      let nxt = this.pairs.next;
      if (this.pairs.arb != null) {
        this.pairs.arb.pair = null;
      }
      this.pairs.arb = null;
      let _this = this.pairs.n1.shape.pairs;
      let obj = this.pairs;
      let pre = null;
      let cur = _this.head;
      let ret = false;
      while (cur != null) {
        if (cur.elt == obj) {
          let old;
          let ret1;
          if (pre == null) {
            old = _this.head;
            ret1 = old.next;
            _this.head = ret1;
            if (_this.head == null) {
              _this.pushmod = true;
            }
          } else {
            old = pre.next;
            ret1 = old.next;
            pre.next = ret1;
            if (ret1 == null) {
              _this.pushmod = true;
            }
          }
          let o = old;
          o.elt = null;
          o.next = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
          ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = o;
          _this.modified = true;
          _this.length--;
          _this.pushmod = true;
          ret = true;
          break;
        }
        pre = cur;
        cur = cur.next;
      }
      let _this1 = this.pairs.n2.shape.pairs;
      let obj1 = this.pairs;
      let pre1 = null;
      let cur1 = _this1.head;
      let ret2 = false;
      while (cur1 != null) {
        if (cur1.elt == obj1) {
          let old1;
          let ret3;
          if (pre1 == null) {
            old1 = _this1.head;
            ret3 = old1.next;
            _this1.head = ret3;
            if (_this1.head == null) {
              _this1.pushmod = true;
            }
          } else {
            old1 = pre1.next;
            ret3 = old1.next;
            pre1.next = ret3;
            if (ret3 == null) {
              _this1.pushmod = true;
            }
          }
          let o1 = old1;
          o1.elt = null;
          o1.next = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool;
          ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBPair.zpp_pool = o1;
          _this1.modified = true;
          _this1.length--;
          _this1.pushmod = true;
          ret2 = true;
          break;
        }
        pre1 = cur1;
        cur1 = cur1.next;
      }
      let o2 = this.pairs;
      o2.n1 = o2.n2 = null;
      o2.sleeping = false;
      o2.next = ZPP_AABBPair.zpp_pool;
      ZPP_AABBPair.zpp_pool = o2;
      this.pairs = nxt;
    }
    this.dtree.clear();
    this.stree.clear();
  }

  // ========== shapesUnderPoint ==========

  shapesUnderPoint(x: Any, y: Any, filter: Any, output: Any): Any {
    this.sync_broadphase();
    let ret;
    if (ZPP_Vec2.zpp_pool == null) {
      ret = new ZPP_Vec2();
    } else {
      ret = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.weak = false;
    ret._immutable = false;
    ret.x = x;
    ret.y = y;
    let v = ret;
    let ret1 = output == null ? new (ZPP_DynAABBPhase._nape.shape.ShapeList)() : output;
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        let node = this.treeStack.pop_unsafe();
        let _this = node.aabb;
        if (
          v.x >= _this.minx &&
          v.x <= _this.maxx &&
          v.y >= _this.miny &&
          v.y <= _this.maxy
        ) {
          if (node.child1 == null) {
            let tmp;
            if (filter != null) {
              let _this1 = node.shape.filter;
              tmp =
                (_this1.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this1.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              if (node.shape.type == 0) {
                if (
                  ZPP_Collide.circleContains(node.shape.circle, v)
                ) {
                  ret1.push(node.shape.outer);
                }
              } else if (
                ZPP_Collide.polyContains(node.shape.polygon, v)
              ) {
                ret1.push(node.shape.outer);
              }
            }
          } else {
            if (node.child1 != null) {
              this.treeStack.add(node.child1);
            }
            if (node.child2 != null) {
              this.treeStack.add(node.child2);
            }
          }
        }
      }
    }
    if (this.dtree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        let node1 = this.treeStack.pop_unsafe();
        let _this2 = node1.aabb;
        if (
          v.x >= _this2.minx &&
          v.x <= _this2.maxx &&
          v.y >= _this2.miny &&
          v.y <= _this2.maxy
        ) {
          if (node1.child1 == null) {
            let tmp1;
            if (filter != null) {
              let _this3 = node1.shape.filter;
              tmp1 =
                (_this3.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this3.collisionGroup) != 0;
            } else {
              tmp1 = true;
            }
            if (tmp1) {
              if (node1.shape.type == 0) {
                if (
                  ZPP_Collide.circleContains(
                    node1.shape.circle,
                    v
                  )
                ) {
                  ret1.push(node1.shape.outer);
                }
              } else if (
                ZPP_Collide.polyContains(node1.shape.polygon, v)
              ) {
                ret1.push(node1.shape.outer);
              }
            }
          } else {
            if (node1.child1 != null) {
              this.treeStack.add(node1.child1);
            }
            if (node1.child2 != null) {
              this.treeStack.add(node1.child2);
            }
          }
        }
      }
    }
    let o = v;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o._isimmutable = null;
    o._validate = null;
    o._invalidate = null;
    o.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = o;
    return ret1;
  }

  // ========== bodiesUnderPoint ==========

  bodiesUnderPoint(x: Any, y: Any, filter: Any, output: Any): Any {
    this.sync_broadphase();
    let ret;
    if (ZPP_Vec2.zpp_pool == null) {
      ret = new ZPP_Vec2();
    } else {
      ret = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.weak = false;
    ret._immutable = false;
    ret.x = x;
    ret.y = y;
    let v = ret;
    let ret1 = output == null ? new (ZPP_DynAABBPhase._nape.phys.BodyList)() : output;
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        let node = this.treeStack.pop_unsafe();
        let _this = node.aabb;
        if (
          v.x >= _this.minx &&
          v.x <= _this.maxx &&
          v.y >= _this.miny &&
          v.y <= _this.maxy
        ) {
          if (node.child1 == null) {
            let body = node.shape.body.outer;
            if (!ret1.has(body)) {
              let tmp;
              if (filter != null) {
                let _this1 = node.shape.filter;
                tmp =
                  (_this1.collisionMask & filter.collisionGroup) != 0 &&
                  (filter.collisionMask & _this1.collisionGroup) != 0;
              } else {
                tmp = true;
              }
              if (tmp) {
                if (node.shape.type == 0) {
                  if (
                    ZPP_Collide.circleContains(
                      node.shape.circle,
                      v
                    )
                  ) {
                    ret1.push(body);
                  }
                } else if (
                  ZPP_Collide.polyContains(node.shape.polygon, v)
                ) {
                  ret1.push(body);
                }
              }
            }
          } else {
            if (node.child1 != null) {
              this.treeStack.add(node.child1);
            }
            if (node.child2 != null) {
              this.treeStack.add(node.child2);
            }
          }
        }
      }
    }
    if (this.dtree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        let node1 = this.treeStack.pop_unsafe();
        let _this2 = node1.aabb;
        if (
          v.x >= _this2.minx &&
          v.x <= _this2.maxx &&
          v.y >= _this2.miny &&
          v.y <= _this2.maxy
        ) {
          if (node1.child1 == null) {
            let body1 = node1.shape.body.outer;
            if (!ret1.has(body1)) {
              let tmp1;
              if (filter != null) {
                let _this3 = node1.shape.filter;
                tmp1 =
                  (_this3.collisionMask & filter.collisionGroup) != 0 &&
                  (filter.collisionMask & _this3.collisionGroup) != 0;
              } else {
                tmp1 = true;
              }
              if (tmp1) {
                if (node1.shape.type == 0) {
                  if (
                    ZPP_Collide.circleContains(
                      node1.shape.circle,
                      v
                    )
                  ) {
                    ret1.push(body1);
                  }
                } else if (
                  ZPP_Collide.polyContains(node1.shape.polygon, v)
                ) {
                  ret1.push(body1);
                }
              }
            }
          } else {
            if (node1.child1 != null) {
              this.treeStack.add(node1.child1);
            }
            if (node1.child2 != null) {
              this.treeStack.add(node1.child2);
            }
          }
        }
      }
    }
    let o = v;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o._isimmutable = null;
    o._validate = null;
    o._invalidate = null;
    o.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = o;
    return ret1;
  }

  // ========== shapesInAABB ==========

  shapesInAABB(aabb: Any, strict: Any, containment: Any, filter: Any, output: Any): Any {
    this.sync_broadphase();
    this.updateAABBShape(aabb);
    let ab = this.aabbShape.zpp_inner.aabb;
    let ret = output == null ? new (ZPP_DynAABBPhase._nape.shape.ShapeList)() : output;
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        let node = this.treeStack.pop_unsafe();
        let x = node.aabb;
        if (
          x.minx >= ab.minx &&
          x.miny >= ab.miny &&
          x.maxx <= ab.maxx &&
          x.maxy <= ab.maxy
        ) {
          if (node.child1 == null) {
            let tmp;
            if (filter != null) {
              let _this = node.shape.filter;
              tmp =
                (_this.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              ret.push(node.shape.outer);
            }
          } else {
            if (this.treeStack2 == null) {
              this.treeStack2 = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
            }
            this.treeStack2.add(node);
            while (this.treeStack2.head != null) {
              let node1 = this.treeStack2.pop_unsafe();
              if (node1.child1 == null) {
                let tmp1;
                if (filter != null) {
                  let _this1 = node1.shape.filter;
                  tmp1 =
                    (_this1.collisionMask & filter.collisionGroup) != 0 &&
                    (filter.collisionMask & _this1.collisionGroup) != 0;
                } else {
                  tmp1 = true;
                }
                if (tmp1) {
                  ret.push(node1.shape.outer);
                }
              } else {
                if (node1.child1 != null) {
                  this.treeStack2.add(node1.child1);
                }
                if (node1.child2 != null) {
                  this.treeStack2.add(node1.child2);
                }
              }
            }
          }
        } else {
          let _this2 = node.aabb;
          if (
            ab.miny <= _this2.maxy &&
            _this2.miny <= ab.maxy &&
            ab.minx <= _this2.maxx &&
            _this2.minx <= ab.maxx
          ) {
            if (node.child1 == null) {
              let tmp2;
              if (filter != null) {
                let _this3 = node.shape.filter;
                tmp2 =
                  (_this3.collisionMask & filter.collisionGroup) != 0 &&
                  (filter.collisionMask & _this3.collisionGroup) != 0;
              } else {
                tmp2 = true;
              }
              if (tmp2) {
                if (strict) {
                  if (containment) {
                    if (
                      ZPP_Collide.containTest(
                        this.aabbShape.zpp_inner,
                        node.shape
                      )
                    ) {
                      ret.push(node.shape.outer);
                    }
                  } else {
                    let x1 = node.shape.aabb;
                    if (
                      x1.minx >= ab.minx &&
                      x1.miny >= ab.miny &&
                      x1.maxx <= ab.maxx &&
                      x1.maxy <= ab.maxy
                    ) {
                      ret.push(node.shape.outer);
                    } else if (
                      ZPP_Collide.testCollide_safe(
                        node.shape,
                        this.aabbShape.zpp_inner
                      )
                    ) {
                      ret.push(node.shape.outer);
                    }
                  }
                } else {
                  let tmp3;
                  if (!!containment) {
                    let x2 = node.shape.aabb;
                    tmp3 =
                      x2.minx >= ab.minx &&
                      x2.miny >= ab.miny &&
                      x2.maxx <= ab.maxx &&
                      x2.maxy <= ab.maxy;
                  } else {
                    tmp3 = true;
                  }
                  if (tmp3) {
                    ret.push(node.shape.outer);
                  }
                }
              }
            } else {
              if (node.child1 != null) {
                this.treeStack.add(node.child1);
              }
              if (node.child2 != null) {
                this.treeStack.add(node.child2);
              }
            }
          }
        }
      }
    }
    if (this.dtree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        let node2 = this.treeStack.pop_unsafe();
        let x3 = node2.aabb;
        if (
          x3.minx >= ab.minx &&
          x3.miny >= ab.miny &&
          x3.maxx <= ab.maxx &&
          x3.maxy <= ab.maxy
        ) {
          if (node2.child1 == null) {
            let tmp4;
            if (filter != null) {
              let _this4 = node2.shape.filter;
              tmp4 =
                (_this4.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this4.collisionGroup) != 0;
            } else {
              tmp4 = true;
            }
            if (tmp4) {
              ret.push(node2.shape.outer);
            }
          } else {
            if (this.treeStack2 == null) {
              this.treeStack2 = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
            }
            this.treeStack2.add(node2);
            while (this.treeStack2.head != null) {
              let node3 = this.treeStack2.pop_unsafe();
              if (node3.child1 == null) {
                let tmp5;
                if (filter != null) {
                  let _this5 = node3.shape.filter;
                  tmp5 =
                    (_this5.collisionMask & filter.collisionGroup) != 0 &&
                    (filter.collisionMask & _this5.collisionGroup) != 0;
                } else {
                  tmp5 = true;
                }
                if (tmp5) {
                  ret.push(node3.shape.outer);
                }
              } else {
                if (node3.child1 != null) {
                  this.treeStack2.add(node3.child1);
                }
                if (node3.child2 != null) {
                  this.treeStack2.add(node3.child2);
                }
              }
            }
          }
        } else {
          let _this6 = node2.aabb;
          if (
            ab.miny <= _this6.maxy &&
            _this6.miny <= ab.maxy &&
            ab.minx <= _this6.maxx &&
            _this6.minx <= ab.maxx
          ) {
            if (node2.child1 == null) {
              let tmp6;
              if (filter != null) {
                let _this7 = node2.shape.filter;
                tmp6 =
                  (_this7.collisionMask & filter.collisionGroup) != 0 &&
                  (filter.collisionMask & _this7.collisionGroup) != 0;
              } else {
                tmp6 = true;
              }
              if (tmp6) {
                if (strict) {
                  if (containment) {
                    if (
                      ZPP_Collide.containTest(
                        this.aabbShape.zpp_inner,
                        node2.shape
                      )
                    ) {
                      ret.push(node2.shape.outer);
                    }
                  } else {
                    let x4 = node2.shape.aabb;
                    if (
                      x4.minx >= ab.minx &&
                      x4.miny >= ab.miny &&
                      x4.maxx <= ab.maxx &&
                      x4.maxy <= ab.maxy
                    ) {
                      ret.push(node2.shape.outer);
                    } else if (
                      ZPP_Collide.testCollide_safe(
                        node2.shape,
                        this.aabbShape.zpp_inner
                      )
                    ) {
                      ret.push(node2.shape.outer);
                    }
                  }
                } else {
                  let tmp7;
                  if (!!containment) {
                    let x5 = node2.shape.aabb;
                    tmp7 =
                      x5.minx >= ab.minx &&
                      x5.miny >= ab.miny &&
                      x5.maxx <= ab.maxx &&
                      x5.maxy <= ab.maxy;
                  } else {
                    tmp7 = true;
                  }
                  if (tmp7) {
                    ret.push(node2.shape.outer);
                  }
                }
              }
            } else {
              if (node2.child1 != null) {
                this.treeStack.add(node2.child1);
              }
              if (node2.child2 != null) {
                this.treeStack.add(node2.child2);
              }
            }
          }
        }
      }
    }
    return ret;
  }

  // ========== bodiesInAABB ==========

  bodiesInAABB(aabb: Any, strict: Any, containment: Any, filter: Any, output: Any): Any {
    this.sync_broadphase();
    this.updateAABBShape(aabb);
    let ab = this.aabbShape.zpp_inner.aabb;
    let ret = output == null ? new (ZPP_DynAABBPhase._nape.phys.BodyList)() : output;
    if (this.failed == null) {
      this.failed = new (ZPP_DynAABBPhase._nape.phys.BodyList)();
    }
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        let node = this.treeStack.pop_unsafe();
        let x = node.aabb;
        if (
          x.minx >= ab.minx &&
          x.miny >= ab.miny &&
          x.maxx <= ab.maxx &&
          x.maxy <= ab.maxy
        ) {
          if (node.child1 == null) {
            let tmp;
            if (filter != null) {
              let _this = node.shape.filter;
              tmp =
                (_this.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              let body = node.shape.body.outer;
              if (!ret.has(body)) {
                ret.push(body);
              }
            }
          } else {
            if (this.treeStack2 == null) {
              this.treeStack2 = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
            }
            this.treeStack2.add(node);
            while (this.treeStack2.head != null) {
              let node1 = this.treeStack2.pop_unsafe();
              if (node1.child1 == null) {
                let tmp1;
                if (filter != null) {
                  let _this1 = node1.shape.filter;
                  tmp1 =
                    (_this1.collisionMask & filter.collisionGroup) != 0 &&
                    (filter.collisionMask & _this1.collisionGroup) != 0;
                } else {
                  tmp1 = true;
                }
                if (tmp1) {
                  let body1 = node1.shape.body.outer;
                  if (!ret.has(body1)) {
                    ret.push(body1);
                  }
                }
              } else {
                if (node1.child1 != null) {
                  this.treeStack2.add(node1.child1);
                }
                if (node1.child2 != null) {
                  this.treeStack2.add(node1.child2);
                }
              }
            }
          }
        } else {
          let _this2 = node.aabb;
          if (
            ab.miny <= _this2.maxy &&
            _this2.miny <= ab.maxy &&
            ab.minx <= _this2.maxx &&
            _this2.minx <= ab.maxx
          ) {
            if (node.child1 == null) {
              let body2 = node.shape.body.outer;
              let tmp2;
              if (filter != null) {
                let _this3 = node.shape.filter;
                tmp2 =
                  (_this3.collisionMask & filter.collisionGroup) != 0 &&
                  (filter.collisionMask & _this3.collisionGroup) != 0;
              } else {
                tmp2 = true;
              }
              if (tmp2) {
                if (strict) {
                  if (containment) {
                    if (!this.failed.has(body2)) {
                      let col = ZPP_Collide.containTest(
                        this.aabbShape.zpp_inner,
                        node.shape
                      );
                      if (!ret.has(body2) && col) {
                        ret.push(body2);
                      } else if (!col) {
                        ret.remove(body2);
                        this.failed.push(body2);
                      }
                    }
                  } else if (
                    !ret.has(body2) &&
                    ZPP_Collide.testCollide_safe(
                      node.shape,
                      this.aabbShape.zpp_inner
                    )
                  ) {
                    ret.push(body2);
                  }
                } else if (containment) {
                  if (!this.failed.has(body2)) {
                    let x1 = node.shape.aabb;
                    let col1 =
                      x1.minx >= ab.minx &&
                      x1.miny >= ab.miny &&
                      x1.maxx <= ab.maxx &&
                      x1.maxy <= ab.maxy;
                    if (!ret.has(body2) && col1) {
                      ret.push(body2);
                    } else if (!col1) {
                      ret.remove(body2);
                      this.failed.push(body2);
                    }
                  }
                } else {
                  let tmp3;
                  if (!ret.has(body2)) {
                    let x2 = node.shape.aabb;
                    tmp3 =
                      x2.minx >= ab.minx &&
                      x2.miny >= ab.miny &&
                      x2.maxx <= ab.maxx &&
                      x2.maxy <= ab.maxy;
                  } else {
                    tmp3 = false;
                  }
                  if (tmp3) {
                    ret.push(body2);
                  }
                }
              }
            } else {
              if (node.child1 != null) {
                this.treeStack.add(node.child1);
              }
              if (node.child2 != null) {
                this.treeStack.add(node.child2);
              }
            }
          }
        }
      }
    }
    if (this.dtree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        let node2 = this.treeStack.pop_unsafe();
        let x3 = node2.aabb;
        if (
          x3.minx >= ab.minx &&
          x3.miny >= ab.miny &&
          x3.maxx <= ab.maxx &&
          x3.maxy <= ab.maxy
        ) {
          if (node2.child1 == null) {
            let tmp4;
            if (filter != null) {
              let _this4 = node2.shape.filter;
              tmp4 =
                (_this4.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this4.collisionGroup) != 0;
            } else {
              tmp4 = true;
            }
            if (tmp4) {
              let body3 = node2.shape.body.outer;
              if (!ret.has(body3)) {
                ret.push(body3);
              }
            }
          } else {
            if (this.treeStack2 == null) {
              this.treeStack2 = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
            }
            this.treeStack2.add(node2);
            while (this.treeStack2.head != null) {
              let node3 = this.treeStack2.pop_unsafe();
              if (node3.child1 == null) {
                let tmp5;
                if (filter != null) {
                  let _this5 = node3.shape.filter;
                  tmp5 =
                    (_this5.collisionMask & filter.collisionGroup) != 0 &&
                    (filter.collisionMask & _this5.collisionGroup) != 0;
                } else {
                  tmp5 = true;
                }
                if (tmp5) {
                  let body4 = node3.shape.body.outer;
                  if (!ret.has(body4)) {
                    ret.push(body4);
                  }
                }
              } else {
                if (node3.child1 != null) {
                  this.treeStack2.add(node3.child1);
                }
                if (node3.child2 != null) {
                  this.treeStack2.add(node3.child2);
                }
              }
            }
          }
        } else {
          let _this6 = node2.aabb;
          if (
            ab.miny <= _this6.maxy &&
            _this6.miny <= ab.maxy &&
            ab.minx <= _this6.maxx &&
            _this6.minx <= ab.maxx
          ) {
            if (node2.child1 == null) {
              let body5 = node2.shape.body.outer;
              let tmp6;
              if (filter != null) {
                let _this7 = node2.shape.filter;
                tmp6 =
                  (_this7.collisionMask & filter.collisionGroup) != 0 &&
                  (filter.collisionMask & _this7.collisionGroup) != 0;
              } else {
                tmp6 = true;
              }
              if (tmp6) {
                if (strict) {
                  if (containment) {
                    if (!this.failed.has(body5)) {
                      let col2 = ZPP_Collide.containTest(
                        this.aabbShape.zpp_inner,
                        node2.shape
                      );
                      if (!ret.has(body5) && col2) {
                        ret.push(body5);
                      } else if (!col2) {
                        ret.remove(body5);
                        this.failed.push(body5);
                      }
                    }
                  } else if (
                    !ret.has(body5) &&
                    ZPP_Collide.testCollide_safe(
                      node2.shape,
                      this.aabbShape.zpp_inner
                    )
                  ) {
                    ret.push(body5);
                  }
                } else if (containment) {
                  if (!this.failed.has(body5)) {
                    let x4 = node2.shape.aabb;
                    let col3 =
                      x4.minx >= ab.minx &&
                      x4.miny >= ab.miny &&
                      x4.maxx <= ab.maxx &&
                      x4.maxy <= ab.maxy;
                    if (!ret.has(body5) && col3) {
                      ret.push(body5);
                    } else if (!col3) {
                      ret.remove(body5);
                      this.failed.push(body5);
                    }
                  }
                } else {
                  let tmp7;
                  if (!ret.has(body5)) {
                    let x5 = node2.shape.aabb;
                    tmp7 =
                      x5.minx >= ab.minx &&
                      x5.miny >= ab.miny &&
                      x5.maxx <= ab.maxx &&
                      x5.maxy <= ab.maxy;
                  } else {
                    tmp7 = false;
                  }
                  if (tmp7) {
                    ret.push(body5);
                  }
                }
              }
            } else {
              if (node2.child1 != null) {
                this.treeStack.add(node2.child1);
              }
              if (node2.child2 != null) {
                this.treeStack.add(node2.child2);
              }
            }
          }
        }
      }
    }
    this.failed.clear();
    return ret;
  }

  // ========== shapesInCircle ==========

  shapesInCircle(x: Any, y: Any, r: Any, containment: Any, filter: Any, output: Any): Any {
    this.sync_broadphase();
    this.updateCircShape(x, y, r);
    let ab = this.circShape.zpp_inner.aabb;
    let ret = output == null ? new (ZPP_DynAABBPhase._nape.shape.ShapeList)() : output;
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        let node = this.treeStack.pop_unsafe();
        let _this = node.aabb;
        if (
          ab.miny <= _this.maxy &&
          _this.miny <= ab.maxy &&
          ab.minx <= _this.maxx &&
          _this.minx <= ab.maxx
        ) {
          if (node.child1 == null) {
            let tmp;
            if (filter != null) {
              let _this1 = node.shape.filter;
              tmp =
                (_this1.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this1.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              if (containment) {
                if (
                  ZPP_Collide.containTest(
                    this.circShape.zpp_inner,
                    node.shape
                  )
                ) {
                  ret.push(node.shape.outer);
                }
              } else if (
                ZPP_Collide.testCollide_safe(
                  node.shape,
                  this.circShape.zpp_inner
                )
              ) {
                ret.push(node.shape.outer);
              }
            }
          } else {
            if (node.child1 != null) {
              this.treeStack.add(node.child1);
            }
            if (node.child2 != null) {
              this.treeStack.add(node.child2);
            }
          }
        }
      }
    }
    if (this.dtree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        let node1 = this.treeStack.pop_unsafe();
        let _this2 = node1.aabb;
        if (
          ab.miny <= _this2.maxy &&
          _this2.miny <= ab.maxy &&
          ab.minx <= _this2.maxx &&
          _this2.minx <= ab.maxx
        ) {
          if (node1.child1 == null) {
            let tmp1;
            if (filter != null) {
              let _this3 = node1.shape.filter;
              tmp1 =
                (_this3.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this3.collisionGroup) != 0;
            } else {
              tmp1 = true;
            }
            if (tmp1) {
              if (containment) {
                if (
                  ZPP_Collide.containTest(
                    this.circShape.zpp_inner,
                    node1.shape
                  )
                ) {
                  ret.push(node1.shape.outer);
                }
              } else if (
                ZPP_Collide.testCollide_safe(
                  node1.shape,
                  this.circShape.zpp_inner
                )
              ) {
                ret.push(node1.shape.outer);
              }
            }
          } else {
            if (node1.child1 != null) {
              this.treeStack.add(node1.child1);
            }
            if (node1.child2 != null) {
              this.treeStack.add(node1.child2);
            }
          }
        }
      }
    }
    return ret;
  }

  // ========== bodiesInCircle ==========

  bodiesInCircle(x: Any, y: Any, r: Any, containment: Any, filter: Any, output: Any): Any {
    this.sync_broadphase();
    this.updateCircShape(x, y, r);
    let ab = this.circShape.zpp_inner.aabb;
    let ret = output == null ? new (ZPP_DynAABBPhase._nape.phys.BodyList)() : output;
    if (this.failed == null) {
      this.failed = new (ZPP_DynAABBPhase._nape.phys.BodyList)();
    }
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        let node = this.treeStack.pop_unsafe();
        let _this = node.aabb;
        if (
          ab.miny <= _this.maxy &&
          _this.miny <= ab.maxy &&
          ab.minx <= _this.maxx &&
          _this.minx <= ab.maxx
        ) {
          if (node.child1 == null) {
            let body = node.shape.body.outer;
            let tmp;
            if (filter != null) {
              let _this1 = node.shape.filter;
              tmp =
                (_this1.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this1.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              if (containment) {
                if (!this.failed.has(body)) {
                  let col = ZPP_Collide.containTest(
                    this.circShape.zpp_inner,
                    node.shape
                  );
                  if (!ret.has(body) && col) {
                    ret.push(body);
                  } else if (!col) {
                    ret.remove(body);
                    this.failed.push(body);
                  }
                }
              } else if (
                !ret.has(body) &&
                ZPP_Collide.testCollide_safe(
                  node.shape,
                  this.circShape.zpp_inner
                )
              ) {
                ret.push(body);
              }
            }
          } else {
            if (node.child1 != null) {
              this.treeStack.add(node.child1);
            }
            if (node.child2 != null) {
              this.treeStack.add(node.child2);
            }
          }
        }
      }
    }
    if (this.dtree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        let node1 = this.treeStack.pop_unsafe();
        let _this2 = node1.aabb;
        if (
          ab.miny <= _this2.maxy &&
          _this2.miny <= ab.maxy &&
          ab.minx <= _this2.maxx &&
          _this2.minx <= ab.maxx
        ) {
          if (node1.child1 == null) {
            let body1 = node1.shape.body.outer;
            let tmp1;
            if (filter != null) {
              let _this3 = node1.shape.filter;
              tmp1 =
                (_this3.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this3.collisionGroup) != 0;
            } else {
              tmp1 = true;
            }
            if (tmp1) {
              if (containment) {
                if (!this.failed.has(body1)) {
                  let col1 = ZPP_Collide.containTest(
                    this.circShape.zpp_inner,
                    node1.shape
                  );
                  if (!ret.has(body1) && col1) {
                    ret.push(body1);
                  } else if (!col1) {
                    ret.remove(body1);
                    this.failed.push(body1);
                  }
                }
              } else if (
                !ret.has(body1) &&
                ZPP_Collide.testCollide_safe(
                  node1.shape,
                  this.circShape.zpp_inner
                )
              ) {
                ret.push(body1);
              }
            }
          } else {
            if (node1.child1 != null) {
              this.treeStack.add(node1.child1);
            }
            if (node1.child2 != null) {
              this.treeStack.add(node1.child2);
            }
          }
        }
      }
    }
    this.failed.clear();
    return ret;
  }

  // ========== shapesInShape ==========

  shapesInShape(shp: Any, containment: Any, filter: Any, output: Any): Any {
    this.sync_broadphase();
    this.validateShape(shp);
    let ab = shp.aabb;
    let ret = output == null ? new (ZPP_DynAABBPhase._nape.shape.ShapeList)() : output;
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        let node = this.treeStack.pop_unsafe();
        let _this = node.aabb;
        if (
          ab.miny <= _this.maxy &&
          _this.miny <= ab.maxy &&
          ab.minx <= _this.maxx &&
          _this.minx <= ab.maxx
        ) {
          if (node.child1 == null) {
            let tmp;
            if (filter != null) {
              let _this1 = node.shape.filter;
              tmp =
                (_this1.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this1.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              if (containment) {
                if (ZPP_Collide.containTest(shp, node.shape)) {
                  ret.push(node.shape.outer);
                }
              } else if (
                ZPP_Collide.testCollide_safe(node.shape, shp)
              ) {
                ret.push(node.shape.outer);
              }
            }
          } else {
            if (node.child1 != null) {
              this.treeStack.add(node.child1);
            }
            if (node.child2 != null) {
              this.treeStack.add(node.child2);
            }
          }
        }
      }
    }
    if (this.dtree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        let node1 = this.treeStack.pop_unsafe();
        let _this2 = node1.aabb;
        if (
          ab.miny <= _this2.maxy &&
          _this2.miny <= ab.maxy &&
          ab.minx <= _this2.maxx &&
          _this2.minx <= ab.maxx
        ) {
          if (node1.child1 == null) {
            let tmp1;
            if (filter != null) {
              let _this3 = node1.shape.filter;
              tmp1 =
                (_this3.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this3.collisionGroup) != 0;
            } else {
              tmp1 = true;
            }
            if (tmp1) {
              if (containment) {
                if (ZPP_Collide.containTest(shp, node1.shape)) {
                  ret.push(node1.shape.outer);
                }
              } else if (
                ZPP_Collide.testCollide_safe(node1.shape, shp)
              ) {
                ret.push(node1.shape.outer);
              }
            }
          } else {
            if (node1.child1 != null) {
              this.treeStack.add(node1.child1);
            }
            if (node1.child2 != null) {
              this.treeStack.add(node1.child2);
            }
          }
        }
      }
    }
    return ret;
  }

  // ========== bodiesInShape ==========

  bodiesInShape(shp: Any, containment: Any, filter: Any, output: Any): Any {
    this.sync_broadphase();
    this.validateShape(shp);
    let ab = shp.aabb;
    let ret = output == null ? new (ZPP_DynAABBPhase._nape.phys.BodyList)() : output;
    if (this.failed == null) {
      this.failed = new (ZPP_DynAABBPhase._nape.phys.BodyList)();
    }
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        let node = this.treeStack.pop_unsafe();
        let _this = node.aabb;
        if (
          ab.miny <= _this.maxy &&
          _this.miny <= ab.maxy &&
          ab.minx <= _this.maxx &&
          _this.minx <= ab.maxx
        ) {
          if (node.child1 == null) {
            let body = node.shape.body.outer;
            let tmp;
            if (filter != null) {
              let _this1 = node.shape.filter;
              tmp =
                (_this1.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this1.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              if (containment) {
                if (!this.failed.has(body)) {
                  let col = ZPP_Collide.containTest(
                    shp,
                    node.shape
                  );
                  if (!ret.has(body) && col) {
                    ret.push(body);
                  } else if (!col) {
                    ret.remove(body);
                    this.failed.push(body);
                  }
                }
              } else if (
                !ret.has(body) &&
                ZPP_Collide.testCollide_safe(node.shape, shp)
              ) {
                ret.push(body);
              }
            }
          } else {
            if (node.child1 != null) {
              this.treeStack.add(node.child1);
            }
            if (node.child2 != null) {
              this.treeStack.add(node.child2);
            }
          }
        }
      }
    }
    if (this.dtree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        let node1 = this.treeStack.pop_unsafe();
        let _this2 = node1.aabb;
        if (
          ab.miny <= _this2.maxy &&
          _this2.miny <= ab.maxy &&
          ab.minx <= _this2.maxx &&
          _this2.minx <= ab.maxx
        ) {
          if (node1.child1 == null) {
            let body1 = node1.shape.body.outer;
            let tmp1;
            if (filter != null) {
              let _this3 = node1.shape.filter;
              tmp1 =
                (_this3.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this3.collisionGroup) != 0;
            } else {
              tmp1 = true;
            }
            if (tmp1) {
              if (containment) {
                if (!this.failed.has(body1)) {
                  let col1 = ZPP_Collide.containTest(
                    shp,
                    node1.shape
                  );
                  if (!ret.has(body1) && col1) {
                    ret.push(body1);
                  } else if (!col1) {
                    ret.remove(body1);
                    this.failed.push(body1);
                  }
                }
              } else if (
                !ret.has(body1) &&
                ZPP_Collide.testCollide_safe(node1.shape, shp)
              ) {
                ret.push(body1);
              }
            }
          } else {
            if (node1.child1 != null) {
              this.treeStack.add(node1.child1);
            }
            if (node1.child2 != null) {
              this.treeStack.add(node1.child2);
            }
          }
        }
      }
    }
    this.failed.clear();
    return ret;
  }

  // ========== rayCast ==========

  rayCast(ray: Any, inner: Any, filter: Any): Any {
    if (this.openlist == null) {
      this.openlist = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
    }
    this.sync_broadphase();
    ray.validate_dir();
    let mint = ray.maxdist;
    if (this.dtree.root != null) {
      if (ray.aabbtest(this.dtree.root.aabb)) {
        let t = ray.aabbsect(this.dtree.root.aabb);
        if (t >= 0 && t < mint) {
          this.dtree.root.rayt = t;
          let pre = null;
          let cx_ite = this.openlist.head;
          while (cx_ite != null) {
            let j = cx_ite.elt;
            if (this.dtree.root.rayt < j.rayt) {
              break;
            }
            pre = cx_ite;
            cx_ite = cx_ite.next;
          }
          let _this = this.openlist;
          let o = this.dtree.root;
          let ret;
          if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool == null) {
            ret = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode)();
          } else {
            ret = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool;
            ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool = ret.next;
            ret.next = null;
          }
          ret.elt = o;
          let temp = ret;
          if (pre == null) {
            temp.next = _this.head;
            _this.head = temp;
          } else {
            temp.next = pre.next;
            pre.next = temp;
          }
          _this.pushmod = _this.modified = true;
          _this.length++;
        }
      }
    }
    if (this.stree.root != null) {
      if (ray.aabbtest(this.stree.root.aabb)) {
        let t1 = ray.aabbsect(this.stree.root.aabb);
        if (t1 >= 0 && t1 < mint) {
          this.stree.root.rayt = t1;
          let pre1 = null;
          let cx_ite1 = this.openlist.head;
          while (cx_ite1 != null) {
            let j1 = cx_ite1.elt;
            if (this.stree.root.rayt < j1.rayt) {
              break;
            }
            pre1 = cx_ite1;
            cx_ite1 = cx_ite1.next;
          }
          let _this1 = this.openlist;
          let o1 = this.stree.root;
          let ret1;
          if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool == null) {
            ret1 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode)();
          } else {
            ret1 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool;
            ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool = ret1.next;
            ret1.next = null;
          }
          ret1.elt = o1;
          let temp1 = ret1;
          if (pre1 == null) {
            temp1.next = _this1.head;
            _this1.head = temp1;
          } else {
            temp1.next = pre1.next;
            pre1.next = temp1;
          }
          _this1.pushmod = _this1.modified = true;
          _this1.length++;
        }
      }
    }
    let minres = null;
    while (this.openlist.head != null) {
      let cnode = this.openlist.pop_unsafe();
      if (cnode.rayt >= mint) {
        break;
      }
      if (cnode.child1 == null) {
        let shape = cnode.shape;
        let tmp;
        if (filter != null) {
          let _this2 = shape.filter;
          tmp =
            (_this2.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this2.collisionGroup) != 0;
        } else {
          tmp = true;
        }
        if (tmp) {
          let result =
            shape.type == 0
              ? ray.circlesect(shape.circle, inner, mint)
              : ray.aabbtest(shape.aabb)
              ? ray.polysect(shape.polygon, inner, mint)
              : null;
          if (result != null) {
            if (result.zpp_inner.next != null) {
              throw new Error(
                "Error: This object has been disposed of and cannot be used"
              );
            }
            mint = result.zpp_inner.toiDistance;
            if (minres != null) {
              if (minres.zpp_inner.next != null) {
                throw new Error(
                  "Error: This object has been disposed of and cannot be used"
                );
              }
              minres.zpp_inner.free();
            }
            minres = result;
          }
        }
      } else {
        if (cnode.child1 != null) {
          if (ray.aabbtest(cnode.child1.aabb)) {
            let t2 = ray.aabbsect(cnode.child1.aabb);
            if (t2 >= 0 && t2 < mint) {
              cnode.child1.rayt = t2;
              let pre2 = null;
              let cx_ite2 = this.openlist.head;
              while (cx_ite2 != null) {
                let j2 = cx_ite2.elt;
                if (cnode.child1.rayt < j2.rayt) {
                  break;
                }
                pre2 = cx_ite2;
                cx_ite2 = cx_ite2.next;
              }
              let _this3 = this.openlist;
              let o2 = cnode.child1;
              let ret2;
              if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool == null) {
                ret2 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode)();
              } else {
                ret2 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool;
                ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool = ret2.next;
                ret2.next = null;
              }
              ret2.elt = o2;
              let temp2 = ret2;
              if (pre2 == null) {
                temp2.next = _this3.head;
                _this3.head = temp2;
              } else {
                temp2.next = pre2.next;
                pre2.next = temp2;
              }
              _this3.pushmod = _this3.modified = true;
              _this3.length++;
            }
          }
        }
        if (cnode.child2 != null) {
          if (ray.aabbtest(cnode.child2.aabb)) {
            let t3 = ray.aabbsect(cnode.child2.aabb);
            if (t3 >= 0 && t3 < mint) {
              cnode.child2.rayt = t3;
              let pre3 = null;
              let cx_ite3 = this.openlist.head;
              while (cx_ite3 != null) {
                let j3 = cx_ite3.elt;
                if (cnode.child2.rayt < j3.rayt) {
                  break;
                }
                pre3 = cx_ite3;
                cx_ite3 = cx_ite3.next;
              }
              let _this4 = this.openlist;
              let o3 = cnode.child2;
              let ret3;
              if (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool == null) {
                ret3 = new (ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode)();
              } else {
                ret3 = ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool;
                ZPP_DynAABBPhase._zpp.util.ZNPNode_ZPP_AABBNode.zpp_pool = ret3.next;
                ret3.next = null;
              }
              ret3.elt = o3;
              let temp3 = ret3;
              if (pre3 == null) {
                temp3.next = _this4.head;
                _this4.head = temp3;
              } else {
                temp3.next = pre3.next;
                pre3.next = temp3;
              }
              _this4.pushmod = _this4.modified = true;
              _this4.length++;
            }
          }
        }
      }
    }
    this.openlist.clear();
    return minres;
  }

  // ========== rayMultiCast ==========

  rayMultiCast(ray: Any, inner: Any, filter: Any, output: Any): Any {
    if (this.openlist == null) {
      this.openlist = new (ZPP_DynAABBPhase._zpp.util.ZNPList_ZPP_AABBNode)();
    }
    this.sync_broadphase();
    ray.validate_dir();
    let inf = ray.maxdist >= Infinity;
    let ret = output == null ? new (ZPP_DynAABBPhase._nape.geom.RayResultList)() : output;
    if (this.dtree.root != null) {
      if (ray.aabbtest(this.dtree.root.aabb)) {
        if (inf) {
          this.openlist.add(this.dtree.root);
        } else {
          let t = ray.aabbsect(this.dtree.root.aabb);
          if (t >= 0 && t < ray.maxdist) {
            this.openlist.add(this.dtree.root);
          }
        }
      }
    }
    if (this.stree.root != null) {
      if (ray.aabbtest(this.stree.root.aabb)) {
        if (inf) {
          this.openlist.add(this.stree.root);
        } else {
          let t1 = ray.aabbsect(this.stree.root.aabb);
          if (t1 >= 0 && t1 < ray.maxdist) {
            this.openlist.add(this.stree.root);
          }
        }
      }
    }
    while (this.openlist.head != null) {
      let cnode = this.openlist.pop_unsafe();
      if (cnode.child1 == null) {
        let shape = cnode.shape;
        let tmp;
        if (filter != null) {
          let _this = shape.filter;
          tmp =
            (_this.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this.collisionGroup) != 0;
        } else {
          tmp = true;
        }
        if (tmp) {
          if (shape.type == 0) {
            ray.circlesect2(shape.circle, inner, ret);
          } else if (ray.aabbtest(shape.aabb)) {
            ray.polysect2(shape.polygon, inner, ret);
          }
        }
      } else {
        if (cnode.child1 != null) {
          if (ray.aabbtest(cnode.child1.aabb)) {
            if (inf) {
              this.openlist.add(cnode.child1);
            } else {
              let t2 = ray.aabbsect(cnode.child1.aabb);
              if (t2 >= 0 && t2 < ray.maxdist) {
                this.openlist.add(cnode.child1);
              }
            }
          }
        }
        if (cnode.child2 != null) {
          if (ray.aabbtest(cnode.child2.aabb)) {
            if (inf) {
              this.openlist.add(cnode.child2);
            } else {
              let t3 = ray.aabbsect(cnode.child2.aabb);
              if (t3 >= 0 && t3 < ray.maxdist) {
                this.openlist.add(cnode.child2);
              }
            }
          }
        }
      }
    }
    this.openlist.clear();
    return ret;
  }
}