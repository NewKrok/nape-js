import { getOrCreate } from "../core/cache";
import { Body } from "../phys/Body";
import { Space } from "../space/Space";
import type { NapeInner, Writable } from "../geom/Vec2";

/**
 * Base class for all constraints / joints.
 * Not instantiated directly.
 */
export class Constraint {
  /** @internal */
  readonly _inner: NapeInner;

  /** @internal */
  protected constructor() {
    (this as Writable<Constraint>)._inner = undefined!;
  }

  /** @internal */
  static _wrap(inner: NapeInner): Constraint {
    return getOrCreate(inner, (raw) => {
      const c = Object.create(Constraint.prototype) as Constraint;
      (c as Writable<Constraint>)._inner = raw;
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties common to all constraints
  // ---------------------------------------------------------------------------

  get space(): Space {
    return Space._wrap(this._inner.get_space());
  }
  set space(value: Space | null) {
    this._inner.set_space(value?._inner ?? null);
  }

  get compound(): NapeInner { return this._inner.get_compound(); }
  set compound(value: { _inner: NapeInner } | null) {
    this._inner.set_compound(value?._inner ?? null);
  }

  get active(): boolean { return this._inner.get_active(); }
  set active(value: boolean) { this._inner.set_active(value); }

  get ignore(): boolean { return this._inner.get_ignore(); }
  set ignore(value: boolean) { this._inner.set_ignore(value); }

  get stiff(): boolean { return this._inner.get_stiff(); }
  set stiff(value: boolean) { this._inner.set_stiff(value); }

  get frequency(): number { return this._inner.get_frequency(); }
  set frequency(value: number) { this._inner.set_frequency(value); }

  get damping(): number { return this._inner.get_damping(); }
  set damping(value: number) { this._inner.set_damping(value); }

  get maxForce(): number { return this._inner.get_maxForce(); }
  set maxForce(value: number) { this._inner.set_maxForce(value); }

  get maxError(): number { return this._inner.get_maxError(); }
  set maxError(value: number) { this._inner.set_maxError(value); }

  get breakUnderForce(): boolean { return this._inner.get_breakUnderForce(); }
  set breakUnderForce(value: boolean) { this._inner.set_breakUnderForce(value); }

  get breakUnderError(): boolean { return this._inner.get_breakUnderError(); }
  set breakUnderError(value: boolean) { this._inner.set_breakUnderError(value); }

  get removeOnBreak(): boolean { return this._inner.get_removeOnBreak(); }
  set removeOnBreak(value: boolean) { this._inner.set_removeOnBreak(value); }

  get isSleeping(): boolean { return this._inner.get_isSleeping(); }
  get userData(): Record<string, unknown> { return this._inner.get_userData(); }

  impulse(): NapeInner { return this._inner.impulse(); }
  bodyImpulse(body: Body): NapeInner { return this._inner.bodyImpulse(body._inner); }

  visitBodies(fn: (body: Body) => void): void {
    this._inner.visitBodies((raw: NapeInner) => fn(Body._wrap(raw)));
  }

  copy(): Constraint { return Constraint._wrap(this._inner.copy()); }
  toString(): string { return this._inner.toString(); }
}
