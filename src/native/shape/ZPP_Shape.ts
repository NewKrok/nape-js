/**
 * ZPP_Shape — Internal base shape class for the nape physics engine.
 *
 * Base class for ZPP_Circle and ZPP_Polygon. Inherits from compiled
 * ZPP_Interactor. Manages AABB, COM, area/inertia, material, filter,
 * and broadphase data.
 *
 * Converted from nape-compiled.js lines 40515–41495.
 */

import { ZPP_AABB } from "../geom/ZPP_AABB";
import { ZPP_Material } from "../phys/ZPP_Material";
import { ZPP_Interactor } from "../phys/ZPP_Interactor";

type Any = any;

export class ZPP_Shape {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "shape", "ZPP_Shape"];
  static __super__: Any = null;

  // --- Static: namespace references ---
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Static: shape type enum lookup ---
  static types: Any[] = [];

  // --- Static: init guard ---
  static _initialized = false;

  // --- Instance: public wrapper ---
  outer: Any = null;

  // --- Instance: body reference ---
  body: Any = null;

  // --- Instance: shape type (0=circle, 1=polygon) ---
  type = 0;

  // --- Instance: area/inertia ---
  area = 0;
  zip_area_inertia = false;
  inertia = 0;

  // --- Instance: angular drag ---
  angDrag = 0;
  zip_angDrag = false;

  // --- Instance: local center of mass ---
  localCOMx = 0;
  localCOMy = 0;
  zip_localCOM = false;

  // --- Instance: world center of mass ---
  worldCOMx = 0;
  worldCOMy = 0;
  zip_worldCOM = false;
  wrap_localCOM: Any = null;
  wrap_worldCOM: Any = null;

  // --- Instance: sweep radius ---
  sweepRadius = 0;
  zip_sweepRadius = false;
  sweepCoef = 0;

  // --- Instance: circle/polygon subtype references ---
  circle: Any = null;
  polygon: Any = null;

  // --- Instance: material/filter/fluid ---
  refmaterial: Any = null;
  material: Any = null;
  filter: Any = null;
  fluidProperties: Any = null;
  fluidEnabled = false;
  sensorEnabled = false;

  // --- Instance: broadphase ---
  sweep: Any = null;
  node: Any = null;
  pairs: Any = null;

  // --- Instance: AABB ---
  aabb: Any = null;
  zip_aabb = false;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_Shape;

  // --- Interactor fields (re-declared, set by _initShape via ZPP_Interactor.call) ---
  ishape: Any = null;

  // --- Stub declarations for methods inherited from ZPP_Interactor ---
  wake!: () => void;
  immutable_midstep!: (name: string) => void;
  copyto!: (ret: Any) => void;
  insert_cbtype!: (cb: Any) => void;
  __iaddedToSpace!: () => void;
  __iremovedFromSpace!: () => void;
  userData: Any = null;

  constructor(type?: number) {
    if (type !== undefined) {
      this._initShape(type);
    }
  }

  /**
   * Initialize shape state. Separated from constructor so that compiled
   * subclass constructors can call `ZPP_Shape.call(this, type)` which
   * gets redirected here.
   */
  _initShape(type: number): void {
    const zpp = ZPP_Shape._zpp;
    // ZPP_Interactor constructor init
    ZPP_Interactor.initFields(this);
    this.pairs = new zpp.util.ZNPList_ZPP_AABBPair();
    this.ishape = this;
    this.type = type;

    // Allocate AABB from pool
    let aabb: ZPP_AABB;
    if (ZPP_AABB.zpp_pool == null) {
      aabb = new ZPP_AABB();
    } else {
      aabb = ZPP_AABB.zpp_pool;
      ZPP_AABB.zpp_pool = aabb.next;
      aabb.next = null;
    }
    aabb.minx = 0;
    aabb.miny = 0;
    aabb.maxx = 0;
    aabb.maxy = 0;
    this.aabb = aabb;
    this.aabb._immutable = true;
    this.aabb._validate = this.aabb_validate.bind(this);

    this.zip_area_inertia = this.zip_angDrag = this.zip_localCOM = this.zip_sweepRadius = true;
    this.localCOMx = 0;
    this.localCOMy = 0;
    this.worldCOMx = 0;
    this.worldCOMy = 0;
    this.fluidEnabled = false;
    this.sensorEnabled = false;
    this.fluidProperties = null;
    this.body = null;
    this.refmaterial = new ZPP_Material();
    this.sweepRadius = this.sweepCoef = 0;
  }

  static _init(): void {
    if (ZPP_Shape._initialized) return;
    ZPP_Shape._initialized = true;

    const zpp = ZPP_Shape._zpp;
    ZPP_Shape.__super__ = ZPP_Interactor;

    // Copy ZPP_Interactor prototype methods onto ZPP_Shape prototype
    for (const k of Object.getOwnPropertyNames(ZPP_Interactor.prototype)) {
      if (k !== "constructor" && k !== "__class__" && !Object.prototype.hasOwnProperty.call(ZPP_Shape.prototype, k)) {
        (ZPP_Shape.prototype as Any)[k] = (ZPP_Interactor.prototype as Any)[k];
      }
    }
  }

  // --- Type check methods ---
  isCircle(): boolean {
    return this.type === 0;
  }

  isPolygon(): boolean {
    return this.type === 1;
  }

  // --- Sweep radius ---
  invalidate_sweepRadius(): void {
    this.zip_sweepRadius = true;
  }

  validate_sweepRadius(): void {
    if (this.zip_sweepRadius) {
      this.zip_sweepRadius = false;
      if (this.type === 0) {
        this.circle.__validate_sweepRadius();
      } else {
        this.polygon.__validate_sweepRadius();
      }
    }
  }

  // --- Clear ---
  clear(): void {
    if (this.type === 0) {
      this.circle.__clear();
    } else {
      this.polygon.__clear();
    }
  }

  // --- AABB validation ---
  validate_aabb(): void {
    if (this.zip_aabb) {
      if (this.body != null) {
        this.zip_aabb = false;
        if (this.type === 0) {
          this.circle.__validate_aabb();
        } else {
          this.polygon.__validate_aabb();
        }
      }
    }
  }

  force_validate_aabb(): void {
    if (this.type === 0) {
      this.circle._force_validate_aabb();
    } else {
      this.polygon._force_validate_aabb();
    }
  }

  invalidate_aabb(): void {
    this.zip_aabb = true;
    if (this.body != null) {
      this.body.zip_aabb = true;
    }
  }

  // --- Area/inertia validation ---
  validate_area_inertia(): void {
    if (this.zip_area_inertia) {
      this.zip_area_inertia = false;
      if (this.type === 0) {
        this.circle.__validate_area_inertia();
      } else {
        this.polygon.__validate_area_inertia();
      }
    }
  }

  // --- Angular drag validation ---
  validate_angDrag(): void {
    if (this.zip_angDrag || this.refmaterial.dynamicFriction !== this.material.dynamicFriction) {
      this.zip_angDrag = false;
      this.refmaterial.dynamicFriction = this.material.dynamicFriction;
      if (this.type === 0) {
        this.circle.__validate_angDrag();
      } else {
        this.polygon.__validate_angDrag();
      }
    }
  }

  // --- Local COM validation ---
  validate_localCOM(): void {
    if (this.zip_localCOM) {
      this.zip_localCOM = false;
      if (this.type === 1) {
        this.polygon.__validate_localCOM();
      }
      if (this.wrap_localCOM != null) {
        this.wrap_localCOM.zpp_inner.x = this.localCOMx;
        this.wrap_localCOM.zpp_inner.y = this.localCOMy;
      }
    }
  }

  // --- World COM validation ---
  validate_worldCOM(): void {
    if (this.zip_worldCOM) {
      if (this.body != null) {
        this.zip_worldCOM = false;
        this.validate_localCOM();

        const body = this.body;
        if (body.zip_axis) {
          body.zip_axis = false;
          body.axisx = Math.sin(body.rot);
          body.axisy = Math.cos(body.rot);
        }
        this.worldCOMx = body.posx + (body.axisy * this.localCOMx - body.axisx * this.localCOMy);
        this.worldCOMy = body.posy + (this.localCOMx * body.axisx + this.localCOMy * body.axisy);
      }
    }
  }

  getworldCOM(): void {
    if (this.body == null) {
      throw new Error("Error: worldCOM only makes sense when Shape belongs to a Body");
    }
    this.validate_worldCOM();
    this.wrap_worldCOM.zpp_inner.x = this.worldCOMx;
    this.wrap_worldCOM.zpp_inner.y = this.worldCOMy;
  }

  // --- Invalidation cascade ---
  invalidate_area_inertia(): void {
    this.zip_area_inertia = true;
    if (this.body != null) {
      this.body.zip_localCOM = true;
      this.body.zip_worldCOM = true;
      this.body.invalidate_mass();
      this.body.invalidate_inertia();
    }
  }

  invalidate_angDrag(): void {
    this.zip_angDrag = true;
  }

  invalidate_localCOM(): void {
    this.zip_localCOM = true;
    this.invalidate_area_inertia();
    if (this.type === 0) {
      this.zip_sweepRadius = true;
    }
    this.invalidate_angDrag();
    this.invalidate_worldCOM();
    if (this.body != null) {
      this.body.zip_localCOM = true;
      this.body.zip_worldCOM = true;
    }
  }

  invalidate_worldCOM(): void {
    this.zip_worldCOM = true;
    this.zip_aabb = true;
    if (this.body != null) {
      this.body.zip_aabb = true;
    }
  }

  // --- Material/filter/fluid invalidation ---
  invalidate_material(flags: number): void {
    if ((flags & ZPP_Material.WAKE) !== 0) {
      this.wake();
    }
    if ((flags & ZPP_Material.ARBITERS) !== 0) {
      if (this.body != null) {
        this.body.refreshArbiters();
      }
    }
    if ((flags & ZPP_Material.PROPS) !== 0) {
      if (this.body != null) {
        this.body.zip_localCOM = true;
        this.body.zip_worldCOM = true;
        this.body.invalidate_mass();
        this.body.invalidate_inertia();
      }
    }
    if ((flags & ZPP_Material.ANGDRAG) !== 0) {
      this.invalidate_angDrag();
    }
    this.refmaterial.set(this.material);
  }

  invalidate_filter(): void {
    this.wake();
  }

  invalidate_fluidprops(): void {
    if (this.fluidEnabled) {
      this.wake();
    }
  }

  // --- AABB validate callback (bound to aabb._validate) ---
  aabb_validate(): void {
    if (this.body == null) {
      throw new Error("Error: bounds only makes sense when Shape belongs to a Body");
    }
    this.validate_aabb();
  }

  // --- Material/filter/fluid setters ---
  setMaterial(material: Any): void {
    if (this.material !== material) {
      if (this.body != null && this.body.space != null) {
        if (this.material != null) {
          this.material.shapes.remove(this);
        }
      }
      this.material = material;
      if (this.body != null && this.body.space != null) {
        material.shapes.add(this);
      }
      this.wake();
      if (this.body != null) {
        this.body.refreshArbiters();
      }
    }
  }

  setFilter(filter: Any): void {
    if (this.filter !== filter) {
      if (this.body != null && this.body.space != null) {
        if (this.filter != null) {
          this.filter.shapes.remove(this);
        }
      }
      this.filter = filter;
      if (this.body != null && this.body.space != null) {
        filter.shapes.add(this);
      }
      this.wake();
    }
  }

  setFluid(fluid: Any): void {
    if (this.fluidProperties !== fluid) {
      if (this.body != null && this.body.space != null) {
        if (this.fluidProperties != null) {
          this.fluidProperties.shapes.remove(this);
        }
      }
      this.fluidProperties = fluid;
      if (this.body != null && this.body.space != null) {
        fluid.shapes.add(this);
      }
      if (this.fluidEnabled) {
        this.wake();
      }
    }
  }

  // --- Midstep guard ---
  __immutable_midstep(name: string): void {
    if (this.body != null && this.body.space != null && this.body.space.midstep) {
      throw new Error("Error: " + name + " cannot be set during a space step()");
    }
  }

  // --- Body add/remove hooks ---
  addedToBody(): void {
    this.invalidate_worldCOM();
    this.zip_aabb = true;
    if (this.body != null) {
      this.body.zip_aabb = true;
    }
  }

  removedFromBody(): void {}

  addedToSpace(): void {
    this.__iaddedToSpace();
    this.material.shapes.add(this);
    this.filter.shapes.add(this);
    if (this.fluidProperties != null) {
      this.fluidProperties.shapes.add(this);
    }
  }

  removedFromSpace(): void {
    this.__iremovedFromSpace();
    this.material.shapes.remove(this);
    this.filter.shapes.remove(this);
    if (this.fluidProperties != null) {
      this.fluidProperties.shapes.remove(this);
    }
  }

  // --- Copy ---
  copy(): Any {
    const nape = ZPP_Shape._nape;
    const zpp = ZPP_Shape._zpp;
    const ret: Any = this.type === 0 ? this.circle.__copy() : this.polygon.__copy();
    if (!this.zip_area_inertia) {
      ret.area = this.area;
      ret.inertia = this.inertia;
    } else {
      ret.invalidate_area_inertia();
    }
    if (!this.zip_sweepRadius) {
      ret.sweepRadius = this.sweepRadius;
      ret.sweepCoef = this.sweepCoef;
    } else {
      ret.zip_sweepRadius = true;
    }
    if (!this.zip_angDrag) {
      ret.angDrag = this.angDrag;
    } else {
      ret.invalidate_angDrag();
    }
    if (!this.zip_aabb) {
      ret.aabb.minx = this.aabb.minx;
      ret.aabb.miny = this.aabb.miny;
      ret.aabb.maxx = this.aabb.maxx;
      ret.aabb.maxy = this.aabb.maxy;
    } else {
      ret.zip_aabb = true;
      if (ret.body != null) {
        ret.body.zip_aabb = true;
      }
    }
    // Return old material/filter to pool, reuse source's
    const o = ret.material;
    o.outer = null;
    o.next = ZPP_Material.zpp_pool;
    ZPP_Material.zpp_pool = o;

    const o1 = ret.filter;
    o1.outer = null;
    o1.next = zpp.dynamics.ZPP_InteractionFilter.zpp_pool;
    zpp.dynamics.ZPP_InteractionFilter.zpp_pool = o1;

    ret.material = this.material;
    ret.filter = this.filter;
    if (this.fluidProperties != null) {
      ret.fluidProperties = this.fluidProperties;
    }
    ret.fluidEnabled = this.fluidEnabled;
    ret.sensorEnabled = this.sensorEnabled;
    if (this.userData != null) {
      const Reflect = (nape as Any).__Reflect || ZPP_Shape._zpp.__Reflect;
      if (Reflect && Reflect.copy) {
        ret.userData = Reflect.copy(this.userData);
      } else {
        ret.userData = Object.assign({}, this.userData);
      }
    }
    this.copyto(ret.outer);
    return ret.outer;
  }
}
