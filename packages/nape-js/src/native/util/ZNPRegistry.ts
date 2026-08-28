/**
 * ZNPRegistry — the 78 named ZNP list/node and ZPP_Set subclasses.
 *
 * Originally these were manufactured at runtime (a Haxe leftover: the classes
 * were only reachable through the zpp_nape namespace object). They are now
 * plain exported classes so engine code imports them directly and the pool
 * statics live on named, monomorphic classes. registerZNPClasses() only
 * assigns them into the compiled-style namespace for compatibility.
 *
 * Each subclass declares its own static pool slot — pools must not be
 * shared through the base class.
 */

import { ZNPNode } from "./ZNPNode";
import { ZNPList } from "./ZNPList";
import { ZPP_Set } from "./ZPP_Set";

// --- ZNPNode classes ---
export class ZNPNode_ZPP_CbType extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_CbType | null = null;
}
export class ZNPNode_ZPP_CallbackSet extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_CallbackSet | null = null;
}
export class ZNPNode_ZPP_Shape extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_Shape | null = null;
}
export class ZNPNode_ZPP_Body extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_Body | null = null;
}
export class ZNPNode_ZPP_Constraint extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_Constraint | null = null;
}
export class ZNPNode_ZPP_Compound extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_Compound | null = null;
}
export class ZNPNode_ZPP_Arbiter extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_Arbiter | null = null;
}
export class ZNPNode_ZPP_InteractionListener extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_InteractionListener | null = null;
}
export class ZNPNode_ZPP_CbSet extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_CbSet | null = null;
}
export class ZNPNode_ZPP_Interactor extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_Interactor | null = null;
}
export class ZNPNode_ZPP_BodyListener extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_BodyListener | null = null;
}
export class ZNPNode_ZPP_CbSetPair extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_CbSetPair | null = null;
}
export class ZNPNode_ZPP_ConstraintListener extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_ConstraintListener | null = null;
}
export class ZNPNode_ZPP_CutInt extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_CutInt | null = null;
}
export class ZNPNode_ZPP_CutVert extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_CutVert | null = null;
}
export class ZNPNode_ZPP_PartitionVertex extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_PartitionVertex | null = null;
}
export class ZNPNode_ZPP_SimplifyP extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_SimplifyP | null = null;
}
export class ZNPNode_ZPP_PartitionedPoly extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_PartitionedPoly | null = null;
}
export class ZNPNode_ZPP_GeomVert extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_GeomVert | null = null;
}
export class ZNPNode_ZPP_SimpleVert extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_SimpleVert | null = null;
}
export class ZNPNode_ZPP_SimpleEvent extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_SimpleEvent | null = null;
}
export class ZNPNode_ZPP_Vec2 extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_Vec2 | null = null;
}
export class ZNPNode_ZPP_AABBPair extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_AABBPair | null = null;
}
export class ZNPNode_ZPP_Edge extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_Edge | null = null;
}
export class ZNPNode_ZPP_AABBNode extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_AABBNode | null = null;
}
export class ZNPNode_ZPP_Component extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_Component | null = null;
}
export class ZNPNode_ZPP_FluidArbiter extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_FluidArbiter | null = null;
}
export class ZNPNode_ZPP_SensorArbiter extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_SensorArbiter | null = null;
}
export class ZNPNode_ZPP_Listener extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_Listener | null = null;
}
export class ZNPNode_ZPP_ColArbiter extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_ColArbiter | null = null;
}
export class ZNPNode_ZPP_InteractionGroup extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_InteractionGroup | null = null;
}
export class ZNPNode_ZPP_ToiEvent extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_ToiEvent | null = null;
}
export class ZNPNode_ConvexResult extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ConvexResult | null = null;
}
export class ZNPNode_ZPP_GeomPoly extends ZNPNode<any> {
  static zpp_pool: ZNPNode_ZPP_GeomPoly | null = null;
}
export class ZNPNode_RayResult extends ZNPNode<any> {
  static zpp_pool: ZNPNode_RayResult | null = null;
}

