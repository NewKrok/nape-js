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
import {
  ZNPList_ZPP_AABBNode,
  ZNPNode_ZPP_AABBNode,
  ZNPNode_ZPP_AABBPair,
} from "../util/ZNPRegistry";

export class ZPP_DynAABBPhase extends ZPP_Broadphase {
  // --- Static: namespace references ---
  static _zpp: any = null;
  static _nape: any = null;

  // --- Static: constants ---
  static FATTEN = 3.0;
  static VEL_STEPS = 2.0;

  // --- Instance fields ---
  stree: ZPP_AABBTree;
  dtree: ZPP_AABBTree;
  pairs: ZPP_AABBPair | null = null;
  /** HashMap for O(1) pair lookups by canonical shape ID pair. */
  pairMap: Map<number, ZPP_AABBPair> = new Map();
  syncs: ZPP_AABBNode | null = null;
  moves: ZPP_AABBNode | null = null;
  treeStack: any = null;
  treeStack2: any = null;
  failed: any = null;
  openlist: any = null;

  constructor(space: any) {
    super();
    this.space = space;
    this.is_sweep = false;
    this.dynab = this;
    this.stree = new ZPP_AABBTree();
    this.dtree = new ZPP_AABBTree();
  }

  /** Prepend a pair to the global doubly-linked pairs list. */
  private _linkPair(p: ZPP_AABBPair): void {
    p.gprev = null;
    p.next = this.pairs;
    if (this.pairs != null) this.pairs.gprev = p;
    this.pairs = p;
  }

  /**
   * Compute a unique numeric key for a canonical (id, di) pair where id < di.
   * Uses Szudzik's pairing function: since id < di always, key = di * di + id.
   */
  private static _pairKey(id: number, di: number): number {
    return di * di + id;
  }

  /** Unlink a pair from the global doubly-linked pairs list. */
  private _unlinkPair(p: ZPP_AABBPair): void {
    if (p.gprev != null) {
      p.gprev.next = p.next;
    } else {
      this.pairs = p.next;
    }
    if (p.next != null) {
      p.next.gprev = p.gprev;
    }
    p.gprev = null;
    p.next = null;
  }

  // ========== dyn ==========

  dyn(shape: any): boolean {
    if (shape.body.type == 1) {
      return false;
    } else {
      return !shape.body.component.sleeping;
    }
  }

  // ========== __insert ==========

