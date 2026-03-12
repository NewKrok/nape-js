/**
 * Bootstrap module — centralised registration of all public API classes.
 *
 * Priority 26: Tree shaking support.
 *
 * Previously every module registered itself as a side-effect at module bottom
 * (e.g. `nape.phys.Body = Body`). That forced bundlers to treat every module
 * as having side-effects, preventing tree shaking.
 *
 * This file collects all nape-namespace assignments and factory-callback wiring
 * in one place. Individual modules no longer register themselves, so bundlers
 * can safely shake unused exports when only a subset of the API is imported.
 *
 * Import once at the entry point (index.ts) and in tests/setup.ts.
 */

import { getNape } from "./engine";

// --- Config / Debug ---
import { Config } from "../Config";
import { Debug } from "../util/Debug";

// --- Geometry ---
import { Vec2 } from "../geom/Vec2";
import { Vec3 } from "../geom/Vec3";
import { Mat23 } from "../geom/Mat23";
import { MatMN } from "../geom/MatMN";
import { AABB } from "../geom/AABB";
import { Winding } from "../geom/Winding";
import { Ray } from "../geom/Ray";
import { ConvexResult } from "../geom/ConvexResult";
import { RayResult } from "../geom/RayResult";
import { Geom } from "../geom/Geom";
import { GeomPoly } from "../geom/GeomPoly";
import { MarchingSquares } from "../geom/MarchingSquares";
import { Vec2List, Vec2Iterator } from "../geom/Vec2List";
import { GeomVertexIterator } from "../geom/GeomVertexIterator";
import { ZPP_GeomVertexIterator } from "../native/geom/ZPP_GeomVertexIterator";
import { ZPP_ContactList } from "../native/util/ZPP_ContactList";

// --- Physics ---
import {
  Interactor,
  _bindBodyWrapForInteractor,
  _bindCompoundWrapForInteractor,
  _bindShapeWrapForInteractor,
} from "../phys/Interactor";
import { Body } from "../phys/Body";
import { BodyType } from "../phys/BodyType";
import { Compound } from "../phys/Compound";
import { FluidProperties } from "../phys/FluidProperties";
import { Material } from "../phys/Material";
import { GravMassMode } from "../phys/GravMassMode";
import { InertiaMode } from "../phys/InertiaMode";
import { MassMode } from "../phys/MassMode";

// --- Shapes ---
import { Shape } from "../shape/Shape";
import { Circle } from "../shape/Circle";
import { Polygon } from "../shape/Polygon";
import { Edge } from "../shape/Edge";
import { ShapeType } from "../shape/ShapeType";
import { ValidationResult } from "../shape/ValidationResult";

// --- Space ---
import { Space } from "../space/Space";
import { Broadphase } from "../space/Broadphase";

// --- Dynamics ---
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { InteractionGroup } from "../dynamics/InteractionGroup";
import { ArbiterType } from "../dynamics/ArbiterType";
import { Arbiter } from "../dynamics/Arbiter";
import { CollisionArbiter } from "../dynamics/CollisionArbiter";
import { FluidArbiter } from "../dynamics/FluidArbiter";
import { ZPP_Arbiter } from "../native/dynamics/ZPP_Arbiter";
import { Contact } from "../dynamics/Contact";
import { ContactList, ContactIterator } from "../dynamics/ContactList";

// --- Callbacks ---
import { CbEvent } from "../callbacks/CbEvent";
import { CbType } from "../callbacks/CbType";
import { InteractionType } from "../callbacks/InteractionType";
import { PreFlag } from "../callbacks/PreFlag";
import { OptionType } from "../callbacks/OptionType";
import { Listener } from "../callbacks/Listener";
import { ListenerType } from "../callbacks/ListenerType";
import { Callback } from "../callbacks/Callback";
import { BodyCallback } from "../callbacks/BodyCallback";
import { ConstraintCallback } from "../callbacks/ConstraintCallback";
import { InteractionCallback } from "../callbacks/InteractionCallback";
import { PreCallback } from "../callbacks/PreCallback";
import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import { BodyListener } from "../callbacks/BodyListener";
import { ConstraintListener } from "../callbacks/ConstraintListener";
import { InteractionListener } from "../callbacks/InteractionListener";
import { PreListener } from "../callbacks/PreListener";

// --- Constraints ---
import { Constraint } from "../constraint/Constraint";
import { AngleJoint } from "../constraint/AngleJoint";
import { ZPP_AngleJoint } from "../native/constraint/ZPP_AngleJoint";
import { DistanceJoint } from "../constraint/DistanceJoint";
import { ZPP_DistanceJoint } from "../native/constraint/ZPP_DistanceJoint";
import { LineJoint } from "../constraint/LineJoint";
import { ZPP_LineJoint } from "../native/constraint/ZPP_LineJoint";
import { MotorJoint } from "../constraint/MotorJoint";
import { ZPP_MotorJoint } from "../native/constraint/ZPP_MotorJoint";
import { PivotJoint } from "../constraint/PivotJoint";
import { ZPP_PivotJoint } from "../native/constraint/ZPP_PivotJoint";
import { PulleyJoint } from "../constraint/PulleyJoint";
import { ZPP_PulleyJoint } from "../native/constraint/ZPP_PulleyJoint";
import { WeldJoint } from "../constraint/WeldJoint";
import { ZPP_WeldJoint } from "../native/constraint/ZPP_WeldJoint";
import { UserConstraint } from "../constraint/UserConstraint";

