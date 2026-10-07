import { ZNPList_ZPP_Shape } from "../util/ZNPRegistry";
/**
 * ZPP_FluidProperties — Internal fluid properties for the nape physics engine.
 *
 * Stores density, viscosity, and per-fluid gravity override.
 * Manages the list of shapes that reference these properties for invalidation.
 */

export class ZPP_FluidProperties {
  // --- Static: object pool ---
  static zpp_pool: ZPP_FluidProperties | null = null;
  // --- Static: namespace references (assigned by ZPPRegistry) ---
  static _nape: any = null;

  // --- Static: wrapper factory callback (set by FluidProperties.ts) ---
  static _wrapFn: ((zpp: ZPP_FluidProperties) => any) | null = null;

  // --- Instance: fluid properties ---
  viscosity = 1;
  density = 1;
  gravityx = 0;
  gravityy = 0;
  wrap_gravity: any = null; // Vec2 wrapper — circular import prevention

  // --- Instance: shape tracking ---
  shapes: any = null; // ZNPList_ZPP_Shape — dynamic subclass
  wrap_shapes: any = null;

  // --- Instance: public API wrapper ---
  outer: any = null; // circular import prevention

  // --- Instance: user data ---
  userData: Record<string, unknown> | null = null;

  // --- Instance: pool linked list ---
  next: ZPP_FluidProperties | null = null;

  constructor() {
    this.shapes = new ZNPList_ZPP_Shape();
  }

  /** Create/return the public nape.phys.FluidProperties wrapper. */
  wrapper(): any {
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

  feature_cons(): void {
    this.shapes = new ZNPList_ZPP_Shape();
  }

  addShape(shape: any): void {
    this.shapes.add(shape);
  }

  remShape(shape: any): void {
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
  gravity_invalidate(x: any): void {
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
    const napeNs = ZPP_FluidProperties._nape;

    const x = this.gravityx ?? 0;
    const y = this.gravityy ?? 0;

    if (x !== x || y !== y) {
      throw new Error("Vec2 components cannot be NaN");
    }

    // Get or create a Vec2 from the public pool
    const ret = napeNs.geom.Vec2.get(x, y);
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
