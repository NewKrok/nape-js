/**
 * ZPP_Compound — Internal compound representation for the nape physics engine.
 *
 * Hierarchical grouping of bodies, constraints, and other compounds.
 * Extends ZPP_Interactor (extracted to ZPP_Interactor.ts — methods copied at init time).
 */

import { ZPP_Interactor } from "./ZPP_Interactor";
import {
  ZNPList_ZPP_Body,
  ZNPList_ZPP_Compound,
  ZNPList_ZPP_Constraint,
} from "../util/ZNPRegistry";

export class ZPP_Compound {
  /**
   * Namespace references, assigned by ZPPRegistry.registerZPPClasses().
   * _nape = the `nape` public namespace (for wrapper creation in copy())
   * _zpp = the `zpp_nape` internal namespace (for ZNPList_*, ZPP_BodyList, etc.)
   */
  static _nape: any = null;
  static _zpp: any = null;

  /**
   * Wrapper factory callback, registered by the modernized Compound class.
   * When set, wrapper() uses this instead of the compiled Compound constructor.
   */
  static _wrapFn: ((zpp: ZPP_Compound) => any) | null = null;

  // --- ZPP_Interactor fields (base class, not extracted) ---
  outer_i: any = null; // Interactor wrapper — circular import prevention
  id: number = 0;
  userData: unknown = null;
  ishape: any = null; // ZPP_Shape — circular import prevention
  ibody: any = null; // ZPP_Body — circular import prevention
  icompound: any = null; // ZPP_Compound self-ref
  wrap_cbTypes: any = null; // CbTypeList wrapper
  cbSet: any = null; // ZPP_CbSet
  cbTypes: any = null; // ZNPList_ZPP_CbType — dynamic subclass
  group: any = null; // ZPP_InteractionGroup — circular import prevention
  cbsets: any = null; // ZNPList_ZPP_CallbackSet — dynamic subclass

  // --- ZPP_Compound fields ---
  outer: any = null; // Compound wrapper — circular import prevention
  bodies: any = null; // ZNPList_ZPP_Body — dynamic subclass
  constraints: any = null; // ZNPList_ZPP_Constraint — dynamic subclass
  compounds: any = null; // ZNPList_ZPP_Compound — dynamic subclass
  wrap_bodies: any = null; // BodyList wrapper
  wrap_constraints: any = null; // ConstraintList wrapper
  wrap_compounds: any = null; // CompoundList wrapper
  depth: number = 0;
  compound: any = null; // parent ZPP_Compound — circular
  space: any = null; // ZPP_Space — circular import prevention

  constructor() {
    const zpp = ZPP_Compound._zpp;

    // ZPP_Interactor constructor init
    ZPP_Interactor.initFields(this);

    // ZPP_Compound-specific init
    this.icompound = this;
    this.depth = 1;

    this.bodies = new ZNPList_ZPP_Body();
    this.wrap_bodies = zpp.util.ZPP_BodyList.get(this.bodies);
    this.wrap_bodies.zpp_inner.adder = this.bodies_adder.bind(this);
    this.wrap_bodies.zpp_inner.subber = this.bodies_subber.bind(this);
    this.wrap_bodies.zpp_inner._modifiable = this.bodies_modifiable.bind(this);

    this.constraints = new ZNPList_ZPP_Constraint();
    this.wrap_constraints = zpp.util.ZPP_ConstraintList.get(this.constraints);
    this.wrap_constraints.zpp_inner.adder = this.constraints_adder.bind(this);
    this.wrap_constraints.zpp_inner.subber = this.constraints_subber.bind(this);
    this.wrap_constraints.zpp_inner._modifiable = this.constraints_modifiable.bind(this);

    this.compounds = new ZNPList_ZPP_Compound();
    this.wrap_compounds = zpp.util.ZPP_CompoundList.get(this.compounds);
    this.wrap_compounds.zpp_inner.adder = this.compounds_adder.bind(this);
    this.wrap_compounds.zpp_inner.subber = this.compounds_subber.bind(this);
    this.wrap_compounds.zpp_inner._modifiable = this.compounds_modifiable.bind(this);
  }

