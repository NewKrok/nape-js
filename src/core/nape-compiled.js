// @ts-nocheck
/* eslint-disable */
// Nape physics engine — compiled from Haxe via nape-to-js
import { ZPP_Material as ZPP_Material_TS } from "../native/phys/ZPP_Material";
import { ZPP_FluidProperties as ZPP_FluidProperties_TS } from "../native/phys/ZPP_FluidProperties";
import { ZPP_InteractionFilter as ZPP_InteractionFilter_TS } from "../native/dynamics/ZPP_InteractionFilter";
import { ZPP_InteractionGroup as ZPP_InteractionGroup_TS } from "../native/dynamics/ZPP_InteractionGroup";
import { ZPP_Vec2 as ZPP_Vec2_TS } from "../native/geom/ZPP_Vec2";
import { ZPP_AABB as ZPP_AABB_TS } from "../native/geom/ZPP_AABB";
import { ZPP_Vec3 as ZPP_Vec3_TS } from "../native/geom/ZPP_Vec3";
import { ZPP_Flags as ZPP_Flags_TS } from "../native/util/ZPP_Flags";
import { ZPP_CbType as ZPP_CbType_TS } from "../native/callbacks/ZPP_CbType";
import { ZPP_ID as ZPP_ID_TS } from "../native/util/ZPP_ID";
import { ZPP_PubPool as ZPP_PubPool_TS } from "../native/util/ZPP_PubPool";
import { ZPP_GeomPoly as ZPP_GeomPoly_TS } from "../native/geom/ZPP_GeomPoly";
import { ZPP_Mat23 as ZPP_Mat23_TS } from "../native/geom/ZPP_Mat23";
import { ZPP_OptionType as ZPP_OptionType_TS } from "../native/callbacks/ZPP_OptionType";
import { ZPP_Const as ZPP_Const_TS } from "../native/util/ZPP_Const";
import { ZPP_Callback as ZPP_Callback_TS } from "../native/callbacks/ZPP_Callback";
import { ZPP_Math as ZPP_Math_TS } from "../native/util/ZPP_Math";
import { ZPP_MarchSpan as ZPP_MarchSpan_TS } from "../native/geom/ZPP_MarchSpan";
import { ZPP_MarchPair as ZPP_MarchPair_TS } from "../native/geom/ZPP_MarchPair";
import { ZPP_MatMN as ZPP_MatMN_TS } from "../native/geom/ZPP_MatMN";
import { ZPP_CutVert as ZPP_CutVert_TS } from "../native/geom/ZPP_CutVert";
import { ZPP_CutInt as ZPP_CutInt_TS } from "../native/geom/ZPP_CutInt";
import { ZPP_Listener as ZPP_Listener_TS } from "../native/callbacks/ZPP_Listener";
import { ZPP_BodyListener as ZPP_BodyListener_TS } from "../native/callbacks/ZPP_BodyListener";
import { ZPP_ConstraintListener as ZPP_ConstraintListener_TS } from "../native/callbacks/ZPP_ConstraintListener";
import { ZPP_InteractionListener as ZPP_InteractionListener_TS } from "../native/callbacks/ZPP_InteractionListener";
import { ZPP_CbSet as ZPP_CbSet_TS } from "../native/callbacks/ZPP_CbSet";
import { ZPP_CbSetPair as ZPP_CbSetPair_TS } from "../native/callbacks/ZPP_CbSetPair";
import { ZPP_ConvexRayResult as ZPP_ConvexRayResult_TS } from "../native/geom/ZPP_ConvexRayResult";
import { ZPP_Compound as ZPP_Compound_TS } from "../native/phys/ZPP_Compound";
import { ZPP_Body as ZPP_Body_TS } from "../native/phys/ZPP_Body";
import { ZPP_Contact as ZPP_Contact_TS } from "../native/dynamics/ZPP_Contact";
import { ZPP_IContact as ZPP_IContact_TS } from "../native/dynamics/ZPP_IContact";
import { ZPP_Arbiter as ZPP_Arbiter_TS } from "../native/dynamics/ZPP_Arbiter";
import { ZPP_SensorArbiter as ZPP_SensorArbiter_TS } from "../native/dynamics/ZPP_SensorArbiter";
import { ZPP_FluidArbiter as ZPP_FluidArbiter_TS } from "../native/dynamics/ZPP_FluidArbiter";
import { ZPP_ColArbiter as ZPP_ColArbiter_TS } from "../native/dynamics/ZPP_ColArbiter";
import { ZPP_Constraint as ZPP_Constraint_TS } from "../native/constraint/ZPP_Constraint";
import { ZPP_AngleJoint as ZPP_AngleJoint_TS } from "../native/constraint/ZPP_AngleJoint";
import { ZPP_CopyHelper as ZPP_CopyHelper_TS } from "../native/constraint/ZPP_CopyHelper";
import { ZPP_DistanceJoint as ZPP_DistanceJoint_TS } from "../native/constraint/ZPP_DistanceJoint";
import { ZPP_LineJoint as ZPP_LineJoint_TS } from "../native/constraint/ZPP_LineJoint";
import { ZPP_MotorJoint as ZPP_MotorJoint_TS } from "../native/constraint/ZPP_MotorJoint";
import { ZPP_PivotJoint as ZPP_PivotJoint_TS } from "../native/constraint/ZPP_PivotJoint";
import { ZPP_PulleyJoint as ZPP_PulleyJoint_TS } from "../native/constraint/ZPP_PulleyJoint";
import { ZPP_UserConstraint as ZPP_UserConstraint_TS } from "../native/constraint/ZPP_UserConstraint";
import { ZPP_UserBody as ZPP_UserBody_TS } from "../native/constraint/ZPP_UserBody";
import { ZPP_WeldJoint as ZPP_WeldJoint_TS } from "../native/constraint/ZPP_WeldJoint";
import { ZPP_Shape as ZPP_Shape_TS } from "../native/shape/ZPP_Shape";
import { ZPP_Circle as ZPP_Circle_TS } from "../native/shape/ZPP_Circle";
import { ZPP_Edge as ZPP_Edge_TS } from "../native/shape/ZPP_Edge";
import { ZPP_Polygon as ZPP_Polygon_TS } from "../native/shape/ZPP_Polygon";
import { ZPP_Convex as ZPP_Convex_TS } from "../native/geom/ZPP_Convex";
import { ZPP_Cutter as ZPP_Cutter_TS } from "../native/geom/ZPP_Cutter";
import { ZPP_Geom as ZPP_Geom_TS } from "../native/geom/ZPP_Geom";
import { ZPP_GeomVert as ZPP_GeomVert_TS } from "../native/geom/ZPP_GeomVert";
import { ZPP_Monotone as ZPP_Monotone_TS } from "../native/geom/ZPP_Monotone";
import { ZPP_PartitionVertex as ZPP_PartitionVertex_TS } from "../native/geom/ZPP_PartitionVertex";
import { ZPP_PartitionedPoly as ZPP_PartitionedPoly_TS } from "../native/geom/ZPP_PartitionedPoly";
import { ZPP_PartitionPair as ZPP_PartitionPair_TS } from "../native/geom/ZPP_PartitionPair";
import { ZPP_Ray as ZPP_Ray_TS } from "../native/geom/ZPP_Ray";
import { ZPP_SimpleVert as ZPP_SimpleVert_TS } from "../native/geom/ZPP_SimpleVert";
import { ZPP_SimpleSeg as ZPP_SimpleSeg_TS } from "../native/geom/ZPP_SimpleSeg";
import { ZPP_SimpleEvent as ZPP_SimpleEvent_TS } from "../native/geom/ZPP_SimpleEvent";
import { ZPP_SimpleSweep as ZPP_SimpleSweep_TS } from "../native/geom/ZPP_SimpleSweep";
import { ZPP_Simple as ZPP_Simple_TS } from "../native/geom/ZPP_Simple";
import { ZPP_SimplifyV as ZPP_SimplifyV_TS } from "../native/geom/ZPP_SimplifyV";
import { ZPP_SimplifyP as ZPP_SimplifyP_TS } from "../native/geom/ZPP_SimplifyP";
import { ZPP_Simplify as ZPP_Simplify_TS } from "../native/geom/ZPP_Simplify";
import { ZPP_Triangular as ZPP_Triangular_TS } from "../native/geom/ZPP_Triangular";
import { ZPP_VecMath as ZPP_VecMath_TS } from "../native/geom/ZPP_VecMath";
import { ZPP_Collide as ZPP_Collide_TS } from "../native/geom/ZPP_Collide";
import { ZPP_SweepDistance as ZPP_SweepDistance_TS } from "../native/geom/ZPP_SweepDistance";
import { ZPP_SweepData as ZPP_SweepData_TS } from "../native/space/ZPP_SweepData";
import { ZPP_AABBPair as ZPP_AABBPair_TS } from "../native/space/ZPP_AABBPair";
import { ZPP_Component as ZPP_Component_TS } from "../native/space/ZPP_Component";
import { ZPP_AABBNode as ZPP_AABBNode_TS } from "../native/space/ZPP_AABBNode";
import { ZPP_Island as ZPP_Island_TS } from "../native/space/ZPP_Island";
import { ZPP_CallbackSet as ZPP_CallbackSet_TS } from "../native/space/ZPP_CallbackSet";
import { ZPP_CbSetManager as ZPP_CbSetManager_TS } from "../native/space/ZPP_CbSetManager";
import { ZPP_SpaceArbiterList as ZPP_SpaceArbiterList_TS } from "../native/dynamics/ZPP_SpaceArbiterList";
import { ZPP_AABBTree as ZPP_AABBTree_TS } from "../native/space/ZPP_AABBTree";
import { ZPP_Broadphase as ZPP_Broadphase_TS } from "../native/space/ZPP_Broadphase";
import { ZPP_SweepPhase as ZPP_SweepPhase_TS } from "../native/space/ZPP_SweepPhase";
import { ZPP_DynAABBPhase as ZPP_DynAABBPhase_TS } from "../native/space/ZPP_DynAABBPhase";
import { ZPP_Interactor as ZPP_Interactor_TS } from "../native/phys/ZPP_Interactor";
import { ZPP_ToiEvent as ZPP_ToiEvent_TS } from "../native/geom/ZPP_ToiEvent";
import { ZPP_Space as ZPP_Space_TS } from "../native/space/ZPP_Space";
import { ZPP_MarchingSquares as ZPP_MarchingSquares_TS } from "../native/geom/ZPP_MarchingSquares";
var _nape;
var define = function (factory) {
  _nape = factory();
};
define(function () {
  "use strict";
  var nape, zpp_nape, js, Std, Reflect, StringTools, sandbox;
  var $_,
    $hxClasses = $hxClasses || {},
    $estr = function () {
      return js.Boot.__string_rec(this, "");
    };
  function $bind(o, m) {
    var f = function () {
      return f.method.apply(f.scope, arguments);
    };
    f.scope = o;
    f.method = m;
    return f;
  }
  Reflect = $hxClasses["Reflect"] = function () {};
  Reflect.__name__ = ["Reflect"];
  Reflect.field = function (o, field) {
    try {
      return o[field];
    } catch (e) {
      var e1 = e instanceof js._Boot.HaxeError ? e.val : e;
      return null;
    }
  };
  Reflect.fields = function (o) {
    var a = [];
    if (o != null) {
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      for (var f in o) {
        if (
          f != "__id__" &&
          f != "hx__closures__" &&
          hasOwnProperty.call(o, f)
        ) {
          a.push(f);
        }
      }
    }
    return a;
  };
  Reflect.copy = function (o) {
    if (o == null) {
      return null;
    }
    var o2 = {};
    var _g = 0;
    var _g1 = Reflect.fields(o);
    while (_g < _g1.length) {
      var f = _g1[_g];
      ++_g;
      o2[f] = Reflect.field(o, f);
    }
    return o2;
  };
  Reflect.prototype.__class__ = Reflect;
  Std = $hxClasses["Std"] = function () {};
  Std.__name__ = ["Std"];
  Std.string = function (s) {
    return js.Boot.__string_rec(s, "");
  };
  Std.prototype.__class__ = Std;
  StringTools = $hxClasses["StringTools"] = function () {};
  StringTools.__name__ = ["StringTools"];
  StringTools.hex = function (n, digits) {
    var s = "";
    var hexChars = "0123456789ABCDEF";
    while (true) {
      s = hexChars.charAt(n & 15) + s;
      n >>>= 4;
      if (!(n > 0)) {
        break;
      }
    }
    if (digits != null) {
      while (s.length < digits) s = "0" + s;
    }
    return s;
  };
  StringTools.prototype.__class__ = StringTools;
  if (typeof js == "undefined") js = {};
  if (!js._Boot) js._Boot = {};
  js._Boot.HaxeError = $hxClasses["js._Boot.HaxeError"] = function (val) {
    Error.call(this);
    this.val = val;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, js._Boot.HaxeError);
    }
  };
  js._Boot.HaxeError.__name__ = ["js", "_Boot", "HaxeError"];
  js._Boot.HaxeError.__super__ = Error;
  for (var k in Error.prototype)
    js._Boot.HaxeError.prototype[k] = Error.prototype[k];
  js._Boot.HaxeError.prototype.val = null;
  js._Boot.HaxeError.prototype.__class__ = js._Boot.HaxeError;
  js.Boot = $hxClasses["js.Boot"] = function () {};
  js.Boot.__name__ = ["js", "Boot"];
  js.Boot.__string_rec = function (o, s) {
    if (o == null) {
      return "null";
    }
    if (s.length >= 5) {
      return "<...>";
    }
    var t = typeof o;
    if (t == "function" && (o.__name__ || o.__ename__)) {
      t = "object";
    }
    switch (t) {
      case "function":
        return "<function>";
      case "object":
        if (o instanceof Array) {
          var str = "[";
          s += "\t";
          var _g3 = 0;
          var _g11 = o.length;
          while (_g3 < _g11) {
            var i = _g3++;
            str += (i > 0 ? "," : "") + js.Boot.__string_rec(o[i], s);
          }
          str += "]";
          return str;
        }
        var tostr;
        try {
          tostr = o.toString;
        } catch (e1) {
          var e2 = e1 instanceof js._Boot.HaxeError ? e1.val : e1;
          return "???";
        }
        if (
          tostr != null &&
          tostr != Object.toString &&
          typeof tostr == "function"
        ) {
          var s2 = o.toString();
          if (s2 != "[object Object]") {
            return s2;
          }
        }
        var str1 = "{\n";
        s += "\t";
        var hasp = o.hasOwnProperty != null;
        var k = null;
        for (k in o) {
          if (hasp && !o.hasOwnProperty(k)) {
            continue;
          }
          if (
            k == "prototype" ||
            k == "__class__" ||
            k == "__super__" ||
            k == "__interfaces__" ||
            k == "__properties__"
          ) {
            continue;
          }
          if (str1.length != 2) {
            str1 += ", \n";
          }
          str1 += s + k + " : " + js.Boot.__string_rec(o[k], s);
        }
        s = s.substring(1);
        str1 += "\n" + s + "}";
        return str1;
      case "string":
        return o;
      default:
        return String(o);
    }
  };
  js.Boot.__toStr = null;
  js.Boot.prototype.__class__ = js.Boot;
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
    nape.geom.GeomVertexIterator;
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
  // Stub needed: ZPP_MixVec2List copies prototype at init time.
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
  nape.phys.Interactor = $hxClasses["nape.phys.Interactor"] = function () {
    this.zpp_inner_i = null;
    if (!nape.phys.Interactor.zpp_internalAlloc) {
      throw new js._Boot.HaxeError(
        "Error: Cannot instantiate an Interactor, only Shape/Body/Compound"
      );
    }
  };
  nape.phys.Interactor.__name__ = ["nape", "phys", "Interactor"];
  nape.phys.Interactor.prototype.zpp_inner_i = null;
  Object.defineProperty(nape.phys.Interactor.prototype, "id", {
    get: function() { return this.get_id(); },
  });
  nape.phys.Interactor.prototype.get_id = function () {
    return this.zpp_inner_i.id;
  };
  Object.defineProperty(nape.phys.Interactor.prototype, "userData", {
    get: function() { return this.get_userData(); },
  });
  nape.phys.Interactor.prototype.get_userData = function () {
    if (this.zpp_inner_i.userData == null) {
      this.zpp_inner_i.userData = {};
    }
    return this.zpp_inner_i.userData;
  };
  nape.phys.Interactor.prototype.isShape = function () {
    return this.zpp_inner_i.ishape != null;
  };
  nape.phys.Interactor.prototype.isBody = function () {
    return this.zpp_inner_i.ibody != null;
  };
  nape.phys.Interactor.prototype.isCompound = function () {
    return this.zpp_inner_i.icompound != null;
  };
  Object.defineProperty(nape.phys.Interactor.prototype, "castShape", {
    get: function() { return this.get_castShape(); },
  });
  nape.phys.Interactor.prototype.get_castShape = function () {
    if (this.zpp_inner_i.ishape != null) {
      return this.zpp_inner_i.ishape.outer;
    } else {
      return null;
    }
  };
  Object.defineProperty(nape.phys.Interactor.prototype, "castBody", {
    get: function() { return this.get_castBody(); },
  });
  nape.phys.Interactor.prototype.get_castBody = function () {
    if (this.zpp_inner_i.ibody != null) {
      return this.zpp_inner_i.ibody.outer;
    } else {
      return null;
    }
  };
  Object.defineProperty(nape.phys.Interactor.prototype, "castCompound", {
    get: function() { return this.get_castCompound(); },
  });
  nape.phys.Interactor.prototype.get_castCompound = function () {
    if (this.zpp_inner_i.icompound != null) {
      return this.zpp_inner_i.icompound.outer;
    } else {
      return null;
    }
  };
  Object.defineProperty(nape.phys.Interactor.prototype, "group", {
    get: function() { return this.get_group(); },
    set: function(v) { this.set_group(v); },
  });
  nape.phys.Interactor.prototype.get_group = function () {
    if (this.zpp_inner_i.group == null) {
      return null;
    } else {
      return this.zpp_inner_i.group.outer;
    }
  };
  nape.phys.Interactor.prototype.set_group = function (group) {
    this.zpp_inner_i.immutable_midstep("Interactor::group");
    this.zpp_inner_i.setGroup(group == null ? null : group.zpp_inner);
    if (this.zpp_inner_i.group == null) {
      return null;
    } else {
      return this.zpp_inner_i.group.outer;
    }
  };
  Object.defineProperty(nape.phys.Interactor.prototype, "cbTypes", {
    get: function() { return this.get_cbTypes(); },
  });
  nape.phys.Interactor.prototype.get_cbTypes = function () {
    if (this.zpp_inner_i.wrap_cbTypes == null) {
      this.zpp_inner_i.setupcbTypes();
    }
    return this.zpp_inner_i.wrap_cbTypes;
  };
  nape.phys.Interactor.prototype.toString = function () {
    return "";
  };
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
  // ZPP_Const: converted to TypeScript → src/native/util/ZPP_Const.ts
  zpp_nape.ZPP_Const = $hxClasses["zpp_nape.ZPP_Const"] = ZPP_Const_TS;
  zpp_nape.ZPP_Const.prototype.__class__ = zpp_nape.ZPP_Const;
  // ZPP_ID: converted to TypeScript → src/native/util/ZPP_ID.ts
  zpp_nape.ZPP_ID = $hxClasses["zpp_nape.ZPP_ID"] = ZPP_ID_TS;
  zpp_nape.ZPP_ID.prototype.__class__ = zpp_nape.ZPP_ID;
  if (!zpp_nape.callbacks) zpp_nape.callbacks = {};
  // ZPP_Callback: converted to TypeScript → src/native/callbacks/ZPP_Callback.ts
  ZPP_Callback_TS._nape = nape;
  ZPP_Callback_TS._zpp = zpp_nape;
  zpp_nape.callbacks.ZPP_Callback = $hxClasses["zpp_nape.callbacks.ZPP_Callback"] = ZPP_Callback_TS;
  zpp_nape.callbacks.ZPP_Callback.prototype.__class__ = zpp_nape.callbacks.ZPP_Callback;
  // ZPP_CbSet: converted to TypeScript → src/native/callbacks/ZPP_CbSet.ts
  ZPP_CbSet_TS._zpp = zpp_nape;
  zpp_nape.callbacks.ZPP_CbSet = $hxClasses["zpp_nape.callbacks.ZPP_CbSet"] = ZPP_CbSet_TS;
  zpp_nape.callbacks.ZPP_CbSet.prototype.__class__ = zpp_nape.callbacks.ZPP_CbSet;
  // ZPP_CbSetPair: converted to TypeScript → src/native/callbacks/ZPP_CbSetPair.ts
  ZPP_CbSetPair_TS._zpp = zpp_nape;
  zpp_nape.callbacks.ZPP_CbSetPair = $hxClasses["zpp_nape.callbacks.ZPP_CbSetPair"] = ZPP_CbSetPair_TS;
  zpp_nape.callbacks.ZPP_CbSetPair.prototype.__class__ = zpp_nape.callbacks.ZPP_CbSetPair;
  if (!zpp_nape.util) zpp_nape.util = {};

  // =========================================================================
  // Generic ZNPNode factory — replaces 35 identical ZNPNode_* classes
  // =========================================================================
  function createZNPNode(typeName) {
    var cls = $hxClasses["zpp_nape.util.ZNPNode_" + typeName] = function () {
      this.elt = null;
      this.next = null;
    };
    cls.__name__ = ["zpp_nape", "util", "ZNPNode_" + typeName];
    cls.zpp_pool = null;
    cls.prototype.next = null;
    cls.prototype.alloc = function () {};
    cls.prototype.free = function () { this.elt = null; };
    cls.prototype.elt = null;
    cls.prototype.elem = function () { return this.elt; };
    cls.prototype.__class__ = cls;
    return cls;
  }

  // =========================================================================
  // Generic ZNPList factory — replaces 35 identical ZNPList_* classes
  // =========================================================================
  function createZNPList(typeName, N) {
    var cls = $hxClasses["zpp_nape.util.ZNPList_" + typeName] = function () {
      this.length = 0;
      this.pushmod = false;
      this.modified = false;
      this.head = null;
    };
    cls.__name__ = ["zpp_nape", "util", "ZNPList_" + typeName];
    cls.prototype.head = null;
    cls.prototype.begin = function () { return this.head; };
    cls.prototype.modified = null;
    cls.prototype.pushmod = null;
    cls.prototype.length = null;
    cls.prototype.setbegin = function (i) {
      this.head = i;
      this.modified = true;
      this.pushmod = true;
    };
    cls.prototype.add = function (o) {
      var ret;
      if (N.zpp_pool == null) { ret = new N(); } else { ret = N.zpp_pool; N.zpp_pool = ret.next; ret.next = null; }
      ret.elt = o;
      var temp = ret;
      temp.next = this.head;
      this.head = temp;
      this.modified = true;
      this.length++;
      return o;
    };
    cls.prototype.inlined_add = cls.prototype.add;
    cls.prototype.addAll = function (x) {
      var cx_ite = x.head;
      while (cx_ite != null) { this.add(cx_ite.elt); cx_ite = cx_ite.next; }
    };
    cls.prototype.insert = function (cur, o) {
      var ret;
      if (N.zpp_pool == null) { ret = new N(); } else { ret = N.zpp_pool; N.zpp_pool = ret.next; ret.next = null; }
      ret.elt = o;
      var temp = ret;
      if (cur == null) { temp.next = this.head; this.head = temp; }
      else { temp.next = cur.next; cur.next = temp; }
      this.pushmod = this.modified = true;
      this.length++;
      return temp;
    };
    cls.prototype.inlined_insert = cls.prototype.insert;
    cls.prototype.pop = function () {
      var ret = this.head;
      this.head = ret.next;
      var o = ret;
      o.elt = null;
      o.next = N.zpp_pool;
      N.zpp_pool = o;
      if (this.head == null) { this.pushmod = true; }
      this.modified = true;
      this.length--;
    };
    cls.prototype.inlined_pop = cls.prototype.pop;
    cls.prototype.pop_unsafe = function () {
      var ret = this.head.elt;
      this.pop();
      return ret;
    };
    cls.prototype.inlined_pop_unsafe = cls.prototype.pop_unsafe;
    cls.prototype.erase = function (pre) {
      var old, ret;
      if (pre == null) {
        old = this.head; ret = old.next; this.head = ret;
        if (this.head == null) { this.pushmod = true; }
      } else {
        old = pre.next; ret = old.next; pre.next = ret;
        if (ret == null) { this.pushmod = true; }
      }
      var o = old;
      o.elt = null;
      o.next = N.zpp_pool;
      N.zpp_pool = o;
      this.modified = true;
      this.length--;
      this.pushmod = true;
      return ret;
    };
    cls.prototype.inlined_erase = cls.prototype.erase;
    cls.prototype.remove = function (obj) {
      var pre = null, cur = this.head;
      while (cur != null) {
        if (cur.elt == obj) { this.erase(pre); break; }
        pre = cur; cur = cur.next;
      }
    };
    cls.prototype.inlined_remove = cls.prototype.remove;
    cls.prototype.try_remove = function (obj) {
      var pre = null, cur = this.head, ret = false;
      while (cur != null) {
        if (cur.elt == obj) { this.erase(pre); ret = true; break; }
        pre = cur; cur = cur.next;
      }
      return ret;
    };
    cls.prototype.inlined_try_remove = cls.prototype.try_remove;
    cls.prototype.splice = function (pre, n) {
      while (n-- > 0 && pre.next != null) this.erase(pre);
      return pre.next;
    };
    cls.prototype.clear = function () {
      while (this.head != null) {
        var ret = this.head;
        this.head = ret.next;
        var o = ret;
        o.elt = null;
        o.next = N.zpp_pool;
        N.zpp_pool = o;
        if (this.head == null) { this.pushmod = true; }
        this.modified = true;
        this.length--;
      }
      this.pushmod = true;
    };
    cls.prototype.inlined_clear = cls.prototype.clear;
    cls.prototype.reverse = function () {
      var cur = this.head, pre = null;
      while (cur != null) { var nx = cur.next; cur.next = pre; this.head = cur; pre = cur; cur = nx; }
      this.modified = true;
      this.pushmod = true;
    };
    cls.prototype.empty = function () { return this.head == null; };
    cls.prototype.size = function () { return this.length; };
    cls.prototype.has = function (obj) {
      var cx_ite = this.head;
      while (cx_ite != null) { if (cx_ite.elt == obj) return true; cx_ite = cx_ite.next; }
      return false;
    };
    cls.prototype.inlined_has = cls.prototype.has;
    cls.prototype.front = function () { return this.head.elt; };
    cls.prototype.back = function () {
      var ret = this.head, cur = ret;
      while (cur != null) { ret = cur; cur = cur.next; }
      return ret.elt;
    };
    cls.prototype.iterator_at = function (ind) {
      var ret = this.head;
      while (ind-- > 0 && ret != null) ret = ret.next;
      return ret;
    };
    cls.prototype.at = function (ind) {
      var it = this.iterator_at(ind);
      return it != null ? it.elt : null;
    };
    cls.prototype.__class__ = cls;
    return cls;
  }

  // =========================================================================
  // Generic ZPP_Set factory — replaces 8 identical ZPP_Set_* Red-Black tree classes
  // =========================================================================
  function createZPPSet(typeName) {
    var cls = $hxClasses["zpp_nape.util.ZPP_Set_" + typeName] = function () {
      this.colour = 0;
      this.parent = null;
      this.next = null;
      this.prev = null;
      this.data = null;
      this.swapped = null;
      this.lt = null;
    };
    cls.__name__ = ["zpp_nape", "util", "ZPP_Set_" + typeName];
    cls.zpp_pool = null;
    cls.prototype.free = function () { this.data = null; this.lt = null; this.swapped = null; };
    cls.prototype.alloc = function () {};
    cls.prototype.lt = null;
    cls.prototype.swapped = null;
    cls.prototype.data = null;
    cls.prototype.prev = null;
    cls.prototype.next = null;
    cls.prototype.parent = null;
    cls.prototype.colour = null;
    cls.prototype.verify = function () {
      if (!this.empty()) {
        var set_ite = this.parent;
        while (set_ite.prev != null) set_ite = set_ite.prev;
        while (set_ite != null) {
          var i = set_ite.data;
          var prei = true;
          if (!this.empty()) {
            var set_ite1 = this.parent;
            while (set_ite1.prev != null) set_ite1 = set_ite1.prev;
            while (set_ite1 != null) {
              var j = set_ite1.data;
              if (!prei) { if (!this.lt(i, j) && this.lt(j, i)) return false; }
              else if (i == j) { prei = false; }
              else if (!this.lt(j, i) && this.lt(i, j)) return false;
              if (set_ite1.next != null) { set_ite1 = set_ite1.next; while (set_ite1.prev != null) set_ite1 = set_ite1.prev; }
              else { while (set_ite1.parent != null && set_ite1 == set_ite1.parent.next) set_ite1 = set_ite1.parent; set_ite1 = set_ite1.parent; }
            }
          }
          if (set_ite.next != null) { set_ite = set_ite.next; while (set_ite.prev != null) set_ite = set_ite.prev; }
          else { while (set_ite.parent != null && set_ite == set_ite.parent.next) set_ite = set_ite.parent; set_ite = set_ite.parent; }
        }
      }
      return true;
    };
    cls.prototype.empty = function () { return this.parent == null; };
    cls.prototype.singular = function () {
      if (this.parent != null && this.parent.prev == null) return this.parent.next == null;
      return false;
    };
    cls.prototype.size = function () {
      var ret = 0;
      if (!this.empty()) {
        var set_ite = this.parent;
        while (set_ite.prev != null) set_ite = set_ite.prev;
        while (set_ite != null) {
          ++ret;
          if (set_ite.next != null) { set_ite = set_ite.next; while (set_ite.prev != null) set_ite = set_ite.prev; }
          else { while (set_ite.parent != null && set_ite == set_ite.parent.next) set_ite = set_ite.parent; set_ite = set_ite.parent; }
        }
      }
      return ret;
    };
    cls.prototype.has = function (obj) { return this.find(obj) != null; };
    cls.prototype.find = function (obj) {
      var cur = this.parent;
      while (cur != null && cur.data != obj) { if (this.lt(obj, cur.data)) cur = cur.prev; else cur = cur.next; }
      return cur;
    };
    cls.prototype.has_weak = function (obj) { return this.find_weak(obj) != null; };
    cls.prototype.find_weak = function (obj) {
      var cur = this.parent;
      while (cur != null) { if (this.lt(obj, cur.data)) cur = cur.prev; else if (this.lt(cur.data, obj)) cur = cur.next; else break; }
      return cur;
    };
    cls.prototype.lower_bound = function (obj) {
      var ret = null;
      if (!this.empty()) {
        var set_ite = this.parent;
        while (set_ite.prev != null) set_ite = set_ite.prev;
        while (set_ite != null) {
          if (!this.lt(set_ite.data, obj)) { ret = set_ite.data; break; }
          if (set_ite.next != null) { set_ite = set_ite.next; while (set_ite.prev != null) set_ite = set_ite.prev; }
          else { while (set_ite.parent != null && set_ite == set_ite.parent.next) set_ite = set_ite.parent; set_ite = set_ite.parent; }
        }
      }
      return ret;
    };
    cls.prototype.first = function () {
      var cur = this.parent;
      while (cur.prev != null) cur = cur.prev;
      return cur.data;
    };
    cls.prototype.pop_front = function () {
      var cur = this.parent;
      while (cur.prev != null) cur = cur.prev;
      var ret = cur.data;
      this.remove_node(cur);
      return ret;
    };
    cls.prototype.remove = function (obj) { this.remove_node(this.find(obj)); };
    cls.prototype.successor_node = function (cur) {
      if (cur.next != null) { cur = cur.next; while (cur.prev != null) cur = cur.prev; }
      else { var pre = cur; cur = cur.parent; while (cur != null && cur.prev != pre) { pre = cur; cur = cur.parent; } }
      return cur;
    };
    cls.prototype.predecessor_node = function (cur) {
      if (cur.prev != null) { cur = cur.prev; while (cur.next != null) cur = cur.next; }
      else { var pre = cur; cur = cur.parent; while (cur != null && cur.next != pre) { pre = cur; cur = cur.parent; } }
      return cur;
    };
    cls.prototype.successor = function (obj) {
      var node = this.successor_node(this.find(obj));
      return node == null ? null : node.data;
    };
    cls.prototype.predecessor = function (obj) {
      var node = this.predecessor_node(this.find(obj));
      return node == null ? null : node.data;
    };
    cls.prototype.remove_node = function (cur) {
      if (cur.next != null && cur.prev != null) {
        var sm = cur.next;
        while (sm.prev != null) sm = sm.prev;
        var t = cur.data; cur.data = sm.data; sm.data = t;
        if (this.swapped != null) this.swapped(cur.data, sm.data);
        cur = sm;
      }
      var child = cur.prev == null ? cur.next : cur.prev;
      if (cur.colour == 1) {
        if (cur.prev != null || cur.next != null) {
          child.colour = 1;
        } else if (cur.parent != null) {
          var parent = cur.parent;
          while (true) {
            parent.colour++;
            parent.prev.colour--;
            parent.next.colour--;
            var child1 = parent.prev;
            if (child1.colour == -1) { this.__fix_neg_red(child1); break; }
            else if (child1.colour == 0) {
              if (child1.prev != null && child1.prev.colour == 0) { this.__fix_dbl_red(child1.prev); break; }
              if (child1.next != null && child1.next.colour == 0) { this.__fix_dbl_red(child1.next); break; }
            }
            var child2 = parent.next;
            if (child2.colour == -1) { this.__fix_neg_red(child2); break; }
            else if (child2.colour == 0) {
              if (child2.prev != null && child2.prev.colour == 0) { this.__fix_dbl_red(child2.prev); break; }
              if (child2.next != null && child2.next.colour == 0) { this.__fix_dbl_red(child2.next); break; }
            }
            if (parent.colour == 2) {
              if (parent.parent == null) { parent.colour = 1; } else { parent = parent.parent; continue; }
            }
            break;
          }
        }
      }
      var par = cur.parent;
      if (par == null) this.parent = child;
      else if (par.prev == cur) par.prev = child;
      else par.next = child;
      if (child != null) child.parent = par;
      cur.parent = cur.prev = cur.next = null;
      var o = cur;
      o.data = null; o.lt = null; o.swapped = null;
      o.next = cls.zpp_pool;
      cls.zpp_pool = o;
    };
    cls.prototype.clear = function () {
      if (this.parent != null) {
        var cur = this.parent;
        while (cur != null) {
          if (cur.prev != null) cur = cur.prev;
          else if (cur.next != null) cur = cur.next;
          else {
            var ret = cur.parent;
            if (ret != null) { if (cur == ret.prev) ret.prev = null; else ret.next = null; cur.parent = null; }
            var o = cur; o.data = null; o.lt = null; o.swapped = null;
            o.next = cls.zpp_pool; cls.zpp_pool = o;
            cur = ret;
          }
        }
        this.parent = null;
      }
    };
    cls.prototype.clear_with = function (lambda) {
      if (this.parent == null) return;
      var cur = this.parent;
      while (cur != null) {
        if (cur.prev != null) cur = cur.prev;
        else if (cur.next != null) cur = cur.next;
        else {
          lambda(cur.data);
          var ret = cur.parent;
          if (ret != null) { if (cur == ret.prev) ret.prev = null; else ret.next = null; cur.parent = null; }
          var o = cur; o.data = null; o.lt = null; o.swapped = null;
          o.next = cls.zpp_pool; cls.zpp_pool = o;
          cur = ret;
        }
      }
      this.parent = null;
    };
    cls.prototype.clear_node = function (node, lambda) {
      lambda(node.data);
      var ret = node.parent;
      if (ret != null) { if (node == ret.prev) ret.prev = null; else ret.next = null; node.parent = null; }
      var o = node; o.data = null; o.lt = null; o.swapped = null;
      o.next = cls.zpp_pool; cls.zpp_pool = o;
      return ret;
    };
    cls.prototype.__fix_neg_red = function (negred) {
      var parent = negred.parent;
      var child;
      if (parent.prev == negred) {
        var nl = negred.prev, nr = negred.next, trl = nr.prev, trr = nr.next;
        nl.colour = 0; negred.colour = parent.colour = 1;
        negred.next = trl; if (trl != null) trl.parent = negred;
        var t = parent.data; parent.data = nr.data; nr.data = t;
        if (this.swapped != null) this.swapped(parent.data, nr.data);
        nr.prev = trr; if (trr != null) trr.parent = nr;
        nr.next = parent.next; if (parent.next != null) parent.next.parent = nr;
        parent.next = nr; if (nr != null) nr.parent = parent;
        child = nl;
      } else {
        var nl1 = negred.next, nr1 = negred.prev, trl1 = nr1.next, trr1 = nr1.prev;
        nl1.colour = 0; negred.colour = parent.colour = 1;
        negred.prev = trl1; if (trl1 != null) trl1.parent = negred;
        var t1 = parent.data; parent.data = nr1.data; nr1.data = t1;
        if (this.swapped != null) this.swapped(parent.data, nr1.data);
        nr1.next = trr1; if (trr1 != null) trr1.parent = nr1;
        nr1.prev = parent.prev; if (parent.prev != null) parent.prev.parent = nr1;
        parent.prev = nr1; if (nr1 != null) nr1.parent = parent;
        child = nl1;
      }
      if (child.prev != null && child.prev.colour == 0) this.__fix_dbl_red(child.prev);
      else if (child.next != null && child.next.colour == 0) this.__fix_dbl_red(child.next);
    };
    cls.prototype.__fix_dbl_red = function (x) {
      while (true) {
        var par = x.parent, g = par.parent;
        if (g == null) { par.colour = 1; break; }
        var n1, n2, n3, t1, t2, t3, t4;
        if (par == g.prev) {
          n3 = g; t4 = g.next;
          if (x == par.prev) { n1 = x; n2 = par; t1 = x.prev; t2 = x.next; t3 = par.next; }
          else { n1 = par; n2 = x; t1 = par.prev; t2 = x.prev; t3 = x.next; }
        } else {
          n1 = g; t1 = g.prev;
          if (x == par.prev) { n2 = x; n3 = par; t2 = x.prev; t3 = x.next; t4 = par.next; }
          else { n2 = par; n3 = x; t2 = par.prev; t3 = x.prev; t4 = x.next; }
        }
        var par1 = g.parent;
        if (par1 == null) this.parent = n2;
        else if (par1.prev == g) par1.prev = n2;
        else par1.next = n2;
        if (n2 != null) n2.parent = par1;
        n1.prev = t1; if (t1 != null) t1.parent = n1;
        n1.next = t2; if (t2 != null) t2.parent = n1;
        n2.prev = n1; if (n1 != null) n1.parent = n2;
        n2.next = n3; if (n3 != null) n3.parent = n2;
        n3.prev = t3; if (t3 != null) t3.parent = n3;
        n3.next = t4; if (t4 != null) t4.parent = n3;
        n2.colour = g.colour - 1; n1.colour = 1; n3.colour = 1;
        if (n2 == this.parent) { this.parent.colour = 1; }
        else if (n2.colour == 0 && n2.parent.colour == 0) { x = n2; continue; }
        break;
      }
    };
    cls.prototype.try_insert_bool = function (obj) {
      var x = null, cur = null;
      if (this.parent == null) {
        if (cls.zpp_pool == null) x = new cls(); else { x = cls.zpp_pool; cls.zpp_pool = x.next; x.next = null; }
        x.data = obj; this.parent = x;
      } else {
        cur = this.parent;
        while (true) {
          if (this.lt(obj, cur.data)) {
            if (cur.prev == null) {
              if (cls.zpp_pool == null) x = new cls(); else { x = cls.zpp_pool; cls.zpp_pool = x.next; x.next = null; }
              x.data = obj; cur.prev = x; x.parent = cur; break;
            } else cur = cur.prev;
          } else if (this.lt(cur.data, obj)) {
            if (cur.next == null) {
              if (cls.zpp_pool == null) x = new cls(); else { x = cls.zpp_pool; cls.zpp_pool = x.next; x.next = null; }
              x.data = obj; cur.next = x; x.parent = cur; break;
            } else cur = cur.next;
          } else break;
        }
      }
      if (x == null) return false;
      if (x.parent == null) x.colour = 1;
      else { x.colour = 0; if (x.parent.colour == 0) this.__fix_dbl_red(x); }
      return true;
    };
    cls.prototype.try_insert = function (obj) {
      var x = null, cur = null;
      if (this.parent == null) {
        if (cls.zpp_pool == null) x = new cls(); else { x = cls.zpp_pool; cls.zpp_pool = x.next; x.next = null; }
        x.data = obj; this.parent = x;
      } else {
        cur = this.parent;
        while (true) {
          if (this.lt(obj, cur.data)) {
            if (cur.prev == null) {
              if (cls.zpp_pool == null) x = new cls(); else { x = cls.zpp_pool; cls.zpp_pool = x.next; x.next = null; }
              x.data = obj; cur.prev = x; x.parent = cur; break;
            } else cur = cur.prev;
          } else if (this.lt(cur.data, obj)) {
            if (cur.next == null) {
              if (cls.zpp_pool == null) x = new cls(); else { x = cls.zpp_pool; cls.zpp_pool = x.next; x.next = null; }
              x.data = obj; cur.next = x; x.parent = cur; break;
            } else cur = cur.next;
          } else break;
        }
      }
      if (x == null) return cur;
      if (x.parent == null) x.colour = 1;
      else { x.colour = 0; if (x.parent.colour == 0) this.__fix_dbl_red(x); }
      return x;
    };
    cls.prototype.insert = function (obj) {
      var x;
      if (cls.zpp_pool == null) x = new cls(); else { x = cls.zpp_pool; cls.zpp_pool = x.next; x.next = null; }
      x.data = obj;
      if (this.parent == null) { this.parent = x; }
      else {
        var cur = this.parent;
        while (true) {
          if (this.lt(x.data, cur.data)) {
            if (cur.prev == null) { cur.prev = x; x.parent = cur; break; } else cur = cur.prev;
          } else if (cur.next == null) { cur.next = x; x.parent = cur; break; }
          else cur = cur.next;
        }
      }
      if (x.parent == null) x.colour = 1;
      else { x.colour = 0; if (x.parent.colour == 0) this.__fix_dbl_red(x); }
      return x;
    };
    cls.prototype.__class__ = cls;
    return cls;
  }


  // --- ZNPNode classes (generated by createZNPNode) ---
  zpp_nape.util.ZNPNode_ZPP_CbType = createZNPNode("ZPP_CbType");
  zpp_nape.util.ZNPNode_ZPP_CallbackSet = createZNPNode("ZPP_CallbackSet");
  zpp_nape.util.ZNPNode_ZPP_Shape = createZNPNode("ZPP_Shape");
  zpp_nape.util.ZNPNode_ZPP_Body = createZNPNode("ZPP_Body");
  zpp_nape.util.ZNPNode_ZPP_Constraint = createZNPNode("ZPP_Constraint");
  zpp_nape.util.ZNPNode_ZPP_Compound = createZNPNode("ZPP_Compound");
  zpp_nape.util.ZNPNode_ZPP_Arbiter = createZNPNode("ZPP_Arbiter");
  zpp_nape.util.ZNPNode_ZPP_InteractionListener = createZNPNode("ZPP_InteractionListener");
  zpp_nape.util.ZNPNode_ZPP_CbSet = createZNPNode("ZPP_CbSet");
  zpp_nape.util.ZNPNode_ZPP_Interactor = createZNPNode("ZPP_Interactor");
  zpp_nape.util.ZNPNode_ZPP_BodyListener = createZNPNode("ZPP_BodyListener");
  zpp_nape.util.ZNPNode_ZPP_CbSetPair = createZNPNode("ZPP_CbSetPair");
  zpp_nape.util.ZNPNode_ZPP_ConstraintListener = createZNPNode("ZPP_ConstraintListener");
  zpp_nape.util.ZNPNode_ZPP_CutInt = createZNPNode("ZPP_CutInt");
  zpp_nape.util.ZNPNode_ZPP_CutVert = createZNPNode("ZPP_CutVert");
  zpp_nape.util.ZNPNode_ZPP_PartitionVertex = createZNPNode("ZPP_PartitionVertex");
  zpp_nape.util.ZNPNode_ZPP_SimplifyP = createZNPNode("ZPP_SimplifyP");
  zpp_nape.util.ZNPNode_ZPP_PartitionedPoly = createZNPNode("ZPP_PartitionedPoly");
  zpp_nape.util.ZNPNode_ZPP_GeomVert = createZNPNode("ZPP_GeomVert");
  zpp_nape.util.ZNPNode_ZPP_SimpleVert = createZNPNode("ZPP_SimpleVert");
  zpp_nape.util.ZNPNode_ZPP_SimpleEvent = createZNPNode("ZPP_SimpleEvent");
  zpp_nape.util.ZNPNode_ZPP_Vec2 = createZNPNode("ZPP_Vec2");
  zpp_nape.util.ZNPNode_ZPP_AABBPair = createZNPNode("ZPP_AABBPair");
  zpp_nape.util.ZNPNode_ZPP_Edge = createZNPNode("ZPP_Edge");
  zpp_nape.util.ZNPNode_ZPP_AABBNode = createZNPNode("ZPP_AABBNode");
  zpp_nape.util.ZNPNode_ZPP_Component = createZNPNode("ZPP_Component");
  zpp_nape.util.ZNPNode_ZPP_FluidArbiter = createZNPNode("ZPP_FluidArbiter");
  zpp_nape.util.ZNPNode_ZPP_SensorArbiter = createZNPNode("ZPP_SensorArbiter");
  zpp_nape.util.ZNPNode_ZPP_Listener = createZNPNode("ZPP_Listener");
  zpp_nape.util.ZNPNode_ZPP_ColArbiter = createZNPNode("ZPP_ColArbiter");
  zpp_nape.util.ZNPNode_ZPP_InteractionGroup = createZNPNode("ZPP_InteractionGroup");
  zpp_nape.util.ZNPNode_ZPP_ToiEvent = createZNPNode("ZPP_ToiEvent");
  zpp_nape.util.ZNPNode_ConvexResult = createZNPNode("ConvexResult");
  zpp_nape.util.ZNPNode_ZPP_GeomPoly = createZNPNode("ZPP_GeomPoly");
  zpp_nape.util.ZNPNode_RayResult = createZNPNode("RayResult");

  // --- ZNPList classes (generated by createZNPList) ---
  zpp_nape.util.ZNPList_ZPP_InteractionListener = createZNPList("ZPP_InteractionListener", zpp_nape.util.ZNPNode_ZPP_InteractionListener);
  zpp_nape.util.ZNPList_ZPP_BodyListener = createZNPList("ZPP_BodyListener", zpp_nape.util.ZNPNode_ZPP_BodyListener);
  zpp_nape.util.ZNPList_ZPP_ConstraintListener = createZNPList("ZPP_ConstraintListener", zpp_nape.util.ZNPNode_ZPP_ConstraintListener);
  zpp_nape.util.ZNPList_ZPP_Constraint = createZNPList("ZPP_Constraint", zpp_nape.util.ZNPNode_ZPP_Constraint);
  zpp_nape.util.ZNPList_ZPP_Interactor = createZNPList("ZPP_Interactor", zpp_nape.util.ZNPNode_ZPP_Interactor);
  zpp_nape.util.ZNPList_ZPP_CbSet = createZNPList("ZPP_CbSet", zpp_nape.util.ZNPNode_ZPP_CbSet);
  zpp_nape.util.ZNPList_ZPP_CbType = createZNPList("ZPP_CbType", zpp_nape.util.ZNPNode_ZPP_CbType);
  zpp_nape.util.ZNPList_ZPP_Vec2 = createZNPList("ZPP_Vec2", zpp_nape.util.ZNPNode_ZPP_Vec2);
  zpp_nape.util.ZNPList_ZPP_CallbackSet = createZNPList("ZPP_CallbackSet", zpp_nape.util.ZNPNode_ZPP_CallbackSet);
  zpp_nape.util.ZNPList_ZPP_Shape = createZNPList("ZPP_Shape", zpp_nape.util.ZNPNode_ZPP_Shape);
  zpp_nape.util.ZNPList_ZPP_Body = createZNPList("ZPP_Body", zpp_nape.util.ZNPNode_ZPP_Body);
  zpp_nape.util.ZNPList_ZPP_Compound = createZNPList("ZPP_Compound", zpp_nape.util.ZNPNode_ZPP_Compound);
  zpp_nape.util.ZNPList_ZPP_Arbiter = createZNPList("ZPP_Arbiter", zpp_nape.util.ZNPNode_ZPP_Arbiter);
  zpp_nape.util.ZNPList_ZPP_CbSetPair = createZNPList("ZPP_CbSetPair", zpp_nape.util.ZNPNode_ZPP_CbSetPair);
  zpp_nape.util.ZNPList_ZPP_CutInt = createZNPList("ZPP_CutInt", zpp_nape.util.ZNPNode_ZPP_CutInt);
  zpp_nape.util.ZNPList_ZPP_CutVert = createZNPList("ZPP_CutVert", zpp_nape.util.ZNPNode_ZPP_CutVert);
  zpp_nape.util.ZNPList_ZPP_PartitionVertex = createZNPList("ZPP_PartitionVertex", zpp_nape.util.ZNPNode_ZPP_PartitionVertex);
  zpp_nape.util.ZNPList_ZPP_SimplifyP = createZNPList("ZPP_SimplifyP", zpp_nape.util.ZNPNode_ZPP_SimplifyP);
  zpp_nape.util.ZNPList_ZPP_PartitionedPoly = createZNPList("ZPP_PartitionedPoly", zpp_nape.util.ZNPNode_ZPP_PartitionedPoly);
  zpp_nape.util.ZNPList_ZPP_GeomVert = createZNPList("ZPP_GeomVert", zpp_nape.util.ZNPNode_ZPP_GeomVert);
  zpp_nape.util.ZNPList_ZPP_SimpleVert = createZNPList("ZPP_SimpleVert", zpp_nape.util.ZNPNode_ZPP_SimpleVert);
  zpp_nape.util.ZNPList_ZPP_SimpleEvent = createZNPList("ZPP_SimpleEvent", zpp_nape.util.ZNPNode_ZPP_SimpleEvent);
  zpp_nape.util.ZNPList_ZPP_AABBPair = createZNPList("ZPP_AABBPair", zpp_nape.util.ZNPNode_ZPP_AABBPair);
  zpp_nape.util.ZNPList_ZPP_Edge = createZNPList("ZPP_Edge", zpp_nape.util.ZNPNode_ZPP_Edge);
  zpp_nape.util.ZNPList_ZPP_AABBNode = createZNPList("ZPP_AABBNode", zpp_nape.util.ZNPNode_ZPP_AABBNode);
  zpp_nape.util.ZNPList_ZPP_Component = createZNPList("ZPP_Component", zpp_nape.util.ZNPNode_ZPP_Component);
  zpp_nape.util.ZNPList_ZPP_FluidArbiter = createZNPList("ZPP_FluidArbiter", zpp_nape.util.ZNPNode_ZPP_FluidArbiter);
  zpp_nape.util.ZNPList_ZPP_SensorArbiter = createZNPList("ZPP_SensorArbiter", zpp_nape.util.ZNPNode_ZPP_SensorArbiter);
  zpp_nape.util.ZNPList_ZPP_Listener = createZNPList("ZPP_Listener", zpp_nape.util.ZNPNode_ZPP_Listener);
  zpp_nape.util.ZNPList_ZPP_ColArbiter = createZNPList("ZPP_ColArbiter", zpp_nape.util.ZNPNode_ZPP_ColArbiter);
  zpp_nape.util.ZNPList_ZPP_InteractionGroup = createZNPList("ZPP_InteractionGroup", zpp_nape.util.ZNPNode_ZPP_InteractionGroup);
  zpp_nape.util.ZNPList_ZPP_ToiEvent = createZNPList("ZPP_ToiEvent", zpp_nape.util.ZNPNode_ZPP_ToiEvent);
  zpp_nape.util.ZNPList_ConvexResult = createZNPList("ConvexResult", zpp_nape.util.ZNPNode_ConvexResult);
  zpp_nape.util.ZNPList_ZPP_GeomPoly = createZNPList("ZPP_GeomPoly", zpp_nape.util.ZNPNode_ZPP_GeomPoly);
  zpp_nape.util.ZNPList_RayResult = createZNPList("RayResult", zpp_nape.util.ZNPNode_RayResult);

  // --- ZPP_Set classes (generated by createZPPSet) ---
  zpp_nape.util.ZPP_Set_ZPP_Body = createZPPSet("ZPP_Body");
  zpp_nape.util.ZPP_Set_ZPP_CbSetPair = createZPPSet("ZPP_CbSetPair");
  zpp_nape.util.ZPP_Set_ZPP_PartitionVertex = createZPPSet("ZPP_PartitionVertex");
  zpp_nape.util.ZPP_Set_ZPP_PartitionPair = createZPPSet("ZPP_PartitionPair");
  zpp_nape.util.ZPP_Set_ZPP_SimpleVert = createZPPSet("ZPP_SimpleVert");
  zpp_nape.util.ZPP_Set_ZPP_SimpleSeg = createZPPSet("ZPP_SimpleSeg");
  zpp_nape.util.ZPP_Set_ZPP_SimpleEvent = createZPPSet("ZPP_SimpleEvent");
  zpp_nape.util.ZPP_Set_ZPP_CbSet = createZPPSet("ZPP_CbSet");

  // zpp_nape.util.ZNPList_ZPP_InteractionListener: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_BodyListener: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_ConstraintListener: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_Constraint: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_Interactor: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_CbSet: generated by factory above
  // ZPP_CbType: converted to TypeScript → src/native/callbacks/ZPP_CbType.ts
  ZPP_CbType_TS._zpp = zpp_nape;
  zpp_nape.callbacks.ZPP_CbType = $hxClasses["zpp_nape.callbacks.ZPP_CbType"] = ZPP_CbType_TS;
  zpp_nape.callbacks.ZPP_CbType.prototype.__class__ = zpp_nape.callbacks.ZPP_CbType;
  // ZPP_Flags: converted to TypeScript → src/native/util/ZPP_Flags.ts
  zpp_nape.util.ZPP_Flags = $hxClasses["zpp_nape.util.ZPP_Flags"] = ZPP_Flags_TS;
  zpp_nape.util.ZPP_Flags.prototype.__class__ = zpp_nape.util.ZPP_Flags;
  // ZPP_Listener: converted to TypeScript → src/native/callbacks/ZPP_Listener.ts
  ZPP_Listener_TS._nape = nape;
  ZPP_Listener_TS._zpp = zpp_nape;
  zpp_nape.callbacks.ZPP_Listener = $hxClasses["zpp_nape.callbacks.ZPP_Listener"] = ZPP_Listener_TS;
  zpp_nape.callbacks.ZPP_Listener.prototype.__class__ = zpp_nape.callbacks.ZPP_Listener;
  // ZPP_BodyListener: converted to TypeScript → src/native/callbacks/ZPP_BodyListener.ts
  zpp_nape.callbacks.ZPP_BodyListener = $hxClasses["zpp_nape.callbacks.ZPP_BodyListener"] = ZPP_BodyListener_TS;
  zpp_nape.callbacks.ZPP_BodyListener.prototype.__class__ = zpp_nape.callbacks.ZPP_BodyListener;
  // ZPP_ConstraintListener: converted to TypeScript → src/native/callbacks/ZPP_ConstraintListener.ts
  zpp_nape.callbacks.ZPP_ConstraintListener = $hxClasses["zpp_nape.callbacks.ZPP_ConstraintListener"] = ZPP_ConstraintListener_TS;
  zpp_nape.callbacks.ZPP_ConstraintListener.prototype.__class__ = zpp_nape.callbacks.ZPP_ConstraintListener;
  // zpp_nape.util.ZNPList_ZPP_CbType: generated by factory above
  // ZPP_InteractionListener: converted to TypeScript → src/native/callbacks/ZPP_InteractionListener.ts
  zpp_nape.callbacks.ZPP_InteractionListener = $hxClasses["zpp_nape.callbacks.ZPP_InteractionListener"] = ZPP_InteractionListener_TS;
  zpp_nape.callbacks.ZPP_InteractionListener.prototype.__class__ = zpp_nape.callbacks.ZPP_InteractionListener;
  // ZPP_OptionType: converted to TypeScript → src/native/callbacks/ZPP_OptionType.ts
  ZPP_OptionType_TS._nape = nape;
  ZPP_OptionType_TS._zpp = zpp_nape;
  zpp_nape.callbacks.ZPP_OptionType = $hxClasses["zpp_nape.callbacks.ZPP_OptionType"] = ZPP_OptionType_TS;
  zpp_nape.callbacks.ZPP_OptionType.prototype.__class__ = zpp_nape.callbacks.ZPP_OptionType;
  if (!zpp_nape.constraint) zpp_nape.constraint = {};
  // ZPP_Constraint: converted to TypeScript → src/native/constraint/ZPP_Constraint.ts
  ZPP_Constraint_TS._nape = nape;
  ZPP_Constraint_TS._zpp = zpp_nape;
  zpp_nape.constraint.ZPP_Constraint = $hxClasses["zpp_nape.constraint.ZPP_Constraint"] = ZPP_Constraint_TS;
  zpp_nape.constraint.ZPP_Constraint.__name__ = ZPP_Constraint_TS.__name__;
  zpp_nape.constraint.ZPP_Constraint.prototype.__class__ = zpp_nape.constraint.ZPP_Constraint;

  // ZPP_AngleJoint: converted to TypeScript → src/native/constraint/ZPP_AngleJoint.ts
  zpp_nape.constraint.ZPP_AngleJoint = $hxClasses["zpp_nape.constraint.ZPP_AngleJoint"] = ZPP_AngleJoint_TS;
  zpp_nape.constraint.ZPP_AngleJoint.__name__ = ZPP_AngleJoint_TS.__name__;
  zpp_nape.constraint.ZPP_AngleJoint.prototype.__class__ = zpp_nape.constraint.ZPP_AngleJoint;

  // ZPP_CopyHelper: converted to TypeScript → src/native/constraint/ZPP_CopyHelper.ts
  zpp_nape.constraint.ZPP_CopyHelper = $hxClasses["zpp_nape.constraint.ZPP_CopyHelper"] = ZPP_CopyHelper_TS;
  zpp_nape.constraint.ZPP_CopyHelper.prototype.__class__ = zpp_nape.constraint.ZPP_CopyHelper;

  // ZPP_DistanceJoint: converted to TypeScript → src/native/constraint/ZPP_DistanceJoint.ts
  zpp_nape.constraint.ZPP_DistanceJoint = $hxClasses["zpp_nape.constraint.ZPP_DistanceJoint"] = ZPP_DistanceJoint_TS;
  zpp_nape.constraint.ZPP_DistanceJoint.__name__ = ZPP_DistanceJoint_TS.__name__;
  zpp_nape.constraint.ZPP_DistanceJoint.prototype.__class__ = zpp_nape.constraint.ZPP_DistanceJoint;

  // ZPP_LineJoint: converted to TypeScript → src/native/constraint/ZPP_LineJoint.ts
  zpp_nape.constraint.ZPP_LineJoint = $hxClasses["zpp_nape.constraint.ZPP_LineJoint"] = ZPP_LineJoint_TS;
  zpp_nape.constraint.ZPP_LineJoint.__name__ = ZPP_LineJoint_TS.__name__;
  zpp_nape.constraint.ZPP_LineJoint.prototype.__class__ = zpp_nape.constraint.ZPP_LineJoint;

  // ZPP_MotorJoint: converted to TypeScript → src/native/constraint/ZPP_MotorJoint.ts
  zpp_nape.constraint.ZPP_MotorJoint = $hxClasses["zpp_nape.constraint.ZPP_MotorJoint"] = ZPP_MotorJoint_TS;
  zpp_nape.constraint.ZPP_MotorJoint.__name__ = ZPP_MotorJoint_TS.__name__;
  zpp_nape.constraint.ZPP_MotorJoint.prototype.__class__ = zpp_nape.constraint.ZPP_MotorJoint;

  // ZPP_PivotJoint: converted to TypeScript → src/native/constraint/ZPP_PivotJoint.ts
  zpp_nape.constraint.ZPP_PivotJoint = $hxClasses["zpp_nape.constraint.ZPP_PivotJoint"] = ZPP_PivotJoint_TS;
  zpp_nape.constraint.ZPP_PivotJoint.__name__ = ZPP_PivotJoint_TS.__name__;
  zpp_nape.constraint.ZPP_PivotJoint.prototype.__class__ = zpp_nape.constraint.ZPP_PivotJoint;

  // ZPP_PulleyJoint: converted to TypeScript → src/native/constraint/ZPP_PulleyJoint.ts
  zpp_nape.constraint.ZPP_PulleyJoint = $hxClasses["zpp_nape.constraint.ZPP_PulleyJoint"] = ZPP_PulleyJoint_TS;
  zpp_nape.constraint.ZPP_PulleyJoint.__name__ = ZPP_PulleyJoint_TS.__name__;
  zpp_nape.constraint.ZPP_PulleyJoint.prototype.__class__ = zpp_nape.constraint.ZPP_PulleyJoint;

  // ZPP_UserConstraint: converted to TypeScript → src/native/constraint/ZPP_UserConstraint.ts
  zpp_nape.constraint.ZPP_UserConstraint = $hxClasses["zpp_nape.constraint.ZPP_UserConstraint"] = ZPP_UserConstraint_TS;
  zpp_nape.constraint.ZPP_UserConstraint.__name__ = ZPP_UserConstraint_TS.__name__;
  zpp_nape.constraint.ZPP_UserConstraint.prototype.__class__ = zpp_nape.constraint.ZPP_UserConstraint;

  // ZPP_UserBody: converted to TypeScript → src/native/constraint/ZPP_UserBody.ts
  zpp_nape.constraint.ZPP_UserBody = $hxClasses["zpp_nape.constraint.ZPP_UserBody"] = ZPP_UserBody_TS;
  zpp_nape.constraint.ZPP_UserBody.prototype.__class__ = zpp_nape.constraint.ZPP_UserBody;

  // ZPP_WeldJoint: converted to TypeScript → src/native/constraint/ZPP_WeldJoint.ts
  zpp_nape.constraint.ZPP_WeldJoint = $hxClasses["zpp_nape.constraint.ZPP_WeldJoint"] = ZPP_WeldJoint_TS;
  zpp_nape.constraint.ZPP_WeldJoint.__name__ = ZPP_WeldJoint_TS.__name__;
  zpp_nape.constraint.ZPP_WeldJoint.prototype.__class__ = zpp_nape.constraint.ZPP_WeldJoint;

  if (!zpp_nape.dynamics) zpp_nape.dynamics = {};
  // ZPP_Arbiter: converted to TypeScript → src/native/dynamics/ZPP_Arbiter.ts
  ZPP_Arbiter_TS._nape = nape;
  ZPP_Arbiter_TS._zpp = zpp_nape;
  zpp_nape.dynamics.ZPP_Arbiter = $hxClasses["zpp_nape.dynamics.ZPP_Arbiter"] = ZPP_Arbiter_TS;
  zpp_nape.dynamics.ZPP_Arbiter.prototype.__class__ = zpp_nape.dynamics.ZPP_Arbiter;
  // ZPP_Arbiter prototype methods: implemented in TypeScript
  // ZPP_SensorArbiter: converted to TypeScript → src/native/dynamics/ZPP_SensorArbiter.ts
  zpp_nape.dynamics.ZPP_SensorArbiter = $hxClasses["zpp_nape.dynamics.ZPP_SensorArbiter"] = ZPP_SensorArbiter_TS;
  zpp_nape.dynamics.ZPP_SensorArbiter.prototype.__class__ = zpp_nape.dynamics.ZPP_SensorArbiter;
  // ZPP_FluidArbiter: converted to TypeScript → src/native/dynamics/ZPP_FluidArbiter.ts
  ZPP_FluidArbiter_TS._nape = nape;
  ZPP_FluidArbiter_TS._zpp = zpp_nape;
  zpp_nape.dynamics.ZPP_FluidArbiter = $hxClasses["zpp_nape.dynamics.ZPP_FluidArbiter"] = ZPP_FluidArbiter_TS;
  zpp_nape.dynamics.ZPP_FluidArbiter.prototype.__class__ = zpp_nape.dynamics.ZPP_FluidArbiter;
  // ZPP_ColArbiter: converted to TypeScript → src/native/dynamics/ZPP_ColArbiter.ts
  ZPP_ColArbiter_TS._nape = nape;
  ZPP_ColArbiter_TS._zpp = zpp_nape;
  zpp_nape.dynamics.ZPP_ColArbiter = $hxClasses["zpp_nape.dynamics.ZPP_ColArbiter"] = ZPP_ColArbiter_TS;
  zpp_nape.dynamics.ZPP_ColArbiter.prototype.__class__ = zpp_nape.dynamics.ZPP_ColArbiter;
  // ZPP_IContact: converted to TypeScript → src/native/dynamics/ZPP_IContact.ts
  zpp_nape.dynamics.ZPP_IContact = $hxClasses["zpp_nape.dynamics.ZPP_IContact"] = ZPP_IContact_TS;
  zpp_nape.dynamics.ZPP_IContact.prototype.__class__ = zpp_nape.dynamics.ZPP_IContact;
  // ZPP_Contact: converted to TypeScript → src/native/dynamics/ZPP_Contact.ts
  ZPP_Contact_TS._nape = nape;
  ZPP_Contact_TS._zpp = zpp_nape;
  zpp_nape.dynamics.ZPP_Contact = $hxClasses["zpp_nape.dynamics.ZPP_Contact"] = ZPP_Contact_TS;
  zpp_nape.dynamics.ZPP_Contact.prototype.__class__ = zpp_nape.dynamics.ZPP_Contact;
  // ZPP_InteractionFilter: converted to TypeScript → src/native/dynamics/ZPP_InteractionFilter.ts
  ZPP_InteractionFilter_TS._nape = nape;
  ZPP_InteractionFilter_TS._zpp = zpp_nape;
  zpp_nape.dynamics.ZPP_InteractionFilter = $hxClasses["zpp_nape.dynamics.ZPP_InteractionFilter"] = ZPP_InteractionFilter_TS;
  zpp_nape.dynamics.ZPP_InteractionFilter.prototype.__class__ = zpp_nape.dynamics.ZPP_InteractionFilter;
  // ZPP_InteractionGroup: converted to TypeScript → src/native/dynamics/ZPP_InteractionGroup.ts
  ZPP_InteractionGroup_TS._zpp = zpp_nape;
  zpp_nape.dynamics.ZPP_InteractionGroup = $hxClasses["zpp_nape.dynamics.ZPP_InteractionGroup"] = ZPP_InteractionGroup_TS;
  zpp_nape.dynamics.ZPP_InteractionGroup.prototype.__class__ = zpp_nape.dynamics.ZPP_InteractionGroup;
  // ZPP_SpaceArbiterList: converted to TypeScript → src/native/dynamics/ZPP_SpaceArbiterList.ts
  ZPP_SpaceArbiterList_TS._nape = nape;
  ZPP_SpaceArbiterList_TS._zpp = zpp_nape;
  ZPP_SpaceArbiterList_TS._init();
  zpp_nape.dynamics.ZPP_SpaceArbiterList = $hxClasses["zpp_nape.dynamics.ZPP_SpaceArbiterList"] = ZPP_SpaceArbiterList_TS;
  zpp_nape.dynamics.ZPP_SpaceArbiterList.prototype.__class__ = zpp_nape.dynamics.ZPP_SpaceArbiterList;
  if (!zpp_nape.geom) zpp_nape.geom = {};
  // ZPP_AABB: converted to TypeScript → src/native/geom/ZPP_AABB.ts
  ZPP_AABB_TS._nape = nape;
  ZPP_AABB_TS._zpp = zpp_nape;
  zpp_nape.geom.ZPP_AABB = $hxClasses["zpp_nape.geom.ZPP_AABB"] = ZPP_AABB_TS;
  zpp_nape.geom.ZPP_AABB.prototype.__class__ = zpp_nape.geom.ZPP_AABB;
  // zpp_nape.util.ZNPList_ZPP_Vec2: generated by factory above
  // ZPP_Collide: converted to TypeScript → src/native/geom/ZPP_Collide.ts
  zpp_nape.geom.ZPP_Collide = $hxClasses["zpp_nape.geom.ZPP_Collide"] = ZPP_Collide_TS;
  zpp_nape.geom.ZPP_Collide.prototype.__class__ = zpp_nape.geom.ZPP_Collide;
  // ZPP_Convex: converted to TypeScript → src/native/geom/ZPP_Convex.ts
  zpp_nape.geom.ZPP_Convex = $hxClasses["zpp_nape.geom.ZPP_Convex"] = ZPP_Convex_TS;
  zpp_nape.geom.ZPP_Convex.prototype.__class__ = zpp_nape.geom.ZPP_Convex;
  // ZPP_ConvexRayResult: converted to TypeScript → src/native/geom/ZPP_ConvexRayResult.ts
  zpp_nape.geom.ZPP_ConvexRayResult = $hxClasses["zpp_nape.geom.ZPP_ConvexRayResult"] = ZPP_ConvexRayResult_TS;
  zpp_nape.geom.ZPP_ConvexRayResult.prototype.__class__ = zpp_nape.geom.ZPP_ConvexRayResult;
  // ZPP_CutVert: converted to TypeScript → src/native/geom/ZPP_CutVert.ts
  zpp_nape.geom.ZPP_CutVert = $hxClasses["zpp_nape.geom.ZPP_CutVert"] = ZPP_CutVert_TS;
  zpp_nape.geom.ZPP_CutVert.prototype.__class__ = zpp_nape.geom.ZPP_CutVert;
  // ZPP_CutInt: converted to TypeScript → src/native/geom/ZPP_CutInt.ts
  zpp_nape.geom.ZPP_CutInt = $hxClasses["zpp_nape.geom.ZPP_CutInt"] = ZPP_CutInt_TS;
  zpp_nape.geom.ZPP_CutInt.prototype.__class__ = zpp_nape.geom.ZPP_CutInt;
  // ZPP_Cutter: converted to TypeScript → src/native/geom/ZPP_Cutter.ts
  zpp_nape.geom.ZPP_Cutter = $hxClasses["zpp_nape.geom.ZPP_Cutter"] = ZPP_Cutter_TS;
  zpp_nape.geom.ZPP_Cutter.prototype.__class__ = zpp_nape.geom.ZPP_Cutter;
  // ZPP_Geom: converted to TypeScript → src/native/geom/ZPP_Geom.ts
  zpp_nape.geom.ZPP_Geom = $hxClasses["zpp_nape.geom.ZPP_Geom"] = ZPP_Geom_TS;
  zpp_nape.geom.ZPP_Geom.prototype.__class__ = zpp_nape.geom.ZPP_Geom;
  // ZPP_GeomVert: converted to TypeScript → src/native/geom/ZPP_GeomVert.ts
  zpp_nape.geom.ZPP_GeomVert = $hxClasses["zpp_nape.geom.ZPP_GeomVert"] = ZPP_GeomVert_TS;
  zpp_nape.geom.ZPP_GeomVert.prototype.__class__ = zpp_nape.geom.ZPP_GeomVert;
  ZPP_GeomVert_TS._createVec2Fn = function () { return new nape.geom.Vec2(); };
  zpp_nape.geom.ZPP_GeomPoly = $hxClasses["zpp_nape.geom.ZPP_GeomPoly"] = ZPP_GeomPoly_TS;
  zpp_nape.geom.ZPP_GeomPoly.prototype.__class__ = zpp_nape.geom.ZPP_GeomPoly;
  // ZPP_GeomVertexIterator: converted to TypeScript → src/native/geom/ZPP_GeomVertexIterator.ts
  // Registration handled by ZPP_GeomVertexIterator.ts at module load time.
  // ZPP_MarchSpan: converted to TypeScript → src/native/geom/ZPP_MarchSpan.ts
  zpp_nape.geom.ZPP_MarchSpan = $hxClasses["zpp_nape.geom.ZPP_MarchSpan"] = ZPP_MarchSpan_TS;
  zpp_nape.geom.ZPP_MarchSpan.prototype.__class__ = zpp_nape.geom.ZPP_MarchSpan;
  // ZPP_MarchPair: converted to TypeScript → src/native/geom/ZPP_MarchPair.ts
  zpp_nape.geom.ZPP_MarchPair = $hxClasses["zpp_nape.geom.ZPP_MarchPair"] = ZPP_MarchPair_TS;
  zpp_nape.geom.ZPP_MarchPair.prototype.__class__ = zpp_nape.geom.ZPP_MarchPair;
  // ZPP_MarchingSquares: converted to TypeScript → src/native/geom/ZPP_MarchingSquares.ts
  ZPP_MarchingSquares_TS._init(zpp_nape, nape);
  zpp_nape.geom.ZPP_MarchingSquares = $hxClasses["zpp_nape.geom.ZPP_MarchingSquares"] = ZPP_MarchingSquares_TS;
  zpp_nape.geom.ZPP_MarchingSquares.prototype.__class__ = zpp_nape.geom.ZPP_MarchingSquares;
  // ZPP_Mat23: converted to TypeScript → src/native/geom/ZPP_Mat23.ts
  ZPP_Mat23_TS._nape = nape;
  zpp_nape.geom.ZPP_Mat23 = $hxClasses["zpp_nape.geom.ZPP_Mat23"] = ZPP_Mat23_TS;
  zpp_nape.geom.ZPP_Mat23.prototype.__class__ = zpp_nape.geom.ZPP_Mat23;
  // ZPP_MatMN: converted to TypeScript → src/native/geom/ZPP_MatMN.ts
  zpp_nape.geom.ZPP_MatMN = $hxClasses["zpp_nape.geom.ZPP_MatMN"] = ZPP_MatMN_TS;
  zpp_nape.geom.ZPP_MatMN.prototype.__class__ = zpp_nape.geom.ZPP_MatMN;
  // ZPP_Monotone: converted to TypeScript → src/native/geom/ZPP_Monotone.ts
  zpp_nape.geom.ZPP_Monotone = $hxClasses["zpp_nape.geom.ZPP_Monotone"] = ZPP_Monotone_TS;
  // ZPP_PartitionVertex: converted to TypeScript → src/native/geom/ZPP_PartitionVertex.ts
  zpp_nape.geom.ZPP_PartitionVertex = $hxClasses["zpp_nape.geom.ZPP_PartitionVertex"] = ZPP_PartitionVertex_TS;
  zpp_nape.geom.ZPP_PartitionVertex.prototype.__class__ = zpp_nape.geom.ZPP_PartitionVertex;
  // ZPP_PartitionedPoly: converted to TypeScript → src/native/geom/ZPP_PartitionedPoly.ts
  zpp_nape.geom.ZPP_PartitionedPoly = $hxClasses["zpp_nape.geom.ZPP_PartitionedPoly"] = ZPP_PartitionedPoly_TS;
  zpp_nape.geom.ZPP_PartitionedPoly.prototype.__class__ = zpp_nape.geom.ZPP_PartitionedPoly;
  // ZPP_Ray: converted to TypeScript → src/native/geom/ZPP_Ray.ts
  zpp_nape.geom.ZPP_Ray = $hxClasses["zpp_nape.geom.ZPP_Ray"] = ZPP_Ray_TS;
  zpp_nape.geom.ZPP_Ray.prototype.__class__ = zpp_nape.geom.ZPP_Ray;
  // ZPP_SimpleVert: converted to TypeScript → src/native/geom/ZPP_SimpleVert.ts
  zpp_nape.geom.ZPP_SimpleVert = $hxClasses["zpp_nape.geom.ZPP_SimpleVert"] = ZPP_SimpleVert_TS;
  zpp_nape.geom.ZPP_SimpleVert.prototype.__class__ = zpp_nape.geom.ZPP_SimpleVert;
  // ZPP_SimpleSeg: converted to TypeScript → src/native/geom/ZPP_SimpleSeg.ts
  zpp_nape.geom.ZPP_SimpleSeg = $hxClasses["zpp_nape.geom.ZPP_SimpleSeg"] = ZPP_SimpleSeg_TS;
  zpp_nape.geom.ZPP_SimpleSeg.prototype.__class__ = zpp_nape.geom.ZPP_SimpleSeg;
  // ZPP_SimpleEvent: converted to TypeScript → src/native/geom/ZPP_SimpleEvent.ts
  zpp_nape.geom.ZPP_SimpleEvent = $hxClasses["zpp_nape.geom.ZPP_SimpleEvent"] = ZPP_SimpleEvent_TS;
  zpp_nape.geom.ZPP_SimpleEvent.prototype.__class__ = zpp_nape.geom.ZPP_SimpleEvent;
  // ZPP_SimpleSweep: converted to TypeScript → src/native/geom/ZPP_SimpleSweep.ts
  zpp_nape.geom.ZPP_SimpleSweep = $hxClasses["zpp_nape.geom.ZPP_SimpleSweep"] = ZPP_SimpleSweep_TS;
  zpp_nape.geom.ZPP_SimpleSweep.prototype.__class__ = zpp_nape.geom.ZPP_SimpleSweep;
  // ZPP_Simple: converted to TypeScript → src/native/geom/ZPP_Simple.ts
  zpp_nape.geom.ZPP_Simple = $hxClasses["zpp_nape.geom.ZPP_Simple"] = ZPP_Simple_TS;
  zpp_nape.geom.ZPP_Simple.prototype.__class__ = zpp_nape.geom.ZPP_Simple;
  // ZPP_SimplifyV: converted to TypeScript → src/native/geom/ZPP_SimplifyV.ts
  zpp_nape.geom.ZPP_SimplifyV = $hxClasses["zpp_nape.geom.ZPP_SimplifyV"] = ZPP_SimplifyV_TS;
  zpp_nape.geom.ZPP_SimplifyV.prototype.__class__ = zpp_nape.geom.ZPP_SimplifyV;
  // ZPP_SimplifyP: converted to TypeScript → src/native/geom/ZPP_SimplifyP.ts
  zpp_nape.geom.ZPP_SimplifyP = $hxClasses["zpp_nape.geom.ZPP_SimplifyP"] = ZPP_SimplifyP_TS;
  zpp_nape.geom.ZPP_SimplifyP.prototype.__class__ = zpp_nape.geom.ZPP_SimplifyP;
  // ZPP_Simplify: converted to TypeScript → src/native/geom/ZPP_Simplify.ts
  zpp_nape.geom.ZPP_Simplify = $hxClasses["zpp_nape.geom.ZPP_Simplify"] = ZPP_Simplify_TS;
  zpp_nape.geom.ZPP_Simplify.prototype.__class__ = zpp_nape.geom.ZPP_Simplify;
  // ZPP_ToiEvent: converted to TypeScript → src/native/geom/ZPP_ToiEvent.ts
  zpp_nape.geom.ZPP_ToiEvent = $hxClasses["zpp_nape.geom.ZPP_ToiEvent"] = ZPP_ToiEvent_TS;
  zpp_nape.geom.ZPP_ToiEvent.prototype.__class__ = zpp_nape.geom.ZPP_ToiEvent;
  // ZPP_SweepDistance: converted to TypeScript → src/native/geom/ZPP_SweepDistance.ts
  zpp_nape.geom.ZPP_SweepDistance = $hxClasses["zpp_nape.geom.ZPP_SweepDistance"] = ZPP_SweepDistance_TS;
  zpp_nape.geom.ZPP_SweepDistance.prototype.__class__ = zpp_nape.geom.ZPP_SweepDistance;
  // ZPP_PartitionPair: converted to TypeScript → src/native/geom/ZPP_PartitionPair.ts
  zpp_nape.geom.ZPP_PartitionPair = $hxClasses["zpp_nape.geom.ZPP_PartitionPair"] = ZPP_PartitionPair_TS;
  zpp_nape.geom.ZPP_PartitionPair.prototype.__class__ = zpp_nape.geom.ZPP_PartitionPair;
  // ZPP_Triangular: converted to TypeScript → src/native/geom/ZPP_Triangular.ts
  zpp_nape.geom.ZPP_Triangular = $hxClasses["zpp_nape.geom.ZPP_Triangular"] = ZPP_Triangular_TS;
  zpp_nape.geom.ZPP_Triangular.prototype.__class__ = zpp_nape.geom.ZPP_Triangular;
  zpp_nape.geom.ZPP_Vec2 = $hxClasses["zpp_nape.geom.ZPP_Vec2"] = ZPP_Vec2_TS;
  zpp_nape.geom.ZPP_Vec2.prototype.__class__ = zpp_nape.geom.ZPP_Vec2;
  // ZPP_Vec3: converted to TypeScript → src/native/geom/ZPP_Vec3.ts
  ZPP_Vec3_TS._zpp = zpp_nape;
  zpp_nape.geom.ZPP_Vec3 = $hxClasses["zpp_nape.geom.ZPP_Vec3"] = ZPP_Vec3_TS;
  zpp_nape.geom.ZPP_Vec3.prototype.__class__ = zpp_nape.geom.ZPP_Vec3;
  // ZPP_VecMath: converted to TypeScript → src/native/geom/ZPP_VecMath.ts
  zpp_nape.geom.ZPP_VecMath = $hxClasses["zpp_nape.geom.ZPP_VecMath"] = ZPP_VecMath_TS;
  zpp_nape.geom.ZPP_VecMath.prototype.__class__ = zpp_nape.geom.ZPP_VecMath;
  if (!zpp_nape.phys) zpp_nape.phys = {};
  // ZPP_Interactor: converted to TypeScript → src/native/phys/ZPP_Interactor.ts
  zpp_nape.phys.ZPP_Interactor = $hxClasses["zpp_nape.phys.ZPP_Interactor"] = ZPP_Interactor_TS;
  ZPP_Interactor_TS._init(zpp_nape, nape);
  zpp_nape.phys.ZPP_Interactor.prototype.__class__ =
    zpp_nape.phys.ZPP_Interactor;
  // ZPP_Body: converted to TypeScript → src/native/phys/ZPP_Body.ts
  ZPP_Body_TS._init(zpp_nape, nape);
  zpp_nape.phys.ZPP_Body = $hxClasses["zpp_nape.phys.ZPP_Body"] = ZPP_Body_TS;
  zpp_nape.phys.ZPP_Body.prototype.__class__ = zpp_nape.phys.ZPP_Body;
  // ZPP_Compound: converted to TypeScript → src/native/phys/ZPP_Compound.ts
  ZPP_Compound_TS._nape = nape;
  ZPP_Compound_TS._zpp = zpp_nape;
  ZPP_Compound_TS._init();
  zpp_nape.phys.ZPP_Compound = $hxClasses["zpp_nape.phys.ZPP_Compound"] = ZPP_Compound_TS;
  zpp_nape.phys.ZPP_Compound.prototype.__class__ = zpp_nape.phys.ZPP_Compound;
  // ZPP_FluidProperties: converted to TypeScript → src/native/phys/ZPP_FluidProperties.ts
  ZPP_FluidProperties_TS._nape = nape;
  ZPP_FluidProperties_TS._zpp = zpp_nape;
  zpp_nape.phys.ZPP_FluidProperties = $hxClasses["zpp_nape.phys.ZPP_FluidProperties"] = ZPP_FluidProperties_TS;
  zpp_nape.phys.ZPP_FluidProperties.prototype.__class__ = zpp_nape.phys.ZPP_FluidProperties;
  // ZPP_Material: converted to TypeScript → src/native/phys/ZPP_Material.ts
  ZPP_Material_TS._nape = nape;
  ZPP_Material_TS._zpp = zpp_nape;
  zpp_nape.phys.ZPP_Material = $hxClasses["zpp_nape.phys.ZPP_Material"] = ZPP_Material_TS;
  zpp_nape.phys.ZPP_Material.prototype.__class__ = zpp_nape.phys.ZPP_Material;
  if (!zpp_nape.shape) zpp_nape.shape = {};
  // ZPP_Shape: converted to TypeScript → src/native/shape/ZPP_Shape.ts
  ZPP_Shape_TS._nape = nape;
  ZPP_Shape_TS._zpp = zpp_nape;
  ZPP_Shape_TS._init();
  zpp_nape.shape.ZPP_Shape = $hxClasses["zpp_nape.shape.ZPP_Shape"] = ZPP_Shape_TS;
  zpp_nape.shape.ZPP_Shape.prototype.__class__ = zpp_nape.shape.ZPP_Shape;
  // ZPP_Circle: converted to TypeScript → src/native/shape/ZPP_Circle.ts
  ZPP_Circle_TS._nape = nape;
  ZPP_Circle_TS._zpp = zpp_nape;
  ZPP_Circle_TS._init();
  zpp_nape.shape.ZPP_Circle = $hxClasses["zpp_nape.shape.ZPP_Circle"] = ZPP_Circle_TS;
  zpp_nape.shape.ZPP_Circle.prototype.__class__ = zpp_nape.shape.ZPP_Circle;
  // ZPP_Edge: converted to TypeScript → src/native/shape/ZPP_Edge.ts
  ZPP_Edge_TS._nape = nape;
  ZPP_Edge_TS._zpp = zpp_nape;
  zpp_nape.shape.ZPP_Edge = $hxClasses["zpp_nape.shape.ZPP_Edge"] = ZPP_Edge_TS;
  zpp_nape.shape.ZPP_Edge.prototype.__class__ = zpp_nape.shape.ZPP_Edge;
  // ZPP_Polygon: converted to TypeScript → src/native/shape/ZPP_Polygon.ts
  ZPP_Polygon_TS._nape = nape;
  ZPP_Polygon_TS._zpp = zpp_nape;
  ZPP_Polygon_TS._init();
  zpp_nape.shape.ZPP_Polygon = $hxClasses["zpp_nape.shape.ZPP_Polygon"] = ZPP_Polygon_TS;
  zpp_nape.shape.ZPP_Polygon.prototype.__class__ = zpp_nape.shape.ZPP_Polygon;
  if (!zpp_nape.space) zpp_nape.space = {};
  // ZPP_Broadphase: converted to TypeScript → src/native/space/ZPP_Broadphase.ts
  ZPP_Broadphase_TS._zpp = zpp_nape;
  ZPP_Broadphase_TS._nape = nape;
  zpp_nape.space.ZPP_Broadphase = $hxClasses["zpp_nape.space.ZPP_Broadphase"] = ZPP_Broadphase_TS;
  zpp_nape.space.ZPP_Broadphase.prototype.__class__ = zpp_nape.space.ZPP_Broadphase;
  // ZPP_AABBNode: converted to TypeScript → src/native/space/ZPP_AABBNode.ts
  zpp_nape.space.ZPP_AABBNode = $hxClasses["zpp_nape.space.ZPP_AABBNode"] = ZPP_AABBNode_TS;
  zpp_nape.space.ZPP_AABBNode.prototype.__class__ = zpp_nape.space.ZPP_AABBNode;
  // ZPP_AABBPair: converted to TypeScript → src/native/space/ZPP_AABBPair.ts
  zpp_nape.space.ZPP_AABBPair = $hxClasses["zpp_nape.space.ZPP_AABBPair"] = ZPP_AABBPair_TS;
  zpp_nape.space.ZPP_AABBPair.prototype.__class__ = zpp_nape.space.ZPP_AABBPair;
  // ZPP_AABBTree: converted to TypeScript → src/native/space/ZPP_AABBTree.ts
  zpp_nape.space.ZPP_AABBTree = $hxClasses["zpp_nape.space.ZPP_AABBTree"] = ZPP_AABBTree_TS;
  zpp_nape.space.ZPP_AABBTree.prototype.__class__ = zpp_nape.space.ZPP_AABBTree;
  // ZPP_DynAABBPhase: converted to TypeScript → src/native/space/ZPP_DynAABBPhase.ts
  ZPP_DynAABBPhase_TS._zpp = zpp_nape;
  ZPP_DynAABBPhase_TS._nape = nape;
  ZPP_DynAABBPhase_TS._init();
  zpp_nape.space.ZPP_DynAABBPhase = $hxClasses["zpp_nape.space.ZPP_DynAABBPhase"] = ZPP_DynAABBPhase_TS;
  zpp_nape.space.ZPP_DynAABBPhase.prototype.__class__ = zpp_nape.space.ZPP_DynAABBPhase;
  // ZPP_Island: converted to TypeScript → src/native/space/ZPP_Island.ts
  ZPP_Island_TS._zpp = zpp_nape;
  zpp_nape.space.ZPP_Island = $hxClasses["zpp_nape.space.ZPP_Island"] = ZPP_Island_TS;
  zpp_nape.space.ZPP_Island.prototype.__class__ = zpp_nape.space.ZPP_Island;
  // ZPP_Component: converted to TypeScript → src/native/space/ZPP_Component.ts
  zpp_nape.space.ZPP_Component = $hxClasses["zpp_nape.space.ZPP_Component"] = ZPP_Component_TS;
  zpp_nape.space.ZPP_Component.prototype.__class__ = zpp_nape.space.ZPP_Component;
  // ZPP_CallbackSet: converted to TypeScript → src/native/space/ZPP_CallbackSet.ts
  ZPP_CallbackSet_TS._zpp = zpp_nape;
  zpp_nape.space.ZPP_CallbackSet = $hxClasses["zpp_nape.space.ZPP_CallbackSet"] = ZPP_CallbackSet_TS;
  zpp_nape.space.ZPP_CallbackSet.prototype.__class__ = zpp_nape.space.ZPP_CallbackSet;
  // ZPP_CbSetManager: converted to TypeScript → src/native/space/ZPP_CbSetManager.ts
  ZPP_CbSetManager_TS._zpp = zpp_nape;
  zpp_nape.space.ZPP_CbSetManager = $hxClasses["zpp_nape.space.ZPP_CbSetManager"] = ZPP_CbSetManager_TS;
  zpp_nape.space.ZPP_CbSetManager.prototype.__class__ = zpp_nape.space.ZPP_CbSetManager;
  // ZPP_Space: converted to TypeScript → src/native/space/ZPP_Space.ts
  ZPP_Space_TS._zpp = zpp_nape;
  ZPP_Space_TS._nape = nape;
  zpp_nape.space.ZPP_Space = $hxClasses["zpp_nape.space.ZPP_Space"] = ZPP_Space_TS;
  zpp_nape.space.ZPP_Space.prototype.__class__ = zpp_nape.space.ZPP_Space;
  // ZPP_SweepData: converted to TypeScript → src/native/space/ZPP_SweepData.ts
  zpp_nape.space.ZPP_SweepData = $hxClasses["zpp_nape.space.ZPP_SweepData"] = ZPP_SweepData_TS;
  zpp_nape.space.ZPP_SweepData.prototype.__class__ = zpp_nape.space.ZPP_SweepData;
  // ZPP_SweepPhase: converted to TypeScript → src/native/space/ZPP_SweepPhase.ts
  ZPP_SweepPhase_TS._zpp = zpp_nape;
  ZPP_SweepPhase_TS._nape = nape;
  ZPP_SweepPhase_TS._init();
  zpp_nape.space.ZPP_SweepPhase = $hxClasses["zpp_nape.space.ZPP_SweepPhase"] = ZPP_SweepPhase_TS;
  zpp_nape.space.ZPP_SweepPhase.prototype.__class__ = zpp_nape.space.ZPP_SweepPhase;
  zpp_nape.util.ZNPArray2_Float = $hxClasses["zpp_nape.util.ZNPArray2_Float"] =
    function (width, height) {
      this.width = 0;
      this.list = null;
      this.width = width;
      this.list = [];
    };
  zpp_nape.util.ZNPArray2_Float.__name__ = [
    "zpp_nape",
    "util",
    "ZNPArray2_Float",
  ];
  zpp_nape.util.ZNPArray2_Float.prototype.list = null;
  zpp_nape.util.ZNPArray2_Float.prototype.width = null;
  zpp_nape.util.ZNPArray2_Float.prototype.resize = function (
    width,
    height,
    def
  ) {
    this.width = width;
    var _g = 0;
    var _g1 = width * height;
    while (_g < _g1) {
      var i = _g++;
      this.list[i] = def;
    }
  };
  zpp_nape.util.ZNPArray2_Float.prototype.get = function (x, y) {
    return this.list[y * this.width + x];
  };
  zpp_nape.util.ZNPArray2_Float.prototype.set = function (x, y, obj) {
    return (this.list[y * this.width + x] = obj);
  };
  zpp_nape.util.ZNPArray2_Float.prototype.__class__ =
    zpp_nape.util.ZNPArray2_Float;
  zpp_nape.util.ZNPArray2_ZPP_GeomVert = $hxClasses[
    "zpp_nape.util.ZNPArray2_ZPP_GeomVert"
  ] = function (width, height) {
    this.width = 0;
    this.list = null;
    this.width = width;
    this.list = [];
  };
  zpp_nape.util.ZNPArray2_ZPP_GeomVert.__name__ = [
    "zpp_nape",
    "util",
    "ZNPArray2_ZPP_GeomVert",
  ];
  zpp_nape.util.ZNPArray2_ZPP_GeomVert.prototype.list = null;
  zpp_nape.util.ZNPArray2_ZPP_GeomVert.prototype.width = null;
  zpp_nape.util.ZNPArray2_ZPP_GeomVert.prototype.resize = function (
    width,
    height,
    def
  ) {
    this.width = width;
    var _g = 0;
    var _g1 = width * height;
    while (_g < _g1) {
      var i = _g++;
      this.list[i] = def;
    }
  };
  zpp_nape.util.ZNPArray2_ZPP_GeomVert.prototype.get = function (x, y) {
    return this.list[y * this.width + x];
  };
  zpp_nape.util.ZNPArray2_ZPP_GeomVert.prototype.set = function (x, y, obj) {
    return (this.list[y * this.width + x] = obj);
  };
  zpp_nape.util.ZNPArray2_ZPP_GeomVert.prototype.__class__ =
    zpp_nape.util.ZNPArray2_ZPP_GeomVert;
  zpp_nape.util.ZNPArray2_ZPP_MarchPair = $hxClasses[
    "zpp_nape.util.ZNPArray2_ZPP_MarchPair"
  ] = function (width, height) {
    this.width = 0;
    this.list = null;
    this.width = width;
    this.list = [];
  };
  zpp_nape.util.ZNPArray2_ZPP_MarchPair.__name__ = [
    "zpp_nape",
    "util",
    "ZNPArray2_ZPP_MarchPair",
  ];
  zpp_nape.util.ZNPArray2_ZPP_MarchPair.prototype.list = null;
  zpp_nape.util.ZNPArray2_ZPP_MarchPair.prototype.width = null;
  zpp_nape.util.ZNPArray2_ZPP_MarchPair.prototype.resize = function (
    width,
    height,
    def
  ) {
    this.width = width;
    var _g = 0;
    var _g1 = width * height;
    while (_g < _g1) {
      var i = _g++;
      this.list[i] = def;
    }
  };
  zpp_nape.util.ZNPArray2_ZPP_MarchPair.prototype.get = function (x, y) {
    return this.list[y * this.width + x];
  };
  zpp_nape.util.ZNPArray2_ZPP_MarchPair.prototype.set = function (x, y, obj) {
    return (this.list[y * this.width + x] = obj);
  };
  zpp_nape.util.ZNPArray2_ZPP_MarchPair.prototype.__class__ =
    zpp_nape.util.ZNPArray2_ZPP_MarchPair;
  zpp_nape.util.Hashable2_Boolfalse = $hxClasses[
    "zpp_nape.util.Hashable2_Boolfalse"
  ] = function () {
    this.di = 0;
    this.id = 0;
    this.hnext = null;
    this.next = null;
    this.value = false;
  };
  zpp_nape.util.Hashable2_Boolfalse.__name__ = [
    "zpp_nape",
    "util",
    "Hashable2_Boolfalse",
  ];
  zpp_nape.util.Hashable2_Boolfalse.get = function (id, di, val) {
    var ret;
    if (zpp_nape.util.Hashable2_Boolfalse.zpp_pool == null) {
      ret = new zpp_nape.util.Hashable2_Boolfalse();
    } else {
      ret = zpp_nape.util.Hashable2_Boolfalse.zpp_pool;
      zpp_nape.util.Hashable2_Boolfalse.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.id = id;
    ret.di = di;
    var ret1 = ret;
    ret1.value = val;
    return ret1;
  };
  zpp_nape.util.Hashable2_Boolfalse.getpersist = function (id, di) {
    var ret;
    if (zpp_nape.util.Hashable2_Boolfalse.zpp_pool == null) {
      ret = new zpp_nape.util.Hashable2_Boolfalse();
    } else {
      ret = zpp_nape.util.Hashable2_Boolfalse.zpp_pool;
      zpp_nape.util.Hashable2_Boolfalse.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.id = id;
    ret.di = di;
    return ret;
  };
  zpp_nape.util.Hashable2_Boolfalse.ordered_get = function (id, di, val) {
    if (id <= di) {
      var ret;
      if (zpp_nape.util.Hashable2_Boolfalse.zpp_pool == null) {
        ret = new zpp_nape.util.Hashable2_Boolfalse();
      } else {
        ret = zpp_nape.util.Hashable2_Boolfalse.zpp_pool;
        zpp_nape.util.Hashable2_Boolfalse.zpp_pool = ret.next;
        ret.next = null;
      }
      ret.id = id;
      ret.di = di;
      var ret1 = ret;
      ret1.value = val;
      return ret1;
    } else {
      var ret2;
      if (zpp_nape.util.Hashable2_Boolfalse.zpp_pool == null) {
        ret2 = new zpp_nape.util.Hashable2_Boolfalse();
      } else {
        ret2 = zpp_nape.util.Hashable2_Boolfalse.zpp_pool;
        zpp_nape.util.Hashable2_Boolfalse.zpp_pool = ret2.next;
        ret2.next = null;
      }
      ret2.id = di;
      ret2.di = id;
      var ret3 = ret2;
      ret3.value = val;
      return ret3;
    }
  };
  zpp_nape.util.Hashable2_Boolfalse.ordered_get_persist = function (id, di) {
    if (id <= di) {
      var ret;
      if (zpp_nape.util.Hashable2_Boolfalse.zpp_pool == null) {
        ret = new zpp_nape.util.Hashable2_Boolfalse();
      } else {
        ret = zpp_nape.util.Hashable2_Boolfalse.zpp_pool;
        zpp_nape.util.Hashable2_Boolfalse.zpp_pool = ret.next;
        ret.next = null;
      }
      ret.id = id;
      ret.di = di;
      return ret;
    } else {
      var ret1;
      if (zpp_nape.util.Hashable2_Boolfalse.zpp_pool == null) {
        ret1 = new zpp_nape.util.Hashable2_Boolfalse();
      } else {
        ret1 = zpp_nape.util.Hashable2_Boolfalse.zpp_pool;
        zpp_nape.util.Hashable2_Boolfalse.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.id = di;
      ret1.di = id;
      return ret1;
    }
  };
  zpp_nape.util.Hashable2_Boolfalse.prototype.value = null;
  zpp_nape.util.Hashable2_Boolfalse.prototype.next = null;
  zpp_nape.util.Hashable2_Boolfalse.prototype.hnext = null;
  zpp_nape.util.Hashable2_Boolfalse.prototype.id = null;
  zpp_nape.util.Hashable2_Boolfalse.prototype.di = null;
  zpp_nape.util.Hashable2_Boolfalse.prototype.free = function () {};
  zpp_nape.util.Hashable2_Boolfalse.prototype.alloc = function () {};
  zpp_nape.util.Hashable2_Boolfalse.prototype.__class__ =
    zpp_nape.util.Hashable2_Boolfalse;
  zpp_nape.util.FastHash2_Hashable2_Boolfalse = $hxClasses[
    "zpp_nape.util.FastHash2_Hashable2_Boolfalse"
  ] = function () {
    this.cnt = 0;
    this.table = null;
    this.cnt = 0;
    this.table = [];
    var _g = 0;
    var _g1 = 1048576;
    while (_g < _g1) {
      var i = _g++;
      this.table.push(null);
    }
  };
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.__name__ = [
    "zpp_nape",
    "util",
    "FastHash2_Hashable2_Boolfalse",
  ];
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.table = null;
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.cnt = null;
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.empty = function () {
    return this.cnt == 0;
  };
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.clear = function () {
    var _g = 0;
    var _g1 = this.table.length;
    while (_g < _g1) {
      var i = _g++;
      var n = this.table[i];
      if (n == null) {
        continue;
      }
      while (n != null) {
        var t = n.hnext;
        n.hnext = null;
        n = t;
      }
      this.table[i] = null;
    }
  };
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.get = function (
    id,
    di
  ) {
    var n = this.table[(id * 106039 + di) & 1048575];
    if (n == null) {
      return null;
    } else if (n.id == id && n.di == di) {
      return n;
    } else {
      while (true) {
        n = n.hnext;
        if (!(n != null && (n.id != id || n.di != di))) {
          break;
        }
      }
      return n;
    }
  };
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.ordered_get = function (
    id,
    di
  ) {
    if (id > di) {
      var t = id;
      id = di;
      di = t;
    }
    var n = this.table[(id * 106039 + di) & 1048575];
    if (n == null) {
      return null;
    } else if (n.id == id && n.di == di) {
      return n;
    } else {
      while (true) {
        n = n.hnext;
        if (!(n != null && (n.id != id || n.di != di))) {
          break;
        }
      }
      return n;
    }
  };
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.has = function (
    id,
    di
  ) {
    var n = this.table[(id * 106039 + di) & 1048575];
    if (n == null) {
      return false;
    } else if (n.id == id && n.di == di) {
      return true;
    } else {
      while (true) {
        n = n.hnext;
        if (!(n != null && (n.id != id || n.di != di))) {
          break;
        }
      }
      return n != null;
    }
  };
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.maybeAdd = function (
    arb
  ) {
    var h = (arb.id * 106039 + arb.di) & 1048575;
    var n = this.table[h];
    var cont = true;
    if (n == null) {
      this.table[h] = arb;
      arb.hnext = null;
    } else if (cont) {
      arb.hnext = n.hnext;
      n.hnext = arb;
    }
    if (cont) {
      this.cnt++;
    }
  };
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.add = function (arb) {
    var h = (arb.id * 106039 + arb.di) & 1048575;
    var n = this.table[h];
    if (n == null) {
      this.table[h] = arb;
      arb.hnext = null;
    } else {
      arb.hnext = n.hnext;
      n.hnext = arb;
    }
    this.cnt++;
  };
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.remove = function (
    arb
  ) {
    var h = (arb.id * 106039 + arb.di) & 1048575;
    var n = this.table[h];
    if (n == arb) {
      this.table[h] = n.hnext;
    } else if (n != null) {
      var pre;
      while (true) {
        pre = n;
        n = n.hnext;
        if (!(n != null && n != arb)) {
          break;
        }
      }
      pre.hnext = n.hnext;
    }
    arb.hnext = null;
    this.cnt--;
  };
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.hash = function (
    id,
    di
  ) {
    return (id * 106039 + di) & 1048575;
  };
  zpp_nape.util.FastHash2_Hashable2_Boolfalse.prototype.__class__ =
    zpp_nape.util.FastHash2_Hashable2_Boolfalse;
  // zpp_nape.util.ZNPList_ZPP_CallbackSet: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_Shape: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_Body: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_Compound: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_Arbiter: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_CbSetPair: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_CutInt: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_CutVert: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_PartitionVertex: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_SimplifyP: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_PartitionedPoly: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_GeomVert: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_SimpleVert: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_SimpleEvent: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_AABBPair: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_Edge: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_AABBNode: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_Component: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_FluidArbiter: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_SensorArbiter: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_Listener: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_ColArbiter: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_InteractionGroup: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_ToiEvent: generated by factory above
  // zpp_nape.util.ZNPList_ConvexResult: generated by factory above
  // zpp_nape.util.ZNPList_ZPP_GeomPoly: generated by factory above
  // zpp_nape.util.ZNPList_RayResult: generated by factory above
  // zpp_nape.util.ZNPNode_ZPP_CbType: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_CbType;
  // zpp_nape.util.ZNPNode_ZPP_CallbackSet: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_CallbackSet;
  // zpp_nape.util.ZNPNode_ZPP_Shape: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_Shape;
  // zpp_nape.util.ZNPNode_ZPP_Body: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_Body;
  // zpp_nape.util.ZNPNode_ZPP_Constraint: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_Constraint;
  // zpp_nape.util.ZNPNode_ZPP_Compound: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_Compound;
  // zpp_nape.util.ZNPNode_ZPP_Arbiter: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_Arbiter;
  // zpp_nape.util.ZNPNode_ZPP_InteractionListener: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_InteractionListener;
  // zpp_nape.util.ZNPNode_ZPP_CbSet: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_CbSet;
  // zpp_nape.util.ZNPNode_ZPP_Interactor: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_Interactor;
  // zpp_nape.util.ZNPNode_ZPP_BodyListener: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_BodyListener;
  // zpp_nape.util.ZNPNode_ZPP_CbSetPair: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_CbSetPair;
  // zpp_nape.util.ZNPNode_ZPP_ConstraintListener: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_ConstraintListener;
  // zpp_nape.util.ZNPNode_ZPP_CutInt: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_CutInt;
  // zpp_nape.util.ZNPNode_ZPP_CutVert: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_CutVert;
  // zpp_nape.util.ZNPNode_ZPP_PartitionVertex: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_PartitionVertex;
  // zpp_nape.util.ZNPNode_ZPP_SimplifyP: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_SimplifyP;
  // zpp_nape.util.ZNPNode_ZPP_PartitionedPoly: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_PartitionedPoly;
  // zpp_nape.util.ZNPNode_ZPP_GeomVert: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_GeomVert;
  // zpp_nape.util.ZNPNode_ZPP_SimpleVert: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_SimpleVert;
  // zpp_nape.util.ZNPNode_ZPP_SimpleEvent: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_SimpleEvent;
  // zpp_nape.util.ZNPNode_ZPP_Vec2: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_Vec2;
  // zpp_nape.util.ZNPNode_ZPP_AABBPair: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_AABBPair;
  // zpp_nape.util.ZNPNode_ZPP_Edge: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_Edge;
  // zpp_nape.util.ZNPNode_ZPP_AABBNode: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_AABBNode;
  // zpp_nape.util.ZNPNode_ZPP_Component: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_Component;
  // zpp_nape.util.ZNPNode_ZPP_FluidArbiter: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_FluidArbiter;
  // zpp_nape.util.ZNPNode_ZPP_SensorArbiter: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_SensorArbiter;
  // zpp_nape.util.ZNPNode_ZPP_Listener: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_Listener;
  // zpp_nape.util.ZNPNode_ZPP_ColArbiter: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_ColArbiter;
  // zpp_nape.util.ZNPNode_ZPP_InteractionGroup: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_InteractionGroup;
  // zpp_nape.util.ZNPNode_ZPP_ToiEvent: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_ToiEvent;
  // zpp_nape.util.ZNPNode_ConvexResult: generated by factory above
    zpp_nape.util.ZNPNode_ConvexResult;
  // zpp_nape.util.ZNPNode_ZPP_GeomPoly: generated by factory above
    zpp_nape.util.ZNPNode_ZPP_GeomPoly;
  // zpp_nape.util.ZNPNode_RayResult: generated by factory above
    zpp_nape.util.ZNPNode_RayResult;
  zpp_nape.util.ZPP_MixVec2List = $hxClasses["zpp_nape.util.ZPP_MixVec2List"] =
    function () {
      this.at_index = 0;
      this.at_ite = null;
      this.zip_length = false;
      this._length = 0;
      this.inner = null;
      nape.geom.Vec2List.call(this);
      this.at_ite = null;
      this.at_index = 0;
      this.zip_length = true;
      this._length = 0;
    };
  zpp_nape.util.ZPP_MixVec2List.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_MixVec2List",
  ];
  zpp_nape.util.ZPP_MixVec2List.__super__ = nape.geom.Vec2List;
  for (var k in nape.geom.Vec2List.prototype)
    zpp_nape.util.ZPP_MixVec2List.prototype[k] =
      nape.geom.Vec2List.prototype[k];
  zpp_nape.util.ZPP_MixVec2List.get = function (list, immutable) {
    if (immutable == null) {
      immutable = false;
    }
    var ret = new zpp_nape.util.ZPP_MixVec2List();
    ret.inner = list;
    ret.zpp_inner.immutable = immutable;
    return ret;
  };
  zpp_nape.util.ZPP_MixVec2List.prototype.inner = null;
  zpp_nape.util.ZPP_MixVec2List.prototype._length = null;
  zpp_nape.util.ZPP_MixVec2List.prototype.zip_length = null;
  zpp_nape.util.ZPP_MixVec2List.prototype.at_ite = null;
  zpp_nape.util.ZPP_MixVec2List.prototype.at_index = null;
  zpp_nape.util.ZPP_MixVec2List.prototype.zpp_gl = function () {
    this.zpp_vm();
    if (this.zip_length) {
      this._length = 0;
      var cx_ite = this.inner.next;
      while (cx_ite != null) {
        var i = cx_ite;
        this._length++;
        cx_ite = cx_ite.next;
      }
      this.zip_length = false;
    }
    return this._length;
  };
  zpp_nape.util.ZPP_MixVec2List.prototype.zpp_vm = function () {
    this.zpp_inner.validate();
    if (this.inner.modified) {
      this.zip_length = true;
      this._length = 0;
      this.at_ite = null;
    }
  };
  zpp_nape.util.ZPP_MixVec2List.prototype.at = function (index) {
    this.zpp_vm();
    if (index < 0 || index >= this.zpp_gl()) {
      throw new js._Boot.HaxeError("Error: Index out of bounds");
    }
    if (this.zpp_inner.reverse_flag) {
      index = this.zpp_gl() - 1 - index;
    }
    if (index < this.at_index || this.at_ite == null) {
      this.at_index = 0;
      this.at_ite = this.inner.next;
      while (true) {
        var x = this.at_ite;
        break;
      }
    }
    while (this.at_index != index) {
      this.at_index++;
      this.at_ite = this.at_ite.next;
      while (true) {
        var x1 = this.at_ite;
        break;
      }
    }
    var _this = this.at_ite;
    if (_this.outer == null) {
      _this.outer = new nape.geom.Vec2();
      var o = _this.outer.zpp_inner;
      if (o.outer != null) {
        o.outer.zpp_inner = null;
        o.outer = null;
      }
      o._isimmutable = null;
      o._validate = null;
      o._invalidate = null;
      o.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o;
      _this.outer.zpp_inner = _this;
    }
    return _this.outer;
  };
  zpp_nape.util.ZPP_MixVec2List.prototype.push = function (obj) {
    if (this.zpp_inner.immutable) {
      throw new js._Boot.HaxeError("Error: " + "Vec2" + "List is immutable");
    }
    this.zpp_inner.modify_test();
    this.zpp_vm();
    if (obj.zpp_inner._inuse) {
      throw new js._Boot.HaxeError("Error: " + "Vec2" + " is already in use");
    }
    var cont = this.zpp_inner.adder != null ? this.zpp_inner.adder(obj) : true;
    if (cont) {
      if (this.zpp_inner.reverse_flag) {
        this.inner.add(obj.zpp_inner);
      } else {
        var ite = this.inner.iterator_at(this.zpp_gl() - 1);
        this.inner.insert(ite, obj.zpp_inner);
      }
      this.zpp_inner.invalidate();
      if (this.zpp_inner.post_adder != null) {
        this.zpp_inner.post_adder(obj);
      }
    }
    return cont;
  };
  zpp_nape.util.ZPP_MixVec2List.prototype.unshift = function (obj) {
    if (this.zpp_inner.immutable) {
      throw new js._Boot.HaxeError("Error: " + "Vec2" + "List is immutable");
    }
    this.zpp_inner.modify_test();
    this.zpp_vm();
    if (obj.zpp_inner._inuse) {
      throw new js._Boot.HaxeError("Error: " + "Vec2" + " is already in use");
    }
    var cont = this.zpp_inner.adder != null ? this.zpp_inner.adder(obj) : true;
    if (cont) {
      if (this.zpp_inner.reverse_flag) {
        var ite = this.inner.iterator_at(this.zpp_gl() - 1);
        this.inner.insert(ite, obj.zpp_inner);
      } else {
        this.inner.add(obj.zpp_inner);
      }
      this.zpp_inner.invalidate();
      if (this.zpp_inner.post_adder != null) {
        this.zpp_inner.post_adder(obj);
      }
    }
    return cont;
  };
  zpp_nape.util.ZPP_MixVec2List.prototype.pop = function () {
    if (this.zpp_inner.immutable) {
      throw new js._Boot.HaxeError("Error: " + "Vec2" + "List is immutable");
    }
    this.zpp_inner.modify_test();
    if (this.empty()) {
      throw new js._Boot.HaxeError("Error: Cannot remove from empty list");
    }
    this.zpp_vm();
    var ret = null;
    if (this.zpp_inner.reverse_flag) {
      ret = this.inner.next;
      if (ret.outer == null) {
        ret.outer = new nape.geom.Vec2();
        var o = ret.outer.zpp_inner;
        if (o.outer != null) {
          o.outer.zpp_inner = null;
          o.outer = null;
        }
        o._isimmutable = null;
        o._validate = null;
        o._invalidate = null;
        o.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o;
        ret.outer.zpp_inner = ret;
      }
      var retx = ret.outer;
      if (this.zpp_inner.subber != null) {
        this.zpp_inner.subber(retx);
      }
      if (!this.zpp_inner.dontremove) {
        this.inner.pop();
      }
    } else {
      if (this.at_ite != null && this.at_ite.next == null) {
        this.at_ite = null;
      }
      var ite =
        this.zpp_gl() == 1 ? null : this.inner.iterator_at(this.zpp_gl() - 2);
      ret = ite == null ? this.inner.next : ite.next;
      if (ret.outer == null) {
        ret.outer = new nape.geom.Vec2();
        var o1 = ret.outer.zpp_inner;
        if (o1.outer != null) {
          o1.outer.zpp_inner = null;
          o1.outer = null;
        }
        o1._isimmutable = null;
        o1._validate = null;
        o1._invalidate = null;
        o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
        ret.outer.zpp_inner = ret;
      }
      var retx1 = ret.outer;
      if (this.zpp_inner.subber != null) {
        this.zpp_inner.subber(retx1);
      }
      if (!this.zpp_inner.dontremove) {
        this.inner.erase(ite);
      }
    }
    this.zpp_inner.invalidate();
    if (ret.outer == null) {
      ret.outer = new nape.geom.Vec2();
      var o2 = ret.outer.zpp_inner;
      if (o2.outer != null) {
        o2.outer.zpp_inner = null;
        o2.outer = null;
      }
      o2._isimmutable = null;
      o2._validate = null;
      o2._invalidate = null;
      o2.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o2;
      ret.outer.zpp_inner = ret;
    }
    var retx2 = ret.outer;
    return retx2;
  };
  zpp_nape.util.ZPP_MixVec2List.prototype.shift = function () {
    if (this.zpp_inner.immutable) {
      throw new js._Boot.HaxeError("Error: " + "Vec2" + "List is immutable");
    }
    this.zpp_inner.modify_test();
    if (this.empty()) {
      throw new js._Boot.HaxeError("Error: Cannot remove from empty list");
    }
    this.zpp_vm();
    var ret = null;
    if (this.zpp_inner.reverse_flag) {
      if (this.at_ite != null && this.at_ite.next == null) {
        this.at_ite = null;
      }
      var ite =
        this.zpp_gl() == 1 ? null : this.inner.iterator_at(this.zpp_gl() - 2);
      ret = ite == null ? this.inner.next : ite.next;
      if (ret.outer == null) {
        ret.outer = new nape.geom.Vec2();
        var o = ret.outer.zpp_inner;
        if (o.outer != null) {
          o.outer.zpp_inner = null;
          o.outer = null;
        }
        o._isimmutable = null;
        o._validate = null;
        o._invalidate = null;
        o.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o;
        ret.outer.zpp_inner = ret;
      }
      var retx = ret.outer;
      if (this.zpp_inner.subber != null) {
        this.zpp_inner.subber(retx);
      }
      if (!this.zpp_inner.dontremove) {
        this.inner.erase(ite);
      }
    } else {
      ret = this.inner.next;
      if (ret.outer == null) {
        ret.outer = new nape.geom.Vec2();
        var o1 = ret.outer.zpp_inner;
        if (o1.outer != null) {
          o1.outer.zpp_inner = null;
          o1.outer = null;
        }
        o1._isimmutable = null;
        o1._validate = null;
        o1._invalidate = null;
        o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
        ret.outer.zpp_inner = ret;
      }
      var retx1 = ret.outer;
      if (this.zpp_inner.subber != null) {
        this.zpp_inner.subber(retx1);
      }
      if (!this.zpp_inner.dontremove) {
        this.inner.pop();
      }
    }
    this.zpp_inner.invalidate();
    if (ret.outer == null) {
      ret.outer = new nape.geom.Vec2();
      var o2 = ret.outer.zpp_inner;
      if (o2.outer != null) {
        o2.outer.zpp_inner = null;
        o2.outer = null;
      }
      o2._isimmutable = null;
      o2._validate = null;
      o2._invalidate = null;
      o2.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o2;
      ret.outer.zpp_inner = ret;
    }
    var retx2 = ret.outer;
    return retx2;
  };
  zpp_nape.util.ZPP_MixVec2List.prototype.remove = function (obj) {
    if (this.zpp_inner.immutable) {
      throw new js._Boot.HaxeError("Error: " + "Vec2" + "List is immutable");
    }
    this.zpp_inner.modify_test();
    this.zpp_vm();
    var ret;
    ret = false;
    var cx_ite = this.inner.next;
    while (cx_ite != null) {
      var x = cx_ite;
      if (obj.zpp_inner == x) {
        ret = true;
        break;
      }
      cx_ite = cx_ite.next;
    }
    if (ret) {
      if (this.zpp_inner.subber != null) {
        this.zpp_inner.subber(obj);
      }
      if (!this.zpp_inner.dontremove) {
        this.inner.remove(obj.zpp_inner);
      }
      this.zpp_inner.invalidate();
    }
    return ret;
  };
  zpp_nape.util.ZPP_MixVec2List.prototype.clear = function () {
    if (this.zpp_inner.immutable) {
      throw new js._Boot.HaxeError("Error: " + "Vec2" + "List is immutable");
    }
    if (this.zpp_inner.reverse_flag) {
      while (!this.empty()) this.pop();
    } else {
      while (!this.empty()) this.shift();
    }
  };
  zpp_nape.util.ZPP_MixVec2List.prototype.__class__ =
    zpp_nape.util.ZPP_MixVec2List;
  zpp_nape.util.ZPP_ConstraintList = $hxClasses[
    "zpp_nape.util.ZPP_ConstraintList"
  ] = function () {
    this.user_length = 0;
    this.zip_length = false;
    this.push_ite = null;
    this.at_ite = null;
    this.at_index = 0;
    this.reverse_flag = false;
    this.dontremove = false;
    this.subber = null;
    this.post_adder = null;
    this.adder = null;
    this._modifiable = null;
    this._validate = null;
    this._invalidate = null;
    this._invalidated = false;
    this.immutable = false;
    this.inner = null;
    this.outer = null;
    this.inner = new zpp_nape.util.ZNPList_ZPP_Constraint();
    this._invalidated = true;
  };
  zpp_nape.util.ZPP_ConstraintList.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_ConstraintList",
  ];
  zpp_nape.util.ZPP_ConstraintList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.constraint.ConstraintList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_ConstraintList.prototype.outer = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.inner = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.immutable = null;
  zpp_nape.util.ZPP_ConstraintList.prototype._invalidated = null;
  zpp_nape.util.ZPP_ConstraintList.prototype._invalidate = null;
  zpp_nape.util.ZPP_ConstraintList.prototype._validate = null;
  zpp_nape.util.ZPP_ConstraintList.prototype._modifiable = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.adder = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.post_adder = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.subber = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.dontremove = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_ConstraintList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_ConstraintList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_ConstraintList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_ConstraintList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_ConstraintList.prototype.at_index = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.at_ite = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.push_ite = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.zip_length = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.user_length = null;
  zpp_nape.util.ZPP_ConstraintList.prototype.__class__ =
    zpp_nape.util.ZPP_ConstraintList;
  zpp_nape.util.ZPP_BodyList = $hxClasses["zpp_nape.util.ZPP_BodyList"] =
    function () {
      this.user_length = 0;
      this.zip_length = false;
      this.push_ite = null;
      this.at_ite = null;
      this.at_index = 0;
      this.reverse_flag = false;
      this.dontremove = false;
      this.subber = null;
      this.post_adder = null;
      this.adder = null;
      this._modifiable = null;
      this._validate = null;
      this._invalidate = null;
      this._invalidated = false;
      this.immutable = false;
      this.inner = null;
      this.outer = null;
      this.inner = new zpp_nape.util.ZNPList_ZPP_Body();
      this._invalidated = true;
    };
  zpp_nape.util.ZPP_BodyList.__name__ = ["zpp_nape", "util", "ZPP_BodyList"];
  zpp_nape.util.ZPP_BodyList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.phys.BodyList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_BodyList.prototype.outer = null;
  zpp_nape.util.ZPP_BodyList.prototype.inner = null;
  zpp_nape.util.ZPP_BodyList.prototype.immutable = null;
  zpp_nape.util.ZPP_BodyList.prototype._invalidated = null;
  zpp_nape.util.ZPP_BodyList.prototype._invalidate = null;
  zpp_nape.util.ZPP_BodyList.prototype._validate = null;
  zpp_nape.util.ZPP_BodyList.prototype._modifiable = null;
  zpp_nape.util.ZPP_BodyList.prototype.adder = null;
  zpp_nape.util.ZPP_BodyList.prototype.post_adder = null;
  zpp_nape.util.ZPP_BodyList.prototype.subber = null;
  zpp_nape.util.ZPP_BodyList.prototype.dontremove = null;
  zpp_nape.util.ZPP_BodyList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_BodyList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_BodyList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_BodyList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_BodyList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_BodyList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_BodyList.prototype.at_index = null;
  zpp_nape.util.ZPP_BodyList.prototype.at_ite = null;
  zpp_nape.util.ZPP_BodyList.prototype.push_ite = null;
  zpp_nape.util.ZPP_BodyList.prototype.zip_length = null;
  zpp_nape.util.ZPP_BodyList.prototype.user_length = null;
  zpp_nape.util.ZPP_BodyList.prototype.__class__ = zpp_nape.util.ZPP_BodyList;
  zpp_nape.util.ZPP_InteractorList = $hxClasses[
    "zpp_nape.util.ZPP_InteractorList"
  ] = function () {
    this.user_length = 0;
    this.zip_length = false;
    this.push_ite = null;
    this.at_ite = null;
    this.at_index = 0;
    this.reverse_flag = false;
    this.dontremove = false;
    this.subber = null;
    this.post_adder = null;
    this.adder = null;
    this._modifiable = null;
    this._validate = null;
    this._invalidate = null;
    this._invalidated = false;
    this.immutable = false;
    this.inner = null;
    this.outer = null;
    this.inner = new zpp_nape.util.ZNPList_ZPP_Interactor();
    this._invalidated = true;
  };
  zpp_nape.util.ZPP_InteractorList.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_InteractorList",
  ];
  zpp_nape.util.ZPP_InteractorList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.phys.InteractorList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_InteractorList.prototype.outer = null;
  zpp_nape.util.ZPP_InteractorList.prototype.inner = null;
  zpp_nape.util.ZPP_InteractorList.prototype.immutable = null;
  zpp_nape.util.ZPP_InteractorList.prototype._invalidated = null;
  zpp_nape.util.ZPP_InteractorList.prototype._invalidate = null;
  zpp_nape.util.ZPP_InteractorList.prototype._validate = null;
  zpp_nape.util.ZPP_InteractorList.prototype._modifiable = null;
  zpp_nape.util.ZPP_InteractorList.prototype.adder = null;
  zpp_nape.util.ZPP_InteractorList.prototype.post_adder = null;
  zpp_nape.util.ZPP_InteractorList.prototype.subber = null;
  zpp_nape.util.ZPP_InteractorList.prototype.dontremove = null;
  zpp_nape.util.ZPP_InteractorList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_InteractorList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_InteractorList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_InteractorList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_InteractorList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_InteractorList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_InteractorList.prototype.at_index = null;
  zpp_nape.util.ZPP_InteractorList.prototype.at_ite = null;
  zpp_nape.util.ZPP_InteractorList.prototype.push_ite = null;
  zpp_nape.util.ZPP_InteractorList.prototype.zip_length = null;
  zpp_nape.util.ZPP_InteractorList.prototype.user_length = null;
  zpp_nape.util.ZPP_InteractorList.prototype.__class__ =
    zpp_nape.util.ZPP_InteractorList;
  zpp_nape.util.ZPP_CompoundList = $hxClasses[
    "zpp_nape.util.ZPP_CompoundList"
  ] = function () {
    this.user_length = 0;
    this.zip_length = false;
    this.push_ite = null;
    this.at_ite = null;
    this.at_index = 0;
    this.reverse_flag = false;
    this.dontremove = false;
    this.subber = null;
    this.post_adder = null;
    this.adder = null;
    this._modifiable = null;
    this._validate = null;
    this._invalidate = null;
    this._invalidated = false;
    this.immutable = false;
    this.inner = null;
    this.outer = null;
    this.inner = new zpp_nape.util.ZNPList_ZPP_Compound();
    this._invalidated = true;
  };
  zpp_nape.util.ZPP_CompoundList.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_CompoundList",
  ];
  zpp_nape.util.ZPP_CompoundList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.phys.CompoundList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_CompoundList.prototype.outer = null;
  zpp_nape.util.ZPP_CompoundList.prototype.inner = null;
  zpp_nape.util.ZPP_CompoundList.prototype.immutable = null;
  zpp_nape.util.ZPP_CompoundList.prototype._invalidated = null;
  zpp_nape.util.ZPP_CompoundList.prototype._invalidate = null;
  zpp_nape.util.ZPP_CompoundList.prototype._validate = null;
  zpp_nape.util.ZPP_CompoundList.prototype._modifiable = null;
  zpp_nape.util.ZPP_CompoundList.prototype.adder = null;
  zpp_nape.util.ZPP_CompoundList.prototype.post_adder = null;
  zpp_nape.util.ZPP_CompoundList.prototype.subber = null;
  zpp_nape.util.ZPP_CompoundList.prototype.dontremove = null;
  zpp_nape.util.ZPP_CompoundList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_CompoundList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_CompoundList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_CompoundList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_CompoundList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_CompoundList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_CompoundList.prototype.at_index = null;
  zpp_nape.util.ZPP_CompoundList.prototype.at_ite = null;
  zpp_nape.util.ZPP_CompoundList.prototype.push_ite = null;
  zpp_nape.util.ZPP_CompoundList.prototype.zip_length = null;
  zpp_nape.util.ZPP_CompoundList.prototype.user_length = null;
  zpp_nape.util.ZPP_CompoundList.prototype.__class__ =
    zpp_nape.util.ZPP_CompoundList;
  zpp_nape.util.ZPP_ListenerList = $hxClasses[
    "zpp_nape.util.ZPP_ListenerList"
  ] = function () {
    this.user_length = 0;
    this.zip_length = false;
    this.push_ite = null;
    this.at_ite = null;
    this.at_index = 0;
    this.reverse_flag = false;
    this.dontremove = false;
    this.subber = null;
    this.post_adder = null;
    this.adder = null;
    this._modifiable = null;
    this._validate = null;
    this._invalidate = null;
    this._invalidated = false;
    this.immutable = false;
    this.inner = null;
    this.outer = null;
    this.inner = new zpp_nape.util.ZNPList_ZPP_Listener();
    this._invalidated = true;
  };
  zpp_nape.util.ZPP_ListenerList.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_ListenerList",
  ];
  zpp_nape.util.ZPP_ListenerList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.callbacks.ListenerList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_ListenerList.prototype.outer = null;
  zpp_nape.util.ZPP_ListenerList.prototype.inner = null;
  zpp_nape.util.ZPP_ListenerList.prototype.immutable = null;
  zpp_nape.util.ZPP_ListenerList.prototype._invalidated = null;
  zpp_nape.util.ZPP_ListenerList.prototype._invalidate = null;
  zpp_nape.util.ZPP_ListenerList.prototype._validate = null;
  zpp_nape.util.ZPP_ListenerList.prototype._modifiable = null;
  zpp_nape.util.ZPP_ListenerList.prototype.adder = null;
  zpp_nape.util.ZPP_ListenerList.prototype.post_adder = null;
  zpp_nape.util.ZPP_ListenerList.prototype.subber = null;
  zpp_nape.util.ZPP_ListenerList.prototype.dontremove = null;
  zpp_nape.util.ZPP_ListenerList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_ListenerList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_ListenerList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_ListenerList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_ListenerList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_ListenerList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_ListenerList.prototype.at_index = null;
  zpp_nape.util.ZPP_ListenerList.prototype.at_ite = null;
  zpp_nape.util.ZPP_ListenerList.prototype.push_ite = null;
  zpp_nape.util.ZPP_ListenerList.prototype.zip_length = null;
  zpp_nape.util.ZPP_ListenerList.prototype.user_length = null;
  zpp_nape.util.ZPP_ListenerList.prototype.__class__ =
    zpp_nape.util.ZPP_ListenerList;
  zpp_nape.util.ZPP_CbTypeList = $hxClasses["zpp_nape.util.ZPP_CbTypeList"] =
    function () {
      this.user_length = 0;
      this.zip_length = false;
      this.push_ite = null;
      this.at_ite = null;
      this.at_index = 0;
      this.reverse_flag = false;
      this.dontremove = false;
      this.subber = null;
      this.post_adder = null;
      this.adder = null;
      this._modifiable = null;
      this._validate = null;
      this._invalidate = null;
      this._invalidated = false;
      this.immutable = false;
      this.inner = null;
      this.outer = null;
      this.inner = new zpp_nape.util.ZNPList_ZPP_CbType();
      this._invalidated = true;
    };
  zpp_nape.util.ZPP_CbTypeList.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_CbTypeList",
  ];
  zpp_nape.util.ZPP_CbTypeList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.callbacks.CbTypeList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_CbTypeList.prototype.outer = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.inner = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.immutable = null;
  zpp_nape.util.ZPP_CbTypeList.prototype._invalidated = null;
  zpp_nape.util.ZPP_CbTypeList.prototype._invalidate = null;
  zpp_nape.util.ZPP_CbTypeList.prototype._validate = null;
  zpp_nape.util.ZPP_CbTypeList.prototype._modifiable = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.adder = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.post_adder = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.subber = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.dontremove = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_CbTypeList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_CbTypeList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_CbTypeList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_CbTypeList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_CbTypeList.prototype.at_index = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.at_ite = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.push_ite = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.zip_length = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.user_length = null;
  zpp_nape.util.ZPP_CbTypeList.prototype.__class__ =
    zpp_nape.util.ZPP_CbTypeList;
  // ZPP_Vec2List: converted to TypeScript → src/native/util/ZPP_Vec2List.ts
  // Registration handled by ZPP_Vec2List.ts at module load time.
  zpp_nape.util.ZPP_GeomPolyList = $hxClasses[
    "zpp_nape.util.ZPP_GeomPolyList"
  ] = function () {
    this.user_length = 0;
    this.zip_length = false;
    this.push_ite = null;
    this.at_ite = null;
    this.at_index = 0;
    this.reverse_flag = false;
    this.dontremove = false;
    this.subber = null;
    this.post_adder = null;
    this.adder = null;
    this._modifiable = null;
    this._validate = null;
    this._invalidate = null;
    this._invalidated = false;
    this.immutable = false;
    this.inner = null;
    this.outer = null;
    this.inner = new zpp_nape.util.ZNPList_ZPP_GeomPoly();
    this._invalidated = true;
  };
  zpp_nape.util.ZPP_GeomPolyList.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_GeomPolyList",
  ];
  zpp_nape.util.ZPP_GeomPolyList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.geom.GeomPolyList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_GeomPolyList.prototype.outer = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.inner = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.immutable = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype._invalidated = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype._invalidate = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype._validate = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype._modifiable = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.adder = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.post_adder = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.subber = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.dontremove = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_GeomPolyList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_GeomPolyList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_GeomPolyList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_GeomPolyList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_GeomPolyList.prototype.at_index = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.at_ite = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.push_ite = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.zip_length = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.user_length = null;
  zpp_nape.util.ZPP_GeomPolyList.prototype.__class__ =
    zpp_nape.util.ZPP_GeomPolyList;
  zpp_nape.util.ZPP_RayResultList = $hxClasses[
    "zpp_nape.util.ZPP_RayResultList"
  ] = function () {
    this.user_length = 0;
    this.zip_length = false;
    this.push_ite = null;
    this.at_ite = null;
    this.at_index = 0;
    this.reverse_flag = false;
    this.dontremove = false;
    this.subber = null;
    this.post_adder = null;
    this.adder = null;
    this._modifiable = null;
    this._validate = null;
    this._invalidate = null;
    this._invalidated = false;
    this.immutable = false;
    this.inner = null;
    this.outer = null;
    this.inner = new zpp_nape.util.ZNPList_RayResult();
    this._invalidated = true;
  };
  zpp_nape.util.ZPP_RayResultList.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_RayResultList",
  ];
  zpp_nape.util.ZPP_RayResultList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.geom.RayResultList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_RayResultList.prototype.outer = null;
  zpp_nape.util.ZPP_RayResultList.prototype.inner = null;
  zpp_nape.util.ZPP_RayResultList.prototype.immutable = null;
  zpp_nape.util.ZPP_RayResultList.prototype._invalidated = null;
  zpp_nape.util.ZPP_RayResultList.prototype._invalidate = null;
  zpp_nape.util.ZPP_RayResultList.prototype._validate = null;
  zpp_nape.util.ZPP_RayResultList.prototype._modifiable = null;
  zpp_nape.util.ZPP_RayResultList.prototype.adder = null;
  zpp_nape.util.ZPP_RayResultList.prototype.post_adder = null;
  zpp_nape.util.ZPP_RayResultList.prototype.subber = null;
  zpp_nape.util.ZPP_RayResultList.prototype.dontremove = null;
  zpp_nape.util.ZPP_RayResultList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_RayResultList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_RayResultList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_RayResultList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_RayResultList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_RayResultList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_RayResultList.prototype.at_index = null;
  zpp_nape.util.ZPP_RayResultList.prototype.at_ite = null;
  zpp_nape.util.ZPP_RayResultList.prototype.push_ite = null;
  zpp_nape.util.ZPP_RayResultList.prototype.zip_length = null;
  zpp_nape.util.ZPP_RayResultList.prototype.user_length = null;
  zpp_nape.util.ZPP_RayResultList.prototype.__class__ =
    zpp_nape.util.ZPP_RayResultList;
  zpp_nape.util.ZPP_ConvexResultList = $hxClasses[
    "zpp_nape.util.ZPP_ConvexResultList"
  ] = function () {
    this.user_length = 0;
    this.zip_length = false;
    this.push_ite = null;
    this.at_ite = null;
    this.at_index = 0;
    this.reverse_flag = false;
    this.dontremove = false;
    this.subber = null;
    this.post_adder = null;
    this.adder = null;
    this._modifiable = null;
    this._validate = null;
    this._invalidate = null;
    this._invalidated = false;
    this.immutable = false;
    this.inner = null;
    this.outer = null;
    this.inner = new zpp_nape.util.ZNPList_ConvexResult();
    this._invalidated = true;
  };
  zpp_nape.util.ZPP_ConvexResultList.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_ConvexResultList",
  ];
  zpp_nape.util.ZPP_ConvexResultList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.geom.ConvexResultList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_ConvexResultList.prototype.outer = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.inner = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.immutable = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype._invalidated = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype._invalidate = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype._validate = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype._modifiable = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.adder = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.post_adder = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.subber = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.dontremove = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_ConvexResultList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_ConvexResultList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_ConvexResultList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_ConvexResultList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_ConvexResultList.prototype.at_index = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.at_ite = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.push_ite = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.zip_length = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.user_length = null;
  zpp_nape.util.ZPP_ConvexResultList.prototype.__class__ =
    zpp_nape.util.ZPP_ConvexResultList;
  zpp_nape.util.ZPP_EdgeList = $hxClasses["zpp_nape.util.ZPP_EdgeList"] =
    function () {
      this.user_length = 0;
      this.zip_length = false;
      this.push_ite = null;
      this.at_ite = null;
      this.at_index = 0;
      this.reverse_flag = false;
      this.dontremove = false;
      this.subber = null;
      this.post_adder = null;
      this.adder = null;
      this._modifiable = null;
      this._validate = null;
      this._invalidate = null;
      this._invalidated = false;
      this.immutable = false;
      this.inner = null;
      this.outer = null;
      this.inner = new zpp_nape.util.ZNPList_ZPP_Edge();
      this._invalidated = true;
    };
  zpp_nape.util.ZPP_EdgeList.__name__ = ["zpp_nape", "util", "ZPP_EdgeList"];
  zpp_nape.util.ZPP_EdgeList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.shape.EdgeList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_EdgeList.prototype.outer = null;
  zpp_nape.util.ZPP_EdgeList.prototype.inner = null;
  zpp_nape.util.ZPP_EdgeList.prototype.immutable = null;
  zpp_nape.util.ZPP_EdgeList.prototype._invalidated = null;
  zpp_nape.util.ZPP_EdgeList.prototype._invalidate = null;
  zpp_nape.util.ZPP_EdgeList.prototype._validate = null;
  zpp_nape.util.ZPP_EdgeList.prototype._modifiable = null;
  zpp_nape.util.ZPP_EdgeList.prototype.adder = null;
  zpp_nape.util.ZPP_EdgeList.prototype.post_adder = null;
  zpp_nape.util.ZPP_EdgeList.prototype.subber = null;
  zpp_nape.util.ZPP_EdgeList.prototype.dontremove = null;
  zpp_nape.util.ZPP_EdgeList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_EdgeList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_EdgeList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_EdgeList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_EdgeList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_EdgeList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_EdgeList.prototype.at_index = null;
  zpp_nape.util.ZPP_EdgeList.prototype.at_ite = null;
  zpp_nape.util.ZPP_EdgeList.prototype.push_ite = null;
  zpp_nape.util.ZPP_EdgeList.prototype.zip_length = null;
  zpp_nape.util.ZPP_EdgeList.prototype.user_length = null;
  zpp_nape.util.ZPP_EdgeList.prototype.__class__ = zpp_nape.util.ZPP_EdgeList;
  zpp_nape.util.ZPP_ShapeList = $hxClasses["zpp_nape.util.ZPP_ShapeList"] =
    function () {
      this.user_length = 0;
      this.zip_length = false;
      this.push_ite = null;
      this.at_ite = null;
      this.at_index = 0;
      this.reverse_flag = false;
      this.dontremove = false;
      this.subber = null;
      this.post_adder = null;
      this.adder = null;
      this._modifiable = null;
      this._validate = null;
      this._invalidate = null;
      this._invalidated = false;
      this.immutable = false;
      this.inner = null;
      this.outer = null;
      this.inner = new zpp_nape.util.ZNPList_ZPP_Shape();
      this._invalidated = true;
    };
  zpp_nape.util.ZPP_ShapeList.__name__ = ["zpp_nape", "util", "ZPP_ShapeList"];
  zpp_nape.util.ZPP_ShapeList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.shape.ShapeList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_ShapeList.prototype.outer = null;
  zpp_nape.util.ZPP_ShapeList.prototype.inner = null;
  zpp_nape.util.ZPP_ShapeList.prototype.immutable = null;
  zpp_nape.util.ZPP_ShapeList.prototype._invalidated = null;
  zpp_nape.util.ZPP_ShapeList.prototype._invalidate = null;
  zpp_nape.util.ZPP_ShapeList.prototype._validate = null;
  zpp_nape.util.ZPP_ShapeList.prototype._modifiable = null;
  zpp_nape.util.ZPP_ShapeList.prototype.adder = null;
  zpp_nape.util.ZPP_ShapeList.prototype.post_adder = null;
  zpp_nape.util.ZPP_ShapeList.prototype.subber = null;
  zpp_nape.util.ZPP_ShapeList.prototype.dontremove = null;
  zpp_nape.util.ZPP_ShapeList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_ShapeList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_ShapeList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_ShapeList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_ShapeList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_ShapeList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_ShapeList.prototype.at_index = null;
  zpp_nape.util.ZPP_ShapeList.prototype.at_ite = null;
  zpp_nape.util.ZPP_ShapeList.prototype.push_ite = null;
  zpp_nape.util.ZPP_ShapeList.prototype.zip_length = null;
  zpp_nape.util.ZPP_ShapeList.prototype.user_length = null;
  zpp_nape.util.ZPP_ShapeList.prototype.__class__ = zpp_nape.util.ZPP_ShapeList;
  zpp_nape.util.ZPP_InteractionGroupList = $hxClasses[
    "zpp_nape.util.ZPP_InteractionGroupList"
  ] = function () {
    this.user_length = 0;
    this.zip_length = false;
    this.push_ite = null;
    this.at_ite = null;
    this.at_index = 0;
    this.reverse_flag = false;
    this.dontremove = false;
    this.subber = null;
    this.post_adder = null;
    this.adder = null;
    this._modifiable = null;
    this._validate = null;
    this._invalidate = null;
    this._invalidated = false;
    this.immutable = false;
    this.inner = null;
    this.outer = null;
    this.inner = new zpp_nape.util.ZNPList_ZPP_InteractionGroup();
    this._invalidated = true;
  };
  zpp_nape.util.ZPP_InteractionGroupList.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_InteractionGroupList",
  ];
  zpp_nape.util.ZPP_InteractionGroupList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.dynamics.InteractionGroupList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_InteractionGroupList.prototype.outer = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.inner = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.immutable = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype._invalidated = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype._invalidate = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype._validate = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype._modifiable = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.adder = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.post_adder = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.subber = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.dontremove = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_InteractionGroupList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_InteractionGroupList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_InteractionGroupList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_InteractionGroupList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_InteractionGroupList.prototype.at_index = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.at_ite = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.push_ite = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.zip_length = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.user_length = null;
  zpp_nape.util.ZPP_InteractionGroupList.prototype.__class__ =
    zpp_nape.util.ZPP_InteractionGroupList;
  zpp_nape.util.ZPP_ArbiterList = $hxClasses["zpp_nape.util.ZPP_ArbiterList"] =
    function () {
      this.user_length = 0;
      this.zip_length = false;
      this.push_ite = null;
      this.at_ite = null;
      this.at_index = 0;
      this.reverse_flag = false;
      this.dontremove = false;
      this.subber = null;
      this.post_adder = null;
      this.adder = null;
      this._modifiable = null;
      this._validate = null;
      this._invalidate = null;
      this._invalidated = false;
      this.immutable = false;
      this.inner = null;
      this.outer = null;
      this.inner = new zpp_nape.util.ZNPList_ZPP_Arbiter();
      this._invalidated = true;
    };
  zpp_nape.util.ZPP_ArbiterList.__name__ = [
    "zpp_nape",
    "util",
    "ZPP_ArbiterList",
  ];
  zpp_nape.util.ZPP_ArbiterList.get = function (list, imm) {
    if (imm == null) {
      imm = false;
    }
    var ret = new nape.dynamics.ArbiterList();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  };
  zpp_nape.util.ZPP_ArbiterList.prototype.outer = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.inner = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.immutable = null;
  zpp_nape.util.ZPP_ArbiterList.prototype._invalidated = null;
  zpp_nape.util.ZPP_ArbiterList.prototype._invalidate = null;
  zpp_nape.util.ZPP_ArbiterList.prototype._validate = null;
  zpp_nape.util.ZPP_ArbiterList.prototype._modifiable = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.adder = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.post_adder = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.subber = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.dontremove = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.reverse_flag = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.valmod = function () {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  };
  zpp_nape.util.ZPP_ArbiterList.prototype.modified = function () {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  };
  zpp_nape.util.ZPP_ArbiterList.prototype.modify_test = function () {
    if (this._modifiable != null) {
      this._modifiable();
    }
  };
  zpp_nape.util.ZPP_ArbiterList.prototype.validate = function () {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  };
  zpp_nape.util.ZPP_ArbiterList.prototype.invalidate = function () {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  };
  zpp_nape.util.ZPP_ArbiterList.prototype.at_index = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.at_ite = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.push_ite = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.zip_length = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.user_length = null;
  zpp_nape.util.ZPP_ArbiterList.prototype.__class__ =
    zpp_nape.util.ZPP_ArbiterList;
  // ZPP_ContactList: converted to TypeScript → src/native/util/ZPP_ContactList.ts
  // Registration handled by ZPP_ContactList.ts at module load time.
  // ZPP_Math: converted to TypeScript → src/native/util/ZPP_Math.ts
  zpp_nape.util.ZPP_Math = $hxClasses["zpp_nape.util.ZPP_Math"] = ZPP_Math_TS;
  zpp_nape.util.ZPP_Math.prototype.__class__ = zpp_nape.util.ZPP_Math;
  // ZPP_PubPool: converted to TypeScript → src/native/util/ZPP_PubPool.ts
  zpp_nape.util.ZPP_PubPool = $hxClasses["zpp_nape.util.ZPP_PubPool"] = ZPP_PubPool_TS;
  zpp_nape.util.ZPP_PubPool.prototype.__class__ = zpp_nape.util.ZPP_PubPool;
  // zpp_nape.util.ZPP_Set_ZPP_Body: generated by factory above
  // zpp_nape.util.ZPP_Set_ZPP_CbSetPair: generated by factory above
  // zpp_nape.util.ZPP_Set_ZPP_PartitionVertex: generated by factory above
  // zpp_nape.util.ZPP_Set_ZPP_PartitionPair: generated by factory above
  // zpp_nape.util.ZPP_Set_ZPP_SimpleVert: generated by factory above
  // zpp_nape.util.ZPP_Set_ZPP_SimpleSeg: generated by factory above
  // zpp_nape.util.ZPP_Set_ZPP_SimpleEvent: generated by factory above
  // zpp_nape.util.ZPP_Set_ZPP_CbSet: generated by factory above
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
  // nape.Config constants: converted to TypeScript → src/Config.ts
  // Values are applied to nape.Config by Config.ts at module load time.
  // Iterator zpp_pool statics for converted lists: initialized in src/util/registerLists.ts
  nape.constraint.Constraint.zpp_internalAlloc = false;
  nape.dynamics.ContactIterator.zpp_pool = null;
  nape.geom.Vec2Iterator.zpp_pool = null;
  nape.phys.Interactor.zpp_internalAlloc = false;
  nape.shape.Shape.zpp_internalAlloc = false;
  // ZPP_Const.FMAX: initialized in src/native/util/ZPP_Const.ts
  // ZPP_ID counters: initialized in src/native/util/ZPP_ID.ts
  // ZPP_Callback statics: initialized in src/native/callbacks/ZPP_Callback.ts
  // ZPP_CbSet/ZPP_CbSetPair pools: initialized in native TypeScript
  zpp_nape.callbacks.ZPP_CbType.ANY_SHAPE = new nape.callbacks.CbType();
  zpp_nape.callbacks.ZPP_CbType.ANY_BODY = new nape.callbacks.CbType();
  zpp_nape.callbacks.ZPP_CbType.ANY_COMPOUND = new nape.callbacks.CbType();
  zpp_nape.callbacks.ZPP_CbType.ANY_CONSTRAINT = new nape.callbacks.CbType();
  zpp_nape.util.ZPP_Flags.internal = false;
  zpp_nape.util.ZPP_Flags.id_ImmState_ACCEPT = 1;
  zpp_nape.util.ZPP_Flags.id_ImmState_IGNORE = 2;
  zpp_nape.util.ZPP_Flags.id_ImmState_ALWAYS = 4;
  zpp_nape.util.ZPP_Flags.id_GravMassMode_DEFAULT = 0;
  zpp_nape.util.ZPP_Flags.id_GravMassMode_FIXED = 1;
  zpp_nape.util.ZPP_Flags.id_GravMassMode_SCALED = 2;
  zpp_nape.util.ZPP_Flags.id_InertiaMode_DEFAULT = 0;
  zpp_nape.util.ZPP_Flags.id_InertiaMode_FIXED = 1;
  zpp_nape.util.ZPP_Flags.id_MassMode_DEFAULT = 0;
  zpp_nape.util.ZPP_Flags.id_MassMode_FIXED = 1;
  zpp_nape.util.ZPP_Flags.id_BodyType_STATIC = 1;
  zpp_nape.util.ZPP_Flags.id_BodyType_DYNAMIC = 2;
  zpp_nape.util.ZPP_Flags.id_BodyType_KINEMATIC = 3;
  zpp_nape.util.ZPP_Flags.id_ListenerType_BODY = 0;
  zpp_nape.util.ZPP_Flags.id_PreFlag_ACCEPT = 1;
  zpp_nape.util.ZPP_Flags.id_ListenerType_CONSTRAINT = 1;
  zpp_nape.util.ZPP_Flags.id_PreFlag_IGNORE = 2;
  zpp_nape.util.ZPP_Flags.id_ListenerType_INTERACTION = 2;
  zpp_nape.util.ZPP_Flags.id_PreFlag_ACCEPT_ONCE = 3;
  zpp_nape.util.ZPP_Flags.id_ListenerType_PRE = 3;
  zpp_nape.util.ZPP_Flags.id_PreFlag_IGNORE_ONCE = 4;
  zpp_nape.util.ZPP_Flags.id_CbEvent_BEGIN = 0;
  zpp_nape.util.ZPP_Flags.id_InteractionType_COLLISION = 1;
  zpp_nape.util.ZPP_Flags.id_CbEvent_ONGOING = 6;
  zpp_nape.util.ZPP_Flags.id_InteractionType_SENSOR = 2;
  zpp_nape.util.ZPP_Flags.id_CbEvent_END = 1;
  zpp_nape.util.ZPP_Flags.id_InteractionType_FLUID = 4;
  zpp_nape.util.ZPP_Flags.id_CbEvent_WAKE = 2;
  zpp_nape.util.ZPP_Flags.id_InteractionType_ANY = 7;
  zpp_nape.util.ZPP_Flags.id_CbEvent_SLEEP = 3;
  zpp_nape.util.ZPP_Flags.id_CbEvent_BREAK = 4;
  zpp_nape.util.ZPP_Flags.id_CbEvent_PRE = 5;
  zpp_nape.util.ZPP_Flags.id_Winding_UNDEFINED = 0;
  zpp_nape.util.ZPP_Flags.id_Winding_CLOCKWISE = 1;
  zpp_nape.util.ZPP_Flags.id_Winding_ANTICLOCKWISE = 2;
  zpp_nape.util.ZPP_Flags.id_ValidationResult_VALID = 0;
  zpp_nape.util.ZPP_Flags.id_ValidationResult_DEGENERATE = 1;
  zpp_nape.util.ZPP_Flags.id_ValidationResult_CONCAVE = 2;
  zpp_nape.util.ZPP_Flags.id_ValidationResult_SELF_INTERSECTING = 3;
  zpp_nape.util.ZPP_Flags.id_ShapeType_CIRCLE = 0;
  zpp_nape.util.ZPP_Flags.id_ShapeType_POLYGON = 1;
  zpp_nape.util.ZPP_Flags.id_Broadphase_DYNAMIC_AABB_TREE = 0;
  zpp_nape.util.ZPP_Flags.id_Broadphase_SWEEP_AND_PRUNE = 1;
  zpp_nape.util.ZPP_Flags.id_ArbiterType_COLLISION = 1;
  zpp_nape.util.ZPP_Flags.id_ArbiterType_SENSOR = 2;
  zpp_nape.util.ZPP_Flags.id_ArbiterType_FLUID = 4;
  zpp_nape.callbacks.ZPP_Listener.internal = false;
  zpp_nape.callbacks.ZPP_Listener.types = (function ($this) {
    var $r;
    if (zpp_nape.util.ZPP_Flags.ListenerType_BODY == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.ListenerType_BODY =
        new nape.callbacks.ListenerType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp = zpp_nape.util.ZPP_Flags.ListenerType_BODY;
    if (zpp_nape.util.ZPP_Flags.ListenerType_CONSTRAINT == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.ListenerType_CONSTRAINT =
        new nape.callbacks.ListenerType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp1 = zpp_nape.util.ZPP_Flags.ListenerType_CONSTRAINT;
    if (zpp_nape.util.ZPP_Flags.ListenerType_INTERACTION == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.ListenerType_INTERACTION =
        new nape.callbacks.ListenerType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp2 = zpp_nape.util.ZPP_Flags.ListenerType_INTERACTION;
    if (zpp_nape.util.ZPP_Flags.ListenerType_PRE == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.ListenerType_PRE =
        new nape.callbacks.ListenerType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    $r = [tmp, tmp1, tmp2, zpp_nape.util.ZPP_Flags.ListenerType_PRE];
    return $r;
  })(this);
  zpp_nape.callbacks.ZPP_Listener.events = (function ($this) {
    var $r;
    if (zpp_nape.util.ZPP_Flags.CbEvent_BEGIN == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.CbEvent_BEGIN = new nape.callbacks.CbEvent();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp = zpp_nape.util.ZPP_Flags.CbEvent_BEGIN;
    if (zpp_nape.util.ZPP_Flags.CbEvent_END == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.CbEvent_END = new nape.callbacks.CbEvent();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp1 = zpp_nape.util.ZPP_Flags.CbEvent_END;
    if (zpp_nape.util.ZPP_Flags.CbEvent_WAKE == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.CbEvent_WAKE = new nape.callbacks.CbEvent();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp2 = zpp_nape.util.ZPP_Flags.CbEvent_WAKE;
    if (zpp_nape.util.ZPP_Flags.CbEvent_SLEEP == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.CbEvent_SLEEP = new nape.callbacks.CbEvent();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp3 = zpp_nape.util.ZPP_Flags.CbEvent_SLEEP;
    if (zpp_nape.util.ZPP_Flags.CbEvent_BREAK == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.CbEvent_BREAK = new nape.callbacks.CbEvent();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp4 = zpp_nape.util.ZPP_Flags.CbEvent_BREAK;
    if (zpp_nape.util.ZPP_Flags.CbEvent_PRE == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.CbEvent_PRE = new nape.callbacks.CbEvent();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp5 = zpp_nape.util.ZPP_Flags.CbEvent_PRE;
    if (zpp_nape.util.ZPP_Flags.CbEvent_ONGOING == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.CbEvent_ONGOING = new nape.callbacks.CbEvent();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    $r = [
      tmp,
      tmp1,
      tmp2,
      tmp3,
      tmp4,
      tmp5,
      zpp_nape.util.ZPP_Flags.CbEvent_ONGOING,
    ];
    return $r;
  })(this);
  zpp_nape.callbacks.ZPP_InteractionListener.UCbSet =
    new zpp_nape.util.ZNPList_ZPP_CbSet();
  zpp_nape.callbacks.ZPP_InteractionListener.VCbSet =
    new zpp_nape.util.ZNPList_ZPP_CbSet();
  zpp_nape.callbacks.ZPP_InteractionListener.WCbSet =
    new zpp_nape.util.ZNPList_ZPP_CbSet();
  zpp_nape.callbacks.ZPP_InteractionListener.UCbType =
    new zpp_nape.util.ZNPList_ZPP_CbType();
  zpp_nape.callbacks.ZPP_InteractionListener.VCbType =
    new zpp_nape.util.ZNPList_ZPP_CbType();
  zpp_nape.callbacks.ZPP_InteractionListener.WCbType =
    new zpp_nape.util.ZNPList_ZPP_CbType();
  zpp_nape.dynamics.ZPP_Arbiter.internal = false;
  zpp_nape.dynamics.ZPP_Arbiter.COL = 1;
  zpp_nape.dynamics.ZPP_Arbiter.FLUID = 4;
  zpp_nape.dynamics.ZPP_Arbiter.SENSOR = 2;
  zpp_nape.dynamics.ZPP_Arbiter.types = (function ($this) {
    var $r;
    if (zpp_nape.util.ZPP_Flags.ArbiterType_COLLISION == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.ArbiterType_COLLISION =
        new nape.dynamics.ArbiterType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp = zpp_nape.util.ZPP_Flags.ArbiterType_COLLISION;
    if (zpp_nape.util.ZPP_Flags.ArbiterType_SENSOR == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.ArbiterType_SENSOR =
        new nape.dynamics.ArbiterType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp1 = zpp_nape.util.ZPP_Flags.ArbiterType_SENSOR;
    if (zpp_nape.util.ZPP_Flags.ArbiterType_FLUID == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.ArbiterType_FLUID =
        new nape.dynamics.ArbiterType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    $r = [null, tmp, tmp1, null, zpp_nape.util.ZPP_Flags.ArbiterType_FLUID];
    return $r;
  })(this);
  zpp_nape.dynamics.ZPP_SensorArbiter.zpp_pool = null;
  zpp_nape.dynamics.ZPP_FluidArbiter.zpp_pool = null;
  zpp_nape.dynamics.ZPP_ColArbiter.FACE1 = 0;
  zpp_nape.dynamics.ZPP_ColArbiter.FACE2 = 1;
  zpp_nape.dynamics.ZPP_ColArbiter.CIRCLE = 2;
  zpp_nape.dynamics.ZPP_ColArbiter.zpp_pool = null;
  zpp_nape.dynamics.ZPP_Contact.internal = false;
  zpp_nape.dynamics.ZPP_Contact.zpp_pool = null;
  zpp_nape.dynamics.ZPP_InteractionFilter.zpp_pool = null;
  zpp_nape.dynamics.ZPP_InteractionGroup.SHAPE = 1;
  zpp_nape.dynamics.ZPP_InteractionGroup.BODY = 2;
  zpp_nape.geom.ZPP_AABB.zpp_pool = null;
  zpp_nape.geom.ZPP_Collide.flowpoly = new zpp_nape.util.ZNPList_ZPP_Vec2();
  zpp_nape.geom.ZPP_Collide.flowsegs = new zpp_nape.util.ZNPList_ZPP_Vec2();
  // ZPP_ConvexRayResult pools: initialized in native TypeScript
  // ZPP_CutVert/ZPP_CutInt pools: initialized in native TypeScript
  zpp_nape.geom.ZPP_Cutter.ints = null;
  zpp_nape.geom.ZPP_Cutter.paths = null;
  zpp_nape.geom.ZPP_GeomVert.zpp_pool = null;
  // zpp_nape.geom.ZPP_GeomVertexIterator pools/internal: initialized in TypeScript
  // ZPP_MarchSpan/ZPP_MarchPair pools: initialized in native TypeScript
  zpp_nape.geom.ZPP_MarchingSquares.me =
    new zpp_nape.geom.ZPP_MarchingSquares();
  zpp_nape.geom.ZPP_MarchingSquares.look_march = [
    -1, 224, 56, 216, 14, -1, 54, 214, 131, 99, -1, 91, 141, 109, 181, 85,
  ];
  // ZPP_Mat23.zpp_pool: initialized in src/native/geom/ZPP_Mat23.ts
  zpp_nape.geom.ZPP_Monotone.queue = null;
  zpp_nape.geom.ZPP_Monotone.edges = null;
  zpp_nape.geom.ZPP_PartitionVertex.nextId = 0;
  zpp_nape.geom.ZPP_PartitionVertex.zpp_pool = null;
  zpp_nape.geom.ZPP_PartitionedPoly.zpp_pool = null;
  zpp_nape.geom.ZPP_Ray.internal = false;
  zpp_nape.geom.ZPP_SimpleVert.zpp_pool = null;
  zpp_nape.geom.ZPP_SimpleSeg.zpp_pool = null;
  zpp_nape.geom.ZPP_SimpleEvent.zpp_pool = null;
  zpp_nape.geom.ZPP_Simple.sweep = null;
  zpp_nape.geom.ZPP_Simple.inthash = null;
  zpp_nape.geom.ZPP_Simple.vertices = null;
  zpp_nape.geom.ZPP_Simple.queue = null;
  zpp_nape.geom.ZPP_Simple.ints = null;
  zpp_nape.geom.ZPP_Simple.list_vertices = null;
  zpp_nape.geom.ZPP_Simple.list_queue = null;
  zpp_nape.geom.ZPP_SimplifyV.zpp_pool = null;
  zpp_nape.geom.ZPP_SimplifyP.zpp_pool = null;
  zpp_nape.geom.ZPP_Simplify.stack = null;
  zpp_nape.geom.ZPP_ToiEvent.zpp_pool = null;
  zpp_nape.geom.ZPP_PartitionPair.zpp_pool = null;
  zpp_nape.geom.ZPP_Triangular.queue = null;
  zpp_nape.geom.ZPP_Triangular.stack = null;
  zpp_nape.geom.ZPP_Triangular.edgeSet = null;
  zpp_nape.geom.ZPP_Vec2.zpp_pool = null;
  zpp_nape.phys.ZPP_Body.types = (function ($this) {
    var $r;
    if (zpp_nape.util.ZPP_Flags.BodyType_STATIC == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.BodyType_STATIC = new nape.phys.BodyType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp = zpp_nape.util.ZPP_Flags.BodyType_STATIC;
    if (zpp_nape.util.ZPP_Flags.BodyType_DYNAMIC == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.BodyType_DYNAMIC = new nape.phys.BodyType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp1 = zpp_nape.util.ZPP_Flags.BodyType_DYNAMIC;
    if (zpp_nape.util.ZPP_Flags.BodyType_KINEMATIC == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.BodyType_KINEMATIC = new nape.phys.BodyType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    $r = [null, tmp, tmp1, zpp_nape.util.ZPP_Flags.BodyType_KINEMATIC];
    return $r;
  })(this);
  zpp_nape.phys.ZPP_Body.bodystack = null;
  zpp_nape.phys.ZPP_Body.bodyset = null;
  zpp_nape.phys.ZPP_Body.cur_graph_depth = 0;
  zpp_nape.phys.ZPP_FluidProperties.zpp_pool = null;
  zpp_nape.phys.ZPP_Material.zpp_pool = null;
  zpp_nape.phys.ZPP_Material.WAKE = 1;
  zpp_nape.phys.ZPP_Material.PROPS = 2;
  zpp_nape.phys.ZPP_Material.ANGDRAG = 4;
  zpp_nape.phys.ZPP_Material.ARBITERS = 8;
  zpp_nape.shape.ZPP_Shape.types = (function ($this) {
    var $r;
    if (zpp_nape.util.ZPP_Flags.ShapeType_CIRCLE == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.ShapeType_CIRCLE = new nape.shape.ShapeType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    var tmp = zpp_nape.util.ZPP_Flags.ShapeType_CIRCLE;
    if (zpp_nape.util.ZPP_Flags.ShapeType_POLYGON == null) {
      zpp_nape.util.ZPP_Flags.internal = true;
      zpp_nape.util.ZPP_Flags.ShapeType_POLYGON = new nape.shape.ShapeType();
      zpp_nape.util.ZPP_Flags.internal = false;
    }
    $r = [tmp, zpp_nape.util.ZPP_Flags.ShapeType_POLYGON];
    return $r;
  })(this);
  zpp_nape.shape.ZPP_Edge.zpp_pool = null;
  zpp_nape.shape.ZPP_Edge.internal = false;
  zpp_nape.space.ZPP_AABBNode.zpp_pool = null;
  zpp_nape.space.ZPP_AABBPair.zpp_pool = null;
  zpp_nape.space.ZPP_AABBTree.tmpaabb = new zpp_nape.geom.ZPP_AABB();
  zpp_nape.space.ZPP_DynAABBPhase.FATTEN = 3.0;
  zpp_nape.space.ZPP_DynAABBPhase.VEL_STEPS = 2.0;
  zpp_nape.space.ZPP_Island.zpp_pool = null;
  zpp_nape.space.ZPP_Component.zpp_pool = null;
  zpp_nape.space.ZPP_CallbackSet.zpp_pool = null;
  zpp_nape.space.ZPP_SweepData.zpp_pool = null;
  zpp_nape.util.Hashable2_Boolfalse.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_CbType.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_CallbackSet.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_Shape.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_Body.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_Constraint.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_Compound.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_Arbiter.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_InteractionListener.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_CbSet.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_Interactor.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_BodyListener.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_CbSetPair.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_CutInt.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_CutVert.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_PartitionVertex.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_SimplifyP.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_PartitionedPoly.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_GeomVert.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_SimpleVert.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_SimpleEvent.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_Vec2.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_AABBPair.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_Edge.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_AABBNode.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_Component.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_FluidArbiter.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_SensorArbiter.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_Listener.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_ColArbiter.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_InteractionGroup.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_ToiEvent.zpp_pool = null;
  zpp_nape.util.ZNPNode_ConvexResult.zpp_pool = null;
  zpp_nape.util.ZNPNode_ZPP_GeomPoly.zpp_pool = null;
  zpp_nape.util.ZNPNode_RayResult.zpp_pool = null;
  zpp_nape.util.ZPP_ConstraintList.internal = false;
  zpp_nape.util.ZPP_BodyList.internal = false;
  zpp_nape.util.ZPP_InteractorList.internal = false;
  zpp_nape.util.ZPP_CompoundList.internal = false;
  zpp_nape.util.ZPP_ListenerList.internal = false;
  zpp_nape.util.ZPP_CbTypeList.internal = false;
  // zpp_nape.util.ZPP_Vec2List.internal: initialized in TypeScript
  zpp_nape.util.ZPP_GeomPolyList.internal = false;
  zpp_nape.util.ZPP_RayResultList.internal = false;
  zpp_nape.util.ZPP_ConvexResultList.internal = false;
  zpp_nape.util.ZPP_EdgeList.internal = false;
  zpp_nape.util.ZPP_ShapeList.internal = false;
  zpp_nape.util.ZPP_InteractionGroupList.internal = false;
  zpp_nape.util.ZPP_ArbiterList.internal = false;
  // zpp_nape.util.ZPP_ContactList.internal: initialized in TypeScript
  // ZPP_PubPool pools: initialized in src/native/util/ZPP_PubPool.ts
  zpp_nape.util.ZPP_Set_ZPP_Body.zpp_pool = null;
  zpp_nape.util.ZPP_Set_ZPP_CbSetPair.zpp_pool = null;
  zpp_nape.util.ZPP_Set_ZPP_PartitionVertex.zpp_pool = null;
  zpp_nape.util.ZPP_Set_ZPP_PartitionPair.zpp_pool = null;
  zpp_nape.util.ZPP_Set_ZPP_SimpleVert.zpp_pool = null;
  zpp_nape.util.ZPP_Set_ZPP_SimpleSeg.zpp_pool = null;
  zpp_nape.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool = null;
  zpp_nape.util.ZPP_Set_ZPP_CbSet.zpp_pool = null;
  sandbox.Main.main();
  nape.__zpp = zpp_nape;
  return nape;
});

export default _nape;
