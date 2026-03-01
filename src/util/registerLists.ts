/**
 * Registers all generic List + Iterator pairs into the nape namespace.
 *
 * This replaces ~7,000 lines of repetitive compiled boilerplate with a single
 * factory-driven registration. Special-case lists (Vec2List, ContactList,
 * GeomVertexIterator) remain in compiled code.
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
  obj.zpp_inner ?? (obj._inner ? obj._inner.zpp_inner ?? obj._inner : obj);

// callbacks
createListClasses({
  typeName: "CbType",
  namespaceParts: ["nape", "callbacks"],
  zppListClass: "ZPP_CbTypeList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

createListClasses({
  typeName: "Listener",
  namespaceParts: ["nape", "callbacks"],
  zppListClass: "ZPP_ListenerList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// constraint
createListClasses({
  typeName: "Constraint",
  namespaceParts: ["nape", "constraint"],
  zppListClass: "ZPP_ConstraintList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// dynamics
createListClasses({
  typeName: "InteractionGroup",
  namespaceParts: ["nape", "dynamics"],
  zppListClass: "ZPP_InteractionGroupList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// geom
createListClasses({
  typeName: "GeomPoly",
  namespaceParts: ["nape", "geom"],
  zppListClass: "ZPP_GeomPolyList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// phys
createListClasses({
  typeName: "Body",
  namespaceParts: ["nape", "phys"],
  zppListClass: "ZPP_BodyList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

createListClasses({
  typeName: "Compound",
  namespaceParts: ["nape", "phys"],
  zppListClass: "ZPP_CompoundList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// shape
createListClasses({
  typeName: "Shape",
  namespaceParts: ["nape", "shape"],
  zppListClass: "ZPP_ShapeList",
  wrapElement: outerWrap,
  unwrapElement: zppUnwrap,
});

// ---------------------------------------------------------------------------
// "wrapper()" pattern: stores zpp_inner, returns elt.wrapper()
// ---------------------------------------------------------------------------

createListClasses({
  typeName: "Arbiter",
  namespaceParts: ["nape", "dynamics"],
  zppListClass: "ZPP_ArbiterList",
  wrapElement: (elt: any) => elt.wrapper(),
  unwrapElement: zppUnwrap,
});

createListClasses({
  typeName: "Edge",
  namespaceParts: ["nape", "shape"],
  zppListClass: "ZPP_EdgeList",
  wrapElement: (elt: any) => elt.wrapper(),
  unwrapElement: zppUnwrap,
});

// ---------------------------------------------------------------------------
// "direct" pattern: stores obj directly, returns elt as-is
// ---------------------------------------------------------------------------

createListClasses({
  typeName: "ConvexResult",
  namespaceParts: ["nape", "geom"],
  zppListClass: "ZPP_ConvexResultList",
  wrapElement: (elt: any) => elt,
  unwrapElement: (obj: any) => obj,
});

createListClasses({
  typeName: "RayResult",
  namespaceParts: ["nape", "geom"],
  zppListClass: "ZPP_RayResultList",
  wrapElement: (elt: any) => elt,
  unwrapElement: (obj: any) => obj,
});

// ---------------------------------------------------------------------------
// "outer_i" pattern: Interactor uses zpp_inner_i / outer_i
// ---------------------------------------------------------------------------

createListClasses({
  typeName: "Interactor",
  namespaceParts: ["nape", "phys"],
  zppListClass: "ZPP_InteractorList",
  wrapElement: (elt: any) => elt.outer_i,
  unwrapElement: (obj: any) => obj.zpp_inner_i,
});
