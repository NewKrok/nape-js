/**
 * ZPP_InteractionGroup — Internal interaction group for the nape physics engine.
 *
 * Hierarchical groups that can override interaction filters. When two shapes
 * share a common group with `ignore = true`, their interaction is suppressed.
 *
 * Converted from nape-compiled.js lines 63367–63463, 135330–135331.
 */

type Any = any;

export class ZPP_InteractionGroup {
  // --- Static: type flags ---
  static SHAPE = 1;
  static BODY = 2;

  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "dynamics", "ZPP_InteractionGroup"];

  // --- Static: namespace references (set by compiled module) ---
  static _zpp: Any = null;

  // --- Instance: public API wrapper ---
  outer: Any = null;

  // --- Instance: ignore flag (when true, shared group suppresses interaction) ---
  ignore = false;

  // --- Instance: parent group ---
  group: ZPP_InteractionGroup | null = null;

  // --- Instance: child groups ---
  groups: Any = null;
  wrap_groups: Any = null;

  // --- Instance: interactors in this group ---
  interactors: Any = null;
  wrap_interactors: Any = null;

  // --- Instance: depth in group hierarchy ---
  depth = 0;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_InteractionGroup;

  constructor() {
    const zpp = ZPP_InteractionGroup._zpp;
    this.groups = new zpp.util.ZNPList_ZPP_InteractionGroup();
    this.interactors = new zpp.util.ZNPList_ZPP_Interactor();
  }

  /** Set or change the parent group. */
  setGroup(group: ZPP_InteractionGroup | null): void {
    if (this.group !== group) {
      if (this.group != null) {
        this.group.groups.remove(this);
        this.depth = 0;
        this.group.invalidate(true);
      }
      this.group = group;
      if (group != null) {
        group.groups.add(this);
        this.depth = group.depth + 1;
        group.invalidate(true);
      } else {
        this.invalidate(true);
      }
    }
  }

  /** Wake all interactors and propagate to child groups. */
  invalidate(force?: boolean): void {
    if (force == null) force = false;
    if (!(force || this.ignore)) return;

    // Wake all interactors
    let cx_ite = this.interactors.head;
    while (cx_ite != null) {
      const b = cx_ite.elt;
      if (b.ibody != null) {
        b.ibody.wake();
      } else if (b.ishape != null) {
        b.ishape.body.wake();
      } else {
        b.icompound.wake();
      }
      cx_ite = cx_ite.next;
    }

    // Propagate to child groups
    let cx_ite1 = this.groups.head;
    while (cx_ite1 != null) {
      const g = cx_ite1.elt;
      g.invalidate(force);
      cx_ite1 = cx_ite1.next;
    }
  }

  /** Add a child group. */
  addGroup(group: ZPP_InteractionGroup): void {
    this.groups.add(group);
    group.depth = this.depth + 1;
  }

  /** Remove a child group. */
  remGroup(group: ZPP_InteractionGroup): void {
    this.groups.remove(group);
    group.depth = 0;
  }

  /** Register an interactor in this group. */
  addInteractor(intx: Any): void {
    this.interactors.add(intx);
  }

  /** Unregister an interactor from this group. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  remInteractor(intx: Any, flag?: number): void {
    this.interactors.remove(intx);
  }
}
