import { Vec3 } from "../geom/Vec3";
import { Arbiter } from "./Arbiter";
import type { Vec2 } from "../geom/Vec2";
import type { Edge } from "../shape/Edge";
import type { Body } from "../phys/Body";

/**
 * An arbiter representing a physical collision between two solid shapes.
 *
 * Provides access to contact points, collision normal, friction coefficients,
 * elasticity, and impulse data. Properties marked _mutable in pre-handler_ can
 * only be set within a {@link PreListener} handler.
 *
 * Obtain via {@link Arbiter.collisionArbiter} or by casting from a callback's
 * arbiter list.
 *
 * Fully modernized — uses extracted ZPP_ColArbiter directly.
 */
export class CollisionArbiter extends Arbiter {
  constructor() {
    super();
  }

  // ---------------------------------------------------------------------------
  // Properties (read-only)
  // ---------------------------------------------------------------------------

  /**
   * The list of active contact points between the two shapes.
   * Contains 1 or 2 {@link Contact} objects depending on the collision geometry.
   */
  // ContactList is a special-case list; no generic factory type
  get contacts(): object {
    this._activeCheck();
    if (this.zpp_inner.colarb.wrap_contacts == null) {
      this.zpp_inner.colarb.setupcontacts();
    }
    return this.zpp_inner.colarb.wrap_contacts;
  }

  /**
   * Collision normal vector pointing from `shape1` toward `shape2`.
   * Read-only; available after the arbiter is active.
   */
  get normal(): Vec2 {
    this._activeCheck();
    if (this.zpp_inner.colarb.wrap_normal == null) {
      this.zpp_inner.colarb.getnormal();
    }
    return this.zpp_inner.colarb.wrap_normal;
  }

  /** Sum of the radii of the two shapes at the collision point. */
  get radius(): number {
    this._activeCheck();
    return this.zpp_inner.colarb.radius;
  }

  /** Reference edge of shape1 (if polygon), or null. */
  get referenceEdge1(): Edge | null {
    this._activeCheck();
    let edge = this.zpp_inner.colarb.__ref_edge1;
    if (edge != null) {
      const s1 =
        this.zpp_inner.ws1.id > this.zpp_inner.ws2.id
          ? this.zpp_inner.ws2.outer
          : this.zpp_inner.ws1.outer;
      if (s1.zpp_inner.type == 1) {
        if (s1.zpp_inner != edge.polygon) {
          edge = this.zpp_inner.colarb.__ref_edge2;
        }
      } else {
        edge = this.zpp_inner.colarb.__ref_edge2;
      }
    }
    return edge == null ? null : edge.wrapper();
  }

  /** Reference edge of shape2 (if polygon), or null. */
  get referenceEdge2(): Edge | null {
    this._activeCheck();
    let edge = this.zpp_inner.colarb.__ref_edge1;
    if (edge != null) {
      const s2 =
        this.zpp_inner.ws1.id > this.zpp_inner.ws2.id
          ? this.zpp_inner.ws1.outer
          : this.zpp_inner.ws2.outer;
      if (s2.zpp_inner.type == 1) {
        if (s2.zpp_inner != edge.polygon) {
          edge = this.zpp_inner.colarb.__ref_edge2;
        }
      } else {
        edge = this.zpp_inner.colarb.__ref_edge2;
      }
    }
    return edge == null ? null : edge.wrapper();
  }

  // ---------------------------------------------------------------------------
  // Properties (mutable in pre-handler)
  // ---------------------------------------------------------------------------

  /**
   * Coefficient of restitution (bounciness).
   *
   * Combined from the two shapes' `elasticity` values. Can be overridden
   * inside a pre-handler. Must be `>= 0`.
   *
   * _Mutable in pre-handler only._
   */
  get elasticity(): number {
    this._activeCheck();
    this.zpp_inner.colarb.validate_props();
    return this.zpp_inner.colarb.restitution;
  }
  set elasticity(value: number) {
    this._mutableCheck("elasticity");
    if (value !== value) {
      throw new Error("Error: CollisionArbiter::elasticity cannot be NaN");
    }
    if (value < 0) {
      throw new Error("Error: CollisionArbiter::elasticity cannot be negative");
    }
    this.zpp_inner.colarb.restitution = value;
    this.zpp_inner.colarb.userdef_restitution = true;
    this._activeCheck();
    this.zpp_inner.colarb.validate_props();
  }

  /**
   * Dynamic (kinetic) friction coefficient — applied when the contact is sliding.
   * Combined from the two shapes' material values. _Mutable in pre-handler only._
   */
  get dynamicFriction(): number {
    this._activeCheck();
    this.zpp_inner.colarb.validate_props();
    return this.zpp_inner.colarb.dyn_fric;
  }
  set dynamicFriction(value: number) {
    this._mutableCheck("dynamicFriction");
    if (value !== value) {
      throw new Error("Error: CollisionArbiter::dynamicFriction cannot be NaN");
    }
    if (value < 0) {
      throw new Error("Error: CollisionArbiter::dynamicFriction cannot be negative");
    }
    this.zpp_inner.colarb.dyn_fric = value;
    this.zpp_inner.colarb.userdef_dyn_fric = true;
    this._activeCheck();
    this.zpp_inner.colarb.validate_props();
  }

