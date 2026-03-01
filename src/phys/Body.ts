import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { AABB } from "../geom/AABB";
import { NapeList } from "../util/NapeList";
import { Shape } from "../shape/Shape";
import { Space } from "../space/Space";
import { Material } from "./Material";
import { FluidProperties } from "./FluidProperties";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { BodyType } from "./BodyType";
import { Interactor, _bindBodyWrapForInteractor } from "./Interactor";
import { ZPP_Body } from "../native/phys/ZPP_Body";

type Any = any;

/**
 * A rigid body in the physics simulation.
 *
 * Fully modernized — uses ZPP_Body directly (extracted to TypeScript).
 */
export class Body extends Interactor {
  static __name__ = ["nape", "phys", "Body"];
  static __super__: Any = Interactor;

  /** Direct access to the extracted internal ZPP_Body. */
  zpp_inner!: ZPP_Body;
  debugDraw: boolean = true;

  // ---------------------------------------------------------------------------
  // Methods copied from compiled Body prototype at module init time.
  // Declared here so TypeScript knows they exist at runtime.
  // ---------------------------------------------------------------------------

  /** @internal */ set_type!: (type: Any) => Any;
  /** @internal */ set_position!: (position: Any) => Any;
  /** @internal */ set_rotation!: (rotation: number) => number;
  /** @internal */ set_velocity!: (velocity: Any) => Any;
  /** @internal */ set_angularVel!: (angularVel: number) => number;
  /** @internal */ set_kinematicVel!: (kinematicVel: Any) => Any;
  /** @internal */ set_kinAngVel!: (kinAngVel: number) => number;
  /** @internal */ set_surfaceVel!: (surfaceVel: Any) => Any;
  /** @internal */ set_force!: (force: Any) => Any;
  /** @internal */ set_torque!: (torque: number) => number;
  /** @internal */ get_mass!: () => number;
  /** @internal */ set_mass!: (mass: number) => number;
  /** @internal */ get_inertia!: () => number;
  /** @internal */ set_inertia!: (inertia: number) => number;
  /** @internal */ get_gravMass!: () => number;
  /** @internal */ set_gravMass!: (gravMass: number) => number;
  /** @internal */ get_gravMassScale!: () => number;
  /** @internal */ set_gravMassScale!: (gravMassScale: number) => number;
  /** @internal */ set_allowMovement!: (v: boolean) => boolean;
  /** @internal */ set_allowRotation!: (v: boolean) => boolean;
  /** @internal */ set_space!: (space: Any) => Any;
  /** @internal */ set_compound!: (compound: Any) => Any;
  /** @internal */ get_localCOM!: () => Any;
  /** @internal */ get_worldCOM!: () => Any;

  // Complex methods from compiled prototype
  /** @internal */ integrate!: (deltaTime: number) => Any;
  /** @internal */ applyImpulse!: (impulse: Any, pos?: Any, sleepable?: boolean) => void;
  /** @internal */ applyAngularImpulse!: (impulse: number, sleepable?: boolean) => void;
  /** @internal */ setVelocityFromTarget!: (targetPosition: Any, targetRotation: number, deltaTime: number) => Any;
  /** @internal */ localPointToWorld!: (point: Any, weak?: boolean) => Any;
  /** @internal */ worldPointToLocal!: (point: Any, weak?: boolean) => Any;
  /** @internal */ localVectorToWorld!: (vector: Any, weak?: boolean) => Any;
  /** @internal */ worldVectorToLocal!: (vector: Any, weak?: boolean) => Any;
  /** @internal */ translateShapes!: (translation: Any) => void;
  /** @internal */ rotateShapes!: (angle: number) => void;
  /** @internal */ scaleShapes!: (scaleX: number, scaleY: number) => void;
  /** @internal */ align!: () => void;
  /** @internal */ rotate!: (centre: Any, angle: number) => void;
  /** @internal */ setShapeMaterials!: (material: Any) => void;
  /** @internal */ setShapeFilters!: (filter: Any) => void;
  /** @internal */ setShapeFluidProperties!: (fluidProperties: Any) => void;
  /** @internal */ contains!: (point: Any) => boolean;
  /** @internal */ crushFactor!: () => number;
  /** @internal */ connectedBodies!: (depth?: number, output?: Any) => Any;
  /** @internal */ interactingBodies!: (type?: Any, depth?: number, output?: Any) => Any;