// --- ZNPList classes ---
export class ZNPList_ZPP_CbType extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_CbType;
}
export class ZNPList_ZPP_CallbackSet extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_CallbackSet;
}
export class ZNPList_ZPP_Shape extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_Shape;
}
export class ZNPList_ZPP_Body extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_Body;
}
export class ZNPList_ZPP_Constraint extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_Constraint;
}
export class ZNPList_ZPP_Compound extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_Compound;
}
export class ZNPList_ZPP_Arbiter extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_Arbiter;
}
export class ZNPList_ZPP_InteractionListener extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_InteractionListener;
}
export class ZNPList_ZPP_CbSet extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_CbSet;
}
export class ZNPList_ZPP_Interactor extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_Interactor;
}
export class ZNPList_ZPP_BodyListener extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_BodyListener;
}
export class ZNPList_ZPP_CbSetPair extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_CbSetPair;
}
export class ZNPList_ZPP_ConstraintListener extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_ConstraintListener;
}
export class ZNPList_ZPP_CutInt extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_CutInt;
}
export class ZNPList_ZPP_CutVert extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_CutVert;
}
export class ZNPList_ZPP_PartitionVertex extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_PartitionVertex;
}
export class ZNPList_ZPP_SimplifyP extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_SimplifyP;
}
export class ZNPList_ZPP_PartitionedPoly extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_PartitionedPoly;
}
export class ZNPList_ZPP_GeomVert extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_GeomVert;
}
export class ZNPList_ZPP_SimpleVert extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_SimpleVert;
}
export class ZNPList_ZPP_SimpleEvent extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_SimpleEvent;
}
export class ZNPList_ZPP_Vec2 extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_Vec2;
}
export class ZNPList_ZPP_AABBPair extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_AABBPair;
}
export class ZNPList_ZPP_Edge extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_Edge;
}
export class ZNPList_ZPP_AABBNode extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_AABBNode;
}
export class ZNPList_ZPP_Component extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_Component;
}
export class ZNPList_ZPP_FluidArbiter extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_FluidArbiter;
}
export class ZNPList_ZPP_SensorArbiter extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_SensorArbiter;
}
export class ZNPList_ZPP_Listener extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_Listener;
}
export class ZNPList_ZPP_ColArbiter extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_ColArbiter;
}
export class ZNPList_ZPP_InteractionGroup extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_InteractionGroup;
}
export class ZNPList_ZPP_ToiEvent extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_ToiEvent;
}
export class ZNPList_ConvexResult extends ZNPList<any> {
  static _NodeClass = ZNPNode_ConvexResult;
}
export class ZNPList_ZPP_GeomPoly extends ZNPList<any> {
  static _NodeClass = ZNPNode_ZPP_GeomPoly;
}
export class ZNPList_RayResult extends ZNPList<any> {
  static _NodeClass = ZNPNode_RayResult;
}

// --- ZPP_Set classes ---
export class ZPP_Set_ZPP_Body extends ZPP_Set<any> {
  static zpp_pool: ZPP_Set_ZPP_Body | null = null;
}
export class ZPP_Set_ZPP_CbSetPair extends ZPP_Set<any> {
  static zpp_pool: ZPP_Set_ZPP_CbSetPair | null = null;
}
export class ZPP_Set_ZPP_PartitionVertex extends ZPP_Set<any> {
  static zpp_pool: ZPP_Set_ZPP_PartitionVertex | null = null;
}
export class ZPP_Set_ZPP_PartitionPair extends ZPP_Set<any> {
  static zpp_pool: ZPP_Set_ZPP_PartitionPair | null = null;
}
export class ZPP_Set_ZPP_SimpleVert extends ZPP_Set<any> {
  static zpp_pool: ZPP_Set_ZPP_SimpleVert | null = null;
}
export class ZPP_Set_ZPP_SimpleSeg extends ZPP_Set<any> {
  static zpp_pool: ZPP_Set_ZPP_SimpleSeg | null = null;
}
export class ZPP_Set_ZPP_SimpleEvent extends ZPP_Set<any> {
  static zpp_pool: ZPP_Set_ZPP_SimpleEvent | null = null;
}
export class ZPP_Set_ZPP_CbSet extends ZPP_Set<any> {
  static zpp_pool: ZPP_Set_ZPP_CbSet | null = null;
}

