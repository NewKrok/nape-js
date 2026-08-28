/**
 * Registers all generic List + Iterator pairs into the nape namespace.
 *
 * This replaces ~7,000 lines of repetitive compiled boilerplate with a single
 * factory-driven registration. Special-case lists (Vec2List, ContactList,
 * GeomVertexIterator) are in separate TypeScript files.
 *
 * Each List/Iterator class pair is also exported by name so engine code can
 * reference the classes statically instead of through the namespace.
 *
 * @internal — imported by index.ts to trigger registration at module load.
 */
import { createListClasses } from "./NapeListFactory";

// ---------------------------------------------------------------------------
// Standard "outer" pattern: stores zpp_inner, returns elt.outer
// ---------------------------------------------------------------------------

const outerWrap = (elt: any) => elt.outer;
// Handle both compiled objects (have .zpp_inner) and TS wrapper objects (have ._inner)
const zppUnwrap = (obj: any) =>
  obj.zpp_inner ?? (obj._inner ? (obj._inner.zpp_inner ?? obj._inner) : obj);

// callbacks
export const { List: CbTypeList, Iterator: CbTypeIterator } = createListClasses({
  typeName: "CbType",
  namespaceParts: ["nape", "callbacks"],
  zppListClass: "ZPP_CbTypeList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

export const { List: ListenerList, Iterator: ListenerIterator } = createListClasses({
  typeName: "Listener",
  namespaceParts: ["nape", "callbacks"],
  zppListClass: "ZPP_ListenerList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// constraint
export const { List: ConstraintList, Iterator: ConstraintIterator } = createListClasses({
  typeName: "Constraint",
  namespaceParts: ["nape", "constraint"],
  zppListClass: "ZPP_ConstraintList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// dynamics
export const { List: InteractionGroupList, Iterator: InteractionGroupIterator } = createListClasses(
  {
    typeName: "InteractionGroup",
    namespaceParts: ["nape", "dynamics"],
    zppListClass: "ZPP_InteractionGroupList",
    wrapElement: outerWrap,
    unwrapElement: zppUnwrap,
  },
);

// geom
export const { List: GeomPolyList, Iterator: GeomPolyIterator } = createListClasses({
  typeName: "GeomPoly",
  namespaceParts: ["nape", "geom"],
  zppListClass: "ZPP_GeomPolyList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// phys
export const { List: BodyList, Iterator: BodyIterator } = createListClasses({
  typeName: "Body",
  namespaceParts: ["nape", "phys"],
  zppListClass: "ZPP_BodyList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

export const { List: CompoundList, Iterator: CompoundIterator } = createListClasses({
  typeName: "Compound",
  namespaceParts: ["nape", "phys"],
  zppListClass: "ZPP_CompoundList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// shape
export const { List: ShapeList, Iterator: ShapeIterator } = createListClasses({
  typeName: "Shape",
  namespaceParts: ["nape", "shape"],
  zppListClass: "ZPP_ShapeList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// ---------------------------------------------------------------------------
// "wrapper()" pattern: stores zpp_inner, returns elt.wrapper()
// ---------------------------------------------------------------------------

export const { List: ArbiterList, Iterator: ArbiterIterator } = createListClasses({
  typeName: "Arbiter",
  namespaceParts: ["nape", "dynamics"],
  zppListClass: "ZPP_ArbiterList",
  wrapElement: (elt: any) => elt.wrapper(),
  unwrapElement: zppUnwrap,
});

export const { List: EdgeList, Iterator: EdgeIterator } = createListClasses({
  typeName: "Edge",
  namespaceParts: ["nape", "shape"],
  zppListClass: "ZPP_EdgeList",
  wrapElement: (elt: any) => elt.wrapper(),
  unwrapElement: zppUnwrap,
});

// ---------------------------------------------------------------------------
// "direct" pattern: stores obj directly, returns elt as-is
// ---------------------------------------------------------------------------

export const { List: ConvexResultList, Iterator: ConvexResultIterator } = createListClasses({
  typeName: "ConvexResult",
  namespaceParts: ["nape", "geom"],
  zppListClass: "ZPP_ConvexResultList",
  wrapElement: (elt: any) => elt,
  unwrapElement: (obj: any) => obj,
});

export const { List: RayResultList, Iterator: RayResultIterator } = createListClasses({
  typeName: "RayResult",
  namespaceParts: ["nape", "geom"],
  zppListClass: "ZPP_RayResultList",
  wrapElement: (elt: any) => elt,
  unwrapElement: (obj: any) => obj,
});

// ---------------------------------------------------------------------------
// "outer_i" pattern: Interactor uses zpp_inner_i / outer_i
// ---------------------------------------------------------------------------

export const { List: InteractorList, Iterator: InteractorIterator } = createListClasses({
  typeName: "Interactor",
  namespaceParts: ["nape", "phys"],
  zppListClass: "ZPP_InteractorList",
  wrapElement: (elt: any) => elt.outer_i,
  unwrapElement: (obj: any) => obj.zpp_inner_i,
});