  __insert(shape: any): void {
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

  __remove(shape: any): void {
    const node = shape.node;
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
        this.syncs = cur!.snext;
      } else {
        pre.snext = cur!.snext;
      }
      cur!.snext = null;
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
        this.moves = cur1!.mnext;
      } else {
        pre1.mnext = cur1!.mnext;
      }
      cur1!.mnext = null;
      node.moved = false;
    }
    while (shape.pairs.head != null) {
      const pair = shape.pairs.pop_unsafe();
      if (!pair.sleeping) {
        this._unlinkPair(pair);
      }
      if (pair.n1 == node) {
        pair.n2.shape.pairs.remove(pair);
      } else {
        pair.n1.shape.pairs.remove(pair);
      }
      this.pairMap.delete(ZPP_DynAABBPhase._pairKey(pair.id, pair.di));
      if (pair.arb != null) {
        pair.arb.pair = null;
      }
      pair.arb = null;
      pair.n1 = pair.n2 = null;
      pair.sleeping = false;
      pair.gprev = null;
      pair.next = ZPP_AABBPair.zpp_pool;
      ZPP_AABBPair.zpp_pool = pair;
    }
    const o2 = node;
    o2.height = -1;
    const o3 = o2.aabb;
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

  __sync(shape: any): void {
    const node = shape.node;
    if (!node.synced) {
      if (!this.space.continuous) {
        if (shape.zip_aabb) {
          if (shape.body != null) {
            shape.zip_aabb = false;
            if (shape.type == 0) {
              const _this = shape.circle;
              if (_this.zip_worldCOM) {
                if (_this.body != null) {
                  _this.zip_worldCOM = false;
                  if (_this.zip_localCOM) {
                    _this.zip_localCOM = false;
                    if (_this.type == 1) {
                      const _this1 = _this.polygon;
                      if (_this1.lverts.next == null) {
                        throw new Error("An empty polygon has no meaningful localCOM");
                      }
                      if (_this1.lverts.next.next == null) {
                        _this1.localCOMx = _this1.lverts.next.x;
                        _this1.localCOMy = _this1.lverts.next.y;
                      } else if (_this1.lverts.next.next.next == null) {
                        _this1.localCOMx = _this1.lverts.next.x;
                        _this1.localCOMy = _this1.lverts.next.y;
                        const t = 1.0;
                        _this1.localCOMx += _this1.lverts.next.next.x * t;
                        _this1.localCOMy += _this1.lverts.next.next.y * t;
                        const t1 = 0.5;
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
                          const w = cx_ite;
                          area += v.x * (w.y - u.y);
                          const cf = w.y * v.x - w.x * v.y;
                          _this1.localCOMx += (v.x + w.x) * cf;
                          _this1.localCOMy += (v.y + w.y) * cf;
                          u = v;
                          v = w;
                          cx_ite = cx_ite.next;
                        }
                        cx_ite = _this1.lverts.next;
                        const w1 = cx_ite;
                        area += v.x * (w1.y - u.y);
                        const cf1 = w1.y * v.x - w1.x * v.y;
                        _this1.localCOMx += (v.x + w1.x) * cf1;
                        _this1.localCOMy += (v.y + w1.y) * cf1;
                        u = v;
                        v = w1;
                        cx_ite = cx_ite.next;
                        const w2 = cx_ite;
                        area += v.x * (w2.y - u.y);
                        const cf2 = w2.y * v.x - w2.x * v.y;
                        _this1.localCOMx += (v.x + w2.x) * cf2;
                        _this1.localCOMy += (v.y + w2.y) * cf2;
                        area = 1 / (3 * area);
                        const t2 = area;
                        _this1.localCOMx *= t2;
                        _this1.localCOMy *= t2;
                      }
                    }
                    if (_this.wrap_localCOM != null) {
                      _this.wrap_localCOM.zpp_inner.x = _this.localCOMx;
                      _this.wrap_localCOM.zpp_inner.y = _this.localCOMy;
                    }
                  }
                  const _this2 = _this.body;
                  if (_this2.zip_axis) {
                    _this2.zip_axis = false;
                    _this2.axisx = Math.sin(_this2.rot);
                    _this2.axisy = Math.cos(_this2.rot);
                  }
                  _this.worldCOMx =
                    _this.body.posx +
                    (_this.body.axisy * _this.localCOMx - _this.body.axisx * _this.localCOMy);
                  _this.worldCOMy =
                    _this.body.posy +
                    (_this.localCOMx * _this.body.axisx + _this.localCOMy * _this.body.axisy);
                }
              }
              const rx = _this.radius;
              const ry = _this.radius;
              _this.aabb.minx = _this.worldCOMx - rx;
              _this.aabb.miny = _this.worldCOMy - ry;
              _this.aabb.maxx = _this.worldCOMx + rx;
              _this.aabb.maxy = _this.worldCOMy + ry;
            } else {
              const _this3 = shape.polygon;
              if (_this3.zip_gverts) {
                if (_this3.body != null) {
                  _this3.zip_gverts = false;
                  _this3.validate_lverts();
                  const _this4 = _this3.body;
                  if (_this4.zip_axis) {
                    _this4.zip_axis = false;
                    _this4.axisx = Math.sin(_this4.rot);
                    _this4.axisy = Math.cos(_this4.rot);
                  }
                  let li = _this3.lverts.next;
                  let cx_ite1 = _this3.gverts.next;
                  while (cx_ite1 != null) {
                    const g = cx_ite1;
                    const l = li;
                    li = li.next;
                    g.x = _this3.body.posx + (_this3.body.axisy * l.x - _this3.body.axisx * l.y);
                    g.y = _this3.body.posy + (l.x * _this3.body.axisx + l.y * _this3.body.axisy);
                    cx_ite1 = cx_ite1.next;
                  }
                }
              }
              if (_this3.lverts.next == null) {
                throw new Error("An empty polygon has no meaningful bounds");
              }
              const p0 = _this3.gverts.next;
              _this3.aabb.minx = p0.x;
              _this3.aabb.miny = p0.y;
              _this3.aabb.maxx = p0.x;
              _this3.aabb.maxy = p0.y;
              let cx_ite2 = _this3.gverts.next.next;
              while (cx_ite2 != null) {
                const p = cx_ite2;
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
      if (node.dyn == (shape.body.type == 1 ? false : !shape.body.component.sleeping)) {
        const _this5 = node.aabb;
        const x = shape.aabb;
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

  sync_broadphase(): void {
    this.space.validation();
    if (this.syncs == null) {
      return;
    }
    if (this.moves == null) {
      // Fast path: the whole syncs list becomes the moves list, preserving order.
      let node: ZPP_AABBNode | null = this.syncs;
      while (node != null) {
        this._syncLeaf(node);
        node.synced = false;
        node.moved = true;
        node.mnext = node.snext;
        node.snext = null;
        node = node.mnext;
      }
      this.moves = this.syncs;
      this.syncs = null;
    } else {
      while (this.syncs != null) {
        const node: ZPP_AABBNode = this.syncs;
        this.syncs = node.snext;
        node.snext = null;
        this._syncLeaf(node);
        node.synced = false;
        if (!node.moved) {
          node.moved = true;
          node.mnext = this.moves;
          this.moves = node;
        }
      }
    }
  }

  /** Re-sync one leaf: remove stale tree entry, revalidate + fatten AABB, reinsert. */
  private _syncLeaf(node: ZPP_AABBNode): void {
    const shape = node.shape;
    if (!node.first_sync) {
      const tree = node.dyn ? this.dtree : this.stree;
      tree.removeLeaf(node);
    } else {
      node.first_sync = false;
    }
    const aabb = node.aabb!;
    if (!this.space.continuous) {
      shape.validate_aabb();
    }
    const tight = shape.aabb;
    aabb.minx = tight.minx - ZPP_DynAABBPhase.FATTEN;
    aabb.miny = tight.miny - ZPP_DynAABBPhase.FATTEN;
    aabb.maxx = tight.maxx + ZPP_DynAABBPhase.FATTEN;
    aabb.maxy = tight.maxy + ZPP_DynAABBPhase.FATTEN;
    const tree = (node.dyn = shape.body.type == 1 ? false : !shape.body.component.sleeping)
      ? this.dtree
      : this.stree;
    tree.insertLeaf(node);
  }

  /** Get-or-create the pair (leaf, other); wakes a sleeping pair in place. */
  private _pairFound(leaf: ZPP_AABBNode, other: ZPP_AABBNode, lshape: any, oshape: any): void {
    let id;
    let di;
    if (lshape.id < oshape.id) {
      id = lshape.id;
      di = oshape.id;
    } else {
      id = oshape.id;
      di = lshape.id;
    }
    const pairKey = ZPP_DynAABBPhase._pairKey(id, di);
    let p = this.pairMap.get(pairKey) ?? null;
    if (p != null) {
      if (p.sleeping) {
        p.sleeping = false;
        this._linkPair(p);
        p.first = true;
      }
      return;
    }
    if (ZPP_AABBPair.zpp_pool == null) {
      p = new ZPP_AABBPair();
    } else {
      p = ZPP_AABBPair.zpp_pool;
      ZPP_AABBPair.zpp_pool = p.next;
      p.next = null;
    }
    p.n1 = leaf;
    p.n2 = other;
    p.id = id;
    p.di = di;
    this.pairMap.set(pairKey, p);
    this._linkPair(p);
    p.first = true;
    this._pushPairNode(lshape.pairs, p);
    this._pushPairNode(oshape.pairs, p);
  }

  /** Prepend pair p onto a shape's ZNPList_ZPP_AABBPair. */
  private _pushPairNode(list: any, p: ZPP_AABBPair): void {
    let n;
    if (ZNPNode_ZPP_AABBPair.zpp_pool == null) {
      n = new ZNPNode_ZPP_AABBPair();
    } else {
      n = ZNPNode_ZPP_AABBPair.zpp_pool;
      ZNPNode_ZPP_AABBPair.zpp_pool = n.next;
      n.next = null;
    }
    n.elt = p;
    n.next = list.head;
    list.head = n;
    list.modified = true;
    list.length++;
  }

  /** Stack-walk one tree for overlaps with leaf's fat AABB, creating/waking pairs. */
  private _queryTreePairs(leaf: ZPP_AABBNode, root: ZPP_AABBNode | null): void {
    const lshape = leaf.shape;
    const ab = leaf.aabb!;
    let stack: ZPP_AABBNode | null = null;
    if (root != null) {
      root.next = stack;
      stack = root;
    }
    while (stack != null) {
      const node: ZPP_AABBNode = stack;
      stack = node.next;
      node.next = null;
      if (node == leaf) {
        continue;
      }
      if (node.child1 == null) {
        const shape = node.shape;
        if (shape.body != lshape.body && !(shape.body.type == 1 && lshape.body.type == 1)) {
          const x = node.aabb!;
          if (x.miny <= ab.maxy && ab.miny <= x.maxy && x.minx <= ab.maxx && ab.minx <= x.maxx) {
            this._pairFound(leaf, node, lshape, shape);
          }
        }
      } else {
        const x = node.aabb!;
        if (x.miny <= ab.maxy && ab.miny <= x.maxy && x.minx <= ab.maxx && ab.minx <= x.maxx) {
          if (node.child1 != null) {
            node.child1.next = stack;
            stack = node.child1;
          }
          if (node.child2 != null) {
            node.child2.next = stack;
            stack = node.child2;
          }
        }
      }
    }
  }

  // ========== broadphase ==========

  broadphase(space: any, discrete: boolean): void {
    // Sync queued leaves without consuming the syncs list yet.
    let node = this.syncs;
    while (node != null) {
      this._syncLeaf(node);
      node.synced = false;
      node = node.snext;
    }
    // Pair discovery for freshly synced leaves (moved leaves are handled below).
    while (this.syncs != null) {
      const leaf: ZPP_AABBNode = this.syncs;
      this.syncs = leaf.snext;
      leaf.snext = null;
      if (leaf.moved) {
        continue;
      }
      leaf.moved = false;
      if (leaf.shape.body.component.sleeping) {
        continue;
      }
      this._queryTreePairs(leaf, this.dtree.root);
      this._queryTreePairs(leaf, this.stree.root);
    }
    // Pair discovery for leaves accumulated on the moves list.
    while (this.moves != null) {
      const leaf: ZPP_AABBNode = this.moves;
      this.moves = leaf.mnext;
      leaf.mnext = null;
      leaf.moved = false;
      if (leaf.shape.body.component.sleeping) {
        continue;
      }
      this._queryTreePairs(leaf, this.dtree.root);
      this._queryTreePairs(leaf, this.stree.root);
    }
    // Sweep all live pairs: drop separated, sleep static pairs, run events.
    let cur = this.pairs;
    while (cur != null) {
      let tmp;
      if (!cur.first) {
        const _this43 = cur.n1.aabb;
        const x26 = cur.n2.aabb;
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
        const nxt = cur.next;
        this._unlinkPair(cur);
        cur.n1.shape.pairs.remove(cur);
        cur.n2.shape.pairs.remove(cur);
        this.pairMap.delete(ZPP_DynAABBPhase._pairKey(cur.id, cur.di));
        if (cur.arb != null) {
          cur.arb.pair = null;
        }
        cur.arb = null;
        cur.n1 = cur.n2 = null;
        cur.sleeping = false;
        cur.gprev = null;
        cur.next = ZPP_AABBPair.zpp_pool;
        ZPP_AABBPair.zpp_pool = cur;
        cur = nxt;
        continue;
      }
      const s11 = cur.n1.shape;
      const b110 = s11.body;
      const s21 = cur.n2.shape;
      const b23 = s21.body;
      if (!cur.first) {
        if (
          (b110.component.sleeping || b110.type == 1) &&
          (b23.component.sleeping || b23.type == 1)
        ) {
          cur.sleeping = true;
          const sleepNext = cur.next;
          this._unlinkPair(cur);
          cur = sleepNext;
          continue;
        }
      }
      const wasFirst = cur.first;
      cur.first = false;
      // Skip AABB overlap test for first-encounter pairs: tree traversal just confirmed overlap.
      const _this46 = s11.aabb;
      const x27 = s21.aabb;
      if (
        wasFirst ||
        (x27.miny <= _this46.maxy &&
          _this46.miny <= x27.maxy &&
          x27.minx <= _this46.maxx &&
          _this46.minx <= x27.maxx)
      ) {
        const oarb = cur.arb;
        if (discrete) {
          cur.arb = space.narrowPhase(s11, s21, b110.type != 2 || b23.type != 2, cur.arb, false);
        } else {
          cur.arb = space.continuousEvent(
            s11,
            s21,
            b110.type != 2 || b23.type != 2,
            cur.arb,
            false,
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
      cur = cur.next;
    }
  }

  // ========== clear ==========

  clear(): void {
    while (this.syncs != null) {
      const next = this.syncs.snext;
      this.syncs.snext = null;
      if (this.syncs.first_sync) {
        this.syncs.shape.node = null;
        this.syncs.shape.removedFromSpace();
        this.syncs.shape = null;
      }
      this.syncs = next;
    }
    while (this.moves != null) {
      const next1 = this.moves.mnext;
      this.moves.mnext = null;
      if (this.moves.first_sync) {
        this.moves.shape.node = null;
        this.moves.shape.removedFromSpace();
        this.moves.shape = null;
      }
      this.moves = next1;
    }
    while (this.pairs != null) {
      const nxt = this.pairs.next;
      const p = this.pairs;
      if (p.arb != null) {
        p.arb.pair = null;
      }
      p.arb = null;
      p.n1.shape.pairs.remove(p);
      p.n2.shape.pairs.remove(p);
      p.n1 = p.n2 = null;
      p.sleeping = false;
      p.gprev = null;
      p.next = ZPP_AABBPair.zpp_pool;
      ZPP_AABBPair.zpp_pool = p;
      this.pairs = nxt;
    }
    this.pairMap.clear();
    this.dtree.clear();
    this.stree.clear();
  }

  // ========== shapesUnderPoint ==========

  shapesUnderPoint(x: number, y: number, filter: any, output: any): any {
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
    const v = ret;
    const ret1 = output == null ? new ZPP_DynAABBPhase._nape.shape.ShapeList() : output;
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        const node = this.treeStack.pop_unsafe();
        const _this = node.aabb;
        if (v.x >= _this.minx && v.x <= _this.maxx && v.y >= _this.miny && v.y <= _this.maxy) {
          if (node.child1 == null) {
            let tmp;
            if (filter != null) {
              const _this1 = node.shape.filter;
              tmp =
                (_this1.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this1.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              if (node.shape.type == 0) {
                if (ZPP_Collide.circleContains(node.shape.circle, v)) {
                  ret1.push(node.shape.outer);
                }
              } else if (ZPP_Collide.polyContains(node.shape.polygon, v)) {
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
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        const node1 = this.treeStack.pop_unsafe();
        const _this2 = node1.aabb;
        if (v.x >= _this2.minx && v.x <= _this2.maxx && v.y >= _this2.miny && v.y <= _this2.maxy) {
          if (node1.child1 == null) {
            let tmp1;
            if (filter != null) {
              const _this3 = node1.shape.filter;
              tmp1 =
                (_this3.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this3.collisionGroup) != 0;
            } else {
              tmp1 = true;
            }
            if (tmp1) {
              if (node1.shape.type == 0) {
                if (ZPP_Collide.circleContains(node1.shape.circle, v)) {
                  ret1.push(node1.shape.outer);
                }
              } else if (ZPP_Collide.polyContains(node1.shape.polygon, v)) {
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
    const o = v;
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

  bodiesUnderPoint(x: number, y: number, filter: any, output: any): any {
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
    const v = ret;
    const ret1 = output == null ? new ZPP_DynAABBPhase._nape.phys.BodyList() : output;
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        const node = this.treeStack.pop_unsafe();
        const _this = node.aabb;
        if (v.x >= _this.minx && v.x <= _this.maxx && v.y >= _this.miny && v.y <= _this.maxy) {
          if (node.child1 == null) {
            const body = node.shape.body.outer;
            if (!ret1.has(body)) {
              let tmp;
              if (filter != null) {
                const _this1 = node.shape.filter;
                tmp =
                  (_this1.collisionMask & filter.collisionGroup) != 0 &&
                  (filter.collisionMask & _this1.collisionGroup) != 0;
              } else {
                tmp = true;
              }
              if (tmp) {
                if (node.shape.type == 0) {
                  if (ZPP_Collide.circleContains(node.shape.circle, v)) {
                    ret1.push(body);
                  }
                } else if (ZPP_Collide.polyContains(node.shape.polygon, v)) {
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
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        const node1 = this.treeStack.pop_unsafe();
        const _this2 = node1.aabb;
        if (v.x >= _this2.minx && v.x <= _this2.maxx && v.y >= _this2.miny && v.y <= _this2.maxy) {
          if (node1.child1 == null) {
            const body1 = node1.shape.body.outer;
            if (!ret1.has(body1)) {
              let tmp1;
              if (filter != null) {
                const _this3 = node1.shape.filter;
                tmp1 =
                  (_this3.collisionMask & filter.collisionGroup) != 0 &&
                  (filter.collisionMask & _this3.collisionGroup) != 0;
              } else {
                tmp1 = true;
              }
              if (tmp1) {
                if (node1.shape.type == 0) {
                  if (ZPP_Collide.circleContains(node1.shape.circle, v)) {
                    ret1.push(body1);
                  }
                } else if (ZPP_Collide.polyContains(node1.shape.polygon, v)) {
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
    const o = v;
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

  shapesInAABB(aabb: any, strict: boolean, containment: boolean, filter: any, output: any): any {
    this.sync_broadphase();
    (this as any).updateAABBShape(aabb);
    const ab = this.aabbShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_DynAABBPhase._nape.shape.ShapeList() : output;
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        const node = this.treeStack.pop_unsafe();
        const x = node.aabb;
        if (x.minx >= ab.minx && x.miny >= ab.miny && x.maxx <= ab.maxx && x.maxy <= ab.maxy) {
          if (node.child1 == null) {
            let tmp;
            if (filter != null) {
              const _this = node.shape.filter;
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
              this.treeStack2 = new ZNPList_ZPP_AABBNode();
            }
            this.treeStack2.add(node);
            while (this.treeStack2.head != null) {
              const node1 = this.treeStack2.pop_unsafe();
              if (node1.child1 == null) {
                let tmp1;
                if (filter != null) {
                  const _this1 = node1.shape.filter;
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
          const _this2 = node.aabb;
          if (
            ab.miny <= _this2.maxy &&
            _this2.miny <= ab.maxy &&
            ab.minx <= _this2.maxx &&
            _this2.minx <= ab.maxx
          ) {
            if (node.child1 == null) {
              let tmp2;
              if (filter != null) {
                const _this3 = node.shape.filter;
                tmp2 =
                  (_this3.collisionMask & filter.collisionGroup) != 0 &&
                  (filter.collisionMask & _this3.collisionGroup) != 0;
              } else {
                tmp2 = true;
              }
              if (tmp2) {
                if (strict) {
                  if (containment) {
                    if (ZPP_Collide.containTest(this.aabbShape.zpp_inner, node.shape)) {
                      ret.push(node.shape.outer);
                    }
                  } else {
                    const x1 = node.shape.aabb;
                    if (
                      x1.minx >= ab.minx &&
                      x1.miny >= ab.miny &&
                      x1.maxx <= ab.maxx &&
                      x1.maxy <= ab.maxy
                    ) {
                      ret.push(node.shape.outer);
                    } else if (ZPP_Collide.testCollide_safe(node.shape, this.aabbShape.zpp_inner)) {
                      ret.push(node.shape.outer);
                    }
                  }
                } else {
                  let tmp3;
                  if (containment) {
                    const x2 = node.shape.aabb;
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
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        const node2 = this.treeStack.pop_unsafe();
        const x3 = node2.aabb;
        if (x3.minx >= ab.minx && x3.miny >= ab.miny && x3.maxx <= ab.maxx && x3.maxy <= ab.maxy) {
          if (node2.child1 == null) {
            let tmp4;
            if (filter != null) {
              const _this4 = node2.shape.filter;
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
              this.treeStack2 = new ZNPList_ZPP_AABBNode();
            }
            this.treeStack2.add(node2);
            while (this.treeStack2.head != null) {
              const node3 = this.treeStack2.pop_unsafe();
              if (node3.child1 == null) {
                let tmp5;
                if (filter != null) {
                  const _this5 = node3.shape.filter;
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
          const _this6 = node2.aabb;
          if (
            ab.miny <= _this6.maxy &&
            _this6.miny <= ab.maxy &&
            ab.minx <= _this6.maxx &&
            _this6.minx <= ab.maxx
          ) {
            if (node2.child1 == null) {
              let tmp6;
              if (filter != null) {
                const _this7 = node2.shape.filter;
                tmp6 =
                  (_this7.collisionMask & filter.collisionGroup) != 0 &&
                  (filter.collisionMask & _this7.collisionGroup) != 0;
              } else {
                tmp6 = true;
              }
              if (tmp6) {
                if (strict) {
                  if (containment) {
                    if (ZPP_Collide.containTest(this.aabbShape.zpp_inner, node2.shape)) {
                      ret.push(node2.shape.outer);
                    }
                  } else {
                    const x4 = node2.shape.aabb;
                    if (
                      x4.minx >= ab.minx &&
                      x4.miny >= ab.miny &&
                      x4.maxx <= ab.maxx &&
                      x4.maxy <= ab.maxy
                    ) {
                      ret.push(node2.shape.outer);
                    } else if (
                      ZPP_Collide.testCollide_safe(node2.shape, this.aabbShape.zpp_inner)
                    ) {
                      ret.push(node2.shape.outer);
                    }
                  }
                } else {
                  let tmp7;
                  if (containment) {
                    const x5 = node2.shape.aabb;
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

  bodiesInAABB(aabb: any, strict: boolean, containment: boolean, filter: any, output: any): any {
    this.sync_broadphase();
    (this as any).updateAABBShape(aabb);
    const ab = this.aabbShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_DynAABBPhase._nape.phys.BodyList() : output;
    if (this.failed == null) {
      this.failed = new ZPP_DynAABBPhase._nape.phys.BodyList();
    }
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        const node = this.treeStack.pop_unsafe();
        const x = node.aabb;
        if (x.minx >= ab.minx && x.miny >= ab.miny && x.maxx <= ab.maxx && x.maxy <= ab.maxy) {
          if (node.child1 == null) {
            let tmp;
            if (filter != null) {
              const _this = node.shape.filter;
              tmp =
                (_this.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              const body = node.shape.body.outer;
              if (!ret.has(body)) {
                ret.push(body);
              }
            }
          } else {
            if (this.treeStack2 == null) {
              this.treeStack2 = new ZNPList_ZPP_AABBNode();
            }
            this.treeStack2.add(node);
            while (this.treeStack2.head != null) {
              const node1 = this.treeStack2.pop_unsafe();
              if (node1.child1 == null) {
                let tmp1;
                if (filter != null) {
                  const _this1 = node1.shape.filter;
                  tmp1 =
                    (_this1.collisionMask & filter.collisionGroup) != 0 &&
                    (filter.collisionMask & _this1.collisionGroup) != 0;
                } else {
                  tmp1 = true;
                }
                if (tmp1) {
                  const body1 = node1.shape.body.outer;
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
          const _this2 = node.aabb;
          if (
            ab.miny <= _this2.maxy &&
            _this2.miny <= ab.maxy &&
            ab.minx <= _this2.maxx &&
            _this2.minx <= ab.maxx
          ) {
            if (node.child1 == null) {
              const body2 = node.shape.body.outer;
              let tmp2;
              if (filter != null) {
                const _this3 = node.shape.filter;
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
                      const col = ZPP_Collide.containTest(this.aabbShape.zpp_inner, node.shape);
                      if (!ret.has(body2) && col) {
                        ret.push(body2);
                      } else if (!col) {
                        ret.remove(body2);
                        this.failed.push(body2);
                      }
                    }
                  } else if (
                    !ret.has(body2) &&
                    ZPP_Collide.testCollide_safe(node.shape, this.aabbShape.zpp_inner)
                  ) {
                    ret.push(body2);
                  }
                } else if (containment) {
                  if (!this.failed.has(body2)) {
                    const x1 = node.shape.aabb;
                    const col1 =
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
                    const x2 = node.shape.aabb;
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
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        const node2 = this.treeStack.pop_unsafe();
        const x3 = node2.aabb;
        if (x3.minx >= ab.minx && x3.miny >= ab.miny && x3.maxx <= ab.maxx && x3.maxy <= ab.maxy) {
          if (node2.child1 == null) {
            let tmp4;
            if (filter != null) {
              const _this4 = node2.shape.filter;
              tmp4 =
                (_this4.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this4.collisionGroup) != 0;
            } else {
              tmp4 = true;
            }
            if (tmp4) {
              const body3 = node2.shape.body.outer;
              if (!ret.has(body3)) {
                ret.push(body3);
              }
            }
          } else {
            if (this.treeStack2 == null) {
              this.treeStack2 = new ZNPList_ZPP_AABBNode();
            }
            this.treeStack2.add(node2);
            while (this.treeStack2.head != null) {
              const node3 = this.treeStack2.pop_unsafe();
              if (node3.child1 == null) {
                let tmp5;
                if (filter != null) {
                  const _this5 = node3.shape.filter;
                  tmp5 =
                    (_this5.collisionMask & filter.collisionGroup) != 0 &&
                    (filter.collisionMask & _this5.collisionGroup) != 0;
                } else {
                  tmp5 = true;
                }
                if (tmp5) {
                  const body4 = node3.shape.body.outer;
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
          const _this6 = node2.aabb;
          if (
            ab.miny <= _this6.maxy &&
            _this6.miny <= ab.maxy &&
            ab.minx <= _this6.maxx &&
            _this6.minx <= ab.maxx
          ) {
            if (node2.child1 == null) {
              const body5 = node2.shape.body.outer;
              let tmp6;
              if (filter != null) {
                const _this7 = node2.shape.filter;
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
                      const col2 = ZPP_Collide.containTest(this.aabbShape.zpp_inner, node2.shape);
                      if (!ret.has(body5) && col2) {
                        ret.push(body5);
                      } else if (!col2) {
                        ret.remove(body5);
                        this.failed.push(body5);
                      }
                    }
                  } else if (
                    !ret.has(body5) &&
                    ZPP_Collide.testCollide_safe(node2.shape, this.aabbShape.zpp_inner)
                  ) {
                    ret.push(body5);
                  }
                } else if (containment) {
                  if (!this.failed.has(body5)) {
                    const x4 = node2.shape.aabb;
                    const col3 =
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
                    const x5 = node2.shape.aabb;
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

  shapesInCircle(
    x: number,
    y: number,
    r: number,
    containment: boolean,
    filter: any,
    output: any,
  ): any {
    this.sync_broadphase();
    (this as any).updateCircShape(x, y, r);
    const ab = this.circShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_DynAABBPhase._nape.shape.ShapeList() : output;
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        const node = this.treeStack.pop_unsafe();
        const _this = node.aabb;
        if (
          ab.miny <= _this.maxy &&
          _this.miny <= ab.maxy &&
          ab.minx <= _this.maxx &&
          _this.minx <= ab.maxx
        ) {
          if (node.child1 == null) {
            let tmp;
            if (filter != null) {
              const _this1 = node.shape.filter;
              tmp =
                (_this1.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this1.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              if (containment) {
                if (ZPP_Collide.containTest(this.circShape.zpp_inner, node.shape)) {
                  ret.push(node.shape.outer);
                }
              } else if (ZPP_Collide.testCollide_safe(node.shape, this.circShape.zpp_inner)) {
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
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        const node1 = this.treeStack.pop_unsafe();
        const _this2 = node1.aabb;
        if (
          ab.miny <= _this2.maxy &&
          _this2.miny <= ab.maxy &&
          ab.minx <= _this2.maxx &&
          _this2.minx <= ab.maxx
        ) {
          if (node1.child1 == null) {
            let tmp1;
            if (filter != null) {
              const _this3 = node1.shape.filter;
              tmp1 =
                (_this3.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this3.collisionGroup) != 0;
            } else {
              tmp1 = true;
            }
            if (tmp1) {
              if (containment) {
                if (ZPP_Collide.containTest(this.circShape.zpp_inner, node1.shape)) {
                  ret.push(node1.shape.outer);
                }
              } else if (ZPP_Collide.testCollide_safe(node1.shape, this.circShape.zpp_inner)) {
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

  bodiesInCircle(
    x: number,
    y: number,
    r: number,
    containment: boolean,
    filter: any,
    output: any,
  ): any {
    this.sync_broadphase();
    (this as any).updateCircShape(x, y, r);
    const ab = this.circShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_DynAABBPhase._nape.phys.BodyList() : output;
    if (this.failed == null) {
      this.failed = new ZPP_DynAABBPhase._nape.phys.BodyList();
    }
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        const node = this.treeStack.pop_unsafe();
        const _this = node.aabb;
        if (
          ab.miny <= _this.maxy &&
          _this.miny <= ab.maxy &&
          ab.minx <= _this.maxx &&
          _this.minx <= ab.maxx
        ) {
          if (node.child1 == null) {
            const body = node.shape.body.outer;
            let tmp;
            if (filter != null) {
              const _this1 = node.shape.filter;
              tmp =
                (_this1.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this1.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              if (containment) {
                if (!this.failed.has(body)) {
                  const col = ZPP_Collide.containTest(this.circShape.zpp_inner, node.shape);
                  if (!ret.has(body) && col) {
                    ret.push(body);
                  } else if (!col) {
                    ret.remove(body);
                    this.failed.push(body);
                  }
                }
              } else if (
                !ret.has(body) &&
                ZPP_Collide.testCollide_safe(node.shape, this.circShape.zpp_inner)
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
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        const node1 = this.treeStack.pop_unsafe();
        const _this2 = node1.aabb;
        if (
          ab.miny <= _this2.maxy &&
          _this2.miny <= ab.maxy &&
          ab.minx <= _this2.maxx &&
          _this2.minx <= ab.maxx
        ) {
          if (node1.child1 == null) {
            const body1 = node1.shape.body.outer;
            let tmp1;
            if (filter != null) {
              const _this3 = node1.shape.filter;
              tmp1 =
                (_this3.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this3.collisionGroup) != 0;
            } else {
              tmp1 = true;
            }
            if (tmp1) {
              if (containment) {
                if (!this.failed.has(body1)) {
                  const col1 = ZPP_Collide.containTest(this.circShape.zpp_inner, node1.shape);
                  if (!ret.has(body1) && col1) {
                    ret.push(body1);
                  } else if (!col1) {
                    ret.remove(body1);
                    this.failed.push(body1);
                  }
                }
              } else if (
                !ret.has(body1) &&
                ZPP_Collide.testCollide_safe(node1.shape, this.circShape.zpp_inner)
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

  shapesInShape(shp: any, containment: boolean, filter: any, output: any): any {
    this.sync_broadphase();
    (this as any).validateShape(shp);
    const ab = shp.aabb;
    const ret = output == null ? new ZPP_DynAABBPhase._nape.shape.ShapeList() : output;
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        const node = this.treeStack.pop_unsafe();
        const _this = node.aabb;
        if (
          ab.miny <= _this.maxy &&
          _this.miny <= ab.maxy &&
          ab.minx <= _this.maxx &&
          _this.minx <= ab.maxx
        ) {
          if (node.child1 == null) {
            let tmp;
            if (filter != null) {
              const _this1 = node.shape.filter;
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
              } else if (ZPP_Collide.testCollide_safe(node.shape, shp)) {
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
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        const node1 = this.treeStack.pop_unsafe();
        const _this2 = node1.aabb;
        if (
          ab.miny <= _this2.maxy &&
          _this2.miny <= ab.maxy &&
          ab.minx <= _this2.maxx &&
          _this2.minx <= ab.maxx
        ) {
          if (node1.child1 == null) {
            let tmp1;
            if (filter != null) {
              const _this3 = node1.shape.filter;
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
              } else if (ZPP_Collide.testCollide_safe(node1.shape, shp)) {
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

  bodiesInShape(shp: any, containment: boolean, filter: any, output: any): any {
    this.sync_broadphase();
    (this as any).validateShape(shp);
    const ab = shp.aabb;
    const ret = output == null ? new ZPP_DynAABBPhase._nape.phys.BodyList() : output;
    if (this.failed == null) {
      this.failed = new ZPP_DynAABBPhase._nape.phys.BodyList();
    }
    if (this.stree.root != null) {
      if (this.treeStack == null) {
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.stree.root);
      while (this.treeStack.head != null) {
        const node = this.treeStack.pop_unsafe();
        const _this = node.aabb;
        if (
          ab.miny <= _this.maxy &&
          _this.miny <= ab.maxy &&
          ab.minx <= _this.maxx &&
          _this.minx <= ab.maxx
        ) {
          if (node.child1 == null) {
            const body = node.shape.body.outer;
            let tmp;
            if (filter != null) {
              const _this1 = node.shape.filter;
              tmp =
                (_this1.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this1.collisionGroup) != 0;
            } else {
              tmp = true;
            }
            if (tmp) {
              if (containment) {
                if (!this.failed.has(body)) {
                  const col = ZPP_Collide.containTest(shp, node.shape);
                  if (!ret.has(body) && col) {
                    ret.push(body);
                  } else if (!col) {
                    ret.remove(body);
                    this.failed.push(body);
                  }
                }
              } else if (!ret.has(body) && ZPP_Collide.testCollide_safe(node.shape, shp)) {
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
        this.treeStack = new ZNPList_ZPP_AABBNode();
      }
      this.treeStack.add(this.dtree.root);
      while (this.treeStack.head != null) {
        const node1 = this.treeStack.pop_unsafe();
        const _this2 = node1.aabb;
        if (
          ab.miny <= _this2.maxy &&
          _this2.miny <= ab.maxy &&
          ab.minx <= _this2.maxx &&
          _this2.minx <= ab.maxx
        ) {
          if (node1.child1 == null) {
            const body1 = node1.shape.body.outer;
            let tmp1;
            if (filter != null) {
              const _this3 = node1.shape.filter;
              tmp1 =
                (_this3.collisionMask & filter.collisionGroup) != 0 &&
                (filter.collisionMask & _this3.collisionGroup) != 0;
            } else {
              tmp1 = true;
            }
            if (tmp1) {
              if (containment) {
                if (!this.failed.has(body1)) {
                  const col1 = ZPP_Collide.containTest(shp, node1.shape);
                  if (!ret.has(body1) && col1) {
                    ret.push(body1);
                  } else if (!col1) {
                    ret.remove(body1);
                    this.failed.push(body1);
                  }
                }
              } else if (!ret.has(body1) && ZPP_Collide.testCollide_safe(node1.shape, shp)) {
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

  rayCast(ray: any, inner: boolean, filter: any): any {
    if (this.openlist == null) {
      this.openlist = new ZNPList_ZPP_AABBNode();
    }
    this.sync_broadphase();
    ray.validate_dir();
    let mint = ray.maxdist;
    if (this.dtree.root != null) {
      if (ray.aabbtest(this.dtree.root.aabb)) {
        const t = ray.aabbsect(this.dtree.root.aabb);
        if (t >= 0 && t < mint) {
          this.dtree.root.rayt = t;
          let pre = null;
          let cx_ite = this.openlist.head;
          while (cx_ite != null) {
            const j = cx_ite.elt;
            if (this.dtree.root.rayt < j.rayt) {
              break;
            }
            pre = cx_ite;
            cx_ite = cx_ite.next;
          }
          const _this = this.openlist;
          const o = this.dtree.root;
          let ret;
          if (ZNPNode_ZPP_AABBNode.zpp_pool == null) {
            ret = new ZNPNode_ZPP_AABBNode();
          } else {
            ret = ZNPNode_ZPP_AABBNode.zpp_pool;
            ZNPNode_ZPP_AABBNode.zpp_pool = ret.next;
            ret.next = null;
          }
          ret.elt = o;
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
        }
      }
    }
    if (this.stree.root != null) {
      if (ray.aabbtest(this.stree.root.aabb)) {
        const t1 = ray.aabbsect(this.stree.root.aabb);
        if (t1 >= 0 && t1 < mint) {
          this.stree.root.rayt = t1;
          let pre1 = null;
          let cx_ite1 = this.openlist.head;
          while (cx_ite1 != null) {
            const j1 = cx_ite1.elt;
            if (this.stree.root.rayt < j1.rayt) {
              break;
            }
            pre1 = cx_ite1;
            cx_ite1 = cx_ite1.next;
          }
          const _this1 = this.openlist;
          const o1 = this.stree.root;
          let ret1;
          if (ZNPNode_ZPP_AABBNode.zpp_pool == null) {
            ret1 = new ZNPNode_ZPP_AABBNode();
          } else {
            ret1 = ZNPNode_ZPP_AABBNode.zpp_pool;
            ZNPNode_ZPP_AABBNode.zpp_pool = ret1.next;
            ret1.next = null;
          }
          ret1.elt = o1;
          const temp1 = ret1;
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
      const cnode = this.openlist.pop_unsafe();
      if (cnode.rayt >= mint) {
        break;
      }
      if (cnode.child1 == null) {
        const shape = cnode.shape;
        let tmp;
        if (filter != null) {
          const _this2 = shape.filter;
          tmp =
            (_this2.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this2.collisionGroup) != 0;
        } else {
          tmp = true;
        }
        if (tmp) {
          const result =
            shape.type == 0
              ? ray.circlesect(shape.circle, inner, mint)
              : ray.aabbtest(shape.aabb)
                ? ray.polysect(shape.polygon, inner, mint)
                : null;
          if (result != null) {
            if (result.zpp_inner.next != null) {
              throw new Error("This object has been disposed of and cannot be used");
            }
            mint = result.zpp_inner.toiDistance;
            if (minres != null) {
              if (minres.zpp_inner.next != null) {
                throw new Error("This object has been disposed of and cannot be used");
              }
              minres.zpp_inner.free();
            }
            minres = result;
          }
        }
      } else {
        if (cnode.child1 != null) {
          if (ray.aabbtest(cnode.child1.aabb)) {
            const t2 = ray.aabbsect(cnode.child1.aabb);
            if (t2 >= 0 && t2 < mint) {
              cnode.child1.rayt = t2;
              let pre2 = null;
              let cx_ite2 = this.openlist.head;
              while (cx_ite2 != null) {
                const j2 = cx_ite2.elt;
                if (cnode.child1.rayt < j2.rayt) {
                  break;
                }
                pre2 = cx_ite2;
                cx_ite2 = cx_ite2.next;
              }
              const _this3 = this.openlist;
              const o2 = cnode.child1;
              let ret2;
              if (ZNPNode_ZPP_AABBNode.zpp_pool == null) {
                ret2 = new ZNPNode_ZPP_AABBNode();
              } else {
                ret2 = ZNPNode_ZPP_AABBNode.zpp_pool;
                ZNPNode_ZPP_AABBNode.zpp_pool = ret2.next;
                ret2.next = null;
              }
              ret2.elt = o2;
              const temp2 = ret2;
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
            const t3 = ray.aabbsect(cnode.child2.aabb);
            if (t3 >= 0 && t3 < mint) {
              cnode.child2.rayt = t3;
              let pre3 = null;
              let cx_ite3 = this.openlist.head;
              while (cx_ite3 != null) {
                const j3 = cx_ite3.elt;
                if (cnode.child2.rayt < j3.rayt) {
                  break;
                }
                pre3 = cx_ite3;
                cx_ite3 = cx_ite3.next;
              }
              const _this4 = this.openlist;
              const o3 = cnode.child2;
              let ret3;
              if (ZNPNode_ZPP_AABBNode.zpp_pool == null) {
                ret3 = new ZNPNode_ZPP_AABBNode();
              } else {
                ret3 = ZNPNode_ZPP_AABBNode.zpp_pool;
                ZNPNode_ZPP_AABBNode.zpp_pool = ret3.next;
                ret3.next = null;
              }
              ret3.elt = o3;
              const temp3 = ret3;
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

  rayMultiCast(ray: any, inner: boolean, filter: any, output: any): any {
    if (this.openlist == null) {
      this.openlist = new ZNPList_ZPP_AABBNode();
    }
    this.sync_broadphase();
    ray.validate_dir();
    const inf = ray.maxdist >= Infinity;
    const ret = output == null ? new ZPP_DynAABBPhase._nape.geom.RayResultList() : output;
    if (this.dtree.root != null) {
      if (ray.aabbtest(this.dtree.root.aabb)) {
        if (inf) {
          this.openlist.add(this.dtree.root);
        } else {
          const t = ray.aabbsect(this.dtree.root.aabb);
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
          const t1 = ray.aabbsect(this.stree.root.aabb);
          if (t1 >= 0 && t1 < ray.maxdist) {
            this.openlist.add(this.stree.root);
          }
        }
      }
    }
    while (this.openlist.head != null) {
      const cnode = this.openlist.pop_unsafe();
      if (cnode.child1 == null) {
        const shape = cnode.shape;
        let tmp;
        if (filter != null) {
          const _this = shape.filter;
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
              const t2 = ray.aabbsect(cnode.child1.aabb);
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
              const t3 = ray.aabbsect(cnode.child2.aabb);
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