  // Mode getters/setters from compiled prototype
  /** @internal */ get_massMode!: () => Any;
  /** @internal */ set_massMode!: (mode: Any) => Any;
  /** @internal */ get_inertiaMode!: () => Any;
  /** @internal */ set_inertiaMode!: (mode: Any) => Any;
  /** @internal */ get_gravMassMode!: () => Any;
  /** @internal */ set_gravMassMode!: (mode: Any) => Any;

  /** @internal */ _toString!: () => string;

  constructor(type?: BodyType, position?: Vec2) {
    super();

    const zpp = new ZPP_Body();
    this.zpp_inner = zpp;
    zpp.outer = this;
    zpp.outer_i = this;
    (this as Any).zpp_inner_i = zpp;

    // Override the Interactor's _inner to point at this object (backward compat).
    (this as Writable<Body>)._inner = this as Any;

    // Set position
    if (position != null) {
      if ((position as Any).zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const pi = position.zpp_inner;
      if (pi._validate != null) {
        pi._validate();
      }
      zpp.posx = pi.x;
      if (pi._validate != null) {
        pi._validate();
      }
      zpp.posy = pi.y;
    } else {
      zpp.posx = 0;
      zpp.posy = 0;
    }

    // Set type (default DYNAMIC)
    const nape = getNape();
    const zppNs = nape.__zpp;
    let type1: BodyType;
    if (type == null) {
      if (zppNs.util.ZPP_Flags.BodyType_DYNAMIC == null) {
        zppNs.util.ZPP_Flags.internal = true;
        zppNs.util.ZPP_Flags.BodyType_DYNAMIC = new nape.phys.BodyType();
        zppNs.util.ZPP_Flags.internal = false;
      }
      type1 = zppNs.util.ZPP_Flags.BodyType_DYNAMIC;
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
      let ntype: number;
      if (zppNs.util.ZPP_Flags.BodyType_DYNAMIC == null) {
        zppNs.util.ZPP_Flags.internal = true;
        zppNs.util.ZPP_Flags.BodyType_DYNAMIC = new nape.phys.BodyType();
        zppNs.util.ZPP_Flags.internal = false;
      }
      if (type1 === zppNs.util.ZPP_Flags.BodyType_DYNAMIC) {
        ntype = 2;
      } else {
        if (zppNs.util.ZPP_Flags.BodyType_KINEMATIC == null) {
          zppNs.util.ZPP_Flags.internal = true;
          zppNs.util.ZPP_Flags.BodyType_KINEMATIC = new nape.phys.BodyType();
          zppNs.util.ZPP_Flags.internal = false;
        }
        ntype = type1 === zppNs.util.ZPP_Flags.BodyType_KINEMATIC ? 3 : 1;
      }
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
      if (position.zpp_inner.weak) {
        position.dispose();
      }
    }

    // Register ANY_BODY callback type
    zpp.insert_cbtype(zppNs.callbacks.ZPP_CbType.ANY_BODY.zpp_inner);
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
        (b as Any).zpp_inner_i = zpp;
        (b as Writable<Body>)._inner = b as Any;
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

  get type(): BodyType {
    return ZPP_Body.types[this.zpp_inner.type];
  }
  set type(value: BodyType) {
    this.set_type(value);
  }

  isStatic(): boolean {
    return this.zpp_inner.type === 1;
  }
  isDynamic(): boolean {
    return this.zpp_inner.type === 2;
  }
  isKinematic(): boolean {
    return this.zpp_inner.type === 3;
  }

  // ---------------------------------------------------------------------------
  // Position & rotation
  // ---------------------------------------------------------------------------

  get position(): Vec2 {
    if (this.zpp_inner.wrap_pos == null) {
      this.zpp_inner.setupPosition();
    }
    return this.zpp_inner.wrap_pos;
  }
  set position(value: Vec2) {
    this.set_position(value);
  }

  get rotation(): number {
    return this.zpp_inner.rot;
  }
  set rotation(value: number) {
    this.set_rotation(value);
  }

  // ---------------------------------------------------------------------------
  // Velocity
  // ---------------------------------------------------------------------------

  get velocity(): Vec2 {
    if (this.zpp_inner.wrap_vel == null) {
      this.zpp_inner.setupVelocity();
    }
    return this.zpp_inner.wrap_vel;
  }
  set velocity(value: Vec2) {
    this.set_velocity(value);
  }

  get angularVel(): number {
    return this.zpp_inner.angvel;
  }
  set angularVel(value: number) {
    this.set_angularVel(value);
  }

  get kinematicVel(): Vec2 {
    if (this.zpp_inner.wrap_kinvel == null) {
      this.zpp_inner.setupkinvel();
    }
    return this.zpp_inner.wrap_kinvel;
  }
  set kinematicVel(value: Vec2) {
    this.set_kinematicVel(value);
  }

  get kinAngVel(): number {
    return this.zpp_inner.kinangvel;
  }
  set kinAngVel(value: number) {
    this.set_kinAngVel(value);
  }

  get surfaceVel(): Vec2 {
    if (this.zpp_inner.wrap_svel == null) {
      this.zpp_inner.setupsvel();
    }
    return this.zpp_inner.wrap_svel;
  }
  set surfaceVel(value: Vec2) {
    this.set_surfaceVel(value);
  }

  // ---------------------------------------------------------------------------
  // Force & torque
  // ---------------------------------------------------------------------------

  get force(): Vec2 {
    if (this.zpp_inner.wrap_force == null) {
      this.zpp_inner.setupForce();
    }
    return this.zpp_inner.wrap_force;
  }
  set force(value: Vec2) {
    this.set_force(value);
  }

  get torque(): number {
    return this.zpp_inner.torque;
  }
  set torque(value: number) {
    this.set_torque(value);
  }

  // ---------------------------------------------------------------------------
  // Mass & inertia
  // ---------------------------------------------------------------------------

  get mass(): number {
    return this.get_mass();
  }
  set mass(value: number) {
    this.set_mass(value);
  }

  get inertia(): number {
    return this.get_inertia();
  }
  set inertia(value: number) {
    this.set_inertia(value);
  }

  get constraintMass(): number {
    if (!this.zpp_inner.world) {
      this.zpp_inner.validate_mass();
    }
    return this.zpp_inner.smass;
  }

  get constraintInertia(): number {
    if (!this.zpp_inner.world) {
      this.zpp_inner.validate_inertia();
    }
    return this.zpp_inner.sinertia;
  }

  get gravMass(): number {
    return this.get_gravMass();
  }
  set gravMass(value: number) {
    this.set_gravMass(value);
  }

  get gravMassScale(): number {
    return this.get_gravMassScale();
  }
  set gravMassScale(value: number) {
    this.set_gravMassScale(value);
  }

  // ---------------------------------------------------------------------------
  // Flags
  // ---------------------------------------------------------------------------

  get isBullet(): boolean {
    return this.zpp_inner.bulletEnabled;
  }
  set isBullet(value: boolean) {
    this.zpp_inner.bulletEnabled = value;
  }

  get disableCCD(): boolean {
    return this.zpp_inner.disableCCD;
  }
  set disableCCD(value: boolean) {
    this.zpp_inner.disableCCD = value;
  }

  get allowMovement(): boolean {
    return !this.zpp_inner.nomove;
  }
  set allowMovement(value: boolean) {
    this.set_allowMovement(value);
  }

  get allowRotation(): boolean {
    return !this.zpp_inner.norotate;
  }
  set allowRotation(value: boolean) {
    this.set_allowRotation(value);
  }

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

  get shapes(): NapeList<Shape> {
    return new NapeList(this.zpp_inner.wrap_shapes, Shape._wrap);
  }

  get space(): Space {
    if (this.zpp_inner.space == null) return null as unknown as Space;
    return Space._wrap(this.zpp_inner.space.outer);
  }
  set space(value: Space | null) {
    this.set_space(value != null ? (value as Any)._inner ?? value : null);
  }

  get compound(): Any {
    if (this.zpp_inner.compound == null) return null;
    return this.zpp_inner.compound.outer;
  }
  set compound(value: Any) {
    this.set_compound(value);
  }

  get bounds(): AABB {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world has no bounds");
    }
    return AABB._wrap(this.zpp_inner.aabb.wrapper());
  }

  get constraintVelocity(): Vec2 {
    if (this.zpp_inner.wrapcvel == null) {
      this.zpp_inner.setup_cvel();
    }
    return this.zpp_inner.wrapcvel;
  }

  get localCOM(): Vec2 {
    return this.get_localCOM();
  }

  get worldCOM(): Vec2 {
    return this.get_worldCOM();
  }

  // ---------------------------------------------------------------------------
  // Methods — these delegate to compiled prototype methods copied at init time
  // ---------------------------------------------------------------------------

  copy(): Body {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world cannot be copied");
    }
    return this.zpp_inner.copy();
  }

