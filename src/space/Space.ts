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
 * The physics world. Add bodies and constraints, then call `step()` each frame.
 *
 * Fully modernized — uses ZPP_Space directly (extracted to TypeScript).
 */
export class Space {
  zpp_inner!: ZPP_Space;

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

  get userData(): Record<string, unknown> {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  }

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

  get sortContacts(): boolean {
    return this.zpp_inner.sortcontacts;
  }
  set sortContacts(value: boolean) {
    this.zpp_inner.sortcontacts = value;
  }

  get worldAngularDrag(): number {
    return this.zpp_inner.global_ang_drag;
  }
  set worldAngularDrag(value: number) {
    if (value !== value) {
      throw new Error("Error: Space::worldAngularDrag cannot be NaN");
    }
    this.zpp_inner.global_ang_drag = value;
  }

  get worldLinearDrag(): number {
    return this.zpp_inner.global_lin_drag;
  }
  set worldLinearDrag(value: number) {
    if (value !== value) {
      throw new Error("Error: Space::worldLinearDrag cannot be NaN");
    }
    this.zpp_inner.global_lin_drag = value;
  }

  get compounds(): object {
    return this.zpp_inner.wrap_compounds;
  }

  get bodies(): object {
    return this.zpp_inner.wrap_bodies;
  }

  get liveBodies(): object {
    return this.zpp_inner.wrap_live;
  }

  get constraints(): object {
    return this.zpp_inner.wrap_constraints;
  }

  get liveConstraints(): object {
    return this.zpp_inner.wrap_livecon;
  }

  get world(): Body {
    return Body._wrap(this.zpp_inner.__static);
  }

  get arbiters(): object {
    if (this.zpp_inner.wrap_arbiters == null) {
      const ret = new ZPP_SpaceArbiterList();
      ret.space = this.zpp_inner;
      this.zpp_inner.wrap_arbiters = ret;
    }
    return this.zpp_inner.wrap_arbiters;
  }

  get listeners(): object {
    return this.zpp_inner.wrap_listeners;
  }

  get timeStamp(): number {
    return this.zpp_inner.stamp;
  }

  get elapsedTime(): number {
    return this.zpp_inner.time;
  }

  // ---------------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------------

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

  toString(): string {
    return `Space(bodies=${(this.bodies as any).get_length()})`;
  }

  // ---------------------------------------------------------------------------
  // Backward-compat get_*/set_* methods
  // ---------------------------------------------------------------------------

  /** @internal */ get_userData(): Record<string, unknown> { return this.userData; }
  /** @internal */ get_gravity(): Vec2 { return this.gravity; }
  /** @internal */ set_gravity(v: Vec2): Vec2 { this.gravity = v; return this.gravity; }
  /** @internal */ get_broadphase(): Broadphase { return this.broadphase; }
  /** @internal */ get_sortContacts(): boolean { return this.sortContacts; }
  /** @internal */ set_sortContacts(v: boolean): boolean { this.sortContacts = v; return this.sortContacts; }
  /** @internal */ get_worldAngularDrag(): number { return this.worldAngularDrag; }
  /** @internal */ set_worldAngularDrag(v: number): number { this.worldAngularDrag = v; return this.worldAngularDrag; }
  /** @internal */ get_worldLinearDrag(): number { return this.worldLinearDrag; }
  /** @internal */ set_worldLinearDrag(v: number): number { this.worldLinearDrag = v; return this.worldLinearDrag; }
  /** @internal */ get_compounds(): object { return this.compounds; }
  /** @internal */ get_bodies(): object { return this.bodies; }
  /** @internal */ get_liveBodies(): object { return this.liveBodies; }
  /** @internal */ get_constraints(): object { return this.constraints; }
  /** @internal */ get_liveConstraints(): object { return this.liveConstraints; }
  /** @internal */ get_world(): Body { return this.world; }
  /** @internal */ get_arbiters(): object { return this.arbiters; }
  /** @internal */ get_listeners(): object { return this.listeners; }
  /** @internal */ get_timeStamp(): number { return this.timeStamp; }
  /** @internal */ get_elapsedTime(): number { return this.elapsedTime; }
}

// ---------------------------------------------------------------------------
// Self-register in the compiled namespace
// ---------------------------------------------------------------------------

const nape = getNape();
nape.space.Space = Space;
