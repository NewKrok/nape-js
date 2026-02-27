import { getNape } from "../core/engine";
import { registerWrapper } from "../core/registry";
import { Vec2 } from "../geom/Vec2";
import { AABB } from "../geom/AABB";
import { NapeList } from "../util/NapeList";
import { Body } from "../phys/Body";
import { Shape } from "../shape/Shape";

/**
 * The physics world. Add bodies and constraints, then call `step()` each frame.
 */
export class Space {
  /** @internal */
  _inner: any;

  constructor(gravity?: Vec2) {
    const nape = getNape();
    this._inner = new nape.space.Space(gravity?._inner);
  }

  /** @internal */
  static _wrap(inner: any): Space {
    if (!inner) return null as unknown as Space;
    const s = Object.create(Space.prototype) as Space;
    s._inner = inner;
    return s;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get gravity(): Vec2 {
    return Vec2._wrap(this._inner.get_gravity());
  }
  set gravity(value: Vec2) {
    this._inner.set_gravity(value._inner);
  }

  get worldLinearDrag(): number {
    return this._inner.get_worldLinearDrag();
  }
  set worldLinearDrag(value: number) {
    this._inner.set_worldLinearDrag(value);
  }

  get worldAngularDrag(): number {
    return this._inner.get_worldAngularDrag();
  }
  set worldAngularDrag(value: number) {
    this._inner.set_worldAngularDrag(value);
  }

  get sortContacts(): boolean {
    return this._inner.get_sortContacts();
  }
  set sortContacts(value: boolean) {
    this._inner.set_sortContacts(value);
  }

  get bodies(): NapeList<Body> {
    return new NapeList(this._inner.get_bodies(), Body._wrap);
  }

  get liveBodies(): NapeList<Body> {
    return new NapeList(this._inner.get_liveBodies(), Body._wrap);
  }

  get constraints(): any {
    return this._inner.get_constraints();
  }

  get liveConstraints(): any {
    return this._inner.get_liveConstraints();
  }

  get arbiters(): any {
    return this._inner.get_arbiters();
  }

  get listeners(): any {
    return this._inner.get_listeners();
  }

  get compounds(): any {
    return this._inner.get_compounds();
  }

  /** The static world body (always present, immovable). */
  get world(): Body {
    return Body._wrap(this._inner.get_world());
  }

  get timeStamp(): number {
    return this._inner.get_timeStamp();
  }

  get elapsedTime(): number {
    return this._inner.get_elapsedTime();
  }

  get broadphase(): any {
    return this._inner.get_broadphase();
  }

  get userData(): any {
    return this._inner.get_userData();
  }

  // ---------------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------------

  /**
   * Advance the simulation by one time step.
   *
   * @param deltaTime           Time to advance (seconds), e.g. 1/60.
   * @param velocityIterations  Velocity solver iterations (default 10).
   * @param positionIterations  Position solver iterations (default 10).
   */
  step(
    deltaTime: number,
    velocityIterations: number = 10,
    positionIterations: number = 10,
  ): void {
    this._inner.step(deltaTime, velocityIterations, positionIterations);
  }

  /** Remove all bodies, constraints, and listeners. */
  clear(): void {
    this._inner.clear();
  }

  // ---------------------------------------------------------------------------
  // Visitors
  // ---------------------------------------------------------------------------

  /** Call `fn` for every body in the space. */
  visitBodies(fn: (body: Body) => void): void {
    this._inner.visitBodies((raw: any) => fn(Body._wrap(raw)));
  }

  /** Call `fn` for every constraint in the space. */
  visitConstraints(fn: (constraint: any) => void): void {
    this._inner.visitConstraints(fn);
  }

  /** Call `fn` for every compound in the space. */
  visitCompounds(fn: (compound: any) => void): void {
    this._inner.visitCompounds(fn);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** Find shapes under a world-space point. */
  shapesUnderPoint(
    point: Vec2,
    filter?: any,
    output?: any,
  ): any {
    return this._inner.shapesUnderPoint(
      point._inner,
      filter?._inner ?? filter,
      output,
    );
  }

  /** Find bodies under a world-space point. */
  bodiesUnderPoint(
    point: Vec2,
    filter?: any,
    output?: any,
  ): any {
    return this._inner.bodiesUnderPoint(
      point._inner,
      filter?._inner ?? filter,
      output,
    );
  }

  /** Find shapes inside an AABB. */
  shapesInAABB(
    aabb: AABB,
    containment?: boolean,
    strict?: boolean,
    filter?: any,
    output?: any,
  ): any {
    return this._inner.shapesInAABB(
      aabb._inner,
      containment,
      strict,
      filter?._inner ?? filter,
      output,
    );
  }

  /** Find bodies inside an AABB. */
  bodiesInAABB(
    aabb: AABB,
    containment?: boolean,
    strict?: boolean,
    filter?: any,
    output?: any,
  ): any {
    return this._inner.bodiesInAABB(
      aabb._inner,
      containment,
      strict,
      filter?._inner ?? filter,
      output,
    );
  }

  /** Cast a ray into the space. */
  rayCast(ray: any, inner?: boolean, filter?: any): any {
    return this._inner.rayCast(
      ray?._inner ?? ray,
      inner,
      filter?._inner ?? filter,
    );
  }

  /** Cast a ray and return all hits. */
  rayMultiCast(ray: any, inner?: boolean, filter?: any, output?: any): any {
    return this._inner.rayMultiCast(
      ray?._inner ?? ray,
      inner,
      filter?._inner ?? filter,
      output,
    );
  }

  toString(): string {
    return `Space(bodies=${this.bodies.length})`;
  }
}

registerWrapper("Space", Space._wrap);
