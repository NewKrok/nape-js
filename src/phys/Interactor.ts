import { getOrCreate } from "../core/cache";
import { InteractionGroup } from "../dynamics/InteractionGroup";
import type { NapeInner, Writable } from "../geom/Vec2";

// ---------------------------------------------------------------------------
// Subclass wrap bindings — Body and Shape register their _wrap functions
// here at module load time to avoid circular imports.
// ---------------------------------------------------------------------------

type SubclassWrapFn = (inner: NapeInner) => Interactor;
let _bodyWrap: SubclassWrapFn | undefined;
let _shapeWrap: SubclassWrapFn | undefined;
let _compoundWrap: SubclassWrapFn | undefined;

/** @internal Called by Body at module init. */
export function _bindBodyWrapForInteractor(fn: SubclassWrapFn): void {
  _bodyWrap = fn;
}
/** @internal Called by Shape at module init. */
export function _bindShapeWrapForInteractor(fn: SubclassWrapFn): void {
  _shapeWrap = fn;
}
/** @internal Called by Compound at module init. */
export function _bindCompoundWrapForInteractor(fn: SubclassWrapFn): void {
  _compoundWrap = fn;
}

/**
 * Base class for all interactable physics objects (Body, Shape, Compound).
 *
 * Cannot be instantiated directly — only via Body, Shape, or Compound.
 * Provides shared properties: id, userData, group, cbTypes, and type
 * casting methods (castBody, castShape, castCompound).
 *
 * Fully modernized — all methods use ZPP_Interactor fields directly
 * via `zpp_inner_i` (no compiled prototype delegation).
 */
export class Interactor {
  /**
   * @internal ZPP_Interactor-compatible object set by subclass constructors.
   * For fully modernized subclasses (Body, Compound): this is the ZPP_Body/ZPP_Compound.
   * For thin wrappers (Circle, Polygon): this is copied from the compiled inner object.
   */
  zpp_inner_i: any;

  /**
   * @internal Backward-compatible accessor for compiled Shape/Circle/Polygon code.
   * Thin wrappers set this to the compiled inner object; modernized subclasses set
   * it to `this`. Shape-level methods still delegate through this.
   */
  readonly _inner: NapeInner;

  /** @internal – only subclasses may construct. */
  protected constructor() {
    (this as Writable<Interactor>)._inner = undefined!;
    this.zpp_inner_i = null;
  }

  /** @internal Wrap a compiled Interactor (Body/Shape/Compound) instance. */
  static _wrap(inner: NapeInner): Interactor {
    if (!inner) return null as unknown as Interactor;
    if (inner instanceof Interactor) return inner;

    // Dispatch to concrete subclass wrapper based on runtime type
    if (inner.isBody && inner.isBody() && _bodyWrap) return _bodyWrap(inner);
    if (inner.isShape && inner.isShape() && _shapeWrap) return _shapeWrap(inner);
    if (inner.isCompound && inner.isCompound() && _compoundWrap)
      return _compoundWrap(inner);

    // Fallback: generic Interactor wrapper
    return getOrCreate(inner, (raw: NapeInner) => {
      const i = Object.create(Interactor.prototype) as Interactor;
      (i as Writable<Interactor>)._inner = raw;
      i.zpp_inner_i = raw.zpp_inner_i ?? raw;
      return i;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties — direct ZPP_Interactor field access
  // ---------------------------------------------------------------------------

  /** Unique numeric identifier for this interactor. */
  get id(): number {
    return this.zpp_inner_i.id;
  }

  /** User-defined data storage object. */
  get userData(): Record<string, unknown> {
    if (this.zpp_inner_i.userData == null) {
      this.zpp_inner_i.userData = {};
    }
    return this.zpp_inner_i.userData;
  }

  /** The interaction group this interactor belongs to. */
  get group(): InteractionGroup | null {
    if (this.zpp_inner_i.group == null) return null;
    return this.zpp_inner_i.group.outer;
  }
  set group(value: InteractionGroup | null) {
    this.zpp_inner_i.immutable_midstep("Interactor::group");
    this.zpp_inner_i.setGroup(
      value == null ? null : (value as any).zpp_inner,
    );
  }

  /** Callback types assigned to this interactor. */
  get cbTypes(): any {
    if (this.zpp_inner_i.wrap_cbTypes == null) {
      this.zpp_inner_i.setupcbTypes();
    }
    return this.zpp_inner_i.wrap_cbTypes;
  }

  /** Cast to Body — returns the Body wrapper if this is a Body, else null. */
  get castBody(): any {
    if (this.zpp_inner_i.ibody != null) {
      const outer = this.zpp_inner_i.ibody.outer;
      return _bodyWrap ? _bodyWrap(outer) : outer;
    }
    return null;
  }

  /** Cast to Shape — returns the Shape wrapper if this is a Shape, else null. */
  get castShape(): any {
    if (this.zpp_inner_i.ishape != null) {
      const outer = this.zpp_inner_i.ishape.outer;
      return _shapeWrap ? _shapeWrap(outer) : outer;
    }
    return null;
  }

  /** Cast to Compound — returns the Compound wrapper if this is a Compound, else null. */
  get castCompound(): any {
    if (this.zpp_inner_i.icompound != null) {
      const outer = this.zpp_inner_i.icompound.outer;
      return _compoundWrap ? _compoundWrap(outer) : outer;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /** Returns true if this interactor is a Shape. */
  isShape(): boolean {
    return this.zpp_inner_i.ishape != null;
  }

  /** Returns true if this interactor is a Body. */
  isBody(): boolean {
    return this.zpp_inner_i.ibody != null;
  }

  /** Returns true if this interactor is a Compound. */
  isCompound(): boolean {
    return this.zpp_inner_i.icompound != null;
  }

  toString(): string {
    return "";
  }
}