  // --- Mid-step guard (ZPP_Compound-specific) ---
  __imutable_midstep(name: string): void {
    if (this.space != null && this.space.midstep) {
      throw new Error(`${name} cannot be set during space step()`);
    }
  }

  // --- Space integration ---
  addedToSpace(): void {
    this.__iaddedToSpace();
  }

  removedFromSpace(): void {
    this.__iremovedFromSpace();
  }

  // --- Break apart: distribute children to parent/space ---
  breakApart(): void {
    if (this.space != null) {
      this.__iremovedFromSpace();
      this.space.nullInteractorType(this);
    }
    if (this.compound != null) {
      this.compound.compounds.remove(this);
    } else if (this.space != null) {
      this.space.compounds.remove(this);
    }
    while (this.bodies.head != null) {
      const b = this.bodies.pop_unsafe();
      if ((b.compound = this.compound) != null) {
        this.compound.bodies.add(b);
      } else if (this.space != null) {
        this.space.bodies.add(b);
      }
      if (this.space != null) {
        this.space.freshInteractorType(b);
      }
    }
    while (this.constraints.head != null) {
      const c = this.constraints.pop_unsafe();
      if ((c.compound = this.compound) != null) {
        this.compound.constraints.add(c);
      } else if (this.space != null) {
        this.space.constraints.add(c);
      }
    }
    while (this.compounds.head != null) {
      const c1 = this.compounds.pop_unsafe();
      if ((c1.compound = this.compound) != null) {
        this.compound.compounds.add(c1);
      } else if (this.space != null) {
        this.space.compounds.add(c1);
      }
      if (this.space != null) {
        this.space.freshInteractorType(c1);
      }
    }
    this.compound = null;
    this.space = null;
  }

  // --- Helper: resolve ZPP inner from public API wrapper ---
  // Public wrappers carry their ZPP object on zpp_inner; raw ZPP objects pass through.
  private static _zppOf(x: any): any {
    return x.zpp_inner ?? x;
  }

  // --- List adder/subber/modifiable callbacks ---

  bodies_adder(x: any): boolean {
    const z = ZPP_Compound._zppOf(x);
    if (z.compound !== this) {
      if (z.compound != null) {
        z.compound.wrap_bodies.remove(x);
      } else if (z.space != null) {
        z.space.wrap_bodies.remove(x);
      }
      z.compound = this;
      if (this.space != null) {
        this.space.addBody(z);
      }
      return true;
    }
    return false;
  }

  bodies_subber(x: any): void {
    const z = ZPP_Compound._zppOf(x);
    z.compound = null;
    if (this.space != null) {
      this.space.remBody(z);
    }
  }

  bodies_modifiable(): void {
    this.immutable_midstep("Compound::bodies");
  }

  constraints_adder(x: any): boolean {
    const z = ZPP_Compound._zppOf(x);
    if (z.compound !== this) {
      if (z.compound != null) {
        z.compound.wrap_constraints.remove(x);
      } else if (z.space != null) {
        z.space.wrap_constraints.remove(x);
      }
      z.compound = this;
      if (this.space != null) {
        this.space.addConstraint(z);
      }
      return true;
    }
    return false;
  }

  constraints_subber(x: any): void {
    const z = ZPP_Compound._zppOf(x);
    z.compound = null;
    if (this.space != null) {
      this.space.remConstraint(z);
    }
  }

  constraints_modifiable(): void {
    this.immutable_midstep("Compound::constraints");
  }

  compounds_adder(x: any): boolean {
    const z = ZPP_Compound._zppOf(x);
    // Check for cycles in the compound tree
    let cur: any = this as any;
    while (cur != null && cur !== z) {
      cur = cur.compound;
    }
    if (cur === z) {
      throw new Error(
        "Error: Assignment would cause a cycle in the Compound tree: assigning " +
          x.toString() +
          ".compound = " +
          this.outer.toString(),
      );
    }
    if (z.compound !== this) {
      if (z.compound != null) {
        z.compound.wrap_compounds.remove(x);
      } else if (z.space != null) {
        z.space.wrap_compounds.remove(x);
      }
      z.compound = this;
      z.depth = this.depth + 1;
      if (this.space != null) {
        this.space.addCompound(z);
      }
      return true;
    }
    return false;
  }

