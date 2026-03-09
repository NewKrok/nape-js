import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner } from "../geom/Vec2";
import { AABB } from "../geom/AABB";
import { Body } from "../phys/Body";
import { Constraint } from "../constraint/Constraint";
import { Shape } from "../shape/Shape";
import { Ray } from "../geom/Ray";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { ZPP_Space } from "../native/space/ZPP_Space";
import { ZPP_SpaceArbiterList } from "../native/dynamics/ZPP_SpaceArbiterList";
import { ZPP_Flags } from "../native/util/ZPP_Flags";
import type { Broadphase } from "./Broadphase";
import type { Compound } from "../phys/Compound";
import type { InteractionType } from "../callbacks/InteractionType";
import type { NapeInner as _NapeInner } from "../geom/Vec2";

/**
 * The physics world. Add bodies, shapes, and constraints, then call `step()` each frame to advance the simulation.
 */
export class Space {
  zpp_inner!: ZPP_Space;

  /**
   * @param gravity - Initial gravity vector (default (0, 0)).
   * @param broadphase - Broadphase algorithm to use.
   */
  constructor(gravity?: Vec2, broadphase?: Broadphase) {
    if (gravity != null && gravity.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }

    const gravityInner =
      gravity == null ? null : gravity.zpp_inner;
    this.zpp_inner = new ZPP_Space(gravityInner, broadphase);
    this.zpp_inner.outer = this;

    // Dispose weak gravity Vec2
    if (gravity != null && gravity.zpp_inner?.weak) {
      gravity.dispose();
    }
  }

  /** @internal */
  get _inner(): this {
    return this;
  }

