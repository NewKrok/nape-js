/**
 * ZNPRegistry — creates and registers the 78 named ZNP subclasses.
 *
 * Replaces the createZNPNode / createZNPList / createZPPSet factory functions
 * and their 78 instantiation lines previously in nape-compiled.js (lines 611–734).
 *
 * Exported as a plain function called directly from the compiled factory so
 * the classes are created synchronously during factory execution — before
 * the _initEnums / _initStatics calls that depend on them.
 */

import { ZNPNode } from "./ZNPNode";
import { ZNPList } from "./ZNPList";
import { ZPP_Set } from "./ZPP_Set";

type HxClasses = Record<string, any>;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createZNPNode(typeName: string, hxClasses: HxClasses): any {
  const cls = class extends ZNPNode<any> {};
  (cls as any).__name__ = ["zpp_nape", "util", "ZNPNode_" + typeName];
  (cls as any).zpp_pool = null;
  cls.prototype.__class__ = cls;
  hxClasses["zpp_nape.util.ZNPNode_" + typeName] = cls;
  return cls;
}

function createZNPList(typeName: string, N: any, hxClasses: HxClasses): any {
  const cls = class extends ZNPList<any> {};
  (cls as any).__name__ = ["zpp_nape", "util", "ZNPList_" + typeName];
  (cls as any)._NodeClass = N;
  cls.prototype.__class__ = cls;
  hxClasses["zpp_nape.util.ZNPList_" + typeName] = cls;
  return cls;
}

function createZPPSet(typeName: string, hxClasses: HxClasses): any {
  const cls = class extends ZPP_Set<any> {};
  (cls as any).__name__ = ["zpp_nape", "util", "ZPP_Set_" + typeName];
  (cls as any).zpp_pool = null;
  cls.prototype.__class__ = cls;
  hxClasses["zpp_nape.util.ZPP_Set_" + typeName] = cls;
  return cls;
}

// ---------------------------------------------------------------------------
// Main registration function — called from the compiled factory
// ---------------------------------------------------------------------------

