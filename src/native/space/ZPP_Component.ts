/**
 * ZPP_Component — Internal union-find component for island detection.
 *
 * Used by the physics engine to group connected bodies/constraints
 * into islands for sleeping/waking. Uses union-find (disjoint set)
 * with rank-based merging.
 *
 * Converted from nape-compiled.js lines 33540–33585.
 */

type Any = any;

export class ZPP_Component {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_Component"];

  // --- Static: object pool ---
  static zpp_pool: ZPP_Component | null = null;

  // --- Instance: linked list ---
  next: ZPP_Component | null = null;

  // --- Instance: union-find ---
  parent: ZPP_Component = this;
  rank = 0;

  // --- Instance: body/constraint reference ---
  isBody = false;
  body: Any = null;
  constraint: Any = null;

  // --- Instance: island reference ---
  island: Any = null;

  // --- Instance: sleeping/waking state ---
  sleeping = false;
  waket = 0;
  woken = false;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_Component;

  // ========== Pool callbacks ==========

  free(): void {
    this.body = null;
    this.constraint = null;
  }

  alloc(): void {}

  // ========== Reset ==========

  reset(): void {
    this.sleeping = false;
    this.island = null;
    this.parent = this;
    this.rank = 0;
  }
}
