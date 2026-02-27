import { getNape } from "../core/engine";
import { wrapWith } from "../core/registry";
import { Vec2 } from "../geom/Vec2";
import { AABB } from "../geom/AABB";
import { Material } from "../phys/Material";
import { FluidProperties } from "../phys/FluidProperties";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { ShapeType, fromNativeShapeType } from "./ShapeType";

// Forward declaration — avoids circular import at module level.
// The concrete subclasses register themselves after loading.
let _CircleClass: any = null;
let _PolygonClass: any = null;

/** @internal Called by Circle.ts to register itself. */
export function _registerCircleClass(cls: any): void {
  _CircleClass = cls;
}
/** @internal Called by Polygon.ts to register itself. */
export function _registerPolygonClass(cls: any): void {
  _PolygonClass = cls;
}

/**
 * Base class for physics shapes (Circle, Polygon).
 */
export class Shape {
  /** @internal */
  _inner: any;

  /** @internal – shapes are created via Circle or Polygon constructors. */
  protected constructor() {}

  /** @internal */
  static _wrap(inner: any): Shape {
    if (!inner) return null as unknown as Shape;
    const s = Object.create(Shape.prototype) as Shape;
    s._inner = inner;
    return s;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get type(): ShapeType {
    return fromNativeShapeType(this._inner.get_type());
  }

  /** The body this shape is attached to (null if none). */
  get body(): any {
    return wrapWith("Body", this._inner.get_body());
  }
  set body(value: any) {
    this._inner.set_body(value?._inner ?? null);
  }

  get worldCOM(): Vec2 {
    return Vec2._wrap(this._inner.get_worldCOM());
  }

  get localCOM(): Vec2 {
    return Vec2._wrap(this._inner.get_localCOM());
  }
  set localCOM(value: Vec2) {
    this._inner.set_localCOM(value._inner);
  }

  get area(): number {
    return this._inner.get_area();
  }

  get inertia(): number {
    return this._inner.get_inertia();
  }

  get angDrag(): number {
    return this._inner.get_angDrag();
  }

  get material(): Material {
    return Material._wrap(this._inner.get_material());
  }
  set material(value: Material) {
    this._inner.set_material(value._inner);
  }

  get filter(): InteractionFilter {
    return InteractionFilter._wrap(this._inner.get_filter());
  }
  set filter(value: InteractionFilter) {
    this._inner.set_filter(value._inner);
  }

  get fluidProperties(): FluidProperties {
    return FluidProperties._wrap(this._inner.get_fluidProperties());
  }
  set fluidProperties(value: FluidProperties) {
    this._inner.set_fluidProperties(value._inner);
  }

  /** Callback types assigned to this shape. */
  get cbTypes(): any {
    const raw = this._inner.get_cbTypes();
    return {
      _inner: raw,
      add(cbType: any) { raw.add(cbType._inner ?? cbType); },
      remove(cbType: any) { raw.remove(cbType._inner ?? cbType); },
      has(cbType: any) { return raw.has(cbType._inner ?? cbType); },
      clear() { raw.clear(); },
      get length() { return raw.get_length(); },
    };
  }

  get fluidEnabled(): boolean {
    return this._inner.get_fluidEnabled();
  }
  set fluidEnabled(value: boolean) {
    this._inner.set_fluidEnabled(value);
  }

  get sensorEnabled(): boolean {
    return this._inner.get_sensorEnabled();
  }
  set sensorEnabled(value: boolean) {
    this._inner.set_sensorEnabled(value);
  }

  get bounds(): AABB {
    return AABB._wrap(this._inner.get_bounds());
  }

  /** Cast to Circle — returns the Circle wrapper or null if not a circle. */
  get castCircle(): any {
    const raw = this._inner.get_castCircle();
    if (!raw || !_CircleClass) return null;
    return _CircleClass._wrap(raw);
  }

  /** Cast to Polygon — returns the Polygon wrapper or null if not a polygon. */
  get castPolygon(): any {
    const raw = this._inner.get_castPolygon();
    if (!raw || !_PolygonClass) return null;
    return _PolygonClass._wrap(raw);
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  isCircle(): boolean {
    return this._inner.isCircle();
  }

  isPolygon(): boolean {
    return this._inner.isPolygon();
  }

  translate(translation: Vec2): void {
    this._inner.translate(translation._inner);
  }

  scale(scaleX: number, scaleY: number): void {
    this._inner.scale(scaleX, scaleY);
  }

  rotate(angle: number): void {
    this._inner.rotate(angle);
  }

  transform(matrix: any): void {
    this._inner.transform(matrix?._inner ?? matrix);
  }

  contains(point: Vec2): boolean {
    return this._inner.contains(point._inner);
  }

  copy(): Shape {
    return Shape._wrap(this._inner.copy());
  }

  toString(): string {
    return this._inner.toString();
  }
}
