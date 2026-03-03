/**
 * ZPP_AABBTree — Internal dynamic AABB tree for broadphase.
 * Converted from nape-compiled.js lines 26732–27900.
 *
 * A self-balancing binary tree where each internal node stores the union AABB
 * of its children. Leaf nodes reference shapes. Used by ZPP_DynAABBPhase for
 * efficient broadphase collision detection.
 */

import { ZPP_AABB } from "../geom/ZPP_AABB";
import { ZPP_AABBNode } from "./ZPP_AABBNode";

type Any = any;

export class ZPP_AABBTree {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_AABBTree"];

  // --- Static: temporary AABB used during insert cost calculations ---
  static tmpaabb: ZPP_AABB | null = null;

  // --- Instance: tree root ---
  root: ZPP_AABBNode | null = null;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_AABBTree;

  // ========== clear ==========

  clear(): void {
    if (this.root == null) {
      return;
    }
    let stack: ZPP_AABBNode | null = null;
    this.root.next = stack;
    stack = this.root;
    while (stack != null) {
      const ret = stack;
      stack = ret.next;
      ret.next = null;
      const node = ret;
      if (node.child1 == null) {
        node.shape.node = null;
        node.shape.removedFromSpace();
        node.shape = null;
      } else {
        if (node.child1 != null) {
          node.child1.next = stack;
          stack = node.child1;
        }
        if (node.child2 != null) {
          node.child2.next = stack;
          stack = node.child2;
        }
      }
      const o = node;
      o.height = -1;
      const o1 = o.aabb!;
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
    }
    this.root = null;
  }

  // ========== insertLeaf ==========

