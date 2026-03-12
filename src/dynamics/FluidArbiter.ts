import { Vec2 } from "../geom/Vec2";
import { Vec3 } from "../geom/Vec3";
import { Arbiter } from "./Arbiter";
import type { Body } from "../phys/Body";

/**
 * An arbiter representing a fluid interaction between a fluid shape and a body.
 *
 * Provides access to buoyancy and drag impulses, the overlap area, and the
 * centre of overlap. Properties marked _mutable in pre-handler_ can only be
 * set within a {@link PreListener} handler.
 *
 * Obtain via {@link Arbiter.fluidArbiter} or by casting from a callback arbiter.
 *
 * Fully modernized — uses extracted ZPP_FluidArbiter directly.
 */
export class FluidArbiter extends Arbiter {
  constructor() {
    super();
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /**
   * Centre of the overlap region between the fluid and the body shape.
   * _Mutable in pre-handler only._
   */
  get position(): Vec2 {
    this._activeCheck();
    if (this.zpp_inner.fluidarb.wrap_position == null) {
      this.zpp_inner.fluidarb.getposition();
    }
    return Vec2._wrap(this.zpp_inner.fluidarb.wrap_position);
  }
  set position(value: Vec2) {
    if (!this.zpp_inner.fluidarb.mutable) {
      throw new Error("Error: Arbiter is mutable only within a pre-handler");
    }
    if (value == null) {
      throw new Error("Error: FluidArbiter::position cannot be null");
    }
    this._activeCheck();
    if (this.zpp_inner.fluidarb.wrap_position == null) {
      this.zpp_inner.fluidarb.getposition();
    }
    const pos = this.zpp_inner.fluidarb.wrap_position;
    pos.set(value);
  }

  /**
   * Area of the overlap region in pixels². Used to compute buoyancy force.
   * Must be strictly positive and finite.
   * _Mutable in pre-handler only._
   */
  get overlap(): number {
    this._activeCheck();
    return this.zpp_inner.fluidarb.overlap;
  }
  set overlap(value: number) {
    if (!this.zpp_inner.fluidarb.mutable) {
      throw new Error("Error: Arbiter is mutable only within a pre-handler");
    }
    if (value !== value) {
      throw new Error("Error: FluidArbiter::overlap cannot be NaN");
    }
    if (value <= 0 || value == Infinity) {
      throw new Error("Error: FluidArbiter::overlap must be strictly positive and non infinite");
    }
    this.zpp_inner.fluidarb.overlap = value;
  }

  // ---------------------------------------------------------------------------
  // Impulse methods
  // ---------------------------------------------------------------------------

  /**
   * Buoyancy impulse applied in the last step as `(fx, fy, torque)`.
   * @param body - One of the two bodies, or `null` for the combined value.
   */
  buoyancyImpulse(body: Body | null = null): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    const farb = this.zpp_inner.fluidarb;
    if (body == null) {
      return Vec3.get(farb.buoyx, farb.buoyy, 0);
    } else if (body.zpp_inner == this.zpp_inner.b2) {
      return Vec3.get(farb.buoyx, farb.buoyy, farb.buoyy * farb.r2x - farb.buoyx * farb.r2y);
    } else {
      return Vec3.get(-farb.buoyx, -farb.buoyy, -(farb.buoyy * farb.r1x - farb.buoyx * farb.r1y));
    }
  }

  /**
   * Linear and angular drag impulse applied in the last step as `(fx, fy, torque)`.
   * @param body - One of the two bodies, or `null` for the combined value.
   */
  dragImpulse(body: Body | null = null): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    const farb = this.zpp_inner.fluidarb;
    const scale = body == null || body.zpp_inner == this.zpp_inner.b2 ? 1 : -1;
    return Vec3.get(farb.dampx * scale, farb.dampy * scale, farb.adamp * scale);
  }

  /** Total impulse (buoyancy + drag). */
  override totalImpulse(body: Body | null = null, _freshOnly: boolean = false): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    const buoy = this.buoyancyImpulse(body);
    const drag = this.dragImpulse(body);
    // Add buoyancy into drag result
    const bzi = buoy.zpp_inner;
    const dzi = drag.zpp_inner;
    if (bzi._validate != null) bzi._validate();
    if (dzi._validate != null) dzi._validate();
    dzi.x = dzi.x + bzi.x;
    if (bzi._validate != null) bzi._validate();
    if (dzi._validate != null) dzi._validate();
    dzi.y = dzi.y + bzi.y;
    if (bzi._validate != null) bzi._validate();
    if (dzi._validate != null) dzi._validate();
    dzi.z = dzi.z + bzi.z;
    buoy.dispose();
    return drag;
  }
}

// Self-register in the compiled namespace
