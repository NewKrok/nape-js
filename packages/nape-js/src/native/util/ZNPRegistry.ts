/**
 * ZNPRegistry — the ZNP list / node names and the ZPP_Set subclasses.
 *
 * The Haxe build had one ZNPList_X / ZNPNode_X class per element type. Here
 * every ZNPList_X is the single ZNPList class and every ZNPNode_X the single
 * ZNPNode class (with one shared node pool), kept as named aliases so call
 * sites read as before. One class per role keeps the list methods and node
 * accesses monomorphic: with ~35 subclasses, the shared ZNPList methods saw
 * ~35 object shapes and V8 fell back to megamorphic property lookups —
 * measurably slower in the step loop (joint-heavy scenes 10–40%).
 * registerZNPClasses() only assigns the names into the nape namespace for
 * compatibility.
 */

import { ZNPNode } from "./ZNPNode";
import { ZNPList } from "./ZNPList";
import { ZPP_Set } from "./ZPP_Set";

type ZNPNodeAlias = typeof ZNPNode & (new () => ZNPNode<any>);
type ZNPListAlias = typeof ZNPList & (new () => ZNPList<any>);

// --- ZNPNode classes ---
export const ZNPNode_ZPP_CbType: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_CbType = ZNPNode<any>;
export const ZNPNode_ZPP_CallbackSet: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_CallbackSet = ZNPNode<any>;
export const ZNPNode_ZPP_Shape: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_Shape = ZNPNode<any>;
export const ZNPNode_ZPP_Body: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_Body = ZNPNode<any>;
export const ZNPNode_ZPP_Constraint: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_Constraint = ZNPNode<any>;
export const ZNPNode_ZPP_Compound: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_Compound = ZNPNode<any>;
export const ZNPNode_ZPP_Arbiter: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_Arbiter = ZNPNode<any>;
export const ZNPNode_ZPP_InteractionListener: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_InteractionListener = ZNPNode<any>;
export const ZNPNode_ZPP_CbSet: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_CbSet = ZNPNode<any>;
export const ZNPNode_ZPP_Interactor: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_Interactor = ZNPNode<any>;
export const ZNPNode_ZPP_BodyListener: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_BodyListener = ZNPNode<any>;
export const ZNPNode_ZPP_CbSetPair: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_CbSetPair = ZNPNode<any>;
export const ZNPNode_ZPP_ConstraintListener: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_ConstraintListener = ZNPNode<any>;
export const ZNPNode_ZPP_CutInt: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_CutInt = ZNPNode<any>;
export const ZNPNode_ZPP_CutVert: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_CutVert = ZNPNode<any>;
export const ZNPNode_ZPP_PartitionVertex: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_PartitionVertex = ZNPNode<any>;
export const ZNPNode_ZPP_SimplifyP: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_SimplifyP = ZNPNode<any>;
export const ZNPNode_ZPP_PartitionedPoly: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_PartitionedPoly = ZNPNode<any>;
export const ZNPNode_ZPP_GeomVert: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_GeomVert = ZNPNode<any>;
export const ZNPNode_ZPP_SimpleVert: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_SimpleVert = ZNPNode<any>;
export const ZNPNode_ZPP_SimpleEvent: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_SimpleEvent = ZNPNode<any>;
export const ZNPNode_ZPP_Vec2: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_Vec2 = ZNPNode<any>;
export const ZNPNode_ZPP_AABBPair: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_AABBPair = ZNPNode<any>;
export const ZNPNode_ZPP_Edge: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_Edge = ZNPNode<any>;
export const ZNPNode_ZPP_AABBNode: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_AABBNode = ZNPNode<any>;
export const ZNPNode_ZPP_Component: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_Component = ZNPNode<any>;
export const ZNPNode_ZPP_FluidArbiter: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_FluidArbiter = ZNPNode<any>;
export const ZNPNode_ZPP_SensorArbiter: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_SensorArbiter = ZNPNode<any>;
export const ZNPNode_ZPP_Listener: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_Listener = ZNPNode<any>;
export const ZNPNode_ZPP_ColArbiter: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_ColArbiter = ZNPNode<any>;
export const ZNPNode_ZPP_InteractionGroup: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_InteractionGroup = ZNPNode<any>;
export const ZNPNode_ZPP_ToiEvent: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_ToiEvent = ZNPNode<any>;
export const ZNPNode_ConvexResult: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ConvexResult = ZNPNode<any>;
export const ZNPNode_ZPP_GeomPoly: ZNPNodeAlias = ZNPNode;
export type ZNPNode_ZPP_GeomPoly = ZNPNode<any>;
export const ZNPNode_RayResult: ZNPNodeAlias = ZNPNode;
export type ZNPNode_RayResult = ZNPNode<any>;

