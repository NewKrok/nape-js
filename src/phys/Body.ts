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
import { BodyType, toNativeBodyType, fromNativeBodyType } from "./BodyType";

/**
 * A rigid body in the physics simulation.
 */
export class Body {
  /** @internal */
  readonly _inner: NapeInner;

  constructor(type: BodyType = BodyType.DYNAMIC, position?: Vec2) {
    this._inner = new (getNape().phys.Body)(toNativeBodyType(type), position?._inner);
  }

  /** @internal */
  static _wrap(inner: NapeInner): Body {
    return getOrCreate(inner, (raw) => {
      const b = Object.create(Body.prototype) as Body;
      (b as Writable<Body>)._inner = raw;
      return b;
    });
  }

  // ---------------------------------------------------------------------------
  // Type
  // ---------------------------------------------------------------------------

  get type(): BodyType {
    return fromNativeBodyType(this._inner.get_type());
  }
  set type(value: BodyType) {
    this._inner.set_type(toNativeBodyType(value));
  }

  isStatic(): boolean {
    return this._inner.isStatic();
  }
  isDynamic(): boolean {
    return this._inner.isDynamic();
  }
  isKinematic(): boolean {
    return this._inner.isKinematic();
  }

  // ---------------------------------------------------------------------------
  // Position & rotation
  // ---------------------------------------------------------------------------

  get position(): Vec2 {
    return Vec2._wrap(this._inner.get_position());
  }
  set position(value: Vec2) {
    this._inner.set_position(value._inner);
  }

  get rotation(): number {
    return this._inner.get_rotation();
  }
  set rotation(value: number) {
    this._inner.set_rotation(value);
  }

  // ---------------------------------------------------------------------------
  // Velocity
  // ---------------------------------------------------------------------------

  get velocity(): Vec2 {
    return Vec2._wrap(this._inner.get_velocity());
  }
  set velocity(value: Vec2) {
    this._inner.set_velocity(value._inner);
  }

  get angularVel(): number {
    return this._inner.get_angularVel();
  }
  set angularVel(value: number) {
    this._inner.set_angularVel(value);
  }

  get kinematicVel(): Vec2 {
    return Vec2._wrap(this._inner.get_kinematicVel());
  }
  set kinematicVel(value: Vec2) {
    this._inner.set_kinematicVel(value._inner);
  }

  get kinAngVel(): number {
    return this._inner.get_kinAngVel();
  }
  set kinAngVel(value: number) {
    this._inner.set_kinAngVel(value);
  }

  get surfaceVel(): Vec2 {
    return Vec2._wrap(this._inner.get_surfaceVel());
  }
  set surfaceVel(value: Vec2) {
    this._inner.set_surfaceVel(value._inner);
  }

  // ---------------------------------------------------------------------------
  // Force & torque
  // ---------------------------------------------------------------------------

  get force(): Vec2 {
    return Vec2._wrap(this._inner.get_force());
  }
  set force(value: Vec2) {
    this._inner.set_force(value._inner);
  }

  get torque(): number {
    return this._inner.get_torque();
  }
  set torque(value: number) {
    this._inner.set_torque(value);
  }

  // ---------------------------------------------------------------------------
  // Mass & inertia
  // ---------------------------------------------------------------------------

  get mass(): number {
    return this._inner.get_mass();
  }
  set mass(value: number) {
    this._inner.set_mass(value);
  }

  get inertia(): number {
    return this._inner.get_inertia();
  }
  set inertia(value: number) {
    this._inner.set_inertia(value);
  }

  get constraintMass(): number {
    return this._inner.get_constraintMass();
  }
  get constraintInertia(): number {
    return this._inner.get_constraintInertia();
  }

  get gravMass(): number {
    return this._inner.get_gravMass();
  }
  set gravMass(value: number) {
    this._inner.set_gravMass(value);
  }

  get gravMassScale(): number {
    return this._inner.get_gravMassScale();
  }
  set gravMassScale(value: number) {
    this._inner.set_gravMassScale(value);
  }

  // ---------------------------------------------------------------------------
  // Flags
  // ---------------------------------------------------------------------------

