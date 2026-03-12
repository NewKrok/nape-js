import { getNape, ensureEnumsReady } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_CbType } from "../native/callbacks/ZPP_CbType";
import { ZPP_InteractorList, ZPP_ConstraintList } from "../native/util/ZPP_PublicList";
import type { NapeInner } from "../geom/Vec2";
import type { OptionType } from "./OptionType";

/**
 * Callback type tag — used to label bodies, shapes, and constraints so that
 * listeners can selectively respond to interactions involving specific objects.
 *
 * Objects can carry multiple `CbType`s (via their `cbTypes` list). Listeners
 * match against those types using {@link OptionType} include/exclude filters,
 * or using the built-in singletons (`ANY_BODY`, `ANY_SHAPE`, etc.).
 *
 * @example
 * ```ts
 * const playerType = new CbType();
 * body.cbTypes.add(playerType);
 *
 * const listener = new InteractionListener(
 *   CbEvent.BEGIN,
 *   InteractionType.COLLISION,
 *   playerType,
 *   null,
 *   (cb) => { console.log('player hit something'); },
 * );
 * space.listeners.add(listener);
 * ```
 *
 * Converted from nape-compiled.js lines 689–770.
 */
export class CbType {
  /** @internal */
  zpp_inner: ZPP_CbType;

  /** @internal */
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

  /**
   * Built-in type automatically assigned to every {@link Body}.
   * Use in listeners to respond to all bodies without a custom `CbType`.
   */
  static get ANY_BODY(): CbType {
    return ZPP_CbType.ANY_BODY as any;
  }

  /**
   * Built-in type automatically assigned to every {@link Constraint}.
   *
   * **Note:** Constraints do NOT automatically carry `ANY_CONSTRAINT` in their
   * `cbTypes` list — you must add a custom CbType manually if you want to filter
   * constraint events.
   */
  static get ANY_CONSTRAINT(): CbType {
    return ZPP_CbType.ANY_CONSTRAINT as any;
  }

  /**
   * Built-in type automatically assigned to every {@link Shape}.
   * Use in listeners to respond to all shapes without a custom `CbType`.
   */
  static get ANY_SHAPE(): CbType {
    return ZPP_CbType.ANY_SHAPE as any;
  }

  /**
   * Built-in type automatically assigned to every {@link Compound}.
   * Use in listeners to respond to all compounds without a custom `CbType`.
   */
  static get ANY_COMPOUND(): CbType {
    return ZPP_CbType.ANY_COMPOUND as any;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /** Unique numeric identifier for this `CbType` instance. */
  get id(): number {
    return this.zpp_inner.id;
  }

  /**
   * Arbitrary user data attached to this `CbType`.
   *
   * Lazily initialized to `{}` on first access. Use to store application-level
   * metadata associated with the type.
   */
  get userData(): Record<string, unknown> {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  }

  /**
   * Live list of all interactors (bodies/shapes/compounds) currently tagged
   * with this `CbType`. Read-only.
   */
  // InteractorList is factory-generated; no static TS type available
  get interactors(): object {
    if (this.zpp_inner.wrap_interactors == null) {
      this.zpp_inner.wrap_interactors = ZPP_InteractorList.get(this.zpp_inner.interactors, true);
    }
    return this.zpp_inner.wrap_interactors;
  }

  /**
   * Live list of all constraints currently tagged with this `CbType`. Read-only.
   */
  // ConstraintList is factory-generated; no static TS type available
  get constraints(): object {
    if (this.zpp_inner.wrap_constraints == null) {
      this.zpp_inner.wrap_constraints = ZPP_ConstraintList.get(this.zpp_inner.constraints, true);
    }
    return this.zpp_inner.wrap_constraints;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /**
   * Creates a new {@link OptionType} that includes this type and also `includes`.
   *
   * Shorthand for `new OptionType(this).including(includes)`.
   *
   * @param includes - Additional `CbType` or `OptionType` to require.
   */
  including(includes: CbType | OptionType): OptionType {
    return new (getNape().callbacks.OptionType)(this).including(includes);
  }

  /**
   * Creates a new {@link OptionType} that includes this type but excludes `excludes`.
   *
   * Shorthand for `new OptionType(this).excluding(excludes)`.
   *
   * @param excludes - `CbType` or `OptionType` to reject.
   */
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

  /** @internal */
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
