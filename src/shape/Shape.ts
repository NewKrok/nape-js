import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { AABB } from "../geom/AABB";
import { Body } from "../phys/Body";
import { Material } from "../phys/Material";
import { FluidProperties } from "../phys/FluidProperties";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { ShapeType, fromNativeShapeType } from "./ShapeType";

// ---------------------------------------------------------------------------
// Subclass wrap bindings — Circle and Polygon register their _wrap functions
// here at module load time to avoid circular `import` (they extend Shape).
// ---------------------------------------------------------------------------

type SubclassWrapFn = (inner: NapeInner) => Shape;
let _circleWrap: SubclassWrapFn | undefined;
let _polygonWrap: SubclassWrapFn | undefined;

/** @internal Called by Circle at module init. */
export function _bindCircleWrap(fn: SubclassWrapFn): void { _circleWrap = fn; }
/** @internal Called by Polygon at module init. */
export function _bindPolygonWrap(fn: SubclassWrapFn): void { _polygonWrap = fn; }

/**
 * Base class for physics shapes (Circle, Polygon).
 */
export class Shape {
  /** @internal */
  readonly _inner: NapeInner;

  /** @internal – shapes are created via Circle or Polygon constructors. */
  protected constructor() {
    // _inner is assigned by subclass constructors
    (this as Writable<Shape>)._inner = undefined!;
  }

  /** @internal */
  static _wrap(inner: NapeInner): Shape {
    if (!inner) return null as unknown as Shape;

    // Dispatch to concrete subclass wrapper based on runtime type
    if (inner.isCircle() && _circleWrap) return _circleWrap(inner);
    if (inner.isPolygon() && _polygonWrap) return _polygonWrap(inner);

    // Fallback: generic Shape wrapper
    return getOrCreate(inner, (raw) => {
      const s = Object.create(Shape.prototype) as Shape;
      (s as Writable<Shape>)._inner = raw;
      return s;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get type(): ShapeType {
    return fromNativeShapeType(this._inner.get_type());
  }

  get body(): Body {
    return Body._wrap(this._inner.get_body());
  }
  set body(value: Body | null) {
    this._inner.set_body(value?._inner ?? null);
  }

  get worldCOM(): Vec2 { return Vec2._wrap(this._inner.get_worldCOM()); }

  get localCOM(): Vec2 { return Vec2._wrap(this._inner.get_localCOM()); }
  set localCOM(value: Vec2) { this._inner.set_localCOM(value._inner); }

  get area(): number { return this._inner.get_area(); }
  get inertia(): number { return this._inner.get_inertia(); }
  get angDrag(): number { return this._inner.get_angDrag(); }

  get material(): Material { return Material._wrap(this._inner.get_material()); }
  set material(value: Material) { this._inner.set_material(value._inner); }

  get filter(): InteractionFilter { return InteractionFilter._wrap(this._inner.get_filter()); }
  set filter(value: InteractionFilter) { this._inner.set_filter(value._inner); }

  get fluidProperties(): FluidProperties { return FluidProperties._wrap(this._inner.get_fluidProperties()); }
  set fluidProperties(value: FluidProperties) { this._inner.set_fluidProperties(value._inner); }

  /** Callback types assigned to this shape. */
  get cbTypes(): CbTypeSet {
    const raw = this._inner.get_cbTypes();
    return {
      _inner: raw,
      add(cbType: { _inner: NapeInner }) { raw.add(cbType._inner); },
      remove(cbType: { _inner: NapeInner }) { raw.remove(cbType._inner); },
      has(cbType: { _inner: NapeInner }): boolean { return raw.has(cbType._inner); },
      clear() { raw.clear(); },
      get length(): number { return raw.get_length(); },
    };
  }

  get fluidEnabled(): boolean { return this._inner.get_fluidEnabled(); }
  set fluidEnabled(value: boolean) { this._inner.set_fluidEnabled(value); }

  get sensorEnabled(): boolean { return this._inner.get_sensorEnabled(); }
  set sensorEnabled(value: boolean) { this._inner.set_sensorEnabled(value); }

  get bounds(): AABB { return AABB._wrap(this._inner.get_bounds()); }

  /** Cast to Circle — returns the Circle wrapper or null if not a circle. */
  get castCircle(): Shape | null {
    const raw = this._inner.get_castCircle();
    if (!raw || !_circleWrap) return null;
    return _circleWrap(raw);
  }

  /** Cast to Polygon — returns the Polygon wrapper or null if not a polygon. */
  get castPolygon(): Shape | null {
    const raw = this._inner.get_castPolygon();
    if (!raw || !_polygonWrap) return null;
    return _polygonWrap(raw);
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  isCircle(): boolean { return this._inner.isCircle(); }
  isPolygon(): boolean { return this._inner.isPolygon(); }

  translate(translation: Vec2): void { this._inner.translate(translation._inner); }
  scale(scaleX: number, scaleY: number): void { this._inner.scale(scaleX, scaleY); }
  rotate(angle: number): void { this._inner.rotate(angle); }
  transform(matrix: { _inner: NapeInner }): void { this._inner.transform(matrix._inner); }
  contains(point: Vec2): boolean { return this._inner.contains(point._inner); }

  copy(): Shape { return Shape._wrap(this._inner.copy()); }
  toString(): string { return this._inner.toString(); }
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
