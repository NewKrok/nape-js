import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2 } from "../geom/Vec2";
import { Body } from "../phys/Body";
import { MatMN } from "../geom/MatMN";
import { Vec3 } from "../geom/Vec3";
import { Constraint } from "./Constraint";
import { ZPP_WeldJoint } from "../native/constraint/ZPP_WeldJoint";

/** Read validated x from a Vec2 input. */
function _readVec2X(v: Vec2): number {
  if ((v as any).zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.x;
}

/** Read validated y from a Vec2 input. */
function _readVec2Y(v: Vec2): number {
  if ((v as any).zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.y;
}

/** Dispose a Vec2 if it is weak. */
function _disposeWeakVec2(v: Vec2): void {
  if (v.zpp_inner.weak) {
    v.dispose();
  }
}

/**
 * Weld joint — constrains two bodies to maintain a fixed relative position and
 * relative angle, effectively gluing them together while still treating them as
 * separate physics objects.
 *
 * The `phase` parameter sets the desired relative angle offset in radians.
 * When `phase = 0` both bodies maintain the angle difference they had at the
 * time the joint was created.
 *
 * @example
 * ```ts
 * const joint = new WeldJoint(
 *   body1, body2,
 *   Vec2.weak(10, 0),  // attach point on body1
 *   Vec2.weak(-10, 0), // attach point on body2
 * );
 * joint.space = space;
 * ```
 *
 * Fully modernized — uses ZPP_WeldJoint directly (extracted to TypeScript).
 */
export class WeldJoint extends Constraint {
  /** @internal */
  declare zpp_inner: ZPP_WeldJoint;

  /**
   * @param body1 - First body, or `null` for a static world anchor.
   * @param body2 - Second body, or `null` for a static world anchor.
   * @param anchor1 - Anchor point in `body1`'s local space (disposed if weak).
   * @param anchor2 - Anchor point in `body2`'s local space (disposed if weak).
   * @param phase - Target relative angle offset in radians. Default `0.0`.
   */
  constructor(
    body1: Body | null,
    body2: Body | null,
    anchor1: Vec2,
    anchor2: Vec2,
    phase: number = 0.0,
  ) {
    super();

    const zpp = new ZPP_WeldJoint();
    this.zpp_inner = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;

    // Set bodies
    this._setBody1(body1);
    this._setBody2(body2);

    // Set anchor1
    if ((anchor1 as any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (anchor1 == null) {
      throw new Error("Error: Constraint::anchor1 cannot be null");
    }
    zpp.a1localx = _readVec2X(anchor1);
    zpp.a1localy = _readVec2Y(anchor1);
    _disposeWeakVec2(anchor1);

    // Set anchor2
    if ((anchor2 as any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (anchor2 == null) {
      throw new Error("Error: Constraint::anchor2 cannot be null");
    }
    zpp.a2localx = _readVec2X(anchor2);
    zpp.a2localy = _readVec2Y(anchor2);
    _disposeWeakVec2(anchor2);

    // Set phase with validation
    this.zpp_inner.immutable_midstep("WeldJoint::phase");
    if (phase !== phase) {
      throw new Error("Error: WeldJoint::phase cannot be NaN");
    }
    if (zpp.phase != phase) {
      zpp.phase = phase;
      zpp.wake();
    }
  }

  /** @internal */
  static _wrap(inner: any): WeldJoint {
    if (inner == null) return null!;
    if (inner instanceof WeldJoint) return inner;
    if (inner.zpp_inner?.outer instanceof WeldJoint) return inner.zpp_inner.outer;

    if (inner instanceof ZPP_WeldJoint) {
      return getOrCreate(inner, (zpp: ZPP_WeldJoint) => {
        const j = Object.create(WeldJoint.prototype) as WeldJoint;
        j.zpp_inner = zpp;
        zpp.outer = j;
        zpp.outer_zn = j;
        j.debugDraw = true;
        return j;
      });
    }

    return getOrCreate(inner, (raw: any) => {
      const j = Object.create(WeldJoint.prototype) as WeldJoint;
      j.zpp_inner = raw.zpp_inner ?? raw;
      j.zpp_inner.outer = j;
      j.zpp_inner.outer_zn = j;
      return j;
    });
  }

  // ---------------------------------------------------------------------------
  // body1 / body2 — full constraint-space integration
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
  // Anchor properties — lazy Vec2 wrapper setup
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
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Constraint::anchor1 cannot be null");
    }
    if (this.zpp_inner.wrap_a1 == null) {
      this.zpp_inner.setup_a1();
    }
    this.zpp_inner.wrap_a1.set(value);
    _disposeWeakVec2(value);
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
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Constraint::anchor2 cannot be null");
    }
    if (this.zpp_inner.wrap_a2 == null) {
      this.zpp_inner.setup_a2();
    }
    this.zpp_inner.wrap_a2.set(value);
    _disposeWeakVec2(value);
  }

  // ---------------------------------------------------------------------------
  // Joint-specific properties
  // ---------------------------------------------------------------------------

  /**
   * Target relative angle offset in radians.
   * `0` means both bodies maintain their original angle difference.
   * @defaultValue `0.0`
   */
  get phase(): number {
    return this.zpp_inner.phase;
  }
  set phase(value: number) {
    this.zpp_inner.immutable_midstep("WeldJoint::phase");
    if (value !== value) {
      throw new Error("Error: WeldJoint::phase cannot be NaN");
    }
    if (this.zpp_inner.phase != value) {
      this.zpp_inner.phase = value;
      this.zpp_inner.wake();
    }
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  override impulse(): MatMN {
    const nape = getNape();
    const ret = new nape.geom.MatMN(3, 1);
    ret.zpp_inner.x[0] = this.zpp_inner.jAccx;
    ret.zpp_inner.x[1] = this.zpp_inner.jAccy;
    ret.zpp_inner.x[2] = this.zpp_inner.jAccz;
    return ret;
  }

  override bodyImpulse(body: Body): Vec3 {
    const nape = getNape();
    if (body == null) {
      throw new Error("Error: Cannot evaluate impulse on null body");
    }
    const b1outer = this.zpp_inner.b1 == null ? null : this.zpp_inner.b1.outer;
    const b2outer = this.zpp_inner.b2 == null ? null : this.zpp_inner.b2.outer;
    if (body != b1outer && body != b2outer) {
      throw new Error("Error: Body is not linked to this constraint");
    }
    if (!this.zpp_inner.active) {
      return nape.geom.Vec3.get();
    } else {
      return this.zpp_inner.bodyImpulse((body as any).zpp_inner);
    }
  }

  override visitBodies(lambda: (body: Body) => void): void {
    if (lambda == null) {
      throw new Error("Error: Cannot apply null lambda to bodies");
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
  get zpp_inner_zn(): ZPP_WeldJoint {
    return this.zpp_inner;
  }
  /** @internal */
  set zpp_inner_zn(v: ZPP_WeldJoint) {
    this.zpp_inner = v;
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

ZPP_WeldJoint._wrapFn = (zpp: ZPP_WeldJoint): WeldJoint => {
  return getOrCreate(zpp, (raw: ZPP_WeldJoint) => {
    const j = Object.create(WeldJoint.prototype) as WeldJoint;
    j.zpp_inner = raw;
    raw.outer = j;
    raw.outer_zn = j;
    j.debugDraw = true;
    return j;
  });
};
