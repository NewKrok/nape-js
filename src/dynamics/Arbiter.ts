import { getNape } from "../core/engine";
import { Vec3 } from "../geom/Vec3";
import type { NapeInner } from "../geom/Vec2";
import { ZPP_Arbiter } from "../native/dynamics/ZPP_Arbiter";
import { ZPP_Flags } from "../native/util/ZPP_Flags";
import type { ArbiterType } from "./ArbiterType";
import type { Shape } from "../shape/Shape";
import type { Body } from "../phys/Body";
import type { CollisionArbiter } from "./CollisionArbiter";
import type { FluidArbiter } from "./FluidArbiter";
import type { PreFlag } from "../callbacks/PreFlag";

/**
 * Represents an interaction arbiter between two shapes.
 *
 * Arbiters are pooled internally by the engine — they cannot be created directly.
 * Access arbiters via `Space.arbiters`, `Body.arbiters`, or callback handlers.
 *
 * Fully modernized — uses extracted ZPP_Arbiter directly.
 */
export class Arbiter {
  static __name__ = ["nape", "dynamics", "Arbiter"];

  /** @internal */
  zpp_inner: ZPP_Arbiter;

  /** @internal Backward-compat: compiled code accesses `obj.zpp_inner`. */
  get _inner(): NapeInner {
    return this;
  }

  constructor() {
    this.zpp_inner = null as any;
    if (!ZPP_Arbiter.internal) {
      throw new Error("Error: Cannot instantiate Arbiter derp!");
    }
  }

  // ---------------------------------------------------------------------------
  // Properties (read-only)
  // ---------------------------------------------------------------------------

  /** Whether this arbiter is currently sleeping. */
  get isSleeping(): boolean {
    this._activeCheck();
    return this.zpp_inner.sleeping;
  }

  /** The type of this arbiter (COLLISION, SENSOR, or FLUID). */
  get type(): ArbiterType {
    return ZPP_Arbiter.types[this.zpp_inner.type];
  }

  /** Cast to CollisionArbiter if this is a collision, else null. */
  get collisionArbiter(): CollisionArbiter | null {
    if (this.zpp_inner.type == ZPP_Arbiter.COL) {
      return this.zpp_inner.colarb.outer_zn;
    }
    return null;
  }

  /** Cast to FluidArbiter if this is a fluid interaction, else null. */
  get fluidArbiter(): FluidArbiter | null {
    if (this.zpp_inner.type == ZPP_Arbiter.FLUID) {
      return this.zpp_inner.fluidarb.outer_zn;
    }
    return null;
  }

  /** First shape (lower id). */
  get shape1(): Shape {
    this._activeCheck();
    return this.zpp_inner.ws1.id > this.zpp_inner.ws2.id
      ? this.zpp_inner.ws2.outer
      : this.zpp_inner.ws1.outer;
  }

  /** Second shape (higher id). */
  get shape2(): Shape {
    this._activeCheck();
    return this.zpp_inner.ws1.id > this.zpp_inner.ws2.id
      ? this.zpp_inner.ws1.outer
      : this.zpp_inner.ws2.outer;
  }

  /** Body of shape1. */
  get body1(): Body {
    this._activeCheck();
    return this.zpp_inner.ws1.id > this.zpp_inner.ws2.id
      ? this.zpp_inner.b2.outer
      : this.zpp_inner.b1.outer;
  }

  /** Body of shape2. */
  get body2(): Body {
    this._activeCheck();
    return this.zpp_inner.ws1.id > this.zpp_inner.ws2.id
      ? this.zpp_inner.b1.outer
      : this.zpp_inner.b2.outer;
  }

  /** The pre-handler state of this arbiter. */
  get state(): PreFlag {
    this._activeCheck();
    const nape = getNape();
    const s = this.zpp_inner.immState;
    if (s == 5) {
      if (ZPP_Flags.PreFlag_ACCEPT == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.PreFlag_ACCEPT = new nape.callbacks.PreFlag();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.PreFlag_ACCEPT;
    } else if (s == 1) {
      if (ZPP_Flags.PreFlag_ACCEPT_ONCE == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.PreFlag_ACCEPT_ONCE = new nape.callbacks.PreFlag();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.PreFlag_ACCEPT_ONCE;
    } else if (s == 6) {
      if (ZPP_Flags.PreFlag_IGNORE == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.PreFlag_IGNORE = new nape.callbacks.PreFlag();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.PreFlag_IGNORE;
    } else {
      if (ZPP_Flags.PreFlag_IGNORE_ONCE == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.PreFlag_IGNORE_ONCE = new nape.callbacks.PreFlag();
        ZPP_Flags.internal = false;
      }
      return ZPP_Flags.PreFlag_IGNORE_ONCE;
    }
  }

  // ---------------------------------------------------------------------------
  // Type checks
  // ---------------------------------------------------------------------------

  /** Whether this is a collision arbiter. */
  isCollisionArbiter(): boolean {
    return this.zpp_inner.type == ZPP_Arbiter.COL;
  }

  /** Whether this is a fluid arbiter. */
  isFluidArbiter(): boolean {
    return this.zpp_inner.type == ZPP_Arbiter.FLUID;
  }

  /** Whether this is a sensor arbiter. */
  isSensorArbiter(): boolean {
    return this.zpp_inner.type == ZPP_Arbiter.SENSOR;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /**
   * Total impulse of this arbiter. Base implementation returns Vec3(0,0,0).
   * Overridden by CollisionArbiter and FluidArbiter.
   */
  totalImpulse(body: Body | null = null, _freshOnly: boolean = false): Vec3 {
    this._activeCheck();
    if (body != null) {
      this._checkBody(body);
    }
    return Vec3.get(0, 0, 0);
  }

  toString(): string {
    const ret =
      this.zpp_inner.type == ZPP_Arbiter.COL
        ? "CollisionArbiter"
        : this.zpp_inner.type == ZPP_Arbiter.FLUID
          ? "FluidArbiter"
          : "SensorArbiter";
    if (this.zpp_inner.cleared) {
      return ret + "(object-pooled)";
    }
    this._activeCheck();
    const s1 =
      this.zpp_inner.ws1.id > this.zpp_inner.ws2.id
        ? this.zpp_inner.ws2.outer
        : this.zpp_inner.ws1.outer;
    const s2 =
      this.zpp_inner.ws1.id > this.zpp_inner.ws2.id
        ? this.zpp_inner.ws1.outer
        : this.zpp_inner.ws2.outer;
    let result = ret + "(" + s1.toString() + "|" + s2.toString() + ")";
    if (this.zpp_inner.type == ZPP_Arbiter.COL) {
      result += "[" + ["SD", "DD"][this.zpp_inner.colarb.stat ? 0 : 1] + "]";
    }
    result += "<-" + this.state.toString();
    return result;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** @internal */
  protected _activeCheck(): void {
    if (!this.zpp_inner.active) {
      throw new Error("Error: Arbiter not currently in use");
    }
  }

  /** @internal */
  protected _checkBody(body: Body): void {
    const inner = this.zpp_inner;
    const b1 = inner.ws1.id > inner.ws2.id ? inner.b2.outer : inner.b1.outer;
    const b2 = inner.ws1.id > inner.ws2.id ? inner.b1.outer : inner.b2.outer;
    if (body != b1 && body != b2) {
      throw new Error("Error: Arbiter does not relate to body");
    }
  }
}

// Self-register in the compiled namespace
const nape = getNape();
nape.dynamics.Arbiter = Arbiter;
