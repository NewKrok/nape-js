import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner } from "./Vec2";
import { ZPP_ConvexRayResult } from "../native/geom/ZPP_ConvexRayResult";

type Any = any;

/**
 * Result from a raycast query.
 *
 * Provides the contact normal, distance, inside-flag, and shape hit.
 * Instances are pooled — call `dispose()` when done to return to pool.
 */
export class RayResult {
  static __name__ = ["nape", "geom", "RayResult"];

  /** @internal */
  zpp_inner: ZPP_ConvexRayResult;

  /** @internal Backward-compat: compiled code accesses `obj.zpp_inner`. */
  get _inner(): NapeInner {
    return this;
  }

  constructor() {
    this.zpp_inner = null!;
    if (!ZPP_ConvexRayResult.internal) {
      throw new Error("Error: RayResult cannot be instantiated derp!");
    }
  }

  /** @internal */
  static _wrap(inner: Any): RayResult {
    if (!inner) return null as unknown as RayResult;
    if (inner instanceof RayResult) return inner;
    const zppInner = inner.zpp_inner ?? inner;
    return getOrCreate(zppInner, (raw: Any) => {
      const r = Object.create(RayResult.prototype) as RayResult;
      r.zpp_inner = raw;
      return r;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties (read-only)
  // ---------------------------------------------------------------------------

  get normal(): Vec2 {
    this._disposed();
    return Vec2._wrap(this.zpp_inner.normal);
  }

  get distance(): number {
    this._disposed();
    return this.zpp_inner.toiDistance;
  }

  get inner(): boolean {
    this._disposed();
    return this.zpp_inner.inner;
  }

  get shape(): Any {
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
      "{ shape: " +
      String(this.zpp_inner.shape) +
      " distance: " +
      this.zpp_inner.toiDistance +
      " ?inner: " +
      String(this.zpp_inner.inner) +
      " }"
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

// Register factory callback so ZPP_ConvexRayResult can create RayResult without circular import
ZPP_ConvexRayResult._createRayResult = () => new RayResult();

// Self-register in the compiled namespace
const nape = getNape();
nape.geom.RayResult = RayResult;
(RayResult.prototype as any).__class__ = RayResult;
