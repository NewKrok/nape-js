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

// ---------------------------------------------------------------------------
// Exported direct references — set inside registerZNPClasses()
// ---------------------------------------------------------------------------

export let ZNPList_ZPP_PartitionVertex: typeof ZNPList = null as any;
export let ZNPList_ZPP_PartitionedPoly: typeof ZNPList = null as any;
export let ZNPList_ZPP_GeomVert: typeof ZNPList = null as any;
export let ZNPList_ZPP_SimplifyP: typeof ZNPList = null as any;
export let ZNPList_ZPP_Vec2: typeof ZNPList = null as any;
export let ZNPList_ZPP_SimpleVert: typeof ZNPList = null as any;
export let ZNPNode_RayResult: typeof ZNPNode = null as any;
export let ZPP_Set_ZPP_SimpleVert: typeof ZPP_Set = null as any;
export let ZPP_Set_ZPP_SimpleSeg: typeof ZPP_Set = null as any;
export let ZPP_Set_ZPP_SimpleEvent: typeof ZPP_Set = null as any;
export let ZPP_Set_ZPP_PartitionVertex: typeof ZPP_Set = null as any;
export let ZPP_Set_ZPP_PartitionPair: typeof ZPP_Set = null as any;
export let ZNPList_ZPP_SimpleEvent: typeof ZNPList = null as any;
export let ZNPList_ZPP_CbType: typeof ZNPList = null as any;
export let ZNPList_ZPP_InteractionListener: typeof ZNPList = null as any;
export let ZNPList_ZPP_BodyListener: typeof ZNPList = null as any;
export let ZNPList_ZPP_ConstraintListener: typeof ZNPList = null as any;
export let ZNPList_ZPP_Constraint: typeof ZNPList = null as any;
export let ZNPList_ZPP_Interactor: typeof ZNPList = null as any;
export let ZNPList_ZPP_CbSet: typeof ZNPList = null as any;
export let ZNPList_ZPP_CbSetPair: typeof ZNPList = null as any;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createZNPNode(typeName: string): any {
  const cls = class extends ZNPNode<any> {};
  (cls as any).__name__ = ["zpp_nape", "util", "ZNPNode_" + typeName];
  (cls as any).zpp_pool = null;
  return cls;
}

function createZNPList(typeName: string, N: any): any {
  const cls = class extends ZNPList<any> {};
  (cls as any).__name__ = ["zpp_nape", "util", "ZNPList_" + typeName];
  (cls as any)._NodeClass = N;
  return cls;
}

function createZPPSet(typeName: string): any {
  const cls = class extends ZPP_Set<any> {};
  (cls as any).__name__ = ["zpp_nape", "util", "ZPP_Set_" + typeName];
  (cls as any).zpp_pool = null;
  return cls;
}

// ---------------------------------------------------------------------------
// Main registration function — called from the compiled factory
// ---------------------------------------------------------------------------

