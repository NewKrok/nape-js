/**
 * ZPP_Capsule — Internal capsule shape for the nape physics engine.
 *
 * Extends ZPP_Shape (type=2). A capsule is a line segment with a radius —
 * geometrically equivalent to a rectangle with two semicircular end-caps.
 *
 * Parameters:
 * - `radius`     — semicircle end-cap radius (half the capsule height)
 * - `halfLength` — half the spine length (distance from center to each cap center)
 *
 * The spine runs along the **local X-axis** through localCOM.
 * Total width  = 2 * (halfLength + radius)
 * Total height = 2 * radius
 */

export class ZPP_Capsule {
  // --- Static ---
  static _nape: any = null;
  static _zpp: any = null;
  static _initialized = false;

  // --- Instance: capsule-specific ---
  radius = 0;
  halfLength = 0;
  outer_zn: any = null;

  // World-space spine endpoint cache (updated in __validate_aabb)
  spine1x = 0;
  spine1y = 0;
  spine2x = 0;
  spine2y = 0;

  // --- Stub declarations for methods inherited from ZPP_Shape/ZPP_Interactor ---
  body: any;
  type!: number;
  circle: any;
  polygon: any;
  capsule: any;
  aabb: any;
  localCOMx!: number;
  localCOMy!: number;
  worldCOMx!: number;
  worldCOMy!: number;
  zip_localCOM!: boolean;
  zip_worldCOM!: boolean;
  zip_aabb!: boolean;
  zip_sweepRadius!: boolean;
  area!: number;
  inertia!: number;
  angDrag!: number;
  sweepCoef!: number;
  sweepRadius!: number;
  material: any;
  filter: any;
  wrap_localCOM: any;
  outer: any;
  outer_i: any;
  space: any;
  invalidate_area_inertia!: () => void;
  invalidate_angDrag!: () => void;
  invalidate_localCOM!: () => void;
  immutable_midstep!: (name: string) => void;
  setMaterial!: (mat: any) => void;
  setFilter!: (filt: any) => void;
  insert_cbtype!: (cb: any) => void;

  constructor() {
    this.radius = 0;
    this.halfLength = 0;
    this.outer_zn = null;
    // Call ZPP_Shape initializer (type=2 for capsule)
    (this as any)._initShape(2);
    this.capsule = this;
    this.zip_localCOM = false;
  }

  static _init(): void {
    if (ZPP_Capsule._initialized) return;
    ZPP_Capsule._initialized = true;

    const zpp = ZPP_Capsule._zpp;
    const srcProto = zpp.shape.ZPP_Shape.prototype;
    const dstProto = ZPP_Capsule.prototype as any;

    // Copy enumerable inherited properties
    for (const k in srcProto) {
      if (!Object.prototype.hasOwnProperty.call(dstProto, k)) {
        dstProto[k] = srcProto[k];
      }
    }
    // Copy non-enumerable own properties (TS class methods like _initShape)
    for (const k of Object.getOwnPropertyNames(srcProto)) {
      if (k !== "constructor" && !Object.prototype.hasOwnProperty.call(dstProto, k)) {
        dstProto[k] = srcProto[k];
      }
    }
  }

  __clear(): void {}

  invalidate_radius(): void {
    this.invalidate_area_inertia();
    this.invalidate_angDrag();
    this.zip_aabb = true;
    if (this.body != null) {
      this.body.zip_aabb = true;
      this.body.wake();
    }
  }

  invalidate_halfLength(): void {
    this.invalidate_area_inertia();
    this.invalidate_angDrag();
    this.zip_aabb = true;
    this.zip_sweepRadius = true;
    if (this.body != null) {
      this.body.zip_aabb = true;
      this.body.wake();
    }
  }

  // --- localCOM ---

  localCOM_validate(): void {
    this.wrap_localCOM.zpp_inner.x = this.localCOMx;
    this.wrap_localCOM.zpp_inner.y = this.localCOMy;
  }

  localCOM_invalidate(x: any): void {
    this.localCOMx = x.x;
    this.localCOMy = x.y;
    this.invalidate_localCOM();
    if (this.body != null) {
      this.body.wake();
    }
  }

