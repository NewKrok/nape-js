/**
 * ZPP_Vec3 — Internal 3D vector for the nape physics engine.
 *
 * Simple x, y, z data container with optional validation callback.
 * Used internally for constraint anchor points and similar 3-component values.
 *
 * Converted from nape-compiled.js lines 83412–83434.
 */

export class ZPP_Vec3 {
  // --- Static: Haxe metadata ---

  // --- Static: namespace references ---
  static _zpp: object | null = null;

  // --- Static: wrapper factory callback (set by public Vec3 class) ---
  static _wrapFn: ((zpp: ZPP_Vec3) => any) | null = null;

  // --- Instance ---
  outer: object | null = null;
  x = 0.0;
  y = 0.0;
  z = 0.0;
  immutable = false;
  _validate: (() => void) | null = null;

  validate(): void {
    if (this._validate != null) this._validate();
  }

  wrapper(): any {
    if (this.outer == null) {
      if (ZPP_Vec3._wrapFn) {
        this.outer = ZPP_Vec3._wrapFn(this);
      }
    }
    return this.outer;
  }
}
