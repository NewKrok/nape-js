import { getNape } from "../core/engine";
import { Vec2 } from "../geom/Vec2";
import { Vec3 } from "../geom/Vec3";
import { Arbiter } from "./Arbiter";

type Any = any;

/**
 * A fluid arbiter between two shapes with fluid interaction.
 *
 * Provides access to buoyancy/drag impulses, overlap area, and position.
 * Some properties are mutable only in pre-handlers.
 *
 * Thin wrapper — delegates to compiled ZPP_Arbiter/ZPP_FluidArbiter (not yet extracted).
 */
export class FluidArbiter extends Arbiter {
  static override __name__ = ["nape", "dynamics", "FluidArbiter"];
  static __super__ = Arbiter;

  constructor() {
    super();
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /** Centre of the overlap region. Mutable in pre-handler only. */
  get position(): Vec2 {
    this._activeCheck();
    if (this.zpp_inner.fluidarb.wrap_position == null) {
      this.zpp_inner.fluidarb.getposition();
    }
    return Vec2._wrap(this.zpp_inner.fluidarb.wrap_position);
  }
  set position(value: Vec2) {
    if (!this.zpp_inner.fluidarb.mutable) {
      throw new Error(
        "Error: Arbiter is mutable only within a pre-handler",
      );
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

  /** Area of the overlap region. Mutable in pre-handler only. */
  get overlap(): number {
    this._activeCheck();
    return this.zpp_inner.fluidarb.overlap;
  }
  set overlap(value: number) {
    if (!this.zpp_inner.fluidarb.mutable) {
      throw new Error(
        "Error: Arbiter is mutable only within a pre-handler",
      );
    }
    if (value !== value) {
      throw new Error("Error: FluidArbiter::overlap cannot be NaN");
    }
    if (value <= 0 || value == Infinity) {
      throw new Error(
        "Error: FluidArbiter::overlap must be strictly positive and non infinite",
      );
    }
    this.zpp_inner.fluidarb.overlap = value;
  }

  // ---------------------------------------------------------------------------
  // Impulse methods
  // ---------------------------------------------------------------------------

  /** Buoyancy impulse applied by this fluid arbiter. */
  buoyancyImpulse(body: Any = null): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    const farb = this.zpp_inner.fluidarb;
    if (body == null) {
      return Vec3.get(farb.buoyx, farb.buoyy, 0);
    } else if (body.zpp_inner == this.zpp_inner.b2) {
      return Vec3.get(
        farb.buoyx,
        farb.buoyy,
        farb.buoyy * farb.r2x - farb.buoyx * farb.r2y,
      );
    } else {
      return Vec3.get(
        -farb.buoyx,
        -farb.buoyy,
        -(farb.buoyy * farb.r1x - farb.buoyx * farb.r1y),
      );
    }
  }

  /** Drag impulse applied by this fluid arbiter. */
  dragImpulse(body: Any = null): Vec3 {
    this._activeCheck();
    if (body != null) this._checkBody(body);
    const farb = this.zpp_inner.fluidarb;
    const scale =
      body == null || body.zpp_inner == this.zpp_inner.b2 ? 1 : -1;
    return Vec3.get(
      farb.dampx * scale,
      farb.dampy * scale,
      farb.adamp * scale,
    );
  }

  /** Total impulse (buoyancy + drag). */
  override totalImpulse(
    body: Any = null,
    freshOnly: boolean = false,
  ): Vec3 {
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
const nape = getNape();
nape.dynamics.FluidArbiter = FluidArbiter;
(FluidArbiter.prototype as any).__class__ = FluidArbiter;