export function registerZNPClasses(zpp: any): void {
  if (!zpp.util) zpp.util = {};

  // --- ZNPNode classes ---
  zpp.util.ZNPNode_ZPP_CbType              = createZNPNode("ZPP_CbType");
  zpp.util.ZNPNode_ZPP_CallbackSet         = createZNPNode("ZPP_CallbackSet");
  zpp.util.ZNPNode_ZPP_Shape               = createZNPNode("ZPP_Shape");
  zpp.util.ZNPNode_ZPP_Body                = createZNPNode("ZPP_Body");
  zpp.util.ZNPNode_ZPP_Constraint          = createZNPNode("ZPP_Constraint");
  zpp.util.ZNPNode_ZPP_Compound            = createZNPNode("ZPP_Compound");
  zpp.util.ZNPNode_ZPP_Arbiter             = createZNPNode("ZPP_Arbiter");
  zpp.util.ZNPNode_ZPP_InteractionListener = createZNPNode("ZPP_InteractionListener");
  zpp.util.ZNPNode_ZPP_CbSet               = createZNPNode("ZPP_CbSet");
  zpp.util.ZNPNode_ZPP_Interactor          = createZNPNode("ZPP_Interactor");
  zpp.util.ZNPNode_ZPP_BodyListener        = createZNPNode("ZPP_BodyListener");
  zpp.util.ZNPNode_ZPP_CbSetPair           = createZNPNode("ZPP_CbSetPair");
  zpp.util.ZNPNode_ZPP_ConstraintListener  = createZNPNode("ZPP_ConstraintListener");
  zpp.util.ZNPNode_ZPP_CutInt              = createZNPNode("ZPP_CutInt");
  zpp.util.ZNPNode_ZPP_CutVert             = createZNPNode("ZPP_CutVert");
  zpp.util.ZNPNode_ZPP_PartitionVertex     = createZNPNode("ZPP_PartitionVertex");
  zpp.util.ZNPNode_ZPP_SimplifyP           = createZNPNode("ZPP_SimplifyP");
  zpp.util.ZNPNode_ZPP_PartitionedPoly     = createZNPNode("ZPP_PartitionedPoly");
  zpp.util.ZNPNode_ZPP_GeomVert            = createZNPNode("ZPP_GeomVert");
  zpp.util.ZNPNode_ZPP_SimpleVert          = createZNPNode("ZPP_SimpleVert");
  zpp.util.ZNPNode_ZPP_SimpleEvent         = createZNPNode("ZPP_SimpleEvent");
  zpp.util.ZNPNode_ZPP_Vec2                = createZNPNode("ZPP_Vec2");
  zpp.util.ZNPNode_ZPP_AABBPair            = createZNPNode("ZPP_AABBPair");
  zpp.util.ZNPNode_ZPP_Edge                = createZNPNode("ZPP_Edge");
  zpp.util.ZNPNode_ZPP_AABBNode            = createZNPNode("ZPP_AABBNode");
  zpp.util.ZNPNode_ZPP_Component           = createZNPNode("ZPP_Component");
  zpp.util.ZNPNode_ZPP_FluidArbiter        = createZNPNode("ZPP_FluidArbiter");
  zpp.util.ZNPNode_ZPP_SensorArbiter       = createZNPNode("ZPP_SensorArbiter");
  zpp.util.ZNPNode_ZPP_Listener            = createZNPNode("ZPP_Listener");
  zpp.util.ZNPNode_ZPP_ColArbiter          = createZNPNode("ZPP_ColArbiter");
  zpp.util.ZNPNode_ZPP_InteractionGroup    = createZNPNode("ZPP_InteractionGroup");
  zpp.util.ZNPNode_ZPP_ToiEvent            = createZNPNode("ZPP_ToiEvent");
  zpp.util.ZNPNode_ConvexResult            = createZNPNode("ConvexResult");
  zpp.util.ZNPNode_ZPP_GeomPoly            = createZNPNode("ZPP_GeomPoly");
  zpp.util.ZNPNode_RayResult               = createZNPNode("RayResult");

  // --- ZNPList classes ---
  const u = zpp.util;
  ZNPList_ZPP_InteractionListener = zpp.util.ZNPList_ZPP_InteractionListener = createZNPList("ZPP_InteractionListener", u.ZNPNode_ZPP_InteractionListener);
  ZNPList_ZPP_BodyListener        = zpp.util.ZNPList_ZPP_BodyListener        = createZNPList("ZPP_BodyListener",        u.ZNPNode_ZPP_BodyListener);
  ZNPList_ZPP_ConstraintListener  = zpp.util.ZNPList_ZPP_ConstraintListener  = createZNPList("ZPP_ConstraintListener",  u.ZNPNode_ZPP_ConstraintListener);
  ZNPList_ZPP_Constraint          = zpp.util.ZNPList_ZPP_Constraint          = createZNPList("ZPP_Constraint",          u.ZNPNode_ZPP_Constraint);
  ZNPList_ZPP_Interactor          = zpp.util.ZNPList_ZPP_Interactor          = createZNPList("ZPP_Interactor",          u.ZNPNode_ZPP_Interactor);
  ZNPList_ZPP_CbSet               = zpp.util.ZNPList_ZPP_CbSet               = createZNPList("ZPP_CbSet",               u.ZNPNode_ZPP_CbSet);
  ZNPList_ZPP_CbType              = zpp.util.ZNPList_ZPP_CbType              = createZNPList("ZPP_CbType",              u.ZNPNode_ZPP_CbType);
  zpp.util.ZNPList_ZPP_Vec2                = createZNPList("ZPP_Vec2",                u.ZNPNode_ZPP_Vec2);
  ZNPList_ZPP_Vec2 = zpp.util.ZNPList_ZPP_Vec2;
  zpp.util.ZNPList_ZPP_CallbackSet         = createZNPList("ZPP_CallbackSet",         u.ZNPNode_ZPP_CallbackSet);
  zpp.util.ZNPList_ZPP_Shape               = createZNPList("ZPP_Shape",               u.ZNPNode_ZPP_Shape);
  zpp.util.ZNPList_ZPP_Body                = createZNPList("ZPP_Body",                u.ZNPNode_ZPP_Body);
  zpp.util.ZNPList_ZPP_Compound            = createZNPList("ZPP_Compound",            u.ZNPNode_ZPP_Compound);
  zpp.util.ZNPList_ZPP_Arbiter             = createZNPList("ZPP_Arbiter",             u.ZNPNode_ZPP_Arbiter);
  ZNPList_ZPP_CbSetPair = zpp.util.ZNPList_ZPP_CbSetPair = createZNPList("ZPP_CbSetPair", u.ZNPNode_ZPP_CbSetPair);
  zpp.util.ZNPList_ZPP_CutInt              = createZNPList("ZPP_CutInt",              u.ZNPNode_ZPP_CutInt);
  zpp.util.ZNPList_ZPP_CutVert             = createZNPList("ZPP_CutVert",             u.ZNPNode_ZPP_CutVert);
  zpp.util.ZNPList_ZPP_PartitionVertex     = createZNPList("ZPP_PartitionVertex",     u.ZNPNode_ZPP_PartitionVertex);
  ZNPList_ZPP_PartitionVertex = zpp.util.ZNPList_ZPP_PartitionVertex;
  zpp.util.ZNPList_ZPP_SimplifyP           = createZNPList("ZPP_SimplifyP",           u.ZNPNode_ZPP_SimplifyP);
  ZNPList_ZPP_SimplifyP = zpp.util.ZNPList_ZPP_SimplifyP;
  zpp.util.ZNPList_ZPP_PartitionedPoly     = createZNPList("ZPP_PartitionedPoly",     u.ZNPNode_ZPP_PartitionedPoly);
  ZNPList_ZPP_PartitionedPoly = zpp.util.ZNPList_ZPP_PartitionedPoly;
  zpp.util.ZNPList_ZPP_GeomVert            = createZNPList("ZPP_GeomVert",            u.ZNPNode_ZPP_GeomVert);
  ZNPList_ZPP_GeomVert = zpp.util.ZNPList_ZPP_GeomVert;
  zpp.util.ZNPList_ZPP_SimpleVert          = createZNPList("ZPP_SimpleVert",          u.ZNPNode_ZPP_SimpleVert);
  ZNPList_ZPP_SimpleEvent = zpp.util.ZNPList_ZPP_SimpleEvent = createZNPList("ZPP_SimpleEvent", u.ZNPNode_ZPP_SimpleEvent);
  zpp.util.ZNPList_ZPP_AABBPair            = createZNPList("ZPP_AABBPair",            u.ZNPNode_ZPP_AABBPair);
  zpp.util.ZNPList_ZPP_Edge                = createZNPList("ZPP_Edge",                u.ZNPNode_ZPP_Edge);
  zpp.util.ZNPList_ZPP_AABBNode            = createZNPList("ZPP_AABBNode",            u.ZNPNode_ZPP_AABBNode);
  zpp.util.ZNPList_ZPP_Component           = createZNPList("ZPP_Component",           u.ZNPNode_ZPP_Component);
  zpp.util.ZNPList_ZPP_FluidArbiter        = createZNPList("ZPP_FluidArbiter",        u.ZNPNode_ZPP_FluidArbiter);
  zpp.util.ZNPList_ZPP_SensorArbiter       = createZNPList("ZPP_SensorArbiter",       u.ZNPNode_ZPP_SensorArbiter);
  zpp.util.ZNPList_ZPP_Listener            = createZNPList("ZPP_Listener",            u.ZNPNode_ZPP_Listener);
  zpp.util.ZNPList_ZPP_ColArbiter          = createZNPList("ZPP_ColArbiter",          u.ZNPNode_ZPP_ColArbiter);
  zpp.util.ZNPList_ZPP_InteractionGroup    = createZNPList("ZPP_InteractionGroup",    u.ZNPNode_ZPP_InteractionGroup);
  zpp.util.ZNPList_ZPP_ToiEvent            = createZNPList("ZPP_ToiEvent",            u.ZNPNode_ZPP_ToiEvent);
  zpp.util.ZNPList_ConvexResult            = createZNPList("ConvexResult",            u.ZNPNode_ConvexResult);
  zpp.util.ZNPList_ZPP_GeomPoly            = createZNPList("ZPP_GeomPoly",            u.ZNPNode_ZPP_GeomPoly);
  zpp.util.ZNPList_RayResult               = createZNPList("RayResult",               u.ZNPNode_RayResult);
  ZNPNode_RayResult = zpp.util.ZNPNode_RayResult;

  // --- also assign SimpleVert ---
  ZNPList_ZPP_SimpleVert = zpp.util.ZNPList_ZPP_SimpleVert;

  // --- ZPP_Set classes ---
  zpp.util.ZPP_Set_ZPP_Body            = createZPPSet("ZPP_Body");
  zpp.util.ZPP_Set_ZPP_CbSetPair       = createZPPSet("ZPP_CbSetPair");
  zpp.util.ZPP_Set_ZPP_PartitionVertex = createZPPSet("ZPP_PartitionVertex");
  ZPP_Set_ZPP_PartitionVertex = zpp.util.ZPP_Set_ZPP_PartitionVertex;
  zpp.util.ZPP_Set_ZPP_PartitionPair   = createZPPSet("ZPP_PartitionPair");
  ZPP_Set_ZPP_PartitionPair = zpp.util.ZPP_Set_ZPP_PartitionPair;
  zpp.util.ZPP_Set_ZPP_SimpleVert      = createZPPSet("ZPP_SimpleVert");
  ZPP_Set_ZPP_SimpleVert = zpp.util.ZPP_Set_ZPP_SimpleVert;
  zpp.util.ZPP_Set_ZPP_SimpleSeg       = createZPPSet("ZPP_SimpleSeg");
  ZPP_Set_ZPP_SimpleSeg = zpp.util.ZPP_Set_ZPP_SimpleSeg;
  zpp.util.ZPP_Set_ZPP_SimpleEvent     = createZPPSet("ZPP_SimpleEvent");
  ZPP_Set_ZPP_SimpleEvent = zpp.util.ZPP_Set_ZPP_SimpleEvent;
  zpp.util.ZPP_Set_ZPP_CbSet           = createZPPSet("ZPP_CbSet");
}
