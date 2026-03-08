import { getNape, ensureEnumsReady } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_CbType } from "../native/callbacks/ZPP_CbType";
import { ZPP_InteractorList, ZPP_ConstraintList } from "../native/util/ZPP_PublicList";
import type { NapeInner } from "../geom/Vec2";
import type { OptionType } from "./OptionType";

/**
 * Callback type — used to tag interactors so that listeners
 * can filter which interactions they respond to.
 *
 * Converted from nape-compiled.js lines 689–770.
 */
export class CbType {
  static __name__ = ["nape", "callbacks", "CbType"];

  zpp_inner: ZPP_CbType;

  get _inner(): NapeInner {
    return this;
  }

  constructor() {
    this.zpp_inner = new ZPP_CbType();
    this.zpp_inner.outer = this;
  }

  // ---------------------------------------------------------------------------
  // Static built-in types
  // ---------------------------------------------------------------------------

  static get ANY_BODY(): CbType {
    return ZPP_CbType.ANY_BODY as any;
  }

  static get ANY_CONSTRAINT(): CbType {
    return ZPP_CbType.ANY_CONSTRAINT as any;
  }

  static get ANY_SHAPE(): CbType {
    return ZPP_CbType.ANY_SHAPE as any;
  }

  static get ANY_COMPOUND(): CbType {
    return ZPP_CbType.ANY_COMPOUND as any;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get id(): number {
    return this.zpp_inner.id;
  }

  get userData(): Record<string, unknown> {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  }

  // InteractorList is factory-generated; no static TS type available
  get interactors(): object {
    if (this.zpp_inner.wrap_interactors == null) {
      this.zpp_inner.wrap_interactors = ZPP_InteractorList.get(
        this.zpp_inner.interactors,
        true,
      );
    }
    return this.zpp_inner.wrap_interactors;
  }

  // ConstraintList is factory-generated; no static TS type available
  get constraints(): object {
    if (this.zpp_inner.wrap_constraints == null) {
      this.zpp_inner.wrap_constraints = ZPP_ConstraintList.get(
        this.zpp_inner.constraints,
        true,
      );
    }
    return this.zpp_inner.wrap_constraints;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  including(includes: CbType | OptionType): OptionType {
    return new (getNape().callbacks.OptionType)(this).including(includes);
  }

  excluding(excludes: CbType | OptionType): OptionType {
    return new (getNape().callbacks.OptionType)(this).excluding(excludes);
  }

  toString(): string {
    if ((this as any) === ZPP_CbType.ANY_BODY) {
      return "ANY_BODY";
    } else if ((this as any) === ZPP_CbType.ANY_SHAPE) {
      return "ANY_SHAPE";
    } else if ((this as any) === ZPP_CbType.ANY_COMPOUND) {
      return "ANY_COMPOUND";
    } else if ((this as any) === ZPP_CbType.ANY_CONSTRAINT) {
      return "ANY_CONSTRAINT";
    } else {
      return "CbType#" + this.zpp_inner.id;
    }
  }

  // ---------------------------------------------------------------------------
  // Wrapping
  // ---------------------------------------------------------------------------

  static _wrap(inner: any): CbType {
    if (inner instanceof CbType) return inner;
    if (!inner) return null as unknown as CbType;
    if (inner instanceof ZPP_CbType) {
      return getOrCreate(inner, (zpp: ZPP_CbType) => {
        const c = Object.create(CbType.prototype) as CbType;
        c.zpp_inner = zpp;
        zpp.outer = c;
        return c;
      });
    }
    if (inner.zpp_inner) return CbType._wrap(inner.zpp_inner);
    return null as unknown as CbType;
  }
}

// Self-register in the compiled namespace
const _napeForCbType = getNape();
_napeForCbType.callbacks.CbType = CbType;
ensureEnumsReady();

