import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { Body } from "./Body";
import { Space } from "../space/Space";
import { Interactor, _bindCompoundWrapForInteractor } from "./Interactor";
import { ZPP_Compound } from "../native/phys/ZPP_Compound";

type Any = any;

/**
 * A compound physics object — a hierarchical grouping of Bodies, Constraints,
 * and other Compounds.
 *
 * Fully modernized — uses ZPP_Compound directly (extracted to TypeScript).
 */
export class Compound extends Interactor {
  static __name__ = ["nape", "phys", "Compound"];
  static __super__: Any = Interactor;

  /** Direct access to the extracted internal ZPP_Compound. */
  zpp_inner!: ZPP_Compound;

  constructor() {
    super();

    const zpp = new ZPP_Compound();
    this.zpp_inner = zpp;
    zpp.outer = this;
    zpp.outer_i = this;
    (this as Any).zpp_inner_i = zpp;

    // Override the Interactor's _inner to point at this object (backward compat).
    // _inner was set to undefined by Interactor's constructor as an instance property,
    // so we can reassign it here.
    (this as Writable<Compound>)._inner = this as Any;

    // Register ANY_COMPOUND callback type (use the ZPP-level singleton, same as compiled code)
    const zppNs = getNape().__zpp;
    zpp.insert_cbtype(zppNs.callbacks.ZPP_CbType.ANY_COMPOUND.zpp_inner);
  }

  /** @internal */
  static _wrap(inner: NapeInner): Compound {
    if (!inner) return null as unknown as Compound;
    if (inner instanceof Compound) return inner;
    // Handle ZPP_Compound instances
    if (inner instanceof ZPP_Compound) {
      return getOrCreate(inner, (zpp: ZPP_Compound) => {
        const c = Object.create(Compound.prototype) as Compound;
        c.zpp_inner = zpp;
        zpp.outer = c;
        zpp.outer_i = c;
        (c as Any).zpp_inner_i = zpp;
        (c as Writable<Compound>)._inner = c as Any;
        return c;
      });
    }
    // Handle compiled objects with zpp_inner
    if (inner.zpp_inner) return Compound._wrap(inner.zpp_inner);
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
    return this.zpp_inner.wrap_bodies;
  }

  /** Constraints in this compound. */
  get constraints(): Any {
    return this.zpp_inner.wrap_constraints;
  }

  /** Child compounds in this compound. */
  get compounds(): Any {
    return this.zpp_inner.wrap_compounds;
  }

  // ---------------------------------------------------------------------------
  // Properties (read-write)
  // ---------------------------------------------------------------------------

  /** Parent compound, or null if this is a root compound. */
  get compound(): Compound | null {
    if (this.zpp_inner.compound == null) return null;
    return this.zpp_inner.compound.outer;
  }
  set compound(value: Compound | null) {
    this.zpp_inner.immutable_midstep("Compound::compound");
    const currentOuter =
      this.zpp_inner.compound == null
        ? null
        : this.zpp_inner.compound.outer;
    if (currentOuter !== value) {
      if (currentOuter != null) {
        currentOuter.zpp_inner.wrap_compounds.remove(this);
      }
      if (value != null) {
        const wc = value.zpp_inner.wrap_compounds;
        if (wc.zpp_inner.reverse_flag) {
          wc.push(this);
        } else {
          wc.unshift(this);
        }
      }
    }
  }