  override toString(): string {
    return this._toString();
  }

  // ---------------------------------------------------------------------------
  // Compiled-code compatibility methods
  // These are called by compiled code and need to exist for backward compat.
  // Complex methods (integrate, applyImpulse, localPointToWorld, etc.) are
  // copied from the compiled prototype at module init time (see bottom).
  // ---------------------------------------------------------------------------

  get_type(): Any {
    return ZPP_Body.types[this.zpp_inner.type];
  }

  get_shapes(): Any {
    return this.zpp_inner.wrap_shapes;
  }

  get_isBullet(): boolean {
    return this.zpp_inner.bulletEnabled;
  }
  set_isBullet(v: boolean): boolean {
    this.zpp_inner.bulletEnabled = v;
    return v;
  }

  get_disableCCD(): boolean {
    return this.zpp_inner.disableCCD;
  }
  set_disableCCD(v: boolean): boolean {
    this.zpp_inner.disableCCD = v;
    return v;
  }

  get_position(): Any {
    if (this.zpp_inner.wrap_pos == null) {
      this.zpp_inner.setupPosition();
    }
    return this.zpp_inner.wrap_pos;
  }

  get_velocity(): Any {
    if (this.zpp_inner.wrap_vel == null) {
      this.zpp_inner.setupVelocity();
    }
    return this.zpp_inner.wrap_vel;
  }

