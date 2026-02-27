/**
 * ZPP_Math — Internal math utilities for the nape physics engine.
 *
 * Provides sqrt, inverse sqrt, square, and clamping functions.
 *
 * Converted from nape-compiled.js lines 127059–127090.
 */

type Any = any;

export class ZPP_Math {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "util", "ZPP_Math"];

  static sqrt(x: number): number {
    return Math.sqrt(x);
  }

  static invsqrt(x: number): number {
    return 1.0 / Math.sqrt(x);
  }

  static sqr(x: number): number {
    return x * x;
  }

  static clamp2(x: number, a: number): number {
    const a1 = -a;
    if (x < a1) return a1;
    else if (x > a) return a;
    else return x;
  }

  static clamp(x: number, a: number, b: number): number {
    if (x < a) return a;
    else if (x > b) return b;
    else return x;
  }

  __class__: Any = ZPP_Math;
}
