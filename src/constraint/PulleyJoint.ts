import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2 } from "../geom/Vec2";
import { Vec3 } from "../geom/Vec3";
import { MatMN } from "../geom/MatMN";
import { Body } from "../phys/Body";
import { Constraint } from "./Constraint";
import { ZPP_PulleyJoint } from "../native/constraint/ZPP_PulleyJoint";

type Any = any;

/** Read validated x from a Vec2 input. */
function _readVec2X(v: Vec2): number {
  if ((v as Any).zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.x;
}

/** Read validated y from a Vec2 input. */
function _readVec2Y(v: Vec2): number {
  if ((v as Any).zpp_disp) {
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
 * Pulley joint — constrains the weighted sum of distances between
 * four anchor points on four bodies.
 *
 * Fully modernized — uses ZPP_PulleyJoint directly (extracted to TypeScript).
 */
export class PulleyJoint extends Constraint {
  declare zpp_inner: ZPP_PulleyJoint;

  constructor(
    body1: Body | null,
    body2: Body | null,
    body3: Body | null,
    body4: Body | null,
    anchor1: Vec2,
    anchor2: Vec2,
    anchor3: Vec2,
    anchor4: Vec2,
    jointMin: number,
    jointMax: number,
    ratio: number = 1.0,
  ) {
    super();

    const zpp = new ZPP_PulleyJoint();
    this.zpp_inner = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;

    // Set bodies
    this._setBody1(body1);
    this._setBody2(body2);
    this._setBody3(body3);
    this._setBody4(body4);

    // Set anchors
    this._setAnchorInit(anchor1, "anchor1", (x, y) => {
      zpp.a1localx = x;
      zpp.a1localy = y;
    });
    this._setAnchorInit(anchor2, "anchor2", (x, y) => {
      zpp.a2localx = x;
      zpp.a2localy = y;
    });
    this._setAnchorInit(anchor3, "anchor3", (x, y) => {
      zpp.a3localx = x;
      zpp.a3localy = y;
    });
    this._setAnchorInit(anchor4, "anchor4", (x, y) => {
      zpp.a4localx = x;
      zpp.a4localy = y;
    });

    // Set jointMin
    zpp.immutable_midstep("PulleyJoint::jointMin");
    if (jointMin !== jointMin) {
      throw new Error("Error: PulleyJoint::jointMin cannot be NaN");
    }
    if (jointMin < 0) {
      throw new Error("Error: PulleyJoint::jointMin must be >= 0");
    }
    if (zpp.jointMin != jointMin) {
      zpp.jointMin = jointMin;
      zpp.wake();
    }

    // Set jointMax
    zpp.immutable_midstep("PulleyJoint::jointMax");
    if (jointMax !== jointMax) {
      throw new Error("Error: PulleyJoint::jointMax cannot be NaN");
    }
    if (jointMax < 0) {
      throw new Error("Error: PulleyJoint::jointMax must be >= 0");
    }
    if (zpp.jointMax != jointMax) {
      zpp.jointMax = jointMax;
      zpp.wake();
    }

    // Set ratio
    zpp.immutable_midstep("PulleyJoint::ratio");
    if (ratio !== ratio) {
      throw new Error("Error: PulleyJoint::ratio cannot be NaN");
    }
    if (zpp.ratio != ratio) {
      zpp.ratio = ratio;
      zpp.wake();
    }
  }

  /** @internal Helper to set an anchor during construction. */
  private _setAnchorInit(
    anchor: Vec2,
    name: string,
    set: (x: number, y: number) => void,
  ): void {
    if ((anchor as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (anchor == null) {
      throw new Error("Error: Constraint::" + name + " cannot be null");
    }
    set(_readVec2X(anchor), _readVec2Y(anchor));
    _disposeWeakVec2(anchor);
  }

  /** @internal */
  static _wrap(inner: Any): PulleyJoint {
    if (inner == null) return null!;
    if (inner instanceof PulleyJoint) return inner;
    if (inner.zpp_inner?.outer instanceof PulleyJoint)
      return inner.zpp_inner.outer;

    if (inner instanceof ZPP_PulleyJoint) {
      return getOrCreate(inner, (zpp: ZPP_PulleyJoint) => {
        const j = Object.create(PulleyJoint.prototype) as PulleyJoint;
        j.zpp_inner = zpp;
        zpp.outer = j;
        zpp.outer_zn = j;
        j.debugDraw = true;
        return j;
      });
    }

    return getOrCreate(inner, (raw: Any) => {
      const j = Object.create(PulleyJoint.prototype) as PulleyJoint;
      j.zpp_inner = raw.zpp_inner ?? raw;
      j.zpp_inner.outer = j;
      j.zpp_inner.outer_zn = j;
      return j;
    });
  }

  // ---------------------------------------------------------------------------
  // Body properties — 4-body constraint-space integration
  // ---------------------------------------------------------------------------

  get body1(): Body {
    if (this.zpp_inner.b1 == null) return null!;
    return Body._wrap(this.zpp_inner.b1);
  }
  set body1(value: Body | null) {
    this._setBody1(value);
  }

  get body2(): Body {
    if (this.zpp_inner.b2 == null) return null!;
    return Body._wrap(this.zpp_inner.b2);
  }
  set body2(value: Body | null) {
    this._setBody2(value);
  }

  get body3(): Body {
    if (this.zpp_inner.b3 == null) return null!;
    return Body._wrap(this.zpp_inner.b3);
  }
  set body3(value: Body | null) {
    this._setBody3(value);
  }

  get body4(): Body {
    if (this.zpp_inner.b4 == null) return null!;
    return Body._wrap(this.zpp_inner.b4);
  }
  set body4(value: Body | null) {
    this._setBody4(value);
  }

  /** @internal */
  private _setBody1(body1: Body | null): void {
    this.zpp_inner.immutable_midstep("Constraint::body1");
    const inbody = body1 == null ? null : (body1 as Any).zpp_inner;
    if (inbody != this.zpp_inner.b1) {
      if (this.zpp_inner.b1 != null) {
        if (
          this.zpp_inner.space != null &&
          this.zpp_inner.b2 != this.zpp_inner.b1 &&
          this.zpp_inner.b3 != this.zpp_inner.b1 &&
          this.zpp_inner.b4 != this.zpp_inner.b1
        ) {
          this.zpp_inner.b1.constraints.remove(this.zpp_inner);
        }
        if (this.zpp_inner.active && this.zpp_inner.space != null) {
          this.zpp_inner.b1.wake();
        }
      }
      this.zpp_inner.b1 = inbody;
      if (
        this.zpp_inner.space != null &&
        inbody != null &&
        this.zpp_inner.b2 != inbody &&
        this.zpp_inner.b3 != inbody &&
        this.zpp_inner.b4 != inbody
      ) {
        inbody.constraints.add(this.zpp_inner);
      }
      if (this.zpp_inner.active && this.zpp_inner.space != null) {
        this.zpp_inner.wake();
        if (inbody != null) inbody.wake();
      }
    }
  }

  /** @internal */
  private _setBody2(body2: Body | null): void {
    this.zpp_inner.immutable_midstep("Constraint::body2");
    const inbody = body2 == null ? null : (body2 as Any).zpp_inner;
    if (inbody != this.zpp_inner.b2) {
      if (this.zpp_inner.b2 != null) {
        if (
          this.zpp_inner.space != null &&
          this.zpp_inner.b1 != this.zpp_inner.b2 &&
          this.zpp_inner.b3 != this.zpp_inner.b2 &&
          this.zpp_inner.b4 != this.zpp_inner.b2
        ) {
          this.zpp_inner.b2.constraints.remove(this.zpp_inner);
        }
        if (this.zpp_inner.active && this.zpp_inner.space != null) {
          this.zpp_inner.b2.wake();
        }
      }
      this.zpp_inner.b2 = inbody;
      if (
        this.zpp_inner.space != null &&
        inbody != null &&
        this.zpp_inner.b1 != inbody &&
        this.zpp_inner.b3 != inbody &&
        this.zpp_inner.b4 != inbody
      ) {
        inbody.constraints.add(this.zpp_inner);
      }
      if (this.zpp_inner.active && this.zpp_inner.space != null) {
        this.zpp_inner.wake();
        if (inbody != null) inbody.wake();
      }
    }
  }

  /** @internal */
  private _setBody3(body3: Body | null): void {
    this.zpp_inner.immutable_midstep("Constraint::body3");
    const inbody = body3 == null ? null : (body3 as Any).zpp_inner;
    if (inbody != this.zpp_inner.b3) {
      if (this.zpp_inner.b3 != null) {
        if (
          this.zpp_inner.space != null &&
          this.zpp_inner.b1 != this.zpp_inner.b3 &&
          this.zpp_inner.b2 != this.zpp_inner.b3 &&
          this.zpp_inner.b4 != this.zpp_inner.b3
        ) {
          this.zpp_inner.b3.constraints.remove(this.zpp_inner);
        }
        if (this.zpp_inner.active && this.zpp_inner.space != null) {
          this.zpp_inner.b3.wake();
        }
      }
      this.zpp_inner.b3 = inbody;
      if (
        this.zpp_inner.space != null &&
        inbody != null &&
        this.zpp_inner.b1 != inbody &&
        this.zpp_inner.b2 != inbody &&
        this.zpp_inner.b4 != inbody
      ) {
        inbody.constraints.add(this.zpp_inner);
      }
      if (this.zpp_inner.active && this.zpp_inner.space != null) {
        this.zpp_inner.wake();
        if (inbody != null) inbody.wake();
      }
    }
  }

  /** @internal */
  private _setBody4(body4: Body | null): void {
    this.zpp_inner.immutable_midstep("Constraint::body4");
    const inbody = body4 == null ? null : (body4 as Any).zpp_inner;
    if (inbody != this.zpp_inner.b4) {
      if (this.zpp_inner.b4 != null) {
        if (
          this.zpp_inner.space != null &&
          this.zpp_inner.b1 != this.zpp_inner.b4 &&
          this.zpp_inner.b2 != this.zpp_inner.b4 &&
          this.zpp_inner.b3 != this.zpp_inner.b4
        ) {
          this.zpp_inner.b4.constraints.remove(this.zpp_inner);
        }
        if (this.zpp_inner.active && this.zpp_inner.space != null) {
          this.zpp_inner.b4.wake();
        }
      }
      this.zpp_inner.b4 = inbody;
      if (
        this.zpp_inner.space != null &&
        inbody != null &&
        this.zpp_inner.b1 != inbody &&
        this.zpp_inner.b2 != inbody &&
        this.zpp_inner.b3 != inbody
      ) {
        inbody.constraints.add(this.zpp_inner);
      }
      if (this.zpp_inner.active && this.zpp_inner.space != null) {
        this.zpp_inner.wake();
        if (inbody != null) inbody.wake();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Anchor properties — lazy Vec2 wrapper setup
  // ---------------------------------------------------------------------------

  get anchor1(): Vec2 {
    if (this.zpp_inner.wrap_a1 == null) this.zpp_inner.setup_a1();
    return this.zpp_inner.wrap_a1;
  }
  set anchor1(value: Vec2) {
    if ((value as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Constraint::anchor1 cannot be null");
    }
    if (this.zpp_inner.wrap_a1 == null) this.zpp_inner.setup_a1();
    _readVec2X(value);
    _readVec2Y(value);
    this.zpp_inner.wrap_a1.set(value);
    _disposeWeakVec2(value);
  }

  get anchor2(): Vec2 {
    if (this.zpp_inner.wrap_a2 == null) this.zpp_inner.setup_a2();
    return this.zpp_inner.wrap_a2;
  }
  set anchor2(value: Vec2) {
    if ((value as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Constraint::anchor2 cannot be null");
    }
    if (this.zpp_inner.wrap_a2 == null) this.zpp_inner.setup_a2();
    _readVec2X(value);
    _readVec2Y(value);
    this.zpp_inner.wrap_a2.set(value);
    _disposeWeakVec2(value);
  }

  get anchor3(): Vec2 {
    if (this.zpp_inner.wrap_a3 == null) this.zpp_inner.setup_a3();
    return this.zpp_inner.wrap_a3;
  }
  set anchor3(value: Vec2) {
    if ((value as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Constraint::anchor3 cannot be null");
    }
    if (this.zpp_inner.wrap_a3 == null) this.zpp_inner.setup_a3();
    _readVec2X(value);
    _readVec2Y(value);
    this.zpp_inner.wrap_a3.set(value);
    _disposeWeakVec2(value);
  }

  get anchor4(): Vec2 {
    if (this.zpp_inner.wrap_a4 == null) this.zpp_inner.setup_a4();
    return this.zpp_inner.wrap_a4;
  }
  set anchor4(value: Vec2) {
    if ((value as Any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Constraint::anchor4 cannot be null");
    }
    if (this.zpp_inner.wrap_a4 == null) this.zpp_inner.setup_a4();
    _readVec2X(value);
    _readVec2Y(value);
    this.zpp_inner.wrap_a4.set(value);
    _disposeWeakVec2(value);
  }

  // ---------------------------------------------------------------------------
  // Joint-specific scalar properties
  // ---------------------------------------------------------------------------

  get jointMin(): number {
    return this.zpp_inner.jointMin;
  }
  set jointMin(value: number) {
    this.zpp_inner.immutable_midstep("PulleyJoint::jointMin");
    if (value !== value) {
      throw new Error("Error: PulleyJoint::jointMin cannot be NaN");
    }
    if (value < 0) {
      throw new Error("Error: PulleyJoint::jointMin must be >= 0");
    }
    if (this.zpp_inner.jointMin != value) {
      this.zpp_inner.jointMin = value;
      this.zpp_inner.wake();
    }
  }

  get jointMax(): number {
    return this.zpp_inner.jointMax;
  }
  set jointMax(value: number) {
    this.zpp_inner.immutable_midstep("PulleyJoint::jointMax");
    if (value !== value) {
      throw new Error("Error: PulleyJoint::jointMax cannot be NaN");
    }
    if (value < 0) {
      throw new Error("Error: PulleyJoint::jointMax must be >= 0");
    }
    if (this.zpp_inner.jointMax != value) {
      this.zpp_inner.jointMax = value;
      this.zpp_inner.wake();
    }
  }

  get ratio(): number {
    return this.zpp_inner.ratio;
  }
  set ratio(value: number) {
    this.zpp_inner.immutable_midstep("PulleyJoint::ratio");
    if (value !== value) {
      throw new Error("Error: PulleyJoint::ratio cannot be NaN");
    }
    if (this.zpp_inner.ratio != value) {
      this.zpp_inner.ratio = value;
      this.zpp_inner.wake();
    }
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  isSlack(): boolean {
    if (
      this.zpp_inner.b1 == null ||
      this.zpp_inner.b2 == null ||
      this.zpp_inner.b3 == null ||
      this.zpp_inner.b4 == null
    ) {
      throw new Error(
        "Error: Cannot compute slack for PulleyJoint if either body is null.",
      );
    }
    return this.zpp_inner.slack;
  }

  override impulse(): Any {
    const ret = new MatMN(1, 1);
    if (0 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new Error("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[0 * ret.zpp_inner.n] = this.zpp_inner.jAcc;
    return ret;
  }

  override bodyImpulse(body: Body): Any {
    if (body == null) {
      throw new Error("Error: Cannot evaluate impulse on null body");
    }
    const b1outer = this.zpp_inner.b1?.outer ?? null;
    const b2outer = this.zpp_inner.b2?.outer ?? null;
    const b3outer = this.zpp_inner.b3?.outer ?? null;
    const b4outer = this.zpp_inner.b4?.outer ?? null;
    if (body != b1outer && body != b2outer && body != b3outer && body != b4outer) {
      throw new Error("Error: Body is not linked to this constraint");
    }
    if (!this.zpp_inner.active) {
      return Vec3.get(0, 0, 0);
    } else {
      return this.zpp_inner.bodyImpulse((body as Any).zpp_inner);
    }
  }

  override visitBodies(lambda: (body: Body) => void): void {
    if (lambda == null) {
      throw new Error("Error: Cannot apply null lambda to bodies");
    }
    const b1 = this.zpp_inner.b1?.outer ?? null;
    const b2 = this.zpp_inner.b2?.outer ?? null;
    const b3 = this.zpp_inner.b3?.outer ?? null;
    const b4 = this.zpp_inner.b4?.outer ?? null;
    if (b1 != null) lambda(b1);
    if (b2 != null && b2 != b1) lambda(b2);
    if (b3 != null && b3 != b1 && b3 != b2) lambda(b3);
    if (b4 != null && b4 != b1 && b4 != b2 && b4 != b3) lambda(b4);
  }

  // ---------------------------------------------------------------------------
  // Backward-compat get_*/set_* methods for compiled code
  // ---------------------------------------------------------------------------

  /** @internal */ get_body1(): Any { return this.body1; }
  /** @internal */ set_body1(v: Any): Any { this.body1 = v; return this.body1; }
  /** @internal */ get_body2(): Any { return this.body2; }
  /** @internal */ set_body2(v: Any): Any { this.body2 = v; return this.body2; }
  /** @internal */ get_body3(): Any { return this.body3; }
  /** @internal */ set_body3(v: Any): Any { this.body3 = v; return this.body3; }
  /** @internal */ get_body4(): Any { return this.body4; }
  /** @internal */ set_body4(v: Any): Any { this.body4 = v; return this.body4; }
  /** @internal */ get_anchor1(): Any { return this.anchor1; }
  /** @internal */ set_anchor1(v: Any): Any { this.anchor1 = v; return this.anchor1; }
  /** @internal */ get_anchor2(): Any { return this.anchor2; }
  /** @internal */ set_anchor2(v: Any): Any { this.anchor2 = v; return this.anchor2; }
  /** @internal */ get_anchor3(): Any { return this.anchor3; }
  /** @internal */ set_anchor3(v: Any): Any { this.anchor3 = v; return this.anchor3; }
  /** @internal */ get_anchor4(): Any { return this.anchor4; }
  /** @internal */ set_anchor4(v: Any): Any { this.anchor4 = v; return this.anchor4; }
  /** @internal */ get_jointMin(): number { return this.jointMin; }
  /** @internal */ set_jointMin(v: number): number { this.jointMin = v; return this.zpp_inner.jointMin; }
  /** @internal */ get_jointMax(): number { return this.jointMax; }
  /** @internal */ set_jointMax(v: number): number { this.jointMax = v; return this.zpp_inner.jointMax; }
  /** @internal */ get_ratio(): number { return this.ratio; }
  /** @internal */ set_ratio(v: number): number { this.ratio = v; return this.zpp_inner.ratio; }

  /** @internal backward compat alias for zpp_inner */
  get zpp_inner_zn(): ZPP_PulleyJoint { return this.zpp_inner; }
  set zpp_inner_zn(v: ZPP_PulleyJoint) { this.zpp_inner = v; }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

ZPP_PulleyJoint._wrapFn = (zpp: ZPP_PulleyJoint): PulleyJoint => {
  return getOrCreate(zpp, (raw: ZPP_PulleyJoint) => {
    const j = Object.create(PulleyJoint.prototype) as PulleyJoint;
    j.zpp_inner = raw;
    raw.outer = j;
    raw.outer_zn = j;
    j.debugDraw = true;
    return j;
  });
};

const nape = getNape();
nape.constraint.PulleyJoint = PulleyJoint;
(PulleyJoint.prototype as Any).__class__ = PulleyJoint;

const zpp = nape.__zpp;
zpp.constraint.ZPP_PulleyJoint = ZPP_PulleyJoint;
