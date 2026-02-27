import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";

/**
 * 2D vector used for positions, velocities, forces, and other 2D quantities.
 *
 * Many methods return a new Vec2 unless noted as "in-place".
 */
export class Vec2 {
  /** @internal Raw Haxe nape Vec2 object. */
  readonly _inner: NapeInner;

  constructor(x: number = 0, y: number = 0) {
    this._inner = new (getNape()).geom.Vec2(x, y);
  }

  /** @internal Wrap an existing Haxe Vec2 with caching. */
  static _wrap(inner: NapeInner): Vec2 {
    return getOrCreate(inner, (raw) => {
      const v = Object.create(Vec2.prototype) as Vec2;
      (v as Writable<Vec2>)._inner = raw;
      return v;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get x(): number {
    return this._inner.get_x();
  }
  set x(value: number) {
    this._inner.set_x(value);
  }

  get y(): number {
    return this._inner.get_y();
  }
  set y(value: number) {
    this._inner.set_y(value);
  }

  /** Magnitude of the vector. Setting this scales the vector to the given length. */
  get length(): number {
    return this._inner.get_length();
  }
  set length(value: number) {
    this._inner.set_length(value);
  }

  /** Angle of the vector in radians (measured from the +x axis). */
  get angle(): number {
    return this._inner.get_angle();
  }
  set angle(value: number) {
    this._inner.set_angle(value);
  }

  // ---------------------------------------------------------------------------
  // Instance methods
  // ---------------------------------------------------------------------------

  /** Squared length — avoids a square root when only comparison is needed. */
  lsq(): number {
    return this._inner.lsq();
  }

  /** Copy values from another vector into this one (in-place). */
  set(other: Vec2): this {
    this._inner.set(other._inner);
    return this;
  }

  /** Set both components at once (in-place). */
  setxy(x: number, y: number): this {
    this._inner.setxy(x, y);
    return this;
  }

  /** Return a new copy of this vector. */
  copy(weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.copy(weak));
  }

  /** Rotate this vector by the given angle in radians (in-place). */
  rotate(angle: number): this {
    this._inner.rotate(angle);
    return this;
  }

  /** Reflect this vector about the given axis vector (returns new Vec2). */
  reflect(axis: Vec2, weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.reflect(axis._inner, weak));
  }

  /** Normalize this vector to unit length (in-place). Returns original length. */
  normalise(): number {
    return this._inner.normalise();
  }

  /** Return a new unit-length vector with the same direction. */
  unit(weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.unit(weak));
  }

  /** Return a new vector = this + other. */
  add(other: Vec2, weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.add(other._inner, weak));
  }

  /** Return a new vector = this + other * scalar. */
  addMul(other: Vec2, scalar: number, weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.addMul(other._inner, scalar, weak));
  }

  /** Return a new vector = this − other. */
  sub(other: Vec2, weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.sub(other._inner, weak));
  }

  /** Return a new vector = this * scalar. */
  mul(scalar: number, weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.mul(scalar, weak));
  }

  /** this += other (in-place). */
  addeq(other: Vec2): this {
    this._inner.addeq(other._inner);
    return this;
  }

  /** this -= other (in-place). */
  subeq(other: Vec2): this {
    this._inner.subeq(other._inner);
    return this;
  }

  /** this *= scalar (in-place). */
  muleq(scalar: number): this {
    this._inner.muleq(scalar);
    return this;
  }

  /** Dot product of this and other. */
  dot(other: Vec2): number {
    return this._inner.dot(other._inner);
  }

  /** 2D cross product (returns scalar: this.x*other.y − this.y*other.x). */
  cross(other: Vec2): number {
    return this._inner.cross(other._inner);
  }

  /** Return the perpendicular vector (rotated 90° counter-clockwise). */
  perp(weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.perp(weak));
  }

  /** Release this vector back to the object pool. */
  dispose(): void {
    this._inner.dispose();
  }

  toString(): string {
    return this._inner.toString();
  }

  // ---------------------------------------------------------------------------
  // Static factory methods
  // ---------------------------------------------------------------------------

  /** Obtain a Vec2 from the object pool (or create a new one). */
  static get(x: number = 0, y: number = 0, weak: boolean = false): Vec2 {
    return Vec2._wrap(getNape().geom.Vec2.get(x, y, weak));
  }

  /** Obtain a weak Vec2 that auto-disposes after a single use. */
  static weak(x: number = 0, y: number = 0): Vec2 {
    return Vec2._wrap(getNape().geom.Vec2.weak(x, y));
  }

  /** Create a Vec2 from polar coordinates. */
  static fromPolar(length: number, angle: number, weak: boolean = false): Vec2 {
    return Vec2._wrap(getNape().geom.Vec2.fromPolar(length, angle, weak));
  }
}

// ---------------------------------------------------------------------------
// Internal type helpers (used across wrapper modules)
// ---------------------------------------------------------------------------

/** @internal Opaque handle for any Haxe-compiled nape object. */
export type NapeInner = any;

/** @internal Helper to write to readonly properties during construction. */
export type Writable<T> = { -readonly [P in keyof T]: T[P] };
