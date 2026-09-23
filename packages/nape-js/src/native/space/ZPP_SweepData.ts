/**
 * ZPP_SweepData — Internal sweep-and-prune axis data for broadphase.
 *
 * Stores AABB + shape reference for sweep-and-prune broadphase ordering.
 * Doubly-linked list node with prev/next pointers.
 */

export class ZPP_SweepData {
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

  // ========== Comparison ==========

  gt(x: ZPP_SweepData): boolean {
    return this.aabb.minx > x.aabb.minx;
  }
}