  /** @internal */
  static _wrap(inner: NapeInner): Space {
    if (!inner) return null as unknown as Space;
    if (inner instanceof Space) return inner;
    if (inner instanceof ZPP_Space) {
      if (inner.outer) return inner.outer;
      return getOrCreate(inner, (zpp: ZPP_Space) => {
        const s = Object.create(Space.prototype) as Space;
        s.zpp_inner = zpp;
        zpp.outer = s;
        return s;
      });
    }
    if (inner.zpp_inner?.outer) return inner.zpp_inner.outer;
    return getOrCreate(inner, (raw: _NapeInner) => {
      const s = Object.create(Space.prototype) as Space;
      s.zpp_inner = (raw as any).zpp_inner ?? raw;
      s.zpp_inner.outer = s;
      return s;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /** Arbitrary user data attached to this Space. */
  get userData(): Record<string, unknown> {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  }

  /**
   * World gravity applied to all dynamic bodies each step. Live Vec2.
   * @throws If set to null or a disposed Vec2.
   */
  get gravity(): Vec2 {
    if (this.zpp_inner.wrap_gravity == null) {
      this.zpp_inner.getgravity();
    }
    return this.zpp_inner.wrap_gravity;
  }

  set gravity(value: Vec2) {
    if (value?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Space::gravity cannot be null");
    }
    if (this.zpp_inner.wrap_gravity == null) {
      this.zpp_inner.getgravity();
    }
    this.zpp_inner.wrap_gravity.set(value);
    if (value.zpp_inner?.weak) {
      value.dispose();
    }
  }

  /** The broadphase algorithm currently in use (SWEEP_AND_PRUNE or DYNAMIC_AABB_TREE). */
  get broadphase(): Broadphase {
    if (this.zpp_inner.bphase.is_sweep) {
      if (ZPP_Flags.Broadphase_SWEEP_AND_PRUNE == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.Broadphase_SWEEP_AND_PRUNE = new (getNape().space.Broadphase)();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.Broadphase_SWEEP_AND_PRUNE;
    } else {
      if (ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE = new (getNape().space.Broadphase)();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE;
    }
  }

  /** If true, contact points are sorted for determinism. Default: true. */
  get sortContacts(): boolean {
    return this.zpp_inner.sortcontacts;
  }
  set sortContacts(value: boolean) {
    this.zpp_inner.sortcontacts = value;
  }

  /**
   * Global angular drag coefficient applied to all bodies.
   * @throws If set to NaN.
   */
  get worldAngularDrag(): number {
    return this.zpp_inner.global_ang_drag;
  }
  set worldAngularDrag(value: number) {
    if (value !== value) {
      throw new Error("Error: Space::worldAngularDrag cannot be NaN");
    }
    this.zpp_inner.global_ang_drag = value;
  }

  /**
   * Global linear drag coefficient applied to all bodies.
   * @throws If set to NaN.
   */
  get worldLinearDrag(): number {
    return this.zpp_inner.global_lin_drag;
  }
  set worldLinearDrag(value: number) {
    if (value !== value) {
      throw new Error("Error: Space::worldLinearDrag cannot be NaN");
    }
    this.zpp_inner.global_lin_drag = value;
  }

  /** Read-only list of all Compound objects in this space. */
  get compounds(): object {
    return this.zpp_inner.wrap_compounds;
  }

  /** Read-only list of all Body objects directly in this space. */
  get bodies(): object {
    return this.zpp_inner.wrap_bodies;
  }

  /** Read-only list of bodies that are awake and actively simulated. */
  get liveBodies(): object {
    return this.zpp_inner.wrap_live;
  }

  /** Read-only list of all Constraint objects in this space. */
  get constraints(): object {
    return this.zpp_inner.wrap_constraints;
  }

  /** Read-only list of active (awake) constraints. */
  get liveConstraints(): object {
    return this.zpp_inner.wrap_livecon;
  }

  /** The static world body that acts as an immovable anchor for constraints. */
  get world(): Body {
    return Body._wrap(this.zpp_inner.__static);
  }

  /** Read-only list of all active collision/fluid arbiters. */
  get arbiters(): object {
    if (this.zpp_inner.wrap_arbiters == null) {
      const ret = new ZPP_SpaceArbiterList();
      ret.space = this.zpp_inner;
      this.zpp_inner.wrap_arbiters = ret;
    }
    return this.zpp_inner.wrap_arbiters;
  }

  /** Read-only list of all event listeners registered to this space. */
  get listeners(): object {
    return this.zpp_inner.wrap_listeners;
  }

  /** Number of `step()` calls made so far. */
  get timeStamp(): number {
    return this.zpp_inner.stamp;
  }

  /** Cumulative time simulated (sum of all `deltaTime` values passed to `step()`). */
  get elapsedTime(): number {
    return this.zpp_inner.time;
  }

  // ---------------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------------

  /**
   * Advance the simulation by `deltaTime` seconds.
   * `velocityIterations` and `positionIterations` control solver accuracy (default 10 each).
   * @param deltaTime - Time step in seconds; must be strictly positive and not NaN.
   * @param velocityIterations - Number of velocity solver iterations (minimum 1).
   * @param positionIterations - Number of position solver iterations (minimum 1).
   * @throws If `deltaTime` is NaN, non-positive, or any iteration count is less than 1.
   */
  step(
    deltaTime: number,
    velocityIterations: number = 10,
    positionIterations: number = 10,
  ): void {
    if (deltaTime !== deltaTime) {
      throw new Error("Error: deltaTime cannot be NaN");
    }
    if (deltaTime <= 0) {
      throw new Error("Error: deltaTime must be strictly positive");
    }
    if (velocityIterations <= 0) {
      throw new Error("Error: must use atleast one velocity iteration");
    }
    if (positionIterations <= 0) {
      throw new Error("Error: must use atleast one position iteration");
    }
    this.zpp_inner.step(deltaTime, velocityIterations, positionIterations);
  }

  /**
   * Remove all bodies, constraints, and compounds from this space.
   * @throws If called during a `step()`.
   */
  clear(): void {
    if (this.zpp_inner.midstep) {
      throw new Error(
        "Error: Space::clear() cannot be called during space step()",
      );
    }
    this.zpp_inner.clear();
  }

  // ---------------------------------------------------------------------------
  // Visitors
  // ---------------------------------------------------------------------------

  /**
   * Call `lambda` for every body in the space, including those inside compounds.
   * @param lambda - Callback invoked with each Body.
   * @throws If `lambda` is null.
   */
  visitBodies(lambda: (body: Body) => void): void {
    if (lambda == null) {
      throw new Error(
        "Error: lambda cannot be null for Space::visitBodies",
      );
    }
    const nape = getNape();
    // Iterate bodies
    const bodyList = this.zpp_inner.wrap_bodies;
    bodyList.zpp_inner.valmod();
    const bIter = nape.phys.BodyIterator.get(bodyList);
    while (true) {
      bIter.zpp_inner.zpp_inner.valmod();
      const bi = bIter.zpp_inner;
      bi.zpp_inner.valmod();
      if (bi.zpp_inner.zip_length) {
        bi.zpp_inner.zip_length = false;
        bi.zpp_inner.user_length = bi.zpp_inner.inner.length;
      }
      const len = bi.zpp_inner.user_length;
      bIter.zpp_critical = true;
      if (bIter.zpp_i >= len) {
        bIter.zpp_next = nape.phys.BodyIterator.zpp_pool;
        nape.phys.BodyIterator.zpp_pool = bIter;
        bIter.zpp_inner = null;
        break;
      }
      bIter.zpp_critical = false;
      lambda(bIter.zpp_inner.at(bIter.zpp_i++));
    }
    // Recurse into compounds
    const compList = this.zpp_inner.wrap_compounds;
    compList.zpp_inner.valmod();
    const cIter = nape.phys.CompoundIterator.get(compList);
    while (true) {
      cIter.zpp_inner.zpp_inner.valmod();
      const ci = cIter.zpp_inner;
      ci.zpp_inner.valmod();
      if (ci.zpp_inner.zip_length) {
        ci.zpp_inner.zip_length = false;
        ci.zpp_inner.user_length = ci.zpp_inner.inner.length;
      }
      const len = ci.zpp_inner.user_length;
      cIter.zpp_critical = true;
      if (cIter.zpp_i >= len) {
        cIter.zpp_next = nape.phys.CompoundIterator.zpp_pool;
        nape.phys.CompoundIterator.zpp_pool = cIter;
        cIter.zpp_inner = null;
        break;
      }
      cIter.zpp_critical = false;
      const c = cIter.zpp_inner.at(cIter.zpp_i++);
      c.visitBodies(lambda);
    }
  }

  /**
   * Call `lambda` for every constraint in the space, including those inside compounds.
   * @param lambda - Callback invoked with each Constraint.
   * @throws If `lambda` is null.
   */
  visitConstraints(lambda: (constraint: Constraint) => void): void {
    if (lambda == null) {
      throw new Error(
        "Error: lambda cannot be null for Space::visitConstraints",
      );
    }
    const nape = getNape();
    // Iterate constraints
    const conList = this.zpp_inner.wrap_constraints;
    conList.zpp_inner.valmod();
    const cIter = nape.constraint.ConstraintIterator.get(conList);
    while (true) {
      cIter.zpp_inner.zpp_inner.valmod();
      const ci = cIter.zpp_inner;
      ci.zpp_inner.valmod();
      if (ci.zpp_inner.zip_length) {
        ci.zpp_inner.zip_length = false;
        ci.zpp_inner.user_length = ci.zpp_inner.inner.length;
      }
      const len = ci.zpp_inner.user_length;
      cIter.zpp_critical = true;
      if (cIter.zpp_i >= len) {
        cIter.zpp_next = nape.constraint.ConstraintIterator.zpp_pool;
        nape.constraint.ConstraintIterator.zpp_pool = cIter;
        cIter.zpp_inner = null;
        break;
      }
      cIter.zpp_critical = false;
      lambda(cIter.zpp_inner.at(cIter.zpp_i++));
    }
    // Recurse into compounds
    const compList = this.zpp_inner.wrap_compounds;
    compList.zpp_inner.valmod();
    const coIter = nape.phys.CompoundIterator.get(compList);
    while (true) {
      coIter.zpp_inner.zpp_inner.valmod();
      const ci = coIter.zpp_inner;
      ci.zpp_inner.valmod();
      if (ci.zpp_inner.zip_length) {
        ci.zpp_inner.zip_length = false;
        ci.zpp_inner.user_length = ci.zpp_inner.inner.length;
      }
      const len = ci.zpp_inner.user_length;
      coIter.zpp_critical = true;
      if (coIter.zpp_i >= len) {
        coIter.zpp_next = nape.phys.CompoundIterator.zpp_pool;
        nape.phys.CompoundIterator.zpp_pool = coIter;
        coIter.zpp_inner = null;
        break;
      }
      coIter.zpp_critical = false;
      const c = coIter.zpp_inner.at(coIter.zpp_i++);
      c.visitConstraints(lambda);
    }
  }

  /**
   * Call `lambda` for every compound in the space (recursively).
   * @param lambda - Callback invoked with each Compound.
   * @throws If `lambda` is null.
   */
  visitCompounds(lambda: (compound: Compound) => void): void {
    if (lambda == null) {
      throw new Error(
        "Error: lambda cannot be null for Space::visitCompounds",
      );
    }
    const nape = getNape();
    const compList = this.zpp_inner.wrap_compounds;
    compList.zpp_inner.valmod();
    const cIter = nape.phys.CompoundIterator.get(compList);
    while (true) {
      cIter.zpp_inner.zpp_inner.valmod();
      const ci = cIter.zpp_inner;
      ci.zpp_inner.valmod();
      if (ci.zpp_inner.zip_length) {
        ci.zpp_inner.zip_length = false;
        ci.zpp_inner.user_length = ci.zpp_inner.inner.length;
      }
      const len = ci.zpp_inner.user_length;
      cIter.zpp_critical = true;
      if (cIter.zpp_i >= len) {
        cIter.zpp_next = nape.phys.CompoundIterator.zpp_pool;
        nape.phys.CompoundIterator.zpp_pool = cIter;
        cIter.zpp_inner = null;
        break;
      }
      cIter.zpp_critical = false;
      const c = cIter.zpp_inner.at(cIter.zpp_i++);
      lambda(c);
      c.visitCompounds(lambda);
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * Determine the type of interaction between two shapes (COLLISION, FLUID, SENSOR, or null if they don't interact).
   * @param shape1 - The first shape; must belong to a Body.
   * @param shape2 - The second shape; must belong to a Body.
   * @returns The InteractionType, or null if the shapes would not interact.
   * @throws If either shape is null or not attached to a Body.
   */
  interactionType(shape1: Shape, shape2: Shape): InteractionType | null {
    if (shape1 == null || shape2 == null) {
      throw new Error(
        "Error: Cannot evaluate interaction type for null shapes",
      );
    }
    const s1 = (shape1 as any).zpp_inner;
    const s2 = (shape2 as any).zpp_inner;
    if ((s1.body != null ? s1.body.outer : null) == null ||
        (s2.body != null ? s2.body.outer : null) == null) {
      throw new Error(
        "Error: Cannot evaluate interaction type for shapes not part of a Body",
      );
    }
    const b1 = s1.body;
    const b2 = s2.body;
    // Both static → no interaction
    if (b1.type == 1 && b2.type == 1) return null;
    // Same body → no interaction
    if (b1.outer == b2.outer) return null;

    // Check constraint-based ignore
    let con_ignore = false;
    let cx_ite = b1.constraints.head;
    while (cx_ite != null) {
      const con = cx_ite.elt;
      if (con.ignore && con.pair_exists(b1.id, b2.id)) {
        con_ignore = true;
        break;
      }
      cx_ite = cx_ite.next;
    }

    // Check group-based ignore
    let shouldInteract: boolean;
    if (!con_ignore) {
      let cur: any = s1;
      while (cur != null && cur.group == null) {
        if (cur.ishape != null) cur = cur.ishape.body;
        else if (cur.icompound != null) cur = cur.icompound.compound;
        else cur = cur.ibody.compound;
      }
      let g1 = cur == null ? null : cur.group;

      let groupIgnore: boolean;
      if (g1 == null) {
        groupIgnore = false;
      } else {
        let cur2: any = s2;
        while (cur2 != null && cur2.group == null) {
          if (cur2.ishape != null) cur2 = cur2.ishape.body;
          else if (cur2.icompound != null) cur2 = cur2.icompound.compound;
          else cur2 = cur2.ibody.compound;
        }
        let g2 = cur2 == null ? null : cur2.group;
        if (g2 == null) {
          groupIgnore = false;
        } else {
          let ret = false;
          while (g1 != null && g2 != null) {
            if (g1 == g2) {
              ret = g1.ignore;
              break;
            }
            if (g1.depth < g2.depth) g2 = g2.group;
            else g1 = g1.group;
          }
          groupIgnore = ret;
        }
      }
      shouldInteract = !groupIgnore;
    } else {
      shouldInteract = false;
    }

    if (!shouldInteract) return null;

    // Determine interaction type
    const f1 = s1.filter;
    const f2 = s2.filter;
    const bothZeroMass =
      b1.imass == 0 && b2.imass == 0 && b1.iinertia == 0 && b2.iinertia == 0;

    // Sensor?
    if (
      (s1.sensorEnabled || s2.sensorEnabled) &&
      (f1.sensorMask & f2.sensorGroup) != 0 &&
      (f2.sensorMask & f1.sensorGroup) != 0
    ) {
      if (ZPP_Flags.InteractionType_SENSOR == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.InteractionType_SENSOR = new (getNape().callbacks.InteractionType)();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.InteractionType_SENSOR;
    }

    // Fluid?
    if (
      (s1.fluidEnabled || s2.fluidEnabled) &&
      (f1.fluidMask & f2.fluidGroup) != 0 &&
      (f2.fluidMask & f1.fluidGroup) != 0 &&
      !bothZeroMass
    ) {
      if (ZPP_Flags.InteractionType_FLUID == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.InteractionType_FLUID = new (getNape().callbacks.InteractionType)();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.InteractionType_FLUID;
    }

    // Collision?
    if (
      (f1.collisionMask & f2.collisionGroup) != 0 &&
      (f2.collisionMask & f1.collisionGroup) != 0 &&
      !bothZeroMass
    ) {
      if (ZPP_Flags.InteractionType_COLLISION == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.InteractionType_COLLISION = new (getNape().callbacks.InteractionType)();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.InteractionType_COLLISION;
    }

    return null;
  }

  /**
   * Return all shapes whose geometry contains the given world-space point.
   * @param point - The world-space point to test.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing ShapeList to accumulate results into.
   * @returns A ShapeList of matching shapes.
   * @throws If `point` is null or disposed.
   */
  shapesUnderPoint(
    point: Vec2,
    filter?: InteractionFilter | null,
    output?: object | null,
  ): object {
    if (point?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (point == null) {
      throw new Error("Error: Cannot evaluate shapes under a null point :)");
    }
    const inner = point.zpp_inner;
    if (inner._validate != null) inner._validate();
    const x = inner.x;
    if (inner._validate != null) inner._validate();
    const y = inner.y;
    const filterInner =
      filter == null ? null : (filter as any).zpp_inner ?? filter;
    const ret = this.zpp_inner.shapesUnderPoint(x, y, filterInner, output);
    if (inner.weak) point.dispose();
    return ret;
  }

  /**
   * Return all bodies that have at least one shape containing the given world-space point.
   * @param point - The world-space point to test.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing BodyList to accumulate results into.
   * @returns A BodyList of matching bodies.
   * @throws If `point` is null or disposed.
   */
  bodiesUnderPoint(
    point: Vec2,
    filter?: InteractionFilter | null,
    output?: object | null,
  ): object {
    if (point?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (point == null) {
      throw new Error("Error: Cannot evaluate objects under a null point :)");
    }
    const inner = point.zpp_inner;
    if (inner._validate != null) inner._validate();
    const x = inner.x;
    if (inner._validate != null) inner._validate();
    const y = inner.y;
    const filterInner =
      filter == null ? null : (filter as any).zpp_inner ?? filter;
    const ret = this.zpp_inner.bodiesUnderPoint(x, y, filterInner, output);
    if (inner.weak) point.dispose();
    return ret;
  }

  /**
   * Return all shapes that overlap with the given AABB.
   * @param aabb - The axis-aligned bounding box to test against.
   * @param containment - If true, only shapes fully contained within the AABB are returned.
   * @param strict - If true, exact shape geometry is tested; otherwise only AABBs are compared.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing ShapeList to accumulate results into.
   * @returns A ShapeList of matching shapes.
   * @throws If `aabb` is null or degenerate (zero width or height).
   */
  shapesInAABB(
    aabb: AABB,
    containment: boolean = false,
    strict: boolean = true,
    filter?: InteractionFilter | null,
    output?: object | null,
  ): object {
    if (aabb == null) {
      throw new Error("Error: Cannot evaluate shapes in a null AABB :)");
    }
    const zi = aabb.zpp_inner;
    if (zi._validate != null) zi._validate();
    if (zi.maxx - zi.minx == 0 || zi.maxy - zi.miny == 0) {
      throw new Error("Error: Cannot evaluate shapes in degenerate AABB :/");
    }
    const filterInner =
      filter == null ? null : (filter as any).zpp_inner ?? filter;
    return this.zpp_inner.shapesInAABB(aabb, strict, containment, filterInner, output);
  }

  /**
   * Return all bodies that have at least one shape overlapping the given AABB.
   * @param aabb - The axis-aligned bounding box to test against.
   * @param containment - If true, only shapes fully contained within the AABB count.
   * @param strict - If true, exact shape geometry is tested; otherwise only AABBs are compared.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing BodyList to accumulate results into.
   * @returns A BodyList of matching bodies.
   * @throws If `aabb` is null or degenerate (zero width or height).
   */
  bodiesInAABB(
    aabb: AABB,
    containment: boolean = false,
    strict: boolean = true,
    filter?: InteractionFilter | null,
    output?: object | null,
  ): object {
    if (aabb == null) {
      throw new Error("Error: Cannot evaluate objects in a null AABB :)");
    }
    const zi = aabb.zpp_inner;
    if (zi._validate != null) zi._validate();
    if (zi.maxx - zi.minx == 0 || zi.maxy - zi.miny == 0) {
      throw new Error("Error: Cannot evaluate objects in degenerate AABB :/");
    }
    const filterInner =
      filter == null ? null : (filter as any).zpp_inner ?? filter;
    return this.zpp_inner.bodiesInAABB(aabb, strict, containment, filterInner, output);
  }

  /**
   * Return all shapes that overlap with a circle defined by `position` and `radius`.
   * @param position - World-space centre of the query circle.
   * @param radius - Radius of the query circle; must be strictly positive and not NaN.
   * @param containment - If true, only shapes fully contained within the circle are returned.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing ShapeList to accumulate results into.
   * @returns A ShapeList of matching shapes.
   * @throws If `position` is null/disposed, or `radius` is NaN or non-positive.
   */
  shapesInCircle(
    position: Vec2,
    radius: number,
    containment: boolean = false,
    filter?: InteractionFilter | null,
    output?: object | null,
  ): object {
    if (position?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (position == null) {
      throw new Error("Error: Cannot evaluate shapes at null circle :)");
    }
    if (radius !== radius) {
      throw new Error("Error: Circle radius cannot be NaN");
    }
    if (radius <= 0) {
      throw new Error("Error: Circle radius must be strictly positive");
    }
    const filterInner =
      filter == null ? null : (filter as any).zpp_inner ?? filter;
    const ret = this.zpp_inner.shapesInCircle(
      position, radius, containment, filterInner, output,
    );
    if (position.zpp_inner?.weak) position.dispose();
    return ret;
  }

  /**
   * Return all bodies that have at least one shape overlapping a query circle.
   * @param position - World-space centre of the query circle.
   * @param radius - Radius of the query circle; must be strictly positive and not NaN.
   * @param containment - If true, only shapes fully contained within the circle count.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing BodyList to accumulate results into.
   * @returns A BodyList of matching bodies.
   * @throws If `position` is null/disposed, or `radius` is NaN or non-positive.
   */
  bodiesInCircle(
    position: Vec2,
    radius: number,
    containment: boolean = false,
    filter?: InteractionFilter | null,
    output?: object | null,
  ): object {
    if (position?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (position == null) {
      throw new Error("Error: Cannot evaluate objects at null circle :)");
    }
    if (radius !== radius) {
      throw new Error("Error: Circle radius cannot be NaN");
    }
    if (radius <= 0) {
      throw new Error("Error: Circle radius must be strictly positive");
    }
    const filterInner =
      filter == null ? null : (filter as any).zpp_inner ?? filter;
    const ret = this.zpp_inner.bodiesInCircle(
      position, radius, containment, filterInner, output,
    );
    if (position.zpp_inner?.weak) position.dispose();
    return ret;
  }

  /**
   * Return all shapes in the space that overlap with `shape`.
   * @param shape - The query shape; must be attached to a Body.
   * @param containment - If true, only shapes fully contained within `shape` are returned.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing ShapeList to accumulate results into.
   * @returns A ShapeList of overlapping shapes.
   * @throws If `shape` is null, not attached to a Body, or is an invalid polygon.
   */
  shapesInShape(
    shape: Shape,
    containment: boolean = false,
    filter?: InteractionFilter | null,
    output?: object | null,
  ): object {
    if (shape == null) {
      throw new Error("Error: Cannot evaluate shapes in a null shapes :)");
    }
    const szpp = (shape as any).zpp_inner;
    if ((szpp.body != null ? szpp.body.outer : null) == null) {
      throw new Error(
        "Error: Query shape needs to be inside a Body to be well defined :)",
      );
    }
    if (szpp.type == 1) {
      const res = szpp.polygon.valid();
      if (ZPP_Flags.ValidationResult_VALID == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.ValidationResult_VALID = new (getNape().shape.ValidationResult)();
        ZPP_Flags.internal = false;
      }
      if (res != ZPP_Flags.ValidationResult_VALID) {
        throw new Error("Error: Polygon query shape is invalid : " + res.toString());
      }
    }
    const filterInner =
      filter == null ? null : (filter as any).zpp_inner ?? filter;
    return this.zpp_inner.shapesInShape(szpp, containment, filterInner, output);
  }

  /**
   * Return all bodies in the space that have at least one shape overlapping `shape`.
   * @param shape - The query shape; must be attached to a Body.
   * @param containment - If true, only shapes fully contained within `shape` count.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing BodyList to accumulate results into.
   * @returns A BodyList of overlapping bodies.
   * @throws If `shape` is null, not attached to a Body, or is an invalid polygon.
   */
  bodiesInShape(
    shape: Shape,
    containment: boolean = false,
    filter?: InteractionFilter | null,
    output?: object | null,
  ): object {
    if (shape == null) {
      throw new Error("Error: Cannot evaluate bodies in a null shapes :)");
    }
    const szpp = (shape as any).zpp_inner;
    if ((szpp.body != null ? szpp.body.outer : null) == null) {
      throw new Error(
        "Error: Query shape needs to be inside a Body to be well defined :)",
      );
    }
    if (szpp.type == 1) {
      const res = szpp.polygon.valid();
      if (ZPP_Flags.ValidationResult_VALID == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.ValidationResult_VALID = new (getNape().shape.ValidationResult)();
        ZPP_Flags.internal = false;
      }
      if (res != ZPP_Flags.ValidationResult_VALID) {
        throw new Error("Error: Polygon query shape is invalid : " + res.toString());
      }
    }
    const filterInner =
      filter == null ? null : (filter as any).zpp_inner ?? filter;
    return this.zpp_inner.bodiesInShape(szpp, containment, filterInner, output);
  }

  /**
   * Return all shapes in the space that overlap with any shape attached to `body`.
   * Equivalent to calling `shapesInShape` for each of `body`'s shapes and merging results.
   * @param body - The body whose shapes are used as the query region.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing ShapeList to accumulate results into.
   * @returns A ShapeList of overlapping shapes.
   * @throws If `body` is null.
   */
  shapesInBody(body: Body, filter?: InteractionFilter | null, output?: object | null): object {
    if (body == null) {
      throw new Error("Error: Cannot evaluate shapes in null body");
    }
    const nape = getNape();
    const ret = output == null ? new nape.shape.ShapeList() : output;
    const shapes = body.zpp_inner.wrap_shapes;
    shapes.zpp_inner.valmod();
    const sIter = nape.shape.ShapeIterator.get(shapes);
    while (true) {
      sIter.zpp_inner.zpp_inner.valmod();
      const si = sIter.zpp_inner;
      si.zpp_inner.valmod();
      if (si.zpp_inner.zip_length) {
        si.zpp_inner.zip_length = false;
        si.zpp_inner.user_length = si.zpp_inner.inner.length;
      }
      const len = si.zpp_inner.user_length;
      sIter.zpp_critical = true;
      if (sIter.zpp_i >= len) {
        sIter.zpp_next = nape.shape.ShapeIterator.zpp_pool;
        nape.shape.ShapeIterator.zpp_pool = sIter;
        sIter.zpp_inner = null;
        break;
      }
      sIter.zpp_critical = false;
      const shape = sIter.zpp_inner.at(sIter.zpp_i++);
      this.shapesInShape(shape, false, filter, ret);
    }
    return ret;
  }

  /**
   * Return all bodies in the space that overlap with any shape attached to `body`.
   * Equivalent to calling `bodiesInShape` for each of `body`'s shapes and merging results.
   * @param body - The body whose shapes are used as the query region.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing BodyList to accumulate results into.
   * @returns A BodyList of overlapping bodies.
   * @throws If `body` is null.
   */
  bodiesInBody(body: Body, filter?: InteractionFilter | null, output?: object | null): object {
    if (body == null) {
      throw new Error("Error: Cannot evaluate shapes in null body");
    }
    const nape = getNape();
    const ret = output == null ? new nape.phys.BodyList() : output;
    const shapes = body.zpp_inner.wrap_shapes;
    shapes.zpp_inner.valmod();
    const sIter = nape.shape.ShapeIterator.get(shapes);
    while (true) {
      sIter.zpp_inner.zpp_inner.valmod();
      const si = sIter.zpp_inner;
      si.zpp_inner.valmod();
      if (si.zpp_inner.zip_length) {
        si.zpp_inner.zip_length = false;
        si.zpp_inner.user_length = si.zpp_inner.inner.length;
      }
      const len = si.zpp_inner.user_length;
      sIter.zpp_critical = true;
      if (sIter.zpp_i >= len) {
        sIter.zpp_next = nape.shape.ShapeIterator.zpp_pool;
        nape.shape.ShapeIterator.zpp_pool = sIter;
        sIter.zpp_inner = null;
        break;
      }
      sIter.zpp_critical = false;
      const shape = sIter.zpp_inner.at(sIter.zpp_i++);
      this.bodiesInShape(shape, false, filter, ret);
    }
    return ret;
  }

  /**
   * Sweep `shape` along its current velocity for `deltaTime` seconds and return the first hit.
   * @param shape - The shape to sweep; must belong to a Body.
   * @param deltaTime - Duration of the sweep; must be non-negative.
   * @param liveSweep - If true, other body velocities are considered during the sweep.
   * @param filter - Optional interaction filter to restrict results.
   * @returns The first RayResult hit, or null if nothing was struck.
   * @throws If `shape` is null, not attached to a Body, or `deltaTime` is negative/NaN.
   */
  convexCast(
    shape: Shape,
    deltaTime: number,
    liveSweep: boolean = false,
    filter?: InteractionFilter | null,
  ): object | null {
    if (shape == null) {
      throw new Error("Error: Cannot cast null shape :)");
    }
    const szpp = (shape as any).zpp_inner;
    if ((szpp.body != null ? szpp.body.outer : null) == null) {
      throw new Error("Error: Shape must belong to a body to be cast.");
    }
    if (deltaTime < 0 || deltaTime !== deltaTime) {
      throw new Error("Error: deltaTime must be positive");
    }
    return this.zpp_inner.convexCast(szpp, deltaTime, filter, liveSweep);
  }

  /**
   * Sweep `shape` along its current velocity for `deltaTime` seconds and return all hits.
   * @param shape - The shape to sweep; must belong to a Body.
   * @param deltaTime - Duration of the sweep; must be non-negative.
   * @param liveSweep - If true, other body velocities are considered during the sweep.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing RayResultList to accumulate results into.
   * @returns A RayResultList of all hits encountered during the sweep.
   * @throws If `shape` is null, not attached to a Body, or `deltaTime` is negative/NaN.
   */
  convexMultiCast(
    shape: Shape,
    deltaTime: number,
    liveSweep: boolean = false,
    filter?: InteractionFilter | null,
    output?: object | null,
  ): object {
    if (shape == null) {
      throw new Error("Error: Cannot cast null shape :)");
    }
    const szpp = (shape as any).zpp_inner;
    if ((szpp.body != null ? szpp.body.outer : null) == null) {
      throw new Error("Error: Shape must belong to a body to be cast.");
    }
    if (deltaTime < 0 || deltaTime !== deltaTime) {
      throw new Error("Error: deltaTime must be positive");
    }
    return this.zpp_inner.convexMultiCast(szpp, deltaTime, filter, liveSweep, output);
  }

  /**
   * Cast a ray into the space and return the closest hit.
   * @param ray - The ray to cast.
   * @param inner - If true, shapes are tested from the inside as well (useful for concave queries).
   * @param filter - Optional interaction filter to restrict results.
   * @returns The closest RayResult, or null if nothing was hit.
   * @throws If `ray` is null.
   */
  rayCast(
    ray: Ray,
    inner: boolean = false,
    filter?: InteractionFilter | null,
  ): object | null {
    if (ray == null) {
      throw new Error("Error: Cannot cast null ray :)");
    }
    return this.zpp_inner.rayCast(ray, inner, filter);
  }

  /**
   * Cast a ray into the space and return all hits.
   * @param ray - The ray to cast.
   * @param inner - If true, shapes are tested from the inside as well.
   * @param filter - Optional interaction filter to restrict results.
   * @param output - Optional existing RayResultList to accumulate results into.
   * @returns A RayResultList of all shapes the ray intersected.
   * @throws If `ray` is null.
   */
  rayMultiCast(
    ray: Ray,
    inner: boolean = false,
    filter?: InteractionFilter | null,
    output?: object | null,
  ): object {
    if (ray == null) {
      throw new Error("Error: Cannot cast null ray :)");
    }
    return this.zpp_inner.rayMultiCast(ray, inner, filter, output);
  }

  /**
   * Returns a brief string summary of this space.
   * @returns A string in the form `Space(bodies=N)`.
   */
  toString(): string {
    return `Space(bodies=${(this.bodies as any).length})`;
  }

}