  compounds_subber(x: any): void {
    const z = ZPP_Compound._zppOf(x);
    z.compound = null;
    z.depth = 1;
    if (this.space != null) {
      this.space.remCompound(z);
    }
  }

  compounds_modifiable(): void {
    this.immutable_midstep("Compound::compounds");
  }

  // --- Deep copy ---
  copy(dict?: any[], todo?: any[]): any {
    const napeNs = ZPP_Compound._nape;
    const zpp = ZPP_Compound._zpp;
    const root = dict == null;
    if (dict == null) dict = [];
    if (todo == null) todo = [];

    const ret = new napeNs.phys.Compound();
    // Each child copy is brand new (no compound, no space), so it is simply
    // appended to the matching list of the new compound.

    // Copy child compounds
    let cx_ite = this.compounds.head;
    while (cx_ite != null) {
      const c = cx_ite.elt;
      const cc = c.copy(dict, todo);
      cc.zpp_inner.immutable_midstep("Compound::compound");
      ret.zpp_inner.wrap_compounds.add(cc);
      cx_ite = cx_ite.next;
    }

    // Copy bodies
    let cx_ite1 = this.bodies.head;
    while (cx_ite1 != null) {
      const b = cx_ite1.elt;
      const bc = b.outer.copy();
      dict!.push(zpp.constraint.ZPP_CopyHelper.dict(b.id, bc));
      ret.zpp_inner.wrap_bodies.add(bc);
      cx_ite1 = cx_ite1.next;
    }

    // Copy constraints
    let cx_ite2 = this.constraints.head;
    while (cx_ite2 != null) {
      const c1 = cx_ite2.elt;
      const cc1 = c1.copy(dict, todo);
      ret.zpp_inner.wrap_constraints.add(cc1);
      cx_ite2 = cx_ite2.next;
    }

    // Resolve body-id → copy mappings for constraints at root level
    if (root) {
      while (todo!.length > 0) {
        const xcb = todo!.pop();
        for (let _g = 0; _g < dict!.length; _g++) {
          const idc = dict![_g];
          if (idc.id === xcb.id) {
            xcb.cb(idc.bc);
            break;
          }
        }
      }
    }

    this.copyto(ret);
    return ret;
  }

  // --- Methods inherited from ZPP_Interactor ---
  // Copied from compiled ZPP_Interactor.prototype at init time via _init().
  // Declared here for TypeScript visibility.
  isShape!: () => boolean;
  isBody!: () => boolean;
  isCompound!: () => boolean;
  __iaddedToSpace!: () => void;
  __iremovedFromSpace!: () => void;
  wake!: () => void;
  getSpace!: () => any;
  setupcbTypes!: () => void;
  immutable_cbTypes!: () => void;
  wrap_cbTypes_subber!: (pcb: any) => void;
  wrap_cbTypes_adder!: (cb: any) => boolean;
  insert_cbtype!: (cb: any) => void;
  alloc_cbSet!: () => void;
  dealloc_cbSet!: () => void;
  immutable_midstep!: (name: string) => void;
  copyto!: (ret: any) => void;
  lookup_group!: () => any;

  /**
   * Initialize prototype by copying ZPP_Interactor methods.
   * Called once from ZPPRegistry.registerZPPClasses().
   */
  static _init(): void {
    // Copy ZPP_Interactor prototype methods (only those not already on ZPP_Compound)
    for (const k of Object.getOwnPropertyNames(ZPP_Interactor.prototype)) {
      if (k !== "constructor" && !Object.prototype.hasOwnProperty.call(ZPP_Compound.prototype, k)) {
        (ZPP_Compound.prototype as any)[k] = (ZPP_Interactor.prototype as any)[k];
      }
    }
  }
}