  get_rotation(): number {
    return this.zpp_inner.rot;
  }

  get_angularVel(): number {
    return this.zpp_inner.angvel;
  }

  get_kinematicVel(): Any {
    if (this.zpp_inner.wrap_kinvel == null) {
      this.zpp_inner.setupkinvel();
    }
    return this.zpp_inner.wrap_kinvel;
  }

  get_kinAngVel(): number {
    return this.zpp_inner.kinangvel;
  }

  get_surfaceVel(): Any {
    if (this.zpp_inner.wrap_svel == null) {
      this.zpp_inner.setupsvel();
    }
    return this.zpp_inner.wrap_svel;
  }

  get_force(): Any {
    if (this.zpp_inner.wrap_force == null) {
      this.zpp_inner.setupForce();
    }
    return this.zpp_inner.wrap_force;
  }

  get_torque(): number {
    return this.zpp_inner.torque;
  }

  get_bounds(): Any {
    if (this.zpp_inner.world) {
      throw new Error("Error: Space::world has no bounds");
    }
    return this.zpp_inner.aabb.wrapper();
  }

  get_constraintVelocity(): Any {
    if (this.zpp_inner.wrapcvel == null) {
      this.zpp_inner.setup_cvel();
    }
    return this.zpp_inner.wrapcvel;
  }

