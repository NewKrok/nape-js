/**
 * ZPPRegistry — registers all ZPP_* TypeScript classes into the compiled
 * zpp_nape namespace, sets _nape/_zpp references, runs _init() calls, and
 * triggers all _initEnums()/_initStatics() methods.
 *
 * Called synchronously from the nape-compiled.js factory function with the
 * factory-local `nape`, `zpp_nape`, and `$hxClasses` variables. This avoids
 * any circular import to engine.ts while keeping all init-time logic in TS.
 */

import { ZPP_Const } from "./ZPP_Const";
import { ZPP_ID } from "./ZPP_ID";
import { ZPP_Flags } from "./ZPP_Flags";
import { ZPP_Math } from "./ZPP_Math";
import { ZPP_PubPool } from "./ZPP_PubPool";
import { ZNPArray2_Float, ZNPArray2_ZPP_GeomVert, ZNPArray2_ZPP_MarchPair } from "./ZNPArray2";
import { Hashable2_Boolfalse } from "./Hashable2_Boolfalse";
import { FastHash2_Hashable2_Boolfalse } from "./FastHash2_Hashable2_Boolfalse";
import { registerZNPClasses } from "./ZNPRegistry";

import { ZPP_Callback } from "../callbacks/ZPP_Callback";
import { ZPP_CbSet } from "../callbacks/ZPP_CbSet";
import { ZPP_CbSetPair } from "../callbacks/ZPP_CbSetPair";
import { ZPP_CbType } from "../callbacks/ZPP_CbType";
import { ZPP_Listener } from "../callbacks/ZPP_Listener";
import { ZPP_BodyListener } from "../callbacks/ZPP_BodyListener";
import { ZPP_ConstraintListener } from "../callbacks/ZPP_ConstraintListener";
import { ZPP_InteractionListener } from "../callbacks/ZPP_InteractionListener";
import { ZPP_OptionType } from "../callbacks/ZPP_OptionType";

import { ZPP_Constraint } from "../constraint/ZPP_Constraint";
import { ZPP_AngleJoint } from "../constraint/ZPP_AngleJoint";
import { ZPP_CopyHelper } from "../constraint/ZPP_CopyHelper";
import { ZPP_DistanceJoint } from "../constraint/ZPP_DistanceJoint";
import { ZPP_LineJoint } from "../constraint/ZPP_LineJoint";
import { ZPP_MotorJoint } from "../constraint/ZPP_MotorJoint";
import { ZPP_PivotJoint } from "../constraint/ZPP_PivotJoint";
import { ZPP_PulleyJoint } from "../constraint/ZPP_PulleyJoint";
import { ZPP_UserConstraint } from "../constraint/ZPP_UserConstraint";
import { ZPP_UserBody } from "../constraint/ZPP_UserBody";
import { ZPP_WeldJoint } from "../constraint/ZPP_WeldJoint";

import { ZPP_Arbiter } from "../dynamics/ZPP_Arbiter";
import { ZPP_SensorArbiter } from "../dynamics/ZPP_SensorArbiter";
import { ZPP_FluidArbiter } from "../dynamics/ZPP_FluidArbiter";
import { ZPP_ColArbiter } from "../dynamics/ZPP_ColArbiter";
import { ZPP_IContact } from "../dynamics/ZPP_IContact";
import { ZPP_Contact } from "../dynamics/ZPP_Contact";
import { ZPP_InteractionFilter } from "../dynamics/ZPP_InteractionFilter";
import { ZPP_InteractionGroup } from "../dynamics/ZPP_InteractionGroup";
import { ZPP_SpaceArbiterList } from "../dynamics/ZPP_SpaceArbiterList";

