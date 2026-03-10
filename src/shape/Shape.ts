import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
// Side-effect imports: ensure TS modules execute to register in compiled namespace
import "../geom/Vec2";
import "../geom/GeomPoly";
import type { Vec2, NapeInner, Writable } from "../geom/Vec2";
import { AABB } from "../geom/AABB";
import { Body } from "../phys/Body";
import { Material } from "../phys/Material";
import { FluidProperties } from "../phys/FluidProperties";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { Interactor } from "../phys/Interactor";
// Side-effect import: ShapeType.ts must execute to fix singleton prototypes
import "./ShapeType";
import type { ShapeType } from "./ShapeType";
import { ZPP_Shape } from "../native/shape/ZPP_Shape";
import { ZPP_Geom } from "../native/geom/ZPP_Geom";
import { ZPP_Collide } from "../native/geom/ZPP_Collide";
import { ZPP_Vec2 } from "../native/geom/ZPP_Vec2";
import { ZPP_PubPool } from "../native/util/ZPP_PubPool";

// ---------------------------------------------------------------------------
// Subclass wrap bindings — Circle and Polygon register their _wrap functions
// here at module load time to avoid circular `import` (they extend Shape).
// ---------------------------------------------------------------------------

type SubclassWrapFn = (inner: NapeInner) => Shape;
let _circleWrap: SubclassWrapFn | undefined;
let _polygonWrap: SubclassWrapFn | undefined;

/** @internal Called by Circle at module init. */
export function _bindCircleWrap(fn: SubclassWrapFn): void {
  _circleWrap = fn;
}
/** @internal Called by Polygon at module init. */
export function _bindPolygonWrap(fn: SubclassWrapFn): void {
  _polygonWrap = fn;
}

/**
 * Base class for physics shapes (Circle, Polygon). Never instantiated directly — use
 * `new Circle(...)` or `Polygon.box(...)` etc.
 */
export class Shape extends Interactor {
  /** @internal – shapes are created via Circle or Polygon constructors. */
  protected constructor() {
    super();
  }

