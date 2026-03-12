/**
 * ZPP_SweepData — Internal sweep-and-prune axis data for broadphase.
 *
 * Stores AABB + shape reference for sweep-and-prune broadphase ordering.
 * Doubly-linked list node with prev/next pointers.
 *
 * Converted from nape-compiled.js lines 47755–47781.
 */

export class ZPP_SweepData {
  // --- Static: Haxe metadata ---

  // --- Static: object pool ---
  static zpp_pool: ZPP_SweepData | null = null;

  // --- Instance fields ---
  aabb: any = null; // ZPP_AABB — circular
  shape: any = null; // ZPP_Shape — circular
  prev: ZPP_SweepData | null = null;
  next: ZPP_SweepData | null = null;

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
