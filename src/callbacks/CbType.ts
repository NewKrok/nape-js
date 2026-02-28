import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_CbType } from "../native/callbacks/ZPP_CbType";
import type { NapeInner } from "../geom/Vec2";

type Any = any;

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
    return (ZPP_CbType as Any).ANY_BODY;
  }

  static get ANY_CONSTRAINT(): CbType {
    return (ZPP_CbType as Any).ANY_CONSTRAINT;
  }

  static get ANY_SHAPE(): CbType {
    return (ZPP_CbType as Any).ANY_SHAPE;
  }

  static get ANY_COMPOUND(): CbType {
    return (ZPP_CbType as Any).ANY_COMPOUND;
  }

  // ---------------------------------------------------------------------------
  // Static: get_* accessors (used by compiled code)
  // ---------------------------------------------------------------------------

  static get_ANY_BODY(): CbType {
    return (ZPP_CbType as Any).ANY_BODY;
  }

  static get_ANY_CONSTRAINT(): CbType {
    return (ZPP_CbType as Any).ANY_CONSTRAINT;
  }

  static get_ANY_SHAPE(): CbType {
    return (ZPP_CbType as Any).ANY_SHAPE;
  }

  static get_ANY_COMPOUND(): CbType {
    return (ZPP_CbType as Any).ANY_COMPOUND;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get id(): number {
    return this.zpp_inner.id;
  }

  get userData(): Any {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  }

  get interactors(): Any {
    const zpp = getNape().__zpp;
    if (this.zpp_inner.wrap_interactors == null) {
      this.zpp_inner.wrap_interactors = zpp.util.ZPP_InteractorList.get(
        this.zpp_inner.interactors,
        true,
      );
    }
    return this.zpp_inner.wrap_interactors;
  }

  get constraints(): Any {
    const zpp = getNape().__zpp;
    if (this.zpp_inner.wrap_constraints == null) {
      this.zpp_inner.wrap_constraints = zpp.util.ZPP_ConstraintList.get(
        this.zpp_inner.constraints,
        true,
      );
    }
    return this.zpp_inner.wrap_constraints;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  including(includes: Any): Any {
    return new (getNape().callbacks.OptionType)(this).including(includes);
  }

  excluding(excludes: Any): Any {
    return new (getNape().callbacks.OptionType)(this).excluding(excludes);
  }

  toString(): string {
    if (this === (ZPP_CbType as Any).ANY_BODY) {
      return "ANY_BODY";
    } else if (this === (ZPP_CbType as Any).ANY_SHAPE) {
      return "ANY_SHAPE";
    } else if (this === (ZPP_CbType as Any).ANY_COMPOUND) {
      return "ANY_COMPOUND";
    } else if (this === (ZPP_CbType as Any).ANY_CONSTRAINT) {
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
const nape = getNape();
nape.callbacks.CbType = CbType;
(CbType.prototype as Any).__class__ = CbType;

// Retroactively fix prototypes of ANY_* singletons created by the compiled stub
// before this module loaded. They have valid zpp_inner but wrong prototype chain.
const anyTypes = [
  (ZPP_CbType as Any).ANY_SHAPE,
  (ZPP_CbType as Any).ANY_BODY,
  (ZPP_CbType as Any).ANY_COMPOUND,
  (ZPP_CbType as Any).ANY_CONSTRAINT,
];
for (const inst of anyTypes) {
  if (inst && !(inst instanceof CbType)) {
    Object.setPrototypeOf(inst, CbType.prototype);
  }
}
