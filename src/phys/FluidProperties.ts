import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";

/**
 * Fluid properties for shapes that act as fluid regions.
 */
export class FluidProperties {
  /** @internal */
  readonly _inner: NapeInner;

  constructor(density: number = 1.0, viscosity: number = 1.0) {
    this._inner = new (getNape().phys.FluidProperties)(density, viscosity);
  }

  /** @internal */
  static _wrap(inner: NapeInner): FluidProperties {
    return getOrCreate(inner, (raw) => {
      const f = Object.create(FluidProperties.prototype) as FluidProperties;
      (f as Writable<FluidProperties>)._inner = raw;
      return f;
    });
  }

  get density(): number {
    return this._inner.get_density();
  }
  set density(value: number) {
    this._inner.set_density(value);
  }

  get viscosity(): number {
    return this._inner.get_viscosity();
  }
  set viscosity(value: number) {
    this._inner.set_viscosity(value);
  }

  get gravity(): Vec2 {
    return Vec2._wrap(this._inner.get_gravity());
  }
  set gravity(value: Vec2) {
    this._inner.set_gravity(value._inner);
  }

  get userData(): Record<string, unknown> {
    return this._inner.get_userData();
  }

  copy(): FluidProperties {
    return FluidProperties._wrap(this._inner.copy());
  }
  toString(): string {
    return this._inner.toString();
  }
}
