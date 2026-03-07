/**
 * ZPP_VecMath — Static vector math utilities for the nape physics engine.
 *
 * Provides distance calculations between 2D points.
 *
 * Converted from nape-compiled.js lines 40101–40118.
 */

export class ZPP_VecMath {
  static __name__ = ["zpp_nape", "geom", "ZPP_VecMath"];

  /** Squared distance between two 2D points. */
  static vec_dsq(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  /** Euclidean distance between two 2D points. */
  static vec_distance(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
