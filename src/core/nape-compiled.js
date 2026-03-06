// @ts-nocheck
/* eslint-disable */
// Nape physics engine — compiled from Haxe via nape-to-js
// All ZPP_* classes: registration moved to TypeScript → src/native/util/ZPPRegistry.ts
// All public API classes: converted to TypeScript → src/{callbacks,constraint,dynamics,geom,phys,shape,space,util}/
// Public API classes self-register via side-effect imports in engine.ts.
import { registerZPPClasses } from "../native/util/ZPPRegistry";
import { $hxClasses as $hxClasses_TS, js as js_TS } from "./HaxeShims";
var _nape;
var define = function (factory) {
  _nape = factory();
};
define(function () {
  "use strict";
  var nape, zpp_nape;
  var $hxClasses = $hxClasses_TS;
  var js = js_TS;
  // --- Namespace initialization ---
  if (typeof nape == "undefined") nape = {};
  if (!nape.callbacks) nape.callbacks = {};
  if (!nape.constraint) nape.constraint = {};
  if (!nape.dynamics) nape.dynamics = {};
  if (!nape.geom) nape.geom = {};
  if (!nape.phys) nape.phys = {};
  if (!nape.shape) nape.shape = {};
  if (!nape.space) nape.space = {};
  if (!nape.util) nape.util = {};
  // --- Minimal stubs for subclasses that can't be side-effect imported from ---
  // --- engine.ts due to circular ESM dependencies (extends base → engine cycle). ---
  // --- TS classes replace these stubs at module load time via self-registration.  ---

  // Callback subclasses: created by ZPP_Callback.wrapper_*() at runtime.
  nape.callbacks.BodyCallback = function () {};
  nape.callbacks.BodyCallback.__name__ = ["nape", "callbacks", "BodyCallback"];
  nape.callbacks.ConstraintCallback = function () {};
  nape.callbacks.ConstraintCallback.__name__ = ["nape", "callbacks", "ConstraintCallback"];
  nape.callbacks.InteractionCallback = function () {};
  nape.callbacks.InteractionCallback.__name__ = ["nape", "callbacks", "InteractionCallback"];
  nape.callbacks.PreCallback = function () {};
  nape.callbacks.PreCallback.__name__ = ["nape", "callbacks", "PreCallback"];

  // Listener subclasses: created by listener factory code at runtime.
  nape.callbacks.BodyListener = function () {};
  nape.callbacks.BodyListener.__name__ = ["nape", "callbacks", "BodyListener"];
  nape.callbacks.ConstraintListener = function () {};
  nape.callbacks.ConstraintListener.__name__ = ["nape", "callbacks", "ConstraintListener"];
  nape.callbacks.InteractionListener = function () {};
  nape.callbacks.InteractionListener.__name__ = ["nape", "callbacks", "InteractionListener"];
  nape.callbacks.PreListener = function () {};
  nape.callbacks.PreListener.__name__ = ["nape", "callbacks", "PreListener"];

  // Constraint subclasses: created by user code and copy() methods.
  nape.constraint.AngleJoint = function () {};
  nape.constraint.AngleJoint.__name__ = ["nape", "constraint", "AngleJoint"];
  nape.constraint.DistanceJoint = function () {};
  nape.constraint.DistanceJoint.__name__ = ["nape", "constraint", "DistanceJoint"];
  nape.constraint.LineJoint = function () {};
  nape.constraint.LineJoint.__name__ = ["nape", "constraint", "LineJoint"];
  nape.constraint.MotorJoint = function () {};
  nape.constraint.MotorJoint.__name__ = ["nape", "constraint", "MotorJoint"];
  nape.constraint.PivotJoint = function () {};
  nape.constraint.PivotJoint.__name__ = ["nape", "constraint", "PivotJoint"];
  nape.constraint.PulleyJoint = function () {};
  nape.constraint.PulleyJoint.__name__ = ["nape", "constraint", "PulleyJoint"];
  nape.constraint.UserConstraint = function () {};
  nape.constraint.UserConstraint.__name__ = ["nape", "constraint", "UserConstraint"];
  nape.constraint.WeldJoint = function () {};
  nape.constraint.WeldJoint.__name__ = ["nape", "constraint", "WeldJoint"];

  // Arbiter subclasses: created by ZPP_Arbiter.wrapper() at runtime.
  nape.dynamics.CollisionArbiter = function () {};
  nape.dynamics.CollisionArbiter.__name__ = ["nape", "dynamics", "CollisionArbiter"];
  nape.dynamics.FluidArbiter = function () {};
  nape.dynamics.FluidArbiter.__name__ = ["nape", "dynamics", "FluidArbiter"];

  // Interactor subclasses: Body/Compound created by user code and copy().
  nape.phys.Body = function () {};
  nape.phys.Body.__name__ = ["nape", "phys", "Body"];
  nape.phys.Compound = function () {};
  nape.phys.Compound.__name__ = ["nape", "phys", "Compound"];

  // Shape and subclasses: created by user code.
  // Shape.ts can't import engine.ts at module bottom (circular ESM dep).
  nape.shape.Shape = function () {};
  nape.shape.Shape.__name__ = ["nape", "shape", "Shape"];
  nape.shape.Circle = function () {};
  nape.shape.Circle.__name__ = ["nape", "shape", "Circle"];
  nape.shape.Polygon = function () {};
  nape.shape.Polygon.__name__ = ["nape", "shape", "Polygon"];

  // --- ZPP class registration ---
  if (typeof zpp_nape == "undefined") zpp_nape = {};
  registerZPPClasses(nape, zpp_nape, $hxClasses);
  // --- Haxe runtime bootstrap ---
  {
    String.__name__ = true;
    Array.__name__ = true;
  }
  Object.defineProperty(js._Boot.HaxeError.prototype, "message", {
    get: function () {
      return String(this.val);
    },
  });
  js.Boot.__toStr = {}.toString;
  return nape;
});

export default _nape;