  localCOM_immutable(): void {
    if (this.body != null && this.body.type === 1 && this.body.space != null) {
      throw new Error(
        "Error: Cannot modify localCOM of Capsule added to a static Body whilst within a Space",
      );
    }
  }

  setupLocalCOM(): void {
    const zpp = ZPP_Capsule._zpp;
    const nape = ZPP_Capsule._nape;
    const x = this.localCOMx;
    const y = this.localCOMy;
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    let ret: any;
    if (zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new nape.geom.Vec2();
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
      let ret1: any;
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
      ret.zpp_inner.x = x;
      ret.zpp_inner.y = y;
    }
    ret.zpp_inner.weak = false;
    this.wrap_localCOM = ret;
    this.wrap_localCOM.zpp_inner._inuse = true;
    this.wrap_localCOM.zpp_inner._validate = this.localCOM_validate.bind(this);
    this.wrap_localCOM.zpp_inner._invalidate = this.localCOM_invalidate.bind(this);
    this.wrap_localCOM.zpp_inner._isimmutable = this.localCOM_immutable.bind(this);
  }

  // --- AABB ---

  __validate_aabb(): void {
    if (this.zip_worldCOM) {
      if (this.body != null) {
        this.zip_worldCOM = false;
        if (this.zip_localCOM) {
          this.zip_localCOM = false;
          if (this.wrap_localCOM != null) {
            this.wrap_localCOM.zpp_inner.x = this.localCOMx;
            this.wrap_localCOM.zpp_inner.y = this.localCOMy;
          }
        }
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

    // Compute world-space spine endpoints
    const body = this.body;
    if (body != null) {
      if (body.zip_axis) {
        body.zip_axis = false;
        body.axisx = Math.sin(body.rot);
        body.axisy = Math.cos(body.rot);
      }
      // Spine direction in world space: local X-axis rotated by body
      const dx = body.axisy * this.halfLength;
      const dy = body.axisx * this.halfLength;
      this.spine1x = this.worldCOMx - dx;
      this.spine1y = this.worldCOMy - dy;
      this.spine2x = this.worldCOMx + dx;
      this.spine2y = this.worldCOMy + dy;
    }

    // AABB is the bounding box of both endpoint circles
    const r = this.radius;
    const minx1 = this.spine1x - r;
    const minx2 = this.spine2x - r;
    const miny1 = this.spine1y - r;
    const miny2 = this.spine2y - r;
    const maxx1 = this.spine1x + r;
    const maxx2 = this.spine2x + r;
    const maxy1 = this.spine1y + r;
    const maxy2 = this.spine2y + r;
    this.aabb.minx = minx1 < minx2 ? minx1 : minx2;
    this.aabb.miny = miny1 < miny2 ? miny1 : miny2;
    this.aabb.maxx = maxx1 > maxx2 ? maxx1 : maxx2;
    this.aabb.maxy = maxy1 > maxy2 ? maxy1 : maxy2;
  }

  _force_validate_aabb(): void {
    const body = this.body;
    this.worldCOMx = body.posx + (body.axisy * this.localCOMx - body.axisx * this.localCOMy);
    this.worldCOMy = body.posy + (this.localCOMx * body.axisx + this.localCOMy * body.axisy);
    const dx = body.axisy * this.halfLength;
    const dy = body.axisx * this.halfLength;
    this.spine1x = this.worldCOMx - dx;
    this.spine1y = this.worldCOMy - dy;
    this.spine2x = this.worldCOMx + dx;
    this.spine2y = this.worldCOMy + dy;
    const r = this.radius;
    const minx1 = this.spine1x - r;
    const minx2 = this.spine2x - r;
    const miny1 = this.spine1y - r;
    const miny2 = this.spine2y - r;
    const maxx1 = this.spine1x + r;
    const maxx2 = this.spine2x + r;
    const maxy1 = this.spine1y + r;
    const maxy2 = this.spine2y + r;
    this.aabb.minx = minx1 < minx2 ? minx1 : minx2;
    this.aabb.miny = miny1 < miny2 ? miny1 : miny2;
    this.aabb.maxx = maxx1 > maxx2 ? maxx1 : maxx2;
    this.aabb.maxy = maxy1 > maxy2 ? maxy1 : maxy2;
  }

  // --- Sweep radius ---

  __validate_sweepRadius(): void {
    const lcDist = Math.sqrt(this.localCOMx * this.localCOMx + this.localCOMy * this.localCOMy);
    this.sweepCoef = lcDist + this.halfLength;
    this.sweepRadius = this.sweepCoef + this.radius;
  }

  // --- Area / Inertia ---
  // Capsule = rectangle (2*halfLength x 2*radius) + circle (radius)

  __validate_area_inertia(): void {
    const r = this.radius;
    const hl = this.halfLength;
    const r2 = r * r;
    // Area = pi*r^2 + 4*hl*r
    this.area = Math.PI * r2 + 4 * hl * r;
    // Inertia about centroid (unit density):
    // Rectangle part: (1/12)(w*h^3 + h*w^3) where w=2*hl, h=2*r
    // Semicircle parts: pi*r^2*(r^2/2) + parallel axis for each semicircle center at ±hl
    const rectInertia = (2 * hl * (2 * r) * (2 * r * (2 * r) + 2 * hl * (2 * hl))) / 12;
    const circleInertia = Math.PI * r2 * (r2 * 0.5 + hl * hl);
    this.inertia =
      (rectInertia + circleInertia) / this.area +
      (this.localCOMx * this.localCOMx + this.localCOMy * this.localCOMy);
  }

  // --- Angular drag ---

  __validate_angDrag(): void {
    const nape = ZPP_Capsule._nape;
    const lc = this.localCOMx * this.localCOMx + this.localCOMy * this.localCOMy;
    const r2 = this.radius * this.radius;
    const hl2 = this.halfLength * this.halfLength;
    const skin = this.material.dynamicFriction * nape.Config.fluidAngularDragFriction;
    this.angDrag =
      (lc + 2 * r2 + hl2) * skin +
      0.5 * nape.Config.fluidAngularDrag * (1 + nape.Config.fluidVacuumDrag) * lc;
    this.angDrag /= 2 * (lc + 0.5 * r2 + hl2 / 3);
  }

  // --- Geometric transforms ---

  __scale(sx: number, sy: number): void {
    const factor = ((sx < 0 ? -sx : sx) + (sy < 0 ? -sy : sy)) / 2;
    const absFactor = factor < 0 ? -factor : factor;
    this.radius *= absFactor;
    this.halfLength *= absFactor;
    this.invalidate_radius();
    this.invalidate_halfLength();
    if (this.localCOMx * this.localCOMx + this.localCOMy * this.localCOMy > 0) {
      this.localCOMx *= sx;
      this.localCOMy *= sy;
      this.invalidate_localCOM();
    }
  }

  __translate(x: number, y: number): void {
    this.localCOMx += x;
    this.localCOMy += y;
    this.invalidate_localCOM();
  }

  __rotate(x: number, y: number): void {
    if (this.localCOMx * this.localCOMx + this.localCOMy * this.localCOMy > 0) {
      const tx = y * this.localCOMx - x * this.localCOMy;
      const ty = this.localCOMx * x + this.localCOMy * y;
      this.localCOMx = tx;
      this.localCOMy = ty;
      this.invalidate_localCOM();
    }
  }

  __transform(m: any): void {
    let det = m.zpp_inner.a * m.zpp_inner.d - m.zpp_inner.b * m.zpp_inner.c;
    if (det < 0) {
      det = -det;
    }
    const scale = Math.sqrt(det);
    this.radius *= scale;
    this.halfLength *= scale;
    const t = m.zpp_inner.a * this.localCOMx + m.zpp_inner.b * this.localCOMy + m.zpp_inner.tx;
    this.localCOMy =
      m.zpp_inner.c * this.localCOMx + m.zpp_inner.d * this.localCOMy + m.zpp_inner.ty;
    this.localCOMx = t;
    this.invalidate_radius();
    this.invalidate_halfLength();
    this.invalidate_localCOM();
  }

  // --- Copy ---

  __copy(): any {
    const nape = ZPP_Capsule._nape;
    const width = 2 * (this.halfLength + this.radius);
    const height = 2 * this.radius;
    const ret = new nape.shape.Capsule(width, height).zpp_inner_zn;
    ret.localCOMx = this.localCOMx;
    ret.localCOMy = this.localCOMy;
    ret.zip_localCOM = false;
    return ret;
  }
}
