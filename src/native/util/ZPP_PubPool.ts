/**
 * ZPP_PubPool — Public object pool namespace for the nape physics engine.
 *
 * Holds static references to pooled public-API objects (Vec2, Vec3, GeomPoly).
 * Each pool is a singly-linked free list with a "next" lookahead pointer.
 *
 * Converted from nape-compiled.js lines 127704–127707, 133961–133966.
 */

export class ZPP_PubPool {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "util", "ZPP_PubPool"];

  // --- Static: pool heads and lookaheads ---
  // Typed as `any` to avoid circular imports; concrete type is always a public API class.
  static poolGeomPoly: any = null;
  static nextGeomPoly: any = null;
  static poolVec2: any = null;
  static nextVec2: any = null;
  static poolVec3: any = null;
  static nextVec3: any = null;
}
