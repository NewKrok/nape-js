import { ContactIterator } from "../dynamics/ContactList";
import { Vec2Iterator } from "../geom/Vec2List";
import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import { ZPP_CbSet } from "../native/callbacks/ZPP_CbSet";
import { ZPP_CbSetPair } from "../native/callbacks/ZPP_CbSetPair";
import { ZPP_ColArbiter } from "../native/dynamics/ZPP_ColArbiter";
import { ZPP_Contact } from "../native/dynamics/ZPP_Contact";
import { ZPP_FluidArbiter } from "../native/dynamics/ZPP_FluidArbiter";
import { ZPP_InteractionFilter } from "../native/dynamics/ZPP_InteractionFilter";
import { ZPP_SensorArbiter } from "../native/dynamics/ZPP_SensorArbiter";
import { ZPP_AABB } from "../native/geom/ZPP_AABB";
import { ZPP_CutInt } from "../native/geom/ZPP_CutInt";
import { ZPP_CutVert } from "../native/geom/ZPP_CutVert";
import { ZPP_GeomVert } from "../native/geom/ZPP_GeomVert";
import { ZPP_GeomVertexIterator } from "../native/geom/ZPP_GeomVertexIterator";
import { ZPP_MarchPair } from "../native/geom/ZPP_MarchPair";
import { ZPP_MarchSpan } from "../native/geom/ZPP_MarchSpan";
import { ZPP_Mat23 } from "../native/geom/ZPP_Mat23";
import { ZPP_PartitionPair } from "../native/geom/ZPP_PartitionPair";
import { ZPP_PartitionVertex } from "../native/geom/ZPP_PartitionVertex";
import { ZPP_PartitionedPoly } from "../native/geom/ZPP_PartitionedPoly";
import { ZPP_SimpleEvent } from "../native/geom/ZPP_SimpleEvent";
import { ZPP_SimpleSeg } from "../native/geom/ZPP_SimpleSeg";
import { ZPP_SimpleVert } from "../native/geom/ZPP_SimpleVert";
import { ZPP_SimplifyP } from "../native/geom/ZPP_SimplifyP";
import { ZPP_SimplifyV } from "../native/geom/ZPP_SimplifyV";
import { ZPP_ToiEvent } from "../native/geom/ZPP_ToiEvent";
import { ZPP_Vec2 } from "../native/geom/ZPP_Vec2";
import { ZPP_FluidProperties } from "../native/phys/ZPP_FluidProperties";
import { ZPP_Material } from "../native/phys/ZPP_Material";
import { ZPP_Edge } from "../native/shape/ZPP_Edge";
import { ZPP_AABBNode } from "../native/space/ZPP_AABBNode";
import { ZPP_AABBPair } from "../native/space/ZPP_AABBPair";
import { ZPP_CallbackSet } from "../native/space/ZPP_CallbackSet";
import { ZPP_Component } from "../native/space/ZPP_Component";
import { ZPP_Island } from "../native/space/ZPP_Island";
import { ZPP_SweepData } from "../native/space/ZPP_SweepData";
import { Hashable2_Boolfalse } from "../native/util/Hashable2_Boolfalse";
import {
  ZNPNode_ZPP_CbType,
  ZNPNode_ZPP_CallbackSet,
  ZNPNode_ZPP_Shape,
  ZNPNode_ZPP_Body,
  ZNPNode_ZPP_Constraint,
  ZNPNode_ZPP_Compound,
  ZNPNode_ZPP_Arbiter,
  ZNPNode_ZPP_InteractionListener,
  ZNPNode_ZPP_CbSet,
  ZNPNode_ZPP_Interactor,
  ZNPNode_ZPP_BodyListener,
  ZNPNode_ZPP_CbSetPair,
  ZNPNode_ZPP_ConstraintListener,
  ZNPNode_ZPP_CutInt,
  ZNPNode_ZPP_CutVert,
  ZNPNode_ZPP_PartitionVertex,
  ZNPNode_ZPP_SimplifyP,
  ZNPNode_ZPP_PartitionedPoly,
  ZNPNode_ZPP_GeomVert,
  ZNPNode_ZPP_SimpleVert,
  ZNPNode_ZPP_SimpleEvent,
  ZNPNode_ZPP_Vec2,
  ZNPNode_ZPP_AABBPair,
  ZNPNode_ZPP_Edge,
  ZNPNode_ZPP_AABBNode,
  ZNPNode_ZPP_Component,
  ZNPNode_ZPP_FluidArbiter,
  ZNPNode_ZPP_SensorArbiter,
  ZNPNode_ZPP_Listener,
  ZNPNode_ZPP_ColArbiter,
  ZNPNode_ZPP_InteractionGroup,
  ZNPNode_ZPP_ToiEvent,
  ZNPNode_ConvexResult,
  ZNPNode_ZPP_GeomPoly,
  ZNPNode_RayResult,
  ZPP_Set_ZPP_Body,
  ZPP_Set_ZPP_CbSetPair,
  ZPP_Set_ZPP_PartitionVertex,
  ZPP_Set_ZPP_PartitionPair,
  ZPP_Set_ZPP_SimpleVert,
  ZPP_Set_ZPP_SimpleSeg,
  ZPP_Set_ZPP_SimpleEvent,
  ZPP_Set_ZPP_CbSet,
} from "../native/util/ZNPRegistry";
import { ZPP_PubPool } from "../native/util/ZPP_PubPool";
import {
  ConstraintIterator,
  InteractorIterator,
  BodyIterator,
  CompoundIterator,
  ListenerIterator,
  CbTypeIterator,
  ConvexResultIterator,
  GeomPolyIterator,
  RayResultIterator,
  ShapeIterator,
  EdgeIterator,
  ArbiterIterator,
  InteractionGroupIterator,
} from "./registerLists";

