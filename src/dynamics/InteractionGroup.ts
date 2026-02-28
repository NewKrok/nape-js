import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_InteractionGroup } from "../native/dynamics/ZPP_InteractionGroup";
import type { NapeInner } from "../geom/Vec2";

/**
 * Hierarchical interaction group for controlling interactions
 * between sets of interactors.
 *
 * Internally wraps a ZPP_InteractionGroup and is registered as
 * the public `nape.dynamics.InteractionGroup` class in the compiled namespace.
 *
 * Converted from nape-compiled.js lines 14641–14733.
 */
export class InteractionGroup {
  // --- Haxe metadata (required by compiled engine) ---
  static __name__ = ["nape", "dynamics", "InteractionGroup"];

  /** @internal The internal ZPP_InteractionGroup this wrapper owns. */
  zpp_inner: ZPP_InteractionGroup;

  /**
   * Backward-compatible accessor — returns `this` so that compiled engine
   * code that receives `group._inner` can still access `zpp_inner`.
   * @internal
   */
  get _inner(): NapeInner {
    return this;
  }

  constructor(ignore: boolean = false) {
    const zpp = new ZPP_InteractionGroup();
    this.zpp_inner = zpp;
    zpp.outer = this;

    if (zpp.ignore != ignore) {
      zpp.invalidate(true);
      zpp.ignore = ignore;
    }
  }

  /** @internal Wrap a ZPP_InteractionGroup (or legacy compiled InteractionGroup) with caching. */
  static _wrap(inner: any): InteractionGroup {
    if (inner instanceof InteractionGroup) return inner;
    if (!inner) return null as unknown as InteractionGroup;

    // If this is a ZPP_InteractionGroup, wrap it directly
    if (inner instanceof ZPP_InteractionGroup) {
      return getOrCreate(inner, (zpp: ZPP_InteractionGroup) => {
        const g = Object.create(InteractionGroup.prototype) as InteractionGroup;
        g.zpp_inner = zpp;
        zpp.outer = g;
        return g;
      });
    }

    // Legacy fallback: compiled InteractionGroup with zpp_inner
    if (inner.zpp_inner) {
      return InteractionGroup._wrap(inner.zpp_inner);
    }

    return null as unknown as InteractionGroup;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get group(): InteractionGroup | null {
    if (this.zpp_inner.group == null) {
      return null;
    }
    return this.zpp_inner.group.outer;
  }
  set group(value: InteractionGroup | null) {
    if (value === (this as any)) {
      throw new Error("Error: Cannot assign InteractionGroup to itself");
    }
    this.zpp_inner.setGroup(value == null ? null : value.zpp_inner);
  }

  get ignore(): boolean {
    return this.zpp_inner.ignore;
  }
  set ignore(value: boolean) {
    if (this.zpp_inner.ignore != value) {
      this.zpp_inner.invalidate(true);
      this.zpp_inner.ignore = value;
    }
  }

  get interactors(): any {
    if (this.zpp_inner.wrap_interactors == null) {
      const nape = getNape();
      this.zpp_inner.wrap_interactors = nape.zpp_nape.util.ZPP_InteractorList.get(
        this.zpp_inner.interactors,
        true,
      );
    }
    return this.zpp_inner.wrap_interactors;
  }

  get groups(): any {
    if (this.zpp_inner.wrap_groups == null) {
      const nape = getNape();
      this.zpp_inner.wrap_groups = nape.zpp_nape.util.ZPP_InteractionGroupList.get(
        this.zpp_inner.groups,
        true,
      );
    }
    return this.zpp_inner.wrap_groups;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  toString(): string {
    let ret = "InteractionGroup";
    if (this.zpp_inner.ignore) {
      ret += ":ignore";
    }
    return ret;
  }
}

// ---------------------------------------------------------------------------
// Register wrapper factory on ZPP_InteractionGroup so wrapper() returns our class
// ---------------------------------------------------------------------------
ZPP_InteractionGroup._wrapFn = (zpp: ZPP_InteractionGroup): InteractionGroup => {
  return getOrCreate(zpp, (raw: ZPP_InteractionGroup) => {
    const g = Object.create(InteractionGroup.prototype) as InteractionGroup;
    g.zpp_inner = raw;
    raw.outer = g;
    return g;
  });
};

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace (replaces compiled InteractionGroup)
// ---------------------------------------------------------------------------
const nape = getNape();
nape.dynamics.InteractionGroup = InteractionGroup;
InteractionGroup.prototype.__class__ = InteractionGroup;
