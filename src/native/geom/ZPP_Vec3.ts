/**
 * ZPP_Vec3 — Internal 3D vector for the nape physics engine.
 *
 * Simple x, y, z data container with optional validation callback.
 * Used internally for constraint anchor points and similar 3-component values.
 *
 * Converted from nape-compiled.js lines 83412–83434.
 */

type Any = any;

export class ZPP_Vec3 {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_Vec3"];

  // --- Static: namespace references ---
  static _zpp: Any = null;

  // --- Static: wrapper factory callback (set by public Vec3 class) ---
  static _wrapFn: ((zpp: ZPP_Vec3) => Any) | null = null;

  // --- Instance ---
  outer: Any = null;
  x = 0.0;
  y = 0.0;
  z = 0.0;
  immutable = false;
  _validate: (() => void) | null = null;

  __class__: Any = ZPP_Vec3;

  validate(): void {
    if (this._validate != null) this._validate();
  }

  wrapper(): Any {
    if (this.outer == null) {
      if (ZPP_Vec3._wrapFn) {
        this.outer = ZPP_Vec3._wrapFn(this);
      }
    }
    return this.outer;
  }
}
