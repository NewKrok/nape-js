import { getNape } from "../core/engine";

/**
 * Bit-mask based interaction filter for controlling which shapes
 * collide, sense, or interact as fluids.
 */
export class InteractionFilter {
  /** @internal */
  _inner: any;

  constructor(
    collisionGroup: number = 1,
    collisionMask: number = -1,
    sensorGroup: number = 1,
    sensorMask: number = -1,
    fluidGroup: number = 1,
    fluidMask: number = -1,
  ) {
    const nape = getNape();
    this._inner = new nape.dynamics.InteractionFilter(
      collisionGroup,
      collisionMask,
      sensorGroup,
      sensorMask,
      fluidGroup,
      fluidMask,
    );
  }

  /** @internal */
  static _wrap(inner: any): InteractionFilter {
    if (!inner) return null as unknown as InteractionFilter;
    const f = Object.create(InteractionFilter.prototype) as InteractionFilter;
    f._inner = inner;
    return f;
  }

  get collisionGroup(): number {
    return this._inner.get_collisionGroup();
  }
  set collisionGroup(value: number) {
    this._inner.set_collisionGroup(value);
  }

  get collisionMask(): number {
    return this._inner.get_collisionMask();
  }
  set collisionMask(value: number) {
    this._inner.set_collisionMask(value);
  }

  get sensorGroup(): number {
    return this._inner.get_sensorGroup();
  }
  set sensorGroup(value: number) {
    this._inner.set_sensorGroup(value);
  }

  get sensorMask(): number {
    return this._inner.get_sensorMask();
  }
  set sensorMask(value: number) {
    this._inner.set_sensorMask(value);
  }

  get fluidGroup(): number {
    return this._inner.get_fluidGroup();
  }
  set fluidGroup(value: number) {
    this._inner.set_fluidGroup(value);
  }

  get fluidMask(): number {
    return this._inner.get_fluidMask();
  }
  set fluidMask(value: number) {
    this._inner.set_fluidMask(value);
  }

  get userData(): any {
    return this._inner.get_userData();
  }

  /** Check if two filters should produce a collision interaction. */
  shouldCollide(other: InteractionFilter): boolean {
    return this._inner.shouldCollide(other._inner);
  }

  /** Check if two filters should produce a sensor interaction. */
  shouldSense(other: InteractionFilter): boolean {
    return this._inner.shouldSense(other._inner);
  }

  /** Check if two filters should produce a fluid interaction. */
  shouldFlow(other: InteractionFilter): boolean {
    return this._inner.shouldFlow(other._inner);
  }

  copy(): InteractionFilter {
    return InteractionFilter._wrap(this._inner.copy());
  }

  toString(): string {
    return this._inner.toString();
  }
}
