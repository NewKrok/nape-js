/**
 * ZPP_Const — Internal constants for the nape physics engine.
 *
 * Provides FMAX (large finite limit), POSINF (+Infinity), and NEGINF (-Infinity).
 *
 * Converted from nape-compiled.js lines 44574–44582, 133195.
 */

type Any = any;

export class ZPP_Const {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "ZPP_Const"];

  // --- Static: constants ---
  static FMAX = 1e100;

  static POSINF(): number {
    return Infinity;
  }

  static NEGINF(): number {
    return -Infinity;
  }

  __class__: Any = ZPP_Const;
}
