import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_OptionType } from "../native/callbacks/ZPP_OptionType";
import type { NapeInner } from "../geom/Vec2";
import type { CbType } from "./CbType";

/**
 * Composite callback option type — combines include and exclude {@link CbType} lists
 * to express complex listener filter conditions.
 *
 * An interaction satisfies an `OptionType` when the interactor has **at least one**
 * of the included types and **none** of the excluded types.
 *
 * @example
 * ```ts
 * // Listen only for bodies that are "enemy" but not "boss"
 * const filter = new OptionType(enemyType).excluding(bossType);
 * const listener = new BodyListener(CbEvent.WAKE, filter, (cb) => { ... });
 * ```
 *
 * Converted from nape-compiled.js lines 2647–2698.
 */
export class OptionType {
  static __name__ = ["nape", "callbacks", "OptionType"];

  /** @internal */
  zpp_inner: ZPP_OptionType;

  /** @internal */
  get _inner(): NapeInner {
    return this;
  }

  /**
   * Creates an `OptionType` optionally seeded with initial include/exclude entries.
   *
   * @param includes - Initial type(s) to include.
   * @param excludes - Initial type(s) to exclude.
   */
  constructor(includes?: CbType | OptionType, excludes?: CbType | OptionType) {
    this.zpp_inner = new ZPP_OptionType();
    this.zpp_inner.outer = this;
    if (includes != null) {
      this.including(includes);
    }
    if (excludes != null) {
      this.excluding(excludes);
    }
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /** Live list of `CbType`s that an interactor must have at least one of. */
  // CbTypeList is factory-generated; no static TS type available
  get includes(): object {
    if (this.zpp_inner.wrap_includes == null) {
      this.zpp_inner.setup_includes();
    }
    return this.zpp_inner.wrap_includes;
  }

  /** Live list of `CbType`s that an interactor must have none of. */
  get excludes(): object {
    if (this.zpp_inner.wrap_excludes == null) {
      this.zpp_inner.setup_excludes();
    }
    return this.zpp_inner.wrap_excludes;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /**
   * Adds `includes` to the include list and returns `this` for chaining.
   *
   * @param includes - `CbType` or `OptionType` whose types should be added to includes.
   */
  including(includes: CbType | OptionType): this {
    this.zpp_inner.append(this.zpp_inner.includes, includes);
    return this;
  }

  /**
   * Adds `excludes` to the exclude list and returns `this` for chaining.
   *
   * @param excludes - `CbType` or `OptionType` whose types should be added to excludes.
   */
  excluding(excludes: CbType | OptionType): this {
    this.zpp_inner.append(this.zpp_inner.excludes, excludes);
    return this;
  }

  toString(): string {
    if (this.zpp_inner.wrap_includes == null) {
      this.zpp_inner.setup_includes();
    }
    const inc = this.zpp_inner.wrap_includes.toString();
    if (this.zpp_inner.wrap_excludes == null) {
      this.zpp_inner.setup_excludes();
    }
    const exc = this.zpp_inner.wrap_excludes.toString();
    return "@{" + inc + " excluding " + exc + "}";
  }

  // ---------------------------------------------------------------------------
  // Wrapping
  // ---------------------------------------------------------------------------

  /** @internal */
  static _wrap(inner: any): OptionType {
    if (inner instanceof OptionType) return inner;
    if (!inner) return null as unknown as OptionType;
    if (inner instanceof ZPP_OptionType) {
      return getOrCreate(inner, (zpp: ZPP_OptionType) => {
        const o = Object.create(OptionType.prototype) as OptionType;
        o.zpp_inner = zpp;
        zpp.outer = o;
        return o;
      });
    }
    if (inner.zpp_inner) return OptionType._wrap(inner.zpp_inner);
    return null as unknown as OptionType;
  }
}

// Self-register in the compiled namespace
const nape = getNape();
nape.callbacks.OptionType = OptionType;