/** Drains a singly-linked pool list to null. */
function clearPool(holder: any, poolProp: string, nextProp: string): void {
  while (holder[poolProp] != null) {
    const nxt = holder[poolProp][nextProp];
    holder[poolProp][nextProp] = null;
    holder[poolProp] = nxt;
  }
}

/**
 * Engine-wide utilities: version string and object-pool reset.
 *
 * Exported from the package root so consumers can call
 * `Debug.clearObjectPools()` between scenes.
 */
declare const __PACKAGE_VERSION__: string;

export class Debug {
  static version(): string {
    return typeof __PACKAGE_VERSION__ === "string" ? `nape-js ${__PACKAGE_VERSION__}` : "nape-js";
  }

  /**
   * Clears all internal object pools, freeing memory used by pooled instances.
   * Call this when you want to reset the engine between scenes.
   */
  static clearObjectPools(): void {
    // --- Public iterator pools (zpp_next linkage) ---
    clearPool(ConstraintIterator, "zpp_pool", "zpp_next");
    clearPool(InteractorIterator, "zpp_pool", "zpp_next");
    clearPool(BodyIterator, "zpp_pool", "zpp_next");
    clearPool(CompoundIterator, "zpp_pool", "zpp_next");
    clearPool(ListenerIterator, "zpp_pool", "zpp_next");
    clearPool(CbTypeIterator, "zpp_pool", "zpp_next");
    clearPool(ConvexResultIterator, "zpp_pool", "zpp_next");
    clearPool(GeomPolyIterator, "zpp_pool", "zpp_next");
    clearPool(Vec2Iterator, "zpp_pool", "zpp_next");
    clearPool(RayResultIterator, "zpp_pool", "zpp_next");
    clearPool(ShapeIterator, "zpp_pool", "zpp_next");
    clearPool(EdgeIterator, "zpp_pool", "zpp_next");
    clearPool(ContactIterator, "zpp_pool", "zpp_next");
    clearPool(ArbiterIterator, "zpp_pool", "zpp_next");
    clearPool(InteractionGroupIterator, "zpp_pool", "zpp_next");

    // --- ZNPNode pools (next linkage) ---
    clearPool(ZNPNode_ZPP_CbType, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_CallbackSet, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_Shape, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_Body, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_Constraint, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_Compound, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_Arbiter, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_InteractionListener, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_CbSet, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_Interactor, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_BodyListener, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_CbSetPair, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_ConstraintListener, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_CutInt, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_CutVert, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_PartitionVertex, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_SimplifyP, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_PartitionedPoly, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_GeomVert, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_SimpleVert, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_SimpleEvent, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_Vec2, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_AABBPair, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_Edge, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_AABBNode, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_Component, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_FluidArbiter, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_SensorArbiter, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_Listener, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_ColArbiter, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_InteractionGroup, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_ToiEvent, "zpp_pool", "next");
    clearPool(ZNPNode_ConvexResult, "zpp_pool", "next");
    clearPool(ZNPNode_ZPP_GeomPoly, "zpp_pool", "next");
    clearPool(ZNPNode_RayResult, "zpp_pool", "next");

    // --- ZPP class pools (next linkage) ---
    clearPool(ZPP_Material, "zpp_pool", "next");
    clearPool(ZPP_FluidProperties, "zpp_pool", "next");
    clearPool(ZPP_CbSetPair, "zpp_pool", "next");
    clearPool(ZPP_Callback, "zpp_pool", "next");
    clearPool(ZPP_CbSet, "zpp_pool", "next");
    clearPool(ZPP_GeomVert, "zpp_pool", "next");
    clearPool(ZPP_GeomVertexIterator, "zpp_pool", "next");
    clearPool(ZPP_Mat23, "zpp_pool", "next");
    clearPool(ZPP_CutVert, "zpp_pool", "next");
    clearPool(ZPP_CutInt, "zpp_pool", "next");
    clearPool(ZPP_Vec2, "zpp_pool", "next");
    clearPool(ZPP_PartitionVertex, "zpp_pool", "next");
    clearPool(ZPP_SimplifyV, "zpp_pool", "next");
    clearPool(ZPP_SimplifyP, "zpp_pool", "next");
    clearPool(ZPP_PartitionedPoly, "zpp_pool", "next");
    clearPool(ZPP_PartitionPair, "zpp_pool", "next");
    clearPool(ZPP_AABB, "zpp_pool", "next");
    clearPool(ZPP_SimpleVert, "zpp_pool", "next");
    clearPool(ZPP_SimpleSeg, "zpp_pool", "next");
    clearPool(ZPP_SimpleEvent, "zpp_pool", "next");
    clearPool(Hashable2_Boolfalse, "zpp_pool", "next");
    clearPool(ZPP_ToiEvent, "zpp_pool", "next");
    clearPool(ZPP_MarchSpan, "zpp_pool", "next");
    clearPool(ZPP_MarchPair, "zpp_pool", "next");
    clearPool(ZPP_Edge, "zpp_pool", "next");
    clearPool(ZPP_SweepData, "zpp_pool", "next");
    clearPool(ZPP_AABBNode, "zpp_pool", "next");
    clearPool(ZPP_AABBPair, "zpp_pool", "next");
    clearPool(ZPP_Contact, "zpp_pool", "next");
    clearPool(ZPP_Island, "zpp_pool", "next");
    clearPool(ZPP_Component, "zpp_pool", "next");
    clearPool(ZPP_CallbackSet, "zpp_pool", "next");
    clearPool(ZPP_SensorArbiter, "zpp_pool", "next");
    clearPool(ZPP_FluidArbiter, "zpp_pool", "next");
    clearPool(ZPP_ColArbiter, "zpp_pool", "next");
    clearPool(ZPP_InteractionFilter, "zpp_pool", "next");

    // --- ZPP_Set pools (next linkage) ---
    clearPool(ZPP_Set_ZPP_Body, "zpp_pool", "next");
    clearPool(ZPP_Set_ZPP_CbSetPair, "zpp_pool", "next");
    clearPool(ZPP_Set_ZPP_PartitionVertex, "zpp_pool", "next");
    clearPool(ZPP_Set_ZPP_PartitionPair, "zpp_pool", "next");
    clearPool(ZPP_Set_ZPP_SimpleVert, "zpp_pool", "next");
    clearPool(ZPP_Set_ZPP_SimpleSeg, "zpp_pool", "next");
    clearPool(ZPP_Set_ZPP_SimpleEvent, "zpp_pool", "next");
    clearPool(ZPP_Set_ZPP_CbSet, "zpp_pool", "next");

    // --- ZPP_PubPool (zpp_pool linkage on elements) ---
    clearPool(ZPP_PubPool, "poolGeomPoly", "zpp_pool");
    clearPool(ZPP_PubPool, "poolVec2", "zpp_pool");
    clearPool(ZPP_PubPool, "poolVec3", "zpp_pool");
  }
}