// ---------------------------------------------------------------------------
// Namespace registration — compatibility with the compiled-style namespace
// ---------------------------------------------------------------------------

export function registerZNPClasses(zpp: any): void {
  if (!zpp.util) zpp.util = {};
  const u = zpp.util;
  u.ZNPNode_ZPP_CbType = ZNPNode_ZPP_CbType;
  u.ZNPNode_ZPP_CallbackSet = ZNPNode_ZPP_CallbackSet;
  u.ZNPNode_ZPP_Shape = ZNPNode_ZPP_Shape;
  u.ZNPNode_ZPP_Body = ZNPNode_ZPP_Body;
  u.ZNPNode_ZPP_Constraint = ZNPNode_ZPP_Constraint;
  u.ZNPNode_ZPP_Compound = ZNPNode_ZPP_Compound;
  u.ZNPNode_ZPP_Arbiter = ZNPNode_ZPP_Arbiter;
  u.ZNPNode_ZPP_InteractionListener = ZNPNode_ZPP_InteractionListener;
  u.ZNPNode_ZPP_CbSet = ZNPNode_ZPP_CbSet;
  u.ZNPNode_ZPP_Interactor = ZNPNode_ZPP_Interactor;
  u.ZNPNode_ZPP_BodyListener = ZNPNode_ZPP_BodyListener;
  u.ZNPNode_ZPP_CbSetPair = ZNPNode_ZPP_CbSetPair;
  u.ZNPNode_ZPP_ConstraintListener = ZNPNode_ZPP_ConstraintListener;
  u.ZNPNode_ZPP_CutInt = ZNPNode_ZPP_CutInt;
  u.ZNPNode_ZPP_CutVert = ZNPNode_ZPP_CutVert;
  u.ZNPNode_ZPP_PartitionVertex = ZNPNode_ZPP_PartitionVertex;
  u.ZNPNode_ZPP_SimplifyP = ZNPNode_ZPP_SimplifyP;
  u.ZNPNode_ZPP_PartitionedPoly = ZNPNode_ZPP_PartitionedPoly;
  u.ZNPNode_ZPP_GeomVert = ZNPNode_ZPP_GeomVert;
  u.ZNPNode_ZPP_SimpleVert = ZNPNode_ZPP_SimpleVert;
  u.ZNPNode_ZPP_SimpleEvent = ZNPNode_ZPP_SimpleEvent;
  u.ZNPNode_ZPP_Vec2 = ZNPNode_ZPP_Vec2;
  u.ZNPNode_ZPP_AABBPair = ZNPNode_ZPP_AABBPair;
  u.ZNPNode_ZPP_Edge = ZNPNode_ZPP_Edge;
  u.ZNPNode_ZPP_AABBNode = ZNPNode_ZPP_AABBNode;
  u.ZNPNode_ZPP_Component = ZNPNode_ZPP_Component;
  u.ZNPNode_ZPP_FluidArbiter = ZNPNode_ZPP_FluidArbiter;
  u.ZNPNode_ZPP_SensorArbiter = ZNPNode_ZPP_SensorArbiter;
  u.ZNPNode_ZPP_Listener = ZNPNode_ZPP_Listener;
  u.ZNPNode_ZPP_ColArbiter = ZNPNode_ZPP_ColArbiter;
  u.ZNPNode_ZPP_InteractionGroup = ZNPNode_ZPP_InteractionGroup;
  u.ZNPNode_ZPP_ToiEvent = ZNPNode_ZPP_ToiEvent;
  u.ZNPNode_ConvexResult = ZNPNode_ConvexResult;
  u.ZNPNode_ZPP_GeomPoly = ZNPNode_ZPP_GeomPoly;
  u.ZNPNode_RayResult = ZNPNode_RayResult;
  u.ZNPList_ZPP_CbType = ZNPList_ZPP_CbType;
  u.ZNPList_ZPP_CallbackSet = ZNPList_ZPP_CallbackSet;
  u.ZNPList_ZPP_Shape = ZNPList_ZPP_Shape;
  u.ZNPList_ZPP_Body = ZNPList_ZPP_Body;
  u.ZNPList_ZPP_Constraint = ZNPList_ZPP_Constraint;
  u.ZNPList_ZPP_Compound = ZNPList_ZPP_Compound;
  u.ZNPList_ZPP_Arbiter = ZNPList_ZPP_Arbiter;
  u.ZNPList_ZPP_InteractionListener = ZNPList_ZPP_InteractionListener;
  u.ZNPList_ZPP_CbSet = ZNPList_ZPP_CbSet;
  u.ZNPList_ZPP_Interactor = ZNPList_ZPP_Interactor;
  u.ZNPList_ZPP_BodyListener = ZNPList_ZPP_BodyListener;
  u.ZNPList_ZPP_CbSetPair = ZNPList_ZPP_CbSetPair;
  u.ZNPList_ZPP_ConstraintListener = ZNPList_ZPP_ConstraintListener;
  u.ZNPList_ZPP_CutInt = ZNPList_ZPP_CutInt;
  u.ZNPList_ZPP_CutVert = ZNPList_ZPP_CutVert;
  u.ZNPList_ZPP_PartitionVertex = ZNPList_ZPP_PartitionVertex;
  u.ZNPList_ZPP_SimplifyP = ZNPList_ZPP_SimplifyP;
  u.ZNPList_ZPP_PartitionedPoly = ZNPList_ZPP_PartitionedPoly;
  u.ZNPList_ZPP_GeomVert = ZNPList_ZPP_GeomVert;
  u.ZNPList_ZPP_SimpleVert = ZNPList_ZPP_SimpleVert;
  u.ZNPList_ZPP_SimpleEvent = ZNPList_ZPP_SimpleEvent;
  u.ZNPList_ZPP_Vec2 = ZNPList_ZPP_Vec2;
  u.ZNPList_ZPP_AABBPair = ZNPList_ZPP_AABBPair;
  u.ZNPList_ZPP_Edge = ZNPList_ZPP_Edge;
  u.ZNPList_ZPP_AABBNode = ZNPList_ZPP_AABBNode;
  u.ZNPList_ZPP_Component = ZNPList_ZPP_Component;
  u.ZNPList_ZPP_FluidArbiter = ZNPList_ZPP_FluidArbiter;
  u.ZNPList_ZPP_SensorArbiter = ZNPList_ZPP_SensorArbiter;
  u.ZNPList_ZPP_Listener = ZNPList_ZPP_Listener;
  u.ZNPList_ZPP_ColArbiter = ZNPList_ZPP_ColArbiter;
  u.ZNPList_ZPP_InteractionGroup = ZNPList_ZPP_InteractionGroup;
  u.ZNPList_ZPP_ToiEvent = ZNPList_ZPP_ToiEvent;
  u.ZNPList_ConvexResult = ZNPList_ConvexResult;
  u.ZNPList_ZPP_GeomPoly = ZNPList_ZPP_GeomPoly;
  u.ZNPList_RayResult = ZNPList_RayResult;
  u.ZPP_Set_ZPP_Body = ZPP_Set_ZPP_Body;
  u.ZPP_Set_ZPP_CbSetPair = ZPP_Set_ZPP_CbSetPair;
  u.ZPP_Set_ZPP_PartitionVertex = ZPP_Set_ZPP_PartitionVertex;
  u.ZPP_Set_ZPP_PartitionPair = ZPP_Set_ZPP_PartitionPair;
  u.ZPP_Set_ZPP_SimpleVert = ZPP_Set_ZPP_SimpleVert;
  u.ZPP_Set_ZPP_SimpleSeg = ZPP_Set_ZPP_SimpleSeg;
  u.ZPP_Set_ZPP_SimpleEvent = ZPP_Set_ZPP_SimpleEvent;
  u.ZPP_Set_ZPP_CbSet = ZPP_Set_ZPP_CbSet;
}
