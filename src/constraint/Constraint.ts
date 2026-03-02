import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Body } from "../phys/Body";
import { Space } from "../space/Space";
import { ZPP_Constraint } from "../native/constraint/ZPP_Constraint";

type Any = any;

/**
 * Base class for all constraints / joints.
 *
 * Fully modernized — uses ZPP_Constraint directly (extracted to TypeScript).
 * Not instantiated directly; only via joint subclasses.
 */
export class Constraint {
  static __name__ = ["nape", "constraint", "Constraint"];

  /** Direct access to the extracted internal ZPP_Constraint. */
  zpp_inner!: ZPP_Constraint;

  /**
   * Compiled joint reference for joint-specific methods (body1/body2/anchors etc.).
   * Joint subclasses set this to the compiled joint instance until those joints
   * are fully modernized. Also serves as backward compat for compiled code.
   * @internal
   */
  _inner: Any;

  debugDraw: boolean = true;

  /** @internal */
  protected constructor() {
    this._inner = this;
  }

  /** @internal */
  static _wrap(inner: Any): Constraint {
    if (inner == null) return null!;
    if (inner instanceof Constraint) return inner;
    // Compiled object whose ZPP outer already points to a TS wrapper
    if (inner.zpp_inner?.outer instanceof Constraint) {
      return inner.zpp_inner.outer;
    }
    // Fallback: create a base Constraint wrapper (e.g. for copy() results)
    return getOrCreate(inner, (raw: Any) => {
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
    const currentSpace =
      this.zpp_inner.space == null ? null : this.zpp_inner.space.outer;
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
        const spaceZpp =
          (value as Any)._inner?.zpp_inner ?? (value as Any).zpp_inner;
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

  get compound(): Any {
    if (this.zpp_inner.compound == null) return null;
    return this.zpp_inner.compound.outer;
  }
  set compound(value: Any) {
    const current =
      this.zpp_inner.compound == null
        ? null
        : this.zpp_inner.compound.outer;
    if (current != value) {
      if (current != null) {
        // Access ZPP_Compound's wrap_constraints directly
        const curZpp =
          current.zpp_inner ?? current._inner?.zpp_inner;
        curZpp.wrap_constraints.remove(this);
      }
      if (value != null) {
        const valZpp =
          value.zpp_inner ?? value._inner?.zpp_inner;
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
        "Error: isSleeping only makes sense if constraint is" +
          " active and inside a space",
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

  get cbTypes(): Any {
    if (this.zpp_inner.wrap_cbTypes == null) {
      this.zpp_inner.setupcbTypes();
    }
    return this.zpp_inner.wrap_cbTypes;
  }

  // ---------------------------------------------------------------------------
  // Methods — base implementations (overridden by joint subclasses)
  // ---------------------------------------------------------------------------

  impulse(): Any {
    return null;
  }

  bodyImpulse(_body: Body): Any {
    return null;
  }

  visitBodies(_fn: (body: Body) => void): void {}

  copy(): Constraint {
    return Constraint._wrap(this.zpp_inner.copy());
  }

  toString(): string {
    return "{Constraint}";
  }

  // ---------------------------------------------------------------------------
  // Backward-compat get_*/set_* methods for compiled code
  // ---------------------------------------------------------------------------

  /** @internal */ get_userData(): Any {
    return this.userData;
  }
  /** @internal */ get_compound(): Any {
    return this.compound;
  }
  /** @internal */ set_compound(v: Any): Any {
    this.compound = v;
    return this.compound;
  }
  /** @internal */ get_space(): Any {
    return this.space;
  }
  /** @internal */ set_space(v: Any): Any {
    this.space = v;
    return this.space;
  }
  /** @internal */ get_isSleeping(): boolean {
    return this.isSleeping;
  }
  /** @internal */ get_active(): boolean {
    return this.active;
  }
  /** @internal */ set_active(v: boolean): boolean {
    this.active = v;
    return this.zpp_inner.active;
  }
  /** @internal */ get_ignore(): boolean {
    return this.ignore;
  }
  /** @internal */ set_ignore(v: boolean): boolean {
    this.ignore = v;
    return this.zpp_inner.ignore;
  }
  /** @internal */ get_stiff(): boolean {
    return this.stiff;
  }
  /** @internal */ set_stiff(v: boolean): boolean {
    this.stiff = v;
    return this.zpp_inner.stiff;
  }
  /** @internal */ get_frequency(): number {
    return this.frequency;
  }
  /** @internal */ set_frequency(v: number): number {
    this.frequency = v;
    return this.zpp_inner.frequency;
  }
  /** @internal */ get_damping(): number {
    return this.damping;
  }
  /** @internal */ set_damping(v: number): number {
    this.damping = v;
    return this.zpp_inner.damping;
  }
  /** @internal */ get_maxForce(): number {
    return this.maxForce;
  }
  /** @internal */ set_maxForce(v: number): number {
    this.maxForce = v;
    return this.zpp_inner.maxForce;
  }
  /** @internal */ get_maxError(): number {
    return this.maxError;
  }
  /** @internal */ set_maxError(v: number): number {
    this.maxError = v;
    return this.zpp_inner.maxError;
  }
  /** @internal */ get_breakUnderForce(): boolean {
    return this.breakUnderForce;
  }
  /** @internal */ set_breakUnderForce(v: boolean): boolean {
    this.breakUnderForce = v;
    return this.zpp_inner.breakUnderForce;
  }
  /** @internal */ get_breakUnderError(): boolean {
    return this.breakUnderError;
  }
  /** @internal */ set_breakUnderError(v: boolean): boolean {
    this.breakUnderError = v;
    return this.zpp_inner.breakUnderError;
  }
  /** @internal */ get_removeOnBreak(): boolean {
    return this.removeOnBreak;
  }
  /** @internal */ set_removeOnBreak(v: boolean): boolean {
    this.removeOnBreak = v;
    return this.zpp_inner.removeOnBreak;
  }
  /** @internal */ get_cbTypes(): Any {
    return this.cbTypes;
  }
}

// ---------------------------------------------------------------------------
// Self-register: copy compiled Constraint prototype methods for backward compat
// ---------------------------------------------------------------------------
const nape = getNape();
const compiledConstraintProto = nape.constraint.Constraint.prototype;

// Copy compiled Constraint prototype methods onto TS Constraint (only those
// not already defined) for backward compat with compiled joint code.
for (const k in compiledConstraintProto) {
  if (!Object.prototype.hasOwnProperty.call(Constraint.prototype, k)) {
    (Constraint.prototype as Any)[k] = compiledConstraintProto[k];
  }
}

(Constraint.prototype as Any).__class__ = Constraint;
