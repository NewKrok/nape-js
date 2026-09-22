/**
 * ZPP_MarchSpan — Internal marching squares span data for the nape physics engine.
 *
 * Union-find data structure node used by the marching squares algorithm.
 */

export class ZPP_MarchSpan {
  // --- Static: object pool ---
  static zpp_pool: ZPP_MarchSpan | null = null;

  // --- Instance ---
  parent: ZPP_MarchSpan;
  rank = 0;
  out = false;
  next: ZPP_MarchSpan | null = null;

  constructor() {
    this.parent = this;
  }

  free(): void {
    this.parent = this;
  }

  alloc(): void {
    this.out = false;
    this.rank = 0;
  }
}