  insertLeaf(leaf: ZPP_AABBNode): void {
    if (this.root == null) {
      this.root = leaf;
      this.root.parent = null;
    } else {
      const leafaabb = leaf.aabb!;
      let node = this.root!;
      while (node.child1 != null) {
        const child1 = node.child1;
        const child2 = node.child2!;
        const _this = node.aabb!;
        const area = (_this.maxx - _this.minx + (_this.maxy - _this.miny)) * 2;
        const _this1 = ZPP_AABBTree.tmpaabb!;
        const a = node.aabb!;
        _this1.minx = a.minx < leafaabb.minx ? a.minx : leafaabb.minx;
        _this1.miny = a.miny < leafaabb.miny ? a.miny : leafaabb.miny;
        _this1.maxx = a.maxx > leafaabb.maxx ? a.maxx : leafaabb.maxx;
        _this1.maxy = a.maxy > leafaabb.maxy ? a.maxy : leafaabb.maxy;
        const _this2 = ZPP_AABBTree.tmpaabb!;
        const carea =
          (_this2.maxx - _this2.minx + (_this2.maxy - _this2.miny)) * 2;
        const cost = 2 * carea;
        const icost = 2 * (carea - area);
        const _this3 = ZPP_AABBTree.tmpaabb!;
        const b = child1.aabb!;
        _this3.minx = leafaabb.minx < b.minx ? leafaabb.minx : b.minx;
        _this3.miny = leafaabb.miny < b.miny ? leafaabb.miny : b.miny;
        _this3.maxx = leafaabb.maxx > b.maxx ? leafaabb.maxx : b.maxx;
        _this3.maxy = leafaabb.maxy > b.maxy ? leafaabb.maxy : b.maxy;
        let cost1: number;
        if (child1.child1 == null) {
          const _this4 = ZPP_AABBTree.tmpaabb!;
          cost1 =
            (_this4.maxx - _this4.minx + (_this4.maxy - _this4.miny)) * 2 +
            icost;
        } else {
          const _this5 = child1.aabb!;
          const oarea =
            (_this5.maxx - _this5.minx + (_this5.maxy - _this5.miny)) * 2;
          const _this6 = ZPP_AABBTree.tmpaabb!;
          const narea =
            (_this6.maxx - _this6.minx + (_this6.maxy - _this6.miny)) * 2;
          cost1 = narea - oarea + icost;
        }
        const _this7 = ZPP_AABBTree.tmpaabb!;
        const b1 = child2.aabb!;
        _this7.minx = leafaabb.minx < b1.minx ? leafaabb.minx : b1.minx;
        _this7.miny = leafaabb.miny < b1.miny ? leafaabb.miny : b1.miny;
        _this7.maxx = leafaabb.maxx > b1.maxx ? leafaabb.maxx : b1.maxx;
        _this7.maxy = leafaabb.maxy > b1.maxy ? leafaabb.maxy : b1.maxy;
        let cost2: number;
        if (child2.child1 == null) {
          const _this8 = ZPP_AABBTree.tmpaabb!;
          cost2 =
            (_this8.maxx - _this8.minx + (_this8.maxy - _this8.miny)) * 2 +
            icost;
        } else {
          const _this9 = child2.aabb!;
          const oarea1 =
            (_this9.maxx - _this9.minx + (_this9.maxy - _this9.miny)) * 2;
          const _this10 = ZPP_AABBTree.tmpaabb!;
          const narea1 =
            (_this10.maxx - _this10.minx + (_this10.maxy - _this10.miny)) * 2;
          cost2 = narea1 - oarea1 + icost;
        }
        if (cost < cost1 && cost < cost2) {
          break;
        } else {
          node = cost1 < cost2 ? child1 : child2;
        }
      }
      const sibling = node;
      const oparent = sibling.parent;
      let nparent: ZPP_AABBNode;
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
      const _this11 = nparent.aabb;
      const b2 = sibling.aabb!;
      _this11.minx = leafaabb.minx < b2.minx ? leafaabb.minx : b2.minx;
      _this11.miny = leafaabb.miny < b2.miny ? leafaabb.miny : b2.miny;
      _this11.maxx = leafaabb.maxx > b2.maxx ? leafaabb.maxx : b2.maxx;
      _this11.maxy = leafaabb.maxy > b2.maxy ? leafaabb.maxy : b2.maxy;
      nparent.height = sibling.height + 1;
      if (oparent != null) {
        if (oparent.child1 == sibling) {
          oparent.child1 = nparent;
        } else {
          oparent.child2 = nparent;
        }
        nparent.child1 = sibling;
        nparent.child2 = leaf;
        sibling.parent = nparent;
        leaf.parent = nparent;
      } else {
        nparent.child1 = sibling;
        nparent.child2 = leaf;
        sibling.parent = nparent;
        leaf.parent = nparent;
        this.root = nparent;
      }
      node = leaf.parent!;
      while (node != null) {
        if (node.child1 == null || node.height < 2) {
          node = node;
        } else {
          const b3 = node.child1;
          const c = node.child2!;
          const balance = c.height - b3.height;
          if (balance > 1) {
            const f = c.child1!;
            const g = c.child2!;
            c.child1 = node;
            c.parent = node.parent;
            node.parent = c;
            if (c.parent != null) {
              if (c.parent.child1 == node) {
                c.parent.child1 = c;
              } else {
                c.parent.child2 = c;
              }
            } else {
              this.root = c;
            }
            if (f.height > g.height) {
              c.child2 = f;
              node.child2 = g;
              g.parent = node;
              const _this12 = node.aabb!;
              const a1 = b3.aabb!;
              const b4 = g.aabb!;
              _this12.minx = a1.minx < b4.minx ? a1.minx : b4.minx;
              _this12.miny = a1.miny < b4.miny ? a1.miny : b4.miny;
              _this12.maxx = a1.maxx > b4.maxx ? a1.maxx : b4.maxx;
              _this12.maxy = a1.maxy > b4.maxy ? a1.maxy : b4.maxy;
              const _this13 = c.aabb!;
              const a2 = node.aabb!;
              const b5 = f.aabb!;
              _this13.minx = a2.minx < b5.minx ? a2.minx : b5.minx;
              _this13.miny = a2.miny < b5.miny ? a2.miny : b5.miny;
              _this13.maxx = a2.maxx > b5.maxx ? a2.maxx : b5.maxx;
              _this13.maxy = a2.maxy > b5.maxy ? a2.maxy : b5.maxy;
              const x = b3.height;
              const y = g.height;
              node.height = 1 + (x > y ? x : y);
              const x1 = node.height;
              const y1 = f.height;
              c.height = 1 + (x1 > y1 ? x1 : y1);
            } else {
              c.child2 = g;
              node.child2 = f;
              f.parent = node;
              const _this14 = node.aabb!;
              const a3 = b3.aabb!;
              const b6 = f.aabb!;
              _this14.minx = a3.minx < b6.minx ? a3.minx : b6.minx;
              _this14.miny = a3.miny < b6.miny ? a3.miny : b6.miny;
              _this14.maxx = a3.maxx > b6.maxx ? a3.maxx : b6.maxx;
              _this14.maxy = a3.maxy > b6.maxy ? a3.maxy : b6.maxy;
              const _this15 = c.aabb!;
              const a4 = node.aabb!;
              const b7 = g.aabb!;
              _this15.minx = a4.minx < b7.minx ? a4.minx : b7.minx;
              _this15.miny = a4.miny < b7.miny ? a4.miny : b7.miny;
              _this15.maxx = a4.maxx > b7.maxx ? a4.maxx : b7.maxx;
              _this15.maxy = a4.maxy > b7.maxy ? a4.maxy : b7.maxy;
              const x2 = b3.height;
              const y2 = f.height;
              node.height = 1 + (x2 > y2 ? x2 : y2);
              const x3 = node.height;
              const y3 = g.height;
              c.height = 1 + (x3 > y3 ? x3 : y3);
            }
            node = c;
          } else if (balance < -1) {
            const f1 = b3.child1!;
            const g1 = b3.child2!;
            b3.child1 = node;
            b3.parent = node.parent;
            node.parent = b3;
            if (b3.parent != null) {
              if (b3.parent.child1 == node) {
                b3.parent.child1 = b3;
              } else {
                b3.parent.child2 = b3;
              }
            } else {
              this.root = b3;
            }
            if (f1.height > g1.height) {
              b3.child2 = f1;
              node.child1 = g1;
              g1.parent = node;
              const _this16 = node.aabb!;
              const a5 = c.aabb!;
              const b8 = g1.aabb!;
              _this16.minx = a5.minx < b8.minx ? a5.minx : b8.minx;
              _this16.miny = a5.miny < b8.miny ? a5.miny : b8.miny;
              _this16.maxx = a5.maxx > b8.maxx ? a5.maxx : b8.maxx;
              _this16.maxy = a5.maxy > b8.maxy ? a5.maxy : b8.maxy;
              const _this17 = b3.aabb!;
              const a6 = node.aabb!;
              const b9 = f1.aabb!;
              _this17.minx = a6.minx < b9.minx ? a6.minx : b9.minx;
              _this17.miny = a6.miny < b9.miny ? a6.miny : b9.miny;
              _this17.maxx = a6.maxx > b9.maxx ? a6.maxx : b9.maxx;
              _this17.maxy = a6.maxy > b9.maxy ? a6.maxy : b9.maxy;
              const x4 = c.height;
              const y4 = g1.height;
              node.height = 1 + (x4 > y4 ? x4 : y4);
              const x5 = node.height;
              const y5 = f1.height;
              b3.height = 1 + (x5 > y5 ? x5 : y5);
            } else {
              b3.child2 = g1;
              node.child1 = f1;
              f1.parent = node;
              const _this18 = node.aabb!;
              const a7 = c.aabb!;
              const b10 = f1.aabb!;
              _this18.minx = a7.minx < b10.minx ? a7.minx : b10.minx;
              _this18.miny = a7.miny < b10.miny ? a7.miny : b10.miny;
              _this18.maxx = a7.maxx > b10.maxx ? a7.maxx : b10.maxx;
              _this18.maxy = a7.maxy > b10.maxy ? a7.maxy : b10.maxy;
              const _this19 = b3.aabb!;
              const a8 = node.aabb!;
              const b11 = g1.aabb!;
              _this19.minx = a8.minx < b11.minx ? a8.minx : b11.minx;
              _this19.miny = a8.miny < b11.miny ? a8.miny : b11.miny;
              _this19.maxx = a8.maxx > b11.maxx ? a8.maxx : b11.maxx;
              _this19.maxy = a8.maxy > b11.maxy ? a8.maxy : b11.maxy;
              const x6 = c.height;
              const y6 = f1.height;
              node.height = 1 + (x6 > y6 ? x6 : y6);
              const x7 = node.height;
              const y7 = g1.height;
              b3.height = 1 + (x7 > y7 ? x7 : y7);
            }
            node = b3;
          } else {
            node = node;
          }
        }
        const child11 = node.child1!;
        const child21 = node.child2!;
        const x8 = child11.height;
        const y8 = child21.height;
        node.height = 1 + (x8 > y8 ? x8 : y8);
        const _this20 = node.aabb!;
        const a9 = child11.aabb!;
        const b12 = child21.aabb!;
        _this20.minx = a9.minx < b12.minx ? a9.minx : b12.minx;
        _this20.miny = a9.miny < b12.miny ? a9.miny : b12.miny;
        _this20.maxx = a9.maxx > b12.maxx ? a9.maxx : b12.maxx;
        _this20.maxy = a9.maxy > b12.maxy ? a9.maxy : b12.maxy;
        node = node.parent!;
      }
    }
  }

