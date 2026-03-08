/**
 * Vitest setup file — ensures all public API subclass modules are loaded
 * before tests run.
 *
 * These subclasses register factory callbacks (_createFn, _createBodyCb, etc.)
 * on ZPP classes at module load time. In production, index.ts imports them;
 * in tests, this setup file provides the equivalent side-effect imports.
 */

// Bootstrap: centralized nape-namespace registrations and factory callbacks
import "../src/core/bootstrap";

// Callback subclasses
import "../src/callbacks/BodyCallback";
import "../src/callbacks/ConstraintCallback";
import "../src/callbacks/InteractionCallback";
import "../src/callbacks/PreCallback";

// Listener subclasses
import "../src/callbacks/BodyListener";
import "../src/callbacks/ConstraintListener";
import "../src/callbacks/InteractionListener";
import "../src/callbacks/PreListener";

// Arbiter subclasses
import "../src/dynamics/CollisionArbiter";
import "../src/dynamics/FluidArbiter";

// Constraint subclasses (joints)
import "../src/constraint/AngleJoint";
import "../src/constraint/DistanceJoint";
import "../src/constraint/LineJoint";
import "../src/constraint/MotorJoint";
import "../src/constraint/PivotJoint";
import "../src/constraint/PulleyJoint";
import "../src/constraint/UserConstraint";
import "../src/constraint/WeldJoint";

// Interactor subclasses
import "../src/phys/Body";
import "../src/phys/Compound";

// Shape subclasses
import "../src/shape/Shape";
import "../src/shape/Circle";
import "../src/shape/Polygon";