  /** Space this compound belongs to (only settable on root compounds). */
  get space(): Space | null {
    if (this.zpp_inner.space == null) return null;
    return Space._wrap(this.zpp_inner.space.outer);
  }
  set space(value: Space | null) {
    if (this.zpp_inner.compound != null) {
      throw new Error(
        "Error: Cannot set the space of an inner Compound, only the root Compound space can be set",
      );
    }
    this.zpp_inner.immutable_midstep("Compound::space");
    const currentSpaceOuter =
      this.zpp_inner.space == null ? null : this.zpp_inner.space.outer;
    if (currentSpaceOuter !== (value as Any)?._inner) {
      if (currentSpaceOuter != null) {
        currentSpaceOuter.zpp_inner.wrap_compounds.remove(this);
      }
      if (value != null) {
        const wc = (value as Any)._inner.zpp_inner.wrap_compounds;
        if (wc.zpp_inner.reverse_flag) {
          wc.push(this);
        } else {
          wc.unshift(this);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  /** Deep copy of this compound and all its children. */
  copy(): Compound {
    return this.zpp_inner.copy();
  }

  /** Distribute all children to the parent compound or space, then remove. */
  breakApart(): void {
    this.zpp_inner.breakApart();
  }

  /** Recursively visit all bodies in this compound and its sub-compounds. */
  visitBodies(lambda: (body: Body) => void): void {
    if (lambda == null) {
      throw new Error(
        "Error: lambda cannot be null for Compound::visitBodies",
      );
    }
    const bodies = this.zpp_inner.wrap_bodies;
    const bLen = bodies.get_length();
    for (let i = 0; i < bLen; i++) {
      lambda(bodies.at(i));
    }
    const compounds = this.zpp_inner.wrap_compounds;
    const cLen = compounds.get_length();
    for (let i = 0; i < cLen; i++) {
      compounds.at(i).visitBodies(lambda);
    }
  }

  /** Recursively visit all constraints in this compound and its sub-compounds. */
  visitConstraints(lambda: (constraint: Any) => void): void {
    if (lambda == null) {
      throw new Error(
        "Error: lambda cannot be null for Compound::visitConstraints",
      );
    }
    const constraints = this.zpp_inner.wrap_constraints;
    const cLen = constraints.get_length();
    for (let i = 0; i < cLen; i++) {
      lambda(constraints.at(i));
    }
    const compounds = this.zpp_inner.wrap_compounds;
    const compLen = compounds.get_length();
    for (let i = 0; i < compLen; i++) {
      compounds.at(i).visitConstraints(lambda);
    }
  }

  /** Recursively visit all sub-compounds in this compound. */
  visitCompounds(lambda: (compound: Compound) => void): void {
    if (lambda == null) {
      throw new Error(
        "Error: lambda cannot be null for Compound::visitConstraints",
      );
    }
    const compounds = this.zpp_inner.wrap_compounds;
    const compLen = compounds.get_length();
    for (let i = 0; i < compLen; i++) {
      const c = compounds.at(i);
      lambda(c);
      c.visitCompounds(lambda);
    }
  }

  /** Calculate the center of mass of all bodies in this compound. */
  COM(weak: boolean = false): Vec2 {
    const ret = new Vec2(0, 0);
    let total = 0.0;

    this.visitBodies((b: Any) => {
      const shapes = b.zpp_inner.wrap_shapes;
      if (shapes.zpp_inner.inner.head != null) {
        if (b.zpp_inner.world) {
          throw new Error("Error: Space::world has no worldCOM");
        }
        // Get worldCOM
        if (b.zpp_inner.wrap_worldCOM == null) {
          b.zpp_inner.setupWorldCOM();
        }
        const worldCOM = b.zpp_inner.wrap_worldCOM;

        // Get mass
        if (b.zpp_inner.world) {
          throw new Error("Error: Space::world has no mass");
        }
        b.zpp_inner.validate_mass();
        if (
          b.zpp_inner.massMode == 0 &&
          b.zpp_inner.shapes.head == null
        ) {
          throw new Error(
            "Error: Given current mass mode, Body::mass only makes sense if it contains shapes",
          );
        }
        const mass = b.zpp_inner.cmass;

        ret.addeq(worldCOM.mul(mass, true));
        total += mass;
      }
    });

    if (total === 0.0) {
      throw new Error("Error: COM of an empty Compound is undefined silly");
    }
    ret.muleq(1 / total);
    if (weak) {
      ret.zpp_inner.weak = true;
    }
    return ret;
  }

  /** Translate all bodies in this compound by the given vector. */
  translate(translation: Vec2): Compound {
    if (translation != null && (translation as Any).zpp_disp) {
      throw new Error(
        'Error: Vec2 has been disposed and cannot be used!',
      );
    }
    if (translation == null) {
      throw new Error("Error: Cannot translate by null Vec2");
    }
    const weak = translation.zpp_inner.weak;
    translation.zpp_inner.weak = false;
    this.visitBodies((b: Any) => {
      if (b.zpp_inner.wrap_pos == null) {
        b.zpp_inner.setupPosition();
      }
      b.zpp_inner.wrap_pos.addeq(translation);
    });
    translation.zpp_inner.weak = weak;
    if (translation.zpp_inner.weak) {
      translation.dispose();
    }
    return this;
  }

  /** Rotate all bodies in this compound around the given centre point. */
  rotate(centre: Vec2, angle: number): Compound {
    if (centre != null && (centre as Any).zpp_disp) {
      throw new Error(
        'Error: Vec2 has been disposed and cannot be used!',
      );
    }
    if (centre == null) {
      throw new Error("Error: Cannot rotate about a null Vec2");
    }
    if (angle !== angle) {
      throw new Error("Error: Cannot rotate by NaN radians");
    }
    const weak = centre.zpp_inner.weak;
    centre.zpp_inner.weak = false;
    this.visitBodies((b: Any) => {
      b.rotate(centre, angle);
    });
    centre.zpp_inner.weak = weak;
    if (centre.zpp_inner.weak) {
      centre.dispose();
    }
    return this;
  }

  override toString(): string {
    return "Compound" + this.zpp_inner.id;
  }

  // ---------------------------------------------------------------------------
  // Compiled-code compatibility methods
  // These are called by compiled code that accesses nape.phys.Compound prototype.
  // ---------------------------------------------------------------------------

  get_bodies(): Any {
    return this.zpp_inner.wrap_bodies;
  }
  get_constraints(): Any {
    return this.zpp_inner.wrap_constraints;
  }
  get_compounds(): Any {
    return this.zpp_inner.wrap_compounds;
  }
  get_compound(): Any {
    if (this.zpp_inner.compound == null) return null;
    return this.zpp_inner.compound.outer;
  }
  set_compound(compound: Any): Any {
    this.compound = compound;
    if (this.zpp_inner.compound == null) return null;
    return this.zpp_inner.compound.outer;
  }
  get_space(): Any {
    if (this.zpp_inner.space == null) return null;
    return this.zpp_inner.space.outer;
  }
  set_space(space: Any): Any {
    this.space = space != null ? Space._wrap(space) : null;
    if (this.zpp_inner.space == null) return null;
    return this.zpp_inner.space.outer;
  }
}

// Register _wrapFn callback on ZPP_Compound
ZPP_Compound._wrapFn = (zpp: ZPP_Compound): Compound => {
  return getOrCreate(zpp, (raw: ZPP_Compound) => {
    const c = Object.create(Compound.prototype) as Compound;
    c.zpp_inner = raw;
    raw.outer = c;
    raw.outer_i = c;
    (c as Any).zpp_inner_i = raw;
    (c as Writable<Compound>)._inner = c as Any;
    return c;
  });
};

// Bind Compound._wrap into Interactor so Interactor._wrap can dispatch.
_bindCompoundWrapForInteractor((inner) => Compound._wrap(inner));

// Self-register in the compiled namespace
const nape = getNape();
nape.phys.Compound = Compound;
(Compound.prototype as Any).__class__ = Compound;

// Copy compiled nape.phys.Interactor prototype methods for backward compat.
// These use `this.zpp_inner_i` which our Compound instances have set.
for (const k in nape.phys.Interactor.prototype) {
  if (!Object.prototype.hasOwnProperty.call(Compound.prototype, k)) {
    (Compound.prototype as Any)[k] = nape.phys.Interactor.prototype[k];
  }
}

// Also define the ES5-style property accessors that compiled code expects
Object.defineProperty(Compound.prototype, "bodies", {
  get: function (this: Compound) {
    return this.zpp_inner.wrap_bodies;
  },
  configurable: true,
});
Object.defineProperty(Compound.prototype, "constraints", {
  get: function (this: Compound) {
    return this.zpp_inner.wrap_constraints;
  },
  configurable: true,
});
Object.defineProperty(Compound.prototype, "compounds", {
  get: function (this: Compound) {
    return this.zpp_inner.wrap_compounds;
  },
  configurable: true,
});