  // ========== inlined_insertLeaf ==========

  inlined_insertLeaf(leaf: ZPP_AABBNode): void {
    if (this.root == null) {
      this.root = leaf;
      this.root.parent = null;
    } else {
      const leafaabb = leaf.aabb!;
      let node = this.root!;
      while (node.child1 != null) {
        const child1 = node.child1;
        const child2 = node.child2!;
        const _this = node.aabb!;
        const area = (_this.maxx - _this.minx + (_this.maxy - _this.miny)) * 2;
        const _this1 = ZPP_AABBTree.tmpaabb!;
        const a = node.aabb!;
        _this1.minx = a.minx < leafaabb.minx ? a.minx : leafaabb.minx;
        _this1.miny = a.miny < leafaabb.miny ? a.miny : leafaabb.miny;
        _this1.maxx = a.maxx > leafaabb.maxx ? a.maxx : leafaabb.maxx;
        _this1.maxy = a.maxy > leafaabb.maxy ? a.maxy : leafaabb.maxy;
        const _this2 = ZPP_AABBTree.tmpaabb!;
        const carea =
          (_this2.maxx - _this2.minx + (_this2.maxy - _this2.miny)) * 2;
        const cost = 2 * carea;
        const icost = 2 * (carea - area);
        const _this3 = ZPP_AABBTree.tmpaabb!;
        const b = child1.aabb!;
        _this3.minx = leafaabb.minx < b.minx ? leafaabb.minx : b.minx;
        _this3.miny = leafaabb.miny < b.miny ? leafaabb.miny : b.miny;
        _this3.maxx = leafaabb.maxx > b.maxx ? leafaabb.maxx : b.maxx;
        _this3.maxy = leafaabb.maxy > b.maxy ? leafaabb.maxy : b.maxy;
        let cost1: number;
        if (child1.child1 == null) {
          const _this4 = ZPP_AABBTree.tmpaabb!;
          cost1 =
            (_this4.maxx - _this4.minx + (_this4.maxy - _this4.miny)) * 2 +
            icost;
        } else {
          const _this5 = child1.aabb!;
          const oarea =
            (_this5.maxx - _this5.minx + (_this5.maxy - _this5.miny)) * 2;
          const _this6 = ZPP_AABBTree.tmpaabb!;
          const narea =
            (_this6.maxx - _this6.minx + (_this6.maxy - _this6.miny)) * 2;
          cost1 = narea - oarea + icost;
        }
        const _this7 = ZPP_AABBTree.tmpaabb!;
        const b1 = child2.aabb!;
        _this7.minx = leafaabb.minx < b1.minx ? leafaabb.minx : b1.minx;
        _this7.miny = leafaabb.miny < b1.miny ? leafaabb.miny : b1.miny;
        _this7.maxx = leafaabb.maxx > b1.maxx ? leafaabb.maxx : b1.maxx;
        _this7.maxy = leafaabb.maxy > b1.maxy ? leafaabb.maxy : b1.maxy;
        let cost2: number;
        if (child2.child1 == null) {
          const _this8 = ZPP_AABBTree.tmpaabb!;
          cost2 =
            (_this8.maxx - _this8.minx + (_this8.maxy - _this8.miny)) * 2 +
            icost;
        } else {
          const _this9 = child2.aabb!;
          const oarea1 =
            (_this9.maxx - _this9.minx + (_this9.maxy - _this9.miny)) * 2;
          const _this10 = ZPP_AABBTree.tmpaabb!;
          const narea1 =
            (_this10.maxx - _this10.minx + (_this10.maxy - _this10.miny)) * 2;
          cost2 = narea1 - oarea1 + icost;
        }
        if (cost < cost1 && cost < cost2) {
          break;
        } else {
          node = cost1 < cost2 ? child1 : child2;
        }
      }
      const sibling = node;
      const oparent = sibling.parent;
      let nparent: ZPP_AABBNode;
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
      const _this11 = nparent.aabb;
      const b2 = sibling.aabb!;
      _this11.minx = leafaabb.minx < b2.minx ? leafaabb.minx : b2.minx;
      _this11.miny = leafaabb.miny < b2.miny ? leafaabb.miny : b2.miny;
      _this11.maxx = leafaabb.maxx > b2.maxx ? leafaabb.maxx : b2.maxx;
      _this11.maxy = leafaabb.maxy > b2.maxy ? leafaabb.maxy : b2.maxy;
      nparent.height = sibling.height + 1;
      if (oparent != null) {
        if (oparent.child1 == sibling) {
          oparent.child1 = nparent;
        } else {
          oparent.child2 = nparent;
        }
        nparent.child1 = sibling;
        nparent.child2 = leaf;
        sibling.parent = nparent;
        leaf.parent = nparent;
      } else {
        nparent.child1 = sibling;
        nparent.child2 = leaf;
        sibling.parent = nparent;
        leaf.parent = nparent;
        this.root = nparent;
      }
      node = leaf.parent!;
      while (node != null) {
        if (node.child1 == null || node.height < 2) {
          node = node;
        } else {
          const b3 = node.child1;
          const c = node.child2!;
          const balance = c.height - b3.height;
          if (balance > 1) {
            const f = c.child1!;
            const g = c.child2!;
            c.child1 = node;
            c.parent = node.parent;
            node.parent = c;
            if (c.parent != null) {
              if (c.parent.child1 == node) {
                c.parent.child1 = c;
              } else {
                c.parent.child2 = c;
              }
            } else {
              this.root = c;
            }
            if (f.height > g.height) {
              c.child2 = f;
              node.child2 = g;
              g.parent = node;
              const _this12 = node.aabb!;
              const a1 = b3.aabb!;
              const b4 = g.aabb!;
              _this12.minx = a1.minx < b4.minx ? a1.minx : b4.minx;
              _this12.miny = a1.miny < b4.miny ? a1.miny : b4.miny;
              _this12.maxx = a1.maxx > b4.maxx ? a1.maxx : b4.maxx;
              _this12.maxy = a1.maxy > b4.maxy ? a1.maxy : b4.maxy;
              const _this13 = c.aabb!;
              const a2 = node.aabb!;
              const b5 = f.aabb!;
              _this13.minx = a2.minx < b5.minx ? a2.minx : b5.minx;
              _this13.miny = a2.miny < b5.miny ? a2.miny : b5.miny;
              _this13.maxx = a2.maxx > b5.maxx ? a2.maxx : b5.maxx;
              _this13.maxy = a2.maxy > b5.maxy ? a2.maxy : b5.maxy;
              const x = b3.height;
              const y = g.height;
              node.height = 1 + (x > y ? x : y);
              const x1 = node.height;
              const y1 = f.height;
              c.height = 1 + (x1 > y1 ? x1 : y1);
            } else {
              c.child2 = g;
              node.child2 = f;
              f.parent = node;
              const _this14 = node.aabb!;
              const a3 = b3.aabb!;
              const b6 = f.aabb!;
              _this14.minx = a3.minx < b6.minx ? a3.minx : b6.minx;
              _this14.miny = a3.miny < b6.miny ? a3.miny : b6.miny;
              _this14.maxx = a3.maxx > b6.maxx ? a3.maxx : b6.maxx;
              _this14.maxy = a3.maxy > b6.maxy ? a3.maxy : b6.maxy;
              const _this15 = c.aabb!;
              const a4 = node.aabb!;
              const b7 = g.aabb!;
              _this15.minx = a4.minx < b7.minx ? a4.minx : b7.minx;
              _this15.miny = a4.miny < b7.miny ? a4.miny : b7.miny;
              _this15.maxx = a4.maxx > b7.maxx ? a4.maxx : b7.maxx;
              _this15.maxy = a4.maxy > b7.maxy ? a4.maxy : b7.maxy;
              const x2 = b3.height;
              const y2 = f.height;
              node.height = 1 + (x2 > y2 ? x2 : y2);
              const x3 = node.height;
              const y3 = g.height;
              c.height = 1 + (x3 > y3 ? x3 : y3);
            }
            node = c;
          } else if (balance < -1) {
            const f1 = b3.child1!;
            const g1 = b3.child2!;
            b3.child1 = node;
            b3.parent = node.parent;
            node.parent = b3;
            if (b3.parent != null) {
              if (b3.parent.child1 == node) {
                b3.parent.child1 = b3;
              } else {
                b3.parent.child2 = b3;
              }
            } else {
              this.root = b3;
            }
            if (f1.height > g1.height) {
              b3.child2 = f1;
              node.child1 = g1;
              g1.parent = node;
              const _this16 = node.aabb!;
              const a5 = c.aabb!;
              const b8 = g1.aabb!;
              _this16.minx = a5.minx < b8.minx ? a5.minx : b8.minx;
              _this16.miny = a5.miny < b8.miny ? a5.miny : b8.miny;
              _this16.maxx = a5.maxx > b8.maxx ? a5.maxx : b8.maxx;
              _this16.maxy = a5.maxy > b8.maxy ? a5.maxy : b8.maxy;
              const _this17 = b3.aabb!;
              const a6 = node.aabb!;
              const b9 = f1.aabb!;
              _this17.minx = a6.minx < b9.minx ? a6.minx : b9.minx;
              _this17.miny = a6.miny < b9.miny ? a6.miny : b9.miny;
              _this17.maxx = a6.maxx > b9.maxx ? a6.maxx : b9.maxx;
              _this17.maxy = a6.maxy > b9.maxy ? a6.maxy : b9.maxy;
              const x4 = c.height;
              const y4 = g1.height;
              node.height = 1 + (x4 > y4 ? x4 : y4);
              const x5 = node.height;
              const y5 = f1.height;
              b3.height = 1 + (x5 > y5 ? x5 : y5);
            } else {
              b3.child2 = g1;
              node.child1 = f1;
              f1.parent = node;
              const _this18 = node.aabb!;
              const a7 = c.aabb!;
              const b10 = f1.aabb!;
              _this18.minx = a7.minx < b10.minx ? a7.minx : b10.minx;
              _this18.miny = a7.miny < b10.miny ? a7.miny : b10.miny;
              _this18.maxx = a7.maxx > b10.maxx ? a7.maxx : b10.maxx;
              _this18.maxy = a7.maxy > b10.maxy ? a7.maxy : b10.maxy;
              const _this19 = b3.aabb!;
              const a8 = node.aabb!;
              const b11 = g1.aabb!;
              _this19.minx = a8.minx < b11.minx ? a8.minx : b11.minx;
              _this19.miny = a8.miny < b11.miny ? a8.miny : b11.miny;
              _this19.maxx = a8.maxx > b11.maxx ? a8.maxx : b11.maxx;
              _this19.maxy = a8.maxy > b11.maxy ? a8.maxy : b11.maxy;
              const x6 = c.height;
              const y6 = f1.height;
              node.height = 1 + (x6 > y6 ? x6 : y6);
              const x7 = node.height;
              const y7 = g1.height;
              b3.height = 1 + (x7 > y7 ? x7 : y7);
            }
            node = b3;
          } else {
            node = node;
          }
        }
        const child11 = node.child1!;
        const child21 = node.child2!;
        const x8 = child11.height;
        const y8 = child21.height;
        node.height = 1 + (x8 > y8 ? x8 : y8);
        const _this20 = node.aabb!;
        const a9 = child11.aabb!;
        const b12 = child21.aabb!;
        _this20.minx = a9.minx < b12.minx ? a9.minx : b12.minx;
        _this20.miny = a9.miny < b12.miny ? a9.miny : b12.miny;
        _this20.maxx = a9.maxx > b12.maxx ? a9.maxx : b12.maxx;
        _this20.maxy = a9.maxy > b12.maxy ? a9.maxy : b12.maxy;
        node = node.parent!;
      }
    }
  }