  get isBullet(): boolean {
    return this._inner.get_isBullet();
  }
  set isBullet(value: boolean) {
    this._inner.set_isBullet(value);
  }

  get disableCCD(): boolean {
    return this._inner.get_disableCCD();
  }
  set disableCCD(value: boolean) {
    this._inner.set_disableCCD(value);
  }

  get allowMovement(): boolean {
    return this._inner.get_allowMovement();
  }
  set allowMovement(value: boolean) {
    this._inner.set_allowMovement(value);
  }

  get allowRotation(): boolean {
    return this._inner.get_allowRotation();
  }
  set allowRotation(value: boolean) {
    this._inner.set_allowRotation(value);
  }

  get isSleeping(): boolean {
    return this._inner.get_isSleeping();
  }

  // ---------------------------------------------------------------------------
  // Relationships
  // ---------------------------------------------------------------------------

  get shapes(): NapeList<Shape> {
    return new NapeList(this._inner.get_shapes(), Shape._wrap);
  }

  get space(): Space {
    return Space._wrap(this._inner.get_space());
  }
  set space(value: Space | null) {
    this._inner.set_space(value?._inner ?? null);
  }

  get compound(): NapeInner {
    return this._inner.get_compound();
  }
  set compound(value: { _inner: NapeInner } | null) {
    this._inner.set_compound(value?._inner ?? null);
  }

  get bounds(): AABB {
    return AABB._wrap(this._inner.get_bounds());
  }
  get constraintVelocity(): Vec2 {
    return Vec2._wrap(this._inner.get_constraintVelocity());
  }
  get localCOM(): Vec2 {
    return Vec2._wrap(this._inner.get_localCOM());
  }
  get worldCOM(): Vec2 {
    return Vec2._wrap(this._inner.get_worldCOM());
  }
  get userData(): Record<string, unknown> {
    return this._inner.get_userData();
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  integrate(deltaTime: number): void {
    this._inner.integrate(deltaTime);
  }

  applyImpulse(impulse: Vec2, pos?: Vec2, sleepable?: boolean): void {
    this._inner.applyImpulse(impulse._inner, pos?._inner, sleepable);
  }

  applyAngularImpulse(impulse: number, sleepable?: boolean): void {
    this._inner.applyAngularImpulse(impulse, sleepable);
  }

  setVelocityFromTarget(targetPosition: Vec2, targetRotation: number, deltaTime: number): void {
    this._inner.setVelocityFromTarget(targetPosition._inner, targetRotation, deltaTime);
  }

  localPointToWorld(point: Vec2, weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.localPointToWorld(point._inner, weak));
  }

  worldPointToLocal(point: Vec2, weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.worldPointToLocal(point._inner, weak));
  }

  localVectorToWorld(vector: Vec2, weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.localVectorToWorld(vector._inner, weak));
  }

  worldVectorToLocal(vector: Vec2, weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.worldVectorToLocal(vector._inner, weak));
  }

  translateShapes(translation: Vec2): void {
    this._inner.translateShapes(translation._inner);
  }
  rotateShapes(angle: number): void {
    this._inner.rotateShapes(angle);
  }
  scaleShapes(scaleX: number, scaleY: number): void {
    this._inner.scaleShapes(scaleX, scaleY);
  }
  align(): void {
    this._inner.align();
  }

  rotate(centre: Vec2, angle: number): void {
    this._inner.rotate(centre._inner, angle);
  }

  setShapeMaterials(material: Material): void {
    this._inner.setShapeMaterials(material._inner);
  }
  setShapeFilters(filter: InteractionFilter): void {
    this._inner.setShapeFilters(filter._inner);
  }
  setShapeFluidProperties(fluidProperties: FluidProperties): void {
    this._inner.setShapeFluidProperties(fluidProperties._inner);
  }

  contains(point: Vec2): boolean {
    return this._inner.contains(point._inner);
  }
  crushFactor(): number {
    return this._inner.crushFactor();
  }

  copy(): Body {
    return Body._wrap(this._inner.copy());
  }
  toString(): string {
    return this._inner.toString();
  }
}
