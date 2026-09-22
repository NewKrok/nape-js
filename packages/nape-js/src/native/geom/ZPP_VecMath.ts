/**
 * ZPP_VecMath — Static vector math utilities for the nape physics engine.
 *
 * Provides distance calculations between 2D points.
 */

export class ZPP_VecMath {
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