import { ZPP_AABB } from "../geom/ZPP_AABB";
import { ZPP_Collide } from "../geom/ZPP_Collide";
import { ZPP_Convex } from "../geom/ZPP_Convex";
import { ZPP_ConvexRayResult } from "../geom/ZPP_ConvexRayResult";
import { ZPP_CutVert } from "../geom/ZPP_CutVert";
import { ZPP_CutInt } from "../geom/ZPP_CutInt";
import { ZPP_Cutter } from "../geom/ZPP_Cutter";
import { ZPP_Geom } from "../geom/ZPP_Geom";
import { ZPP_GeomVert } from "../geom/ZPP_GeomVert";
import { ZPP_GeomPoly } from "../geom/ZPP_GeomPoly";
import { ZPP_MarchSpan } from "../geom/ZPP_MarchSpan";
import { ZPP_MarchPair } from "../geom/ZPP_MarchPair";
import { ZPP_MarchingSquares } from "../geom/ZPP_MarchingSquares";
import { ZPP_Mat23 } from "../geom/ZPP_Mat23";
import { ZPP_MatMN } from "../geom/ZPP_MatMN";
import { ZPP_Monotone } from "../geom/ZPP_Monotone";
import { ZPP_PartitionVertex } from "../geom/ZPP_PartitionVertex";
import { ZPP_PartitionedPoly } from "../geom/ZPP_PartitionedPoly";
import { ZPP_PartitionPair } from "../geom/ZPP_PartitionPair";
import { ZPP_Ray } from "../geom/ZPP_Ray";
import { ZPP_SimpleVert } from "../geom/ZPP_SimpleVert";
import { ZPP_SimpleSeg } from "../geom/ZPP_SimpleSeg";
import { ZPP_SimpleEvent } from "../geom/ZPP_SimpleEvent";
import { ZPP_SimpleSweep } from "../geom/ZPP_SimpleSweep";
import { ZPP_Simple } from "../geom/ZPP_Simple";
import { ZPP_SimplifyV } from "../geom/ZPP_SimplifyV";
import { ZPP_SimplifyP } from "../geom/ZPP_SimplifyP";
import { ZPP_Simplify } from "../geom/ZPP_Simplify";
import { ZPP_ToiEvent } from "../geom/ZPP_ToiEvent";
import { ZPP_SweepDistance } from "../geom/ZPP_SweepDistance";
import { ZPP_Triangular } from "../geom/ZPP_Triangular";
import { ZPP_Vec2 } from "../geom/ZPP_Vec2";
import { ZPP_Vec3 } from "../geom/ZPP_Vec3";
import { ZPP_VecMath } from "../geom/ZPP_VecMath";

import { ZPP_Interactor } from "../phys/ZPP_Interactor";
import { ZPP_Body } from "../phys/ZPP_Body";
import { ZPP_Compound } from "../phys/ZPP_Compound";
import { ZPP_FluidProperties } from "../phys/ZPP_FluidProperties";
import { ZPP_Material } from "../phys/ZPP_Material";

import { ZPP_Shape } from "../shape/ZPP_Shape";
import { ZPP_Circle } from "../shape/ZPP_Circle";
import { ZPP_Edge } from "../shape/ZPP_Edge";
import { ZPP_Polygon } from "../shape/ZPP_Polygon";

import { ZPP_Broadphase } from "../space/ZPP_Broadphase";
import { ZPP_AABBNode } from "../space/ZPP_AABBNode";
import { ZPP_AABBPair } from "../space/ZPP_AABBPair";
import { ZPP_AABBTree } from "../space/ZPP_AABBTree";
import { ZPP_DynAABBPhase } from "../space/ZPP_DynAABBPhase";
import { ZPP_Island } from "../space/ZPP_Island";
import { ZPP_Component } from "../space/ZPP_Component";
import { ZPP_CallbackSet } from "../space/ZPP_CallbackSet";
import { ZPP_CbSetManager } from "../space/ZPP_CbSetManager";
import { ZPP_Space } from "../space/ZPP_Space";
import { ZPP_SweepData } from "../space/ZPP_SweepData";
import { ZPP_SweepPhase } from "../space/ZPP_SweepPhase";

import { $hxClasses } from "../../core/HaxeShims";