// --- ZNPList classes ---
export const ZNPList_ZPP_CbType: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_CbType = ZNPList<any>;
export const ZNPList_ZPP_CallbackSet: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_CallbackSet = ZNPList<any>;
export const ZNPList_ZPP_Shape: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_Shape = ZNPList<any>;
export const ZNPList_ZPP_Body: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_Body = ZNPList<any>;
export const ZNPList_ZPP_Constraint: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_Constraint = ZNPList<any>;
export const ZNPList_ZPP_Compound: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_Compound = ZNPList<any>;
export const ZNPList_ZPP_Arbiter: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_Arbiter = ZNPList<any>;
export const ZNPList_ZPP_InteractionListener: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_InteractionListener = ZNPList<any>;
export const ZNPList_ZPP_CbSet: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_CbSet = ZNPList<any>;
export const ZNPList_ZPP_Interactor: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_Interactor = ZNPList<any>;
export const ZNPList_ZPP_BodyListener: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_BodyListener = ZNPList<any>;
export const ZNPList_ZPP_CbSetPair: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_CbSetPair = ZNPList<any>;
export const ZNPList_ZPP_ConstraintListener: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_ConstraintListener = ZNPList<any>;
export const ZNPList_ZPP_CutInt: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_CutInt = ZNPList<any>;
export const ZNPList_ZPP_CutVert: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_CutVert = ZNPList<any>;
export const ZNPList_ZPP_PartitionVertex: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_PartitionVertex = ZNPList<any>;
export const ZNPList_ZPP_SimplifyP: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_SimplifyP = ZNPList<any>;
export const ZNPList_ZPP_PartitionedPoly: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_PartitionedPoly = ZNPList<any>;
export const ZNPList_ZPP_GeomVert: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_GeomVert = ZNPList<any>;
export const ZNPList_ZPP_SimpleVert: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_SimpleVert = ZNPList<any>;
export const ZNPList_ZPP_SimpleEvent: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_SimpleEvent = ZNPList<any>;
export const ZNPList_ZPP_Vec2: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_Vec2 = ZNPList<any>;
export const ZNPList_ZPP_AABBPair: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_AABBPair = ZNPList<any>;
export const ZNPList_ZPP_Edge: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_Edge = ZNPList<any>;
export const ZNPList_ZPP_AABBNode: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_AABBNode = ZNPList<any>;
export const ZNPList_ZPP_Component: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_Component = ZNPList<any>;
export const ZNPList_ZPP_FluidArbiter: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_FluidArbiter = ZNPList<any>;
export const ZNPList_ZPP_SensorArbiter: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_SensorArbiter = ZNPList<any>;
export const ZNPList_ZPP_Listener: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_Listener = ZNPList<any>;
export const ZNPList_ZPP_ColArbiter: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_ColArbiter = ZNPList<any>;
export const ZNPList_ZPP_InteractionGroup: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_InteractionGroup = ZNPList<any>;
export const ZNPList_ZPP_ToiEvent: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_ToiEvent = ZNPList<any>;
export const ZNPList_ConvexResult: ZNPListAlias = ZNPList;
export type ZNPList_ConvexResult = ZNPList<any>;
export const ZNPList_ZPP_GeomPoly: ZNPListAlias = ZNPList;
export type ZNPList_ZPP_GeomPoly = ZNPList<any>;
export const ZNPList_RayResult: ZNPListAlias = ZNPList;
export type ZNPList_RayResult = ZNPList<any>;

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
// Namespace registration — compatibility with the nape namespace
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
