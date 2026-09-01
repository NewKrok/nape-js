/**
 * ZPP_Geom — Internal shape geometry validation for the nape physics engine.
 *
 * Validates and updates shape global axes, vertices, edges, AABBs, and world COMs.
 *
 * Converted from nape-compiled.js lines 26135–26462.
 */

export class ZPP_Geom {
  /** Validate and update all derived geometry for a shape. */
  static validateShape(s: any): void {
    if (s.type == 1) {
      s.polygon.validate_gaxi();
    }
    s.validate_aabb();
    s.validate_worldCOM();
  }
}
