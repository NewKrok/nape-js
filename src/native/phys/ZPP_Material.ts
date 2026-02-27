/**
 * ZPP_Material — Internal material representation for the nape physics engine.
 *
 * Stores physical material properties (friction, elasticity, density) and
 * manages the list of shapes that reference this material for invalidation.
 *
 * Converted from nape-compiled.js lines 87523–87601, 135477–135481.
 */

type Any = any;

export class ZPP_Material {
  // --- Static: object pool (linked list via `next`) ---
  static zpp_pool: ZPP_Material | null = null;

  // --- Static: invalidation flag bitmask ---
  static WAKE = 1;
  static PROPS = 2;
  static ANGDRAG = 4;
  static ARBITERS = 8;

  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "phys", "ZPP_Material"];

  /**
   * Namespace references, set by the compiled module after import.
   * _nape  = the `nape` public namespace (for wrapper creation)
   * _zpp   = the `zpp_nape` internal namespace (for ZNPList_ZPP_Shape)
   */
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Instance: material properties ---
  elasticity = 0;
  dynamicFriction = 1;
  staticFriction = 2;
  density = 0.001;
  rollingFriction = 0.01;

  // --- Instance: shape tracking ---
  shapes: Any = null;
  wrap_shapes: Any = null;

  // --- Instance: public API wrapper reference ---
  outer: Any = null;

  // --- Instance: user data ---
  userData: Any = null;

  // --- Instance: pool linked list ---
  next: ZPP_Material | null = null;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_Material;

  constructor() {
    this.shapes = new ZPP_Material._zpp.util.ZNPList_ZPP_Shape();
  }

  /** Create/return the public nape.phys.Material wrapper for this internal object. */
  wrapper(): Any {
    if (this.outer == null) {
      this.outer = new ZPP_Material._nape.phys.Material();
      const o = this.outer.zpp_inner;
      o.outer = null;
      o.next = ZPP_Material.zpp_pool;
      ZPP_Material.zpp_pool = o;
      this.outer.zpp_inner = this;
    }
    return this.outer;
  }

  /** Called when this object is returned to the pool. */
  free(): void {
    this.outer = null;
  }

  /** Called when this object is taken from the pool. */
  alloc(): void {}

  /** Initialize the shapes list (called during feature construction). */
  feature_cons(): void {
    this.shapes = new ZPP_Material._zpp.util.ZNPList_ZPP_Shape();
  }

  /** Register a shape that uses this material. */
  addShape(shape: Any): void {
    this.shapes.add(shape);
  }

  /** Unregister a shape that no longer uses this material. */
  remShape(shape: Any): void {
    this.shapes.remove(shape);
  }

  /** Create a copy with the same property values. */
  copy(): ZPP_Material {
    const ret = new ZPP_Material();
    ret.dynamicFriction = this.dynamicFriction;
    ret.staticFriction = this.staticFriction;
    ret.density = this.density;
    ret.elasticity = this.elasticity;
    ret.rollingFriction = this.rollingFriction;
    return ret;
  }

  /** Copy all property values from another ZPP_Material. */
  set(x: ZPP_Material): void {
    this.dynamicFriction = x.dynamicFriction;
    this.staticFriction = x.staticFriction;
    this.density = x.density;
    this.elasticity = x.elasticity;
    this.rollingFriction = x.rollingFriction;
  }

  /** Notify all shapes using this material that properties changed. */
  invalidate(x: number): void {
    let cx_ite = this.shapes.head;
    while (cx_ite != null) {
      const s = cx_ite.elt;
      s.invalidate_material(x);
      cx_ite = cx_ite.next;
    }
  }
}
