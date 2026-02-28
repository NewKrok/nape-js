import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_OptionType } from "../native/callbacks/ZPP_OptionType";
import type { NapeInner } from "../geom/Vec2";

type Any = any;

/**
 * Composite callback option type — allows including and excluding CbTypes.
 *
 * Converted from nape-compiled.js lines 2647–2698.
 */
export class OptionType {
  static __name__ = ["nape", "callbacks", "OptionType"];

  zpp_inner: ZPP_OptionType;

  get _inner(): NapeInner {
    return this;
  }

  constructor(includes?: Any, excludes?: Any) {
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

  get includes(): Any {
    if (this.zpp_inner.wrap_includes == null) {
      this.zpp_inner.setup_includes();
    }
    return this.zpp_inner.wrap_includes;
  }

  get excludes(): Any {
    if (this.zpp_inner.wrap_excludes == null) {
      this.zpp_inner.setup_excludes();
    }
    return this.zpp_inner.wrap_excludes;
  }

  // Compiled code compat accessors
  get_includes(): Any {
    return this.includes;
  }

  get_excludes(): Any {
    return this.excludes;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  including(includes: Any): this {
    this.zpp_inner.append(this.zpp_inner.includes, includes);
    return this;
  }

  excluding(excludes: Any): this {
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
(OptionType.prototype as Any).__class__ = OptionType;