/**
 * Creates and returns the nape namespace object with all ZPP_* classes registered.
 * Previously called from nape-compiled.js; now fully self-contained (Priority 20).
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function registerZPPClasses(): any {
  const nape: any = {};
  const zpp: any = {};
  const hxClasses = $hxClasses;

  // --- Public API namespace initialization ---
  nape.callbacks = {};
  nape.constraint = {};
  nape.dynamics = {};
  nape.geom = {};
  nape.phys = {};
  nape.shape = {};
  nape.space = {};
  nape.util = {};

  // --- top-level ---
  zpp.ZPP_Const = hxClasses["zpp_nape.ZPP_Const"] = ZPP_Const;
  ZPP_Const.prototype.__class__ = ZPP_Const;
  zpp.ZPP_ID = hxClasses["zpp_nape.ZPP_ID"] = ZPP_ID;
  ZPP_ID.prototype.__class__ = ZPP_ID;

  // --- callbacks ---
  if (!zpp.callbacks) zpp.callbacks = {};
  (ZPP_Callback as any)._nape = nape;
  (ZPP_Callback as any)._zpp = zpp;
  zpp.callbacks.ZPP_Callback = hxClasses["zpp_nape.callbacks.ZPP_Callback"] = ZPP_Callback;
  ZPP_Callback.prototype.__class__ = ZPP_Callback;

  (ZPP_CbSet as any)._zpp = zpp;
  zpp.callbacks.ZPP_CbSet = hxClasses["zpp_nape.callbacks.ZPP_CbSet"] = ZPP_CbSet;
  ZPP_CbSet.prototype.__class__ = ZPP_CbSet;

  (ZPP_CbSetPair as any)._zpp = zpp;
  zpp.callbacks.ZPP_CbSetPair = hxClasses["zpp_nape.callbacks.ZPP_CbSetPair"] = ZPP_CbSetPair;
  ZPP_CbSetPair.prototype.__class__ = ZPP_CbSetPair;

  // ZNPNode/ZNPList/ZPP_Set classes must exist before CbType _initEnums.
  if (!zpp.util) zpp.util = {};
  registerZNPClasses(zpp, hxClasses);

  (ZPP_CbType as any)._zpp = zpp;
  zpp.callbacks.ZPP_CbType = hxClasses["zpp_nape.callbacks.ZPP_CbType"] = ZPP_CbType;
  ZPP_CbType.prototype.__class__ = ZPP_CbType;

  zpp.util.ZPP_Flags = hxClasses["zpp_nape.util.ZPP_Flags"] = ZPP_Flags;
  ZPP_Flags.prototype.__class__ = ZPP_Flags;

  (ZPP_Listener as any)._nape = nape;
  (ZPP_Listener as any)._zpp = zpp;
  zpp.callbacks.ZPP_Listener = hxClasses["zpp_nape.callbacks.ZPP_Listener"] = ZPP_Listener;
  ZPP_Listener.prototype.__class__ = ZPP_Listener;

  zpp.callbacks.ZPP_BodyListener = hxClasses["zpp_nape.callbacks.ZPP_BodyListener"] = ZPP_BodyListener;
  ZPP_BodyListener.prototype.__class__ = ZPP_BodyListener;

  zpp.callbacks.ZPP_ConstraintListener = hxClasses["zpp_nape.callbacks.ZPP_ConstraintListener"] = ZPP_ConstraintListener;
  ZPP_ConstraintListener.prototype.__class__ = ZPP_ConstraintListener;

  zpp.callbacks.ZPP_InteractionListener = hxClasses["zpp_nape.callbacks.ZPP_InteractionListener"] = ZPP_InteractionListener;
  ZPP_InteractionListener.prototype.__class__ = ZPP_InteractionListener;

  (ZPP_OptionType as any)._nape = nape;
  (ZPP_OptionType as any)._zpp = zpp;
  zpp.callbacks.ZPP_OptionType = hxClasses["zpp_nape.callbacks.ZPP_OptionType"] = ZPP_OptionType;
  ZPP_OptionType.prototype.__class__ = ZPP_OptionType;

  // --- constraint ---
  if (!zpp.constraint) zpp.constraint = {};
  (ZPP_Constraint as any)._nape = nape;
  (ZPP_Constraint as any)._zpp = zpp;
  zpp.constraint.ZPP_Constraint = hxClasses["zpp_nape.constraint.ZPP_Constraint"] = ZPP_Constraint;
  zpp.constraint.ZPP_Constraint.__name__ = (ZPP_Constraint as any).__name__;
  ZPP_Constraint.prototype.__class__ = ZPP_Constraint;

  zpp.constraint.ZPP_AngleJoint = hxClasses["zpp_nape.constraint.ZPP_AngleJoint"] = ZPP_AngleJoint;
  zpp.constraint.ZPP_AngleJoint.__name__ = (ZPP_AngleJoint as any).__name__;
  ZPP_AngleJoint.prototype.__class__ = ZPP_AngleJoint;

  zpp.constraint.ZPP_CopyHelper = hxClasses["zpp_nape.constraint.ZPP_CopyHelper"] = ZPP_CopyHelper;
  ZPP_CopyHelper.prototype.__class__ = ZPP_CopyHelper;

  zpp.constraint.ZPP_DistanceJoint = hxClasses["zpp_nape.constraint.ZPP_DistanceJoint"] = ZPP_DistanceJoint;
  zpp.constraint.ZPP_DistanceJoint.__name__ = (ZPP_DistanceJoint as any).__name__;
  ZPP_DistanceJoint.prototype.__class__ = ZPP_DistanceJoint;

  zpp.constraint.ZPP_LineJoint = hxClasses["zpp_nape.constraint.ZPP_LineJoint"] = ZPP_LineJoint;
  zpp.constraint.ZPP_LineJoint.__name__ = (ZPP_LineJoint as any).__name__;
  ZPP_LineJoint.prototype.__class__ = ZPP_LineJoint;

  zpp.constraint.ZPP_MotorJoint = hxClasses["zpp_nape.constraint.ZPP_MotorJoint"] = ZPP_MotorJoint;
  zpp.constraint.ZPP_MotorJoint.__name__ = (ZPP_MotorJoint as any).__name__;
  ZPP_MotorJoint.prototype.__class__ = ZPP_MotorJoint;

  zpp.constraint.ZPP_PivotJoint = hxClasses["zpp_nape.constraint.ZPP_PivotJoint"] = ZPP_PivotJoint;
  zpp.constraint.ZPP_PivotJoint.__name__ = (ZPP_PivotJoint as any).__name__;
  ZPP_PivotJoint.prototype.__class__ = ZPP_PivotJoint;

  zpp.constraint.ZPP_PulleyJoint = hxClasses["zpp_nape.constraint.ZPP_PulleyJoint"] = ZPP_PulleyJoint;
  zpp.constraint.ZPP_PulleyJoint.__name__ = (ZPP_PulleyJoint as any).__name__;
  ZPP_PulleyJoint.prototype.__class__ = ZPP_PulleyJoint;

  zpp.constraint.ZPP_UserConstraint = hxClasses["zpp_nape.constraint.ZPP_UserConstraint"] = ZPP_UserConstraint;
  zpp.constraint.ZPP_UserConstraint.__name__ = (ZPP_UserConstraint as any).__name__;
  ZPP_UserConstraint.prototype.__class__ = ZPP_UserConstraint;

  zpp.constraint.ZPP_UserBody = hxClasses["zpp_nape.constraint.ZPP_UserBody"] = ZPP_UserBody;
  ZPP_UserBody.prototype.__class__ = ZPP_UserBody;

  zpp.constraint.ZPP_WeldJoint = hxClasses["zpp_nape.constraint.ZPP_WeldJoint"] = ZPP_WeldJoint;
  zpp.constraint.ZPP_WeldJoint.__name__ = (ZPP_WeldJoint as any).__name__;
  ZPP_WeldJoint.prototype.__class__ = ZPP_WeldJoint;

  // --- dynamics ---
  if (!zpp.dynamics) zpp.dynamics = {};
  (ZPP_Arbiter as any)._nape = nape;
  (ZPP_Arbiter as any)._zpp = zpp;
  zpp.dynamics.ZPP_Arbiter = hxClasses["zpp_nape.dynamics.ZPP_Arbiter"] = ZPP_Arbiter;
  ZPP_Arbiter.prototype.__class__ = ZPP_Arbiter;

  zpp.dynamics.ZPP_SensorArbiter = hxClasses["zpp_nape.dynamics.ZPP_SensorArbiter"] = ZPP_SensorArbiter;
  ZPP_SensorArbiter.prototype.__class__ = ZPP_SensorArbiter;

  (ZPP_FluidArbiter as any)._nape = nape;
  (ZPP_FluidArbiter as any)._zpp = zpp;
  zpp.dynamics.ZPP_FluidArbiter = hxClasses["zpp_nape.dynamics.ZPP_FluidArbiter"] = ZPP_FluidArbiter;
  ZPP_FluidArbiter.prototype.__class__ = ZPP_FluidArbiter;

  (ZPP_ColArbiter as any)._nape = nape;
  (ZPP_ColArbiter as any)._zpp = zpp;
  zpp.dynamics.ZPP_ColArbiter = hxClasses["zpp_nape.dynamics.ZPP_ColArbiter"] = ZPP_ColArbiter;
  ZPP_ColArbiter.prototype.__class__ = ZPP_ColArbiter;

  zpp.dynamics.ZPP_IContact = hxClasses["zpp_nape.dynamics.ZPP_IContact"] = ZPP_IContact;
  ZPP_IContact.prototype.__class__ = ZPP_IContact;

  (ZPP_Contact as any)._nape = nape;
  (ZPP_Contact as any)._zpp = zpp;
  zpp.dynamics.ZPP_Contact = hxClasses["zpp_nape.dynamics.ZPP_Contact"] = ZPP_Contact;
  ZPP_Contact.prototype.__class__ = ZPP_Contact;

  (ZPP_InteractionFilter as any)._nape = nape;
  (ZPP_InteractionFilter as any)._zpp = zpp;
  zpp.dynamics.ZPP_InteractionFilter = hxClasses["zpp_nape.dynamics.ZPP_InteractionFilter"] = ZPP_InteractionFilter;
  ZPP_InteractionFilter.prototype.__class__ = ZPP_InteractionFilter;

  (ZPP_InteractionGroup as any)._zpp = zpp;
  zpp.dynamics.ZPP_InteractionGroup = hxClasses["zpp_nape.dynamics.ZPP_InteractionGroup"] = ZPP_InteractionGroup;
  ZPP_InteractionGroup.prototype.__class__ = ZPP_InteractionGroup;

  (ZPP_SpaceArbiterList as any)._nape = nape;
  (ZPP_SpaceArbiterList as any)._zpp = zpp;
  zpp.dynamics.ZPP_SpaceArbiterList = hxClasses["zpp_nape.dynamics.ZPP_SpaceArbiterList"] = ZPP_SpaceArbiterList;
  ZPP_SpaceArbiterList.prototype.__class__ = ZPP_SpaceArbiterList;

  // --- geom ---
  if (!zpp.geom) zpp.geom = {};
  (ZPP_AABB as any)._nape = nape;
  (ZPP_AABB as any)._zpp = zpp;
  zpp.geom.ZPP_AABB = hxClasses["zpp_nape.geom.ZPP_AABB"] = ZPP_AABB;
  ZPP_AABB.prototype.__class__ = ZPP_AABB;

  zpp.geom.ZPP_Collide = hxClasses["zpp_nape.geom.ZPP_Collide"] = ZPP_Collide;
  ZPP_Collide.prototype.__class__ = ZPP_Collide;

  zpp.geom.ZPP_Convex = hxClasses["zpp_nape.geom.ZPP_Convex"] = ZPP_Convex;
  ZPP_Convex.prototype.__class__ = ZPP_Convex;

  zpp.geom.ZPP_ConvexRayResult = hxClasses["zpp_nape.geom.ZPP_ConvexRayResult"] = ZPP_ConvexRayResult;
  ZPP_ConvexRayResult.prototype.__class__ = ZPP_ConvexRayResult;

  zpp.geom.ZPP_CutVert = hxClasses["zpp_nape.geom.ZPP_CutVert"] = ZPP_CutVert;
  ZPP_CutVert.prototype.__class__ = ZPP_CutVert;

  zpp.geom.ZPP_CutInt = hxClasses["zpp_nape.geom.ZPP_CutInt"] = ZPP_CutInt;
  ZPP_CutInt.prototype.__class__ = ZPP_CutInt;

  zpp.geom.ZPP_Cutter = hxClasses["zpp_nape.geom.ZPP_Cutter"] = ZPP_Cutter;
  ZPP_Cutter.prototype.__class__ = ZPP_Cutter;

  zpp.geom.ZPP_Geom = hxClasses["zpp_nape.geom.ZPP_Geom"] = ZPP_Geom;
  ZPP_Geom.prototype.__class__ = ZPP_Geom;

  zpp.geom.ZPP_GeomVert = hxClasses["zpp_nape.geom.ZPP_GeomVert"] = ZPP_GeomVert;
  ZPP_GeomVert.prototype.__class__ = ZPP_GeomVert;
  (ZPP_GeomVert as any)._createVec2Fn = function () { return new nape.geom.Vec2(); };

  zpp.geom.ZPP_GeomPoly = hxClasses["zpp_nape.geom.ZPP_GeomPoly"] = ZPP_GeomPoly;
  ZPP_GeomPoly.prototype.__class__ = ZPP_GeomPoly;

  zpp.geom.ZPP_MarchSpan = hxClasses["zpp_nape.geom.ZPP_MarchSpan"] = ZPP_MarchSpan;
  ZPP_MarchSpan.prototype.__class__ = ZPP_MarchSpan;

  zpp.geom.ZPP_MarchPair = hxClasses["zpp_nape.geom.ZPP_MarchPair"] = ZPP_MarchPair;
  ZPP_MarchPair.prototype.__class__ = ZPP_MarchPair;

  (ZPP_MarchingSquares as any)._init(zpp, nape);
  zpp.geom.ZPP_MarchingSquares = hxClasses["zpp_nape.geom.ZPP_MarchingSquares"] = ZPP_MarchingSquares;
  ZPP_MarchingSquares.prototype.__class__ = ZPP_MarchingSquares;

  (ZPP_Mat23 as any)._nape = nape;
  zpp.geom.ZPP_Mat23 = hxClasses["zpp_nape.geom.ZPP_Mat23"] = ZPP_Mat23;
  ZPP_Mat23.prototype.__class__ = ZPP_Mat23;

  zpp.geom.ZPP_MatMN = hxClasses["zpp_nape.geom.ZPP_MatMN"] = ZPP_MatMN;
  ZPP_MatMN.prototype.__class__ = ZPP_MatMN;

  zpp.geom.ZPP_Monotone = hxClasses["zpp_nape.geom.ZPP_Monotone"] = ZPP_Monotone;

  zpp.geom.ZPP_PartitionVertex = hxClasses["zpp_nape.geom.ZPP_PartitionVertex"] = ZPP_PartitionVertex;
  ZPP_PartitionVertex.prototype.__class__ = ZPP_PartitionVertex;

  zpp.geom.ZPP_PartitionedPoly = hxClasses["zpp_nape.geom.ZPP_PartitionedPoly"] = ZPP_PartitionedPoly;
  ZPP_PartitionedPoly.prototype.__class__ = ZPP_PartitionedPoly;

  zpp.geom.ZPP_Ray = hxClasses["zpp_nape.geom.ZPP_Ray"] = ZPP_Ray;
  ZPP_Ray.prototype.__class__ = ZPP_Ray;

  zpp.geom.ZPP_SimpleVert = hxClasses["zpp_nape.geom.ZPP_SimpleVert"] = ZPP_SimpleVert;
  ZPP_SimpleVert.prototype.__class__ = ZPP_SimpleVert;

  zpp.geom.ZPP_SimpleSeg = hxClasses["zpp_nape.geom.ZPP_SimpleSeg"] = ZPP_SimpleSeg;
  ZPP_SimpleSeg.prototype.__class__ = ZPP_SimpleSeg;

  zpp.geom.ZPP_SimpleEvent = hxClasses["zpp_nape.geom.ZPP_SimpleEvent"] = ZPP_SimpleEvent;
  ZPP_SimpleEvent.prototype.__class__ = ZPP_SimpleEvent;

  zpp.geom.ZPP_SimpleSweep = hxClasses["zpp_nape.geom.ZPP_SimpleSweep"] = ZPP_SimpleSweep;
  ZPP_SimpleSweep.prototype.__class__ = ZPP_SimpleSweep;

  zpp.geom.ZPP_Simple = hxClasses["zpp_nape.geom.ZPP_Simple"] = ZPP_Simple;
  ZPP_Simple.prototype.__class__ = ZPP_Simple;

  zpp.geom.ZPP_SimplifyV = hxClasses["zpp_nape.geom.ZPP_SimplifyV"] = ZPP_SimplifyV;
  ZPP_SimplifyV.prototype.__class__ = ZPP_SimplifyV;

  zpp.geom.ZPP_SimplifyP = hxClasses["zpp_nape.geom.ZPP_SimplifyP"] = ZPP_SimplifyP;
  ZPP_SimplifyP.prototype.__class__ = ZPP_SimplifyP;

  zpp.geom.ZPP_Simplify = hxClasses["zpp_nape.geom.ZPP_Simplify"] = ZPP_Simplify;
  ZPP_Simplify.prototype.__class__ = ZPP_Simplify;

  zpp.geom.ZPP_ToiEvent = hxClasses["zpp_nape.geom.ZPP_ToiEvent"] = ZPP_ToiEvent;
  ZPP_ToiEvent.prototype.__class__ = ZPP_ToiEvent;

  zpp.geom.ZPP_SweepDistance = hxClasses["zpp_nape.geom.ZPP_SweepDistance"] = ZPP_SweepDistance;
  ZPP_SweepDistance.prototype.__class__ = ZPP_SweepDistance;

  zpp.geom.ZPP_PartitionPair = hxClasses["zpp_nape.geom.ZPP_PartitionPair"] = ZPP_PartitionPair;
  ZPP_PartitionPair.prototype.__class__ = ZPP_PartitionPair;

  zpp.geom.ZPP_Triangular = hxClasses["zpp_nape.geom.ZPP_Triangular"] = ZPP_Triangular;
  ZPP_Triangular.prototype.__class__ = ZPP_Triangular;

  zpp.geom.ZPP_Vec2 = hxClasses["zpp_nape.geom.ZPP_Vec2"] = ZPP_Vec2;
  ZPP_Vec2.prototype.__class__ = ZPP_Vec2;

  (ZPP_Vec3 as any)._zpp = zpp;
  zpp.geom.ZPP_Vec3 = hxClasses["zpp_nape.geom.ZPP_Vec3"] = ZPP_Vec3;
  ZPP_Vec3.prototype.__class__ = ZPP_Vec3;

  zpp.geom.ZPP_VecMath = hxClasses["zpp_nape.geom.ZPP_VecMath"] = ZPP_VecMath;
  ZPP_VecMath.prototype.__class__ = ZPP_VecMath;

  // --- phys ---
  if (!zpp.phys) zpp.phys = {};
  zpp.phys.ZPP_Interactor = hxClasses["zpp_nape.phys.ZPP_Interactor"] = ZPP_Interactor;
  (ZPP_Interactor as any)._init(zpp, nape);
  ZPP_Interactor.prototype.__class__ = ZPP_Interactor;

  (ZPP_Body as any)._init(zpp, nape);
  zpp.phys.ZPP_Body = hxClasses["zpp_nape.phys.ZPP_Body"] = ZPP_Body;
  ZPP_Body.prototype.__class__ = ZPP_Body;

  (ZPP_Compound as any)._nape = nape;
  (ZPP_Compound as any)._zpp = zpp;
  (ZPP_Compound as any)._init();
  zpp.phys.ZPP_Compound = hxClasses["zpp_nape.phys.ZPP_Compound"] = ZPP_Compound;
  ZPP_Compound.prototype.__class__ = ZPP_Compound;

  (ZPP_FluidProperties as any)._nape = nape;
  (ZPP_FluidProperties as any)._zpp = zpp;
  zpp.phys.ZPP_FluidProperties = hxClasses["zpp_nape.phys.ZPP_FluidProperties"] = ZPP_FluidProperties;
  ZPP_FluidProperties.prototype.__class__ = ZPP_FluidProperties;

  (ZPP_Material as any)._nape = nape;
  (ZPP_Material as any)._zpp = zpp;
  zpp.phys.ZPP_Material = hxClasses["zpp_nape.phys.ZPP_Material"] = ZPP_Material;
  ZPP_Material.prototype.__class__ = ZPP_Material;

  // --- shape ---
  if (!zpp.shape) zpp.shape = {};
  (ZPP_Shape as any)._nape = nape;
  (ZPP_Shape as any)._zpp = zpp;
  (ZPP_Shape as any)._init();
  zpp.shape.ZPP_Shape = hxClasses["zpp_nape.shape.ZPP_Shape"] = ZPP_Shape;
  ZPP_Shape.prototype.__class__ = ZPP_Shape;

  (ZPP_Circle as any)._nape = nape;
  (ZPP_Circle as any)._zpp = zpp;
  (ZPP_Circle as any)._init();
  zpp.shape.ZPP_Circle = hxClasses["zpp_nape.shape.ZPP_Circle"] = ZPP_Circle;
  ZPP_Circle.prototype.__class__ = ZPP_Circle;

  (ZPP_Edge as any)._nape = nape;
  (ZPP_Edge as any)._zpp = zpp;
  zpp.shape.ZPP_Edge = hxClasses["zpp_nape.shape.ZPP_Edge"] = ZPP_Edge;
  ZPP_Edge.prototype.__class__ = ZPP_Edge;

  (ZPP_Polygon as any)._nape = nape;
  (ZPP_Polygon as any)._zpp = zpp;
  (ZPP_Polygon as any)._init();
  zpp.shape.ZPP_Polygon = hxClasses["zpp_nape.shape.ZPP_Polygon"] = ZPP_Polygon;
  ZPP_Polygon.prototype.__class__ = ZPP_Polygon;

  // --- space ---
  if (!zpp.space) zpp.space = {};
  (ZPP_Broadphase as any)._zpp = zpp;
  (ZPP_Broadphase as any)._nape = nape;
  zpp.space.ZPP_Broadphase = hxClasses["zpp_nape.space.ZPP_Broadphase"] = ZPP_Broadphase;
  ZPP_Broadphase.prototype.__class__ = ZPP_Broadphase;

  zpp.space.ZPP_AABBNode = hxClasses["zpp_nape.space.ZPP_AABBNode"] = ZPP_AABBNode;
  ZPP_AABBNode.prototype.__class__ = ZPP_AABBNode;

  zpp.space.ZPP_AABBPair = hxClasses["zpp_nape.space.ZPP_AABBPair"] = ZPP_AABBPair;
  ZPP_AABBPair.prototype.__class__ = ZPP_AABBPair;

  zpp.space.ZPP_AABBTree = hxClasses["zpp_nape.space.ZPP_AABBTree"] = ZPP_AABBTree;
  ZPP_AABBTree.prototype.__class__ = ZPP_AABBTree;

  (ZPP_DynAABBPhase as any)._zpp = zpp;
  (ZPP_DynAABBPhase as any)._nape = nape;
  (ZPP_DynAABBPhase as any)._init();
  zpp.space.ZPP_DynAABBPhase = hxClasses["zpp_nape.space.ZPP_DynAABBPhase"] = ZPP_DynAABBPhase;
  ZPP_DynAABBPhase.prototype.__class__ = ZPP_DynAABBPhase;

  (ZPP_Island as any)._zpp = zpp;
  zpp.space.ZPP_Island = hxClasses["zpp_nape.space.ZPP_Island"] = ZPP_Island;
  ZPP_Island.prototype.__class__ = ZPP_Island;

  zpp.space.ZPP_Component = hxClasses["zpp_nape.space.ZPP_Component"] = ZPP_Component;
  ZPP_Component.prototype.__class__ = ZPP_Component;

  (ZPP_CallbackSet as any)._zpp = zpp;
  zpp.space.ZPP_CallbackSet = hxClasses["zpp_nape.space.ZPP_CallbackSet"] = ZPP_CallbackSet;
  ZPP_CallbackSet.prototype.__class__ = ZPP_CallbackSet;

  (ZPP_CbSetManager as any)._zpp = zpp;
  zpp.space.ZPP_CbSetManager = hxClasses["zpp_nape.space.ZPP_CbSetManager"] = ZPP_CbSetManager;
  ZPP_CbSetManager.prototype.__class__ = ZPP_CbSetManager;

  (ZPP_Space as any)._zpp = zpp;
  (ZPP_Space as any)._nape = nape;
  zpp.space.ZPP_Space = hxClasses["zpp_nape.space.ZPP_Space"] = ZPP_Space;
  ZPP_Space.prototype.__class__ = ZPP_Space;

  zpp.space.ZPP_SweepData = hxClasses["zpp_nape.space.ZPP_SweepData"] = ZPP_SweepData;
  ZPP_SweepData.prototype.__class__ = ZPP_SweepData;

  (ZPP_SweepPhase as any)._zpp = zpp;
  (ZPP_SweepPhase as any)._nape = nape;
  (ZPP_SweepPhase as any)._init();
  zpp.space.ZPP_SweepPhase = hxClasses["zpp_nape.space.ZPP_SweepPhase"] = ZPP_SweepPhase;
  ZPP_SweepPhase.prototype.__class__ = ZPP_SweepPhase;

  // --- util (remaining) ---
  zpp.util.ZNPArray2_Float = ZNPArray2_Float;
  zpp.util.ZNPArray2_ZPP_GeomVert = ZNPArray2_ZPP_GeomVert;
  zpp.util.ZNPArray2_ZPP_MarchPair = ZNPArray2_ZPP_MarchPair;
  zpp.util.Hashable2_Boolfalse = Hashable2_Boolfalse;
  zpp.util.FastHash2_Hashable2_Boolfalse = FastHash2_Hashable2_Boolfalse;
  zpp.util.ZPP_Math = hxClasses["zpp_nape.util.ZPP_Math"] = ZPP_Math;
  ZPP_Math.prototype.__class__ = ZPP_Math;
  zpp.util.ZPP_PubPool = hxClasses["zpp_nape.util.ZPP_PubPool"] = ZPP_PubPool;
  ZPP_PubPool.prototype.__class__ = ZPP_PubPool;

  // --- init statics (engine.ts calls _initEnums after TS enum classes load) ---
  zpp.callbacks.ZPP_InteractionListener._initStatics(zpp);
  zpp.geom.ZPP_Collide._initStatics(zpp);
  zpp.space.ZPP_AABBTree._initStatics();

  // Expose zpp_nape via nape.__zpp for engine.ts and other TS modules.
  nape.__zpp = zpp;

  return nape;
}
