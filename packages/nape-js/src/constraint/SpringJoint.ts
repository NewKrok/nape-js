import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, disposeWeakVec2 } from "../geom/Vec2";
import { Body } from "../phys/Body";
import { MatMN } from "../geom/MatMN";
import { Vec3 } from "../geom/Vec3";
import { Constraint } from "./Constraint";
import { IMPULSE_ERROR_NULL_BODY } from "./Constraint";
import { ZPP_SpringJoint } from "../native/constraint/ZPP_SpringJoint";

/** Read validated x from a Vec2 input. */
function _readVec2X(v: Vec2): number {
  if ((v as any).zpp_disp) {
    throw new Error("Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.x;
}

/** Read validated y from a Vec2 input. */
function _readVec2Y(v: Vec2): number {
  if ((v as any).zpp_disp) {
    throw new Error("Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.y;
}

/**
 * A spring/damper constraint between two anchor points on two bodies.
 *
 * Applies a spring force that pulls or pushes the anchors toward a target
 * `restLength`. The spring behavior is controlled by `frequency` (Hz) and
 * `damping` (ratio), inherited from {@link Constraint}.
 *
 * Unlike {@link DistanceJoint}, a SpringJoint:
 * - Is **always soft** — there is no rigid/stiff mode.
 * - Has a single `restLength` instead of a `[jointMin, jointMax]` range.
 * - Applies force in **both directions** (compression and extension).
 * - Never goes slack — the spring always exerts a restorative force.
 *
 * Ideal for: vehicle suspension, soft-body connections, ragdoll hair/cloth,
 * bouncy UI animations, bridge/rope segments, trampolines.
 *
 * @example
 * ```ts
 * const spring = new SpringJoint(
 *   body1, body2,
 *   Vec2.weak(0, 0),   // anchor on body1 (local)
 *   Vec2.weak(0, 0),   // anchor on body2 (local)
 *   100,               // rest length (pixels)
 * );
 * spring.frequency = 5;  // 5 Hz oscillation
 * spring.damping = 0.5;  // underdamped (bouncy)
 * spring.space = space;
 * ```
 */
export class SpringJoint extends Constraint {
  /** @internal */
  declare zpp_inner: ZPP_SpringJoint;

  /**
   * @param body1 - First body, or `null` for a static world anchor.
   * @param body2 - Second body, or `null` for a static world anchor.
   * @param anchor1 - Anchor point in `body1`'s local space (disposed if weak).
   * @param anchor2 - Anchor point in `body2`'s local space (disposed if weak).
   * @param restLength - Equilibrium distance between anchors (must be `>= 0`).
   */
  constructor(
    body1: Body | null,
    body2: Body | null,
    anchor1: Vec2,
    anchor2: Vec2,
    restLength: number,
  ) {
    super();

    const zpp = new ZPP_SpringJoint();
    this.zpp_inner = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;

    // Set bodies
    this._setBody1(body1);
    this._setBody2(body2);

    // Set anchor1
    if ((anchor1 as any)?.zpp_disp) {
      throw new Error("Vec2 has been disposed and cannot be used!");
    }
    if (anchor1 == null) {
      throw new Error("Constraint::anchor1 cannot be null");
    }
    const a1x = _readVec2X(anchor1);
    const a1y = _readVec2Y(anchor1);
    zpp.a1localx = a1x;
    zpp.a1localy = a1y;
    disposeWeakVec2(anchor1);

    // Set anchor2
    if ((anchor2 as any)?.zpp_disp) {
      throw new Error("Vec2 has been disposed and cannot be used!");
    }
    if (anchor2 == null) {
      throw new Error("Constraint::anchor2 cannot be null");
    }
    const a2x = _readVec2X(anchor2);
    const a2y = _readVec2Y(anchor2);
    zpp.a2localx = a2x;
    zpp.a2localy = a2y;
    disposeWeakVec2(anchor2);

    // Set restLength
    this.zpp_inner.immutable_midstep("SpringJoint::restLength");
    if (restLength !== restLength) {
      throw new Error("SpringJoint::restLength cannot be NaN");
    }
    if (restLength < 0) {
      throw new Error("SpringJoint::restLength must be >= 0");
    }
    zpp.restLength = restLength;
  }

  /** @internal */
  static _wrap(inner: any): SpringJoint {
    if (inner == null) return null!;
    if (inner instanceof SpringJoint) return inner;
    if (inner.zpp_inner?.outer instanceof SpringJoint) return inner.zpp_inner.outer;

    if (inner instanceof ZPP_SpringJoint) {
      return getOrCreate(inner, (zpp: ZPP_SpringJoint) => {
        const j = Object.create(SpringJoint.prototype) as SpringJoint;
        j.zpp_inner = zpp;
        zpp.outer = j;
        zpp.outer_zn = j;
        j.debugDraw = true;
        return j;
      });
    }

    return getOrCreate(inner, (raw: any) => {
      const j = Object.create(SpringJoint.prototype) as SpringJoint;
      j.zpp_inner = raw.zpp_inner ?? raw;
      j.zpp_inner.outer = j;
      j.zpp_inner.outer_zn = j;
      return j;
    });
  }

  // ---------------------------------------------------------------------------
  // body1 / body2
  // ---------------------------------------------------------------------------

  /** First body. `null` treats the anchor as a static world point. */
  get body1(): Body {
    if (this.zpp_inner.b1 == null) return null!;
    return Body._wrap(this.zpp_inner.b1);
  }
  set body1(value: Body | null) {
    this._setBody1(value);
  }

  /** @internal */
  private _setBody1(body1: Body | null): void {
    this.zpp_inner.immutable_midstep("Constraint::body1");
    const inbody1 = body1 == null ? null : (body1 as any).zpp_inner;
    if (inbody1 != this.zpp_inner.b1) {
      if (this.zpp_inner.b1 != null) {
        if (this.zpp_inner.space != null && this.zpp_inner.b2 != this.zpp_inner.b1) {
          this.zpp_inner.b1.constraints.remove(this.zpp_inner);
        }
        if (this.zpp_inner.active && this.zpp_inner.space != null) {
          this.zpp_inner.b1.wake();
        }
      }
      this.zpp_inner.b1 = inbody1;
      if (this.zpp_inner.space != null && inbody1 != null && this.zpp_inner.b2 != inbody1) {
        inbody1.constraints.add(this.zpp_inner);
      }
      if (this.zpp_inner.active && this.zpp_inner.space != null) {
        this.zpp_inner.wake();
        if (inbody1 != null) {
          inbody1.wake();
        }
      }
    }
  }

  /** Second body. `null` treats the anchor as a static world point. */
  get body2(): Body {
    if (this.zpp_inner.b2 == null) return null!;
    return Body._wrap(this.zpp_inner.b2);
  }
  set body2(value: Body | null) {
    this._setBody2(value);
  }

  /** @internal */
  private _setBody2(body2: Body | null): void {
    this.zpp_inner.immutable_midstep("Constraint::body2");
    const inbody2 = body2 == null ? null : (body2 as any).zpp_inner;
    if (inbody2 != this.zpp_inner.b2) {
      if (this.zpp_inner.b2 != null) {
        if (this.zpp_inner.space != null && this.zpp_inner.b1 != this.zpp_inner.b2) {
          this.zpp_inner.b2.constraints.remove(this.zpp_inner);
        }
        if (this.zpp_inner.active && this.zpp_inner.space != null) {
          this.zpp_inner.b2.wake();
        }
      }
      this.zpp_inner.b2 = inbody2;
      if (this.zpp_inner.space != null && inbody2 != null && this.zpp_inner.b1 != inbody2) {
        inbody2.constraints.add(this.zpp_inner);
      }
      if (this.zpp_inner.active && this.zpp_inner.space != null) {
        this.zpp_inner.wake();
        if (inbody2 != null) {
          inbody2.wake();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Anchor properties
  // ---------------------------------------------------------------------------

  /** Anchor point on `body1` in local coordinates. */
  get anchor1(): Vec2 {
    if (this.zpp_inner.wrap_a1 == null) {
      this.zpp_inner.setup_a1();
    }
    return this.zpp_inner.wrap_a1;
  }
  set anchor1(value: Vec2) {
    if ((value as any)?.zpp_disp) {
      throw new Error("Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Constraint::anchor1 cannot be null");
    }
    if (this.zpp_inner.wrap_a1 == null) {
      this.zpp_inner.setup_a1();
    }
    this.zpp_inner.wrap_a1.set(value);
    disposeWeakVec2(value);
  }

  /** Anchor point on `body2` in local coordinates. */
  get anchor2(): Vec2 {
    if (this.zpp_inner.wrap_a2 == null) {
      this.zpp_inner.setup_a2();
    }
    return this.zpp_inner.wrap_a2;
  }
  set anchor2(value: Vec2) {
    if ((value as any)?.zpp_disp) {
      throw new Error("Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Constraint::anchor2 cannot be null");
    }
    if (this.zpp_inner.wrap_a2 == null) {
      this.zpp_inner.setup_a2();
    }
    this.zpp_inner.wrap_a2.set(value);
    disposeWeakVec2(value);
  }

  // ---------------------------------------------------------------------------
  // Spring-specific properties
  // ---------------------------------------------------------------------------

  /** Equilibrium distance between anchors (pixels, must be `>= 0`). */
  get restLength(): number {
    return this.zpp_inner.restLength;
  }
  set restLength(value: number) {
    this.zpp_inner.immutable_midstep("SpringJoint::restLength");
    if (value !== value) {
      throw new Error("SpringJoint::restLength cannot be NaN");
    }
    if (value < 0) {
      throw new Error("SpringJoint::restLength must be >= 0");
    }
    if (this.zpp_inner.restLength != value) {
      this.zpp_inner.restLength = value;
      this.zpp_inner.wake();
    }
  }

  /**
   * SpringJoint is always soft — setting `stiff` to `true` is not allowed.
   * Use {@link DistanceJoint} if you need a rigid distance constraint.
   */
  override get stiff(): boolean {
    return false;
  }
  override set stiff(_value: boolean) {
    // SpringJoint is always soft — ignore attempts to make it stiff
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  override impulse(): MatMN {
    const nape = getNape();
    const ret = new nape.geom.MatMN(1, 1);
    if (0 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new Error("MatMN indices out of range");
    }
    ret.zpp_inner.x[0 * ret.zpp_inner.n] = this.zpp_inner.jAcc;
    return ret;
  }

  override bodyImpulse(body: Body): Vec3 {
    const nape = getNape();
    if (body == null) {
      throw new Error(IMPULSE_ERROR_NULL_BODY);
    }
    const b1outer = this.zpp_inner.b1 == null ? null : this.zpp_inner.b1.outer;
    const b2outer = this.zpp_inner.b2 == null ? null : this.zpp_inner.b2.outer;
    if (body != b1outer && body != b2outer) {
      throw new Error("Body is not linked to this constraint");
    }
    if (!this.zpp_inner.active) {
      return nape.geom.Vec3.get(0, 0, 0);
    } else {
      return this.zpp_inner.bodyImpulse((body as any).zpp_inner);
    }
  }

  override visitBodies(lambda: (body: Body) => void): void {
    if (lambda == null) {
      throw new Error("Cannot apply null lambda to bodies");
    }
    const b1outer = this.zpp_inner.b1 == null ? null : this.zpp_inner.b1.outer;
    if (b1outer != null) {
      lambda(b1outer);
    }
    const b2outer = this.zpp_inner.b2 == null ? null : this.zpp_inner.b2.outer;
    if (b2outer != null && b2outer != b1outer) {
      lambda(b2outer);
    }
  }

  /** @internal backward compat alias for zpp_inner */
  get zpp_inner_zn(): ZPP_SpringJoint {
    return this.zpp_inner;
  }
  /** @internal */
  set zpp_inner_zn(v: ZPP_SpringJoint) {
    this.zpp_inner = v;
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

ZPP_SpringJoint._wrapFn = (zpp: ZPP_SpringJoint): SpringJoint => {
  return getOrCreate(zpp, (raw: ZPP_SpringJoint) => {
    const j = Object.create(SpringJoint.prototype) as SpringJoint;
    j.zpp_inner = raw;
    raw.outer = j;
    raw.outer_zn = j;
    j.debugDraw = true;
    return j;
  });
};
