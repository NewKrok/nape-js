// @ts-nocheck
/* eslint-disable */
// Nape physics engine — compiled from Haxe via nape-to-js
// All ZPP_* classes: registration moved to TypeScript → src/native/util/ZPPRegistry.ts
import { registerZPPClasses } from "../native/util/ZPPRegistry";
import { $hxClasses as $hxClasses_TS, Reflect as Reflect_TS, Std as Std_TS, StringTools as StringTools_TS, js as js_TS, $estr as $estr_TS } from "./HaxeShims";
var _nape;
var define = function (factory) {
  _nape = factory();
};
define(function () {
  "use strict";
  var nape, zpp_nape, sandbox;
  // Haxe shims — extracted to TypeScript → src/core/HaxeShims.ts
  var $hxClasses = $hxClasses_TS;
  var $estr = $estr_TS;
  var js = js_TS;
  var Reflect = Reflect_TS;
  var Std = Std_TS;
  var StringTools = StringTools_TS;
  if (typeof nape == "undefined") nape = {};
  nape.Config = $hxClasses["nape.Config"] = function () {};
  nape.Config.__name__ = ["nape", "Config"];
  nape.Config.prototype.__class__ = nape.Config;
  if (!nape.callbacks) nape.callbacks = {};
  // nape.callbacks.Callback: converted to TypeScript → src/callbacks/Callback.ts
  // Minimal stub needed because compiled code (ZPP_Space, ZPP_Callback wrappers) creates instances.
  // TS classes replace these stubs and fix prototypes via Object.setPrototypeOf at module load time.
  nape.callbacks.Callback = function () {
    this.zpp_inner = null;
    if (!zpp_nape.callbacks.ZPP_Callback.internal) {
      throw new js._Boot.HaxeError("Error: Callback cannot be instantiated derp!");
    }
  };
  nape.callbacks.Callback.__name__ = ["nape", "callbacks", "Callback"];
  nape.callbacks.Callback.prototype.__class__ = nape.callbacks.Callback;
  // nape.callbacks.BodyCallback: stub → src/callbacks/BodyCallback.ts
  nape.callbacks.BodyCallback = function () {
    nape.callbacks.Callback.call(this);
  };
  nape.callbacks.BodyCallback.__name__ = ["nape", "callbacks", "BodyCallback"];
  nape.callbacks.BodyCallback.__super__ = nape.callbacks.Callback;
  nape.callbacks.BodyCallback.prototype = Object.create(nape.callbacks.Callback.prototype);
  nape.callbacks.BodyCallback.prototype.__class__ = nape.callbacks.BodyCallback;
  // nape.callbacks.Listener: converted to TypeScript → src/callbacks/Listener.ts
  // Registration handled by Listener.ts at module load time.
  // Stub needed because BodyListener/ConstraintListener/etc __super__ reference.
  nape.callbacks.Listener = function () {
    this.zpp_inner = null;
    if (!zpp_nape.callbacks.ZPP_Listener.internal) {
      throw new js._Boot.HaxeError("Error: Cannot instantiate Listener derp!");
    }
  };
  nape.callbacks.Listener.__name__ = ["nape", "callbacks", "Listener"];
  nape.callbacks.Listener.prototype.zpp_inner = null;
  nape.callbacks.Listener.prototype.__class__ = nape.callbacks.Listener;
  // nape.callbacks.BodyListener: converted to TypeScript → src/callbacks/BodyListener.ts
  // Registration handled by BodyListener.ts at module load time.
  // nape.callbacks.CbEvent: converted to TypeScript → src/callbacks/CbEvent.ts
  // Minimal stub needed because compiled init code (line ~119982) creates singletons.
  // The real CbEvent class replaces this at module load time via self-registration.
  nape.callbacks.CbEvent = function () {
    if (!zpp_nape.util.ZPP_Flags.internal) {
      throw new js._Boot.HaxeError("Error: Cannot instantiate CbEvent derp!");
    }
  };
  nape.callbacks.CbEvent.__name__ = ["nape", "callbacks", "CbEvent"];
  nape.callbacks.CbEvent.prototype.__class__ = nape.callbacks.CbEvent;
  // nape.callbacks.CbType: converted to TypeScript → src/callbacks/CbType.ts
  // Minimal stub so ANY_* singletons can be created during compiled init (line ~121055).
  // The real CbType class replaces this at module load time via self-registration.
  nape.callbacks.CbType = function () {
    this.zpp_inner = null;
    this.zpp_inner = new zpp_nape.callbacks.ZPP_CbType();
    this.zpp_inner.outer = this;
  };
  nape.callbacks.CbType.__name__ = ["nape", "callbacks", "CbType"];
  nape.callbacks.CbType.prototype.__class__ = nape.callbacks.CbType;
  // nape.callbacks.CbTypeIterator + nape.callbacks.CbTypeList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.callbacks.ConstraintCallback: stub → src/callbacks/ConstraintCallback.ts
  nape.callbacks.ConstraintCallback = function () {
    nape.callbacks.Callback.call(this);
  };
  nape.callbacks.ConstraintCallback.__name__ = ["nape", "callbacks", "ConstraintCallback"];
  nape.callbacks.ConstraintCallback.__super__ = nape.callbacks.Callback;
  nape.callbacks.ConstraintCallback.prototype = Object.create(nape.callbacks.Callback.prototype);
  nape.callbacks.ConstraintCallback.prototype.__class__ = nape.callbacks.ConstraintCallback;
  // nape.callbacks.ConstraintListener: converted to TypeScript → src/callbacks/ConstraintListener.ts
  // Registration handled by ConstraintListener.ts at module load time.
  // nape.callbacks.InteractionCallback: stub → src/callbacks/InteractionCallback.ts
  nape.callbacks.InteractionCallback = function () {
    nape.callbacks.Callback.call(this);
  };
  nape.callbacks.InteractionCallback.__name__ = ["nape", "callbacks", "InteractionCallback"];
  nape.callbacks.InteractionCallback.__super__ = nape.callbacks.Callback;
  nape.callbacks.InteractionCallback.prototype = Object.create(nape.callbacks.Callback.prototype);
  nape.callbacks.InteractionCallback.prototype.__class__ = nape.callbacks.InteractionCallback;
  // nape.callbacks.InteractionListener: converted to TypeScript → src/callbacks/InteractionListener.ts
  // Registration handled by InteractionListener.ts at module load time.
  // nape.callbacks.InteractionType: converted to TypeScript → src/callbacks/InteractionType.ts
  // Registration handled by InteractionType.ts at module load time.
  // nape.callbacks.ListenerIterator + nape.callbacks.ListenerList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.callbacks.ListenerType: converted to TypeScript → src/callbacks/ListenerType.ts
  // Minimal stub needed for init-time singleton creation (~line 120354).
  // ListenerType.ts replaces this class and fixes prototypes via Object.setPrototypeOf.
  nape.callbacks.ListenerType = function () {
    if (!zpp_nape.util.ZPP_Flags.internal) {
      throw new js._Boot.HaxeError(
        "Error: Cannot instantiate ListenerType derp!"
      );
    }
  };
  nape.callbacks.ListenerType.__name__ = ["nape", "callbacks", "ListenerType"];
  nape.callbacks.ListenerType.prototype.__class__ = nape.callbacks.ListenerType;
  // nape.callbacks.OptionType: converted to TypeScript → src/callbacks/OptionType.ts
  // Minimal stub so ZPP_OptionType.argument() works before TS module loads.
  // The real OptionType class replaces this at module load time via self-registration.
  nape.callbacks.OptionType = function (includes, excludes) {
    this.zpp_inner = null;
    this.zpp_inner = new zpp_nape.callbacks.ZPP_OptionType();
    this.zpp_inner.outer = this;
    if (includes != null) {
      this.including(includes);
    }
    if (excludes != null) {
      this.excluding(excludes);
    }
  };
  nape.callbacks.OptionType.__name__ = ["nape", "callbacks", "OptionType"];
  nape.callbacks.OptionType.prototype.including = function (includes) {
    this.zpp_inner.append(this.zpp_inner.includes, includes);
    return this;
  };
  nape.callbacks.OptionType.prototype.excluding = function (excludes) {
    this.zpp_inner.append(this.zpp_inner.excludes, excludes);
    return this;
  };
  nape.callbacks.OptionType.prototype.__class__ = nape.callbacks.OptionType;
  // nape.callbacks.PreCallback: stub → src/callbacks/PreCallback.ts
  nape.callbacks.PreCallback = function () {
    nape.callbacks.Callback.call(this);
  };
  nape.callbacks.PreCallback.__name__ = ["nape", "callbacks", "PreCallback"];
  nape.callbacks.PreCallback.__super__ = nape.callbacks.Callback;
  nape.callbacks.PreCallback.prototype = Object.create(nape.callbacks.Callback.prototype);
  nape.callbacks.PreCallback.prototype.__class__ = nape.callbacks.PreCallback;
  // nape.callbacks.PreFlag: converted to TypeScript → src/callbacks/PreFlag.ts
  // Registration handled by PreFlag.ts at module load time.
  // nape.callbacks.PreListener: converted to TypeScript → src/callbacks/PreListener.ts
  // Registration handled by PreListener.ts at module load time.
  if (!nape.constraint) nape.constraint = {};
  // nape.constraint.Constraint: converted to TypeScript → src/constraint/Constraint.ts
  // Registration handled by Constraint.ts at module load time.
  nape.constraint.Constraint = $hxClasses["nape.constraint.Constraint"] = function () {};
  nape.constraint.Constraint.__name__ = ["nape", "constraint", "Constraint"];
  nape.constraint.Constraint.prototype.__class__ = nape.constraint.Constraint;
  // nape.constraint.AngleJoint: converted to TypeScript → src/constraint/AngleJoint.ts
  nape.constraint.AngleJoint = $hxClasses["nape.constraint.AngleJoint"] = function() {};
  nape.constraint.AngleJoint.__name__ = ["nape", "constraint", "AngleJoint"];
  nape.constraint.AngleJoint.prototype.__class__ = nape.constraint.AngleJoint;
  // nape.constraint.ConstraintIterator + nape.constraint.ConstraintList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.constraint.DistanceJoint: converted to TypeScript → src/constraint/DistanceJoint.ts
  nape.constraint.DistanceJoint = $hxClasses["nape.constraint.DistanceJoint"] = function() {};
  nape.constraint.DistanceJoint.__name__ = ["nape", "constraint", "DistanceJoint"];
  nape.constraint.DistanceJoint.prototype.__class__ = nape.constraint.DistanceJoint;
  // nape.constraint.LineJoint: converted to TypeScript → src/constraint/LineJoint.ts
  nape.constraint.LineJoint = $hxClasses["nape.constraint.LineJoint"] = function() {};
  nape.constraint.LineJoint.__name__ = ["nape", "constraint", "LineJoint"];
  nape.constraint.LineJoint.prototype.__class__ = nape.constraint.LineJoint;
  // nape.constraint.MotorJoint: converted to TypeScript → src/constraint/MotorJoint.ts
  nape.constraint.MotorJoint = $hxClasses["nape.constraint.MotorJoint"] = function() {};
  nape.constraint.MotorJoint.__name__ = ["nape", "constraint", "MotorJoint"];
  nape.constraint.MotorJoint.prototype.__class__ = nape.constraint.MotorJoint;
  // nape.constraint.PivotJoint: converted to TypeScript → src/constraint/PivotJoint.ts
  nape.constraint.PivotJoint = $hxClasses["nape.constraint.PivotJoint"] = function() {};
  nape.constraint.PivotJoint.__name__ = ["nape", "constraint", "PivotJoint"];
  nape.constraint.PivotJoint.prototype.__class__ = nape.constraint.PivotJoint;
  // nape.constraint.PulleyJoint: converted to TypeScript → src/constraint/PulleyJoint.ts
  nape.constraint.PulleyJoint = $hxClasses["nape.constraint.PulleyJoint"] = function() {};
  nape.constraint.PulleyJoint.__name__ = ["nape", "constraint", "PulleyJoint"];
  nape.constraint.PulleyJoint.__super__ = nape.constraint.Constraint;
  nape.constraint.PulleyJoint.prototype.__class__ = nape.constraint.PulleyJoint;
  // nape.constraint.UserConstraint: converted to TypeScript → src/constraint/UserConstraint.ts
  nape.constraint.UserConstraint = $hxClasses["nape.constraint.UserConstraint"] = function() {};
  nape.constraint.UserConstraint.__name__ = ["nape", "constraint", "UserConstraint"];
  nape.constraint.UserConstraint.prototype.__class__ = nape.constraint.UserConstraint;
  // nape.constraint.WeldJoint: converted to TypeScript → src/constraint/WeldJoint.ts
  nape.constraint.WeldJoint = $hxClasses["nape.constraint.WeldJoint"] = function() {};
  nape.constraint.WeldJoint.__name__ = ["nape", "constraint", "WeldJoint"];
  nape.constraint.WeldJoint.prototype.__class__ = nape.constraint.WeldJoint;
  if (!nape.dynamics) nape.dynamics = {};
  // nape.dynamics.Arbiter: converted to TypeScript → src/dynamics/Arbiter.ts
  // Registration handled by Arbiter.ts at module load time to avoid circular imports.
  // Stub needed: ZPP_Arbiter.wrapper() creates instances via new nape.dynamics.Arbiter().
  nape.dynamics.Arbiter = $hxClasses["nape.dynamics.Arbiter"] = function () {
    this.zpp_inner = null;
    if (!zpp_nape.dynamics.ZPP_Arbiter.internal) {
      throw new js._Boot.HaxeError("Error: Cannot instantiate Arbiter derp!");
    }
  };
  nape.dynamics.Arbiter.__name__ = ["nape", "dynamics", "Arbiter"];
  // nape.dynamics.ArbiterIterator + nape.dynamics.ArbiterList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // Stub needed: ZPP_SpaceArbiterList extends ArbiterList at init time (prototype copy + .call).
  nape.dynamics.ArbiterList = function () {
    this.zpp_inner = null;
    this.zpp_inner = new zpp_nape.util.ZPP_ArbiterList();
    this.zpp_inner.outer = this;
  };
  nape.dynamics.ArbiterList.prototype.zpp_inner = null;
  // nape.dynamics.ArbiterType: converted to TypeScript → src/dynamics/ArbiterType.ts
  // Minimal stub needed for init-time singleton creation (~line 120451).
  // ArbiterType.ts replaces this class and fixes prototypes via Object.setPrototypeOf.
  nape.dynamics.ArbiterType = function () {
    if (!zpp_nape.util.ZPP_Flags.internal) {
      throw new js._Boot.HaxeError(
        "Error: Cannot instantiate ArbiterType derp!"
      );
    }
  };
  nape.dynamics.ArbiterType.__name__ = ["nape", "dynamics", "ArbiterType"];
  nape.dynamics.ArbiterType.prototype.__class__ = nape.dynamics.ArbiterType;
  // nape.dynamics.CollisionArbiter: converted to TypeScript → src/dynamics/CollisionArbiter.ts
  // Registration handled by CollisionArbiter.ts at module load time to avoid circular imports.
  // Stub needed: ZPP_Arbiter.wrapper() creates instances via new nape.dynamics.CollisionArbiter().
  nape.dynamics.CollisionArbiter = $hxClasses[
    "nape.dynamics.CollisionArbiter"
  ] = function () {
    if (!zpp_nape.dynamics.ZPP_Arbiter.internal) {
      throw new js._Boot.HaxeError(
        "Error: Cannot instantiate CollisionArbiter derp!"
      );
    }
    nape.dynamics.Arbiter.call(this);
  };
  nape.dynamics.CollisionArbiter.__name__ = [
    "nape",
    "dynamics",
    "CollisionArbiter",
  ];
  nape.dynamics.CollisionArbiter.__super__ = nape.dynamics.Arbiter;
  for (var k in nape.dynamics.Arbiter.prototype)
    nape.dynamics.CollisionArbiter.prototype[k] =
      nape.dynamics.Arbiter.prototype[k];
  // CollisionArbiter prototype methods removed — implemented in TypeScript.
  // nape.dynamics.Contact: converted to TypeScript → src/dynamics/Contact.ts
  // Registration handled by Contact.ts at module load time to avoid circular imports.
  // nape.dynamics.ContactIterator: converted to TypeScript → src/dynamics/ContactList.ts
  // Stub needed: clearObjectPools and static init reference ContactIterator.zpp_pool.
  nape.dynamics.ContactIterator = $hxClasses["nape.dynamics.ContactIterator"] = function () {};
  nape.dynamics.ContactIterator.__name__ = ["nape", "dynamics", "ContactIterator"];
  nape.dynamics.ContactIterator.zpp_pool = null;
  nape.dynamics.ContactIterator.prototype.__class__ = nape.dynamics.ContactIterator;
  // nape.dynamics.ContactList: converted to TypeScript → src/dynamics/ContactList.ts
  // Stub needed: ZPP_ContactList.get() creates instances via new nape.dynamics.ContactList().
  nape.dynamics.ContactList = $hxClasses["nape.dynamics.ContactList"] = function () {
    this.zpp_inner = null;
    this.zpp_inner = new zpp_nape.util.ZPP_ContactList();
    this.zpp_inner.outer = this;
  };
  nape.dynamics.ContactList.__name__ = ["nape", "dynamics", "ContactList"];
  nape.dynamics.ContactList.prototype.zpp_inner = null;
  nape.dynamics.ContactList.prototype.__class__ = nape.dynamics.ContactList;
  // nape.dynamics.FluidArbiter: converted to TypeScript → src/dynamics/FluidArbiter.ts
  // Registration handled by FluidArbiter.ts at module load time to avoid circular imports.
  // Stub needed: ZPP_Arbiter.wrapper() creates instances via new nape.dynamics.FluidArbiter().
  nape.dynamics.FluidArbiter = $hxClasses["nape.dynamics.FluidArbiter"] =
    function () {
      if (!zpp_nape.dynamics.ZPP_Arbiter.internal) {
        throw new js._Boot.HaxeError(
          "Error: Cannot instantiate FluidArbiter derp!"
        );
      }
      nape.dynamics.Arbiter.call(this);
    };
  nape.dynamics.FluidArbiter.__name__ = ["nape", "dynamics", "FluidArbiter"];
  nape.dynamics.FluidArbiter.__super__ = nape.dynamics.Arbiter;
  for (var k in nape.dynamics.Arbiter.prototype)
    nape.dynamics.FluidArbiter.prototype[k] =
      nape.dynamics.Arbiter.prototype[k];
  // nape.dynamics.InteractionFilter: converted to TypeScript → src/dynamics/InteractionFilter.ts
  // Registration handled by InteractionFilter.ts at module load time to avoid circular imports.
  // nape.dynamics.InteractionGroup: converted to TypeScript → src/dynamics/InteractionGroup.ts
  // Registration handled by InteractionGroup.ts at module load time to avoid circular imports.
  // nape.dynamics.InteractionGroupIterator + nape.dynamics.InteractionGroupList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  if (!nape.geom) nape.geom = {};
  // nape.geom.AABB: converted to TypeScript → src/geom/AABB.ts
  // Registration handled by AABB.ts at module load time to avoid circular imports.
  // nape.geom.ConvexResult: converted to TypeScript → src/geom/ConvexResult.ts
  // Registration handled by ConvexResult.ts at module load time to avoid circular imports.
  // nape.geom.ConvexResultIterator + nape.geom.ConvexResultList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.geom.Geom: converted to TypeScript → src/geom/Geom.ts
  // Registration handled by Geom.ts at module load time to avoid circular imports.
  nape.geom.Geom = $hxClasses["nape.geom.Geom"] = function () {};
  nape.geom.Geom.__name__ = ["nape", "geom", "Geom"];
  nape.geom.Geom.prototype.__class__ = nape.geom.Geom;
  // nape.geom.GeomPoly: converted to TypeScript → src/geom/GeomPoly.ts
  // Registration handled by GeomPoly.ts at module load time to avoid circular imports.
  // nape.geom.GeomPolyIterator + nape.geom.GeomPolyList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.geom.GeomVertexIterator: converted to TypeScript → src/geom/GeomVertexIterator.ts
  // Stub needed: ZPP_GeomVertexIterator constructor creates instances.
  nape.geom.GeomVertexIterator = $hxClasses["nape.geom.GeomVertexIterator"] = function () {};
  nape.geom.GeomVertexIterator.__name__ = ["nape", "geom", "GeomVertexIterator"];
  nape.geom.GeomVertexIterator.prototype.zpp_inner = null;
  nape.geom.GeomVertexIterator.prototype.__class__ = nape.geom.GeomVertexIterator;
  // nape.geom.MarchingSquares: converted to TypeScript → src/geom/MarchingSquares.ts
  // Registration handled by MarchingSquares.ts at module load time to avoid circular imports.
  // nape.geom.Mat23: converted to TypeScript → src/geom/Mat23.ts
  // Registration handled by Mat23.ts at module load time to avoid circular imports.
  // nape.geom.MatMN: converted to TypeScript → src/geom/MatMN.ts
  // Registration handled by MatMN.ts at module load time to avoid circular imports.
  // nape.geom.Ray: converted to TypeScript → src/geom/Ray.ts
  // Registration handled by Ray.ts at module load time to avoid circular imports.
  nape.geom.Ray = $hxClasses["nape.geom.Ray"] = function () {};
  nape.geom.Ray.__name__ = ["nape", "geom", "Ray"];
  nape.geom.Ray.prototype.__class__ = nape.geom.Ray;
  // nape.geom.RayResult: converted to TypeScript → src/geom/RayResult.ts
  // Registration handled by RayResult.ts at module load time to avoid circular imports.
  // nape.geom.RayResultIterator + nape.geom.RayResultList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.geom.Vec2: converted to TypeScript → src/geom/Vec2.ts
  // Registration handled by Vec2.ts at module load time to avoid circular imports.
  // nape.geom.Vec2Iterator: converted to TypeScript → src/geom/Vec2List.ts
  // Stub needed: clearObjectPools and static init reference Vec2Iterator.zpp_pool.
  nape.geom.Vec2Iterator = $hxClasses["nape.geom.Vec2Iterator"] = function () {};
  nape.geom.Vec2Iterator.__name__ = ["nape", "geom", "Vec2Iterator"];
  nape.geom.Vec2Iterator.zpp_pool = null;
  nape.geom.Vec2Iterator.prototype.__class__ = nape.geom.Vec2Iterator;
  // nape.geom.Vec2List: converted to TypeScript → src/geom/Vec2List.ts
  // Stub needed: ZPP_Vec2List.get() creates new Vec2List instances.
  nape.geom.Vec2List = $hxClasses["nape.geom.Vec2List"] = function () {
    this.zpp_inner = null;
    this.zpp_inner = new zpp_nape.util.ZPP_Vec2List();
    this.zpp_inner.outer = this;
  };
  nape.geom.Vec2List.__name__ = ["nape", "geom", "Vec2List"];
  nape.geom.Vec2List.prototype.zpp_inner = null;
  nape.geom.Vec2List.prototype.__class__ = nape.geom.Vec2List;
  // nape.geom.Vec3: converted to TypeScript → src/geom/Vec3.ts
  // Registration handled by Vec3.ts at module load time to avoid circular imports.
  // nape.geom.Winding: converted to TypeScript → src/geom/Winding.ts
  // Registration handled by Winding.ts at module load time.
  if (!nape.phys) nape.phys = {};
  // nape.phys.Interactor: converted to TypeScript → src/phys/Interactor.ts
  // Registration handled by Interactor.ts at module load time.
  // Minimal stub: Body/Compound/Shape stubs reference __super__ + prototype copy.
  // The `call(this)` from Shape stub is a no-op with this empty constructor.
  nape.phys.Interactor = $hxClasses["nape.phys.Interactor"] = function () {};
  nape.phys.Interactor.__name__ = ["nape", "phys", "Interactor"];
  nape.phys.Interactor.zpp_internalAlloc = false;
  nape.phys.Interactor.prototype.__class__ = nape.phys.Interactor;
  // nape.phys.Body: converted to TypeScript → src/phys/Body.ts
  // Registration handled by Body.ts at module load time.
  // Stub constructor needed because compiled code references nape.phys.Body before TS module loads.
  nape.phys.Body = $hxClasses["nape.phys.Body"] = function () {};
  nape.phys.Body.__name__ = ["nape", "phys", "Body"];
  nape.phys.Body.__super__ = nape.phys.Interactor;
  for (var k in nape.phys.Interactor.prototype)
    nape.phys.Body.prototype[k] = nape.phys.Interactor.prototype[k];
  nape.phys.Body.prototype.zpp_inner = null;
  nape.phys.Body.prototype.debugDraw = null;
  nape.phys.Body.prototype.__class__ = nape.phys.Body;
  // nape.phys.BodyIterator + nape.phys.BodyList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.phys.BodyType: converted to TypeScript → src/phys/BodyType.ts
  // Minimal stub needed because compiled init code (line ~120132) creates singletons.
  // The real BodyType class replaces this at module load time via self-registration.
  nape.phys.BodyType = function () {
    if (!zpp_nape.util.ZPP_Flags.internal) {
      throw new js._Boot.HaxeError("Error: Cannot instantiate BodyType derp!");
    }
  };
  nape.phys.BodyType.__name__ = ["nape", "phys", "BodyType"];
  nape.phys.BodyType.prototype.__class__ = nape.phys.BodyType;
  // nape.phys.Compound: converted to TypeScript → src/phys/Compound.ts
  // Registration handled by Compound.ts at module load time to avoid circular imports.
  // Stub constructor needed because compiled code references nape.phys.Compound before TS module loads.
  nape.phys.Compound = $hxClasses["nape.phys.Compound"] = function () {};
  nape.phys.Compound.__name__ = ["nape", "phys", "Compound"];
  nape.phys.Compound.__super__ = nape.phys.Interactor;
  for (var k in nape.phys.Interactor.prototype)
    nape.phys.Compound.prototype[k] = nape.phys.Interactor.prototype[k];
  nape.phys.Compound.prototype.__class__ = nape.phys.Compound;
  // nape.phys.CompoundIterator + nape.phys.CompoundList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.phys.FluidProperties: converted to TypeScript → src/phys/FluidProperties.ts
  // Registration handled by FluidProperties.ts at module load time to avoid circular imports.
  // nape.phys.GravMassMode: converted to TypeScript → src/phys/GravMassMode.ts
  // Registration handled by GravMassMode.ts at module load time to avoid circular imports.
  // nape.phys.InertiaMode: converted to TypeScript → src/phys/InertiaMode.ts
  // Registration handled by InertiaMode.ts at module load time to avoid circular imports.
  // nape.phys.InteractorIterator + nape.phys.InteractorList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.phys.MassMode: converted to TypeScript → src/phys/MassMode.ts
  // Registration handled by MassMode.ts at module load time to avoid circular imports.
  // nape.phys.Material: converted to TypeScript → src/phys/Material.ts
  // Registration happens in Material.ts at module load time to avoid circular imports.
  if (!nape.shape) nape.shape = {};
  // nape.shape.Shape: converted to TypeScript → src/shape/Shape.ts
  nape.shape.Shape = $hxClasses["nape.shape.Shape"] = function () {
    this.zpp_inner = null;
    nape.phys.Interactor.zpp_internalAlloc = true;
    nape.phys.Interactor.call(this);
    nape.phys.Interactor.zpp_internalAlloc = false;
    if (!nape.shape.Shape.zpp_internalAlloc) {
      throw new js._Boot.HaxeError("Error: Shape cannot be instantiated derp!");
    }
  };
  nape.shape.Shape.__name__ = ["nape", "shape", "Shape"];
  nape.shape.Shape.__super__ = nape.phys.Interactor;
  for (var k in nape.phys.Interactor.prototype)
    nape.shape.Shape.prototype[k] = nape.phys.Interactor.prototype[k];
  nape.shape.Shape.prototype.zpp_inner = null;
  nape.shape.Shape.prototype.__class__ = nape.shape.Shape;
  // nape.shape.Circle: converted to TypeScript → src/shape/Circle.ts
  // Registration handled by Circle.ts at module load time.
  // Stub constructor needed because compiled code references nape.shape.Circle before TS module loads.
  nape.shape.Circle = $hxClasses["nape.shape.Circle"] = function () {};
  nape.shape.Circle.__name__ = ["nape", "shape", "Circle"];
  nape.shape.Circle.__super__ = nape.shape.Shape;
  for (var k in nape.shape.Shape.prototype)
    nape.shape.Circle.prototype[k] = nape.shape.Shape.prototype[k];
  nape.shape.Circle.prototype.zpp_inner_zn = null;
  nape.shape.Circle.prototype.__class__ = nape.shape.Circle;
  // nape.shape.Edge: converted to TypeScript → src/shape/Edge.ts
  nape.shape.Edge = $hxClasses["nape.shape.Edge"] = function () {
    this.zpp_inner = null;
    if (!zpp_nape.shape.ZPP_Edge.internal) {
      throw new js._Boot.HaxeError("Error: Cannot instantiate an Edge derp!");
    }
  };
  nape.shape.Edge.__name__ = ["nape", "shape", "Edge"];
  nape.shape.Edge.prototype.zpp_inner = null;
  nape.shape.Edge.prototype.__class__ = nape.shape.Edge;
  // nape.shape.EdgeIterator + nape.shape.EdgeList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.shape.Polygon: converted to TypeScript → src/shape/Polygon.ts
  nape.shape.Polygon = $hxClasses["nape.shape.Polygon"] = function() {};
  nape.shape.Polygon.__name__ = ["nape", "shape", "Polygon"];
  nape.shape.Polygon.__super__ = nape.shape.Shape;
  nape.shape.Polygon.prototype.__class__ = nape.shape.Polygon;
  // nape.shape.ShapeIterator + nape.shape.ShapeList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  // nape.shape.ShapeType: converted to TypeScript → src/shape/ShapeType.ts
  // Minimal stub needed because compiled init code (line ~120163) creates singletons.
  // The real ShapeType class replaces this at module load time via self-registration.
  nape.shape.ShapeType = function () {
    if (!zpp_nape.util.ZPP_Flags.internal) {
      throw new js._Boot.HaxeError("Error: Cannot instantiate ShapeType derp!");
    }
  };
  nape.shape.ShapeType.__name__ = ["nape", "shape", "ShapeType"];
  nape.shape.ShapeType.prototype.__class__ = nape.shape.ShapeType;
  // nape.shape.ValidationResult: stub → src/shape/ValidationResult.ts
  // Minimal stub needed because compiled shape validation code creates instances.
  nape.shape.ValidationResult = function () {
    if (!zpp_nape.util.ZPP_Flags.internal) {
      throw new js._Boot.HaxeError("Error: Cannot instantiate ValidationResult derp!");
    }
  };
  nape.shape.ValidationResult.__name__ = ["nape", "shape", "ValidationResult"];
  nape.shape.ValidationResult.prototype.__class__ = nape.shape.ValidationResult;
  if (!nape.space) nape.space = {};
  // nape.space.Broadphase: stub → src/space/Broadphase.ts
  // Minimal stub needed because compiled Space code creates instances.
  nape.space.Broadphase = function () {
    if (!zpp_nape.util.ZPP_Flags.internal) {
      throw new js._Boot.HaxeError("Error: Cannot instantiate Broadphase derp!");
    }
  };
  nape.space.Broadphase.__name__ = ["nape", "space", "Broadphase"];
  nape.space.Broadphase.prototype.__class__ = nape.space.Broadphase;
  // nape.space.Space: converted to TypeScript → src/space/Space.ts
  nape.space.Space = $hxClasses["nape.space.Space"] = function () {};
  nape.space.Space.__name__ = ["nape", "space", "Space"];
  nape.space.Space.prototype.__class__ = nape.space.Space;
  if (!nape.util) nape.util = {};
  // nape.util.Debug: converted to TypeScript → src/util/Debug.ts
  // Registration handled by Debug.ts at module load time.
  nape.util.Debug = $hxClasses["nape.util.Debug"] = function () {};
  nape.util.Debug.__name__ = ["nape", "util", "Debug"];
  nape.util.Debug.prototype.__class__ = nape.util.Debug;
  if (typeof sandbox == "undefined") sandbox = {};
  sandbox.Main = $hxClasses["sandbox.Main"] = function () {};
  sandbox.Main.__name__ = ["sandbox", "Main"];
  sandbox.Main.main = function () {};
  sandbox.Main.prototype.__class__ = sandbox.Main;
  if (typeof zpp_nape == "undefined") zpp_nape = {};
  // All ZPP_* class registrations, _init()/_initEnums()/_initStatics(), nape.__zpp = zpp_nape:
  // moved to TypeScript → src/native/util/ZPPRegistry.ts
  registerZPPClasses(nape, zpp_nape, $hxClasses);
  sandbox.Main.main();
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
