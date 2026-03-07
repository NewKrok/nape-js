/**
 * ZPP_InteractionFilter — Internal interaction filter for the nape physics engine.
 *
 * Stores collision/sensor/fluid group and mask bitmasks that determine
 * which shapes interact with each other.
 *
 * Converted from nape-compiled.js lines 63255–63366, 135329.
 */

export class ZPP_InteractionFilter {
  // --- Static: object pool ---
  static zpp_pool: ZPP_InteractionFilter | null = null;

  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "dynamics", "ZPP_InteractionFilter"];

  // --- Static: namespace references (set by compiled module) ---
  static _nape: any = null;
  static _zpp: any = null;

  // --- Static: wrapper factory callback (set by InteractionFilter.ts) ---
  static _wrapFn: ((zpp: ZPP_InteractionFilter) => any) | null = null;

  // --- Instance: collision bitmasks ---
  collisionGroup = 1;
  collisionMask = -1;

  // --- Instance: sensor bitmasks ---
  sensorGroup = 1;
  sensorMask = -1;

  // --- Instance: fluid bitmasks ---
  fluidGroup = 1;
  fluidMask = -1;

  // --- Instance: shape tracking ---
  shapes: any = null;
  wrap_shapes: any = null;

  // --- Instance: public API wrapper ---
  outer: any = null;

  // --- Instance: user data ---
  userData: any = null;

  // --- Instance: pool linked list ---
  next: ZPP_InteractionFilter | null = null;

  // --- Instance: Haxe class reference ---


  constructor() {
    this.shapes = new ZPP_InteractionFilter._zpp.util.ZNPList_ZPP_Shape();
  }

  /** Create/return the public nape.dynamics.InteractionFilter wrapper. */
  wrapper(): any {
    if (this.outer == null) {
      if (ZPP_InteractionFilter._wrapFn) {
        this.outer = ZPP_InteractionFilter._wrapFn(this);
      } else {
        this.outer = new ZPP_InteractionFilter._nape.dynamics.InteractionFilter();
        const o = this.outer.zpp_inner;
        o.outer = null;
        o.next = ZPP_InteractionFilter.zpp_pool;
        ZPP_InteractionFilter.zpp_pool = o;
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
    this.shapes = new ZPP_InteractionFilter._zpp.util.ZNPList_ZPP_Shape();
  }

  addShape(shape: any): void {
    this.shapes.add(shape);
  }

  remShape(shape: any): void {
    this.shapes.remove(shape);
  }

  /** Create a copy with object pooling. */
  copy(): ZPP_InteractionFilter {
    let ret: ZPP_InteractionFilter;
    if (ZPP_InteractionFilter.zpp_pool == null) {
      ret = new ZPP_InteractionFilter();
    } else {
      ret = ZPP_InteractionFilter.zpp_pool;
      ZPP_InteractionFilter.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.collisionGroup = this.collisionGroup;
    ret.collisionMask = this.collisionMask;
    ret.sensorGroup = this.sensorGroup;
    ret.sensorMask = this.sensorMask;
    ret.fluidGroup = this.fluidGroup;
    ret.fluidMask = this.fluidMask;
    return ret;
  }

  /** Test whether two filters allow collision between their shapes. */
  shouldCollide(x: ZPP_InteractionFilter): boolean {
    return (
      (this.collisionMask & x.collisionGroup) !== 0 && (x.collisionMask & this.collisionGroup) !== 0
    );
  }

  /** Test whether two filters allow sensor interaction. */
  shouldSense(x: ZPP_InteractionFilter): boolean {
    return (this.sensorMask & x.sensorGroup) !== 0 && (x.sensorMask & this.sensorGroup) !== 0;
  }

  /** Test whether two filters allow fluid interaction. */
  shouldFlow(x: ZPP_InteractionFilter): boolean {
    return (this.fluidMask & x.fluidGroup) !== 0 && (x.fluidMask & this.fluidGroup) !== 0;
  }

  /** Notify all shapes that the filter changed. */
  invalidate(): void {
    let cx_ite = this.shapes.head;
    while (cx_ite != null) {
      const s = cx_ite.elt;
      s.invalidate_filter();
      cx_ite = cx_ite.next;
    }
  }
}
