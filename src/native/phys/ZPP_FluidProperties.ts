/**
 * ZPP_FluidProperties — Internal fluid properties for the nape physics engine.
 *
 * Stores density, viscosity, and per-fluid gravity override.
 * Manages the list of shapes that reference these properties for invalidation.
 *
 * Converted from nape-compiled.js lines 87335–87523, 135403.
 */

type Any = any;

export class ZPP_FluidProperties {
  // --- Static: object pool ---
  static zpp_pool: ZPP_FluidProperties | null = null;

  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "phys", "ZPP_FluidProperties"];

  // --- Static: namespace references (set by compiled module) ---
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Static: wrapper factory callback (set by FluidProperties.ts) ---
  static _wrapFn: ((zpp: ZPP_FluidProperties) => Any) | null = null;

  // --- Instance: fluid properties ---
  viscosity = 1;
  density = 1;
  gravityx = 0;
  gravityy = 0;
  wrap_gravity: Any = null;

  // --- Instance: shape tracking ---
  shapes: Any = null;
  wrap_shapes: Any = null;

  // --- Instance: public API wrapper ---
  outer: Any = null;

  // --- Instance: user data ---
  userData: Any = null;

  // --- Instance: pool linked list ---
  next: ZPP_FluidProperties | null = null;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_FluidProperties;

  constructor() {
    this.shapes = new ZPP_FluidProperties._zpp.util.ZNPList_ZPP_Shape();
  }

  /** Create/return the public nape.phys.FluidProperties wrapper. */
  wrapper(): Any {
    if (this.outer == null) {
      if (ZPP_FluidProperties._wrapFn) {
        this.outer = ZPP_FluidProperties._wrapFn(this);
      } else {
        this.outer = new ZPP_FluidProperties._nape.phys.FluidProperties();
        const o = this.outer.zpp_inner;
        o.outer = null;
        o.next = ZPP_FluidProperties.zpp_pool;
        ZPP_FluidProperties.zpp_pool = o;
        this.outer.zpp_inner = this;
      }
    }
    return this.outer;
  }

  free(): void {
    this.outer = null;
  }

  alloc(): void {}

  feature_cons(): void {
    this.shapes = new ZPP_FluidProperties._zpp.util.ZNPList_ZPP_Shape();
  }

  addShape(shape: Any): void {
    this.shapes.add(shape);
  }

  remShape(shape: Any): void {
    this.shapes.remove(shape);
  }

  /** Copy with object pooling. */
  copy(): ZPP_FluidProperties {
    let ret: ZPP_FluidProperties;
    if (ZPP_FluidProperties.zpp_pool == null) {
      ret = new ZPP_FluidProperties();
    } else {
      ret = ZPP_FluidProperties.zpp_pool;
      ZPP_FluidProperties.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.viscosity = this.viscosity;
    ret.density = this.density;
    return ret;
  }

  /** Called when gravity Vec2 wrapper is invalidated (user set new gravity). */
  gravity_invalidate(x: Any): void {
    this.gravityx = x.x;
    this.gravityy = x.y;
    this.invalidate();
  }

  /** Sync the gravity Vec2 wrapper with internal values. */
  gravity_validate(): void {
    this.wrap_gravity.zpp_inner.x = this.gravityx;
    this.wrap_gravity.zpp_inner.y = this.gravityy;
  }

  /** Lazily create and return the gravity Vec2 wrapper. */
  getgravity(): void {
    const zpp = ZPP_FluidProperties._zpp;
    const napeNs = ZPP_FluidProperties._nape;

    const x = this.gravityx ?? 0;
    const y = this.gravityy ?? 0;

    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }

    // Get or create a Vec2 from the public pool
    let ret: Any;
    if (zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new napeNs.geom.Vec2();
    } else {
      ret = zpp.util.ZPP_PubPool.poolVec2;
      zpp.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == zpp.util.ZPP_PubPool.nextVec2) {
        zpp.util.ZPP_PubPool.nextVec2 = null;
      }
    }

    if (ret.zpp_inner == null) {
      // Create inner Vec2
      let ret1: Any;
      if (zpp.geom.ZPP_Vec2.zpp_pool == null) {
        ret1 = new zpp.geom.ZPP_Vec2();
      } else {
        ret1 = zpp.geom.ZPP_Vec2.zpp_pool;
        zpp.geom.ZPP_Vec2.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.weak = false;
      ret1._immutable = false;
      ret1.x = x;
      ret1.y = y;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      // Reuse existing inner Vec2
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const inner = ret.zpp_inner;
      if (inner._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (inner._isimmutable != null) {
        inner._isimmutable();
      }
      if (x !== x || y !== y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }

      // Check if values actually changed
      let needsUpdate = false;
      if (inner._validate != null) {
        inner._validate();
      }
      if (inner.x !== x || inner.y !== y) {
        needsUpdate = true;
      }
      if (needsUpdate) {
        inner.x = x;
        inner.y = y;
        if (inner._invalidate != null) {
          inner._invalidate(inner);
        }
      }
    }

    ret.zpp_inner.weak = false;
    this.wrap_gravity = ret;
    this.wrap_gravity.zpp_inner._inuse = true;
    this.wrap_gravity.zpp_inner._invalidate = this.gravity_invalidate.bind(this);
    this.wrap_gravity.zpp_inner._validate = this.gravity_validate.bind(this);
  }

  /** Notify all shapes that fluid properties changed. */
  invalidate(): void {
    let cx_ite = this.shapes.head;
    while (cx_ite != null) {
      const shape = cx_ite.elt;
      shape.invalidate_fluidprops();
      cx_ite = cx_ite.next;
    }
  }
}
