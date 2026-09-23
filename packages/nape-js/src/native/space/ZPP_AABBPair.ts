/**
 * ZPP_AABBPair — Internal AABB broadphase pair for tracking potential collisions.
 *
 * Stores references to two AABB nodes (n1, n2), an arbiter reference,
 * and pair identification (id, di). Used by ZPP_DynAABBPhase.
 */

export class ZPP_AABBPair {
  // --- Static: object pool ---
  static zpp_pool: ZPP_AABBPair | null = null;

  // --- Instance fields ---
  n1: any = null; // ZPP_AABBNode — circular
  n2: any = null; // ZPP_AABBNode — circular
  first = false;
  sleeping = false;
  id = 0;
  di = 0;
  arb: any = null; // ZPP_Arbiter — circular
  next: ZPP_AABBPair | null = null;
  /** Previous pointer in the global broadphase pairs list (doubly-linked for O(1) removal). */
  gprev: ZPP_AABBPair | null = null;

  // ========== Pool callbacks ==========

  free(): void {
    this.n1 = this.n2 = null;
    this.sleeping = false;
    this.gprev = null;
  }
}
