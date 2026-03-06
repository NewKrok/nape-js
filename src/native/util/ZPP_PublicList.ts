import { getNape } from "../../core/engine";

/**
 * Base class shared by all ZPP_*List backing objects.
 *
 * Each public-API list type (ConstraintList, BodyList, etc.) has a corresponding
 * ZPP_*List that holds the ZNPList inner storage and tracks validation/iteration
 * state. All 13 specializations are identical except for the ZNPList type they
 * create in their constructor and the public wrapper class they instantiate in
 * their static get() method.
 *
 * Extracted from nape-compiled.js Priority 15.
 */
export class ZPP_PublicList {
  user_length: number = 0;
  zip_length: boolean = false;
  push_ite: any = null;
  at_ite: any = null;
  at_index: number = 0;
  reverse_flag: boolean = false;
  dontremove: boolean = false;
  subber: any = null;
  post_adder: any = null;
  adder: any = null;
  _modifiable: any = null;
  _validate: any = null;
  _invalidate: any = null;
  _invalidated: boolean = false;
  immutable: boolean = false;
  inner: any = null;
  outer: any = null;

  constructor() {
    this._invalidated = true;
  }

  valmod(): void {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  }

  modified(): void {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  }

  modify_test(): void {
    if (this._modifiable != null) {
      this._modifiable();
    }
  }

  validate(): void {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  }

  invalidate(): void {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  }
}

/**
 * Creates a ZPP_*List specialisation and registers it at zpp_nape.util[zppName].
 *
 * @param znpListKey   Key in zpp_nape.util for the ZNPList class, e.g. "ZNPList_ZPP_Constraint"
 * @param publicNs     Nape namespace key, e.g. "constraint"
 * @param publicList   Class name in that namespace, e.g. "ConstraintList"
 * @param zppName      Registration key in zpp_nape.util, e.g. "ZPP_ConstraintList"
 */
function makeZPP_List(
  znpListKey: string,
  publicNs: string,
  publicList: string,
  zppName: string,
): any {
  const nape = getNape();
  const zpp = nape.__zpp as any;

  class Cls extends ZPP_PublicList {
    static internal: boolean = false;

    constructor() {
      super();
      this.inner = new zpp.util[znpListKey]();
    }

    static get(list: any, imm: boolean = false): any {
      const ret = new (nape[publicNs][publicList] as any)();
      ret.zpp_inner.inner = list;
      if (imm) ret.zpp_inner.immutable = true;
      ret.zpp_inner.zip_length = true;
      return ret;
    }
  }

  (Cls as any).__name__ = ["zpp_nape", "util", zppName];
  (Cls.prototype as any).__class__ = Cls;
  zpp.util[zppName] = Cls;
  return Cls;
}

// ---------------------------------------------------------------------------
// Exported direct references — set by makeZPP_List calls below
// ---------------------------------------------------------------------------

type ZPP_PublicListWithGet = typeof ZPP_PublicList & { get(list: any, imm?: boolean): any };
export let ZPP_ConstraintList: ZPP_PublicListWithGet = null as any;
export let ZPP_InteractorList: ZPP_PublicListWithGet = null as any;
export let ZPP_ArbiterList: ZPP_PublicListWithGet = null as any;

// Register all 13 ZPP_*List specialisations.
ZPP_ConstraintList = makeZPP_List("ZNPList_ZPP_Constraint",       "constraint", "ConstraintList",       "ZPP_ConstraintList");
makeZPP_List("ZNPList_ZPP_Body",             "phys",       "BodyList",             "ZPP_BodyList");
ZPP_InteractorList = makeZPP_List("ZNPList_ZPP_Interactor",       "phys",       "InteractorList",       "ZPP_InteractorList");
makeZPP_List("ZNPList_ZPP_Compound",         "phys",       "CompoundList",         "ZPP_CompoundList");
makeZPP_List("ZNPList_ZPP_Listener",         "callbacks",  "ListenerList",         "ZPP_ListenerList");
makeZPP_List("ZNPList_ZPP_CbType",           "callbacks",  "CbTypeList",           "ZPP_CbTypeList");
makeZPP_List("ZNPList_ZPP_GeomPoly",         "geom",       "GeomPolyList",         "ZPP_GeomPolyList");
makeZPP_List("ZNPList_RayResult",            "geom",       "RayResultList",        "ZPP_RayResultList");
makeZPP_List("ZNPList_ConvexResult",         "geom",       "ConvexResultList",     "ZPP_ConvexResultList");
makeZPP_List("ZNPList_ZPP_Edge",             "shape",      "EdgeList",             "ZPP_EdgeList");
makeZPP_List("ZNPList_ZPP_Shape",            "shape",      "ShapeList",            "ZPP_ShapeList");
makeZPP_List("ZNPList_ZPP_InteractionGroup", "dynamics",   "InteractionGroupList", "ZPP_InteractionGroupList");
ZPP_ArbiterList = makeZPP_List("ZNPList_ZPP_Arbiter",          "dynamics",   "ArbiterList",          "ZPP_ArbiterList");
