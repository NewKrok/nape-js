import { getOrCreate } from "../core/cache";
import { Body } from "../phys/Body";
import { Space } from "../space/Space";
import { Compound } from "../phys/Compound";
import { MatMN } from "../geom/MatMN";
import { Vec3 } from "../geom/Vec3";
import { ZPP_Constraint } from "../native/constraint/ZPP_Constraint";


/**
 * Base class for all constraints / joints.
 *
 * Fully modernized — uses ZPP_Constraint directly (extracted to TypeScript).
 * Not instantiated directly; only via joint subclasses.
 */
export class Constraint {
  static __name__ = ["nape", "constraint", "Constraint"];
  static zpp_internalAlloc = false;

  /** Direct access to the extracted internal ZPP_Constraint. */
  zpp_inner!: ZPP_Constraint;

  /**
   * Compiled joint reference for joint-specific methods (body1/body2/anchors etc.).
   * Joint subclasses set this to the compiled joint instance until those joints
   * are fully modernized. Also serves as backward compat for compiled code.
   * @internal
   */
  _inner: any;

  debugDraw: boolean = true;

  /** @internal */
  protected constructor() {
    this._inner = this;
  }

  /** @internal */
  static _wrap(inner: any): Constraint {
    if (inner == null) return null!;
    if (inner instanceof Constraint) return inner;
    // Compiled object whose ZPP outer already points to a TS wrapper
    if (inner.zpp_inner?.outer instanceof Constraint) {
      return inner.zpp_inner.outer;
    }
    // Fallback: create a base Constraint wrapper (e.g. for copy() results)
    return getOrCreate(inner, (raw: any) => {
      const c = Object.create(Constraint.prototype) as Constraint;
      c.zpp_inner = raw.zpp_inner ?? raw;
      c._inner = raw;
      c.zpp_inner.outer = c;
      c.debugDraw = raw.debugDraw ?? true;
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties common to all constraints — direct ZPP_Constraint access
  // ---------------------------------------------------------------------------

  get space(): Space | null {
    if (this.zpp_inner.space == null) return null;
    return this.zpp_inner.space.outer;
  }
  set space(value: Space | null) {
    if (this.zpp_inner.compound != null) {
      throw new Error(
        "Error: Cannot set the space of a Constraint belonging to" +
          " a Compound, only the root Compound space can be set",
      );
    }
    const currentSpace = this.zpp_inner.space == null ? null : this.zpp_inner.space.outer;
    if (currentSpace != value) {
      if (this.zpp_inner.component != null) {
        this.zpp_inner.component.woken = false;
      }
      this.zpp_inner.clearcache();
      if (this.zpp_inner.space != null) {
        this.zpp_inner.space.wrap_constraints.remove(this);
      }
      if (value != null) {
        // Space may be a TS thin wrapper (_inner.zpp_inner) or compiled (zpp_inner)
        const spaceZpp = (value as any)._inner?.zpp_inner ?? (value as any).zpp_inner;
        const _this = spaceZpp.wrap_constraints;
        if (_this.zpp_inner.reverse_flag) {
          _this.push(this);
        } else {
          _this.unshift(this);
        }
      } else {
        this.zpp_inner.space = null;
      }
    }
  }

  get compound(): Compound | null {
    if (this.zpp_inner.compound == null) return null;
    return this.zpp_inner.compound.outer;
  }
  set compound(value: Compound | null) {
    const current = this.zpp_inner.compound == null ? null : this.zpp_inner.compound.outer;
    if (current != value) {
      if (current != null) {
        current.zpp_inner.wrap_constraints.remove(this);
      }
      if (value != null) {
        const valZpp = value.zpp_inner;
        const _this = valZpp.wrap_constraints;
        if (_this.zpp_inner.reverse_flag) {
          _this.push(this);
        } else {
          _this.unshift(this);
        }
      }
    }
  }

  get active(): boolean {
    return this.zpp_inner.active;
  }
  set active(value: boolean) {
    if (this.zpp_inner.active != value) {
      if (this.zpp_inner.component != null) {
        this.zpp_inner.component.woken = false;
      }
      this.zpp_inner.clearcache();
      if (value) {
        this.zpp_inner.active = value;
        this.zpp_inner.activate();
        if (this.zpp_inner.space != null) {
          if (this.zpp_inner.component != null) {
            this.zpp_inner.component.sleeping = true;
          }
          this.zpp_inner.space.wake_constraint(this.zpp_inner, true);
        }
      } else {
        if (this.zpp_inner.space != null) {
          this.zpp_inner.wake();
          this.zpp_inner.space.live_constraints.remove(this.zpp_inner);
        }
        this.zpp_inner.active = value;
        this.zpp_inner.deactivate();
      }
    }
  }

  get ignore(): boolean {
    return this.zpp_inner.ignore;
  }
  set ignore(value: boolean) {
    if (this.zpp_inner.ignore != value) {
      this.zpp_inner.ignore = value;
      this.zpp_inner.wake();
    }
  }

  get stiff(): boolean {
    return this.zpp_inner.stiff;
  }
  set stiff(value: boolean) {
    if (this.zpp_inner.stiff != value) {
      this.zpp_inner.stiff = value;
      this.zpp_inner.wake();
    }
  }

  get frequency(): number {
    return this.zpp_inner.frequency;
  }
  set frequency(value: number) {
    if (value !== value) {
      throw new Error("Error: Constraint::Frequency cannot be NaN");
    }
    if (value <= 0) {
      throw new Error("Error: Constraint::Frequency must be >0");
    }
    if (this.zpp_inner.frequency != value) {
      this.zpp_inner.frequency = value;
      if (!this.zpp_inner.stiff) {
        this.zpp_inner.wake();
      }
    }
  }

  get damping(): number {
    return this.zpp_inner.damping;
  }
  set damping(value: number) {
    if (value !== value) {
      throw new Error("Error: Constraint::Damping cannot be Nan");
    }
    if (value < 0) {
      throw new Error("Error: Constraint::Damping must be >=0");
    }
    if (this.zpp_inner.damping != value) {
      this.zpp_inner.damping = value;
      if (!this.zpp_inner.stiff) {
        this.zpp_inner.wake();
      }
    }
  }

  get maxForce(): number {
    return this.zpp_inner.maxForce;
  }
  set maxForce(value: number) {
    if (value !== value) {
      throw new Error("Error: Constraint::maxForce cannot be NaN");
    }
    if (value < 0) {
      throw new Error("Error: Constraint::maxForce must be >=0");
    }
    if (this.zpp_inner.maxForce != value) {
      this.zpp_inner.maxForce = value;
      this.zpp_inner.wake();
    }
  }

  get maxError(): number {
    return this.zpp_inner.maxError;
  }
  set maxError(value: number) {
    if (value !== value) {
      throw new Error("Error: Constraint::maxError cannot be NaN");
    }
    if (value < 0) {
      throw new Error("Error: Constraint::maxError must be >=0");
    }
    if (this.zpp_inner.maxError != value) {
      this.zpp_inner.maxError = value;
      this.zpp_inner.wake();
    }
  }

  get breakUnderForce(): boolean {
    return this.zpp_inner.breakUnderForce;
  }
  set breakUnderForce(value: boolean) {
    if (this.zpp_inner.breakUnderForce != value) {
      this.zpp_inner.breakUnderForce = value;
      this.zpp_inner.wake();
    }
  }

  get breakUnderError(): boolean {
    return this.zpp_inner.breakUnderError;
  }
  set breakUnderError(value: boolean) {
    if (this.zpp_inner.breakUnderError != value) {
      this.zpp_inner.breakUnderError = value;
      this.zpp_inner.wake();
    }
  }

  get removeOnBreak(): boolean {
    return this.zpp_inner.removeOnBreak;
  }
  set removeOnBreak(value: boolean) {
    this.zpp_inner.removeOnBreak = value;
  }

  get isSleeping(): boolean {
    if (this.zpp_inner.space == null || !this.zpp_inner.active) {
      throw new Error(
        "Error: isSleeping only makes sense if constraint is" + " active and inside a space",
      );
    }
    return this.zpp_inner.component.sleeping;
  }

  get userData(): Record<string, unknown> {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  }

  get cbTypes(): object {
    if (this.zpp_inner.wrap_cbTypes == null) {
      this.zpp_inner.setupcbTypes();
    }
    return this.zpp_inner.wrap_cbTypes;
  }

  // ---------------------------------------------------------------------------
  // Methods — base implementations (overridden by joint subclasses)
  // ---------------------------------------------------------------------------

  impulse(): MatMN | null {
    return null;
  }

  bodyImpulse(_body: Body): Vec3 | null {
    return null;
  }

  visitBodies(_fn: (body: Body) => void): void {}

  copy(): Constraint {
    return Constraint._wrap(this.zpp_inner.copy());
  }

  toString(): string {
    return "{Constraint}";
  }

}

