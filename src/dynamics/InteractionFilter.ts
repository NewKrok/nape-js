import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import type { NapeInner, Writable } from "../geom/Vec2";

/**
 * Bit-mask based interaction filter for controlling which shapes
 * collide, sense, or interact as fluids.
 */
export class InteractionFilter {
  /** @internal */
  readonly _inner: NapeInner;

  constructor(
    collisionGroup: number = 1,
    collisionMask: number = -1,
    sensorGroup: number = 1,
    sensorMask: number = -1,
    fluidGroup: number = 1,
    fluidMask: number = -1,
  ) {
    this._inner = new (getNape()).dynamics.InteractionFilter(
      collisionGroup, collisionMask, sensorGroup, sensorMask, fluidGroup, fluidMask,
    );
  }

  /** @internal */
  static _wrap(inner: NapeInner): InteractionFilter {
    return getOrCreate(inner, (raw) => {
      const f = Object.create(InteractionFilter.prototype) as InteractionFilter;
      (f as Writable<InteractionFilter>)._inner = raw;
      return f;
    });
  }

  get collisionGroup(): number { return this._inner.get_collisionGroup(); }
  set collisionGroup(value: number) { this._inner.set_collisionGroup(value); }

  get collisionMask(): number { return this._inner.get_collisionMask(); }
  set collisionMask(value: number) { this._inner.set_collisionMask(value); }

  get sensorGroup(): number { return this._inner.get_sensorGroup(); }
  set sensorGroup(value: number) { this._inner.set_sensorGroup(value); }

  get sensorMask(): number { return this._inner.get_sensorMask(); }
  set sensorMask(value: number) { this._inner.set_sensorMask(value); }

  get fluidGroup(): number { return this._inner.get_fluidGroup(); }
  set fluidGroup(value: number) { this._inner.set_fluidGroup(value); }

  get fluidMask(): number { return this._inner.get_fluidMask(); }
  set fluidMask(value: number) { this._inner.set_fluidMask(value); }

  get userData(): Record<string, unknown> { return this._inner.get_userData(); }

  shouldCollide(other: InteractionFilter): boolean { return this._inner.shouldCollide(other._inner); }
  shouldSense(other: InteractionFilter): boolean { return this._inner.shouldSense(other._inner); }
  shouldFlow(other: InteractionFilter): boolean { return this._inner.shouldFlow(other._inner); }

  copy(): InteractionFilter { return InteractionFilter._wrap(this._inner.copy()); }
  toString(): string { return this._inner.toString(); }
}
