/**
 * ZPP_AABBPair — Internal AABB broadphase pair for tracking potential collisions.
 *
 * Stores references to two AABB nodes (n1, n2), an arbiter reference,
 * and pair identification (id, di). Used by ZPP_DynAABBPhase.
 *
 * Converted from nape-compiled.js lines 27056–27081.
 */

export class ZPP_AABBPair {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_AABBPair"];

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

  // ========== Pool callbacks ==========

  alloc(): void {}

  free(): void {
    this.n1 = this.n2 = null;
    this.sleeping = false;
  }
}
