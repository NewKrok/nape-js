import { getNape } from "../core/engine";
import { Vec2, type NapeInner } from "../geom/Vec2";
import { Vec3 } from "../geom/Vec3";

type Any = any;

/**
 * Represents a contact point between two colliding shapes.
 *
 * Contacts are pooled internally by the engine — they cannot be created directly.
 * Access contacts via `CollisionArbiter.contacts`.
 *
 * Thin wrapper — delegates to compiled ZPP_Contact (not yet extracted).
 */
export class Contact {
  static __name__ = ["nape", "dynamics", "Contact"];

  /** @internal */
  zpp_inner: Any;

  /** @internal Backward-compat: compiled code accesses `obj.zpp_inner`. */
  get _inner(): NapeInner {
    return this;
  }

  constructor() {
    this.zpp_inner = null;
    const zpp = getNape().__zpp;
    if (!zpp.dynamics.ZPP_Contact.internal) {
      throw new Error("Error: Cannot instantiate Contact derp!");
    }
  }

  // ---------------------------------------------------------------------------
  // Properties (read-only)
  // ---------------------------------------------------------------------------

  /** The collision arbiter this contact belongs to, or null. */
  get arbiter(): Any {
    if (this.zpp_inner.arbiter == null) {
      return null;
    }
    const outer = this.zpp_inner.arbiter.outer;
    const ZPP_Arbiter = getNape().__zpp.dynamics.ZPP_Arbiter;
    if (outer.zpp_inner.type == ZPP_Arbiter.COL) {
      return outer.zpp_inner.colarb.outer_zn;
    }
    return null;
  }

  /** Penetration depth of this contact (positive = overlapping). */
  get penetration(): number {
    this._inactiveCheck();
    return -this.zpp_inner.dist;
  }

  /** World-space position of this contact point. */
  get position(): Vec2 {
    this._inactiveCheck();
    if (this.zpp_inner.wrap_position == null) {
      this.zpp_inner.getposition();
    }
    return Vec2._wrap(this.zpp_inner.wrap_position);
  }

  /** Whether this contact was newly created in the current step. */
  get fresh(): boolean {
    this._inactiveCheck();
    return this.zpp_inner.fresh;
  }

  /** Friction value for this contact. */
  get friction(): number {
    this._inactiveCheck();
    return this.zpp_inner.inner.friction;
  }

  // ---------------------------------------------------------------------------
  // Impulse methods
  // ---------------------------------------------------------------------------

  /**
   * Normal impulse at this contact point.
   * @param body - If null, returns world-frame impulse. Otherwise returns
   *               impulse on the given body (must be one of the two in contact).
   */
  normalImpulse(body: Any = null): Vec3 {
    this._inactiveCheck();
    const colarb = this.zpp_inner.arbiter.colarb;
    const cin = this.zpp_inner.inner;
    const jnAcc = cin.jnAcc;
    if (body == null) {
      return Vec3.get(colarb.nx * jnAcc, colarb.ny * jnAcc);
    }
    this._checkBody(body, colarb);
    if (body == colarb.b1.outer) {
      return Vec3.get(
        colarb.nx * -jnAcc,
        colarb.ny * -jnAcc,
        -(colarb.ny * cin.r1x - colarb.nx * cin.r1y) * jnAcc,
      );
    }
    return Vec3.get(
      colarb.nx * jnAcc,
      colarb.ny * jnAcc,
      (colarb.ny * cin.r2x - colarb.nx * cin.r2y) * jnAcc,
    );
  }

  /**
   * Tangent impulse at this contact point.
   * @param body - If null, returns world-frame impulse. Otherwise returns
   *               impulse on the given body.
   */
  tangentImpulse(body: Any = null): Vec3 {
    this._inactiveCheck();
    const colarb = this.zpp_inner.arbiter.colarb;
    const cin = this.zpp_inner.inner;
    const jtAcc = cin.jtAcc;
    if (body == null) {
      return Vec3.get(-colarb.ny * jtAcc, colarb.nx * jtAcc);
    }
    this._checkBody(body, colarb);
    if (body == colarb.b1.outer) {
      return Vec3.get(
        colarb.ny * jtAcc,
        -colarb.nx * jtAcc,
        -(cin.r1x * colarb.nx + cin.r1y * colarb.ny) * jtAcc,
      );
    }
    return Vec3.get(
      -colarb.ny * jtAcc,
      colarb.nx * jtAcc,
      (cin.r2x * colarb.nx + cin.r2y * colarb.ny) * jtAcc,
    );
  }

  /**
   * Rolling impulse at this contact point.
   * @param body - If null, returns total rolling impulse. Otherwise returns
   *               rolling impulse on the given body.
   */
  rollingImpulse(body: Any = null): number {
    this._inactiveCheck();
    const colarb = this.zpp_inner.arbiter.colarb;
    const jrAcc = colarb.jrAcc;
    if (body == null) {
      return jrAcc;
    }
    this._checkBody(body, colarb);
    return body == colarb.b1.outer ? -jrAcc : jrAcc;
  }

  /**
   * Total impulse (normal + tangent + rolling) at this contact point.
   * @param body - If null, returns world-frame impulse. Otherwise returns
   *               impulse on the given body.
   */
  totalImpulse(body: Any = null): Vec3 {
    this._inactiveCheck();
    const colarb = this.zpp_inner.arbiter.colarb;
    const cin = this.zpp_inner.inner;
    const jnAcc = cin.jnAcc;
    const jtAcc = cin.jtAcc;
    const jrAcc = colarb.jrAcc;
    if (body == null) {
      return Vec3.get(
        colarb.nx * jnAcc - colarb.ny * jtAcc,
        colarb.ny * jnAcc + colarb.nx * jtAcc,
        jrAcc,
      );
    }
    this._checkBody(body, colarb);
    const jx = colarb.nx * jnAcc - colarb.ny * jtAcc;
    const jy = colarb.ny * jnAcc + colarb.nx * jtAcc;
    if (body == colarb.b1.outer) {
      return Vec3.get(-jx, -jy, -(jy * cin.r1x - jx * cin.r1y) - jrAcc);
    }
    return Vec3.get(jx, jy, jy * cin.r2x - jx * cin.r2y + jrAcc);
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  toString(): string {
    if (this.zpp_inner.arbiter == null || this.zpp_inner.arbiter.cleared) {
      return "{object-pooled}";
    }
    return "{Contact}";
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** @internal */
  private _inactiveCheck(): void {
    if (this.zpp_inner.inactiveme()) {
      throw new Error("Error: Contact not currently in use");
    }
  }

  /** @internal */
  private _checkBody(body: Any, colarb: Any): void {
    if (body != colarb.b1.outer && body != colarb.b2.outer) {
      throw new Error("Error: Contact does not relate to the given body");
    }
  }
}

// Self-register in the compiled namespace
const nape = getNape();
nape.dynamics.Contact = Contact;
(Contact.prototype as any).__class__ = Contact;
