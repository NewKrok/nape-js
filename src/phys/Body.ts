import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { Vec3 } from "../geom/Vec3";
import { AABB } from "../geom/AABB";
import { NapeList } from "../util/NapeList";
import { Shape } from "../shape/Shape";
import { Space } from "../space/Space";
import { BodyType } from "./BodyType";
import { Interactor, _bindBodyWrapForInteractor } from "./Interactor";
import { ZPP_Body } from "../native/phys/ZPP_Body";
import { ZPP_CbType } from "../native/callbacks/ZPP_CbType";
import { ZPP_Flags } from "../native/util/ZPP_Flags";
import { ZPP_Arbiter } from "../native/dynamics/ZPP_Arbiter";
import { ZPP_ArbiterList, ZPP_ConstraintList } from "../native/util/ZPP_PublicList";
import type { Compound } from "./Compound";
import type { Arbiter } from "../dynamics/Arbiter";
import type { BodyList } from "../util/listTypes";
import type { Mat23 } from "../geom/Mat23";
import type { Material } from "./Material";
import type { FluidProperties } from "./FluidProperties";
import type { InteractionFilter } from "../dynamics/InteractionFilter";
import type { InteractionType } from "../callbacks/InteractionType";
import type { MassMode } from "./MassMode";
import type { InertiaMode } from "./InertiaMode";
import type { GravMassMode } from "./GravMassMode";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read validated x from a Vec2 input. */
function _readVec2X(v: Vec2): number {
  if (v.zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.x;
}

/** Read validated y from a Vec2 input. */
function _readVec2Y(v: Vec2): number {
  if (v.zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.y;
}

/** Check a Vec2 is not disposed. */
function _checkVec2Disposed(v: Vec2): void {
  if (v != null && v.zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
}

/** Dispose a Vec2 if it is weak. */
function _disposeWeakVec2(v: Vec2): void {
  if (v.zpp_inner.weak) {
    v.dispose();
  }
}

/**
 * Set a Vec2 wrapper property from a Vec2 source.
 * This handles the common pattern: validate source, set on wrapper, dispose weak source.
 */
function _setVec2Prop(
  propName: string,
  wrapper: Vec2,
  source: Vec2,
  setupFn: (() => void) | null,
  getWrapper: () => Vec2,
): Vec2 {
  _checkVec2Disposed(source);
  if (source == null) {
    throw new Error("Error: Body::" + propName + " cannot be null");
  }
  if (wrapper == null && setupFn != null) {
    setupFn();
    wrapper = getWrapper();
  }
  wrapper.set(source);
  return wrapper;
}

/** Create a new Vec2 from pool with given x,y and weak flag. */
function _newVec2(x: number, y: number, weak: boolean): Vec2 {
  return Vec2.get(x, y, weak);
}

/**
 * Ensure a singleton enum flag is initialised. Returns the flag value.
 * This replaces the verbose repeated ZPP_Flags init pattern from compiled code.
 */
function _ensureFlag<T>(flagName: keyof typeof ZPP_Flags, ctor: () => T): T {
  if ((ZPP_Flags as any)[flagName] == null) {
    ZPP_Flags.internal = true;
    (ZPP_Flags as any)[flagName] = ctor();
    ZPP_Flags.internal = false;
  }
  return (ZPP_Flags as any)[flagName] as T;
}

/**
 * A rigid body in the physics simulation. Add shapes to give it geometry, then add it to a `Space` to participate in simulation.
 */
export class Body extends Interactor {
  static __name__ = ["nape", "phys", "Body"];
  static __super__: typeof Interactor = Interactor;

  /** @internal */
  zpp_inner!: ZPP_Body;
  /** If true, this body is included in debug rendering. */
  debugDraw: boolean = true;

  /**
   * @param type - Body type (DYNAMIC by default).
   * @param position - Initial world-space position (defaults to origin).
   */
  constructor(type?: BodyType, position?: Vec2) {
    super();

    const zpp = new ZPP_Body();
    this.zpp_inner = zpp;
    zpp.outer = this;
    zpp.outer_i = this;
    (this as any).zpp_inner_i = zpp;

    // Override the Interactor's _inner to point at this object (backward compat).
    (this as Writable<Body>)._inner = this as any;

    // Set position
    if (position != null) {
      _checkVec2Disposed(position);
      zpp.posx = _readVec2X(position);
      zpp.posy = _readVec2Y(position);
    } else {
      zpp.posx = 0;
      zpp.posy = 0;
    }

    // Set type (default DYNAMIC)
    const nape = getNape();
    let type1: BodyType;
    if (type == null) {
      type1 = _ensureFlag("BodyType_DYNAMIC", () => new nape.phys.BodyType());
    } else {
      type1 = type;
    }

    zpp.immutable_midstep("Body::type");
    if (zpp.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (ZPP_Body.types[zpp.type] !== type1) {
      if (type1 == null) {
        throw new Error("Error: Cannot use null BodyType");
      }
      const ntype = _bodyTypeToInt(type1, nape);
      if (ntype === 1 && zpp.space != null) {
        zpp.velx = 0;
        zpp.vely = 0;
        zpp.angvel = 0;
      }
      zpp.invalidate_type();
      if (zpp.space != null) {
        zpp.space.transmitType(zpp, ntype);
      } else {
        zpp.type = ntype;
      }
    }

    // Dispose weak position Vec2
    if (position != null) {
      _disposeWeakVec2(position);
    }

    // Register ANY_BODY callback type
    zpp.insert_cbtype((ZPP_CbType as any).ANY_BODY.zpp_inner);
  }

  /** @internal */
  static _wrap(inner: NapeInner): Body {
    if (!inner) return null as unknown as Body;
    if (inner instanceof Body) return inner;
    if (inner instanceof ZPP_Body) {
      return getOrCreate(inner, (zpp: ZPP_Body) => {
        const b = Object.create(Body.prototype) as Body;
        b.zpp_inner = zpp;
        zpp.outer = b;
        zpp.outer_i = b;
        (b as any).zpp_inner_i = zpp;
        (b as Writable<Body>)._inner = b as any;
        b.debugDraw = true;
        return b;
      });
    }
    // Handle compiled objects with zpp_inner
    if (inner.zpp_inner) return Body._wrap(inner.zpp_inner);
    return getOrCreate(inner, (raw: NapeInner) => {
      const b = Object.create(Body.prototype) as Body;
      (b as Writable<Body>)._inner = raw;
      return b;
    });
  }

  // ---------------------------------------------------------------------------
  // Type
  // ---------------------------------------------------------------------------

  /** The body type: DYNAMIC, STATIC, or KINEMATIC. Cannot be changed mid-step. */
  get type(): BodyType {
    return ZPP_Body.types[this.zpp_inner.type];
  }
  set type(value: BodyType) {
    const zpp = this.zpp_inner;
    zpp.immutable_midstep("Body::type");
    if (zpp.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (ZPP_Body.types[zpp.type] !== value) {
      if (value == null) {
        throw new Error("Error: Cannot use null BodyType");
      }
      const nape = getNape();
      const ntype = _bodyTypeToInt(value, nape);
      if (ntype === 1 && zpp.space != null) {
        zpp.velx = 0;
        zpp.vely = 0;
        zpp.angvel = 0;
      }
      zpp.invalidate_type();
      if (zpp.space != null) {
        zpp.space.transmitType(zpp, ntype);
      } else {
        zpp.type = ntype;
      }
    }
  }

  /** Return true if this body is static. */
  isStatic(): boolean {
    return this.zpp_inner.type === 1;
  }
  /** Return true if this body is dynamic. */
  isDynamic(): boolean {
    return this.zpp_inner.type === 2;
  }
  /** Return true if this body is kinematic. */
  isKinematic(): boolean {
    return this.zpp_inner.type === 3;
  }

  // ---------------------------------------------------------------------------
  // Position & rotation
  // ---------------------------------------------------------------------------

  /** World-space position of the body's origin. Live Vec2 — mutating it moves the body. */
  get position(): Vec2 {
    if (this.zpp_inner.wrap_pos == null) {
      this.zpp_inner.setupPosition();
    }
    return this.zpp_inner.wrap_pos;
  }
  set position(value: Vec2) {
    _setVec2Prop(
      "position",
      this.zpp_inner.wrap_pos,
      value,
      () => this.zpp_inner.setupPosition(),
      () => this.zpp_inner.wrap_pos,
    );
    if (this.zpp_inner.wrap_pos == null) {
      this.zpp_inner.setupPosition();
    }
  }

  /**
   * Rotation of the body in radians.
   * @throws If set on a static body that is already in a space.
   */
  get rotation(): number {
    return this.zpp_inner.rot;
  }
  set rotation(value: number) {
    const zpp = this.zpp_inner;
    zpp.immutable_midstep("Body::rotation");
    if (zpp.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (zpp.type === 1 && zpp.space != null) {
      throw new Error("Error: Static objects cannot be rotated once inside a Space");
    }
    if (zpp.rot !== value) {
      if (value !== value) {
        throw new Error("Error: Body::rotation cannot be NaN");
      }
      zpp.rot = value;
      zpp.invalidate_rot();
      zpp.wake();
    }
  }

  // ---------------------------------------------------------------------------
  // Velocity
  // ---------------------------------------------------------------------------

  /** Linear velocity in world space (units/s). Live Vec2. Static bodies cannot have velocity. */
  get velocity(): Vec2 {
    if (this.zpp_inner.wrap_vel == null) {
      this.zpp_inner.setupVelocity();
    }
    return this.zpp_inner.wrap_vel;
  }
  set velocity(value: Vec2) {
    _setVec2Prop(
      "velocity",
      this.zpp_inner.wrap_vel,
      value,
      () => this.zpp_inner.setupVelocity(),
      () => this.zpp_inner.wrap_vel,
    );
    if (this.zpp_inner.wrap_vel == null) {
      this.zpp_inner.setupVelocity();
    }
  }

  /** Angular velocity in radians per second. */
  get angularVel(): number {
    return this.zpp_inner.angvel;
  }
  set angularVel(value: number) {
    const zpp = this.zpp_inner;
    if (zpp.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (zpp.angvel !== value) {
      if (value !== value) {
        throw new Error("Error: Body::angularVel cannot be NaN");
      }
      if (zpp.type === 1) {
        throw new Error("Error: A static object cannot be given a velocity");
      }
      zpp.angvel = value;
      zpp.wake();
    }
  }

  /** Desired velocity for kinematic bodies; the engine tries to match this each step. */
  get kinematicVel(): Vec2 {
    if (this.zpp_inner.wrap_kinvel == null) {
      this.zpp_inner.setupkinvel();
    }
    return this.zpp_inner.wrap_kinvel;
  }
  set kinematicVel(value: Vec2) {
    _setVec2Prop(
      "kinematicVel",
      this.zpp_inner.wrap_kinvel,
      value,
      () => this.zpp_inner.setupkinvel(),
      () => this.zpp_inner.wrap_kinvel,
    );
    if (this.zpp_inner.wrap_kinvel == null) {
      this.zpp_inner.setupkinvel();
    }
  }

  /** Desired angular velocity for kinematic bodies. */
  get kinAngVel(): number {
    return this.zpp_inner.kinangvel;
  }
  set kinAngVel(value: number) {
    const zpp = this.zpp_inner;
    if (zpp.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (zpp.kinangvel !== value) {
      if (value !== value) {
        throw new Error("Error: Body::kinAngVel cannot be NaN");
      }
      zpp.kinangvel = value;
      zpp.wake();
    }
  }

  /** Surface velocity used in friction calculations. */
  get surfaceVel(): Vec2 {
    if (this.zpp_inner.wrap_svel == null) {
      this.zpp_inner.setupsvel();
    }
    return this.zpp_inner.wrap_svel;
  }
  set surfaceVel(value: Vec2) {
    _setVec2Prop(
      "surfaceVel",
      this.zpp_inner.wrap_svel,
      value,
      () => this.zpp_inner.setupsvel(),
      () => this.zpp_inner.wrap_svel,
    );
    if (this.zpp_inner.wrap_svel == null) {
      this.zpp_inner.setupsvel();
    }
  }

  // ---------------------------------------------------------------------------
  // Force & torque
  // ---------------------------------------------------------------------------

  /** Accumulated force applied to this body for the current step (cleared after each step). */
  get force(): Vec2 {
    if (this.zpp_inner.wrap_force == null) {
      this.zpp_inner.setupForce();
    }
    return this.zpp_inner.wrap_force;
  }
  set force(value: Vec2) {
    _setVec2Prop(
      "force",
      this.zpp_inner.wrap_force,
      value,
      () => this.zpp_inner.setupForce(),
      () => this.zpp_inner.wrap_force,
    );
    if (this.zpp_inner.wrap_force == null) {
      this.zpp_inner.setupForce();
    }
  }

  /** Accumulated torque applied to this body for the current step (only for DYNAMIC bodies). */
  get torque(): number {
    return this.zpp_inner.torque;
  }
  set torque(value: number) {
    const zpp = this.zpp_inner;
    if (zpp.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (zpp.type !== 2) {
      throw new Error("Error: Non-dynamic body cannot have torque applied.");
    }
    if (value !== value) {
      throw new Error("Error: Body::torque cannot be NaN");
    }
    if (zpp.torque !== value) {
      zpp.torque = value;
      zpp.wake();
    }
  }

  // ---------------------------------------------------------------------------
  // Mass & inertia
  // ---------------------------------------------------------------------------

  /**
   * Mass in kg. Must be finite and > 0. Setting switches massMode to FIXED.
   * @throws If the body is the world body, or if no shapes are present in DEFAULT mass mode.
   */
  get mass(): number {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world has no mass");
    }
    this.zpp_inner.validate_mass();
    if (this.zpp_inner.massMode === 0 && this.zpp_inner.shapes.head == null) {
      throw new Error(
        "Error: Given current mass mode, Body::mass only makes sense if it contains shapes",
      );
    }
    return this.zpp_inner.cmass;
  }
  set mass(value: number) {
    this.zpp_inner.immutable_midstep("Body::mass");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (value !== value) {
      throw new Error("Error: Mass cannot be NaN");
    }
    if (value <= 0) {
      throw new Error("Error: Mass must be strictly positive");
    }
    if (value >= Infinity) {
      throw new Error("Error: Mass cannot be infinite, use allowMovement = false instead");
    }
    this.zpp_inner.massMode = 1;
    this.zpp_inner.cmass = value;
    this.zpp_inner.invalidate_mass();
  }

  /**
   * Moment of inertia. Must be finite and > 0. Setting switches inertiaMode to FIXED.
   * @throws If the body is the world body, or if no shapes are present in DEFAULT inertia mode.
   */
  get inertia(): number {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world has no inertia");
    }
    this.zpp_inner.validate_inertia();
    if (this.zpp_inner.inertiaMode === 0 && this.zpp_inner.shapes.head == null) {
      throw new Error(
        "Error: Given current inertia mode flag, Body::inertia only makes sense if Body contains Shapes",
      );
    }
    return this.zpp_inner.cinertia;
  }
  set inertia(value: number) {
    this.zpp_inner.immutable_midstep("Body::inertia");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (value !== value) {
      throw new Error("Error: Inertia cannot be NaN");
    }
    if (value <= 0) {
      throw new Error("Error: Inertia must be strictly positive");
    }
    if (value >= Infinity) {
      throw new Error("Error: Inertia cannot be infinite, use allowRotation = false instead");
    }
    this.zpp_inner.inertiaMode = 1;
    this.zpp_inner.cinertia = value;
    this.zpp_inner.invalidate_inertia();
  }

  /** Effective mass used by the constraint solver (accounts for allowMovement). */
  get constraintMass(): number {
    if (!this.zpp_inner.world) {
      this.zpp_inner.validate_mass();
    }
    return this.zpp_inner.smass;
  }

  /** Effective inertia used by the constraint solver (accounts for allowRotation). */
  get constraintInertia(): number {
    if (!this.zpp_inner.world) {
      this.zpp_inner.validate_inertia();
    }
    return this.zpp_inner.sinertia;
  }

  /** Gravitational mass. Defaults to the same as `mass`. */
  get gravMass(): number {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world has no gravMass");
    }
    this.zpp_inner.validate_gravMass();
    if (this.zpp_inner.shapes.head == null) {
      if (this.zpp_inner.massMode === 0 && this.zpp_inner.gravMassMode !== 1) {
        throw new Error(
          "Error: Given current mass/gravMass modes; Body::gravMass only makes sense if it contains Shapes",
        );
      }
    }
    return this.zpp_inner.gravMass;
  }
  set gravMass(value: number) {
    this.zpp_inner.immutable_midstep("Body::gravMass");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (value !== value) {
      throw new Error("Error: gravMass cannot be NaN");
    }
    this.zpp_inner.gravMassMode = 1;
    this.zpp_inner.gravMass = value;
    this.zpp_inner.invalidate_gravMass();
  }

  /** Scale factor applied to gravMass relative to the dynamic mass. */
  get gravMassScale(): number {
    this.zpp_inner.validate_gravMassScale();
    if (this.zpp_inner.shapes.head == null) {
      if (this.zpp_inner.massMode === 0 && this.zpp_inner.gravMassMode !== 2) {
        throw new Error(
          "Error: Given current mass/gravMass modes; Body::gravMassScale only makes sense if it contains Shapes",
        );
      }
    }
    return this.zpp_inner.gravMassScale;
  }
  set gravMassScale(value: number) {
    this.zpp_inner.immutable_midstep("Body::gravMassScale");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (value !== value) {
      throw new Error("Error: gravMassScale cannot be NaN");
    }
    this.zpp_inner.gravMassMode = 2;
    this.zpp_inner.gravMassScale = value;
    this.zpp_inner.invalidate_gravMassScale();
  }

  // ---------------------------------------------------------------------------
  // Flags
  // ---------------------------------------------------------------------------

  /** If true, continuous collision detection (CCD) is enabled for this body. */
  get isBullet(): boolean {
    return this.zpp_inner.bulletEnabled;
  }
  set isBullet(value: boolean) {
    this.zpp_inner.bulletEnabled = value;
  }

  /** If true, CCD is disabled even if `isBullet` is set. */
  get disableCCD(): boolean {
    return this.zpp_inner.disableCCD;
  }
  set disableCCD(value: boolean) {
    this.zpp_inner.disableCCD = value;
  }

  /** If false, translational motion is frozen (infinite effective mass). */
  get allowMovement(): boolean {
    return !this.zpp_inner.nomove;
  }
  set allowMovement(value: boolean) {
    this.zpp_inner.immutable_midstep("Body::" + (value == null ? "null" : "" + value));
    if (!this.zpp_inner.nomove !== value) {
      this.zpp_inner.nomove = !value;
      this.zpp_inner.invalidate_mass();
    }
  }

  /** If false, rotational motion is frozen (infinite effective inertia). */
  get allowRotation(): boolean {
    return !this.zpp_inner.norotate;
  }
  set allowRotation(value: boolean) {
    this.zpp_inner.immutable_midstep("Body::" + (value == null ? "null" : "" + value));
    if (!this.zpp_inner.norotate !== value) {
      this.zpp_inner.norotate = !value;
      this.zpp_inner.invalidate_inertia();
    }
  }

  /**
   * True if the body is currently sleeping.
   * @throws If the body is not in a Space.
   */
  get isSleeping(): boolean {
    if (this.zpp_inner.space == null) {
      throw new Error(
        "Error: isSleeping makes no sense if the object is not contained within a Space",
      );
    }
    return this.zpp_inner.component.sleeping;
  }

  // ---------------------------------------------------------------------------
  // Relationships
  // ---------------------------------------------------------------------------

  /** List of shapes attached to this body. */
  get shapes(): NapeList<Shape> {
    return new NapeList(this.zpp_inner.wrap_shapes, Shape._wrap);
  }

  /** The Space this body belongs to. Setting adds/removes it from the space. */
  get space(): Space {
    if (this.zpp_inner.space == null) return null as unknown as Space;
    return Space._wrap(this.zpp_inner.space.outer);
  }
  set space(value: Space | null) {
    const space = value != null ? ((value as any)._inner ?? value) : null;
    if (this.zpp_inner.compound != null) {
      throw new Error(
        "Error: Cannot set the space of a Body belonging to a Compound, only the root Compound space can be set",
      );
    }
    this.zpp_inner.immutable_midstep("Body::space");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    const currentSpace = this.zpp_inner.space == null ? null : this.zpp_inner.space.outer;
    if (currentSpace !== space) {
      if (currentSpace != null) {
        this.zpp_inner.component.woken = false;
        currentSpace.zpp_inner.wrap_bodies.remove(this);
      }
      if (space != null) {
        const list = space.zpp_inner.wrap_bodies;
        if (list.zpp_inner.reverse_flag) {
          list.push(this);
        } else {
          list.unshift(this);
        }
      }
    }
  }

  /** The Compound this body belongs to, or null. */
  get compound(): Compound | null {
    if (this.zpp_inner.compound == null) return null;
    return this.zpp_inner.compound.outer;
  }
  set compound(value: Compound | null) {
    const currentCompound = this.zpp_inner.compound == null ? null : this.zpp_inner.compound.outer;
    if (currentCompound !== value) {
      if (currentCompound != null) {
        currentCompound.zpp_inner.wrap_bodies.remove(this);
      }
      if (value != null) {
        const list = value.zpp_inner.wrap_bodies;
        if (list.zpp_inner.reverse_flag) {
          list.push(this);
        } else {
          list.unshift(this);
        }
      }
    }
  }

  /**
   * World-space AABB enclosing all shapes.
   * @throws If this is the world body.
   */
  get bounds(): AABB {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world has no bounds");
    }
    return AABB._wrap(this.zpp_inner.aabb.wrapper());
  }

  /** Constraint-solved velocity (read-only view used by the solver). */
  get constraintVelocity(): Vec2 {
    if (this.zpp_inner.wrapcvel == null) {
      this.zpp_inner.setup_cvel();
    }
    return this.zpp_inner.wrapcvel;
  }

  /**
   * Local-space centre of mass (read-only, lazy-computed from shapes).
   * @throws If this is the world body.
   */
  get localCOM(): Vec2 {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world has no localCOM");
    }
    if (this.zpp_inner.wrap_localCOM == null) {
      const ret = Vec2.get(this.zpp_inner.localCOMx, this.zpp_inner.localCOMy);
      this.zpp_inner.wrap_localCOM = ret;
      ret.zpp_inner._inuse = true;
      ret.zpp_inner._immutable = true;
      ret.zpp_inner._validate = () => this.zpp_inner.getlocalCOM();
    }
    return this.zpp_inner.wrap_localCOM;
  }

  /**
   * World-space centre of mass (read-only, lazy-computed).
   * @throws If this is the world body.
   */
  get worldCOM(): Vec2 {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world has no worldCOM");
    }
    if (this.zpp_inner.wrap_worldCOM == null) {
      const ret = Vec2.get(this.zpp_inner.worldCOMx, this.zpp_inner.worldCOMy);
      this.zpp_inner.wrap_worldCOM = ret;
      ret.zpp_inner._inuse = true;
      ret.zpp_inner._immutable = true;
      ret.zpp_inner._validate = () => this.zpp_inner.getworldCOM();
    }
    return this.zpp_inner.wrap_worldCOM;
  }

  // ---------------------------------------------------------------------------
  // Mode getters/setters
  // ---------------------------------------------------------------------------

  /** Controls how mass is computed: DEFAULT (from shapes) or FIXED (manually set). */
  get massMode(): MassMode {
    const nape = getNape();
    const d = _ensureFlag("MassMode_DEFAULT", () => new nape.phys.MassMode());
    const f = _ensureFlag("MassMode_FIXED", () => new nape.phys.MassMode());
    return [d, f][this.zpp_inner.massMode];
  }
  set massMode(value: MassMode) {
    const nape = getNape();
    this.zpp_inner.immutable_midstep("Body::massMode");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (value == null) {
      throw new Error("Error: cannot use null massMode");
    }
    const d = _ensureFlag("MassMode_DEFAULT", () => new nape.phys.MassMode());
    this.zpp_inner.massMode = value === d ? 0 : 1;
    this.zpp_inner.invalidate_mass();
  }

  /** Controls how inertia is computed: DEFAULT or FIXED. */
  get inertiaMode(): InertiaMode {
    const nape = getNape();
    const d = _ensureFlag("InertiaMode_DEFAULT", () => new nape.phys.InertiaMode());
    const f = _ensureFlag("InertiaMode_FIXED", () => new nape.phys.InertiaMode());
    return [d, f][this.zpp_inner.inertiaMode];
  }
  set inertiaMode(value: InertiaMode) {
    const nape = getNape();
    this.zpp_inner.immutable_midstep("Body::inertiaMode");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (value == null) {
      throw new Error("Error: Cannot use null InertiaMode");
    }
    const f = _ensureFlag("InertiaMode_FIXED", () => new nape.phys.InertiaMode());
    this.zpp_inner.inertiaMode = value === f ? 1 : 0;
    this.zpp_inner.invalidate_inertia();
  }

  /** Controls gravitational mass: DEFAULT, FIXED, or SCALED. */
  get gravMassMode(): GravMassMode {
    const nape = getNape();
    const d = _ensureFlag("GravMassMode_DEFAULT", () => new nape.phys.GravMassMode());
    const f = _ensureFlag("GravMassMode_FIXED", () => new nape.phys.GravMassMode());
    const s = _ensureFlag("GravMassMode_SCALED", () => new nape.phys.GravMassMode());
    return [d, f, s][this.zpp_inner.gravMassMode];
  }
  set gravMassMode(value: GravMassMode) {
    const nape = getNape();
    this.zpp_inner.immutable_midstep("Body::gravMassMode");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (value == null) {
      throw new Error("Error: Cannot use null gravMassMode");
    }
    const s = _ensureFlag("GravMassMode_SCALED", () => new nape.phys.GravMassMode());
    if (value === s) {
      this.zpp_inner.gravMassMode = 2;
    } else {
      const d = _ensureFlag("GravMassMode_DEFAULT", () => new nape.phys.GravMassMode());
      this.zpp_inner.gravMassMode = value === d ? 0 : 1;
    }
    this.zpp_inner.invalidate_gravMass();
  }

  // ---------------------------------------------------------------------------
  // Copy
  // ---------------------------------------------------------------------------

  /**
   * Create a deep copy of this body (shapes, mass properties, etc.).
   * @returns A new Body with identical configuration.
   * @throws If this is the world body.
   */
  copy(): Body {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world cannot be copied");
    }
    return this.zpp_inner.copy();
  }

  // ---------------------------------------------------------------------------
  // toString
  // ---------------------------------------------------------------------------

  /**
   * String identifier like `(dynamic)#42`.
   * @returns A human-readable description of this body.
   */
  override toString(): string {
    const zpp = this.zpp_inner;
    const prefix = zpp.world
      ? "(space::world"
      : "(" + (zpp.type === 2 ? "dynamic" : zpp.type === 1 ? "static" : "kinematic");
    return prefix + ")#" + (this as any).zpp_inner_i.id;
  }

  // ---------------------------------------------------------------------------
  // Integration
  // ---------------------------------------------------------------------------

  /**
   * Manually integrate the body's position and rotation by `deltaTime` seconds (outside of `Space.step`).
   * @param deltaTime - Time in seconds to integrate over.
   * @returns `this` for chaining.
   * @throws If `deltaTime` is NaN.
   */
  integrate(deltaTime: number): Body {
    if (deltaTime !== deltaTime) {
      throw new Error("Cannot integrate by NaN time");
    }
    this.zpp_inner.immutable_midstep("Body::space");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (deltaTime === 0) {
      return this;
    }
    const cur = this.zpp_inner;
    cur.sweepTime = 0;
    cur.sweep_angvel = cur.angvel;
    const delta = deltaTime - cur.sweepTime;
    if (delta !== 0) {
      cur.sweepTime = deltaTime;
      cur.posx += cur.velx * delta;
      cur.posy += cur.vely * delta;
      if (cur.angvel !== 0) {
        const dr = cur.sweep_angvel * delta;
        cur.rot += dr;
        if (dr * dr > 0.0001) {
          cur.axisx = Math.sin(cur.rot);
          cur.axisy = Math.cos(cur.rot);
        } else {
          const d2 = dr * dr;
          const p = 1 - 0.5 * d2;
          const m = 1 - (d2 * d2) / 8;
          const nx = (p * cur.axisx + dr * cur.axisy) * m;
          cur.axisy = (p * cur.axisy - dr * cur.axisx) * m;
          cur.axisx = nx;
        }
      }
    }
    _invalidateShapes(cur);
    cur.zip_worldCOM = true;
    cur.zip_axis = true;
    _invalidateShapes(cur);
    cur.zip_worldCOM = true;
    cur.sweepTime = 0;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Transform methods
  // ---------------------------------------------------------------------------

  /**
   * Transform a point from local body space to world space.
   * @param point - The point in local space.
   * @param weak - If true, the returned Vec2 is a weak (pooled) reference.
   * @returns The transformed point in world space.
   */
  localPointToWorld(point: Vec2, weak: boolean = false): Vec2 {
    _checkVec2Disposed(point);
    if (point == null) {
      throw new Error("Error: Cannot transform null Vec2");
    }
    this.zpp_inner.validate_axis();
    const px = _readVec2X(point);
    const py = _readVec2Y(point);
    const tempx = this.zpp_inner.axisy * px - this.zpp_inner.axisx * py;
    const tempy = px * this.zpp_inner.axisx + py * this.zpp_inner.axisy;
    _disposeWeakVec2(point);
    return _newVec2(tempx + this.zpp_inner.posx, tempy + this.zpp_inner.posy, weak);
  }

  /**
   * Transform a point from world space to local body space.
   * @param point - The point in world space.
   * @param weak - If true, the returned Vec2 is a weak (pooled) reference.
   * @returns The transformed point in local space.
   */
  worldPointToLocal(point: Vec2, weak: boolean = false): Vec2 {
    _checkVec2Disposed(point);
    if (point == null) {
      throw new Error("Error: Cannot transform null Vec2");
    }
    this.zpp_inner.validate_axis();
    const px = _readVec2X(point) - this.zpp_inner.posx;
    const py = _readVec2Y(point) - this.zpp_inner.posy;
    const tempx = px * this.zpp_inner.axisy + py * this.zpp_inner.axisx;
    const tempy = py * this.zpp_inner.axisy - px * this.zpp_inner.axisx;
    _disposeWeakVec2(point);
    return _newVec2(tempx, tempy, weak);
  }

  /**
   * Rotate a vector from local body space to world space (no translation).
   * @param vector - The vector in local space.
   * @param weak - If true, the returned Vec2 is a weak (pooled) reference.
   * @returns The rotated vector in world space.
   */
  localVectorToWorld(vector: Vec2, weak: boolean = false): Vec2 {
    _checkVec2Disposed(vector);
    if (vector == null) {
      throw new Error("Error: Cannot transform null Vec2");
    }
    this.zpp_inner.validate_axis();
    const vx = _readVec2X(vector);
    const vy = _readVec2Y(vector);
    const tempx = this.zpp_inner.axisy * vx - this.zpp_inner.axisx * vy;
    const tempy = vx * this.zpp_inner.axisx + vy * this.zpp_inner.axisy;
    _disposeWeakVec2(vector);
    return _newVec2(tempx, tempy, weak);
  }

  /**
   * Rotate a vector from world space to local body space (no translation).
   * @param vector - The vector in world space.
   * @param weak - If true, the returned Vec2 is a weak (pooled) reference.
   * @returns The rotated vector in local space.
   */
  worldVectorToLocal(vector: Vec2, weak: boolean = false): Vec2 {
    _checkVec2Disposed(vector);
    if (vector == null) {
      throw new Error("Error: Cannot transform null Vec2");
    }
    this.zpp_inner.validate_axis();
    const vx = _readVec2X(vector);
    const vy = _readVec2Y(vector);
    const tempx = vx * this.zpp_inner.axisy + vy * this.zpp_inner.axisx;
    const tempy = vy * this.zpp_inner.axisy - vx * this.zpp_inner.axisx;
    _disposeWeakVec2(vector);
    return _newVec2(tempx, tempy, weak);
  }

  // ---------------------------------------------------------------------------
  // Impulse application
  // ---------------------------------------------------------------------------

  /**
   * Apply a linear (and optionally angular) impulse to the body.
   * If `pos` is given, it creates a torque about the body's centre.
   * If `sleepable` is true, sleeping bodies are not woken.
   * @param impulse - The linear impulse vector (world space).
   * @param pos - Optional world-space point of application.
   * @param sleepable - If true, the body will not be woken if sleeping.
   * @returns `this` for chaining.
   */
  applyImpulse(impulse: Vec2, pos?: Vec2, sleepable: boolean = false): Body {
    _checkVec2Disposed(impulse);
    if (pos != null) _checkVec2Disposed(pos);
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (impulse == null) {
      throw new Error("Error: Cannot apply null impulse to Body");
    }
    // If sleepable and body is sleeping, dispose weak Vec2s and return
    if (sleepable && this.isSleeping) {
      _disposeWeakVec2(impulse);
      if (pos != null) _disposeWeakVec2(pos);
      return this;
    }
    this.zpp_inner.validate_mass();
    const t = this.zpp_inner.imass;
    const ix = _readVec2X(impulse);
    const iy = _readVec2Y(impulse);
    this.zpp_inner.velx += ix * t;
    this.zpp_inner.vely += iy * t;
    if (pos != null) {
      const rx = _readVec2X(pos) - this.zpp_inner.posx;
      const ry = _readVec2Y(pos) - this.zpp_inner.posy;
      this.zpp_inner.validate_inertia();
      this.zpp_inner.angvel += (iy * rx - ix * ry) * this.zpp_inner.iinertia;
      _disposeWeakVec2(pos);
    }
    if (!sleepable) {
      if (this.zpp_inner.type === 2) {
        this.zpp_inner.wake();
      }
    }
    _disposeWeakVec2(impulse);
    return this;
  }

  /**
   * Apply a direct angular impulse (change in angular velocity × inertia).
   * @param impulse - The angular impulse magnitude.
   * @param sleepable - If true, the body will not be woken if sleeping.
   * @returns `this` for chaining.
   */
  applyAngularImpulse(impulse: number, sleepable: boolean = false): Body {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (sleepable && this.isSleeping) {
      return this;
    }
    this.zpp_inner.validate_inertia();
    this.zpp_inner.angvel += impulse * this.zpp_inner.iinertia;
    if (!sleepable) {
      if (this.zpp_inner.type === 2) {
        this.zpp_inner.wake();
      }
    }
    return this;
  }

  /**
   * Set linear and angular velocity so the body reaches the given target pose in `deltaTime` seconds.
   * Useful for kinematic or manually driven bodies.
   * @param targetPosition - Desired world-space position.
   * @param targetRotation - Desired rotation in radians.
   * @param deltaTime - Time in seconds over which to reach the target.
   * @returns `this` for chaining.
   * @throws If `targetPosition` is null or `deltaTime` is zero.
   */
  setVelocityFromTarget(targetPosition: Vec2, targetRotation: number, deltaTime: number): Body {
    _checkVec2Disposed(targetPosition);
    if (targetPosition == null) {
      throw new Error("Cannot set velocity for null target position");
    }
    if (deltaTime === 0) {
      throw new Error("deltaTime cannot be 0 for setVelocityFromTarget");
    }
    const idt = 1 / deltaTime;
    // Set linear velocity = (targetPosition - position) / deltaTime
    if (this.zpp_inner.wrap_vel == null) {
      this.zpp_inner.setupVelocity();
    }
    if (this.zpp_inner.wrap_pos == null) {
      this.zpp_inner.setupPosition();
    }
    const vector = targetPosition.sub(this.zpp_inner.wrap_pos, true).muleq(idt);
    this.zpp_inner.wrap_vel.set(vector);
    // Set angular velocity
    const angularVel = (targetRotation - this.zpp_inner.rot) * idt;
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (this.zpp_inner.angvel !== angularVel) {
      if (angularVel !== angularVel) {
        throw new Error("Error: Body::angularVel cannot be NaN");
      }
      if (this.zpp_inner.type === 1) {
        throw new Error("Error: A static object cannot be given a velocity");
      }
      this.zpp_inner.angvel = angularVel;
      this.zpp_inner.wake();
    }
    _disposeWeakVec2(targetPosition);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Shape operations
  // ---------------------------------------------------------------------------

  /**
   * Translate all shapes attached to this body in local space by `translation`.
   * @param translation - Offset vector in local space.
   * @returns `this` for chaining.
   */
  translateShapes(translation: Vec2): Body {
    this.zpp_inner.immutable_midstep("Body::translateShapes()");
    _checkVec2Disposed(translation);
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (translation == null) {
      throw new Error("Error: Cannot displace by null Vec2");
    }
    const weak = translation.zpp_inner.weak;
    translation.zpp_inner.weak = false;
    let cx_ite = this.zpp_inner.shapes.head;
    while (cx_ite != null) {
      cx_ite.elt.outer.translate(translation);
      cx_ite = cx_ite.next;
    }
    translation.zpp_inner.weak = weak;
    _disposeWeakVec2(translation);
    return this;
  }

  /**
   * Rotate all shapes attached to this body in local space by `angle` radians.
   * @param angle - Rotation in radians.
   * @returns `this` for chaining.
   */
  rotateShapes(angle: number): Body {
    this.zpp_inner.immutable_midstep("Body::rotateShapes()");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    let cx_ite = this.zpp_inner.shapes.head;
    while (cx_ite != null) {
      cx_ite.elt.outer.rotate(angle);
      cx_ite = cx_ite.next;
    }
    return this;
  }

  /**
   * Scale all shapes attached to this body in local space.
   * @param scaleX - Horizontal scale factor.
   * @param scaleY - Vertical scale factor.
   * @returns `this` for chaining.
   */
  scaleShapes(scaleX: number, scaleY: number): Body {
    this.zpp_inner.immutable_midstep("Body::scaleShapes()");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    let cx_ite = this.zpp_inner.shapes.head;
    while (cx_ite != null) {
      cx_ite.elt.outer.scale(scaleX, scaleY);
      cx_ite = cx_ite.next;
    }
    return this;
  }

  /**
   * Apply an affine transform matrix to all shapes in local space.
   * @param matrix - The 2D affine transformation matrix.
   * @returns `this` for chaining.
   */
  transformShapes(matrix: Mat23): Body {
    this.zpp_inner.immutable_midstep("Body::transformShapes()");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    let cx_ite = this.zpp_inner.shapes.head;
    while (cx_ite != null) {
      cx_ite.elt.outer.transform(matrix);
      cx_ite = cx_ite.next;
    }
    return this;
  }

  /**
   * Translate all shapes and adjust the body position so the local centre of mass coincides with the body origin.
   * @returns `this` for chaining.
   * @throws If the body has no shapes.
   */
  align(): Body {
    this.zpp_inner.immutable_midstep("Body::align()");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    if (this.zpp_inner.shapes.head == null) {
      throw new Error("Error: Cannot align empty Body");
    }
    this.zpp_inner.validate_localCOM();
    const dx = Vec2.get(-this.zpp_inner.localCOMx, -this.zpp_inner.localCOMy);
    this.translateShapes(dx);
    const dx2 = this.localVectorToWorld(dx);
    if (this.zpp_inner.wrap_pos == null) {
      this.zpp_inner.setupPosition();
    }
    this.zpp_inner.wrap_pos.subeq(dx2);
    if (this.zpp_inner.pre_posx < Infinity) {
      this.zpp_inner.pre_posx -= _readVec2X(dx2);
      this.zpp_inner.pre_posy -= _readVec2Y(dx2);
    }
    dx.dispose();
    dx2.dispose();
    return this;
  }

  /**
   * Rotate the body about a world-space pivot point by `angle` radians.
   * Moves the body's position and increments its rotation.
   * @param centre - World-space pivot point.
   * @param angle - Rotation in radians.
   * @returns `this` for chaining.
   * @throws If `centre` is null or `angle` is NaN.
   */
  rotate(centre: Vec2, angle: number): Body {
    _checkVec2Disposed(centre);
    if (centre == null) {
      throw new Error("Error: Cannot rotate about a null Vec2");
    }
    if (angle !== angle) {
      throw new Error("Error: Cannot rotate by NaN radians");
    }
    const weak = centre.zpp_inner.weak;
    centre.zpp_inner.weak = false;
    if (this.zpp_inner.wrap_pos == null) {
      this.zpp_inner.setupPosition();
    }
    const del = this.zpp_inner.wrap_pos.sub(centre);
    del.rotate(angle);
    const position = centre.add(del, true);
    // inline set_position
    _setVec2Prop(
      "position",
      this.zpp_inner.wrap_pos,
      position,
      () => this.zpp_inner.setupPosition(),
      () => this.zpp_inner.wrap_pos,
    );
    if (this.zpp_inner.wrap_pos == null) {
      this.zpp_inner.setupPosition();
    }
    del.dispose();
    // inline set_rotation
    {
      const newRot = this.zpp_inner.rot + angle;
      const zpp = this.zpp_inner;
      zpp.immutable_midstep("Body::rotation");
      if (zpp.world) {
        throw new Error("Error: Space::world is immutable");
      }
      if (zpp.type === 1 && zpp.space != null) {
        throw new Error("Error: Static objects cannot be rotated once inside a Space");
      }
      if (zpp.rot !== newRot) {
        if (newRot !== newRot) {
          throw new Error("Error: Body::rotation cannot be NaN");
        }
        zpp.rot = newRot;
        zpp.invalidate_rot();
        zpp.wake();
      }
    }
    centre.zpp_inner.weak = weak;
    _disposeWeakVec2(centre);
    return this;
  }

  /**
   * Set the same `Material` on every shape attached to this body.
   * @param material - The material to apply.
   * @returns `this` for chaining.
   */
  setShapeMaterials(material: Material): Body {
    this.zpp_inner.immutable_midstep("Body::setShapeMaterials()");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    let cx_ite = this.zpp_inner.shapes.head;
    while (cx_ite != null) {
      const shape = cx_ite.elt.outer;
      shape.zpp_inner.immutable_midstep("Shape::material");
      if (material == null) {
        throw new Error("Error: Cannot assign null as Shape material");
      }
      shape.zpp_inner.setMaterial(material.zpp_inner);
      shape.zpp_inner.material.wrapper();
      cx_ite = cx_ite.next;
    }
    return this;
  }

  /**
   * Set the same `InteractionFilter` on every shape attached to this body.
   * @param filter - The interaction filter to apply.
   * @returns `this` for chaining.
   */
  setShapeFilters(filter: InteractionFilter): Body {
    this.zpp_inner.immutable_midstep("Body::setShapeFilters()");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    let cx_ite = this.zpp_inner.shapes.head;
    while (cx_ite != null) {
      const shape = cx_ite.elt.outer;
      shape.zpp_inner.immutable_midstep("Shape::filter");
      if (filter == null) {
        throw new Error("Error: Cannot assign null as Shape filter");
      }
      shape.zpp_inner.setFilter(filter.zpp_inner);
      shape.zpp_inner.filter.wrapper();
      cx_ite = cx_ite.next;
    }
    return this;
  }

  /**
   * Set the same `FluidProperties` on every shape attached to this body.
   * @param fluidProperties - The fluid properties to apply.
   * @returns `this` for chaining.
   */
  setShapeFluidProperties(fluidProperties: FluidProperties): Body {
    this.zpp_inner.immutable_midstep("Body::setShapeFluidProperties()");
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world is immutable");
    }
    const nape = getNape();
    let cx_ite = this.zpp_inner.shapes.head;
    while (cx_ite != null) {
      const shape = cx_ite.elt.outer;
      if (fluidProperties == null) {
        throw new Error(
          "Error: Cannot assign null as Shape fluidProperties, disable fluids by setting fluidEnabled to false",
        );
      }
      shape.zpp_inner.setFluid(fluidProperties.zpp_inner);
      shape.zpp_inner.immutable_midstep("Shape::fluidProperties");
      if (shape.zpp_inner.fluidProperties == null) {
        shape.zpp_inner.setFluid(new nape.phys.FluidProperties().zpp_inner);
      }
      shape.zpp_inner.fluidProperties.wrapper();
      cx_ite = cx_ite.next;
    }
    return this;
  }

  // ---------------------------------------------------------------------------
  // contains
  // ---------------------------------------------------------------------------

  /**
   * Test whether a world-space point lies inside any shape attached to this body.
   * @param point - The point to test in world space.
   * @returns True if the point is inside at least one shape.
   */
  contains(point: Vec2): boolean {
    _checkVec2Disposed(point);
    if (point == null) {
      throw new Error("Error: Cannot check containment of null point");
    }
    const wasWeak = point.zpp_inner.weak;
    point.zpp_inner.weak = false;
    let result = false;
    let cx_ite = this.zpp_inner.shapes.head;
    while (cx_ite != null) {
      if (cx_ite.elt.outer.contains(point)) {
        result = true;
        break;
      }
      cx_ite = cx_ite.next;
    }
    point.zpp_inner.weak = wasWeak;
    _disposeWeakVec2(point);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Connected/interacting bodies
  // ---------------------------------------------------------------------------

  /**
   * Return the set of bodies connected to this body via constraints.
   * @param depth - Maximum traversal depth (-1 means unlimited).
   * @param output - Optional existing list to accumulate results into.
   * @returns A BodyList of connected bodies.
   */
  connectedBodies(depth: number = -1, output: BodyList | null = null): BodyList {
    return this.zpp_inner.connectedBodies(depth, output);
  }

  /**
   * Return the set of bodies currently interacting with this body via arbiters.
   * @param type - Filter by interaction type (COLLISION, FLUID, SENSOR), or null for all.
   * @param _depth - Unused; reserved for future use.
   * @param output - Optional existing list to accumulate results into.
   * @returns A BodyList of interacting bodies.
   */
  interactingBodies(
    type: InteractionType | null = null,
    _depth: number = -1,
    output: BodyList | null = null,
  ): BodyList {
    let arbiter_type: number;
    if (type == null) {
      arbiter_type = ZPP_Arbiter.COL | ZPP_Arbiter.SENSOR | ZPP_Arbiter.FLUID;
    } else {
      const nape = getNape();
      const col = _ensureFlag(
        "InteractionType_COLLISION",
        () => new nape.callbacks.InteractionType(),
      );
      if (type === col) {
        arbiter_type = ZPP_Arbiter.COL;
      } else {
        const sensor = _ensureFlag(
          "InteractionType_SENSOR",
          () => new nape.callbacks.InteractionType(),
        );
        arbiter_type = type === sensor ? ZPP_Arbiter.SENSOR : ZPP_Arbiter.FLUID;
      }
    }
    return this.zpp_inner.interactingBodies(arbiter_type, output);
  }

  // ---------------------------------------------------------------------------
  // Impulse queries
  // ---------------------------------------------------------------------------

  /**
   * Sum of normal (penetration-resolving) impulses received from collision arbiters this step.
   * @param body - If provided, only arbiters shared with `body` are summed.
   * @param freshOnly - If true, only newly created arbiters are considered.
   * @returns A Vec3 where x/y are the linear component and z is the angular component.
   */
  normalImpulse(body: Body | null = null, freshOnly: boolean = false): Vec3 {
    return this._arbiterImpulseQuery(
      ZPP_Arbiter.COL,
      (arb: Arbiter) => arb.collisionArbiter!.normalImpulse(this, freshOnly),
      body,
    );
  }

  /**
   * Sum of tangent (friction) impulses received from collision arbiters this step.
   * @param body - If provided, only arbiters shared with `body` are summed.
   * @param freshOnly - If true, only newly created arbiters are considered.
   * @returns A Vec3 where x/y are the linear component and z is the angular component.
   */
  tangentImpulse(body: Body | null = null, freshOnly: boolean = false): Vec3 {
    return this._arbiterImpulseQuery(
      ZPP_Arbiter.COL,
      (arb: Arbiter) => arb.collisionArbiter!.tangentImpulse(this, freshOnly),
      body,
    );
  }

  /**
   * Sum of total contact impulses (normal + tangent) from collision arbiters this step.
   * @param body - If provided, only arbiters shared with `body` are summed.
   * @param freshOnly - If true, only newly created arbiters are considered.
   * @returns A Vec3 where x/y are the linear component and z is the angular component.
   */
  totalContactsImpulse(body: Body | null = null, freshOnly: boolean = false): Vec3 {
    return this._arbiterImpulseQuery(
      ZPP_Arbiter.COL,
      (arb: Arbiter) => arb.collisionArbiter!.totalImpulse(this, freshOnly),
      body,
    );
  }

  /**
   * Sum of rolling (angular friction) impulses from collision arbiters this step.
   * @param body - If provided, only arbiters shared with `body` are summed.
   * @param freshOnly - If true, only newly created arbiters are considered.
   * @returns The total rolling impulse scalar.
   */
  rollingImpulse(body: Body | null = null, freshOnly: boolean = false): number {
    let ret = 0;
    const arbList = this._getArbiters();
    const iter = arbList.iterator();
    while (true) {
      iter.zpp_inner.zpp_inner.valmod();
      const length = iter.zpp_inner.zpp_gl();
      iter.zpp_critical = true;
      if (iter.zpp_i >= length) {
        iter.zpp_next = getNape().dynamics.ArbiterIterator.zpp_pool;
        getNape().dynamics.ArbiterIterator.zpp_pool = iter;
        iter.zpp_inner = null;
        break;
      }
      iter.zpp_critical = false;
      const oarb = iter.zpp_inner.at(iter.zpp_i++);
      const arb = oarb.zpp_inner;
      if (arb.type !== ZPP_Arbiter.COL) continue;
      if (body != null && arb.b2 !== body.zpp_inner && arb.b1 !== body.zpp_inner) continue;
      ret += oarb.collisionArbiter!.rollingImpulse(this, freshOnly);
    }
    return ret;
  }

  /**
   * Sum of buoyancy impulses received from fluid arbiters this step.
   * @param body - If provided, only arbiters shared with `body` are summed.
   * @returns A Vec3 where x/y are the linear component and z is the angular component.
   */
  buoyancyImpulse(body: Body | null = null): Vec3 {
    return this._arbiterImpulseQuery(
      ZPP_Arbiter.FLUID,
      (arb: Arbiter) => arb.fluidArbiter!.buoyancyImpulse(this),
      body,
    );
  }

  /**
   * Sum of fluid drag impulses received from fluid arbiters this step.
   * @param body - If provided, only arbiters shared with `body` are summed.
   * @returns A Vec3 where x/y are the linear component and z is the angular component.
   */
  dragImpulse(body: Body | null = null): Vec3 {
    return this._arbiterImpulseQuery(
      ZPP_Arbiter.FLUID,
      (arb: Arbiter) => arb.fluidArbiter!.dragImpulse(this),
      body,
    );
  }

  /**
   * Sum of total fluid impulses (buoyancy + drag) from fluid arbiters this step.
   * @param body - If provided, only arbiters shared with `body` are summed.
   * @returns A Vec3 where x/y are the linear component and z is the angular component.
   */
  totalFluidImpulse(body: Body | null = null): Vec3 {
    return this._arbiterImpulseQuery(
      ZPP_Arbiter.FLUID,
      (arb: Arbiter) => arb.fluidArbiter!.totalImpulse(this),
      body,
    );
  }

  /**
   * Sum of impulses applied to this body by all attached constraints this step.
   * @returns A Vec3 where x/y are the linear component and z is the angular component.
   */
  constraintsImpulse(): Vec3 {
    let retx = 0;
    let rety = 0;
    let retz = 0;
    let node = this.zpp_inner.constraints.head;
    while (node != null) {
      const con = node.elt;
      const imp = con.outer.bodyImpulse(this) as Vec3;
      const zi = imp.zpp_inner;
      if (zi._validate != null) zi._validate();
      retx += zi.x;
      if (zi._validate != null) zi._validate();
      rety += zi.y;
      if (zi._validate != null) zi._validate();
      retz += zi.z;
      imp.dispose();
      node = node.next;
    }
    return Vec3.get(retx, rety, retz);
  }

  /**
   * Sum of all impulses (contacts + constraints) applied to this body this step, excluding sensor arbiters.
   * @param body - If provided, only arbiters shared with `body` are summed.
   * @param freshOnly - If true, only newly created contact arbiters are considered.
   * @returns A Vec3 where x/y are the linear component and z is the angular component.
   */
  totalImpulse(body: Body | null = null, freshOnly: boolean = false): Vec3 {
    let retx = 0;
    let rety = 0;
    let retz = 0;
    // Sum arbiter impulses (skip SENSOR)
    const arbList = this._getArbiters();
    const iter = arbList.iterator();
    while (true) {
      iter.zpp_inner.zpp_inner.valmod();
      const length = iter.zpp_inner.zpp_gl();
      iter.zpp_critical = true;
      if (iter.zpp_i >= length) {
        iter.zpp_next = getNape().dynamics.ArbiterIterator.zpp_pool;
        getNape().dynamics.ArbiterIterator.zpp_pool = iter;
        iter.zpp_inner = null;
        break;
      }
      iter.zpp_critical = false;
      const oarb = iter.zpp_inner.at(iter.zpp_i++);
      const arb = oarb.zpp_inner;
      if (arb.type === ZPP_Arbiter.SENSOR) continue;
      if (body != null && arb.b2 !== body.zpp_inner && arb.b1 !== body.zpp_inner) continue;
      const imp = arb.wrapper().totalImpulse(this, freshOnly) as Vec3;
      const zi = imp.zpp_inner;
      if (zi._validate != null) zi._validate();
      retx += zi.x;
      if (zi._validate != null) zi._validate();
      rety += zi.y;
      if (zi._validate != null) zi._validate();
      retz += zi.z;
      imp.dispose();
    }
    // Sum constraint impulses (only active)
    let node = this.zpp_inner.constraints.head;
    while (node != null) {
      const con = node.elt;
      if (con.outer.active) {
        const imp = con.outer.bodyImpulse(this) as Vec3;
        const zi = imp.zpp_inner;
        if (zi._validate != null) zi._validate();
        retx += zi.x;
        if (zi._validate != null) zi._validate();
        rety += zi.y;
        if (zi._validate != null) zi._validate();
        retz += zi.z;
        imp.dispose();
      }
      node = node.next;
    }
    return Vec3.get(retx, rety, retz);
  }

  /**
   * Compute a heuristic crush factor indicating how strongly this body is being compressed from multiple directions.
   * A value near zero means balanced forces; larger values indicate compression.
   * @returns The crush factor (dimensionless).
   * @throws If the body is not in a Space.
   */
  crushFactor(): number {
    if (this.zpp_inner.space == null) {
      throw new Error(
        "Error: Makes no sense to see how much an object not taking part in a simulation is being crushed",
      );
    }
    let msum = 0.0;
    const jsum = Vec2.get(0, 0);
    // Sum arbiter impulses
    const arbList = this._getArbiters();
    const iter = arbList.iterator();
    while (true) {
      iter.zpp_inner.zpp_inner.valmod();
      const length = iter.zpp_inner.zpp_gl();
      iter.zpp_critical = true;
      if (iter.zpp_i >= length) {
        iter.zpp_next = getNape().dynamics.ArbiterIterator.zpp_pool;
        getNape().dynamics.ArbiterIterator.zpp_pool = iter;
        iter.zpp_inner = null;
        break;
      }
      iter.zpp_critical = false;
      const oarb = iter.zpp_inner.at(iter.zpp_i++);
      const imp3 = oarb.totalImpulse(this) as Vec3;
      const imp = imp3.xy();
      jsum.addeq(imp);
      const ix = _readVec2X(imp);
      const iy = _readVec2Y(imp);
      msum += Math.sqrt(ix * ix + iy * iy);
      imp.dispose();
      imp3.dispose();
    }
    // Sum constraint impulses
    const consList = this._getConstraints();
    const _this9 = consList;
    _this9.zpp_inner.valmod();
    const _g1 = getNape().constraint.ConstraintIterator.get(_this9);
    while (true) {
      _g1.zpp_inner.zpp_inner.valmod();
      const _this10 = _g1.zpp_inner;
      _this10.zpp_inner.valmod();
      if (_this10.zpp_inner.zip_length) {
        _this10.zpp_inner.zip_length = false;
        _this10.zpp_inner.user_length = _this10.zpp_inner.inner.length;
      }
      const length1 = _this10.zpp_inner.user_length;
      _g1.zpp_critical = true;
      if (_g1.zpp_i >= length1) {
        _g1.zpp_next = getNape().constraint.ConstraintIterator.zpp_pool;
        getNape().constraint.ConstraintIterator.zpp_pool = _g1;
        _g1.zpp_inner = null;
        break;
      }
      _g1.zpp_critical = false;
      const con = _g1.zpp_inner.at(_g1.zpp_i++);
      const imp31 = con.bodyImpulse(this) as Vec3;
      const imp1 = imp31.xy();
      jsum.addeq(imp1);
      const ix1 = _readVec2X(imp1);
      const iy1 = _readVec2Y(imp1);
      msum += Math.sqrt(ix1 * ix1 + iy1 * iy1);
      imp1.dispose();
      imp31.dispose();
    }
    // Compute crush factor
    const jx = _readVec2X(jsum);
    const jy = _readVec2Y(jsum);
    const jlen = Math.sqrt(jx * jx + jy * jy);
    const cmass = this.mass;
    const ret = (msum - jlen) / (cmass * this.zpp_inner.space.pre_dt);
    jsum.dispose();
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _getArbiters(): any {
    if (this.zpp_inner.wrap_arbiters == null) {
      this.zpp_inner.wrap_arbiters = ZPP_ArbiterList.get(this.zpp_inner.arbiters, true);
    }
    return this.zpp_inner.wrap_arbiters;
  }

  private _getConstraints(): any {
    if (this.zpp_inner.wrap_constraints == null) {
      this.zpp_inner.wrap_constraints = ZPP_ConstraintList.get(this.zpp_inner.constraints, true);
    }
    return this.zpp_inner.wrap_constraints;
  }

  private _arbiterImpulseQuery(
    arbType: number,
    getImpulse: (arb: Arbiter) => Vec3,
    body: Body | null,
  ): Vec3 {
    let retx = 0;
    let rety = 0;
    let retz = 0;
    const arbList = this._getArbiters();
    const iter = arbList.iterator();
    while (true) {
      iter.zpp_inner.zpp_inner.valmod();
      const length = iter.zpp_inner.zpp_gl();
      iter.zpp_critical = true;
      if (iter.zpp_i >= length) {
        iter.zpp_next = getNape().dynamics.ArbiterIterator.zpp_pool;
        getNape().dynamics.ArbiterIterator.zpp_pool = iter;
        iter.zpp_inner = null;
        break;
      }
      iter.zpp_critical = false;
      const oarb = iter.zpp_inner.at(iter.zpp_i++);
      const arb = oarb.zpp_inner;
      if (arb.type !== arbType) continue;
      if (body != null && arb.b2 !== body.zpp_inner && arb.b1 !== body.zpp_inner) continue;
      const imp = getImpulse(oarb) as Vec3;
      const zi = imp.zpp_inner;
      if (zi._validate != null) zi._validate();
      retx += zi.x;
      if (zi._validate != null) zi._validate();
      rety += zi.y;
      if (zi._validate != null) zi._validate();
      retz += zi.z;
      imp.dispose();
    }
    return Vec3.get(retx, rety, retz);
  }
}

// ---------------------------------------------------------------------------
// Internal helper: convert BodyType to integer
// ---------------------------------------------------------------------------

function _bodyTypeToInt(type: BodyType, nape: any): number {
  const dynamic = _ensureFlag("BodyType_DYNAMIC", () => new nape.phys.BodyType());
  if (type === dynamic) return 2;
  const kinematic = _ensureFlag("BodyType_KINEMATIC", () => new nape.phys.BodyType());
  return type === kinematic ? 3 : 1;
}

/** Invalidate all shapes on a body (position/rotation changed). */
function _invalidateShapes(cur: ZPP_Body): void {
  let cx_ite = cur.shapes.head;
  while (cx_ite != null) {
    const s = cx_ite.elt;
    if (s.type === 1) {
      s.polygon.invalidate_gverts();
      s.polygon.invalidate_gaxi();
    }
    s.invalidate_worldCOM();
    cx_ite = cx_ite.next;
  }
}

// ---------------------------------------------------------------------------
// Self-register in the compiled namespace
// ---------------------------------------------------------------------------
const _napeBody = getNape();
_napeBody.phys.Body = Body;

// Bind Body._wrap into Interactor so Interactor._wrap can dispatch without circular import.
_bindBodyWrapForInteractor((inner) => Body._wrap(inner));