  /** @internal */
  static _wrap(inner: NapeInner): Shape {
    if (!inner) return null as unknown as Shape;

    // Dispatch to concrete subclass wrapper based on runtime type.
    // Check both TS method (isCircle/isPolygon) and compiled field (zpp_inner.type)
    // because compiled objects may not have the TS methods on their prototype.
    const type = inner.isCircle
      ? inner.isCircle()
        ? 0
        : inner.isPolygon?.()
          ? 1
          : -1
      : (inner.zpp_inner?.type ?? -1);
    if (type === 0 && _circleWrap) return _circleWrap(inner);
    if (type === 1 && _polygonWrap) return _polygonWrap(inner);

    // Handle ZPP inner objects that have an outer
    if (inner.outer) return inner.outer;

    // Fallback: generic Shape wrapper
    return getOrCreate(inner, (raw) => {
      const s = Object.create(Shape.prototype) as Shape;
      (s as Writable<Shape>)._inner = raw;
      (s as any).zpp_inner = raw.zpp_inner ?? raw;
      (s as any).zpp_inner_i = raw.zpp_inner_i ?? raw;
      return s;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties — direct ZPP access
  // ---------------------------------------------------------------------------

  /** The shape type: CIRCLE or POLYGON. */
  get type(): ShapeType {
    return ZPP_Shape.types[(this as any).zpp_inner.type];
  }

  /** Returns true if this is a Circle shape. */
  isCircle(): boolean {
    return (this as any).zpp_inner.type === 0;
  }

  /** Returns true if this is a Polygon shape. */
  isPolygon(): boolean {
    return (this as any).zpp_inner.type === 1;
  }

  /**
   * The Body this shape belongs to. Setting moves the shape between bodies.
   */
  get body(): Body {
    const zpp = (this as any).zpp_inner;
    if (zpp.body != null) {
      return zpp.body.outer;
    }
    return null as unknown as Body;
  }

  set body(value: Body | null) {
    const zpp = (this as any).zpp_inner;
    zpp.immutable_midstep("Shape::body");
    const currentBody = zpp.body != null ? zpp.body.outer : null;
    if (currentBody !== value) {
      if (zpp.body != null) {
        currentBody.zpp_inner.wrap_shapes.remove(this);
      }
      if (value != null) {
        const shapes = (value as any).zpp_inner.wrap_shapes;
        if (shapes.zpp_inner.reverse_flag) {
          shapes.push(this);
        } else {
          shapes.unshift(this);
        }
      }
    }
  }

  /** Cast to Circle, or null if this is not a circle. */
  get castCircle(): Shape | null {
    const zpp = (this as any).zpp_inner;
    if (zpp.type === 0) {
      const outer = zpp.circle.outer_zn;
      return _circleWrap ? _circleWrap(outer) : outer;
    }
    return null;
  }

  /** Cast to Polygon, or null if this is not a polygon. */
  get castPolygon(): Shape | null {
    const zpp = (this as any).zpp_inner;
    if (zpp.type === 1) {
      const outer = zpp.polygon.outer_zn;
      return _polygonWrap ? _polygonWrap(outer) : outer;
    }
    return null;
  }

  /** World-space centre of mass of this shape (read-only, lazy-computed). */
  get worldCOM(): Vec2 {
    const zpp = (this as any).zpp_inner;
    if (zpp.wrap_worldCOM == null) {
      this._setupWorldCOM();
    }
    return zpp.wrap_worldCOM;
  }

  /**
   * Local-space centre of mass. Can be set to override the default shape centroid.
   */
  get localCOM(): Vec2 {
    const zpp = (this as any).zpp_inner;
    if (zpp.wrap_localCOM == null) {
      if (zpp.type === 0) {
        zpp.circle.setupLocalCOM();
      } else {
        zpp.polygon.setupLocalCOM();
      }
    }
    return zpp.wrap_localCOM;
  }

  set localCOM(value: Vec2) {
    const zpp = (this as any).zpp_inner;
    zpp.immutable_midstep("Body::localCOM");
    if ((value as any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (zpp.body != null && zpp.body.space != null && zpp.body.type === 1) {
      throw new Error(
        "Error: Cannot modify Shape belonging to a static Object once inside a Space",
      );
    }
    if (value == null) {
      throw new Error("Error: Shape::localCOM cannot be null");
    }
    // Ensure localCOM wrapper exists
    if (zpp.wrap_localCOM == null) {
      if (zpp.type === 0) {
        zpp.circle.setupLocalCOM();
      } else {
        zpp.polygon.setupLocalCOM();
      }
    }
    // Set via the wrapper (triggers _invalidate callback)
    zpp.wrap_localCOM.set(value);
    if ((value as any).zpp_inner.weak) {
      value.dispose();
    }
  }

  /** Cross-sectional area of this shape. */
  get area(): number {
    const zpp = (this as any).zpp_inner;
    zpp.validate_area_inertia();
    return zpp.area;
  }

  /** Contribution to moment of inertia (about local centroid, unit density). */
  get inertia(): number {
    const zpp = (this as any).zpp_inner;
    zpp.validate_area_inertia();
    return zpp.inertia;
  }

  /** Angular drag coefficient for this shape. */
  get angDrag(): number {
    const zpp = (this as any).zpp_inner;
    zpp.validate_angDrag();
    return zpp.angDrag;
  }

  /** The Material assigned to this shape (controls friction, elasticity, density). */
  get material(): Material {
    return (this as any).zpp_inner.material.wrapper();
  }

  set material(value: Material) {
    const zpp = (this as any).zpp_inner;
    zpp.immutable_midstep("Shape::material");
    if (value == null) {
      throw new Error("Error: Cannot assign null as Shape material");
    }
    zpp.setMaterial((value as any).zpp_inner);
  }

  /** The InteractionFilter controlling which shapes interact with this one. */
  get filter(): InteractionFilter {
    return (this as any).zpp_inner.filter.wrapper();
  }

  set filter(value: InteractionFilter) {
    const zpp = (this as any).zpp_inner;
    zpp.immutable_midstep("Shape::filter");
    if (value == null) {
      throw new Error("Error: Cannot assign null as Shape filter");
    }
    zpp.setFilter((value as any).zpp_inner);
  }

  /** Fluid simulation properties for this shape. Auto-created on first access. */
  get fluidProperties(): FluidProperties {
    const zpp = (this as any).zpp_inner;
    zpp.immutable_midstep("Shape::fluidProperties");
    if (zpp.fluidProperties == null) {
      zpp.setFluid(new FluidProperties().zpp_inner);
    }
    return zpp.fluidProperties.wrapper();
  }

  set fluidProperties(value: FluidProperties) {
    const zpp = (this as any).zpp_inner;
    if (value == null) {
      throw new Error(
        "Error: Cannot assign null as Shape fluidProperties, disable fluids by setting fluidEnabled to false",
      );
    }
    zpp.setFluid((value as any).zpp_inner);
    zpp.immutable_midstep("Shape::fluidProperties");
    if (zpp.fluidProperties == null) {
      zpp.setFluid(new FluidProperties().zpp_inner);
    }
  }

  /** Set of callback types registered on this shape for event dispatch. */
  get cbTypes(): CbTypeSet {
    if (this.zpp_inner_i.wrap_cbTypes == null) {
      this.zpp_inner_i.setupcbTypes();
    }
    const raw = this.zpp_inner_i.wrap_cbTypes;
    return {
      _inner: raw,
      add(cbType: { _inner: NapeInner }) {
        raw.add(cbType._inner);
      },
      remove(cbType: { _inner: NapeInner }) {
        raw.remove(cbType._inner);
      },
      has(cbType: { _inner: NapeInner }): boolean {
        return raw.has(cbType._inner);
      },
      clear() {
        raw.clear();
      },
      get length(): number {
        return raw.length;
      },
    };
  }

  /** If true, this shape participates in fluid interaction. */
  get fluidEnabled(): boolean {
    return (this as any).zpp_inner.fluidEnabled;
  }

  set fluidEnabled(value: boolean) {
    const zpp = (this as any).zpp_inner;
    zpp.immutable_midstep("Shape::fluidEnabled");
    zpp.fluidEnabled = value;
    if (value && zpp.fluidProperties == null) {
      const fp = new FluidProperties();
      zpp.setFluid(fp.zpp_inner);
      zpp.immutable_midstep("Shape::fluidProperties");
      if (zpp.fluidProperties == null) {
        zpp.setFluid(new FluidProperties().zpp_inner);
      }
      zpp.fluidProperties.wrapper();
    }
    zpp.wake();
  }

  /** If true, this shape acts as a sensor (no physical response, only callbacks). */
  get sensorEnabled(): boolean {
    return (this as any).zpp_inner.sensorEnabled;
  }

  set sensorEnabled(value: boolean) {
    const zpp = (this as any).zpp_inner;
    zpp.immutable_midstep("Shape::sensorEnabled");
    zpp.sensorEnabled = value;
    zpp.wake();
  }

  /** World-space AABB of this shape (updated each step). */
  get bounds(): AABB {
    return (this as any).zpp_inner.aabb.wrapper();
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /**
   * Translate the shape's local vertices by the given vector (in-place).
   * @param translation - The displacement vector to apply.
   * @returns `this` for chaining.
   */
  translate(translation: Vec2): Shape {
    const zpp = (this as any).zpp_inner;
    zpp.immutable_midstep("Shape::translate()");
    if ((translation as any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (zpp.body != null && zpp.body.space != null && zpp.body.type === 1) {
      throw new Error(
        "Error: Cannot modify Shape belonging to a static Object once inside a Space",
      );
    }
    if (translation == null) {
      throw new Error("Error: Cannot displace Shape by null Vec2");
    }
    if ((translation as any).lsq() > 0) {
      const inner = (translation as any).zpp_inner;
      if (inner._validate != null) inner._validate();
      const x = inner.x;
      if (inner._validate != null) inner._validate();
      const y = inner.y;
      const target = zpp.type === 0 ? zpp.circle : zpp.polygon;
      target.__translate(x, y);
    }
    if ((translation as any).zpp_inner.weak) {
      translation.dispose();
    }
    return this;
  }

  /**
   * Scale the shape's local geometry. Circles require uniform scaling.
   * @param scaleX - Horizontal scale factor (must be non-zero).
   * @param scaleY - Vertical scale factor (must be non-zero).
   * @returns `this` for chaining.
   */
  scale(scaleX: number, scaleY: number): Shape {
    const zpp = (this as any).zpp_inner;
    const nape = getNape();
    zpp.immutable_midstep("Shape::scale()");
    if (zpp.body != null && zpp.body.space != null && zpp.body.type === 1) {
      throw new Error(
        "Error: Cannot modify Shape belonging to a static Object once inside a Space",
      );
    }
    if (scaleX !== scaleX || scaleY !== scaleY) {
      throw new Error("Error: Cannot scale Shape by NaN");
    }
    if (scaleX === 0 || scaleY === 0) {
      throw new Error("Error: Cannot Scale shape by a factor of 0");
    }
    if (zpp.type === 0) {
      const d = scaleX * scaleX - scaleY * scaleY;
      if (d * d < nape.Config.epsilon * nape.Config.epsilon) {
        zpp.circle.__scale(scaleX, scaleY);
      } else {
        throw new Error("Error: Cannot perform a non equal scaling on a Circle");
      }
    } else {
      zpp.polygon.__scale(scaleX, scaleY);
    }
    return this;
  }

  /**
   * Rotate the shape's local vertices by `angle` radians.
   * @param angle - Rotation in radians.
   * @returns `this` for chaining.
   */
  rotate(angle: number): Shape {
    const zpp = (this as any).zpp_inner;
    zpp.immutable_midstep("Shape::rotate()");
    if (zpp.body != null && zpp.body.space != null && zpp.body.type === 1) {
      throw new Error(
        "Error: Cannot modify Shape belonging to a static Object once inside a Space",
      );
    }
    if (angle !== angle) {
      throw new Error("Error: Cannot rotate Shape by NaN");
    }
    const dr = angle % (2 * Math.PI);
    if (dr !== 0.0) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      if (zpp.type === 0) {
        zpp.circle.__rotate(sin, cos);
      } else {
        zpp.polygon.__rotate(sin, cos);
      }
    }
    return this;
  }

  /**
   * Apply a Mat23 affine transform to the shape's local geometry.
   * @param matrix - The transformation matrix (must be non-singular; Circles require equiorthogonal).
   * @returns `this` for chaining.
   */
  transform(matrix: { _inner: NapeInner }): Shape {
    const zpp = (this as any).zpp_inner;
    zpp.immutable_midstep("Shape::transform()");
    if (zpp.body != null && zpp.body.space != null && zpp.body.type === 1) {
      throw new Error(
        "Error: Cannot modify Shape belonging to a static Object once inside a Space",
      );
    }
    if (matrix == null) {
      throw new Error("Error: Cannot transform Shape by null matrix");
    }
    const mat = matrix._inner ?? matrix;
    if ((mat as any).singular()) {
      throw new Error("Error: Cannot transform Shape by a singular matrix");
    }
    if (zpp.type === 0) {
      if ((mat as any).equiorthogonal()) {
        zpp.circle.__transform(mat);
      } else {
        throw new Error("Error: Cannot transform Circle by a non equiorthogonal matrix");
      }
    } else {
      zpp.polygon.__transform(mat);
    }
    return this;
  }

  /**
   * Return true if the given world-space point lies inside this shape.
   * Requires the shape to be attached to a Body.
   * @param point - The world-space point to test.
   * @returns True if the point is inside this shape.
   */
  contains(point: Vec2): boolean {
    const zpp = (this as any).zpp_inner;
    if ((point as any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (point == null) {
      throw new Error("Cannot check null point for containment");
    }
    if ((zpp.body != null ? zpp.body.outer : null) == null) {
      throw new Error("Error: Shape is not well defined without a Body");
    }
    ZPP_Geom.validateShape(zpp);
    const inner = (point as any).zpp_inner;
    if (inner._validate != null) inner._validate();
    const ret = ZPP_Collide.shapeContains(zpp, inner);
    if (inner.weak) {
      point.dispose();
    }
    return ret;
  }

  /**
   * Create a deep copy of this shape with the same type, geometry, material, and filter.
   * @returns A new Shape instance independent of this one.
   */
  copy(): Shape {
    const result = (this as any).zpp_inner.copy();
    // ZPP_Shape.copy() returns the compiled wrapper — rewrap into TS class
    return result instanceof Shape ? result : Shape._wrap(result);
  }

  override toString(): string {
    const zpp = (this as any).zpp_inner;
    const ret = zpp.type === 0 ? "Circle" : "Polygon";
    return ret + "#" + this.zpp_inner_i.id;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Setup worldCOM lazy Vec2 wrapper */
  private _setupWorldCOM(): void {
    const nape = getNape();
    const zpp = (this as any).zpp_inner;
    const x = zpp.worldCOMx;
    const y = zpp.worldCOMy;
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    // Get or create Vec2 from pool
    let ret: any;
    if (ZPP_PubPool.poolVec2 == null) {
      ret = new nape.geom.Vec2();
    } else {
      ret = ZPP_PubPool.poolVec2;
      ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret === ZPP_PubPool.nextVec2) {
        ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret.zpp_inner == null) {
      let ret1: any;
      if (ZPP_Vec2.zpp_pool == null) {
        ret1 = new ZPP_Vec2();
      } else {
        ret1 = ZPP_Vec2.zpp_pool;
        ZPP_Vec2.zpp_pool = ret1.next;
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
    zpp.wrap_worldCOM = ret;
    zpp.wrap_worldCOM.zpp_inner._inuse = true;
    zpp.wrap_worldCOM.zpp_inner._immutable = true;
    zpp.wrap_worldCOM.zpp_inner._validate = zpp.getworldCOM.bind(zpp);
  }
}

/** Lightweight typed interface for the callback type set on a shape. */
export interface CbTypeSet {
  readonly _inner: NapeInner;
  add(cbType: { _inner: NapeInner }): void;
  remove(cbType: { _inner: NapeInner }): void;
  has(cbType: { _inner: NapeInner }): boolean;
  clear(): void;
  readonly length: number;
}
