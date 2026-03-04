/**
 * ZPP_AABBNode — Internal AABB tree node for dynamic broadphase.
 *
 * Each node stores an AABB, optional shape reference (leaf nodes),
 * parent/child tree pointers, and height for balancing.
 * Also has moved/synced tracking for incremental updates.
 *
 * Converted from nape-compiled.js lines 26990–27055.
 */

import { ZPP_AABB } from "../geom/ZPP_AABB";

type Any = any;

export class ZPP_AABBNode {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_AABBNode"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_AABBNode | null = null;

  // --- Instance: AABB and shape ---
  aabb: ZPP_AABB | null = null;
  shape: Any = null;
  dyn = false;

  // --- Instance: tree structure ---
  parent: ZPP_AABBNode | null = null;
  child1: ZPP_AABBNode | null = null;
  child2: ZPP_AABBNode | null = null;
  height = -1;

  // --- Instance: raycasting temp ---
  rayt = 0.0;

  // --- Instance: linked list (pool) ---
  next: ZPP_AABBNode | null = null;

  // --- Instance: moved tracking ---
  mnext: ZPP_AABBNode | null = null;
  moved = false;

  // --- Instance: sync tracking ---
  snext: ZPP_AABBNode | null = null;
  synced = false;
  first_sync = false;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_AABBNode;

  // ========== Pool callbacks ==========

  alloc(): void {
    if (ZPP_AABB.zpp_pool == null) {
      this.aabb = new ZPP_AABB();
    } else {
      this.aabb = ZPP_AABB.zpp_pool;
      ZPP_AABB.zpp_pool = this.aabb.next;
      this.aabb.next = null;
    }
    this.moved = false;
    this.synced = false;
    this.first_sync = false;
  }

  free(): void {
    this.height = -1;
    const o = this.aabb!;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o.wrap_min = o.wrap_max = null;
    o._invalidate = null;
    o._validate = null;
    o.next = ZPP_AABB.zpp_pool;
    ZPP_AABB.zpp_pool = o;
    this.child1 = this.child2 = this.parent = null;
    this.next = null;
    this.snext = null;
    this.mnext = null;
  }

  // ========== Leaf check ==========

  isLeaf(): boolean {
    return this.child1 == null;
  }
}
