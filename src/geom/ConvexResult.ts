import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner } from "./Vec2";

type Any = any;

/**
 * Result from a convex-cast query.
 *
 * Thin wrapper — delegates to compiled ZPP_ConvexRayResult (not yet extracted).
 */
export class ConvexResult {
  static __name__ = ["nape", "geom", "ConvexResult"];

  /** @internal */
  zpp_inner: Any;

  /** @internal Backward-compat: compiled code accesses `obj.zpp_inner`. */
  get _inner(): NapeInner {
    return this;
  }

  constructor() {
    this.zpp_inner = null;
    const zpp = getNape().__zpp;
    if (!zpp.geom.ZPP_ConvexRayResult.internal) {
      throw new Error("Error: ConvexResult cannot be instantiated derp!");
    }
  }

  /** @internal */
  static _wrap(inner: Any): ConvexResult {
    if (!inner) return null as unknown as ConvexResult;
    if (inner instanceof ConvexResult) return inner;
    // inner is a compiled ConvexResult with a zpp_inner
    const zppInner = inner.zpp_inner ?? inner;
    return getOrCreate(zppInner, (raw: Any) => {
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
      " toi: " +
      this.zpp_inner.toiDistance +
      " }"
    );
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** @internal */
  private _disposed(): void {
    if (this.zpp_inner.next != null) {
      throw new Error(
        "Error: This object has been disposed of and cannot be used",
      );
    }
  }
}

// Self-register in the compiled namespace
const nape = getNape();
nape.geom.ConvexResult = ConvexResult;
ConvexResult.prototype.__class__ = ConvexResult;
