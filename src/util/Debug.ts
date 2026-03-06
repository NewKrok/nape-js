import { getNape } from "../core/engine";

/** Drains a singly-linked pool list to null. */
function clearPool(holder: any, poolProp: string, nextProp: string): void {
  while (holder[poolProp] != null) {
    const nxt = holder[poolProp][nextProp];
    holder[poolProp][nextProp] = null;
    holder[poolProp] = nxt;
  }
}

/**
 * Nape engine utilities.
 *
 * Extracted from nape-compiled.js Priority 14.
 */
export class Debug {
  static version(): string {
    return "Nape 2.0.19";
  }

  /**
   * Clears all internal object pools, freeing memory used by pooled instances.
   * Call this when you want to reset the engine between scenes.
   */
  static clearObjectPools(): void {
    const nape = getNape();
    const zpp = nape.__zpp as any;

    // --- Public iterator pools (zpp_next linkage) ---
    clearPool(nape.constraint.ConstraintIterator,       "zpp_pool", "zpp_next");
    clearPool(nape.phys.InteractorIterator,             "zpp_pool", "zpp_next");
    clearPool(nape.phys.BodyIterator,                   "zpp_pool", "zpp_next");
    clearPool(nape.phys.CompoundIterator,               "zpp_pool", "zpp_next");
    clearPool(nape.callbacks.ListenerIterator,          "zpp_pool", "zpp_next");
    clearPool(nape.callbacks.CbTypeIterator,            "zpp_pool", "zpp_next");
    clearPool(nape.geom.ConvexResultIterator,           "zpp_pool", "zpp_next");
    clearPool(nape.geom.GeomPolyIterator,               "zpp_pool", "zpp_next");
    clearPool(nape.geom.Vec2Iterator,                   "zpp_pool", "zpp_next");
    clearPool(nape.geom.RayResultIterator,              "zpp_pool", "zpp_next");
    clearPool(nape.shape.ShapeIterator,                 "zpp_pool", "zpp_next");
    clearPool(nape.shape.EdgeIterator,                  "zpp_pool", "zpp_next");
    clearPool(nape.dynamics.ContactIterator,            "zpp_pool", "zpp_next");
    clearPool(nape.dynamics.ArbiterIterator,            "zpp_pool", "zpp_next");
    clearPool(nape.dynamics.InteractionGroupIterator,   "zpp_pool", "zpp_next");

    // --- ZNPNode pools (next linkage) ---
    clearPool(zpp.util.ZNPNode_ZPP_CbType,             "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_CallbackSet,        "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_Shape,              "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_Body,               "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_Constraint,         "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_Compound,           "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_Arbiter,            "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_InteractionListener,"zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_CbSet,              "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_Interactor,         "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_BodyListener,       "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_CbSetPair,          "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_ConstraintListener, "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_CutInt,             "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_CutVert,            "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_PartitionVertex,    "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_SimplifyP,          "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_PartitionedPoly,    "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_GeomVert,           "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_SimpleVert,         "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_SimpleEvent,        "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_Vec2,               "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_AABBPair,           "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_Edge,               "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_AABBNode,           "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_Component,          "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_FluidArbiter,       "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_SensorArbiter,      "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_Listener,           "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_ColArbiter,         "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_InteractionGroup,   "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_ToiEvent,           "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ConvexResult,           "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_ZPP_GeomPoly,           "zpp_pool", "next");
    clearPool(zpp.util.ZNPNode_RayResult,              "zpp_pool", "next");

    // --- ZPP class pools (next linkage) ---
    clearPool(zpp.phys.ZPP_Material,                   "zpp_pool", "next");
    clearPool(zpp.phys.ZPP_FluidProperties,            "zpp_pool", "next");
    clearPool(zpp.callbacks.ZPP_CbSetPair,             "zpp_pool", "next");
    clearPool(zpp.callbacks.ZPP_Callback,              "zpp_pool", "next");
    clearPool(zpp.callbacks.ZPP_CbSet,                 "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_GeomVert,                   "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_GeomVertexIterator,         "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_Mat23,                      "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_CutVert,                    "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_CutInt,                     "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_Vec2,                       "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_PartitionVertex,            "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_SimplifyV,                  "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_SimplifyP,                  "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_PartitionedPoly,            "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_PartitionPair,              "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_AABB,                       "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_SimpleVert,                 "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_SimpleSeg,                  "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_SimpleEvent,                "zpp_pool", "next");
    clearPool(zpp.util.Hashable2_Boolfalse,            "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_ToiEvent,                   "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_MarchSpan,                  "zpp_pool", "next");
    clearPool(zpp.geom.ZPP_MarchPair,                  "zpp_pool", "next");
    clearPool(zpp.shape.ZPP_Edge,                      "zpp_pool", "next");
    clearPool(zpp.space.ZPP_SweepData,                 "zpp_pool", "next");
    clearPool(zpp.space.ZPP_AABBNode,                  "zpp_pool", "next");
    clearPool(zpp.space.ZPP_AABBPair,                  "zpp_pool", "next");
    clearPool(zpp.dynamics.ZPP_Contact,                "zpp_pool", "next");
    clearPool(zpp.space.ZPP_Island,                    "zpp_pool", "next");
    clearPool(zpp.space.ZPP_Component,                 "zpp_pool", "next");
    clearPool(zpp.space.ZPP_CallbackSet,               "zpp_pool", "next");
    clearPool(zpp.dynamics.ZPP_SensorArbiter,          "zpp_pool", "next");
    clearPool(zpp.dynamics.ZPP_FluidArbiter,           "zpp_pool", "next");
    clearPool(zpp.dynamics.ZPP_ColArbiter,             "zpp_pool", "next");
    clearPool(zpp.dynamics.ZPP_InteractionFilter,      "zpp_pool", "next");

    // --- ZPP_Set pools (next linkage) ---
    clearPool(zpp.util.ZPP_Set_ZPP_Body,              "zpp_pool", "next");
    clearPool(zpp.util.ZPP_Set_ZPP_CbSetPair,         "zpp_pool", "next");
    clearPool(zpp.util.ZPP_Set_ZPP_PartitionVertex,   "zpp_pool", "next");
    clearPool(zpp.util.ZPP_Set_ZPP_PartitionPair,     "zpp_pool", "next");
    clearPool(zpp.util.ZPP_Set_ZPP_SimpleVert,        "zpp_pool", "next");
    clearPool(zpp.util.ZPP_Set_ZPP_SimpleSeg,         "zpp_pool", "next");
    clearPool(zpp.util.ZPP_Set_ZPP_SimpleEvent,       "zpp_pool", "next");
    clearPool(zpp.util.ZPP_Set_ZPP_CbSet,             "zpp_pool", "next");

    // --- ZPP_PubPool (zpp_pool linkage on elements) ---
    clearPool(zpp.util.ZPP_PubPool, "poolGeomPoly", "zpp_pool");
    clearPool(zpp.util.ZPP_PubPool, "poolVec2",     "zpp_pool");
    clearPool(zpp.util.ZPP_PubPool, "poolVec3",     "zpp_pool");
  }
}

// Self-register: replace compiled nape.util.Debug with TS class.
const nape = getNape();
nape.util.Debug = Debug;
