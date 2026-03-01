import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { Body } from "./Body";
import { Space } from "../space/Space";
import { Interactor, _bindCompoundWrapForInteractor } from "./Interactor";

type Any = any;

/**
 * A compound physics object — a hierarchical grouping of Bodies, Constraints,
 * and other Compounds.
 *
 * Thin wrapper — delegates to compiled nape.phys.Compound (ZPP_Compound not extracted).
 */
export class Compound extends Interactor {
  constructor() {
    super();
    (this as Writable<Compound>)._inner = new (getNape().phys.Compound)();
  }

  /** @internal */
  static _wrap(inner: NapeInner): Compound {
    if (!inner) return null as unknown as Compound;
    if (inner instanceof Compound) return inner;
    return getOrCreate(inner, (raw: NapeInner) => {
      const c = Object.create(Compound.prototype) as Compound;
      (c as Writable<Compound>)._inner = raw;
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties (read-only lists)
  // ---------------------------------------------------------------------------

  /** Bodies in this compound. */
  get bodies(): Any {
    return this._inner.get_bodies();
  }

  /** Constraints in this compound. */
  get constraints(): Any {
    return this._inner.get_constraints();
  }

  /** Child compounds in this compound. */
  get compounds(): Any {
    return this._inner.get_compounds();
  }

  // ---------------------------------------------------------------------------
  // Properties (read-write)
  // ---------------------------------------------------------------------------

  /** Parent compound, or null if this is a root compound. */
  get compound(): Compound | null {
    return Compound._wrap(this._inner.get_compound());
  }
  set compound(value: Compound | null) {
    this._inner.set_compound(value?._inner ?? null);
  }

  /** Space this compound belongs to (only settable on root compounds). */
  get space(): Space | null {
    return Space._wrap(this._inner.get_space());
  }
  set space(value: Space | null) {
    this._inner.set_space(value?._inner ?? null);
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /** Deep copy of this compound and all its children. */
  copy(): Compound {
    return Compound._wrap(this._inner.copy());
  }

  /** Distribute all children to the parent compound or space, then remove this compound. */
  breakApart(): void {
    this._inner.breakApart();
  }

  /** Recursively visit all bodies in this compound and its sub-compounds. */
  visitBodies(lambda: (body: Body) => void): void {
    this._inner.visitBodies(lambda);
  }

  /** Recursively visit all constraints in this compound and its sub-compounds. */
  visitConstraints(lambda: (constraint: Any) => void): void {
    this._inner.visitConstraints(lambda);
  }

  /** Recursively visit all sub-compounds in this compound. */
  visitCompounds(lambda: (compound: Compound) => void): void {
    this._inner.visitCompounds(lambda);
  }

  /** Calculate the center of mass of all bodies in this compound. */
  COM(weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.COM(weak));
  }

  /** Translate all bodies in this compound by the given vector. */
  translate(translation: Vec2): Compound {
    this._inner.translate(translation._inner);
    return this;
  }

  /** Rotate all bodies in this compound around the given centre point. */
  rotate(centre: Vec2, angle: number): Compound {
    this._inner.rotate(centre._inner, angle);
    return this;
  }

  override toString(): string {
    return this._inner.toString();
  }
}

// Bind Compound._wrap into Interactor so Interactor._wrap can dispatch without circular import.
_bindCompoundWrapForInteractor((inner) => Compound._wrap(inner));
