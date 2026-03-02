import { getNape } from "../core/engine";
import { Vec3 } from "../geom/Vec3";
import { Arbiter } from "./Arbiter";
import { ZPP_Arbiter } from "../native/dynamics/ZPP_Arbiter";

type Any = any;

/**
 * A collision arbiter between two shapes in contact.
 *
 * Provides access to contact points, collision normal, friction, elasticity,
 * and impulse information. Some properties are mutable only in pre-handlers.
 *
 * Fully modernized — uses extracted ZPP_ColArbiter directly.
 */
export class CollisionArbiter extends Arbiter {
  static override __name__ = ["nape", "dynamics", "CollisionArbiter"];
  static __super__ = Arbiter;

  constructor() {
    super();
  }

  // ---------------------------------------------------------------------------
  // Properties (read-only)
  // ---------------------------------------------------------------------------

  /** Contact points for this collision. */
  get contacts(): Any {
    this._activeCheck();
    if (this.zpp_inner.colarb.wrap_contacts == null) {
      this.zpp_inner.colarb.setupcontacts();
    }
    return this.zpp_inner.colarb.wrap_contacts;
  }

  /** Collision normal vector. */
  get normal(): Any {
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
  get referenceEdge1(): Any {
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
  get referenceEdge2(): Any {
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

  /** Coefficient of restitution (elasticity). Mutable in pre-handler only. */
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

  /** Dynamic friction coefficient. Mutable in pre-handler only. */
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

  /** Static friction coefficient. Mutable in pre-handler only. */
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

  /** Rolling friction coefficient. Mutable in pre-handler only. */
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

  /** Normal impulse accumulated across all contacts. */
  normalImpulse(body: Any = null, freshOnly: boolean = false): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    return this._accumulateImpulse("normalImpulse", body, freshOnly);
  }

  /** Tangent (friction) impulse accumulated across all contacts. */
  tangentImpulse(body: Any = null, freshOnly: boolean = false): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    return this._accumulateImpulse("tangentImpulse", body, freshOnly);
  }

  /** Total impulse (normal + tangent + rolling) accumulated across all contacts. */
  override totalImpulse(body: Any = null, freshOnly: boolean = false): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    return this._accumulateImpulse("totalImpulse", body, freshOnly);
  }

  /** Rolling impulse for this collision. */
  rollingImpulse(body: Any = null, freshOnly: boolean = false): number {
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
  private _accumulateImpulse(method: string, body: Any, freshOnly: boolean): Vec3 {
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
const nape = getNape();
nape.dynamics.CollisionArbiter = CollisionArbiter;
(CollisionArbiter.prototype as any).__class__ = CollisionArbiter;
