import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner } from "./Vec2";
import { ZPP_ConvexRayResult } from "../native/geom/ZPP_ConvexRayResult";
import type { Shape } from "../shape/Shape";

/**
 * Result from a convex-cast query.
 *
 * Provides the contact normal, position, time-of-impact, and shape hit.
 * Instances are pooled — call `dispose()` when done to return to pool.
 */
export class ConvexResult {
  static __name__ = ["nape", "geom", "ConvexResult"];

  /** @internal */
  zpp_inner: ZPP_ConvexRayResult;

  /** @internal Backward-compat: compiled code accesses `obj.zpp_inner`. */
  get _inner(): NapeInner {
    return this;
  }

  constructor() {
    this.zpp_inner = null!;
    if (!ZPP_ConvexRayResult.internal) {
      throw new Error("Error: ConvexResult cannot be instantiated derp!");
    }
  }

  /** @internal */
  static _wrap(inner: ZPP_ConvexRayResult | ConvexResult | null): ConvexResult {
    if (!inner) return null as unknown as ConvexResult;
    if (inner instanceof ConvexResult) return inner;
    const zppInner = (inner as any).zpp_inner ?? inner;
    return getOrCreate(zppInner, (raw: ZPP_ConvexRayResult) => {
      const c = Object.create(ConvexResult.prototype) as ConvexResult;
      c.zpp_inner = raw;
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties (read-only)
  // ---------------------------------------------------------------------------

  get normal(): Vec2 {
    this._disposed();
    return Vec2._wrap(this.zpp_inner.normal);
  }

  get position(): Vec2 {
    this._disposed();
    return Vec2._wrap(this.zpp_inner.position);
  }

  get toi(): number {
    this._disposed();
    return this.zpp_inner.toiDistance;
  }

  get shape(): Shape {
    this._disposed();
    return this.zpp_inner.shape;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  dispose(): void {
    this._disposed();
    this.zpp_inner.free();
  }

  toString(): string {
    this._disposed();
    return (
      "{ shape: " + String(this.zpp_inner.shape) + " toi: " + this.zpp_inner.toiDistance + " }"
    );
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** @internal */
  private _disposed(): void {
    if (this.zpp_inner.next != null) {
      throw new Error("Error: This object has been disposed of and cannot be used");
    }
  }
}

// Register factory callback so ZPP_ConvexRayResult can create ConvexResult without circular import
ZPP_ConvexRayResult._createConvexResult = () => new ConvexResult();
