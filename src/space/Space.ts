import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { AABB } from "../geom/AABB";
import { NapeList } from "../util/NapeList";
import { Body } from "../phys/Body";
import { Shape } from "../shape/Shape";

/**
 * The physics world. Add bodies and constraints, then call `step()` each frame.
 */
export class Space {
  /** @internal */
  readonly _inner: NapeInner;

  constructor(gravity?: Vec2) {
    this._inner = new (getNape()).space.Space(gravity?._inner);
  }

  /** @internal */
  static _wrap(inner: NapeInner): Space {
    return getOrCreate(inner, (raw) => {
      const s = Object.create(Space.prototype) as Space;
      (s as Writable<Space>)._inner = raw;
      return s;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get gravity(): Vec2 { return Vec2._wrap(this._inner.get_gravity()); }
  set gravity(value: Vec2) { this._inner.set_gravity(value._inner); }

  get worldLinearDrag(): number { return this._inner.get_worldLinearDrag(); }
  set worldLinearDrag(value: number) { this._inner.set_worldLinearDrag(value); }

  get worldAngularDrag(): number { return this._inner.get_worldAngularDrag(); }
  set worldAngularDrag(value: number) { this._inner.set_worldAngularDrag(value); }

  get sortContacts(): boolean { return this._inner.get_sortContacts(); }
  set sortContacts(value: boolean) { this._inner.set_sortContacts(value); }

  get bodies(): NapeList<Body> {
    return new NapeList(this._inner.get_bodies(), Body._wrap);
  }

  get liveBodies(): NapeList<Body> {
    return new NapeList(this._inner.get_liveBodies(), Body._wrap);
  }

  get constraints(): NapeInner { return this._inner.get_constraints(); }
  get liveConstraints(): NapeInner { return this._inner.get_liveConstraints(); }
  get arbiters(): NapeInner { return this._inner.get_arbiters(); }
  get listeners(): NapeInner { return this._inner.get_listeners(); }
  get compounds(): NapeInner { return this._inner.get_compounds(); }

  /** The static world body (always present, immovable). */
  get world(): Body { return Body._wrap(this._inner.get_world()); }

  get timeStamp(): number { return this._inner.get_timeStamp(); }
  get elapsedTime(): number { return this._inner.get_elapsedTime(); }
  get broadphase(): NapeInner { return this._inner.get_broadphase(); }
  get userData(): Record<string, unknown> { return this._inner.get_userData(); }

  // ---------------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------------

  step(deltaTime: number, velocityIterations: number = 10, positionIterations: number = 10): void {
    this._inner.step(deltaTime, velocityIterations, positionIterations);
  }

  clear(): void { this._inner.clear(); }

  // ---------------------------------------------------------------------------
  // Visitors
  // ---------------------------------------------------------------------------

  visitBodies(fn: (body: Body) => void): void {
    this._inner.visitBodies((raw: NapeInner) => fn(Body._wrap(raw)));
  }

  visitConstraints(fn: (constraint: NapeInner) => void): void {
    this._inner.visitConstraints(fn);
  }

  visitCompounds(fn: (compound: NapeInner) => void): void {
    this._inner.visitCompounds(fn);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  shapesUnderPoint(point: Vec2, filter?: InteractionFilterLike, output?: NapeInner): NapeInner {
    return this._inner.shapesUnderPoint(point._inner, filter?._inner ?? filter, output);
  }

  bodiesUnderPoint(point: Vec2, filter?: InteractionFilterLike, output?: NapeInner): NapeInner {
    return this._inner.bodiesUnderPoint(point._inner, filter?._inner ?? filter, output);
  }

  shapesInAABB(aabb: AABB, containment?: boolean, strict?: boolean, filter?: InteractionFilterLike, output?: NapeInner): NapeInner {
    return this._inner.shapesInAABB(aabb._inner, containment, strict, filter?._inner ?? filter, output);
  }

  bodiesInAABB(aabb: AABB, containment?: boolean, strict?: boolean, filter?: InteractionFilterLike, output?: NapeInner): NapeInner {
    return this._inner.bodiesInAABB(aabb._inner, containment, strict, filter?._inner ?? filter, output);
  }

  rayCast(ray: { _inner: NapeInner } | NapeInner, inner?: boolean, filter?: InteractionFilterLike): NapeInner {
    return this._inner.rayCast(ray?._inner ?? ray, inner, filter?._inner ?? filter);
  }

  rayMultiCast(ray: { _inner: NapeInner } | NapeInner, inner?: boolean, filter?: InteractionFilterLike, output?: NapeInner): NapeInner {
    return this._inner.rayMultiCast(ray?._inner ?? ray, inner, filter?._inner ?? filter, output);
  }

  toString(): string { return `Space(bodies=${this.bodies.length})`; }
}

/** @internal Helper type for filter-like parameters. */
type InteractionFilterLike = { _inner: NapeInner } | NapeInner | undefined;
