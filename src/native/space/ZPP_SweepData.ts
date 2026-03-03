/**
 * ZPP_SweepData — Internal sweep-and-prune axis data for broadphase.
 *
 * Stores AABB + shape reference for sweep-and-prune broadphase ordering.
 * Doubly-linked list node with prev/next pointers.
 *
 * Converted from nape-compiled.js lines 47755–47781.
 */

type Any = any;

export class ZPP_SweepData {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_SweepData"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_SweepData | null = null;

  // --- Instance fields ---
  aabb: Any = null;
  shape: Any = null;
  prev: ZPP_SweepData | null = null;
  next: ZPP_SweepData | null = null;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_SweepData;

  // ========== Pool callbacks ==========

  free(): void {
    this.prev = null;
    this.shape = null;
    this.aabb = null;
  }

  alloc(): void {}

  // ========== Comparison ==========

  gt(x: ZPP_SweepData): boolean {
    return this.aabb.minx > x.aabb.minx;
  }
}
