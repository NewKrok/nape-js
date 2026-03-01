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

/** @internal Called by Body at module init. */
export function _bindBodyWrapForInteractor(fn: SubclassWrapFn): void {
  _bodyWrap = fn;
}
/** @internal Called by Shape at module init. */
export function _bindShapeWrapForInteractor(fn: SubclassWrapFn): void {
  _shapeWrap = fn;
}

/**
 * Base class for all interactable physics objects (Body, Shape, Compound).
 *
 * Cannot be instantiated directly — only via Body, Shape, or Compound.
 * Provides shared properties: id, userData, group, cbTypes, and type
 * casting methods (castBody, castShape, castCompound).
 */
export class Interactor {
  /** @internal */
  readonly _inner: NapeInner;

  /** @internal – only subclasses may construct. */
  protected constructor() {
    (this as Writable<Interactor>)._inner = undefined!;
  }

  /** @internal Wrap a compiled Interactor (Body/Shape/Compound) instance. */
  static _wrap(inner: NapeInner): Interactor {
    if (!inner) return null as unknown as Interactor;
    if (inner instanceof Interactor) return inner;

    // Dispatch to concrete subclass wrapper based on runtime type
    if (inner.isBody && inner.isBody() && _bodyWrap) return _bodyWrap(inner);
    if (inner.isShape && inner.isShape() && _shapeWrap)
      return _shapeWrap(inner);

    // Fallback: generic Interactor wrapper (e.g., Compound)
    return getOrCreate(inner, (raw: NapeInner) => {
      const i = Object.create(Interactor.prototype) as Interactor;
      (i as Writable<Interactor>)._inner = raw;
      return i;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /** Unique numeric identifier for this interactor. */
  get id(): number {
    return this._inner.get_id();
  }

  /** User-defined data storage object. */
  get userData(): Record<string, unknown> {
    return this._inner.get_userData();
  }

  /** The interaction group this interactor belongs to. */
  get group(): InteractionGroup | null {
    const raw = this._inner.get_group();
    return raw ? InteractionGroup._wrap(raw) : null;
  }
  set group(value: InteractionGroup | null) {
    this._inner.set_group(value?._inner ?? null);
  }

  /** Callback types assigned to this interactor. */
  get cbTypes(): NapeInner {
    return this._inner.get_cbTypes();
  }

  /** Cast to Body — returns the Body wrapper if this is a Body, else null. */
  get castBody(): any {
    const raw = this._inner.get_castBody();
    if (!raw) return null;
    return _bodyWrap ? _bodyWrap(raw) : raw;
  }

  /** Cast to Shape — returns the Shape wrapper if this is a Shape, else null. */
  get castShape(): any {
    const raw = this._inner.get_castShape();
    if (!raw) return null;
    return _shapeWrap ? _shapeWrap(raw) : raw;
  }

  /** Cast to Compound — returns the Compound wrapper if this is a Compound, else null. */
  get castCompound(): any {
    return this._inner.get_castCompound();
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /** Returns true if this interactor is a Shape. */
  isShape(): boolean {
    return this._inner.isShape();
  }

  /** Returns true if this interactor is a Body. */
  isBody(): boolean {
    return this._inner.isBody();
  }

  /** Returns true if this interactor is a Compound. */
  isCompound(): boolean {
    return this._inner.isCompound();
  }

  toString(): string {
    return this._inner.toString();
  }
}