  // ========== removeLeaf ==========

  removeLeaf(leaf: ZPP_AABBNode): void {
    if (leaf == this.root) {
      this.root = null;
    } else {
      const parent = leaf.parent!;
      const gparent = parent.parent;
      const sibling = parent.child1 == leaf ? parent.child2! : parent.child1!;
      if (gparent != null) {
        if (gparent.child1 == parent) {
          gparent.child1 = sibling;
        } else {
          gparent.child2 = sibling;
        }
        sibling.parent = gparent;
        const o = parent;
        o.height = -1;
        const o1 = o.aabb!;
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
        let node: ZPP_AABBNode | null = gparent;
        while (node != null) {
          if (node.child1 == null || node.height < 2) {
            node = node;
          } else {
            const b = node.child1;
            const c = node.child2!;
            const balance = c.height - b.height;
            if (balance > 1) {
              const f = c.child1!;
              const g = c.child2!;
              c.child1 = node;
              c.parent = node.parent;
              node.parent = c;
              if (c.parent != null) {
                if (c.parent.child1 == node) {
                  c.parent.child1 = c;
                } else {
                  c.parent.child2 = c;
                }
              } else {
                this.root = c;
              }
              if (f.height > g.height) {
                c.child2 = f;
                node.child2 = g;
                g.parent = node;
                const _this = node.aabb!;
                const a = b.aabb!;
                const b1 = g.aabb!;
                _this.minx = a.minx < b1.minx ? a.minx : b1.minx;
                _this.miny = a.miny < b1.miny ? a.miny : b1.miny;
                _this.maxx = a.maxx > b1.maxx ? a.maxx : b1.maxx;
                _this.maxy = a.maxy > b1.maxy ? a.maxy : b1.maxy;
                const _this1 = c.aabb!;
                const a1 = node.aabb!;
                const b2 = f.aabb!;
                _this1.minx = a1.minx < b2.minx ? a1.minx : b2.minx;
                _this1.miny = a1.miny < b2.miny ? a1.miny : b2.miny;
                _this1.maxx = a1.maxx > b2.maxx ? a1.maxx : b2.maxx;
                _this1.maxy = a1.maxy > b2.maxy ? a1.maxy : b2.maxy;
                const x = b.height;
                const y = g.height;
                node.height = 1 + (x > y ? x : y);
                const x1 = node.height;
                const y1 = f.height;
                c.height = 1 + (x1 > y1 ? x1 : y1);
              } else {
                c.child2 = g;
                node.child2 = f;
                f.parent = node;
                const _this2 = node.aabb!;
                const a2 = b.aabb!;
                const b3 = f.aabb!;
                _this2.minx = a2.minx < b3.minx ? a2.minx : b3.minx;
                _this2.miny = a2.miny < b3.miny ? a2.miny : b3.miny;
                _this2.maxx = a2.maxx > b3.maxx ? a2.maxx : b3.maxx;
                _this2.maxy = a2.maxy > b3.maxy ? a2.maxy : b3.maxy;
                const _this3 = c.aabb!;
                const a3 = node.aabb!;
                const b4 = g.aabb!;
                _this3.minx = a3.minx < b4.minx ? a3.minx : b4.minx;
                _this3.miny = a3.miny < b4.miny ? a3.miny : b4.miny;
                _this3.maxx = a3.maxx > b4.maxx ? a3.maxx : b4.maxx;
                _this3.maxy = a3.maxy > b4.maxy ? a3.maxy : b4.maxy;
                const x2 = b.height;
                const y2 = f.height;
                node.height = 1 + (x2 > y2 ? x2 : y2);
                const x3 = node.height;
                const y3 = g.height;
                c.height = 1 + (x3 > y3 ? x3 : y3);
              }
              node = c;
            } else if (balance < -1) {
              const f1 = b.child1!;
              const g1 = b.child2!;
              b.child1 = node;
              b.parent = node.parent;
              node.parent = b;
              if (b.parent != null) {
                if (b.parent.child1 == node) {
                  b.parent.child1 = b;
                } else {
                  b.parent.child2 = b;
                }
              } else {
                this.root = b;
              }
              if (f1.height > g1.height) {
                b.child2 = f1;
                node.child1 = g1;
                g1.parent = node;
                const _this4 = node.aabb!;
                const a4 = c.aabb!;
                const b5 = g1.aabb!;
                _this4.minx = a4.minx < b5.minx ? a4.minx : b5.minx;
                _this4.miny = a4.miny < b5.miny ? a4.miny : b5.miny;
                _this4.maxx = a4.maxx > b5.maxx ? a4.maxx : b5.maxx;
                _this4.maxy = a4.maxy > b5.maxy ? a4.maxy : b5.maxy;
                const _this5 = b.aabb!;
                const a5 = node.aabb!;
                const b6 = f1.aabb!;
                _this5.minx = a5.minx < b6.minx ? a5.minx : b6.minx;
                _this5.miny = a5.miny < b6.miny ? a5.miny : b6.miny;
                _this5.maxx = a5.maxx > b6.maxx ? a5.maxx : b6.maxx;
                _this5.maxy = a5.maxy > b6.maxy ? a5.maxy : b6.maxy;
                const x4 = c.height;
                const y4 = g1.height;
                node.height = 1 + (x4 > y4 ? x4 : y4);
                const x5 = node.height;
                const y5 = f1.height;
                b.height = 1 + (x5 > y5 ? x5 : y5);
              } else {
                b.child2 = g1;
                node.child1 = f1;
                f1.parent = node;
                const _this6 = node.aabb!;
                const a6 = c.aabb!;
                const b7 = f1.aabb!;
                _this6.minx = a6.minx < b7.minx ? a6.minx : b7.minx;
                _this6.miny = a6.miny < b7.miny ? a6.miny : b7.miny;
                _this6.maxx = a6.maxx > b7.maxx ? a6.maxx : b7.maxx;
                _this6.maxy = a6.maxy > b7.maxy ? a6.maxy : b7.maxy;
                const _this7 = b.aabb!;
                const a7 = node.aabb!;
                const b8 = g1.aabb!;
                _this7.minx = a7.minx < b8.minx ? a7.minx : b8.minx;
                _this7.miny = a7.miny < b8.miny ? a7.miny : b8.miny;
                _this7.maxx = a7.maxx > b8.maxx ? a7.maxx : b8.maxx;
                _this7.maxy = a7.maxy > b8.maxy ? a7.maxy : b8.maxy;
                const x6 = c.height;
                const y6 = f1.height;
                node.height = 1 + (x6 > y6 ? x6 : y6);
                const x7 = node.height;
                const y7 = g1.height;
                b.height = 1 + (x7 > y7 ? x7 : y7);
              }
              node = b;
            } else {
              node = node;
            }
          }
          const child1 = node.child1!;
          const child2 = node.child2!;
          const _this8 = node.aabb!;
          const a8 = child1.aabb!;
          const b9 = child2.aabb!;
          _this8.minx = a8.minx < b9.minx ? a8.minx : b9.minx;
          _this8.miny = a8.miny < b9.miny ? a8.miny : b9.miny;
          _this8.maxx = a8.maxx > b9.maxx ? a8.maxx : b9.maxx;
          _this8.maxy = a8.maxy > b9.maxy ? a8.maxy : b9.maxy;
          const x8 = child1.height;
          const y8 = child2.height;
          node.height = 1 + (x8 > y8 ? x8 : y8);
          node = node.parent;
        }
      } else {
        this.root = sibling;
        sibling.parent = null;
        const o2 = parent;
        o2.height = -1;
        const o3 = o2.aabb!;
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
  }

  // ========== inlined_removeLeaf ==========

  inlined_removeLeaf(leaf: ZPP_AABBNode): void {
    if (leaf == this.root) {
      this.root = null;
      return;
    } else {
      const parent = leaf.parent!;
      const gparent = parent.parent;
      const sibling = parent.child1 == leaf ? parent.child2! : parent.child1!;
      if (gparent != null) {
        if (gparent.child1 == parent) {
          gparent.child1 = sibling;
        } else {
          gparent.child2 = sibling;
        }
        sibling.parent = gparent;
        const o = parent;
        o.height = -1;
        const o1 = o.aabb!;
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
        let node: ZPP_AABBNode | null = gparent;
        while (node != null) {
          if (node.child1 == null || node.height < 2) {
            node = node;
          } else {
            const b = node.child1;
            const c = node.child2!;
            const balance = c.height - b.height;
            if (balance > 1) {
              const f = c.child1!;
              const g = c.child2!;
              c.child1 = node;
              c.parent = node.parent;
              node.parent = c;
              if (c.parent != null) {
                if (c.parent.child1 == node) {
                  c.parent.child1 = c;
                } else {
                  c.parent.child2 = c;
                }
              } else {
                this.root = c;
              }
              if (f.height > g.height) {
                c.child2 = f;
                node.child2 = g;
                g.parent = node;
                const _this = node.aabb!;
                const a = b.aabb!;
                const b1 = g.aabb!;
                _this.minx = a.minx < b1.minx ? a.minx : b1.minx;
                _this.miny = a.miny < b1.miny ? a.miny : b1.miny;
                _this.maxx = a.maxx > b1.maxx ? a.maxx : b1.maxx;
                _this.maxy = a.maxy > b1.maxy ? a.maxy : b1.maxy;
                const _this1 = c.aabb!;
                const a1 = node.aabb!;
                const b2 = f.aabb!;
                _this1.minx = a1.minx < b2.minx ? a1.minx : b2.minx;
                _this1.miny = a1.miny < b2.miny ? a1.miny : b2.miny;
                _this1.maxx = a1.maxx > b2.maxx ? a1.maxx : b2.maxx;
                _this1.maxy = a1.maxy > b2.maxy ? a1.maxy : b2.maxy;
                const x = b.height;
                const y = g.height;
                node.height = 1 + (x > y ? x : y);
                const x1 = node.height;
                const y1 = f.height;
                c.height = 1 + (x1 > y1 ? x1 : y1);
              } else {
                c.child2 = g;
                node.child2 = f;
                f.parent = node;
                const _this2 = node.aabb!;
                const a2 = b.aabb!;
                const b3 = f.aabb!;
                _this2.minx = a2.minx < b3.minx ? a2.minx : b3.minx;
                _this2.miny = a2.miny < b3.miny ? a2.miny : b3.miny;
                _this2.maxx = a2.maxx > b3.maxx ? a2.maxx : b3.maxx;
                _this2.maxy = a2.maxy > b3.maxy ? a2.maxy : b3.maxy;
                const _this3 = c.aabb!;
                const a3 = node.aabb!;
                const b4 = g.aabb!;
                _this3.minx = a3.minx < b4.minx ? a3.minx : b4.minx;
                _this3.miny = a3.miny < b4.miny ? a3.miny : b4.miny;
                _this3.maxx = a3.maxx > b4.maxx ? a3.maxx : b4.maxx;
                _this3.maxy = a3.maxy > b4.maxy ? a3.maxy : b4.maxy;
                const x2 = b.height;
                const y2 = f.height;
                node.height = 1 + (x2 > y2 ? x2 : y2);
                const x3 = node.height;
                const y3 = g.height;
                c.height = 1 + (x3 > y3 ? x3 : y3);
              }
              node = c;
            } else if (balance < -1) {
              const f1 = b.child1!;
              const g1 = b.child2!;
              b.child1 = node;
              b.parent = node.parent;
              node.parent = b;
              if (b.parent != null) {
                if (b.parent.child1 == node) {
                  b.parent.child1 = b;
                } else {
                  b.parent.child2 = b;
                }
              } else {
                this.root = b;
              }
              if (f1.height > g1.height) {
                b.child2 = f1;
                node.child1 = g1;
                g1.parent = node;
                const _this4 = node.aabb!;
                const a4 = c.aabb!;
                const b5 = g1.aabb!;
                _this4.minx = a4.minx < b5.minx ? a4.minx : b5.minx;
                _this4.miny = a4.miny < b5.miny ? a4.miny : b5.miny;
                _this4.maxx = a4.maxx > b5.maxx ? a4.maxx : b5.maxx;
                _this4.maxy = a4.maxy > b5.maxy ? a4.maxy : b5.maxy;
                const _this5 = b.aabb!;
                const a5 = node.aabb!;
                const b6 = f1.aabb!;
                _this5.minx = a5.minx < b6.minx ? a5.minx : b6.minx;
                _this5.miny = a5.miny < b6.miny ? a5.miny : b6.miny;
                _this5.maxx = a5.maxx > b6.maxx ? a5.maxx : b6.maxx;
                _this5.maxy = a5.maxy > b6.maxy ? a5.maxy : b6.maxy;
                const x4 = c.height;
                const y4 = g1.height;
                node.height = 1 + (x4 > y4 ? x4 : y4);
                const x5 = node.height;
                const y5 = f1.height;
                b.height = 1 + (x5 > y5 ? x5 : y5);
              } else {
                b.child2 = g1;
                node.child1 = f1;
                f1.parent = node;
                const _this6 = node.aabb!;
                const a6 = c.aabb!;
                const b7 = f1.aabb!;
                _this6.minx = a6.minx < b7.minx ? a6.minx : b7.minx;
                _this6.miny = a6.miny < b7.miny ? a6.miny : b7.miny;
                _this6.maxx = a6.maxx > b7.maxx ? a6.maxx : b7.maxx;
                _this6.maxy = a6.maxy > b7.maxy ? a6.maxy : b7.maxy;
                const _this7 = b.aabb!;
                const a7 = node.aabb!;
                const b8 = g1.aabb!;
                _this7.minx = a7.minx < b8.minx ? a7.minx : b8.minx;
                _this7.miny = a7.miny < b8.miny ? a7.miny : b8.miny;
                _this7.maxx = a7.maxx > b8.maxx ? a7.maxx : b8.maxx;
                _this7.maxy = a7.maxy > b8.maxy ? a7.maxy : b8.maxy;
                const x6 = c.height;
                const y6 = f1.height;
                node.height = 1 + (x6 > y6 ? x6 : y6);
                const x7 = node.height;
                const y7 = g1.height;
                b.height = 1 + (x7 > y7 ? x7 : y7);
              }
              node = b;
            } else {
              node = node;
            }
          }
          const child1 = node.child1!;
          const child2 = node.child2!;
          const _this8 = node.aabb!;
          const a8 = child1.aabb!;
          const b9 = child2.aabb!;
          _this8.minx = a8.minx < b9.minx ? a8.minx : b9.minx;
          _this8.miny = a8.miny < b9.miny ? a8.miny : b9.miny;
          _this8.maxx = a8.maxx > b9.maxx ? a8.maxx : b9.maxx;
          _this8.maxy = a8.maxy > b9.maxy ? a8.maxy : b9.maxy;
          const x8 = child1.height;
          const y8 = child2.height;
          node.height = 1 + (x8 > y8 ? x8 : y8);
          node = node.parent;
        }
      } else {
        this.root = sibling;
        sibling.parent = null;
        const o2 = parent;
        o2.height = -1;
        const o3 = o2.aabb!;
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
  }

  // ========== balance ==========

  balance(a: ZPP_AABBNode): ZPP_AABBNode {
    if (a.child1 == null || a.height < 2) {
      return a;
    } else {
      const b = a.child1;
      const c = a.child2!;
      const balance = c.height - b.height;
      if (balance > 1) {
        const f = c.child1!;
        const g = c.child2!;
        c.child1 = a;
        c.parent = a.parent;
        a.parent = c;
        if (c.parent != null) {
          if (c.parent.child1 == a) {
            c.parent.child1 = c;
          } else {
            c.parent.child2 = c;
          }
        } else {
          this.root = c;
        }
        if (f.height > g.height) {
          c.child2 = f;
          a.child2 = g;
          g.parent = a;
          const _this = a.aabb!;
          const a1 = b.aabb!;
          const b1 = g.aabb!;
          _this.minx = a1.minx < b1.minx ? a1.minx : b1.minx;
          _this.miny = a1.miny < b1.miny ? a1.miny : b1.miny;
          _this.maxx = a1.maxx > b1.maxx ? a1.maxx : b1.maxx;
          _this.maxy = a1.maxy > b1.maxy ? a1.maxy : b1.maxy;
          const _this1 = c.aabb!;
          const a2 = a.aabb!;
          const b2 = f.aabb!;
          _this1.minx = a2.minx < b2.minx ? a2.minx : b2.minx;
          _this1.miny = a2.miny < b2.miny ? a2.miny : b2.miny;
          _this1.maxx = a2.maxx > b2.maxx ? a2.maxx : b2.maxx;
          _this1.maxy = a2.maxy > b2.maxy ? a2.maxy : b2.maxy;
          const x = b.height;
          const y = g.height;
          a.height = 1 + (x > y ? x : y);
          const x1 = a.height;
          const y1 = f.height;
          c.height = 1 + (x1 > y1 ? x1 : y1);
        } else {
          c.child2 = g;
          a.child2 = f;
          f.parent = a;
          const _this2 = a.aabb!;
          const a3 = b.aabb!;
          const b3 = f.aabb!;
          _this2.minx = a3.minx < b3.minx ? a3.minx : b3.minx;
          _this2.miny = a3.miny < b3.miny ? a3.miny : b3.miny;
          _this2.maxx = a3.maxx > b3.maxx ? a3.maxx : b3.maxx;
          _this2.maxy = a3.maxy > b3.maxy ? a3.maxy : b3.maxy;
          const _this3 = c.aabb!;
          const a4 = a.aabb!;
          const b4 = g.aabb!;
          _this3.minx = a4.minx < b4.minx ? a4.minx : b4.minx;
          _this3.miny = a4.miny < b4.miny ? a4.miny : b4.miny;
          _this3.maxx = a4.maxx > b4.maxx ? a4.maxx : b4.maxx;
          _this3.maxy = a4.maxy > b4.maxy ? a4.maxy : b4.maxy;
          const x2 = b.height;
          const y2 = f.height;
          a.height = 1 + (x2 > y2 ? x2 : y2);
          const x3 = a.height;
          const y3 = g.height;
          c.height = 1 + (x3 > y3 ? x3 : y3);
        }
        return c;
      } else if (balance < -1) {
        const f1 = b.child1!;
        const g1 = b.child2!;
        b.child1 = a;
        b.parent = a.parent;
        a.parent = b;
        if (b.parent != null) {
          if (b.parent.child1 == a) {
            b.parent.child1 = b;
          } else {
            b.parent.child2 = b;
          }
        } else {
          this.root = b;
        }
        if (f1.height > g1.height) {
          b.child2 = f1;
          a.child1 = g1;
          g1.parent = a;
          const _this4 = a.aabb!;
          const a5 = c.aabb!;
          const b5 = g1.aabb!;
          _this4.minx = a5.minx < b5.minx ? a5.minx : b5.minx;
          _this4.miny = a5.miny < b5.miny ? a5.miny : b5.miny;
          _this4.maxx = a5.maxx > b5.maxx ? a5.maxx : b5.maxx;
          _this4.maxy = a5.maxy > b5.maxy ? a5.maxy : b5.maxy;
          const _this5 = b.aabb!;
          const a6 = a.aabb!;
          const b6 = f1.aabb!;
          _this5.minx = a6.minx < b6.minx ? a6.minx : b6.minx;
          _this5.miny = a6.miny < b6.miny ? a6.miny : b6.miny;
          _this5.maxx = a6.maxx > b6.maxx ? a6.maxx : b6.maxx;
          _this5.maxy = a6.maxy > b6.maxy ? a6.maxy : b6.maxy;
          const x4 = c.height;
          const y4 = g1.height;
          a.height = 1 + (x4 > y4 ? x4 : y4);
          const x5 = a.height;
          const y5 = f1.height;
          b.height = 1 + (x5 > y5 ? x5 : y5);
        } else {
          b.child2 = g1;
          a.child1 = f1;
          f1.parent = a;
          const _this6 = a.aabb!;
          const a7 = c.aabb!;
          const b7 = f1.aabb!;
          _this6.minx = a7.minx < b7.minx ? a7.minx : b7.minx;
          _this6.miny = a7.miny < b7.miny ? a7.miny : b7.miny;
          _this6.maxx = a7.maxx > b7.maxx ? a7.maxx : b7.maxx;
          _this6.maxy = a7.maxy > b7.maxy ? a7.maxy : b7.maxy;
          const _this7 = b.aabb!;
          const a8 = a.aabb!;
          const b8 = g1.aabb!;
          _this7.minx = a8.minx < b8.minx ? a8.minx : b8.minx;
          _this7.miny = a8.miny < b8.miny ? a8.miny : b8.miny;
          _this7.maxx = a8.maxx > b8.maxx ? a8.maxx : b8.maxx;
          _this7.maxy = a8.maxy > b8.maxy ? a8.maxy : b8.maxy;
          const x6 = c.height;
          const y6 = f1.height;
          a.height = 1 + (x6 > y6 ? x6 : y6);
          const x7 = a.height;
          const y7 = g1.height;
          b.height = 1 + (x7 > y7 ? x7 : y7);
        }
        return b;
      } else {
        return a;
      }
    }
  }
}