  /**
   * Static friction coefficient — applied when the contact is at rest.
   * Combined from the two shapes' material values. _Mutable in pre-handler only._
   */
  get staticFriction(): number {
    this._activeCheck();
    this.zpp_inner.colarb.validate_props();
    return this.zpp_inner.colarb.stat_fric;
  }
  set staticFriction(value: number) {
    this._mutableCheck("staticFriction");
    if (value !== value) {
      throw new Error("Error: CollisionArbiter::staticFriction cannot be NaN");
    }
    if (value < 0) {
      throw new Error("Error: CollisionArbiter::staticFriction cannot be negative");
    }
    this.zpp_inner.colarb.stat_fric = value;
    this.zpp_inner.colarb.userdef_stat_fric = true;
    this._activeCheck();
    this.zpp_inner.colarb.validate_props();
  }

  /**
   * Rolling friction coefficient — resists rolling motion.
   * Combined from the two shapes' material values. _Mutable in pre-handler only._
   */
  get rollingFriction(): number {
    this._activeCheck();
    this.zpp_inner.colarb.validate_props();
    return this.zpp_inner.colarb.rfric;
  }
  set rollingFriction(value: number) {
    this._mutableCheck("rollingFriction");
    if (value !== value) {
      throw new Error("Error: CollisionArbiter::rollingFriction cannot be NaN");
    }
    if (value < 0) {
      throw new Error("Error: CollisionArbiter::rollingFriction cannot be negative");
    }
    this.zpp_inner.colarb.rfric = value;
    this.zpp_inner.colarb.userdef_rfric = true;
    this._activeCheck();
    this.zpp_inner.colarb.validate_props();
  }

  // ---------------------------------------------------------------------------
  // Vertex methods
  // ---------------------------------------------------------------------------

  /** Whether the first contact point lies on a polygon vertex (poly-circle only). */
  firstVertex(): boolean {
    this._activeCheck();
    const poly2circle =
      (this.zpp_inner.colarb.__ref_edge1 != null) != (this.zpp_inner.colarb.__ref_edge2 != null);
    return poly2circle ? this.zpp_inner.colarb.__ref_vertex == -1 : false;
  }

  /** Whether the second contact point lies on a polygon vertex (poly-circle only). */
  secondVertex(): boolean {
    this._activeCheck();
    const poly2circle =
      (this.zpp_inner.colarb.__ref_edge1 != null) != (this.zpp_inner.colarb.__ref_edge2 != null);
    return poly2circle ? this.zpp_inner.colarb.__ref_vertex == 1 : false;
  }

  // ---------------------------------------------------------------------------
  // Impulse methods
  // ---------------------------------------------------------------------------

  /**
   * Impulse applied in the normal (collision) direction, summed over all contacts.
   * @param body - One of the two bodies, or `null` for the combined value.
   * @param freshOnly - Only include new contact points. Default `false`.
   */
  normalImpulse(body: Body | null = null, freshOnly: boolean = false): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    return this._accumulateImpulse("normalImpulse", body, freshOnly);
  }

  /**
   * Friction impulse applied in the tangent direction, summed over all contacts.
   * @param body - One of the two bodies, or `null` for the combined value.
   * @param freshOnly - Only include new contact points. Default `false`.
   */
  tangentImpulse(body: Body | null = null, freshOnly: boolean = false): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    return this._accumulateImpulse("tangentImpulse", body, freshOnly);
  }

  /** Total impulse (normal + tangent + rolling) accumulated across all contacts. */
  override totalImpulse(body: Body | null = null, freshOnly: boolean = false): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    return this._accumulateImpulse("totalImpulse", body, freshOnly);
  }

  /**
   * Rolling impulse applied by this collision.
   * @param body - One of the two bodies, or `null` for the combined value.
   * @param freshOnly - Only include new contact points. Default `false`.
   */
  rollingImpulse(body: Body | null = null, freshOnly: boolean = false): number {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    const colarb = this.zpp_inner.colarb;
    if (!freshOnly || colarb.oc1.fresh) {
      return colarb.oc1.wrapper().rollingImpulse(body);
    }
    return 0.0;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** @internal Throw if not in pre-handler mutable window. */
  private _mutableCheck(prop: string): void {
    if (!this.zpp_inner.colarb.mutable) {
      throw new Error("Error: CollisionArbiter::" + prop + " is only mutable during a pre-handler");
    }
  }

  /** @internal Accumulate impulse from contacts. */
  private _accumulateImpulse(method: string, body: Body | null, freshOnly: boolean): Vec3 {
    let retx = 0;
    let rety = 0;
    let retz = 0;
    const colarb = this.zpp_inner.colarb;

    if (!freshOnly || colarb.oc1.fresh) {
      const imp = colarb.oc1.wrapper()[method](body) as Vec3;
      const zi = imp.zpp_inner;
      if (zi._validate != null) zi._validate();
      retx += zi.x;
      if (zi._validate != null) zi._validate();
      rety += zi.y;
      if (zi._validate != null) zi._validate();
      retz += zi.z;
      imp.dispose();
    }
    if (colarb.hc2) {
      if (!freshOnly || colarb.oc2.fresh) {
        const imp = colarb.oc2.wrapper()[method](body) as Vec3;
        const zi = imp.zpp_inner;
        if (zi._validate != null) zi._validate();
        retx += zi.x;
        if (zi._validate != null) zi._validate();
        rety += zi.y;
        if (zi._validate != null) zi._validate();
        retz += zi.z;
        imp.dispose();
      }
    }
    return Vec3.get(retx, rety, retz);
  }
}

// Self-register in the compiled namespace