  get_constraintMass(): number {
    if (!this.zpp_inner.world) {
      this.zpp_inner.validate_mass();
    }
    return this.zpp_inner.smass;
  }

  get_constraintInertia(): number {
    if (!this.zpp_inner.world) {
      this.zpp_inner.validate_inertia();
    }
    return this.zpp_inner.sinertia;
  }

  get_allowMovement(): boolean {
    return !this.zpp_inner.nomove;
  }

  get_allowRotation(): boolean {
    return !this.zpp_inner.norotate;
  }

  get_isSleeping(): boolean {
    if (this.zpp_inner.space == null) {
      throw new Error(
        "Error: isSleeping makes no sense if the object is not contained within a Space",
      );
    }
    return this.zpp_inner.component.sleeping;
  }

  get_compound(): Any {
    if (this.zpp_inner.compound == null) return null;
    return this.zpp_inner.compound.outer;
  }

  get_space(): Any {
    if (this.zpp_inner.space == null) return null;
    return this.zpp_inner.space.outer;
  }

  get_arbiters(): Any {
    const zppNs = getNape().__zpp;
    if (this.zpp_inner.wrap_arbiters == null) {
      this.zpp_inner.wrap_arbiters = zppNs.util.ZPP_ArbiterList.get(
        this.zpp_inner.arbiters,
        true,
      );
    }
    return this.zpp_inner.wrap_arbiters;
  }

  get_constraints(): Any {
    const zppNs = getNape().__zpp;
    if (this.zpp_inner.wrap_constraints == null) {
      this.zpp_inner.wrap_constraints = zppNs.util.ZPP_ConstraintList.get(
        this.zpp_inner.constraints,
        true,
      );
    }
    return this.zpp_inner.wrap_constraints;
  }
}

// ---------------------------------------------------------------------------
// Self-register in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();

// Save compiled Body prototype before we replace the constructor,
// so we can copy complex methods we don't reimplement.
const compiledBodyProto = nape.phys.Body.prototype;

// Replace the compiled Body with our TS class
nape.phys.Body = Body;
(Body.prototype as Any).__class__ = Body;

// Copy compiled Interactor prototype methods for backward compat
for (const k in nape.phys.Interactor.prototype) {
  if (!Object.prototype.hasOwnProperty.call(Body.prototype, k)) {
    (Body.prototype as Any)[k] = nape.phys.Interactor.prototype[k];
  }
}

// Copy compiled Body prototype methods we don't override in TypeScript.
// This includes complex methods like integrate, applyImpulse, localPointToWorld,
// worldPointToLocal, localVectorToWorld, worldVectorToLocal, translateShapes,
// rotateShapes, scaleShapes, align, rotate, setShapeMaterials, setShapeFilters,
// setShapeFluidProperties, contains, crushFactor, setVelocityFromTarget,
// connectedBodies, interactingBodies, and all set_* / get_* compat methods.
for (const k in compiledBodyProto) {
  if (!Object.prototype.hasOwnProperty.call(Body.prototype, k)) {
    (Body.prototype as Any)[k] = compiledBodyProto[k];
  }
}

// Store a private reference to the compiled toString since we override it
// but want to delegate to the compiled implementation.
const compiledToString = compiledBodyProto.toString;
(Body.prototype as Any)._toString = compiledToString;

// Bind Body._wrap into Interactor so Interactor._wrap can dispatch without circular import.
_bindBodyWrapForInteractor((inner) => Body._wrap(inner));
