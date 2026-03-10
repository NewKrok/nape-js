import { getOrCreate } from "../core/cache";
import { Body } from "../phys/Body";
import { Space } from "../space/Space";
import { Compound } from "../phys/Compound";
import { MatMN } from "../geom/MatMN";
import { Vec3 } from "../geom/Vec3";
import { ZPP_Constraint } from "../native/constraint/ZPP_Constraint";

/**
 * Base class for all physics constraints (joints).
 *
 * Constraints restrict the relative motion of two bodies. This class provides
 * properties common to all joint types: `active`, `stiff`, `frequency`,
 * `damping`, `maxForce`, `maxError`, `breakUnderForce`, `breakUnderError`,
 * `removeOnBreak`, `isSleeping`, `space`, `compound`, `cbTypes`, and `userData`.
 *
 * Cannot be instantiated directly — use one of the concrete joint subclasses:
 * {@link AngleJoint}, {@link DistanceJoint}, {@link LineJoint}, {@link MotorJoint},
 * {@link PivotJoint}, {@link PulleyJoint}, {@link WeldJoint}, or {@link UserConstraint}.
 *
 * **Soft vs. stiff constraints:**
 * - `stiff = true` (default): the constraint is enforced rigidly.
 * - `stiff = false`: uses a spring model with `frequency` (Hz) and `damping` (ratio).
 *
 * Fully modernized — uses ZPP_Constraint directly (extracted to TypeScript).
 */
export class Constraint {
  static __name__ = ["nape", "constraint", "Constraint"];
  /** @internal */
  static zpp_internalAlloc = false;

  /** @internal */
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

  /**
   * The space this constraint belongs to, or `null` if not in a space.
   *
   * Assign to add/remove the constraint from a space:
   * ```ts
   * joint.space = mySpace;  // adds to space
   * joint.space = null;     // removes from space
   * ```
   * Cannot be set if the constraint belongs to a {@link Compound}.
   */
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

  /**
   * The compound this constraint belongs to, or `null`.
   * When set, the constraint's `space` is managed by the compound.
   */
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

  /**
   * Whether the constraint is currently active (enforced by the solver).
   *
   * Deactivating a constraint suspends it without removing it from the space.
   * @defaultValue `true`
   */
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

  /**
   * When `true` the constraint is completely ignored by the engine — bodies are
   * not woken, no impulse is applied, and no callbacks fire.
   * @defaultValue `false`
   */
  get ignore(): boolean {
    return this.zpp_inner.ignore;
  }
  set ignore(value: boolean) {
    if (this.zpp_inner.ignore != value) {
      this.zpp_inner.ignore = value;
      this.zpp_inner.wake();
    }
  }

  /**
   * When `true` (default) the constraint is stiff/rigid.
   * When `false` the constraint uses a soft spring model driven by
   * `frequency` and `damping`.
   * @defaultValue `true`
   */
  get stiff(): boolean {
    return this.zpp_inner.stiff;
  }
  set stiff(value: boolean) {
    if (this.zpp_inner.stiff != value) {
      this.zpp_inner.stiff = value;
      this.zpp_inner.wake();
    }
  }

  /**
   * Spring frequency in Hz for soft constraints (`stiff = false`).
   *
   * Higher values make the spring stiffer; lower values make it bouncier.
   * Must be `> 0`. Ignored when `stiff` is `true`.
   * @defaultValue `10`
   */
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

  /**
   * Damping ratio for soft constraints (`stiff = false`).
   *
   * `0` = undamped (oscillates freely), `1` = critically damped.
   * Values `> 1` are overdamped. Must be `>= 0`. Ignored when `stiff` is `true`.
   * @defaultValue `1`
   */
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

  /**
   * Maximum force (in Newtons) the constraint may apply per step.
   *
   * When the required force exceeds this value the constraint becomes slack.
   * If `breakUnderForce` is `true` the constraint breaks instead.
   * Must be `>= 0`. `Infinity` disables the limit.
   * @defaultValue `Infinity`
   */
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