export function registerZNPClasses(zpp: any, hxClasses: HxClasses): void {
  if (!zpp.util) zpp.util = {};

  // --- ZNPNode classes ---
  zpp.util.ZNPNode_ZPP_CbType              = createZNPNode("ZPP_CbType",              hxClasses);
  zpp.util.ZNPNode_ZPP_CallbackSet         = createZNPNode("ZPP_CallbackSet",         hxClasses);
  zpp.util.ZNPNode_ZPP_Shape               = createZNPNode("ZPP_Shape",               hxClasses);
  zpp.util.ZNPNode_ZPP_Body                = createZNPNode("ZPP_Body",                hxClasses);
  zpp.util.ZNPNode_ZPP_Constraint          = createZNPNode("ZPP_Constraint",          hxClasses);
  zpp.util.ZNPNode_ZPP_Compound            = createZNPNode("ZPP_Compound",            hxClasses);
  zpp.util.ZNPNode_ZPP_Arbiter             = createZNPNode("ZPP_Arbiter",             hxClasses);
  zpp.util.ZNPNode_ZPP_InteractionListener = createZNPNode("ZPP_InteractionListener", hxClasses);
  zpp.util.ZNPNode_ZPP_CbSet               = createZNPNode("ZPP_CbSet",               hxClasses);
  zpp.util.ZNPNode_ZPP_Interactor          = createZNPNode("ZPP_Interactor",          hxClasses);
  zpp.util.ZNPNode_ZPP_BodyListener        = createZNPNode("ZPP_BodyListener",        hxClasses);
  zpp.util.ZNPNode_ZPP_CbSetPair           = createZNPNode("ZPP_CbSetPair",           hxClasses);
  zpp.util.ZNPNode_ZPP_ConstraintListener  = createZNPNode("ZPP_ConstraintListener",  hxClasses);
  zpp.util.ZNPNode_ZPP_CutInt              = createZNPNode("ZPP_CutInt",              hxClasses);
  zpp.util.ZNPNode_ZPP_CutVert             = createZNPNode("ZPP_CutVert",             hxClasses);
  zpp.util.ZNPNode_ZPP_PartitionVertex     = createZNPNode("ZPP_PartitionVertex",     hxClasses);
  zpp.util.ZNPNode_ZPP_SimplifyP           = createZNPNode("ZPP_SimplifyP",           hxClasses);
  zpp.util.ZNPNode_ZPP_PartitionedPoly     = createZNPNode("ZPP_PartitionedPoly",     hxClasses);
  zpp.util.ZNPNode_ZPP_GeomVert            = createZNPNode("ZPP_GeomVert",            hxClasses);
  zpp.util.ZNPNode_ZPP_SimpleVert          = createZNPNode("ZPP_SimpleVert",          hxClasses);
  zpp.util.ZNPNode_ZPP_SimpleEvent         = createZNPNode("ZPP_SimpleEvent",         hxClasses);
  zpp.util.ZNPNode_ZPP_Vec2                = createZNPNode("ZPP_Vec2",                hxClasses);
  zpp.util.ZNPNode_ZPP_AABBPair            = createZNPNode("ZPP_AABBPair",            hxClasses);
  zpp.util.ZNPNode_ZPP_Edge                = createZNPNode("ZPP_Edge",                hxClasses);
  zpp.util.ZNPNode_ZPP_AABBNode            = createZNPNode("ZPP_AABBNode",            hxClasses);
  zpp.util.ZNPNode_ZPP_Component           = createZNPNode("ZPP_Component",           hxClasses);
  zpp.util.ZNPNode_ZPP_FluidArbiter        = createZNPNode("ZPP_FluidArbiter",        hxClasses);
  zpp.util.ZNPNode_ZPP_SensorArbiter       = createZNPNode("ZPP_SensorArbiter",       hxClasses);
  zpp.util.ZNPNode_ZPP_Listener            = createZNPNode("ZPP_Listener",            hxClasses);
  zpp.util.ZNPNode_ZPP_ColArbiter          = createZNPNode("ZPP_ColArbiter",          hxClasses);
  zpp.util.ZNPNode_ZPP_InteractionGroup    = createZNPNode("ZPP_InteractionGroup",    hxClasses);
  zpp.util.ZNPNode_ZPP_ToiEvent            = createZNPNode("ZPP_ToiEvent",            hxClasses);
  zpp.util.ZNPNode_ConvexResult            = createZNPNode("ConvexResult",            hxClasses);
  zpp.util.ZNPNode_ZPP_GeomPoly            = createZNPNode("ZPP_GeomPoly",            hxClasses);
  zpp.util.ZNPNode_RayResult               = createZNPNode("RayResult",               hxClasses);

  // --- ZNPList classes ---
  const u = zpp.util;
  zpp.util.ZNPList_ZPP_InteractionListener = createZNPList("ZPP_InteractionListener", u.ZNPNode_ZPP_InteractionListener, hxClasses);
  zpp.util.ZNPList_ZPP_BodyListener        = createZNPList("ZPP_BodyListener",        u.ZNPNode_ZPP_BodyListener,        hxClasses);
  zpp.util.ZNPList_ZPP_ConstraintListener  = createZNPList("ZPP_ConstraintListener",  u.ZNPNode_ZPP_ConstraintListener,  hxClasses);
  zpp.util.ZNPList_ZPP_Constraint          = createZNPList("ZPP_Constraint",          u.ZNPNode_ZPP_Constraint,          hxClasses);
  zpp.util.ZNPList_ZPP_Interactor          = createZNPList("ZPP_Interactor",          u.ZNPNode_ZPP_Interactor,          hxClasses);
  zpp.util.ZNPList_ZPP_CbSet               = createZNPList("ZPP_CbSet",               u.ZNPNode_ZPP_CbSet,               hxClasses);
  zpp.util.ZNPList_ZPP_CbType              = createZNPList("ZPP_CbType",              u.ZNPNode_ZPP_CbType,              hxClasses);
  zpp.util.ZNPList_ZPP_Vec2                = createZNPList("ZPP_Vec2",                u.ZNPNode_ZPP_Vec2,                hxClasses);
  zpp.util.ZNPList_ZPP_CallbackSet         = createZNPList("ZPP_CallbackSet",         u.ZNPNode_ZPP_CallbackSet,         hxClasses);
  zpp.util.ZNPList_ZPP_Shape               = createZNPList("ZPP_Shape",               u.ZNPNode_ZPP_Shape,               hxClasses);
  zpp.util.ZNPList_ZPP_Body                = createZNPList("ZPP_Body",                u.ZNPNode_ZPP_Body,                hxClasses);
  zpp.util.ZNPList_ZPP_Compound            = createZNPList("ZPP_Compound",            u.ZNPNode_ZPP_Compound,            hxClasses);
  zpp.util.ZNPList_ZPP_Arbiter             = createZNPList("ZPP_Arbiter",             u.ZNPNode_ZPP_Arbiter,             hxClasses);
  zpp.util.ZNPList_ZPP_CbSetPair           = createZNPList("ZPP_CbSetPair",           u.ZNPNode_ZPP_CbSetPair,           hxClasses);
  zpp.util.ZNPList_ZPP_CutInt              = createZNPList("ZPP_CutInt",              u.ZNPNode_ZPP_CutInt,              hxClasses);
  zpp.util.ZNPList_ZPP_CutVert             = createZNPList("ZPP_CutVert",             u.ZNPNode_ZPP_CutVert,             hxClasses);
  zpp.util.ZNPList_ZPP_PartitionVertex     = createZNPList("ZPP_PartitionVertex",     u.ZNPNode_ZPP_PartitionVertex,     hxClasses);
  zpp.util.ZNPList_ZPP_SimplifyP           = createZNPList("ZPP_SimplifyP",           u.ZNPNode_ZPP_SimplifyP,           hxClasses);
  zpp.util.ZNPList_ZPP_PartitionedPoly     = createZNPList("ZPP_PartitionedPoly",     u.ZNPNode_ZPP_PartitionedPoly,     hxClasses);
  zpp.util.ZNPList_ZPP_GeomVert            = createZNPList("ZPP_GeomVert",            u.ZNPNode_ZPP_GeomVert,            hxClasses);
  zpp.util.ZNPList_ZPP_SimpleVert          = createZNPList("ZPP_SimpleVert",          u.ZNPNode_ZPP_SimpleVert,          hxClasses);
  zpp.util.ZNPList_ZPP_SimpleEvent         = createZNPList("ZPP_SimpleEvent",         u.ZNPNode_ZPP_SimpleEvent,         hxClasses);
  zpp.util.ZNPList_ZPP_AABBPair            = createZNPList("ZPP_AABBPair",            u.ZNPNode_ZPP_AABBPair,            hxClasses);
  zpp.util.ZNPList_ZPP_Edge                = createZNPList("ZPP_Edge",                u.ZNPNode_ZPP_Edge,                hxClasses);
  zpp.util.ZNPList_ZPP_AABBNode            = createZNPList("ZPP_AABBNode",            u.ZNPNode_ZPP_AABBNode,            hxClasses);
  zpp.util.ZNPList_ZPP_Component           = createZNPList("ZPP_Component",           u.ZNPNode_ZPP_Component,           hxClasses);
  zpp.util.ZNPList_ZPP_FluidArbiter        = createZNPList("ZPP_FluidArbiter",        u.ZNPNode_ZPP_FluidArbiter,        hxClasses);
  zpp.util.ZNPList_ZPP_SensorArbiter       = createZNPList("ZPP_SensorArbiter",       u.ZNPNode_ZPP_SensorArbiter,       hxClasses);
  zpp.util.ZNPList_ZPP_Listener            = createZNPList("ZPP_Listener",            u.ZNPNode_ZPP_Listener,            hxClasses);
  zpp.util.ZNPList_ZPP_ColArbiter          = createZNPList("ZPP_ColArbiter",          u.ZNPNode_ZPP_ColArbiter,          hxClasses);
  zpp.util.ZNPList_ZPP_InteractionGroup    = createZNPList("ZPP_InteractionGroup",    u.ZNPNode_ZPP_InteractionGroup,    hxClasses);
  zpp.util.ZNPList_ZPP_ToiEvent            = createZNPList("ZPP_ToiEvent",            u.ZNPNode_ZPP_ToiEvent,            hxClasses);
  zpp.util.ZNPList_ConvexResult            = createZNPList("ConvexResult",            u.ZNPNode_ConvexResult,            hxClasses);
  zpp.util.ZNPList_ZPP_GeomPoly            = createZNPList("ZPP_GeomPoly",            u.ZNPNode_ZPP_GeomPoly,            hxClasses);
  zpp.util.ZNPList_RayResult               = createZNPList("RayResult",               u.ZNPNode_RayResult,               hxClasses);

  // --- ZPP_Set classes ---
  zpp.util.ZPP_Set_ZPP_Body            = createZPPSet("ZPP_Body",            hxClasses);
  zpp.util.ZPP_Set_ZPP_CbSetPair       = createZPPSet("ZPP_CbSetPair",       hxClasses);
  zpp.util.ZPP_Set_ZPP_PartitionVertex = createZPPSet("ZPP_PartitionVertex",  hxClasses);
  zpp.util.ZPP_Set_ZPP_PartitionPair   = createZPPSet("ZPP_PartitionPair",    hxClasses);
  zpp.util.ZPP_Set_ZPP_SimpleVert      = createZPPSet("ZPP_SimpleVert",       hxClasses);
  zpp.util.ZPP_Set_ZPP_SimpleSeg       = createZPPSet("ZPP_SimpleSeg",        hxClasses);
  zpp.util.ZPP_Set_ZPP_SimpleEvent     = createZPPSet("ZPP_SimpleEvent",      hxClasses);
  zpp.util.ZPP_Set_ZPP_CbSet           = createZPPSet("ZPP_CbSet",            hxClasses);
}
