import { getOrCreate } from "../core/cache";
import { Vec2 } from "../geom/Vec2";
import { Vec3 } from "../geom/Vec3";
import { MatMN } from "../geom/MatMN";
import { Body } from "../phys/Body";
import { Constraint } from "./Constraint";
import { ZPP_UserConstraint } from "../native/constraint/ZPP_UserConstraint";

/**
 * Base class for user-defined N-DOF constraints.
 *
 * Fully modernized — uses ZPP_UserConstraint directly (extracted to TypeScript).
 * Subclass and override the abstract callback methods to define custom constraints.
 */
export abstract class UserConstraint extends Constraint {
  declare zpp_inner: ZPP_UserConstraint;

  constructor(dimensions: number, velocityOnly: boolean = false) {
    super();

    if (dimensions < 1) {
      throw new Error("Error: Constraint dimension must be at least 1");
    }

    const zpp = new ZPP_UserConstraint(dimensions, velocityOnly);
    this.zpp_inner = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;
  }

  /** @internal */
  static _wrap(inner: any): UserConstraint {
    if (inner == null) return null!;
    if (inner instanceof UserConstraint) return inner;
    if (inner.zpp_inner?.outer instanceof UserConstraint) return inner.zpp_inner.outer;

    return getOrCreate(inner, (raw: any) => {
      const c = Object.create(UserConstraint.prototype) as UserConstraint;
      c.zpp_inner = raw.zpp_inner ?? raw;
      c.zpp_inner.outer = c;
      c.zpp_inner.outer_zn = c;
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // Helper: create a bound Vec2 that triggers invalidation on change
  // ---------------------------------------------------------------------------

  __bindVec2(): Vec2 {
    const ret = new Vec2();
    (ret as any).zpp_inner._inuse = true;
    (ret as any).zpp_inner._invalidate = this.zpp_inner.bindVec2_invalidate.bind(this.zpp_inner);
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Abstract callbacks — subclasses MUST override these (except optional ones)
  // ---------------------------------------------------------------------------

  /** Create a copy of this constraint. Must be overridden. */
  __copy(): UserConstraint {
    throw new Error("Error: UserConstraint::__copy must be overriden");
  }

  /** Called when the constraint breaks. Optional override. */
  __broken(): void {}

  /** Called to validate the constraint. Optional override. */
  __validate(): void {}

  /** Draw debug visualization. Optional override. */
  __draw(_debug: any): void {}

  /** Prepare the constraint for solving. Optional override. */
  __prepare(): void {}

  /** Compute positional error. Must be overridden for non-velocity-only constraints. */
  __position(_err: number[]): void {
    throw new Error("Error: UserConstraint::__position must be overriden");
  }

  /** Compute velocity error. Must be overridden. */
  __velocity(_err: number[]): void {
    throw new Error("Error: Userconstraint::__velocity must be overriden");
  }

  /** Compute effective mass matrix (upper triangle). Must be overridden. */
  __eff_mass(_eff: number[]): void {
    throw new Error("Error: UserConstraint::__eff_mass must be overriden");
  }

  /** Clamp accumulated impulse. Optional override. */
  __clamp(_jAcc: number[]): void {}

  /** Apply impulse to a body. Must be overridden. */
  __impulse(_imp: number[], _body: Body, _out: any): void {
    throw new Error("Error: UserConstraint::__impulse must be overriden");
  }

  // ---------------------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------------------

  override impulse(): MatMN {
    const dim = this.zpp_inner.dim;
    const ret = new MatMN(dim, 1);
    for (let i = 0; i < dim; i++) {
      if (i < 0 || i >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
        throw new Error("Error: MatMN indices out of range");
      }
      ret.zpp_inner.x[i * ret.zpp_inner.n] = this.zpp_inner.jAcc[i];
    }
    return ret;
  }

  override bodyImpulse(body: Body): Vec3 {
    if (body == null) {
      throw new Error("Error: Cannot evaluate impulse on null body");
    }
    let found = false;
    for (const b of this.zpp_inner.bodies) {
      if (b.body == (body as any).zpp_inner) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error("Error: Body is not linked to this constraint");
    }
    if (!this.zpp_inner.active) {
      return Vec3.get();
    } else {
      return this.zpp_inner.bodyImpulse((body as any).zpp_inner);
    }
  }

  override visitBodies(lambda: (body: Body) => void): void {
    const nbodies = this.zpp_inner.bodies.length;
    let i = 0;
    while (i < nbodies) {
      const b = this.zpp_inner.bodies[i];
      if (b.body != null) {
        // Only visit body if it doesn't appear later in the list (dedup)
        let found = false;
        for (let j = i + 1; j < nbodies; j++) {
          const c = this.zpp_inner.bodies[j];
          if (c.body == b.body) {
            found = true;
            break;
          }
        }
        if (!found) {
          lambda(b.body.outer);
        }
      }
      ++i;
    }
  }

  // ---------------------------------------------------------------------------
  // Body registration — used by subclasses to register/unregister bodies
  // ---------------------------------------------------------------------------

  __invalidate(): void {
    this.zpp_inner.immutable_midstep("UserConstraint::invalidate()");
    if (
      this.zpp_inner.active &&
      (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) != null
    ) {
      this.zpp_inner.wake();
    }
  }

  __registerBody(oldBody: Body | null, newBody: Body | null): Body | null {
    this.zpp_inner.immutable_midstep("UserConstraint::registerBody(..)");
    if (oldBody != newBody) {
      if (oldBody != null) {
        if (!this.zpp_inner.remBody((oldBody as any).zpp_inner)) {
          throw new Error("Error: oldBody is not registered to the cosntraint");
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) != null
        ) {
          (oldBody as any).zpp_inner.wake();
        }
      }
      if (newBody != null) {
        this.zpp_inner.addBody((newBody as any).zpp_inner);
      }
      this.zpp_inner.wake();
      if (newBody != null) {
        (newBody as any).zpp_inner.wake();
      }
    }
    return newBody;
  }

  // ---------------------------------------------------------------------------
  // Backward-compat alias for zpp_inner
  // ---------------------------------------------------------------------------

  /** @internal */
  get zpp_inner_zn(): ZPP_UserConstraint {
    return this.zpp_inner;
  }
  set zpp_inner_zn(v: ZPP_UserConstraint) {
    this.zpp_inner = v;
  }
}
