// Core
export { getNape } from "./core/engine";

// Geometry
export { Vec2 } from "./geom/Vec2";
export { Vec3 } from "./geom/Vec3";
export { Mat23 } from "./geom/Mat23";
export { GeomPoly } from "./geom/GeomPoly";
export { AABB } from "./geom/AABB";
export { MatMN } from "./geom/MatMN";
export { MarchingSquares } from "./geom/MarchingSquares";
export { Ray } from "./geom/Ray";
export { ConvexResult } from "./geom/ConvexResult";
export { RayResult } from "./geom/RayResult";
export { Winding } from "./geom/Winding";

// Physics
export { Body } from "./phys/Body";
export { BodyType } from "./phys/BodyType";
export { Material } from "./phys/Material";
export { FluidProperties } from "./phys/FluidProperties";
export { GravMassMode } from "./phys/GravMassMode";
export { InertiaMode } from "./phys/InertiaMode";
export { MassMode } from "./phys/MassMode";

// Shapes
export { Shape } from "./shape/Shape";
export { Circle } from "./shape/Circle";
export { Polygon } from "./shape/Polygon";
export { ShapeType } from "./shape/ShapeType";
export { ValidationResult } from "./shape/ValidationResult";

// Space
export { Space } from "./space/Space";
export { Broadphase } from "./space/Broadphase";

// Dynamics
export { InteractionFilter } from "./dynamics/InteractionFilter";
export { InteractionGroup } from "./dynamics/InteractionGroup";
export { ArbiterType } from "./dynamics/ArbiterType";

// Callbacks
export { CbEvent } from "./callbacks/CbEvent";
export { CbType } from "./callbacks/CbType";
export { InteractionType } from "./callbacks/InteractionType";
export { PreFlag } from "./callbacks/PreFlag";
export { OptionType } from "./callbacks/OptionType";
export { Listener } from "./callbacks/Listener";
export { BodyListener } from "./callbacks/BodyListener";
export { InteractionListener } from "./callbacks/InteractionListener";
export { ConstraintListener } from "./callbacks/ConstraintListener";
export { PreListener } from "./callbacks/PreListener";
export { ListenerType } from "./callbacks/ListenerType";
export { Callback } from "./callbacks/Callback";
export { BodyCallback } from "./callbacks/BodyCallback";
export { ConstraintCallback } from "./callbacks/ConstraintCallback";
export { InteractionCallback } from "./callbacks/InteractionCallback";
export { PreCallback } from "./callbacks/PreCallback";

// Constraints
export { Constraint } from "./constraint/Constraint";
export { PivotJoint } from "./constraint/PivotJoint";
export { DistanceJoint } from "./constraint/DistanceJoint";
export { AngleJoint } from "./constraint/AngleJoint";
export { WeldJoint } from "./constraint/WeldJoint";
export { MotorJoint } from "./constraint/MotorJoint";
export { LineJoint } from "./constraint/LineJoint";
export { PulleyJoint } from "./constraint/PulleyJoint";

// Utilities
export { NapeList } from "./util/NapeList";

// List/Iterator registration (side-effect import — registers all typed list pairs)
import "./util/registerLists";
