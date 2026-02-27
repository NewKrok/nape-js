import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import type { NapeInner, Writable } from "../geom/Vec2";

/**
 * Physical material properties applied to shapes.
 */
export class Material {
  /** @internal */
  readonly _inner: NapeInner;

  constructor(
    elasticity: number = 0.0,
    dynamicFriction: number = 1.0,
    staticFriction: number = 2.0,
    density: number = 1.0,
    rollingFriction: number = 0.001,
  ) {
    this._inner = new (getNape()).phys.Material(
      elasticity, dynamicFriction, staticFriction, density, rollingFriction,
    );
  }

  /** @internal */
  static _wrap(inner: NapeInner): Material {
    return getOrCreate(inner, (raw) => {
      const m = Object.create(Material.prototype) as Material;
      (m as Writable<Material>)._inner = raw;
      return m;
    });
  }

  get elasticity(): number { return this._inner.get_elasticity(); }
  set elasticity(value: number) { this._inner.set_elasticity(value); }

  get dynamicFriction(): number { return this._inner.get_dynamicFriction(); }
  set dynamicFriction(value: number) { this._inner.set_dynamicFriction(value); }

  get staticFriction(): number { return this._inner.get_staticFriction(); }
  set staticFriction(value: number) { this._inner.set_staticFriction(value); }

  get density(): number { return this._inner.get_density(); }
  set density(value: number) { this._inner.set_density(value); }

  get rollingFriction(): number { return this._inner.get_rollingFriction(); }
  set rollingFriction(value: number) { this._inner.set_rollingFriction(value); }

  get userData(): Record<string, unknown> { return this._inner.get_userData(); }

  copy(): Material { return Material._wrap(this._inner.copy()); }
  toString(): string { return this._inner.toString(); }
}