// --- Lists / iterators ---
import "../util/registerLists";
import "../native/util/ZPP_Vec2List";
import "../native/util/ZPP_MixVec2List";
import "../native/util/ZPP_PublicList";

// ===========================================================================
// All nape-namespace assignments and factory callbacks in one place
// ===========================================================================

const nape = getNape();

// Config — merge constants into nape.Config (special: Object.assign pattern)
nape.Config = Object.assign(nape.Config || {}, Config);

// Debug
nape.util.Debug = Debug;

// Geometry
nape.geom.Vec2 = Vec2;
nape.geom.Vec3 = Vec3;
nape.geom.Mat23 = Mat23;
nape.geom.MatMN = MatMN;
nape.geom.AABB = AABB;
nape.geom.Winding = Winding;
nape.geom.Ray = Ray;
nape.geom.ConvexResult = ConvexResult;
nape.geom.RayResult = RayResult;
nape.geom.Geom = Geom;
nape.geom.GeomPoly = GeomPoly;
nape.geom.MarchingSquares = MarchingSquares;
nape.geom.Vec2Iterator = Vec2Iterator;
nape.geom.Vec2List = Vec2List;
nape.geom.GeomVertexIterator = GeomVertexIterator;
nape.__zpp.geom.ZPP_GeomVertexIterator = ZPP_GeomVertexIterator;
nape.__zpp.util.ZPP_ContactList = ZPP_ContactList;

// Physics
nape.phys.Interactor = Interactor;
nape.phys.Body = Body;
_bindBodyWrapForInteractor((inner) => Body._wrap(inner));
nape.phys.BodyType = BodyType;
nape.phys.Compound = Compound;
_bindCompoundWrapForInteractor((inner) => Compound._wrap(inner));
nape.phys.FluidProperties = FluidProperties;
nape.phys.Material = Material;
nape.phys.GravMassMode = GravMassMode;
nape.phys.InertiaMode = InertiaMode;
nape.phys.MassMode = MassMode;

// Shapes
nape.shape.Shape = Shape;
_bindShapeWrapForInteractor((inner) => Shape._wrap(inner));
nape.shape.Circle = Circle;
nape.shape.Polygon = Polygon;
nape.shape.Edge = Edge;
nape.shape.ShapeType = ShapeType;
nape.shape.ValidationResult = ValidationResult;

// Space
nape.space.Space = Space;
nape.space.Broadphase = Broadphase;

// Dynamics
nape.dynamics.InteractionFilter = InteractionFilter;
nape.dynamics.InteractionGroup = InteractionGroup;
nape.dynamics.ArbiterType = ArbiterType;
nape.dynamics.Arbiter = Arbiter;
ZPP_Arbiter._createColArb = () => new CollisionArbiter();
ZPP_Arbiter._createFluidArb = () => new FluidArbiter();
nape.dynamics.Contact = Contact;
nape.dynamics.ContactIterator = ContactIterator;
nape.dynamics.ContactList = ContactList;

// Callbacks
nape.callbacks.CbEvent = CbEvent;
nape.callbacks.CbType = CbType;
nape.callbacks.InteractionType = InteractionType;
nape.callbacks.PreFlag = PreFlag;
nape.callbacks.OptionType = OptionType;
nape.callbacks.Listener = Listener;
nape.callbacks.ListenerType = ListenerType;
nape.callbacks.Callback = Callback;
ZPP_Callback._createBodyCb = () => new BodyCallback();
ZPP_Callback._createConCb = () => new ConstraintCallback();
ZPP_Callback._createIntCb = () => new InteractionCallback();
ZPP_Callback._createPreCb = () => new PreCallback();
nape.callbacks.BodyListener = BodyListener;
nape.callbacks.ConstraintListener = ConstraintListener;
nape.callbacks.InteractionListener = InteractionListener;
nape.callbacks.PreListener = PreListener;

// Constraints
nape.constraint.Constraint = Constraint;
ZPP_AngleJoint._createFn = (...args: any[]) => new (AngleJoint as any)(...args);
ZPP_DistanceJoint._createFn = (...args: any[]) => new (DistanceJoint as any)(...args);
ZPP_LineJoint._createFn = (...args: any[]) => new (LineJoint as any)(...args);
ZPP_MotorJoint._createFn = (...args: any[]) => new (MotorJoint as any)(...args);
ZPP_PivotJoint._createFn = (...args: any[]) => new (PivotJoint as any)(...args);
ZPP_PulleyJoint._createFn = (...args: any[]) => new (PulleyJoint as any)(...args);
ZPP_WeldJoint._createFn = (...args: any[]) => new (WeldJoint as any)(...args);
nape.constraint.UserConstraint = UserConstraint;

// (ZPP list backing classes register themselves via the side-effect imports above)
