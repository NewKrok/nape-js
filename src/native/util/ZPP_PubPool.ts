/**
 * ZPP_PubPool — Public object pool namespace for the nape physics engine.
 *
 * Holds static references to pooled public-API objects (Vec2, Vec3, GeomPoly).
 * Each pool is a singly-linked free list with a "next" lookahead pointer.
 *
 * Converted from nape-compiled.js lines 127704–127707, 133961–133966.
 */

type Any = any;

export class ZPP_PubPool {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "util", "ZPP_PubPool"];

  // --- Static: pool heads and lookaheads ---
  static poolGeomPoly: Any = null;
  static nextGeomPoly: Any = null;
  static poolVec2: Any = null;
  static nextVec2: Any = null;
  static poolVec3: Any = null;
  static nextVec3: Any = null;

  __class__: Any = ZPP_PubPool;
}