  /**
   * Maximum positional error (in pixels) allowed before breaking.
   *
   * Only meaningful when `breakUnderError` is `true`.
   * Must be `>= 0`. `Infinity` disables the limit.
   * @defaultValue `Infinity`
   */
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

  /**
   * When `true`, the constraint breaks (fires a `BREAK` event) if the applied
   * force exceeds `maxForce` in a single step.
   * @defaultValue `false`
   */
  get breakUnderForce(): boolean {
    return this.zpp_inner.breakUnderForce;
  }
  set breakUnderForce(value: boolean) {
    if (this.zpp_inner.breakUnderForce != value) {
      this.zpp_inner.breakUnderForce = value;
      this.zpp_inner.wake();
    }
  }

  /**
   * When `true`, the constraint breaks if the positional error exceeds `maxError`.
   * @defaultValue `false`
   */
  get breakUnderError(): boolean {
    return this.zpp_inner.breakUnderError;
  }
  set breakUnderError(value: boolean) {
    if (this.zpp_inner.breakUnderError != value) {
      this.zpp_inner.breakUnderError = value;
      this.zpp_inner.wake();
    }
  }

  /**
   * When `true` (default), the constraint is automatically removed from its space
   * when it breaks. Set to `false` to keep it in the space after breaking.
   * @defaultValue `true`
   */
  get removeOnBreak(): boolean {
    return this.zpp_inner.removeOnBreak;
  }
  set removeOnBreak(value: boolean) {
    this.zpp_inner.removeOnBreak = value;
  }

  /**
   * Whether the constraint's simulation component is currently sleeping.
   *
   * Only valid when the constraint is active and in a space — throws otherwise.
   */
  get isSleeping(): boolean {
    if (this.zpp_inner.space == null || !this.zpp_inner.active) {
      throw new Error(
        "Error: isSleeping only makes sense if constraint is" + " active and inside a space",
      );
    }
    return this.zpp_inner.component.sleeping;
  }

  /**
   * Arbitrary user data attached to this constraint.
   * Lazily initialized to `{}` on first access.
   */
  get userData(): Record<string, unknown> {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  }

  /**
   * The set of {@link CbType}s assigned to this constraint.
   * Used to filter which listeners respond to this constraint's events.
   */
  get cbTypes(): object {
    if (this.zpp_inner.wrap_cbTypes == null) {
      this.zpp_inner.setupcbTypes();
    }
    return this.zpp_inner.wrap_cbTypes;
  }

  // ---------------------------------------------------------------------------
  // Methods — base implementations (overridden by joint subclasses)
  // ---------------------------------------------------------------------------

  /**
   * The impulse applied by this constraint in the last simulation step.
   *
   * The shape of the returned {@link MatMN} depends on the constraint's degrees of
   * freedom (e.g., 1×1 for AngleJoint/MotorJoint, 2×1 for PivotJoint/LineJoint,
   * 3×1 for WeldJoint).
   */
  impulse(): MatMN | null {
    return null;
  }

  /**
   * The impulse applied to `body` by this constraint in the last simulation step,
   * expressed as a {@link Vec3} `(fx, fy, torque)`.
   *
   * @param body - Must be one of the bodies linked to this constraint.
   */
  bodyImpulse(_body: Body): Vec3 | null {
    return null;
  }

  /**
   * Invokes `fn` once for each distinct body linked to this constraint.
   *
   * @param fn - Function to call for each body.
   */
  visitBodies(_fn: (body: Body) => void): void {}

  /**
   * Creates and returns a copy of this constraint with the same parameters.
   * The copy is not automatically added to a space.
   */
  copy(): Constraint {
    return Constraint._wrap(this.zpp_inner.copy());
  }

  toString(): string {
    return "{Constraint}";
  }
}
