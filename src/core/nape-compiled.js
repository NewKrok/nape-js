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
  nape.constraint.Constraint = $hxClasses["nape.constraint.Constraint"] =
    function () {
      this.debugDraw = true;
      this.zpp_inner.insert_cbtype(
        zpp_nape.callbacks.ZPP_CbType.ANY_CONSTRAINT.zpp_inner
      );
      if (!nape.constraint.Constraint.zpp_internalAlloc) {
        throw new js._Boot.HaxeError(
          "Error: Constraint cannot be instantiated derp!"
        );
      }
    };
  nape.constraint.Constraint.__name__ = ["nape", "constraint", "Constraint"];
  nape.constraint.Constraint.prototype.zpp_inner = null;
  Object.defineProperty(nape.constraint.Constraint.prototype, "userData", {
    get: function() { return this.get_userData(); },
  });
  nape.constraint.Constraint.prototype.get_userData = function () {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  };
  nape.constraint.Constraint.prototype.debugDraw = null;
  Object.defineProperty(nape.constraint.Constraint.prototype, "compound", {
    get: function() { return this.get_compound(); },
    set: function(v) { this.set_compound(v); },
  });
  nape.constraint.Constraint.prototype.get_compound = function () {
    if (this.zpp_inner.compound == null) {
      return null;
    } else {
      return this.zpp_inner.compound.outer;
    }
  };
  nape.constraint.Constraint.prototype.set_compound = function (compound) {
    if (
      (this.zpp_inner.compound == null
        ? null
        : this.zpp_inner.compound.outer) != compound
    ) {
      if (
        (this.zpp_inner.compound == null
          ? null
          : this.zpp_inner.compound.outer) != null
      ) {
        (this.zpp_inner.compound == null
          ? null
          : this.zpp_inner.compound.outer
        ).zpp_inner.wrap_constraints.remove(this);
      }
      if (compound != null) {
        var _this = compound.zpp_inner.wrap_constraints;
        if (_this.zpp_inner.reverse_flag) {
          _this.push(this);
        } else {
          _this.unshift(this);
        }
      }
    }
    if (this.zpp_inner.compound == null) {
      return null;
    } else {
      return this.zpp_inner.compound.outer;
    }
  };
  Object.defineProperty(nape.constraint.Constraint.prototype, "space", {
    get: function() { return this.get_space(); },
    set: function(v) { this.set_space(v); },
  });
  nape.constraint.Constraint.prototype.get_space = function () {
    if (this.zpp_inner.space == null) {
      return null;
    } else {
      return this.zpp_inner.space.outer;
    }
  };
  nape.constraint.Constraint.prototype.set_space = function (space) {
    if (this.zpp_inner.compound != null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot set the space of a Constraint belonging to" +
          " a Compound, only the root Compound space can be set"
      );
    }
    if (
      (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
      space
    ) {
      if (this.zpp_inner.component != null) {
        this.zpp_inner.component.woken = false;
      }
      this.zpp_inner.clearcache();
      if (this.zpp_inner.space != null) {
        this.zpp_inner.space.outer.zpp_inner.wrap_constraints.remove(this);
      }
      if (space != null) {
        var _this = space.zpp_inner.wrap_constraints;
        if (_this.zpp_inner.reverse_flag) {
          _this.push(this);
        } else {
          _this.unshift(this);
        }
      } else {
        this.zpp_inner.space = null;
      }
    }
    if (this.zpp_inner.space == null) {
      return null;
    } else {
      return this.zpp_inner.space.outer;
    }
  };
  Object.defineProperty(nape.constraint.Constraint.prototype, "isSleeping", {
    get: function() { return this.get_isSleeping(); },
  });
  nape.constraint.Constraint.prototype.get_isSleeping = function () {
    if (this.zpp_inner.space == null || !this.zpp_inner.active) {
      throw new js._Boot.HaxeError(
        "Error: isSleeping only makes sense if constraint is" +
          " active and inside a space"
      );
    }
    return this.zpp_inner.component.sleeping;
  };
  Object.defineProperty(nape.constraint.Constraint.prototype, "active", {
    get: function() { return this.get_active(); },
    set: function(v) { this.set_active(v); },
  });
  nape.constraint.Constraint.prototype.get_active = function () {
    return this.zpp_inner.active;
  };
  nape.constraint.Constraint.prototype.set_active = function (active) {
    if (this.zpp_inner.active != active) {
      if (this.zpp_inner.component != null) {
        this.zpp_inner.component.woken = false;
      }
      this.zpp_inner.clearcache();
      if (active) {
        this.zpp_inner.active = active;
        this.zpp_inner.activate();
        if (this.zpp_inner.space != null) {
          if (this.zpp_inner.component != null) {
            this.zpp_inner.component.sleeping = true;
          }
          this.zpp_inner.space.wake_constraint(this.zpp_inner, true);
        }
      } else {
        if (this.zpp_inner.space != null) {
          this.zpp_inner.wake();
          this.zpp_inner.space.live_constraints.remove(this.zpp_inner);
        }
        this.zpp_inner.active = active;
        this.zpp_inner.deactivate();
      }
    }
    return this.zpp_inner.active;
  };
  Object.defineProperty(nape.constraint.Constraint.prototype, "ignore", {
    get: function() { return this.get_ignore(); },
    set: function(v) { this.set_ignore(v); },
  });
  nape.constraint.Constraint.prototype.get_ignore = function () {
    return this.zpp_inner.ignore;
  };
  nape.constraint.Constraint.prototype.set_ignore = function (ignore) {
    if (this.zpp_inner.ignore != ignore) {
      this.zpp_inner.ignore = ignore;
      this.zpp_inner.wake();
    }
    return this.zpp_inner.ignore;
  };
  Object.defineProperty(nape.constraint.Constraint.prototype, "stiff", {
    get: function() { return this.get_stiff(); },
    set: function(v) { this.set_stiff(v); },
  });
  nape.constraint.Constraint.prototype.get_stiff = function () {
    return this.zpp_inner.stiff;
  };
  nape.constraint.Constraint.prototype.set_stiff = function (stiff) {
    if (this.zpp_inner.stiff != stiff) {
      this.zpp_inner.stiff = stiff;
      this.zpp_inner.wake();
    }
    return this.zpp_inner.stiff;
  };
  Object.defineProperty(nape.constraint.Constraint.prototype, "frequency", {
    get: function() { return this.get_frequency(); },
    set: function(v) { this.set_frequency(v); },
  });
  nape.constraint.Constraint.prototype.get_frequency = function () {
    return this.zpp_inner.frequency;
  };
  nape.constraint.Constraint.prototype.set_frequency = function (frequency) {
    if (frequency != frequency) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::Frequency cannot be NaN"
      );
    }
    if (frequency <= 0) {
      throw new js._Boot.HaxeError("Error: Constraint::Frequency must be >0");
    }
    if (this.zpp_inner.frequency != frequency) {
      this.zpp_inner.frequency = frequency;
      if (!this.zpp_inner.stiff) {
        this.zpp_inner.wake();
      }
    }
    return this.zpp_inner.frequency;
  };
  Object.defineProperty(nape.constraint.Constraint.prototype, "damping", {
    get: function() { return this.get_damping(); },
    set: function(v) { this.set_damping(v); },
  });
  nape.constraint.Constraint.prototype.get_damping = function () {
    return this.zpp_inner.damping;
  };
  nape.constraint.Constraint.prototype.set_damping = function (damping) {
    if (damping != damping) {
      throw new js._Boot.HaxeError("Error: Constraint::Damping cannot be Nan");
    }
    if (damping < 0) {
      throw new js._Boot.HaxeError("Error: Constraint::Damping must be >=0");
    }
    if (this.zpp_inner.damping != damping) {
      this.zpp_inner.damping = damping;
      if (!this.zpp_inner.stiff) {
        this.zpp_inner.wake();
      }
    }
    return this.zpp_inner.damping;
  };
  Object.defineProperty(nape.constraint.Constraint.prototype, "maxForce", {
    get: function() { return this.get_maxForce(); },
    set: function(v) { this.set_maxForce(v); },
  });
  nape.constraint.Constraint.prototype.get_maxForce = function () {
    return this.zpp_inner.maxForce;
  };
  nape.constraint.Constraint.prototype.set_maxForce = function (maxForce) {
    if (maxForce != maxForce) {
      throw new js._Boot.HaxeError("Error: Constraint::maxForce cannot be NaN");
    }
    if (maxForce < 0) {
      throw new js._Boot.HaxeError("Error: Constraint::maxForce must be >=0");
    }
    if (this.zpp_inner.maxForce != maxForce) {
      this.zpp_inner.maxForce = maxForce;
      this.zpp_inner.wake();
    }
    return this.zpp_inner.maxForce;
  };
  Object.defineProperty(nape.constraint.Constraint.prototype, "maxError", {
    get: function() { return this.get_maxError(); },
    set: function(v) { this.set_maxError(v); },
  });
  nape.constraint.Constraint.prototype.get_maxError = function () {
    return this.zpp_inner.maxError;
  };
  nape.constraint.Constraint.prototype.set_maxError = function (maxError) {
    if (maxError != maxError) {
      throw new js._Boot.HaxeError("Error: Constraint::maxError cannot be NaN");
    }
    if (maxError < 0) {
      throw new js._Boot.HaxeError("Error: Constraint::maxError must be >=0");
    }
    if (this.zpp_inner.maxError != maxError) {
      this.zpp_inner.maxError = maxError;
      this.zpp_inner.wake();
    }
    return this.zpp_inner.maxError;
  };
  Object.defineProperty(
    nape.constraint.Constraint.prototype,
    "breakUnderForce",
    {
      get: function() { return this.get_breakUnderForce(); },
      set: function(v) { this.set_breakUnderForce(v); },
    }
  );
  nape.constraint.Constraint.prototype.get_breakUnderForce = function () {
    return this.zpp_inner.breakUnderForce;
  };
  nape.constraint.Constraint.prototype.set_breakUnderForce = function (
    breakUnderForce
  ) {
    if (this.zpp_inner.breakUnderForce != breakUnderForce) {
      this.zpp_inner.breakUnderForce = breakUnderForce;
      this.zpp_inner.wake();
    }
    return this.zpp_inner.breakUnderForce;
  };
  Object.defineProperty(
    nape.constraint.Constraint.prototype,
    "breakUnderError",
    {
      get: function() { return this.get_breakUnderError(); },
      set: function(v) { this.set_breakUnderError(v); },
    }
  );
  nape.constraint.Constraint.prototype.get_breakUnderError = function () {
    return this.zpp_inner.breakUnderError;
  };
  nape.constraint.Constraint.prototype.set_breakUnderError = function (
    breakUnderError
  ) {
    if (this.zpp_inner.breakUnderError != breakUnderError) {
      this.zpp_inner.breakUnderError = breakUnderError;
      this.zpp_inner.wake();
    }
    return this.zpp_inner.breakUnderError;
  };
  Object.defineProperty(nape.constraint.Constraint.prototype, "removeOnBreak", {
    get: function() { return this.get_removeOnBreak(); },
    set: function(v) { this.set_removeOnBreak(v); },
  });
  nape.constraint.Constraint.prototype.get_removeOnBreak = function () {
    return this.zpp_inner.removeOnBreak;
  };
  nape.constraint.Constraint.prototype.set_removeOnBreak = function (
    removeOnBreak
  ) {
    this.zpp_inner.removeOnBreak = removeOnBreak;
    return this.zpp_inner.removeOnBreak;
  };
  nape.constraint.Constraint.prototype.impulse = function () {
    return null;
  };
  nape.constraint.Constraint.prototype.bodyImpulse = function (body) {
    return null;
  };
  nape.constraint.Constraint.prototype.visitBodies = function (lambda) {};
  Object.defineProperty(nape.constraint.Constraint.prototype, "cbTypes", {
    get: function() { return this.get_cbTypes(); },
  });
  nape.constraint.Constraint.prototype.get_cbTypes = function () {
    if (this.zpp_inner.wrap_cbTypes == null) {
      this.zpp_inner.setupcbTypes();
    }
    return this.zpp_inner.wrap_cbTypes;
  };
  nape.constraint.Constraint.prototype.toString = function () {
    return "{Constraint}";
  };
  nape.constraint.Constraint.prototype.copy = function () {
    return this.zpp_inner.copy();
  };
  nape.constraint.Constraint.prototype.__class__ = nape.constraint.Constraint;
  // nape.constraint.AngleJoint: converted to TypeScript → src/constraint/AngleJoint.ts
  nape.constraint.AngleJoint = $hxClasses["nape.constraint.AngleJoint"] = function() {};
  nape.constraint.AngleJoint.__name__ = ["nape", "constraint", "AngleJoint"];
  nape.constraint.AngleJoint.prototype.__class__ = nape.constraint.AngleJoint;
  // nape.constraint.ConstraintIterator + nape.constraint.ConstraintList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  nape.constraint.DistanceJoint = $hxClasses["nape.constraint.DistanceJoint"] =
    function (body1, body2, anchor1, anchor2, jointMin, jointMax) {
      this.zpp_inner_zn = null;
      this.zpp_inner_zn = new zpp_nape.constraint.ZPP_DistanceJoint();
      this.zpp_inner = this.zpp_inner_zn;
      this.zpp_inner.outer = this;
      this.zpp_inner_zn.outer_zn = this;
      nape.constraint.Constraint.zpp_internalAlloc = true;
      nape.constraint.Constraint.call(this);
      nape.constraint.Constraint.zpp_internalAlloc = false;
      this.zpp_inner.immutable_midstep("Constraint::" + "body1");
      var inbody1 = body1 == null ? null : body1.zpp_inner;
      if (inbody1 != this.zpp_inner_zn.b1) {
        if (this.zpp_inner_zn.b1 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b2 != this.zpp_inner_zn.b1
          ) {
            if (this.zpp_inner_zn.b1 != null) {
              this.zpp_inner_zn.b1.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b1.wake();
          }
        }
        this.zpp_inner_zn.b1 = inbody1;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody1 != null &&
          this.zpp_inner_zn.b2 != inbody1
        ) {
          if (inbody1 != null) {
            inbody1.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody1 != null) {
            inbody1.wake();
          }
        }
      }
      var tmp = this.zpp_inner_zn.b1 == null;
      this.zpp_inner.immutable_midstep("Constraint::" + "body2");
      var inbody2 = body2 == null ? null : body2.zpp_inner;
      if (inbody2 != this.zpp_inner_zn.b2) {
        if (this.zpp_inner_zn.b2 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b1 != this.zpp_inner_zn.b2
          ) {
            if (this.zpp_inner_zn.b2 != null) {
              this.zpp_inner_zn.b2.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b2.wake();
          }
        }
        this.zpp_inner_zn.b2 = inbody2;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody2 != null &&
          this.zpp_inner_zn.b1 != inbody2
        ) {
          if (inbody2 != null) {
            inbody2.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody2 != null) {
            inbody2.wake();
          }
        }
      }
      var tmp1 = this.zpp_inner_zn.b2 == null;
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor1 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor1" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a1 == null) {
        this.zpp_inner_zn.setup_a1();
      }
      var _this = this.zpp_inner_zn.wrap_a1;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this1 = _this.zpp_inner;
      if (_this1._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this1._isimmutable != null) {
        _this1._isimmutable();
      }
      if (anchor1 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this2 = anchor1.zpp_inner;
      if (_this2._validate != null) {
        _this2._validate();
      }
      var x = anchor1.zpp_inner.x;
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this3 = anchor1.zpp_inner;
      if (_this3._validate != null) {
        _this3._validate();
      }
      var y = anchor1.zpp_inner.y;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this4 = _this.zpp_inner;
      if (_this4._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this4._isimmutable != null) {
        _this4._isimmutable();
      }
      if (x != x || y != y) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp2;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this5 = _this.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      if (_this.zpp_inner.x == x) {
        if (_this != null && _this.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this6 = _this.zpp_inner;
        if (_this6._validate != null) {
          _this6._validate();
        }
        tmp2 = _this.zpp_inner.y == y;
      } else {
        tmp2 = false;
      }
      if (!tmp2) {
        _this.zpp_inner.x = x;
        _this.zpp_inner.y = y;
        var _this7 = _this.zpp_inner;
        if (_this7._invalidate != null) {
          _this7._invalidate(_this7);
        }
      }
      var ret = _this;
      if (anchor1.zpp_inner.weak) {
        if (anchor1 != null && anchor1.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this8 = anchor1.zpp_inner;
        if (_this8._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this8._isimmutable != null) {
          _this8._isimmutable();
        }
        if (anchor1.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner = anchor1.zpp_inner;
        anchor1.zpp_inner.outer = null;
        anchor1.zpp_inner = null;
        var o = anchor1;
        o.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o;
        o.zpp_disp = true;
        var o1 = inner;
        if (o1.outer != null) {
          o1.outer.zpp_inner = null;
          o1.outer = null;
        }
        o1._isimmutable = null;
        o1._validate = null;
        o1._invalidate = null;
        o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
      }
      if (this.zpp_inner_zn.wrap_a1 == null) {
        this.zpp_inner_zn.setup_a1();
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor2 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor2" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a2 == null) {
        this.zpp_inner_zn.setup_a2();
      }
      var _this9 = this.zpp_inner_zn.wrap_a2;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this10 = _this9.zpp_inner;
      if (_this10._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this10._isimmutable != null) {
        _this10._isimmutable();
      }
      if (anchor2 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this11 = anchor2.zpp_inner;
      if (_this11._validate != null) {
        _this11._validate();
      }
      var x1 = anchor2.zpp_inner.x;
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this12 = anchor2.zpp_inner;
      if (_this12._validate != null) {
        _this12._validate();
      }
      var y1 = anchor2.zpp_inner.y;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this13 = _this9.zpp_inner;
      if (_this13._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this13._isimmutable != null) {
        _this13._isimmutable();
      }
      if (x1 != x1 || y1 != y1) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp3;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this14 = _this9.zpp_inner;
      if (_this14._validate != null) {
        _this14._validate();
      }
      if (_this9.zpp_inner.x == x1) {
        if (_this9 != null && _this9.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this15 = _this9.zpp_inner;
        if (_this15._validate != null) {
          _this15._validate();
        }
        tmp3 = _this9.zpp_inner.y == y1;
      } else {
        tmp3 = false;
      }
      if (!tmp3) {
        _this9.zpp_inner.x = x1;
        _this9.zpp_inner.y = y1;
        var _this16 = _this9.zpp_inner;
        if (_this16._invalidate != null) {
          _this16._invalidate(_this16);
        }
      }
      var ret1 = _this9;
      if (anchor2.zpp_inner.weak) {
        if (anchor2 != null && anchor2.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this17 = anchor2.zpp_inner;
        if (_this17._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this17._isimmutable != null) {
          _this17._isimmutable();
        }
        if (anchor2.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner1 = anchor2.zpp_inner;
        anchor2.zpp_inner.outer = null;
        anchor2.zpp_inner = null;
        var o2 = anchor2;
        o2.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o2;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o2;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o2;
        o2.zpp_disp = true;
        var o3 = inner1;
        if (o3.outer != null) {
          o3.outer.zpp_inner = null;
          o3.outer = null;
        }
        o3._isimmutable = null;
        o3._validate = null;
        o3._invalidate = null;
        o3.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o3;
      }
      if (this.zpp_inner_zn.wrap_a2 == null) {
        this.zpp_inner_zn.setup_a2();
      }
      this.zpp_inner.immutable_midstep("DistanceJoint::jointMin");
      if (jointMin != jointMin) {
        throw new js._Boot.HaxeError(
          "Error: DistanceJoint::jointMin cannot be NaN"
        );
      }
      if (jointMin < 0) {
        throw new js._Boot.HaxeError(
          "Error: DistanceJoint::jointMin must be >= 0"
        );
      }
      if (this.zpp_inner_zn.jointMin != jointMin) {
        this.zpp_inner_zn.jointMin = jointMin;
        this.zpp_inner.wake();
      }
      this.zpp_inner.immutable_midstep("DistanceJoint::jointMax");
      if (jointMax != jointMax) {
        throw new js._Boot.HaxeError(
          "Error: DistanceJoint::jointMax cannot be NaN"
        );
      }
      if (jointMax < 0) {
        throw new js._Boot.HaxeError(
          "Error: DistanceJoint::jointMax must be >= 0"
        );
      }
      if (this.zpp_inner_zn.jointMax != jointMax) {
        this.zpp_inner_zn.jointMax = jointMax;
        this.zpp_inner.wake();
      }
    };
  nape.constraint.DistanceJoint.__name__ = [
    "nape",
    "constraint",
    "DistanceJoint",
  ];
  nape.constraint.DistanceJoint.__super__ = nape.constraint.Constraint;
  for (var k in nape.constraint.Constraint.prototype)
    nape.constraint.DistanceJoint.prototype[k] =
      nape.constraint.Constraint.prototype[k];
  nape.constraint.DistanceJoint.prototype.zpp_inner_zn = null;
  Object.defineProperty(nape.constraint.DistanceJoint.prototype, "body1", {
    get: function() { return this.get_body1(); },
    set: function(v) { this.set_body1(v); },
  });
  nape.constraint.DistanceJoint.prototype.get_body1 = function () {
    if (this.zpp_inner_zn.b1 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b1.outer;
    }
  };
  nape.constraint.DistanceJoint.prototype.set_body1 = function (body1) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body1");
    var inbody1 = body1 == null ? null : body1.zpp_inner;
    if (inbody1 != this.zpp_inner_zn.b1) {
      if (this.zpp_inner_zn.b1 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b2 != this.zpp_inner_zn.b1
        ) {
          if (this.zpp_inner_zn.b1 != null) {
            this.zpp_inner_zn.b1.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b1.wake();
        }
      }
      this.zpp_inner_zn.b1 = inbody1;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody1 != null &&
        this.zpp_inner_zn.b2 != inbody1
      ) {
        if (inbody1 != null) {
          inbody1.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody1 != null) {
          inbody1.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b1 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b1.outer;
    }
  };
  Object.defineProperty(nape.constraint.DistanceJoint.prototype, "body2", {
    get: function() { return this.get_body2(); },
    set: function(v) { this.set_body2(v); },
  });
  nape.constraint.DistanceJoint.prototype.get_body2 = function () {
    if (this.zpp_inner_zn.b2 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b2.outer;
    }
  };
  nape.constraint.DistanceJoint.prototype.set_body2 = function (body2) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body2");
    var inbody2 = body2 == null ? null : body2.zpp_inner;
    if (inbody2 != this.zpp_inner_zn.b2) {
      if (this.zpp_inner_zn.b2 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b1 != this.zpp_inner_zn.b2
        ) {
          if (this.zpp_inner_zn.b2 != null) {
            this.zpp_inner_zn.b2.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b2.wake();
        }
      }
      this.zpp_inner_zn.b2 = inbody2;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody2 != null &&
        this.zpp_inner_zn.b1 != inbody2
      ) {
        if (inbody2 != null) {
          inbody2.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody2 != null) {
          inbody2.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b2 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b2.outer;
    }
  };
  Object.defineProperty(nape.constraint.DistanceJoint.prototype, "anchor1", {
    get: function() { return this.get_anchor1(); },
    set: function(v) { this.set_anchor1(v); },
  });
  nape.constraint.DistanceJoint.prototype.get_anchor1 = function () {
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    return this.zpp_inner_zn.wrap_a1;
  };
  nape.constraint.DistanceJoint.prototype.set_anchor1 = function (anchor1) {
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor1 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor1" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    var _this = this.zpp_inner_zn.wrap_a1;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor1 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor1.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor1.zpp_inner.x;
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor1.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor1.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor1.zpp_inner.weak) {
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor1.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor1.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor1.zpp_inner;
      anchor1.zpp_inner.outer = null;
      anchor1.zpp_inner = null;
      var o = anchor1;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    return this.zpp_inner_zn.wrap_a1;
  };
  Object.defineProperty(nape.constraint.DistanceJoint.prototype, "anchor2", {
    get: function() { return this.get_anchor2(); },
    set: function(v) { this.set_anchor2(v); },
  });
  nape.constraint.DistanceJoint.prototype.get_anchor2 = function () {
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    return this.zpp_inner_zn.wrap_a2;
  };
  nape.constraint.DistanceJoint.prototype.set_anchor2 = function (anchor2) {
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor2 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor2" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    var _this = this.zpp_inner_zn.wrap_a2;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor2 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor2.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor2.zpp_inner.x;
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor2.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor2.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor2.zpp_inner.weak) {
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor2.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor2.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor2.zpp_inner;
      anchor2.zpp_inner.outer = null;
      anchor2.zpp_inner = null;
      var o = anchor2;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    return this.zpp_inner_zn.wrap_a2;
  };
  Object.defineProperty(nape.constraint.DistanceJoint.prototype, "jointMin", {
    get: function() { return this.get_jointMin(); },
    set: function(v) { this.set_jointMin(v); },
  });
  nape.constraint.DistanceJoint.prototype.get_jointMin = function () {
    return this.zpp_inner_zn.jointMin;
  };
  nape.constraint.DistanceJoint.prototype.set_jointMin = function (jointMin) {
    this.zpp_inner.immutable_midstep("DistanceJoint::jointMin");
    if (jointMin != jointMin) {
      throw new js._Boot.HaxeError(
        "Error: DistanceJoint::jointMin cannot be NaN"
      );
    }
    if (jointMin < 0) {
      throw new js._Boot.HaxeError(
        "Error: DistanceJoint::jointMin must be >= 0"
      );
    }
    if (this.zpp_inner_zn.jointMin != jointMin) {
      this.zpp_inner_zn.jointMin = jointMin;
      this.zpp_inner.wake();
    }
    return this.zpp_inner_zn.jointMin;
  };
  Object.defineProperty(nape.constraint.DistanceJoint.prototype, "jointMax", {
    get: function() { return this.get_jointMax(); },
    set: function(v) { this.set_jointMax(v); },
  });
  nape.constraint.DistanceJoint.prototype.get_jointMax = function () {
    return this.zpp_inner_zn.jointMax;
  };
  nape.constraint.DistanceJoint.prototype.set_jointMax = function (jointMax) {
    this.zpp_inner.immutable_midstep("DistanceJoint::jointMax");
    if (jointMax != jointMax) {
      throw new js._Boot.HaxeError(
        "Error: DistanceJoint::jointMax cannot be NaN"
      );
    }
    if (jointMax < 0) {
      throw new js._Boot.HaxeError(
        "Error: DistanceJoint::jointMax must be >= 0"
      );
    }
    if (this.zpp_inner_zn.jointMax != jointMax) {
      this.zpp_inner_zn.jointMax = jointMax;
      this.zpp_inner.wake();
    }
    return this.zpp_inner_zn.jointMax;
  };
  nape.constraint.DistanceJoint.prototype.isSlack = function () {
    if (
      (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) ==
        null ||
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) == null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Cannot compute slack for DistanceJoint if either body is null."
      );
    }
    return this.zpp_inner_zn.slack;
  };
  nape.constraint.DistanceJoint.prototype.impulse = function () {
    var ret = new nape.geom.MatMN(1, 1);
    if (0 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new js._Boot.HaxeError("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[0 * ret.zpp_inner.n] = this.zpp_inner_zn.jAcc;
    return ret;
  };
  nape.constraint.DistanceJoint.prototype.bodyImpulse = function (body) {
    if (body == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate impulse on null body"
      );
    }
    if (
      body !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) &&
      body != (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer)
    ) {
      throw new js._Boot.HaxeError(
        "Error: Body is not linked to this constraint"
      );
    }
    if (!this.zpp_inner.active) {
      return nape.geom.Vec3.get();
    } else {
      return this.zpp_inner_zn.bodyImpulse(body.zpp_inner);
    }
  };
  nape.constraint.DistanceJoint.prototype.visitBodies = function (lambda) {
    if (
      (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) != null
    ) {
      lambda(this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer);
    }
    if (
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) !=
        null &&
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer)
    ) {
      lambda(this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer);
    }
  };
  nape.constraint.DistanceJoint.prototype.__class__ =
    nape.constraint.DistanceJoint;
  nape.constraint.LineJoint = $hxClasses["nape.constraint.LineJoint"] =
    function (body1, body2, anchor1, anchor2, direction, jointMin, jointMax) {
      this.zpp_inner_zn = null;
      this.zpp_inner_zn = new zpp_nape.constraint.ZPP_LineJoint();
      this.zpp_inner = this.zpp_inner_zn;
      this.zpp_inner.outer = this;
      this.zpp_inner_zn.outer_zn = this;
      nape.constraint.Constraint.zpp_internalAlloc = true;
      nape.constraint.Constraint.call(this);
      nape.constraint.Constraint.zpp_internalAlloc = false;
      this.zpp_inner.immutable_midstep("Constraint::" + "body1");
      var inbody1 = body1 == null ? null : body1.zpp_inner;
      if (inbody1 != this.zpp_inner_zn.b1) {
        if (this.zpp_inner_zn.b1 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b2 != this.zpp_inner_zn.b1
          ) {
            if (this.zpp_inner_zn.b1 != null) {
              this.zpp_inner_zn.b1.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b1.wake();
          }
        }
        this.zpp_inner_zn.b1 = inbody1;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody1 != null &&
          this.zpp_inner_zn.b2 != inbody1
        ) {
          if (inbody1 != null) {
            inbody1.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody1 != null) {
            inbody1.wake();
          }
        }
      }
      var tmp = this.zpp_inner_zn.b1 == null;
      this.zpp_inner.immutable_midstep("Constraint::" + "body2");
      var inbody2 = body2 == null ? null : body2.zpp_inner;
      if (inbody2 != this.zpp_inner_zn.b2) {
        if (this.zpp_inner_zn.b2 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b1 != this.zpp_inner_zn.b2
          ) {
            if (this.zpp_inner_zn.b2 != null) {
              this.zpp_inner_zn.b2.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b2.wake();
          }
        }
        this.zpp_inner_zn.b2 = inbody2;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody2 != null &&
          this.zpp_inner_zn.b1 != inbody2
        ) {
          if (inbody2 != null) {
            inbody2.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody2 != null) {
            inbody2.wake();
          }
        }
      }
      var tmp1 = this.zpp_inner_zn.b2 == null;
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor1 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor1" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a1 == null) {
        this.zpp_inner_zn.setup_a1();
      }
      var _this = this.zpp_inner_zn.wrap_a1;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this1 = _this.zpp_inner;
      if (_this1._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this1._isimmutable != null) {
        _this1._isimmutable();
      }
      if (anchor1 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this2 = anchor1.zpp_inner;
      if (_this2._validate != null) {
        _this2._validate();
      }
      var x = anchor1.zpp_inner.x;
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this3 = anchor1.zpp_inner;
      if (_this3._validate != null) {
        _this3._validate();
      }
      var y = anchor1.zpp_inner.y;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this4 = _this.zpp_inner;
      if (_this4._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this4._isimmutable != null) {
        _this4._isimmutable();
      }
      if (x != x || y != y) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp2;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this5 = _this.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      if (_this.zpp_inner.x == x) {
        if (_this != null && _this.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this6 = _this.zpp_inner;
        if (_this6._validate != null) {
          _this6._validate();
        }
        tmp2 = _this.zpp_inner.y == y;
      } else {
        tmp2 = false;
      }
      if (!tmp2) {
        _this.zpp_inner.x = x;
        _this.zpp_inner.y = y;
        var _this7 = _this.zpp_inner;
        if (_this7._invalidate != null) {
          _this7._invalidate(_this7);
        }
      }
      var ret = _this;
      if (anchor1.zpp_inner.weak) {
        if (anchor1 != null && anchor1.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this8 = anchor1.zpp_inner;
        if (_this8._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this8._isimmutable != null) {
          _this8._isimmutable();
        }
        if (anchor1.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner = anchor1.zpp_inner;
        anchor1.zpp_inner.outer = null;
        anchor1.zpp_inner = null;
        var o = anchor1;
        o.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o;
        o.zpp_disp = true;
        var o1 = inner;
        if (o1.outer != null) {
          o1.outer.zpp_inner = null;
          o1.outer = null;
        }
        o1._isimmutable = null;
        o1._validate = null;
        o1._invalidate = null;
        o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
      }
      if (this.zpp_inner_zn.wrap_a1 == null) {
        this.zpp_inner_zn.setup_a1();
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor2 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor2" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a2 == null) {
        this.zpp_inner_zn.setup_a2();
      }
      var _this9 = this.zpp_inner_zn.wrap_a2;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this10 = _this9.zpp_inner;
      if (_this10._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this10._isimmutable != null) {
        _this10._isimmutable();
      }
      if (anchor2 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this11 = anchor2.zpp_inner;
      if (_this11._validate != null) {
        _this11._validate();
      }
      var x1 = anchor2.zpp_inner.x;
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this12 = anchor2.zpp_inner;
      if (_this12._validate != null) {
        _this12._validate();
      }
      var y1 = anchor2.zpp_inner.y;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this13 = _this9.zpp_inner;
      if (_this13._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this13._isimmutable != null) {
        _this13._isimmutable();
      }
      if (x1 != x1 || y1 != y1) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp3;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this14 = _this9.zpp_inner;
      if (_this14._validate != null) {
        _this14._validate();
      }
      if (_this9.zpp_inner.x == x1) {
        if (_this9 != null && _this9.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this15 = _this9.zpp_inner;
        if (_this15._validate != null) {
          _this15._validate();
        }
        tmp3 = _this9.zpp_inner.y == y1;
      } else {
        tmp3 = false;
      }
      if (!tmp3) {
        _this9.zpp_inner.x = x1;
        _this9.zpp_inner.y = y1;
        var _this16 = _this9.zpp_inner;
        if (_this16._invalidate != null) {
          _this16._invalidate(_this16);
        }
      }
      var ret1 = _this9;
      if (anchor2.zpp_inner.weak) {
        if (anchor2 != null && anchor2.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this17 = anchor2.zpp_inner;
        if (_this17._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this17._isimmutable != null) {
          _this17._isimmutable();
        }
        if (anchor2.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner1 = anchor2.zpp_inner;
        anchor2.zpp_inner.outer = null;
        anchor2.zpp_inner = null;
        var o2 = anchor2;
        o2.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o2;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o2;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o2;
        o2.zpp_disp = true;
        var o3 = inner1;
        if (o3.outer != null) {
          o3.outer.zpp_inner = null;
          o3.outer = null;
        }
        o3._isimmutable = null;
        o3._validate = null;
        o3._invalidate = null;
        o3.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o3;
      }
      if (this.zpp_inner_zn.wrap_a2 == null) {
        this.zpp_inner_zn.setup_a2();
      }
      if (direction != null && direction.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (direction == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "direction" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_n == null) {
        this.zpp_inner_zn.setup_n();
      }
      var _this18 = this.zpp_inner_zn.wrap_n;
      if (_this18 != null && _this18.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (direction != null && direction.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this19 = _this18.zpp_inner;
      if (_this19._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this19._isimmutable != null) {
        _this19._isimmutable();
      }
      if (direction == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (direction != null && direction.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this20 = direction.zpp_inner;
      if (_this20._validate != null) {
        _this20._validate();
      }
      var x2 = direction.zpp_inner.x;
      if (direction != null && direction.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this21 = direction.zpp_inner;
      if (_this21._validate != null) {
        _this21._validate();
      }
      var y2 = direction.zpp_inner.y;
      if (_this18 != null && _this18.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this22 = _this18.zpp_inner;
      if (_this22._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this22._isimmutable != null) {
        _this22._isimmutable();
      }
      if (x2 != x2 || y2 != y2) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp4;
      if (_this18 != null && _this18.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this23 = _this18.zpp_inner;
      if (_this23._validate != null) {
        _this23._validate();
      }
      if (_this18.zpp_inner.x == x2) {
        if (_this18 != null && _this18.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this24 = _this18.zpp_inner;
        if (_this24._validate != null) {
          _this24._validate();
        }
        tmp4 = _this18.zpp_inner.y == y2;
      } else {
        tmp4 = false;
      }
      if (!tmp4) {
        _this18.zpp_inner.x = x2;
        _this18.zpp_inner.y = y2;
        var _this25 = _this18.zpp_inner;
        if (_this25._invalidate != null) {
          _this25._invalidate(_this25);
        }
      }
      var ret2 = _this18;
      if (direction.zpp_inner.weak) {
        if (direction != null && direction.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this26 = direction.zpp_inner;
        if (_this26._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this26._isimmutable != null) {
          _this26._isimmutable();
        }
        if (direction.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner2 = direction.zpp_inner;
        direction.zpp_inner.outer = null;
        direction.zpp_inner = null;
        var o4 = direction;
        o4.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o4;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o4;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o4;
        o4.zpp_disp = true;
        var o5 = inner2;
        if (o5.outer != null) {
          o5.outer.zpp_inner = null;
          o5.outer = null;
        }
        o5._isimmutable = null;
        o5._validate = null;
        o5._invalidate = null;
        o5.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o5;
      }
      if (this.zpp_inner_zn.wrap_n == null) {
        this.zpp_inner_zn.setup_n();
      }
      this.zpp_inner.immutable_midstep("LineJoint::jointMin");
      if (jointMin != jointMin) {
        throw new js._Boot.HaxeError(
          "Error: AngleJoint::jointMin cannot be NaN"
        );
      }
      if (this.zpp_inner_zn.jointMin != jointMin) {
        this.zpp_inner_zn.jointMin = jointMin;
        this.zpp_inner.wake();
      }
      this.zpp_inner.immutable_midstep("LineJoint::jointMax");
      if (jointMax != jointMax) {
        throw new js._Boot.HaxeError(
          "Error: AngleJoint::jointMax cannot be NaN"
        );
      }
      if (this.zpp_inner_zn.jointMax != jointMax) {
        this.zpp_inner_zn.jointMax = jointMax;
        this.zpp_inner.wake();
      }
    };
  nape.constraint.LineJoint.__name__ = ["nape", "constraint", "LineJoint"];
  nape.constraint.LineJoint.__super__ = nape.constraint.Constraint;
  for (var k in nape.constraint.Constraint.prototype)
    nape.constraint.LineJoint.prototype[k] =
      nape.constraint.Constraint.prototype[k];
  nape.constraint.LineJoint.prototype.zpp_inner_zn = null;
  Object.defineProperty(nape.constraint.LineJoint.prototype, "body1", {
    get: function() { return this.get_body1(); },
    set: function(v) { this.set_body1(v); },
  });
  nape.constraint.LineJoint.prototype.get_body1 = function () {
    if (this.zpp_inner_zn.b1 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b1.outer;
    }
  };
  nape.constraint.LineJoint.prototype.set_body1 = function (body1) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body1");
    var inbody1 = body1 == null ? null : body1.zpp_inner;
    if (inbody1 != this.zpp_inner_zn.b1) {
      if (this.zpp_inner_zn.b1 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b2 != this.zpp_inner_zn.b1
        ) {
          if (this.zpp_inner_zn.b1 != null) {
            this.zpp_inner_zn.b1.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b1.wake();
        }
      }
      this.zpp_inner_zn.b1 = inbody1;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody1 != null &&
        this.zpp_inner_zn.b2 != inbody1
      ) {
        if (inbody1 != null) {
          inbody1.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody1 != null) {
          inbody1.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b1 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b1.outer;
    }
  };
  Object.defineProperty(nape.constraint.LineJoint.prototype, "body2", {
    get: function() { return this.get_body2(); },
    set: function(v) { this.set_body2(v); },
  });
  nape.constraint.LineJoint.prototype.get_body2 = function () {
    if (this.zpp_inner_zn.b2 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b2.outer;
    }
  };
  nape.constraint.LineJoint.prototype.set_body2 = function (body2) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body2");
    var inbody2 = body2 == null ? null : body2.zpp_inner;
    if (inbody2 != this.zpp_inner_zn.b2) {
      if (this.zpp_inner_zn.b2 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b1 != this.zpp_inner_zn.b2
        ) {
          if (this.zpp_inner_zn.b2 != null) {
            this.zpp_inner_zn.b2.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b2.wake();
        }
      }
      this.zpp_inner_zn.b2 = inbody2;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody2 != null &&
        this.zpp_inner_zn.b1 != inbody2
      ) {
        if (inbody2 != null) {
          inbody2.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody2 != null) {
          inbody2.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b2 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b2.outer;
    }
  };
  Object.defineProperty(nape.constraint.LineJoint.prototype, "anchor1", {
    get: function() { return this.get_anchor1(); },
    set: function(v) { this.set_anchor1(v); },
  });
  nape.constraint.LineJoint.prototype.get_anchor1 = function () {
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    return this.zpp_inner_zn.wrap_a1;
  };
  nape.constraint.LineJoint.prototype.set_anchor1 = function (anchor1) {
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor1 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor1" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    var _this = this.zpp_inner_zn.wrap_a1;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor1 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor1.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor1.zpp_inner.x;
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor1.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor1.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor1.zpp_inner.weak) {
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor1.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor1.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor1.zpp_inner;
      anchor1.zpp_inner.outer = null;
      anchor1.zpp_inner = null;
      var o = anchor1;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    return this.zpp_inner_zn.wrap_a1;
  };
  Object.defineProperty(nape.constraint.LineJoint.prototype, "anchor2", {
    get: function() { return this.get_anchor2(); },
    set: function(v) { this.set_anchor2(v); },
  });
  nape.constraint.LineJoint.prototype.get_anchor2 = function () {
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    return this.zpp_inner_zn.wrap_a2;
  };
  nape.constraint.LineJoint.prototype.set_anchor2 = function (anchor2) {
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor2 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor2" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    var _this = this.zpp_inner_zn.wrap_a2;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor2 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor2.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor2.zpp_inner.x;
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor2.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor2.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor2.zpp_inner.weak) {
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor2.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor2.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor2.zpp_inner;
      anchor2.zpp_inner.outer = null;
      anchor2.zpp_inner = null;
      var o = anchor2;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    return this.zpp_inner_zn.wrap_a2;
  };
  Object.defineProperty(nape.constraint.LineJoint.prototype, "direction", {
    get: function() { return this.get_direction(); },
    set: function(v) { this.set_direction(v); },
  });
  nape.constraint.LineJoint.prototype.get_direction = function () {
    if (this.zpp_inner_zn.wrap_n == null) {
      this.zpp_inner_zn.setup_n();
    }
    return this.zpp_inner_zn.wrap_n;
  };
  nape.constraint.LineJoint.prototype.set_direction = function (direction) {
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (direction == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "direction" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_n == null) {
      this.zpp_inner_zn.setup_n();
    }
    var _this = this.zpp_inner_zn.wrap_n;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (direction == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = direction.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = direction.zpp_inner.x;
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = direction.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = direction.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (direction.zpp_inner.weak) {
      if (direction != null && direction.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = direction.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (direction.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = direction.zpp_inner;
      direction.zpp_inner.outer = null;
      direction.zpp_inner = null;
      var o = direction;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_n == null) {
      this.zpp_inner_zn.setup_n();
    }
    return this.zpp_inner_zn.wrap_n;
  };
  Object.defineProperty(nape.constraint.LineJoint.prototype, "jointMin", {
    get: function() { return this.get_jointMin(); },
    set: function(v) { this.set_jointMin(v); },
  });
  nape.constraint.LineJoint.prototype.get_jointMin = function () {
    return this.zpp_inner_zn.jointMin;
  };
  nape.constraint.LineJoint.prototype.set_jointMin = function (jointMin) {
    this.zpp_inner.immutable_midstep("LineJoint::jointMin");
    if (jointMin != jointMin) {
      throw new js._Boot.HaxeError("Error: AngleJoint::jointMin cannot be NaN");
    }
    if (this.zpp_inner_zn.jointMin != jointMin) {
      this.zpp_inner_zn.jointMin = jointMin;
      this.zpp_inner.wake();
    }
    return this.zpp_inner_zn.jointMin;
  };
  Object.defineProperty(nape.constraint.LineJoint.prototype, "jointMax", {
    get: function() { return this.get_jointMax(); },
    set: function(v) { this.set_jointMax(v); },
  });
  nape.constraint.LineJoint.prototype.get_jointMax = function () {
    return this.zpp_inner_zn.jointMax;
  };
  nape.constraint.LineJoint.prototype.set_jointMax = function (jointMax) {
    this.zpp_inner.immutable_midstep("LineJoint::jointMax");
    if (jointMax != jointMax) {
      throw new js._Boot.HaxeError("Error: AngleJoint::jointMax cannot be NaN");
    }
    if (this.zpp_inner_zn.jointMax != jointMax) {
      this.zpp_inner_zn.jointMax = jointMax;
      this.zpp_inner.wake();
    }
    return this.zpp_inner_zn.jointMax;
  };
  nape.constraint.LineJoint.prototype.impulse = function () {
    var ret = new nape.geom.MatMN(2, 1);
    if (0 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new js._Boot.HaxeError("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[0 * ret.zpp_inner.n] = this.zpp_inner_zn.jAccx;
    if (1 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new js._Boot.HaxeError("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[ret.zpp_inner.n] = this.zpp_inner_zn.jAccy;
    return ret;
  };
  nape.constraint.LineJoint.prototype.bodyImpulse = function (body) {
    if (body == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate impulse on null body"
      );
    }
    if (
      body !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) &&
      body != (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer)
    ) {
      throw new js._Boot.HaxeError(
        "Error: Body is not linked to this constraint"
      );
    }
    if (!this.zpp_inner.active) {
      return nape.geom.Vec3.get();
    } else {
      return this.zpp_inner_zn.bodyImpulse(body.zpp_inner);
    }
  };
  nape.constraint.LineJoint.prototype.visitBodies = function (lambda) {
    if (
      (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) != null
    ) {
      lambda(this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer);
    }
    if (
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) !=
        null &&
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer)
    ) {
      lambda(this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer);
    }
  };
  nape.constraint.LineJoint.prototype.__class__ = nape.constraint.LineJoint;
  // nape.constraint.MotorJoint: converted to TypeScript → src/constraint/MotorJoint.ts
  nape.constraint.MotorJoint = $hxClasses["nape.constraint.MotorJoint"] = function() {};
  nape.constraint.MotorJoint.__name__ = ["nape", "constraint", "MotorJoint"];
  nape.constraint.MotorJoint.prototype.__class__ = nape.constraint.MotorJoint;
  nape.constraint.PivotJoint = $hxClasses["nape.constraint.PivotJoint"] =
    function (body1, body2, anchor1, anchor2) {
      this.zpp_inner_zn = null;
      this.zpp_inner_zn = new zpp_nape.constraint.ZPP_PivotJoint();
      this.zpp_inner = this.zpp_inner_zn;
      this.zpp_inner.outer = this;
      this.zpp_inner_zn.outer_zn = this;
      nape.constraint.Constraint.zpp_internalAlloc = true;
      nape.constraint.Constraint.call(this);
      nape.constraint.Constraint.zpp_internalAlloc = false;
      this.zpp_inner.immutable_midstep("Constraint::" + "body1");
      var inbody1 = body1 == null ? null : body1.zpp_inner;
      if (inbody1 != this.zpp_inner_zn.b1) {
        if (this.zpp_inner_zn.b1 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b2 != this.zpp_inner_zn.b1
          ) {
            if (this.zpp_inner_zn.b1 != null) {
              this.zpp_inner_zn.b1.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b1.wake();
          }
        }
        this.zpp_inner_zn.b1 = inbody1;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody1 != null &&
          this.zpp_inner_zn.b2 != inbody1
        ) {
          if (inbody1 != null) {
            inbody1.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody1 != null) {
            inbody1.wake();
          }
        }
      }
      var tmp = this.zpp_inner_zn.b1 == null;
      this.zpp_inner.immutable_midstep("Constraint::" + "body2");
      var inbody2 = body2 == null ? null : body2.zpp_inner;
      if (inbody2 != this.zpp_inner_zn.b2) {
        if (this.zpp_inner_zn.b2 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b1 != this.zpp_inner_zn.b2
          ) {
            if (this.zpp_inner_zn.b2 != null) {
              this.zpp_inner_zn.b2.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b2.wake();
          }
        }
        this.zpp_inner_zn.b2 = inbody2;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody2 != null &&
          this.zpp_inner_zn.b1 != inbody2
        ) {
          if (inbody2 != null) {
            inbody2.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody2 != null) {
            inbody2.wake();
          }
        }
      }
      var tmp1 = this.zpp_inner_zn.b2 == null;
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor1 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor1" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a1 == null) {
        this.zpp_inner_zn.setup_a1();
      }
      var _this = this.zpp_inner_zn.wrap_a1;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this1 = _this.zpp_inner;
      if (_this1._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this1._isimmutable != null) {
        _this1._isimmutable();
      }
      if (anchor1 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this2 = anchor1.zpp_inner;
      if (_this2._validate != null) {
        _this2._validate();
      }
      var x = anchor1.zpp_inner.x;
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this3 = anchor1.zpp_inner;
      if (_this3._validate != null) {
        _this3._validate();
      }
      var y = anchor1.zpp_inner.y;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this4 = _this.zpp_inner;
      if (_this4._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this4._isimmutable != null) {
        _this4._isimmutable();
      }
      if (x != x || y != y) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp2;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this5 = _this.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      if (_this.zpp_inner.x == x) {
        if (_this != null && _this.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this6 = _this.zpp_inner;
        if (_this6._validate != null) {
          _this6._validate();
        }
        tmp2 = _this.zpp_inner.y == y;
      } else {
        tmp2 = false;
      }
      if (!tmp2) {
        _this.zpp_inner.x = x;
        _this.zpp_inner.y = y;
        var _this7 = _this.zpp_inner;
        if (_this7._invalidate != null) {
          _this7._invalidate(_this7);
        }
      }
      var ret = _this;
      if (anchor1.zpp_inner.weak) {
        if (anchor1 != null && anchor1.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this8 = anchor1.zpp_inner;
        if (_this8._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this8._isimmutable != null) {
          _this8._isimmutable();
        }
        if (anchor1.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner = anchor1.zpp_inner;
        anchor1.zpp_inner.outer = null;
        anchor1.zpp_inner = null;
        var o = anchor1;
        o.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o;
        o.zpp_disp = true;
        var o1 = inner;
        if (o1.outer != null) {
          o1.outer.zpp_inner = null;
          o1.outer = null;
        }
        o1._isimmutable = null;
        o1._validate = null;
        o1._invalidate = null;
        o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
      }
      if (this.zpp_inner_zn.wrap_a1 == null) {
        this.zpp_inner_zn.setup_a1();
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor2 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor2" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a2 == null) {
        this.zpp_inner_zn.setup_a2();
      }
      var _this9 = this.zpp_inner_zn.wrap_a2;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this10 = _this9.zpp_inner;
      if (_this10._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this10._isimmutable != null) {
        _this10._isimmutable();
      }
      if (anchor2 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this11 = anchor2.zpp_inner;
      if (_this11._validate != null) {
        _this11._validate();
      }
      var x1 = anchor2.zpp_inner.x;
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this12 = anchor2.zpp_inner;
      if (_this12._validate != null) {
        _this12._validate();
      }
      var y1 = anchor2.zpp_inner.y;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this13 = _this9.zpp_inner;
      if (_this13._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this13._isimmutable != null) {
        _this13._isimmutable();
      }
      if (x1 != x1 || y1 != y1) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp3;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this14 = _this9.zpp_inner;
      if (_this14._validate != null) {
        _this14._validate();
      }
      if (_this9.zpp_inner.x == x1) {
        if (_this9 != null && _this9.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this15 = _this9.zpp_inner;
        if (_this15._validate != null) {
          _this15._validate();
        }
        tmp3 = _this9.zpp_inner.y == y1;
      } else {
        tmp3 = false;
      }
      if (!tmp3) {
        _this9.zpp_inner.x = x1;
        _this9.zpp_inner.y = y1;
        var _this16 = _this9.zpp_inner;
        if (_this16._invalidate != null) {
          _this16._invalidate(_this16);
        }
      }
      var ret1 = _this9;
      if (anchor2.zpp_inner.weak) {
        if (anchor2 != null && anchor2.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this17 = anchor2.zpp_inner;
        if (_this17._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this17._isimmutable != null) {
          _this17._isimmutable();
        }
        if (anchor2.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner1 = anchor2.zpp_inner;
        anchor2.zpp_inner.outer = null;
        anchor2.zpp_inner = null;
        var o2 = anchor2;
        o2.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o2;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o2;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o2;
        o2.zpp_disp = true;
        var o3 = inner1;
        if (o3.outer != null) {
          o3.outer.zpp_inner = null;
          o3.outer = null;
        }
        o3._isimmutable = null;
        o3._validate = null;
        o3._invalidate = null;
        o3.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o3;
      }
      if (this.zpp_inner_zn.wrap_a2 == null) {
        this.zpp_inner_zn.setup_a2();
      }
    };
  nape.constraint.PivotJoint.__name__ = ["nape", "constraint", "PivotJoint"];
  nape.constraint.PivotJoint.__super__ = nape.constraint.Constraint;
  for (var k in nape.constraint.Constraint.prototype)
    nape.constraint.PivotJoint.prototype[k] =
      nape.constraint.Constraint.prototype[k];
  nape.constraint.PivotJoint.prototype.zpp_inner_zn = null;
  Object.defineProperty(nape.constraint.PivotJoint.prototype, "body1", {
    get: function() { return this.get_body1(); },
    set: function(v) { this.set_body1(v); },
  });
  nape.constraint.PivotJoint.prototype.get_body1 = function () {
    if (this.zpp_inner_zn.b1 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b1.outer;
    }
  };
  nape.constraint.PivotJoint.prototype.set_body1 = function (body1) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body1");
    var inbody1 = body1 == null ? null : body1.zpp_inner;
    if (inbody1 != this.zpp_inner_zn.b1) {
      if (this.zpp_inner_zn.b1 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b2 != this.zpp_inner_zn.b1
        ) {
          if (this.zpp_inner_zn.b1 != null) {
            this.zpp_inner_zn.b1.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b1.wake();
        }
      }
      this.zpp_inner_zn.b1 = inbody1;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody1 != null &&
        this.zpp_inner_zn.b2 != inbody1
      ) {
        if (inbody1 != null) {
          inbody1.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody1 != null) {
          inbody1.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b1 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b1.outer;
    }
  };
  Object.defineProperty(nape.constraint.PivotJoint.prototype, "body2", {
    get: function() { return this.get_body2(); },
    set: function(v) { this.set_body2(v); },
  });
  nape.constraint.PivotJoint.prototype.get_body2 = function () {
    if (this.zpp_inner_zn.b2 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b2.outer;
    }
  };
  nape.constraint.PivotJoint.prototype.set_body2 = function (body2) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body2");
    var inbody2 = body2 == null ? null : body2.zpp_inner;
    if (inbody2 != this.zpp_inner_zn.b2) {
      if (this.zpp_inner_zn.b2 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b1 != this.zpp_inner_zn.b2
        ) {
          if (this.zpp_inner_zn.b2 != null) {
            this.zpp_inner_zn.b2.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b2.wake();
        }
      }
      this.zpp_inner_zn.b2 = inbody2;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody2 != null &&
        this.zpp_inner_zn.b1 != inbody2
      ) {
        if (inbody2 != null) {
          inbody2.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody2 != null) {
          inbody2.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b2 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b2.outer;
    }
  };
  Object.defineProperty(nape.constraint.PivotJoint.prototype, "anchor1", {
    get: function() { return this.get_anchor1(); },
    set: function(v) { this.set_anchor1(v); },
  });
  nape.constraint.PivotJoint.prototype.get_anchor1 = function () {
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    return this.zpp_inner_zn.wrap_a1;
  };
  nape.constraint.PivotJoint.prototype.set_anchor1 = function (anchor1) {
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor1 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor1" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    var _this = this.zpp_inner_zn.wrap_a1;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor1 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor1.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor1.zpp_inner.x;
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor1.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor1.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor1.zpp_inner.weak) {
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor1.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor1.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor1.zpp_inner;
      anchor1.zpp_inner.outer = null;
      anchor1.zpp_inner = null;
      var o = anchor1;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    return this.zpp_inner_zn.wrap_a1;
  };
  Object.defineProperty(nape.constraint.PivotJoint.prototype, "anchor2", {
    get: function() { return this.get_anchor2(); },
    set: function(v) { this.set_anchor2(v); },
  });
  nape.constraint.PivotJoint.prototype.get_anchor2 = function () {
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    return this.zpp_inner_zn.wrap_a2;
  };
  nape.constraint.PivotJoint.prototype.set_anchor2 = function (anchor2) {
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor2 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor2" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    var _this = this.zpp_inner_zn.wrap_a2;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor2 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor2.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor2.zpp_inner.x;
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor2.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor2.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor2.zpp_inner.weak) {
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor2.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor2.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor2.zpp_inner;
      anchor2.zpp_inner.outer = null;
      anchor2.zpp_inner = null;
      var o = anchor2;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    return this.zpp_inner_zn.wrap_a2;
  };
  nape.constraint.PivotJoint.prototype.impulse = function () {
    var ret = new nape.geom.MatMN(2, 1);
    if (0 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new js._Boot.HaxeError("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[0 * ret.zpp_inner.n] = this.zpp_inner_zn.jAccx;
    if (1 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new js._Boot.HaxeError("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[ret.zpp_inner.n] = this.zpp_inner_zn.jAccy;
    return ret;
  };
  nape.constraint.PivotJoint.prototype.bodyImpulse = function (body) {
    if (body == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate impulse on null body"
      );
    }
    if (
      body !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) &&
      body != (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer)
    ) {
      throw new js._Boot.HaxeError(
        "Error: Body is not linked to this constraint"
      );
    }
    if (!this.zpp_inner.active) {
      return nape.geom.Vec3.get();
    } else {
      return this.zpp_inner_zn.bodyImpulse(body.zpp_inner);
    }
  };
  nape.constraint.PivotJoint.prototype.visitBodies = function (lambda) {
    if (
      (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) != null
    ) {
      lambda(this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer);
    }
    if (
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) !=
        null &&
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer)
    ) {
      lambda(this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer);
    }
  };
  nape.constraint.PivotJoint.prototype.__class__ = nape.constraint.PivotJoint;
  nape.constraint.PulleyJoint = $hxClasses["nape.constraint.PulleyJoint"] =
    function (
      body1,
      body2,
      body3,
      body4,
      anchor1,
      anchor2,
      anchor3,
      anchor4,
      jointMin,
      jointMax,
      ratio
    ) {
      if (ratio == null) {
        ratio = 1.0;
      }
      this.zpp_inner_zn = null;
      this.zpp_inner_zn = new zpp_nape.constraint.ZPP_PulleyJoint();
      this.zpp_inner = this.zpp_inner_zn;
      this.zpp_inner.outer = this;
      this.zpp_inner_zn.outer_zn = this;
      nape.constraint.Constraint.zpp_internalAlloc = true;
      nape.constraint.Constraint.call(this);
      nape.constraint.Constraint.zpp_internalAlloc = false;
      this.zpp_inner.immutable_midstep("Constraint::" + "body1");
      var inbody1 = body1 == null ? null : body1.zpp_inner;
      if (inbody1 != this.zpp_inner_zn.b1) {
        if (this.zpp_inner_zn.b1 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b2 != this.zpp_inner_zn.b1 &&
            this.zpp_inner_zn.b3 != this.zpp_inner_zn.b1 &&
            this.zpp_inner_zn.b4 != this.zpp_inner_zn.b1
          ) {
            if (this.zpp_inner_zn.b1 != null) {
              this.zpp_inner_zn.b1.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b1.wake();
          }
        }
        this.zpp_inner_zn.b1 = inbody1;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody1 != null &&
          this.zpp_inner_zn.b2 != inbody1 &&
          this.zpp_inner_zn.b3 != inbody1 &&
          this.zpp_inner_zn.b4 != inbody1
        ) {
          if (inbody1 != null) {
            inbody1.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody1 != null) {
            inbody1.wake();
          }
        }
      }
      var tmp = this.zpp_inner_zn.b1 == null;
      this.zpp_inner.immutable_midstep("Constraint::" + "body2");
      var inbody2 = body2 == null ? null : body2.zpp_inner;
      if (inbody2 != this.zpp_inner_zn.b2) {
        if (this.zpp_inner_zn.b2 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b1 != this.zpp_inner_zn.b2 &&
            this.zpp_inner_zn.b3 != this.zpp_inner_zn.b2 &&
            this.zpp_inner_zn.b4 != this.zpp_inner_zn.b2
          ) {
            if (this.zpp_inner_zn.b2 != null) {
              this.zpp_inner_zn.b2.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b2.wake();
          }
        }
        this.zpp_inner_zn.b2 = inbody2;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody2 != null &&
          this.zpp_inner_zn.b1 != inbody2 &&
          this.zpp_inner_zn.b3 != inbody2 &&
          this.zpp_inner_zn.b4 != inbody2
        ) {
          if (inbody2 != null) {
            inbody2.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody2 != null) {
            inbody2.wake();
          }
        }
      }
      var tmp1 = this.zpp_inner_zn.b2 == null;
      this.zpp_inner.immutable_midstep("Constraint::" + "body3");
      var inbody3 = body3 == null ? null : body3.zpp_inner;
      if (inbody3 != this.zpp_inner_zn.b3) {
        if (this.zpp_inner_zn.b3 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b1 != this.zpp_inner_zn.b3 &&
            this.zpp_inner_zn.b2 != this.zpp_inner_zn.b3 &&
            this.zpp_inner_zn.b4 != this.zpp_inner_zn.b3
          ) {
            if (this.zpp_inner_zn.b3 != null) {
              this.zpp_inner_zn.b3.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b3.wake();
          }
        }
        this.zpp_inner_zn.b3 = inbody3;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody3 != null &&
          this.zpp_inner_zn.b1 != inbody3 &&
          this.zpp_inner_zn.b2 != inbody3 &&
          this.zpp_inner_zn.b4 != inbody3
        ) {
          if (inbody3 != null) {
            inbody3.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody3 != null) {
            inbody3.wake();
          }
        }
      }
      var tmp2 = this.zpp_inner_zn.b3 == null;
      this.zpp_inner.immutable_midstep("Constraint::" + "body4");
      var inbody4 = body4 == null ? null : body4.zpp_inner;
      if (inbody4 != this.zpp_inner_zn.b4) {
        if (this.zpp_inner_zn.b4 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b1 != this.zpp_inner_zn.b4 &&
            this.zpp_inner_zn.b2 != this.zpp_inner_zn.b4 &&
            this.zpp_inner_zn.b3 != this.zpp_inner_zn.b4
          ) {
            if (this.zpp_inner_zn.b4 != null) {
              this.zpp_inner_zn.b4.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b4.wake();
          }
        }
        this.zpp_inner_zn.b4 = inbody4;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody4 != null &&
          this.zpp_inner_zn.b1 != inbody4 &&
          this.zpp_inner_zn.b2 != inbody4 &&
          this.zpp_inner_zn.b3 != inbody4
        ) {
          if (inbody4 != null) {
            inbody4.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody4 != null) {
            inbody4.wake();
          }
        }
      }
      var tmp3 = this.zpp_inner_zn.b4 == null;
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor1 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor1" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a1 == null) {
        this.zpp_inner_zn.setup_a1();
      }
      var _this = this.zpp_inner_zn.wrap_a1;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this1 = _this.zpp_inner;
      if (_this1._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this1._isimmutable != null) {
        _this1._isimmutable();
      }
      if (anchor1 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this2 = anchor1.zpp_inner;
      if (_this2._validate != null) {
        _this2._validate();
      }
      var x = anchor1.zpp_inner.x;
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this3 = anchor1.zpp_inner;
      if (_this3._validate != null) {
        _this3._validate();
      }
      var y = anchor1.zpp_inner.y;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this4 = _this.zpp_inner;
      if (_this4._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this4._isimmutable != null) {
        _this4._isimmutable();
      }
      if (x != x || y != y) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp4;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this5 = _this.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      if (_this.zpp_inner.x == x) {
        if (_this != null && _this.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this6 = _this.zpp_inner;
        if (_this6._validate != null) {
          _this6._validate();
        }
        tmp4 = _this.zpp_inner.y == y;
      } else {
        tmp4 = false;
      }
      if (!tmp4) {
        _this.zpp_inner.x = x;
        _this.zpp_inner.y = y;
        var _this7 = _this.zpp_inner;
        if (_this7._invalidate != null) {
          _this7._invalidate(_this7);
        }
      }
      var ret = _this;
      if (anchor1.zpp_inner.weak) {
        if (anchor1 != null && anchor1.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this8 = anchor1.zpp_inner;
        if (_this8._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this8._isimmutable != null) {
          _this8._isimmutable();
        }
        if (anchor1.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner = anchor1.zpp_inner;
        anchor1.zpp_inner.outer = null;
        anchor1.zpp_inner = null;
        var o = anchor1;
        o.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o;
        o.zpp_disp = true;
        var o1 = inner;
        if (o1.outer != null) {
          o1.outer.zpp_inner = null;
          o1.outer = null;
        }
        o1._isimmutable = null;
        o1._validate = null;
        o1._invalidate = null;
        o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
      }
      if (this.zpp_inner_zn.wrap_a1 == null) {
        this.zpp_inner_zn.setup_a1();
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor2 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor2" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a2 == null) {
        this.zpp_inner_zn.setup_a2();
      }
      var _this9 = this.zpp_inner_zn.wrap_a2;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this10 = _this9.zpp_inner;
      if (_this10._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this10._isimmutable != null) {
        _this10._isimmutable();
      }
      if (anchor2 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this11 = anchor2.zpp_inner;
      if (_this11._validate != null) {
        _this11._validate();
      }
      var x1 = anchor2.zpp_inner.x;
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this12 = anchor2.zpp_inner;
      if (_this12._validate != null) {
        _this12._validate();
      }
      var y1 = anchor2.zpp_inner.y;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this13 = _this9.zpp_inner;
      if (_this13._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this13._isimmutable != null) {
        _this13._isimmutable();
      }
      if (x1 != x1 || y1 != y1) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp5;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this14 = _this9.zpp_inner;
      if (_this14._validate != null) {
        _this14._validate();
      }
      if (_this9.zpp_inner.x == x1) {
        if (_this9 != null && _this9.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this15 = _this9.zpp_inner;
        if (_this15._validate != null) {
          _this15._validate();
        }
        tmp5 = _this9.zpp_inner.y == y1;
      } else {
        tmp5 = false;
      }
      if (!tmp5) {
        _this9.zpp_inner.x = x1;
        _this9.zpp_inner.y = y1;
        var _this16 = _this9.zpp_inner;
        if (_this16._invalidate != null) {
          _this16._invalidate(_this16);
        }
      }
      var ret1 = _this9;
      if (anchor2.zpp_inner.weak) {
        if (anchor2 != null && anchor2.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this17 = anchor2.zpp_inner;
        if (_this17._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this17._isimmutable != null) {
          _this17._isimmutable();
        }
        if (anchor2.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner1 = anchor2.zpp_inner;
        anchor2.zpp_inner.outer = null;
        anchor2.zpp_inner = null;
        var o2 = anchor2;
        o2.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o2;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o2;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o2;
        o2.zpp_disp = true;
        var o3 = inner1;
        if (o3.outer != null) {
          o3.outer.zpp_inner = null;
          o3.outer = null;
        }
        o3._isimmutable = null;
        o3._validate = null;
        o3._invalidate = null;
        o3.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o3;
      }
      if (this.zpp_inner_zn.wrap_a2 == null) {
        this.zpp_inner_zn.setup_a2();
      }
      if (anchor3 != null && anchor3.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor3 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor3" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a3 == null) {
        this.zpp_inner_zn.setup_a3();
      }
      var _this18 = this.zpp_inner_zn.wrap_a3;
      if (_this18 != null && _this18.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor3 != null && anchor3.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this19 = _this18.zpp_inner;
      if (_this19._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this19._isimmutable != null) {
        _this19._isimmutable();
      }
      if (anchor3 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor3 != null && anchor3.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this20 = anchor3.zpp_inner;
      if (_this20._validate != null) {
        _this20._validate();
      }
      var x2 = anchor3.zpp_inner.x;
      if (anchor3 != null && anchor3.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this21 = anchor3.zpp_inner;
      if (_this21._validate != null) {
        _this21._validate();
      }
      var y2 = anchor3.zpp_inner.y;
      if (_this18 != null && _this18.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this22 = _this18.zpp_inner;
      if (_this22._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this22._isimmutable != null) {
        _this22._isimmutable();
      }
      if (x2 != x2 || y2 != y2) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp6;
      if (_this18 != null && _this18.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this23 = _this18.zpp_inner;
      if (_this23._validate != null) {
        _this23._validate();
      }
      if (_this18.zpp_inner.x == x2) {
        if (_this18 != null && _this18.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this24 = _this18.zpp_inner;
        if (_this24._validate != null) {
          _this24._validate();
        }
        tmp6 = _this18.zpp_inner.y == y2;
      } else {
        tmp6 = false;
      }
      if (!tmp6) {
        _this18.zpp_inner.x = x2;
        _this18.zpp_inner.y = y2;
        var _this25 = _this18.zpp_inner;
        if (_this25._invalidate != null) {
          _this25._invalidate(_this25);
        }
      }
      var ret2 = _this18;
      if (anchor3.zpp_inner.weak) {
        if (anchor3 != null && anchor3.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this26 = anchor3.zpp_inner;
        if (_this26._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this26._isimmutable != null) {
          _this26._isimmutable();
        }
        if (anchor3.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner2 = anchor3.zpp_inner;
        anchor3.zpp_inner.outer = null;
        anchor3.zpp_inner = null;
        var o4 = anchor3;
        o4.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o4;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o4;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o4;
        o4.zpp_disp = true;
        var o5 = inner2;
        if (o5.outer != null) {
          o5.outer.zpp_inner = null;
          o5.outer = null;
        }
        o5._isimmutable = null;
        o5._validate = null;
        o5._invalidate = null;
        o5.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o5;
      }
      if (this.zpp_inner_zn.wrap_a3 == null) {
        this.zpp_inner_zn.setup_a3();
      }
      if (anchor4 != null && anchor4.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor4 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor4" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a4 == null) {
        this.zpp_inner_zn.setup_a4();
      }
      var _this27 = this.zpp_inner_zn.wrap_a4;
      if (_this27 != null && _this27.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor4 != null && anchor4.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this28 = _this27.zpp_inner;
      if (_this28._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this28._isimmutable != null) {
        _this28._isimmutable();
      }
      if (anchor4 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor4 != null && anchor4.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this29 = anchor4.zpp_inner;
      if (_this29._validate != null) {
        _this29._validate();
      }
      var x3 = anchor4.zpp_inner.x;
      if (anchor4 != null && anchor4.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this30 = anchor4.zpp_inner;
      if (_this30._validate != null) {
        _this30._validate();
      }
      var y3 = anchor4.zpp_inner.y;
      if (_this27 != null && _this27.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this31 = _this27.zpp_inner;
      if (_this31._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this31._isimmutable != null) {
        _this31._isimmutable();
      }
      if (x3 != x3 || y3 != y3) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp7;
      if (_this27 != null && _this27.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this32 = _this27.zpp_inner;
      if (_this32._validate != null) {
        _this32._validate();
      }
      if (_this27.zpp_inner.x == x3) {
        if (_this27 != null && _this27.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this33 = _this27.zpp_inner;
        if (_this33._validate != null) {
          _this33._validate();
        }
        tmp7 = _this27.zpp_inner.y == y3;
      } else {
        tmp7 = false;
      }
      if (!tmp7) {
        _this27.zpp_inner.x = x3;
        _this27.zpp_inner.y = y3;
        var _this34 = _this27.zpp_inner;
        if (_this34._invalidate != null) {
          _this34._invalidate(_this34);
        }
      }
      var ret3 = _this27;
      if (anchor4.zpp_inner.weak) {
        if (anchor4 != null && anchor4.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this35 = anchor4.zpp_inner;
        if (_this35._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this35._isimmutable != null) {
          _this35._isimmutable();
        }
        if (anchor4.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner3 = anchor4.zpp_inner;
        anchor4.zpp_inner.outer = null;
        anchor4.zpp_inner = null;
        var o6 = anchor4;
        o6.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o6;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o6;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o6;
        o6.zpp_disp = true;
        var o7 = inner3;
        if (o7.outer != null) {
          o7.outer.zpp_inner = null;
          o7.outer = null;
        }
        o7._isimmutable = null;
        o7._validate = null;
        o7._invalidate = null;
        o7.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o7;
      }
      if (this.zpp_inner_zn.wrap_a4 == null) {
        this.zpp_inner_zn.setup_a4();
      }
      this.zpp_inner.immutable_midstep("PulleyJoint::ratio");
      if (ratio != ratio) {
        throw new js._Boot.HaxeError("Error: PulleyJoint::ratio cannot be NaN");
      }
      if (this.zpp_inner_zn.ratio != ratio) {
        this.zpp_inner_zn.ratio = ratio;
        this.zpp_inner.wake();
      }
      this.zpp_inner.immutable_midstep("PulleyJoint::jointMin");
      if (jointMin != jointMin) {
        throw new js._Boot.HaxeError(
          "Error: PulleyJoint::jointMin cannot be NaN"
        );
      }
      if (jointMin < 0) {
        throw new js._Boot.HaxeError(
          "Error: PulleyJoint::jointMin must be >= 0"
        );
      }
      if (this.zpp_inner_zn.jointMin != jointMin) {
        this.zpp_inner_zn.jointMin = jointMin;
        this.zpp_inner.wake();
      }
      this.zpp_inner.immutable_midstep("PulleyJoint::jointMax");
      if (jointMax != jointMax) {
        throw new js._Boot.HaxeError(
          "Error: PulleyJoint::jointMax cannot be NaN"
        );
      }
      if (jointMax < 0) {
        throw new js._Boot.HaxeError(
          "Error: PulleyJoint::jointMax must be >= 0"
        );
      }
      if (this.zpp_inner_zn.jointMax != jointMax) {
        this.zpp_inner_zn.jointMax = jointMax;
        this.zpp_inner.wake();
      }
    };
  nape.constraint.PulleyJoint.__name__ = ["nape", "constraint", "PulleyJoint"];
  nape.constraint.PulleyJoint.__super__ = nape.constraint.Constraint;
  for (var k in nape.constraint.Constraint.prototype)
    nape.constraint.PulleyJoint.prototype[k] =
      nape.constraint.Constraint.prototype[k];
  nape.constraint.PulleyJoint.prototype.zpp_inner_zn = null;
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "body1", {
    get: function() { return this.get_body1(); },
    set: function(v) { this.set_body1(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_body1 = function () {
    if (this.zpp_inner_zn.b1 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b1.outer;
    }
  };
  nape.constraint.PulleyJoint.prototype.set_body1 = function (body1) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body1");
    var inbody1 = body1 == null ? null : body1.zpp_inner;
    if (inbody1 != this.zpp_inner_zn.b1) {
      if (this.zpp_inner_zn.b1 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b2 != this.zpp_inner_zn.b1 &&
          this.zpp_inner_zn.b3 != this.zpp_inner_zn.b1 &&
          this.zpp_inner_zn.b4 != this.zpp_inner_zn.b1
        ) {
          if (this.zpp_inner_zn.b1 != null) {
            this.zpp_inner_zn.b1.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b1.wake();
        }
      }
      this.zpp_inner_zn.b1 = inbody1;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody1 != null &&
        this.zpp_inner_zn.b2 != inbody1 &&
        this.zpp_inner_zn.b3 != inbody1 &&
        this.zpp_inner_zn.b4 != inbody1
      ) {
        if (inbody1 != null) {
          inbody1.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody1 != null) {
          inbody1.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b1 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b1.outer;
    }
  };
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "body2", {
    get: function() { return this.get_body2(); },
    set: function(v) { this.set_body2(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_body2 = function () {
    if (this.zpp_inner_zn.b2 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b2.outer;
    }
  };
  nape.constraint.PulleyJoint.prototype.set_body2 = function (body2) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body2");
    var inbody2 = body2 == null ? null : body2.zpp_inner;
    if (inbody2 != this.zpp_inner_zn.b2) {
      if (this.zpp_inner_zn.b2 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b1 != this.zpp_inner_zn.b2 &&
          this.zpp_inner_zn.b3 != this.zpp_inner_zn.b2 &&
          this.zpp_inner_zn.b4 != this.zpp_inner_zn.b2
        ) {
          if (this.zpp_inner_zn.b2 != null) {
            this.zpp_inner_zn.b2.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b2.wake();
        }
      }
      this.zpp_inner_zn.b2 = inbody2;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody2 != null &&
        this.zpp_inner_zn.b1 != inbody2 &&
        this.zpp_inner_zn.b3 != inbody2 &&
        this.zpp_inner_zn.b4 != inbody2
      ) {
        if (inbody2 != null) {
          inbody2.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody2 != null) {
          inbody2.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b2 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b2.outer;
    }
  };
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "body3", {
    get: function() { return this.get_body3(); },
    set: function(v) { this.set_body3(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_body3 = function () {
    if (this.zpp_inner_zn.b3 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b3.outer;
    }
  };
  nape.constraint.PulleyJoint.prototype.set_body3 = function (body3) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body3");
    var inbody3 = body3 == null ? null : body3.zpp_inner;
    if (inbody3 != this.zpp_inner_zn.b3) {
      if (this.zpp_inner_zn.b3 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b1 != this.zpp_inner_zn.b3 &&
          this.zpp_inner_zn.b2 != this.zpp_inner_zn.b3 &&
          this.zpp_inner_zn.b4 != this.zpp_inner_zn.b3
        ) {
          if (this.zpp_inner_zn.b3 != null) {
            this.zpp_inner_zn.b3.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b3.wake();
        }
      }
      this.zpp_inner_zn.b3 = inbody3;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody3 != null &&
        this.zpp_inner_zn.b1 != inbody3 &&
        this.zpp_inner_zn.b2 != inbody3 &&
        this.zpp_inner_zn.b4 != inbody3
      ) {
        if (inbody3 != null) {
          inbody3.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody3 != null) {
          inbody3.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b3 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b3.outer;
    }
  };
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "body4", {
    get: function() { return this.get_body4(); },
    set: function(v) { this.set_body4(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_body4 = function () {
    if (this.zpp_inner_zn.b4 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b4.outer;
    }
  };
  nape.constraint.PulleyJoint.prototype.set_body4 = function (body4) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body4");
    var inbody4 = body4 == null ? null : body4.zpp_inner;
    if (inbody4 != this.zpp_inner_zn.b4) {
      if (this.zpp_inner_zn.b4 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b1 != this.zpp_inner_zn.b4 &&
          this.zpp_inner_zn.b2 != this.zpp_inner_zn.b4 &&
          this.zpp_inner_zn.b3 != this.zpp_inner_zn.b4
        ) {
          if (this.zpp_inner_zn.b4 != null) {
            this.zpp_inner_zn.b4.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b4.wake();
        }
      }
      this.zpp_inner_zn.b4 = inbody4;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody4 != null &&
        this.zpp_inner_zn.b1 != inbody4 &&
        this.zpp_inner_zn.b2 != inbody4 &&
        this.zpp_inner_zn.b3 != inbody4
      ) {
        if (inbody4 != null) {
          inbody4.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody4 != null) {
          inbody4.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b4 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b4.outer;
    }
  };
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "anchor1", {
    get: function() { return this.get_anchor1(); },
    set: function(v) { this.set_anchor1(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_anchor1 = function () {
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    return this.zpp_inner_zn.wrap_a1;
  };
  nape.constraint.PulleyJoint.prototype.set_anchor1 = function (anchor1) {
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor1 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor1" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    var _this = this.zpp_inner_zn.wrap_a1;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor1 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor1.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor1.zpp_inner.x;
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor1.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor1.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor1.zpp_inner.weak) {
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor1.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor1.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor1.zpp_inner;
      anchor1.zpp_inner.outer = null;
      anchor1.zpp_inner = null;
      var o = anchor1;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    return this.zpp_inner_zn.wrap_a1;
  };
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "anchor2", {
    get: function() { return this.get_anchor2(); },
    set: function(v) { this.set_anchor2(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_anchor2 = function () {
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    return this.zpp_inner_zn.wrap_a2;
  };
  nape.constraint.PulleyJoint.prototype.set_anchor2 = function (anchor2) {
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor2 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor2" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    var _this = this.zpp_inner_zn.wrap_a2;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor2 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor2.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor2.zpp_inner.x;
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor2.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor2.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor2.zpp_inner.weak) {
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor2.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor2.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor2.zpp_inner;
      anchor2.zpp_inner.outer = null;
      anchor2.zpp_inner = null;
      var o = anchor2;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    return this.zpp_inner_zn.wrap_a2;
  };
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "anchor3", {
    get: function() { return this.get_anchor3(); },
    set: function(v) { this.set_anchor3(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_anchor3 = function () {
    if (this.zpp_inner_zn.wrap_a3 == null) {
      this.zpp_inner_zn.setup_a3();
    }
    return this.zpp_inner_zn.wrap_a3;
  };
  nape.constraint.PulleyJoint.prototype.set_anchor3 = function (anchor3) {
    if (anchor3 != null && anchor3.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor3 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor3" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a3 == null) {
      this.zpp_inner_zn.setup_a3();
    }
    var _this = this.zpp_inner_zn.wrap_a3;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor3 != null && anchor3.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor3 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor3 != null && anchor3.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor3.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor3.zpp_inner.x;
    if (anchor3 != null && anchor3.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor3.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor3.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor3.zpp_inner.weak) {
      if (anchor3 != null && anchor3.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor3.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor3.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor3.zpp_inner;
      anchor3.zpp_inner.outer = null;
      anchor3.zpp_inner = null;
      var o = anchor3;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a3 == null) {
      this.zpp_inner_zn.setup_a3();
    }
    return this.zpp_inner_zn.wrap_a3;
  };
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "anchor4", {
    get: function() { return this.get_anchor4(); },
    set: function(v) { this.set_anchor4(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_anchor4 = function () {
    if (this.zpp_inner_zn.wrap_a4 == null) {
      this.zpp_inner_zn.setup_a4();
    }
    return this.zpp_inner_zn.wrap_a4;
  };
  nape.constraint.PulleyJoint.prototype.set_anchor4 = function (anchor4) {
    if (anchor4 != null && anchor4.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor4 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor4" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a4 == null) {
      this.zpp_inner_zn.setup_a4();
    }
    var _this = this.zpp_inner_zn.wrap_a4;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor4 != null && anchor4.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor4 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor4 != null && anchor4.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor4.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor4.zpp_inner.x;
    if (anchor4 != null && anchor4.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor4.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor4.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor4.zpp_inner.weak) {
      if (anchor4 != null && anchor4.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor4.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor4.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor4.zpp_inner;
      anchor4.zpp_inner.outer = null;
      anchor4.zpp_inner = null;
      var o = anchor4;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a4 == null) {
      this.zpp_inner_zn.setup_a4();
    }
    return this.zpp_inner_zn.wrap_a4;
  };
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "jointMin", {
    get: function() { return this.get_jointMin(); },
    set: function(v) { this.set_jointMin(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_jointMin = function () {
    return this.zpp_inner_zn.jointMin;
  };
  nape.constraint.PulleyJoint.prototype.set_jointMin = function (jointMin) {
    this.zpp_inner.immutable_midstep("PulleyJoint::jointMin");
    if (jointMin != jointMin) {
      throw new js._Boot.HaxeError(
        "Error: PulleyJoint::jointMin cannot be NaN"
      );
    }
    if (jointMin < 0) {
      throw new js._Boot.HaxeError("Error: PulleyJoint::jointMin must be >= 0");
    }
    if (this.zpp_inner_zn.jointMin != jointMin) {
      this.zpp_inner_zn.jointMin = jointMin;
      this.zpp_inner.wake();
    }
    return this.zpp_inner_zn.jointMin;
  };
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "jointMax", {
    get: function() { return this.get_jointMax(); },
    set: function(v) { this.set_jointMax(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_jointMax = function () {
    return this.zpp_inner_zn.jointMax;
  };
  nape.constraint.PulleyJoint.prototype.set_jointMax = function (jointMax) {
    this.zpp_inner.immutable_midstep("PulleyJoint::jointMax");
    if (jointMax != jointMax) {
      throw new js._Boot.HaxeError(
        "Error: PulleyJoint::jointMax cannot be NaN"
      );
    }
    if (jointMax < 0) {
      throw new js._Boot.HaxeError("Error: PulleyJoint::jointMax must be >= 0");
    }
    if (this.zpp_inner_zn.jointMax != jointMax) {
      this.zpp_inner_zn.jointMax = jointMax;
      this.zpp_inner.wake();
    }
    return this.zpp_inner_zn.jointMax;
  };
  Object.defineProperty(nape.constraint.PulleyJoint.prototype, "ratio", {
    get: function() { return this.get_ratio(); },
    set: function(v) { this.set_ratio(v); },
  });
  nape.constraint.PulleyJoint.prototype.get_ratio = function () {
    return this.zpp_inner_zn.ratio;
  };
  nape.constraint.PulleyJoint.prototype.set_ratio = function (ratio) {
    this.zpp_inner.immutable_midstep("PulleyJoint::ratio");
    if (ratio != ratio) {
      throw new js._Boot.HaxeError("Error: PulleyJoint::ratio cannot be NaN");
    }
    if (this.zpp_inner_zn.ratio != ratio) {
      this.zpp_inner_zn.ratio = ratio;
      this.zpp_inner.wake();
    }
    return this.zpp_inner_zn.ratio;
  };
  nape.constraint.PulleyJoint.prototype.isSlack = function () {
    if (
      (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) ==
        null ||
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) ==
        null ||
      (this.zpp_inner_zn.b3 == null ? null : this.zpp_inner_zn.b3.outer) ==
        null ||
      (this.zpp_inner_zn.b4 == null ? null : this.zpp_inner_zn.b4.outer) == null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Cannot compute slack for PulleyJoint if either body is null."
      );
    }
    return this.zpp_inner_zn.slack;
  };
  nape.constraint.PulleyJoint.prototype.impulse = function () {
    var ret = new nape.geom.MatMN(1, 1);
    if (0 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new js._Boot.HaxeError("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[0 * ret.zpp_inner.n] = this.zpp_inner_zn.jAcc;
    return ret;
  };
  nape.constraint.PulleyJoint.prototype.bodyImpulse = function (body) {
    if (body == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate impulse on null body"
      );
    }
    if (
      body !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) &&
      body !=
        (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) &&
      body !=
        (this.zpp_inner_zn.b3 == null ? null : this.zpp_inner_zn.b3.outer) &&
      body != (this.zpp_inner_zn.b4 == null ? null : this.zpp_inner_zn.b4.outer)
    ) {
      throw new js._Boot.HaxeError(
        "Error: Body is not linked to this constraint"
      );
    }
    if (!this.zpp_inner.active) {
      return nape.geom.Vec3.get();
    } else {
      return this.zpp_inner_zn.bodyImpulse(body.zpp_inner);
    }
  };
  nape.constraint.PulleyJoint.prototype.visitBodies = function (lambda) {
    if (
      (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) != null
    ) {
      lambda(this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer);
    }
    if (
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) !=
        null &&
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer)
    ) {
      lambda(this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer);
    }
    if (
      (this.zpp_inner_zn.b3 == null ? null : this.zpp_inner_zn.b3.outer) !=
        null &&
      (this.zpp_inner_zn.b3 == null ? null : this.zpp_inner_zn.b3.outer) !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) &&
      (this.zpp_inner_zn.b3 == null ? null : this.zpp_inner_zn.b3.outer) !=
        (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer)
    ) {
      lambda(this.zpp_inner_zn.b3 == null ? null : this.zpp_inner_zn.b3.outer);
    }
    if (
      (this.zpp_inner_zn.b4 == null ? null : this.zpp_inner_zn.b4.outer) !=
        null &&
      (this.zpp_inner_zn.b4 == null ? null : this.zpp_inner_zn.b4.outer) !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) &&
      (this.zpp_inner_zn.b4 == null ? null : this.zpp_inner_zn.b4.outer) !=
        (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) &&
      (this.zpp_inner_zn.b4 == null ? null : this.zpp_inner_zn.b4.outer) !=
        (this.zpp_inner_zn.b3 == null ? null : this.zpp_inner_zn.b3.outer)
    ) {
      lambda(this.zpp_inner_zn.b4 == null ? null : this.zpp_inner_zn.b4.outer);
    }
  };
  nape.constraint.PulleyJoint.prototype.__class__ = nape.constraint.PulleyJoint;
  nape.constraint.UserConstraint = $hxClasses[
    "nape.constraint.UserConstraint"
  ] = function (dimensions, velocityOnly) {
    if (velocityOnly == null) {
      velocityOnly = false;
    }
    this.zpp_inner_zn = null;
    if (dimensions < 1) {
      throw new js._Boot.HaxeError(
        "Error: Constraint dimension must be at least 1"
      );
    }
    this.zpp_inner_zn = new zpp_nape.constraint.ZPP_UserConstraint(
      dimensions,
      velocityOnly
    );
    this.zpp_inner = this.zpp_inner_zn;
    this.zpp_inner.outer = this;
    this.zpp_inner_zn.outer_zn = this;
    nape.constraint.Constraint.zpp_internalAlloc = true;
    nape.constraint.Constraint.call(this);
    nape.constraint.Constraint.zpp_internalAlloc = false;
  };
  nape.constraint.UserConstraint.__name__ = [
    "nape",
    "constraint",
    "UserConstraint",
  ];
  nape.constraint.UserConstraint.__super__ = nape.constraint.Constraint;
  for (var k in nape.constraint.Constraint.prototype)
    nape.constraint.UserConstraint.prototype[k] =
      nape.constraint.Constraint.prototype[k];
  nape.constraint.UserConstraint.prototype.zpp_inner_zn = null;
  nape.constraint.UserConstraint.prototype.__bindVec2 = function () {
    var ret = new nape.geom.Vec2();
    ret.zpp_inner._inuse = true;
    ret.zpp_inner._invalidate =
      (($_ = this.zpp_inner_zn), $bind($_, $_.bindVec2_invalidate));
    return ret;
  };
  nape.constraint.UserConstraint.prototype.__copy = function () {
    throw new js._Boot.HaxeError(
      "Error: UserConstraint::__copy must be overriden"
    );
  };
  nape.constraint.UserConstraint.prototype.__broken = function () {};
  nape.constraint.UserConstraint.prototype.__validate = function () {};
  nape.constraint.UserConstraint.prototype.__draw = function (debug) {};
  nape.constraint.UserConstraint.prototype.__prepare = function () {};
  nape.constraint.UserConstraint.prototype.__position = function (err) {
    throw new js._Boot.HaxeError(
      "Error: UserConstraint::__position must be overriden"
    );
  };
  nape.constraint.UserConstraint.prototype.__velocity = function (err) {
    throw new js._Boot.HaxeError(
      "Error: Userconstraint::__velocity must be overriden"
    );
  };
  nape.constraint.UserConstraint.prototype.__eff_mass = function (eff) {
    throw new js._Boot.HaxeError(
      "Error: UserConstraint::__eff_mass must be overriden"
    );
  };
  nape.constraint.UserConstraint.prototype.__clamp = function (jAcc) {};
  nape.constraint.UserConstraint.prototype.__impulse = function (
    imp,
    body,
    out
  ) {
    throw new js._Boot.HaxeError(
      "Error: UserConstraint::__impulse must be overriden"
    );
  };
  nape.constraint.UserConstraint.prototype.impulse = function () {
    var ret = new nape.geom.MatMN(this.zpp_inner_zn.dim, 1);
    var _g = 0;
    var _g1 = this.zpp_inner_zn.dim;
    while (_g < _g1) {
      var i = _g++;
      if (i < 0 || i >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
        throw new js._Boot.HaxeError("Error: MatMN indices out of range");
      }
      ret.zpp_inner.x[i * ret.zpp_inner.n] = this.zpp_inner_zn.jAcc[i];
    }
    return ret;
  };
  nape.constraint.UserConstraint.prototype.bodyImpulse = function (body) {
    if (body == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate impulse on null body"
      );
    }
    var found = false;
    var _g = 0;
    var _g1 = this.zpp_inner_zn.bodies;
    while (_g < _g1.length) {
      var b = _g1[_g];
      ++_g;
      if (b.body == body.zpp_inner) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw new js._Boot.HaxeError(
        "Error: Body is not linked to this constraint"
      );
    }
    if (!this.zpp_inner.active) {
      return nape.geom.Vec3.get();
    } else {
      return this.zpp_inner_zn.bodyImpulse(body.zpp_inner);
    }
  };
  nape.constraint.UserConstraint.prototype.visitBodies = function (lambda) {
    var i = 0;
    var nbodies = this.zpp_inner_zn.bodies.length;
    while (i < nbodies) {
      var b = this.zpp_inner_zn.bodies[i];
      if (b.body != null) {
        var found = false;
        var _g = i + 1;
        var _g1 = nbodies;
        while (_g < _g1) {
          var j = _g++;
          var c = this.zpp_inner_zn.bodies[j];
          if (c.body == b.body) {
            found = true;
            break;
          }
        }
        if (!found) {
          lambda(b.body.outer);
        }
      }
      ++i;
    }
  };
  nape.constraint.UserConstraint.prototype.__invalidate = function () {
    this.zpp_inner.immutable_midstep("UserConstraint::invalidate()");
    if (
      this.zpp_inner.active &&
      (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) != null
    ) {
      this.zpp_inner.wake();
    }
  };
  nape.constraint.UserConstraint.prototype.__registerBody = function (
    oldBody,
    newBody
  ) {
    this.zpp_inner.immutable_midstep("UserConstraint::registerBody(..)");
    if (oldBody != newBody) {
      if (oldBody != null) {
        if (!this.zpp_inner_zn.remBody(oldBody.zpp_inner)) {
          throw new js._Boot.HaxeError(
            "Error: oldBody is not registered to the cosntraint"
          );
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          oldBody.zpp_inner.wake();
        }
      }
      if (newBody != null) {
        this.zpp_inner_zn.addBody(newBody.zpp_inner);
      }
      this.zpp_inner.wake();
      if (newBody != null) {
        newBody.zpp_inner.wake();
      }
    }
    return newBody;
  };
  nape.constraint.UserConstraint.prototype.__class__ =
    nape.constraint.UserConstraint;
  nape.constraint.WeldJoint = $hxClasses["nape.constraint.WeldJoint"] =
    function (body1, body2, anchor1, anchor2, phase) {
      if (phase == null) {
        phase = 0.0;
      }
      this.zpp_inner_zn = null;
      this.zpp_inner_zn = new zpp_nape.constraint.ZPP_WeldJoint();
      this.zpp_inner = this.zpp_inner_zn;
      this.zpp_inner.outer = this;
      this.zpp_inner_zn.outer_zn = this;
      nape.constraint.Constraint.zpp_internalAlloc = true;
      nape.constraint.Constraint.call(this);
      nape.constraint.Constraint.zpp_internalAlloc = false;
      this.zpp_inner.immutable_midstep("Constraint::" + "body1");
      var inbody1 = body1 == null ? null : body1.zpp_inner;
      if (inbody1 != this.zpp_inner_zn.b1) {
        if (this.zpp_inner_zn.b1 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b2 != this.zpp_inner_zn.b1
          ) {
            if (this.zpp_inner_zn.b1 != null) {
              this.zpp_inner_zn.b1.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b1.wake();
          }
        }
        this.zpp_inner_zn.b1 = inbody1;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody1 != null &&
          this.zpp_inner_zn.b2 != inbody1
        ) {
          if (inbody1 != null) {
            inbody1.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody1 != null) {
            inbody1.wake();
          }
        }
      }
      var tmp = this.zpp_inner_zn.b1 == null;
      this.zpp_inner.immutable_midstep("Constraint::" + "body2");
      var inbody2 = body2 == null ? null : body2.zpp_inner;
      if (inbody2 != this.zpp_inner_zn.b2) {
        if (this.zpp_inner_zn.b2 != null) {
          if (
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null &&
            this.zpp_inner_zn.b1 != this.zpp_inner_zn.b2
          ) {
            if (this.zpp_inner_zn.b2 != null) {
              this.zpp_inner_zn.b2.constraints.remove(this.zpp_inner);
            }
          }
          if (
            this.zpp_inner.active &&
            (this.zpp_inner.space == null
              ? null
              : this.zpp_inner.space.outer) != null
          ) {
            this.zpp_inner_zn.b2.wake();
          }
        }
        this.zpp_inner_zn.b2 = inbody2;
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          inbody2 != null &&
          this.zpp_inner_zn.b1 != inbody2
        ) {
          if (inbody2 != null) {
            inbody2.constraints.add(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner.wake();
          if (inbody2 != null) {
            inbody2.wake();
          }
        }
      }
      var tmp1 = this.zpp_inner_zn.b2 == null;
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor1 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor1" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a1 == null) {
        this.zpp_inner_zn.setup_a1();
      }
      var _this = this.zpp_inner_zn.wrap_a1;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this1 = _this.zpp_inner;
      if (_this1._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this1._isimmutable != null) {
        _this1._isimmutable();
      }
      if (anchor1 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this2 = anchor1.zpp_inner;
      if (_this2._validate != null) {
        _this2._validate();
      }
      var x = anchor1.zpp_inner.x;
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this3 = anchor1.zpp_inner;
      if (_this3._validate != null) {
        _this3._validate();
      }
      var y = anchor1.zpp_inner.y;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this4 = _this.zpp_inner;
      if (_this4._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this4._isimmutable != null) {
        _this4._isimmutable();
      }
      if (x != x || y != y) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp2;
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this5 = _this.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      if (_this.zpp_inner.x == x) {
        if (_this != null && _this.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this6 = _this.zpp_inner;
        if (_this6._validate != null) {
          _this6._validate();
        }
        tmp2 = _this.zpp_inner.y == y;
      } else {
        tmp2 = false;
      }
      if (!tmp2) {
        _this.zpp_inner.x = x;
        _this.zpp_inner.y = y;
        var _this7 = _this.zpp_inner;
        if (_this7._invalidate != null) {
          _this7._invalidate(_this7);
        }
      }
      var ret = _this;
      if (anchor1.zpp_inner.weak) {
        if (anchor1 != null && anchor1.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this8 = anchor1.zpp_inner;
        if (_this8._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this8._isimmutable != null) {
          _this8._isimmutable();
        }
        if (anchor1.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner = anchor1.zpp_inner;
        anchor1.zpp_inner.outer = null;
        anchor1.zpp_inner = null;
        var o = anchor1;
        o.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o;
        o.zpp_disp = true;
        var o1 = inner;
        if (o1.outer != null) {
          o1.outer.zpp_inner = null;
          o1.outer = null;
        }
        o1._isimmutable = null;
        o1._validate = null;
        o1._invalidate = null;
        o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
      }
      if (this.zpp_inner_zn.wrap_a1 == null) {
        this.zpp_inner_zn.setup_a1();
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor2 == null) {
        throw new js._Boot.HaxeError(
          "Error: Constraint::" + "anchor2" + " cannot be null"
        );
      }
      if (this.zpp_inner_zn.wrap_a2 == null) {
        this.zpp_inner_zn.setup_a2();
      }
      var _this9 = this.zpp_inner_zn.wrap_a2;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this10 = _this9.zpp_inner;
      if (_this10._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this10._isimmutable != null) {
        _this10._isimmutable();
      }
      if (anchor2 == null) {
        throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
      }
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this11 = anchor2.zpp_inner;
      if (_this11._validate != null) {
        _this11._validate();
      }
      var x1 = anchor2.zpp_inner.x;
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this12 = anchor2.zpp_inner;
      if (_this12._validate != null) {
        _this12._validate();
      }
      var y1 = anchor2.zpp_inner.y;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this13 = _this9.zpp_inner;
      if (_this13._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this13._isimmutable != null) {
        _this13._isimmutable();
      }
      if (x1 != x1 || y1 != y1) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp3;
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this14 = _this9.zpp_inner;
      if (_this14._validate != null) {
        _this14._validate();
      }
      if (_this9.zpp_inner.x == x1) {
        if (_this9 != null && _this9.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this15 = _this9.zpp_inner;
        if (_this15._validate != null) {
          _this15._validate();
        }
        tmp3 = _this9.zpp_inner.y == y1;
      } else {
        tmp3 = false;
      }
      if (!tmp3) {
        _this9.zpp_inner.x = x1;
        _this9.zpp_inner.y = y1;
        var _this16 = _this9.zpp_inner;
        if (_this16._invalidate != null) {
          _this16._invalidate(_this16);
        }
      }
      var ret1 = _this9;
      if (anchor2.zpp_inner.weak) {
        if (anchor2 != null && anchor2.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this17 = anchor2.zpp_inner;
        if (_this17._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this17._isimmutable != null) {
          _this17._isimmutable();
        }
        if (anchor2.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner1 = anchor2.zpp_inner;
        anchor2.zpp_inner.outer = null;
        anchor2.zpp_inner = null;
        var o2 = anchor2;
        o2.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o2;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o2;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o2;
        o2.zpp_disp = true;
        var o3 = inner1;
        if (o3.outer != null) {
          o3.outer.zpp_inner = null;
          o3.outer = null;
        }
        o3._isimmutable = null;
        o3._validate = null;
        o3._invalidate = null;
        o3.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o3;
      }
      if (this.zpp_inner_zn.wrap_a2 == null) {
        this.zpp_inner_zn.setup_a2();
      }
      this.zpp_inner.immutable_midstep("WeldJoint::phase");
      if (phase != phase) {
        throw new js._Boot.HaxeError("Error: WeldJoint::phase cannot be NaN");
      }
      if (this.zpp_inner_zn.phase != phase) {
        this.zpp_inner_zn.phase = phase;
        this.zpp_inner.wake();
      }
    };
  nape.constraint.WeldJoint.__name__ = ["nape", "constraint", "WeldJoint"];
  nape.constraint.WeldJoint.__super__ = nape.constraint.Constraint;
  for (var k in nape.constraint.Constraint.prototype)
    nape.constraint.WeldJoint.prototype[k] =
      nape.constraint.Constraint.prototype[k];
  nape.constraint.WeldJoint.prototype.zpp_inner_zn = null;
  Object.defineProperty(nape.constraint.WeldJoint.prototype, "body1", {
    get: function() { return this.get_body1(); },
    set: function(v) { this.set_body1(v); },
  });
  nape.constraint.WeldJoint.prototype.get_body1 = function () {
    if (this.zpp_inner_zn.b1 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b1.outer;
    }
  };
  nape.constraint.WeldJoint.prototype.set_body1 = function (body1) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body1");
    var inbody1 = body1 == null ? null : body1.zpp_inner;
    if (inbody1 != this.zpp_inner_zn.b1) {
      if (this.zpp_inner_zn.b1 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b2 != this.zpp_inner_zn.b1
        ) {
          if (this.zpp_inner_zn.b1 != null) {
            this.zpp_inner_zn.b1.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b1.wake();
        }
      }
      this.zpp_inner_zn.b1 = inbody1;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody1 != null &&
        this.zpp_inner_zn.b2 != inbody1
      ) {
        if (inbody1 != null) {
          inbody1.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody1 != null) {
          inbody1.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b1 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b1.outer;
    }
  };
  Object.defineProperty(nape.constraint.WeldJoint.prototype, "body2", {
    get: function() { return this.get_body2(); },
    set: function(v) { this.set_body2(v); },
  });
  nape.constraint.WeldJoint.prototype.get_body2 = function () {
    if (this.zpp_inner_zn.b2 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b2.outer;
    }
  };
  nape.constraint.WeldJoint.prototype.set_body2 = function (body2) {
    this.zpp_inner.immutable_midstep("Constraint::" + "body2");
    var inbody2 = body2 == null ? null : body2.zpp_inner;
    if (inbody2 != this.zpp_inner_zn.b2) {
      if (this.zpp_inner_zn.b2 != null) {
        if (
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null &&
          this.zpp_inner_zn.b1 != this.zpp_inner_zn.b2
        ) {
          if (this.zpp_inner_zn.b2 != null) {
            this.zpp_inner_zn.b2.constraints.remove(this.zpp_inner);
          }
        }
        if (
          this.zpp_inner.active &&
          (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
            null
        ) {
          this.zpp_inner_zn.b2.wake();
        }
      }
      this.zpp_inner_zn.b2 = inbody2;
      if (
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null &&
        inbody2 != null &&
        this.zpp_inner_zn.b1 != inbody2
      ) {
        if (inbody2 != null) {
          inbody2.constraints.add(this.zpp_inner);
        }
      }
      if (
        this.zpp_inner.active &&
        (this.zpp_inner.space == null ? null : this.zpp_inner.space.outer) !=
          null
      ) {
        this.zpp_inner.wake();
        if (inbody2 != null) {
          inbody2.wake();
        }
      }
    }
    if (this.zpp_inner_zn.b2 == null) {
      return null;
    } else {
      return this.zpp_inner_zn.b2.outer;
    }
  };
  Object.defineProperty(nape.constraint.WeldJoint.prototype, "anchor1", {
    get: function() { return this.get_anchor1(); },
    set: function(v) { this.set_anchor1(v); },
  });
  nape.constraint.WeldJoint.prototype.get_anchor1 = function () {
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    return this.zpp_inner_zn.wrap_a1;
  };
  nape.constraint.WeldJoint.prototype.set_anchor1 = function (anchor1) {
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor1 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor1" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    var _this = this.zpp_inner_zn.wrap_a1;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor1 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor1.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor1.zpp_inner.x;
    if (anchor1 != null && anchor1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor1.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor1.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor1.zpp_inner.weak) {
      if (anchor1 != null && anchor1.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor1.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor1.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor1.zpp_inner;
      anchor1.zpp_inner.outer = null;
      anchor1.zpp_inner = null;
      var o = anchor1;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a1 == null) {
      this.zpp_inner_zn.setup_a1();
    }
    return this.zpp_inner_zn.wrap_a1;
  };
  Object.defineProperty(nape.constraint.WeldJoint.prototype, "anchor2", {
    get: function() { return this.get_anchor2(); },
    set: function(v) { this.set_anchor2(v); },
  });
  nape.constraint.WeldJoint.prototype.get_anchor2 = function () {
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    return this.zpp_inner_zn.wrap_a2;
  };
  nape.constraint.WeldJoint.prototype.set_anchor2 = function (anchor2) {
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor2 == null) {
      throw new js._Boot.HaxeError(
        "Error: Constraint::" + "anchor2" + " cannot be null"
      );
    }
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    var _this = this.zpp_inner_zn.wrap_a2;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (anchor2 == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = anchor2.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = anchor2.zpp_inner.x;
    if (anchor2 != null && anchor2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = anchor2.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = anchor2.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (anchor2.zpp_inner.weak) {
      if (anchor2 != null && anchor2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = anchor2.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (anchor2.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = anchor2.zpp_inner;
      anchor2.zpp_inner.outer = null;
      anchor2.zpp_inner = null;
      var o = anchor2;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner_zn.wrap_a2 == null) {
      this.zpp_inner_zn.setup_a2();
    }
    return this.zpp_inner_zn.wrap_a2;
  };
  Object.defineProperty(nape.constraint.WeldJoint.prototype, "phase", {
    get: function() { return this.get_phase(); },
    set: function(v) { this.set_phase(v); },
  });
  nape.constraint.WeldJoint.prototype.get_phase = function () {
    return this.zpp_inner_zn.phase;
  };
  nape.constraint.WeldJoint.prototype.set_phase = function (phase) {
    this.zpp_inner.immutable_midstep("WeldJoint::phase");
    if (phase != phase) {
      throw new js._Boot.HaxeError("Error: WeldJoint::phase cannot be NaN");
    }
    if (this.zpp_inner_zn.phase != phase) {
      this.zpp_inner_zn.phase = phase;
      this.zpp_inner.wake();
    }
    return this.zpp_inner_zn.phase;
  };
  nape.constraint.WeldJoint.prototype.impulse = function () {
    var ret = new nape.geom.MatMN(3, 1);
    if (0 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new js._Boot.HaxeError("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[0 * ret.zpp_inner.n] = this.zpp_inner_zn.jAccx;
    if (1 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new js._Boot.HaxeError("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[ret.zpp_inner.n] = this.zpp_inner_zn.jAccy;
    if (1 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new js._Boot.HaxeError("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[ret.zpp_inner.n] = this.zpp_inner_zn.jAccz;
    return ret;
  };
  nape.constraint.WeldJoint.prototype.bodyImpulse = function (body) {
    if (body == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate impulse on null body"
      );
    }
    if (
      body !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) &&
      body != (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer)
    ) {
      throw new js._Boot.HaxeError(
        "Error: Body is not linked to this constraint"
      );
    }
    if (!this.zpp_inner.active) {
      return nape.geom.Vec3.get();
    } else {
      return this.zpp_inner_zn.bodyImpulse(body.zpp_inner);
    }
  };
  nape.constraint.WeldJoint.prototype.visitBodies = function (lambda) {
    if (
      (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer) != null
    ) {
      lambda(this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer);
    }
    if (
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) !=
        null &&
      (this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer) !=
        (this.zpp_inner_zn.b1 == null ? null : this.zpp_inner_zn.b1.outer)
    ) {
      lambda(this.zpp_inner_zn.b2 == null ? null : this.zpp_inner_zn.b2.outer);
    }
  };
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
  nape.geom.Geom = $hxClasses["nape.geom.Geom"] = function () {};
  nape.geom.Geom.__name__ = ["nape", "geom", "Geom"];
  nape.geom.Geom.distanceBody = function (body1, body2, out1, out2) {
    if (out1 != null && out1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (out2 != null && out2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this = out1.zpp_inner;
    if (_this._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this._isimmutable != null) {
      _this._isimmutable();
    }
    var _this1 = out2.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    var tmp;
    var _this2 = body1.zpp_inner.wrap_shapes;
    if (_this2.zpp_inner.inner.head != null) {
      var _this3 = body2.zpp_inner.wrap_shapes;
      tmp = _this3.zpp_inner.inner.head == null;
    } else {
      tmp = true;
    }
    if (tmp) {
      throw new js._Boot.HaxeError(
        "Error: Bodies cannot be empty in calculating distances"
      );
    }
    var cx_ite = body1.zpp_inner.shapes.head;
    while (cx_ite != null) {
      var i = cx_ite.elt;
      zpp_nape.geom.ZPP_Geom.validateShape(i);
      cx_ite = cx_ite.next;
    }
    var cx_ite1 = body2.zpp_inner.shapes.head;
    while (cx_ite1 != null) {
      var i1 = cx_ite1.elt;
      zpp_nape.geom.ZPP_Geom.validateShape(i1);
      cx_ite1 = cx_ite1.next;
    }
    return zpp_nape.geom.ZPP_SweepDistance.distanceBody(
      body1.zpp_inner,
      body2.zpp_inner,
      out1.zpp_inner,
      out2.zpp_inner
    );
  };
  nape.geom.Geom.distance = function (shape1, shape2, out1, out2) {
    if (out1 != null && out1.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (out2 != null && out2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this = out1.zpp_inner;
    if (_this._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this._isimmutable != null) {
      _this._isimmutable();
    }
    var _this1 = out2.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (
      (shape1.zpp_inner.body != null ? shape1.zpp_inner.body.outer : null) ==
        null ||
      (shape2.zpp_inner.body != null ? shape2.zpp_inner.body.outer : null) ==
        null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Shape must be part of a Body to calculate distances"
      );
    }
    zpp_nape.geom.ZPP_Geom.validateShape(shape1.zpp_inner);
    zpp_nape.geom.ZPP_Geom.validateShape(shape2.zpp_inner);
    var tmp;
    if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
      tmp = new zpp_nape.geom.ZPP_Vec2();
    } else {
      tmp = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = tmp.next;
      tmp.next = null;
    }
    tmp.weak = false;
    var s1 = shape1.zpp_inner;
    var s2 = shape2.zpp_inner;
    var w1 = out1.zpp_inner;
    var w2 = out2.zpp_inner;
    var upperBound = 1e100;
    if (upperBound == null) {
      upperBound = 1e100;
    }
    var ret;
    if (s1.type == 0 && s2.type == 0) {
      var c1 = s1.circle;
      var c2 = s2.circle;
      var dist;
      var nx = 0.0;
      var ny = 0.0;
      nx = c2.worldCOMx - c1.worldCOMx;
      ny = c2.worldCOMy - c1.worldCOMy;
      var len = Math.sqrt(nx * nx + ny * ny);
      dist = len - (c1.radius + c2.radius);
      if (dist < upperBound) {
        if (len == 0) {
          nx = 1;
          ny = 0;
        } else {
          var t = 1.0 / len;
          nx *= t;
          ny *= t;
        }
        var t1 = c1.radius;
        w1.x = c1.worldCOMx + nx * t1;
        w1.y = c1.worldCOMy + ny * t1;
        var t2 = -c2.radius;
        w2.x = c2.worldCOMx + nx * t2;
        w2.y = c2.worldCOMy + ny * t2;
        tmp.x = nx;
        tmp.y = ny;
      }
      ret = dist;
    } else {
      var swapped = false;
      if (s1.type == 0 && s2.type == 1) {
        var tmp1 = s1;
        s1 = s2;
        s2 = tmp1;
        var tmp2 = w1;
        w1 = w2;
        w2 = tmp2;
        swapped = true;
      }
      if (s1.type == 1 && s2.type == 0) {
        var poly = s1.polygon;
        var circle = s2.circle;
        var best = -1e100;
        var a0 = null;
        var cx_ite = poly.edges.head;
        while (cx_ite != null) {
          var a = cx_ite.elt;
          var dist1 =
            a.gnormx * circle.worldCOMx +
            a.gnormy * circle.worldCOMy -
            a.gprojection -
            circle.radius;
          if (dist1 > upperBound) {
            best = dist1;
            break;
          }
          if (dist1 > 0) {
            if (dist1 > best) {
              best = dist1;
              a0 = a;
            }
          } else if (best < 0 && dist1 > best) {
            best = dist1;
            a0 = a;
          }
          cx_ite = cx_ite.next;
        }
        if (best < upperBound) {
          var v0 = a0.gp0;
          var v1 = a0.gp1;
          var dt = circle.worldCOMy * a0.gnormx - circle.worldCOMx * a0.gnormy;
          if (dt <= v0.y * a0.gnormx - v0.x * a0.gnormy) {
            var nx1 = 0.0;
            var ny1 = 0.0;
            nx1 = circle.worldCOMx - v0.x;
            ny1 = circle.worldCOMy - v0.y;
            var len1 = Math.sqrt(nx1 * nx1 + ny1 * ny1);
            best = len1 - circle.radius;
            if (best < upperBound) {
              if (len1 == 0) {
                nx1 = 1;
                ny1 = 0;
              } else {
                var t3 = 1.0 / len1;
                nx1 *= t3;
                ny1 *= t3;
              }
              var t4 = 0;
              w1.x = v0.x + nx1 * t4;
              w1.y = v0.y + ny1 * t4;
              var t5 = -circle.radius;
              w2.x = circle.worldCOMx + nx1 * t5;
              w2.y = circle.worldCOMy + ny1 * t5;
              tmp.x = nx1;
              tmp.y = ny1;
            }
          } else if (dt >= v1.y * a0.gnormx - v1.x * a0.gnormy) {
            var nx2 = 0.0;
            var ny2 = 0.0;
            nx2 = circle.worldCOMx - v1.x;
            ny2 = circle.worldCOMy - v1.y;
            var len2 = Math.sqrt(nx2 * nx2 + ny2 * ny2);
            best = len2 - circle.radius;
            if (best < upperBound) {
              if (len2 == 0) {
                nx2 = 1;
                ny2 = 0;
              } else {
                var t6 = 1.0 / len2;
                nx2 *= t6;
                ny2 *= t6;
              }
              var t7 = 0;
              w1.x = v1.x + nx2 * t7;
              w1.y = v1.y + ny2 * t7;
              var t8 = -circle.radius;
              w2.x = circle.worldCOMx + nx2 * t8;
              w2.y = circle.worldCOMy + ny2 * t8;
              tmp.x = nx2;
              tmp.y = ny2;
            }
          } else {
            var t9 = -circle.radius;
            w2.x = circle.worldCOMx + a0.gnormx * t9;
            w2.y = circle.worldCOMy + a0.gnormy * t9;
            var t10 = -best;
            w1.x = w2.x + a0.gnormx * t10;
            w1.y = w2.y + a0.gnormy * t10;
            tmp.x = a0.gnormx;
            tmp.y = a0.gnormy;
          }
        }
        if (swapped) {
          tmp.x = -tmp.x;
          tmp.y = -tmp.y;
        }
        ret = best;
      } else {
        var p1 = s1.polygon;
        var p2 = s2.polygon;
        var best1 = -1e100;
        var a1 = null;
        var a2 = null;
        var besti = 0;
        var cx_ite1 = p1.edges.head;
        while (cx_ite1 != null) {
          var a3 = cx_ite1.elt;
          var min = 1e100;
          var cx_ite2 = p2.gverts.next;
          while (cx_ite2 != null) {
            var v = cx_ite2;
            var k = a3.gnormx * v.x + a3.gnormy * v.y;
            if (k < min) {
              min = k;
            }
            cx_ite2 = cx_ite2.next;
          }
          min -= a3.gprojection;
          if (min > upperBound) {
            best1 = min;
            break;
          }
          if (min > 0) {
            if (min > best1) {
              best1 = min;
              a1 = a3;
              besti = 1;
            }
          } else if (best1 < 0 && min > best1) {
            best1 = min;
            a1 = a3;
            besti = 1;
          }
          cx_ite1 = cx_ite1.next;
        }
        if (best1 < upperBound) {
          var cx_ite3 = p2.edges.head;
          while (cx_ite3 != null) {
            var a4 = cx_ite3.elt;
            var min1 = 1e100;
            var cx_ite4 = p1.gverts.next;
            while (cx_ite4 != null) {
              var v2 = cx_ite4;
              var k1 = a4.gnormx * v2.x + a4.gnormy * v2.y;
              if (k1 < min1) {
                min1 = k1;
              }
              cx_ite4 = cx_ite4.next;
            }
            min1 -= a4.gprojection;
            if (min1 > upperBound) {
              best1 = min1;
              break;
            }
            if (min1 > 0) {
              if (min1 > best1) {
                best1 = min1;
                a2 = a4;
                besti = 2;
              }
            } else if (best1 < 0 && min1 > best1) {
              best1 = min1;
              a2 = a4;
              besti = 2;
            }
            cx_ite3 = cx_ite3.next;
          }
          if (best1 < upperBound) {
            var q1;
            var q2;
            var ax;
            if (besti == 1) {
              q1 = p1;
              q2 = p2;
              ax = a1;
            } else {
              q1 = p2;
              q2 = p1;
              ax = a2;
              var tmp3 = w1;
              w1 = w2;
              w2 = tmp3;
              swapped = !swapped;
            }
            var ay = null;
            var min2 = 1e100;
            var cx_ite5 = q2.edges.head;
            while (cx_ite5 != null) {
              var a5 = cx_ite5.elt;
              var k2 = ax.gnormx * a5.gnormx + ax.gnormy * a5.gnormy;
              if (k2 < min2) {
                min2 = k2;
                ay = a5;
              }
              cx_ite5 = cx_ite5.next;
            }
            if (swapped) {
              tmp.x = -ax.gnormx;
              tmp.y = -ax.gnormy;
            } else {
              tmp.x = ax.gnormx;
              tmp.y = ax.gnormy;
            }
            if (best1 >= 0) {
              var v01 = ax.gp0;
              var v11 = ax.gp1;
              var q0 = ay.gp0;
              var q11 = ay.gp1;
              var vx = 0.0;
              var vy = 0.0;
              var qx = 0.0;
              var qy = 0.0;
              vx = v11.x - v01.x;
              vy = v11.y - v01.y;
              qx = q11.x - q0.x;
              qy = q11.y - q0.y;
              var vdot = 1 / (vx * vx + vy * vy);
              var qdot = 1 / (qx * qx + qy * qy);
              var t11 = -(vx * (v01.x - q0.x) + vy * (v01.y - q0.y)) * vdot;
              var t21 = -(vx * (v01.x - q11.x) + vy * (v01.y - q11.y)) * vdot;
              var s11 = -(qx * (q0.x - v01.x) + qy * (q0.y - v01.y)) * qdot;
              var s21 = -(qx * (q0.x - v11.x) + qy * (q0.y - v11.y)) * qdot;
              if (t11 < 0) {
                t11 = 0;
              } else if (t11 > 1) {
                t11 = 1;
              }
              if (t21 < 0) {
                t21 = 0;
              } else if (t21 > 1) {
                t21 = 1;
              }
              if (s11 < 0) {
                s11 = 0;
              } else if (s11 > 1) {
                s11 = 1;
              }
              if (s21 < 0) {
                s21 = 0;
              } else if (s21 > 1) {
                s21 = 1;
              }
              var f1x = 0.0;
              var f1y = 0.0;
              var t12 = t11;
              f1x = v01.x + vx * t12;
              f1y = v01.y + vy * t12;
              var f2x = 0.0;
              var f2y = 0.0;
              var t13 = t21;
              f2x = v01.x + vx * t13;
              f2y = v01.y + vy * t13;
              var g1x = 0.0;
              var g1y = 0.0;
              var t14 = s11;
              g1x = q0.x + qx * t14;
              g1y = q0.y + qy * t14;
              var g2x = 0.0;
              var g2y = 0.0;
              var t15 = s21;
              g2x = q0.x + qx * t15;
              g2y = q0.y + qy * t15;
              var dx = 0.0;
              var dy = 0.0;
              dx = f1x - q0.x;
              dy = f1y - q0.y;
              var d1 = dx * dx + dy * dy;
              var dx1 = 0.0;
              var dy1 = 0.0;
              dx1 = f2x - q11.x;
              dy1 = f2y - q11.y;
              var d2 = dx1 * dx1 + dy1 * dy1;
              var dx2 = 0.0;
              var dy2 = 0.0;
              dx2 = g1x - v01.x;
              dy2 = g1y - v01.y;
              var e1 = dx2 * dx2 + dy2 * dy2;
              var dx3 = 0.0;
              var dy3 = 0.0;
              dx3 = g2x - v11.x;
              dy3 = g2y - v11.y;
              var e2 = dx3 * dx3 + dy3 * dy3;
              var minfx = 0.0;
              var minfy = 0.0;
              var minq = null;
              if (d1 < d2) {
                minfx = f1x;
                minfy = f1y;
                minq = q0;
              } else {
                minfx = f2x;
                minfy = f2y;
                minq = q11;
                d1 = d2;
              }
              var mingx = 0.0;
              var mingy = 0.0;
              var minv = null;
              if (e1 < e2) {
                mingx = g1x;
                mingy = g1y;
                minv = v01;
              } else {
                mingx = g2x;
                mingy = g2y;
                minv = v11;
                e1 = e2;
              }
              if (d1 < e1) {
                w1.x = minfx;
                w1.y = minfy;
                w2.x = minq.x;
                w2.y = minq.y;
                best1 = Math.sqrt(d1);
              } else {
                w2.x = mingx;
                w2.y = mingy;
                w1.x = minv.x;
                w1.y = minv.y;
                best1 = Math.sqrt(e1);
              }
              if (best1 != 0) {
                tmp.x = w2.x - w1.x;
                tmp.y = w2.y - w1.y;
                var t16 = 1.0 / best1;
                tmp.x *= t16;
                tmp.y *= t16;
                if (swapped) {
                  tmp.x = -tmp.x;
                  tmp.y = -tmp.y;
                }
              }
              ret = best1;
            } else {
              var c0x = 0.0;
              var c0y = 0.0;
              c0x = ay.gp0.x;
              c0y = ay.gp0.y;
              var c1x = 0.0;
              var c1y = 0.0;
              c1x = ay.gp1.x;
              c1y = ay.gp1.y;
              var dvx = 0.0;
              var dvy = 0.0;
              dvx = c1x - c0x;
              dvy = c1y - c0y;
              var d0 = ax.gnormy * c0x - ax.gnormx * c0y;
              var d11 = ax.gnormy * c1x - ax.gnormx * c1y;
              var den = 1 / (d11 - d0);
              var t17 = (-ax.tp1 - d0) * den;
              if (t17 > nape.Config.epsilon) {
                var t18 = t17;
                c0x += dvx * t18;
                c0y += dvy * t18;
              }
              var t19 = (-ax.tp0 - d11) * den;
              if (t19 < -nape.Config.epsilon) {
                var t20 = t19;
                c1x += dvx * t20;
                c1y += dvy * t20;
              }
              var c0d = c0x * ax.gnormx + c0y * ax.gnormy - ax.gprojection;
              var c1d = c1x * ax.gnormx + c1y * ax.gnormy - ax.gprojection;
              if (c0d < c1d) {
                w2.x = c0x;
                w2.y = c0y;
                var t22 = -c0d;
                w1.x = w2.x + ax.gnormx * t22;
                w1.y = w2.y + ax.gnormy * t22;
                ret = c0d;
              } else {
                w2.x = c1x;
                w2.y = c1y;
                var t23 = -c1d;
                w1.x = w2.x + ax.gnormx * t23;
                w1.y = w2.y + ax.gnormy * t23;
                ret = c1d;
              }
            }
          } else {
            ret = upperBound;
          }
        } else {
          ret = upperBound;
        }
      }
    }
    var o = tmp;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o._isimmutable = null;
    o._validate = null;
    o._invalidate = null;
    o.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
    zpp_nape.geom.ZPP_Vec2.zpp_pool = o;
    return ret;
  };
  nape.geom.Geom.intersectsBody = function (body1, body2) {
    var tmp;
    var _this = body1.zpp_inner.wrap_shapes;
    if (_this.zpp_inner.inner.head != null) {
      var _this1 = body2.zpp_inner.wrap_shapes;
      tmp = _this1.zpp_inner.inner.head == null;
    } else {
      tmp = true;
    }
    if (tmp) {
      throw new js._Boot.HaxeError(
        "Error: Bodies must have shapes to test for intersection."
      );
    }
    var cx_ite = body1.zpp_inner.shapes.head;
    while (cx_ite != null) {
      var i = cx_ite.elt;
      zpp_nape.geom.ZPP_Geom.validateShape(i);
      cx_ite = cx_ite.next;
    }
    var cx_ite1 = body2.zpp_inner.shapes.head;
    while (cx_ite1 != null) {
      var i1 = cx_ite1.elt;
      zpp_nape.geom.ZPP_Geom.validateShape(i1);
      cx_ite1 = cx_ite1.next;
    }
    var _this2 = body1.zpp_inner.aabb;
    var x = body2.zpp_inner.aabb;
    if (
      !(
        x.miny <= _this2.maxy &&
        _this2.miny <= x.maxy &&
        x.minx <= _this2.maxx &&
        _this2.minx <= x.maxx
      )
    ) {
      return false;
    } else {
      var cx_ite2 = body1.zpp_inner.shapes.head;
      while (cx_ite2 != null) {
        var s1 = cx_ite2.elt;
        var cx_ite3 = body2.zpp_inner.shapes.head;
        while (cx_ite3 != null) {
          var s2 = cx_ite3.elt;
          if (zpp_nape.geom.ZPP_Collide.testCollide_safe(s1, s2)) {
            return true;
          }
          cx_ite3 = cx_ite3.next;
        }
        cx_ite2 = cx_ite2.next;
      }
      return false;
    }
  };
  nape.geom.Geom.intersects = function (shape1, shape2) {
    if (
      (shape1.zpp_inner.body != null ? shape1.zpp_inner.body.outer : null) ==
        null ||
      (shape2.zpp_inner.body != null ? shape2.zpp_inner.body.outer : null) ==
        null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Shape must be part of a Body to calculate intersection"
      );
    }
    zpp_nape.geom.ZPP_Geom.validateShape(shape1.zpp_inner);
    zpp_nape.geom.ZPP_Geom.validateShape(shape2.zpp_inner);
    var _this = shape1.zpp_inner.aabb;
    var x = shape2.zpp_inner.aabb;
    if (
      x.miny <= _this.maxy &&
      _this.miny <= x.maxy &&
      x.minx <= _this.maxx &&
      _this.minx <= x.maxx
    ) {
      return zpp_nape.geom.ZPP_Collide.testCollide_safe(
        shape1.zpp_inner,
        shape2.zpp_inner
      );
    } else {
      return false;
    }
  };
  nape.geom.Geom.contains = function (shape1, shape2) {
    if (
      (shape1.zpp_inner.body != null ? shape1.zpp_inner.body.outer : null) ==
        null ||
      (shape2.zpp_inner.body != null ? shape2.zpp_inner.body.outer : null) ==
        null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Shape must be part of a Body to calculate containment"
      );
    }
    zpp_nape.geom.ZPP_Geom.validateShape(shape1.zpp_inner);
    zpp_nape.geom.ZPP_Geom.validateShape(shape2.zpp_inner);
    return zpp_nape.geom.ZPP_Collide.containTest(
      shape1.zpp_inner,
      shape2.zpp_inner
    );
  };
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
  nape.geom.Ray = $hxClasses["nape.geom.Ray"] = function (origin, direction) {
    this.zpp_inner = null;
    if (origin != null && origin.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    this.zpp_inner = new zpp_nape.geom.ZPP_Ray();
    if (origin != null && origin.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (origin == null) {
      throw new js._Boot.HaxeError("Error: Ray::origin cannot be null");
    }
    var _this = this.zpp_inner.origin;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (origin != null && origin.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (origin == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (origin != null && origin.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = origin.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = origin.zpp_inner.x;
    if (origin != null && origin.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = origin.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = origin.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (origin.zpp_inner.weak) {
      if (origin != null && origin.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = origin.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (origin.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = origin.zpp_inner;
      origin.zpp_inner.outer = null;
      origin.zpp_inner = null;
      var o = origin;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (direction == null) {
      throw new js._Boot.HaxeError("Error: Ray::direction cannot be null");
    }
    var _this9 = this.zpp_inner.direction;
    if (_this9 != null && _this9.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this10 = _this9.zpp_inner;
    if (_this10._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this10._isimmutable != null) {
      _this10._isimmutable();
    }
    if (direction == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this11 = direction.zpp_inner;
    if (_this11._validate != null) {
      _this11._validate();
    }
    var x1 = direction.zpp_inner.x;
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this12 = direction.zpp_inner;
    if (_this12._validate != null) {
      _this12._validate();
    }
    var y1 = direction.zpp_inner.y;
    if (_this9 != null && _this9.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this13 = _this9.zpp_inner;
    if (_this13._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this13._isimmutable != null) {
      _this13._isimmutable();
    }
    if (x1 != x1 || y1 != y1) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp1;
    if (_this9 != null && _this9.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this14 = _this9.zpp_inner;
    if (_this14._validate != null) {
      _this14._validate();
    }
    if (_this9.zpp_inner.x == x1) {
      if (_this9 != null && _this9.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this15 = _this9.zpp_inner;
      if (_this15._validate != null) {
        _this15._validate();
      }
      tmp1 = _this9.zpp_inner.y == y1;
    } else {
      tmp1 = false;
    }
    if (!tmp1) {
      _this9.zpp_inner.x = x1;
      _this9.zpp_inner.y = y1;
      var _this16 = _this9.zpp_inner;
      if (_this16._invalidate != null) {
        _this16._invalidate(_this16);
      }
    }
    var ret1 = _this9;
    if (direction.zpp_inner.weak) {
      if (direction != null && direction.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this17 = direction.zpp_inner;
      if (_this17._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this17._isimmutable != null) {
        _this17._isimmutable();
      }
      if (direction.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner1 = direction.zpp_inner;
      direction.zpp_inner.outer = null;
      direction.zpp_inner = null;
      var o2 = direction;
      o2.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o2;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o2;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o2;
      o2.zpp_disp = true;
      var o3 = inner1;
      if (o3.outer != null) {
        o3.outer.zpp_inner = null;
        o3.outer = null;
      }
      o3._isimmutable = null;
      o3._validate = null;
      o3._invalidate = null;
      o3.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o3;
    }
    this.zpp_inner.zip_dir = true;
    this.zpp_inner.maxdist = Infinity;
  };
  nape.geom.Ray.__name__ = ["nape", "geom", "Ray"];
  nape.geom.Ray.fromSegment = function (start, end) {
    if (start != null && start.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (end != null && end.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (start == null) {
      throw new js._Boot.HaxeError("Error: Ray::fromSegment::start is null");
    }
    if (end == null) {
      throw new js._Boot.HaxeError("Error: Ray::fromSegment::end is null");
    }
    var dir = end.sub(start, true);
    var ret = new nape.geom.Ray(start, dir);
    if (start != null && start.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this = start.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    var ax = start.zpp_inner.x;
    if (start != null && start.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = start.zpp_inner;
    if (_this1._validate != null) {
      _this1._validate();
    }
    var ay = start.zpp_inner.y;
    if (end != null && end.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = end.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var bx = end.zpp_inner.x;
    if (end != null && end.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = end.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var dx = 0.0;
    var dy = 0.0;
    dx = ax - bx;
    dy = ay - end.zpp_inner.y;
    var maxDistance = Math.sqrt(dx * dx + dy * dy);
    if (maxDistance != maxDistance) {
      throw new js._Boot.HaxeError("Error: maxDistance cannot be NaN");
    }
    ret.zpp_inner.maxdist = maxDistance;
    if (start.zpp_inner.weak) {
      if (start != null && start.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this4 = start.zpp_inner;
      if (_this4._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this4._isimmutable != null) {
        _this4._isimmutable();
      }
      if (start.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = start.zpp_inner;
      start.zpp_inner.outer = null;
      start.zpp_inner = null;
      var o = start;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (end.zpp_inner.weak) {
      if (end != null && end.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this5 = end.zpp_inner;
      if (_this5._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this5._isimmutable != null) {
        _this5._isimmutable();
      }
      if (end.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner1 = end.zpp_inner;
      end.zpp_inner.outer = null;
      end.zpp_inner = null;
      var o2 = end;
      o2.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o2;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o2;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o2;
      o2.zpp_disp = true;
      var o3 = inner1;
      if (o3.outer != null) {
        o3.outer.zpp_inner = null;
        o3.outer = null;
      }
      o3._isimmutable = null;
      o3._validate = null;
      o3._invalidate = null;
      o3.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o3;
    }
    return ret;
  };
  nape.geom.Ray.prototype.zpp_inner = null;
  Object.defineProperty(nape.geom.Ray.prototype, "userData", {
    get: function() { return this.get_userData(); },
  });
  nape.geom.Ray.prototype.get_userData = function () {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  };
  Object.defineProperty(nape.geom.Ray.prototype, "origin", {
    get: function() { return this.get_origin(); },
    set: function(v) { this.set_origin(v); },
  });
  nape.geom.Ray.prototype.get_origin = function () {
    return this.zpp_inner.origin;
  };
  nape.geom.Ray.prototype.set_origin = function (origin) {
    if (origin != null && origin.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (origin == null) {
      throw new js._Boot.HaxeError("Error: Ray::origin cannot be null");
    }
    var _this = this.zpp_inner.origin;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (origin != null && origin.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (origin == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (origin != null && origin.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = origin.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = origin.zpp_inner.x;
    if (origin != null && origin.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = origin.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = origin.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (origin.zpp_inner.weak) {
      if (origin != null && origin.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = origin.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (origin.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = origin.zpp_inner;
      origin.zpp_inner.outer = null;
      origin.zpp_inner = null;
      var o = origin;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    return this.zpp_inner.origin;
  };
  Object.defineProperty(nape.geom.Ray.prototype, "direction", {
    get: function() { return this.get_direction(); },
    set: function(v) { this.set_direction(v); },
  });
  nape.geom.Ray.prototype.get_direction = function () {
    return this.zpp_inner.direction;
  };
  nape.geom.Ray.prototype.set_direction = function (direction) {
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (direction == null) {
      throw new js._Boot.HaxeError("Error: Ray::direction cannot be null");
    }
    var _this = this.zpp_inner.direction;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (direction == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = direction.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = direction.zpp_inner.x;
    if (direction != null && direction.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = direction.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = direction.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (direction.zpp_inner.weak) {
      if (direction != null && direction.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = direction.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (direction.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = direction.zpp_inner;
      direction.zpp_inner.outer = null;
      direction.zpp_inner = null;
      var o = direction;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    this.zpp_inner.zip_dir = true;
    return this.zpp_inner.direction;
  };
  Object.defineProperty(nape.geom.Ray.prototype, "maxDistance", {
    get: function() { return this.get_maxDistance(); },
    set: function(v) { this.set_maxDistance(v); },
  });
  nape.geom.Ray.prototype.get_maxDistance = function () {
    return this.zpp_inner.maxdist;
  };
  nape.geom.Ray.prototype.set_maxDistance = function (maxDistance) {
    if (maxDistance != maxDistance) {
      throw new js._Boot.HaxeError("Error: maxDistance cannot be NaN");
    }
    this.zpp_inner.maxdist = maxDistance;
    return this.zpp_inner.maxdist;
  };
  nape.geom.Ray.prototype.aabb = function () {
    return this.zpp_inner.rayAABB().wrapper();
  };
  nape.geom.Ray.prototype.at = function (distance, weak) {
    if (weak == null) {
      weak = false;
    }
    this.zpp_inner.validate_dir();
    var _this = this.zpp_inner.origin;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._validate != null) {
      _this1._validate();
    }
    var x = _this.zpp_inner.x + distance * this.zpp_inner.dirx;
    var _this2 = this.zpp_inner.origin;
    if (_this2 != null && _this2.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = _this2.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = _this2.zpp_inner.y + distance * this.zpp_inner.diry;
    var weak1 = weak;
    if (weak1 == null) {
      weak1 = false;
    }
    if (y == null) {
      y = 0;
    }
    if (x == null) {
      x = 0;
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var ret;
    if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
      ret = new nape.geom.Vec2();
    } else {
      ret = zpp_nape.util.ZPP_PubPool.poolVec2;
      zpp_nape.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == zpp_nape.util.ZPP_PubPool.nextVec2) {
        zpp_nape.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret.zpp_inner == null) {
      var ret1;
      if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
        ret1 = new zpp_nape.geom.ZPP_Vec2();
      } else {
        ret1 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.weak = false;
      ret1._immutable = false;
      ret1.x = x;
      ret1.y = y;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      if (ret != null && ret.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this4 = ret.zpp_inner;
      if (_this4._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this4._isimmutable != null) {
        _this4._isimmutable();
      }
      if (x != x || y != y) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp;
      if (ret != null && ret.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this5 = ret.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this6 = ret.zpp_inner;
        if (_this6._validate != null) {
          _this6._validate();
        }
        tmp = ret.zpp_inner.y == y;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = x;
        ret.zpp_inner.y = y;
        var _this7 = ret.zpp_inner;
        if (_this7._invalidate != null) {
          _this7._invalidate(_this7);
        }
      }
    }
    ret.zpp_inner.weak = weak1;
    return ret;
  };
  nape.geom.Ray.prototype.copy = function () {
    var ret = new nape.geom.Ray(
      this.zpp_inner.origin,
      this.zpp_inner.direction
    );
    var maxDistance = this.zpp_inner.maxdist;
    if (maxDistance != maxDistance) {
      throw new js._Boot.HaxeError("Error: maxDistance cannot be NaN");
    }
    ret.zpp_inner.maxdist = maxDistance;
    return ret;
  };
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
  Object.defineProperty(nape.shape.Shape.prototype, "type", {
    get: function() { return this.get_type(); },
  });
  nape.shape.Shape.prototype.get_type = function () {
    return zpp_nape.shape.ZPP_Shape.types[this.zpp_inner.type];
  };
  nape.shape.Shape.prototype.isCircle = function () {
    return this.zpp_inner.type == 0;
  };
  nape.shape.Shape.prototype.isPolygon = function () {
    return this.zpp_inner.type == 1;
  };
  Object.defineProperty(nape.shape.Shape.prototype, "body", {
    get: function() { return this.get_body(); },
    set: function(v) { this.set_body(v); },
  });
  nape.shape.Shape.prototype.get_body = function () {
    if (this.zpp_inner.body != null) {
      return this.zpp_inner.body.outer;
    } else {
      return null;
    }
  };
  nape.shape.Shape.prototype.set_body = function (body) {
    this.zpp_inner.immutable_midstep("Shape::body");
    if (
      (this.zpp_inner.body != null ? this.zpp_inner.body.outer : null) != body
    ) {
      if (this.zpp_inner.body != null) {
        (this.zpp_inner.body != null
          ? this.zpp_inner.body.outer
          : null
        ).zpp_inner.wrap_shapes.remove(this);
      }
      if (body != null) {
        var _this = body.zpp_inner.wrap_shapes;
        if (_this.zpp_inner.reverse_flag) {
          _this.push(this);
        } else {
          _this.unshift(this);
        }
      }
    }
    if (this.zpp_inner.body != null) {
      return this.zpp_inner.body.outer;
    } else {
      return null;
    }
  };
  Object.defineProperty(nape.shape.Shape.prototype, "castCircle", {
    get: function() { return this.get_castCircle(); },
  });
  nape.shape.Shape.prototype.get_castCircle = function () {
    if (this.zpp_inner.type == 0) {
      return this.zpp_inner.circle.outer_zn;
    } else {
      return null;
    }
  };
  Object.defineProperty(nape.shape.Shape.prototype, "castPolygon", {
    get: function() { return this.get_castPolygon(); },
  });
  nape.shape.Shape.prototype.get_castPolygon = function () {
    if (this.zpp_inner.type == 1) {
      return this.zpp_inner.polygon.outer_zn;
    } else {
      return null;
    }
  };
  Object.defineProperty(nape.shape.Shape.prototype, "worldCOM", {
    get: function() { return this.get_worldCOM(); },
  });
  nape.shape.Shape.prototype.get_worldCOM = function () {
    if (this.zpp_inner.wrap_worldCOM == null) {
      var x = this.zpp_inner.worldCOMx;
      var y = this.zpp_inner.worldCOMy;
      if (y == null) {
        y = 0;
      }
      if (x == null) {
        x = 0;
      }
      if (x != x || y != y) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var ret;
      if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
        ret = new nape.geom.Vec2();
      } else {
        ret = zpp_nape.util.ZPP_PubPool.poolVec2;
        zpp_nape.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
        ret.zpp_pool = null;
        ret.zpp_disp = false;
        if (ret == zpp_nape.util.ZPP_PubPool.nextVec2) {
          zpp_nape.util.ZPP_PubPool.nextVec2 = null;
        }
      }
      if (ret.zpp_inner == null) {
        var ret1;
        if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
          ret1 = new zpp_nape.geom.ZPP_Vec2();
        } else {
          ret1 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
          zpp_nape.geom.ZPP_Vec2.zpp_pool = ret1.next;
          ret1.next = null;
        }
        ret1.weak = false;
        ret1._immutable = false;
        ret1.x = x;
        ret1.y = y;
        ret.zpp_inner = ret1;
        ret.zpp_inner.outer = ret;
      } else {
        if (ret != null && ret.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this = ret.zpp_inner;
        if (_this._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this._isimmutable != null) {
          _this._isimmutable();
        }
        if (x != x || y != y) {
          throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
        }
        var tmp;
        if (ret != null && ret.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this1 = ret.zpp_inner;
        if (_this1._validate != null) {
          _this1._validate();
        }
        if (ret.zpp_inner.x == x) {
          if (ret != null && ret.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          var _this2 = ret.zpp_inner;
          if (_this2._validate != null) {
            _this2._validate();
          }
          tmp = ret.zpp_inner.y == y;
        } else {
          tmp = false;
        }
        if (!tmp) {
          ret.zpp_inner.x = x;
          ret.zpp_inner.y = y;
          var _this3 = ret.zpp_inner;
          if (_this3._invalidate != null) {
            _this3._invalidate(_this3);
          }
        }
      }
      ret.zpp_inner.weak = false;
      this.zpp_inner.wrap_worldCOM = ret;
      this.zpp_inner.wrap_worldCOM.zpp_inner._inuse = true;
      this.zpp_inner.wrap_worldCOM.zpp_inner._immutable = true;
      this.zpp_inner.wrap_worldCOM.zpp_inner._validate =
        (($_ = this.zpp_inner), $bind($_, $_.getworldCOM));
    }
    return this.zpp_inner.wrap_worldCOM;
  };
  Object.defineProperty(nape.shape.Shape.prototype, "localCOM", {
    get: function() { return this.get_localCOM(); },
    set: function(v) { this.set_localCOM(v); },
  });
  nape.shape.Shape.prototype.get_localCOM = function () {
    if (this.zpp_inner.wrap_localCOM == null) {
      if (this.zpp_inner.type == 0) {
        this.zpp_inner.circle.setupLocalCOM();
      } else {
        this.zpp_inner.polygon.setupLocalCOM();
      }
    }
    return this.zpp_inner.wrap_localCOM;
  };
  nape.shape.Shape.prototype.set_localCOM = function (localCOM) {
    this.zpp_inner.immutable_midstep("Body::localCOM");
    if (localCOM != null && localCOM.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (
      this.zpp_inner.body != null &&
      this.zpp_inner.body.space != null &&
      this.zpp_inner.body.type == 1
    ) {
      throw new js._Boot.HaxeError(
        "Error: Cannot modify Shape belonging to a static Object once inside a Space"
      );
    }
    if (localCOM == null) {
      throw new js._Boot.HaxeError("Error: Shape::localCOM cannot be null");
    }
    if (this.zpp_inner.wrap_localCOM == null) {
      if (this.zpp_inner.type == 0) {
        this.zpp_inner.circle.setupLocalCOM();
      } else {
        this.zpp_inner.polygon.setupLocalCOM();
      }
    }
    var _this = this.zpp_inner.wrap_localCOM;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (localCOM != null && localCOM.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (localCOM == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (localCOM != null && localCOM.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = localCOM.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = localCOM.zpp_inner.x;
    if (localCOM != null && localCOM.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = localCOM.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = localCOM.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (localCOM.zpp_inner.weak) {
      if (localCOM != null && localCOM.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = localCOM.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (localCOM.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = localCOM.zpp_inner;
      localCOM.zpp_inner.outer = null;
      localCOM.zpp_inner = null;
      var o = localCOM;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner.wrap_localCOM == null) {
      if (this.zpp_inner.type == 0) {
        this.zpp_inner.circle.setupLocalCOM();
      } else {
        this.zpp_inner.polygon.setupLocalCOM();
      }
    }
    return this.zpp_inner.wrap_localCOM;
  };
  Object.defineProperty(nape.shape.Shape.prototype, "area", {
    get: function() { return this.get_area(); },
  });
  nape.shape.Shape.prototype.get_area = function () {
    this.zpp_inner.validate_area_inertia();
    return this.zpp_inner.area;
  };
  Object.defineProperty(nape.shape.Shape.prototype, "inertia", {
    get: function() { return this.get_inertia(); },
  });
  nape.shape.Shape.prototype.get_inertia = function () {
    this.zpp_inner.validate_area_inertia();
    return this.zpp_inner.inertia;
  };
  Object.defineProperty(nape.shape.Shape.prototype, "angDrag", {
    get: function() { return this.get_angDrag(); },
  });
  nape.shape.Shape.prototype.get_angDrag = function () {
    this.zpp_inner.validate_angDrag();
    return this.zpp_inner.angDrag;
  };
  Object.defineProperty(nape.shape.Shape.prototype, "material", {
    get: function() { return this.get_material(); },
    set: function(v) { this.set_material(v); },
  });
  nape.shape.Shape.prototype.get_material = function () {
    return this.zpp_inner.material.wrapper();
  };
  nape.shape.Shape.prototype.set_material = function (material) {
    this.zpp_inner.immutable_midstep("Shape::material");
    if (material == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot assign null as Shape material"
      );
    }
    this.zpp_inner.setMaterial(material.zpp_inner);
    return this.zpp_inner.material.wrapper();
  };
  Object.defineProperty(nape.shape.Shape.prototype, "filter", {
    get: function() { return this.get_filter(); },
    set: function(v) { this.set_filter(v); },
  });
  nape.shape.Shape.prototype.get_filter = function () {
    return this.zpp_inner.filter.wrapper();
  };
  nape.shape.Shape.prototype.set_filter = function (filter) {
    this.zpp_inner.immutable_midstep("Shape::filter");
    if (filter == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null as Shape filter");
    }
    this.zpp_inner.setFilter(filter.zpp_inner);
    return this.zpp_inner.filter.wrapper();
  };
  Object.defineProperty(nape.shape.Shape.prototype, "fluidProperties", {
    get: function() { return this.get_fluidProperties(); },
    set: function(v) { this.set_fluidProperties(v); },
  });
  nape.shape.Shape.prototype.get_fluidProperties = function () {
    this.zpp_inner.immutable_midstep("Shape::fluidProperties");
    if (this.zpp_inner.fluidProperties == null) {
      this.zpp_inner.setFluid(new nape.phys.FluidProperties().zpp_inner);
    }
    return this.zpp_inner.fluidProperties.wrapper();
  };
  nape.shape.Shape.prototype.set_fluidProperties = function (fluidProperties) {
    if (fluidProperties == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot assign null as Shape fluidProperties, disable fluids by setting fluidEnabled to false"
      );
    }
    this.zpp_inner.setFluid(fluidProperties.zpp_inner);
    this.zpp_inner.immutable_midstep("Shape::fluidProperties");
    if (this.zpp_inner.fluidProperties == null) {
      this.zpp_inner.setFluid(new nape.phys.FluidProperties().zpp_inner);
    }
    return this.zpp_inner.fluidProperties.wrapper();
  };
  Object.defineProperty(nape.shape.Shape.prototype, "fluidEnabled", {
    get: function() { return this.get_fluidEnabled(); },
    set: function(v) { this.set_fluidEnabled(v); },
  });
  nape.shape.Shape.prototype.get_fluidEnabled = function () {
    return this.zpp_inner.fluidEnabled;
  };
  nape.shape.Shape.prototype.set_fluidEnabled = function (fluidEnabled) {
    this.zpp_inner.immutable_midstep("Shape::fluidEnabled");
    this.zpp_inner.fluidEnabled = fluidEnabled;
    if (fluidEnabled && this.zpp_inner.fluidProperties == null) {
      var fluidProperties = new nape.phys.FluidProperties();
      if (fluidProperties == null) {
        throw new js._Boot.HaxeError(
          "Error: Cannot assign null as Shape fluidProperties, disable fluids by setting fluidEnabled to false"
        );
      }
      this.zpp_inner.setFluid(fluidProperties.zpp_inner);
      this.zpp_inner.immutable_midstep("Shape::fluidProperties");
      if (this.zpp_inner.fluidProperties == null) {
        this.zpp_inner.setFluid(new nape.phys.FluidProperties().zpp_inner);
      }
      this.zpp_inner.fluidProperties.wrapper();
    }
    this.zpp_inner.wake();
    return this.zpp_inner.fluidEnabled;
  };
  Object.defineProperty(nape.shape.Shape.prototype, "sensorEnabled", {
    get: function() { return this.get_sensorEnabled(); },
    set: function(v) { this.set_sensorEnabled(v); },
  });
  nape.shape.Shape.prototype.get_sensorEnabled = function () {
    return this.zpp_inner.sensorEnabled;
  };
  nape.shape.Shape.prototype.set_sensorEnabled = function (sensorEnabled) {
    this.zpp_inner.immutable_midstep("Shape::sensorEnabled");
    this.zpp_inner.sensorEnabled = sensorEnabled;
    this.zpp_inner.wake();
    return this.zpp_inner.sensorEnabled;
  };
  Object.defineProperty(nape.shape.Shape.prototype, "bounds", {
    get: function() { return this.get_bounds(); },
  });
  nape.shape.Shape.prototype.get_bounds = function () {
    return this.zpp_inner.aabb.wrapper();
  };
  nape.shape.Shape.prototype.translate = function (translation) {
    this.zpp_inner.immutable_midstep("Shape::translate()");
    if (translation != null && translation.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (
      this.zpp_inner.body != null &&
      this.zpp_inner.body.space != null &&
      this.zpp_inner.body.type == 1
    ) {
      throw new js._Boot.HaxeError(
        "Error: Cannot modify Shape belonging to a static Object once inside a Space"
      );
    }
    if (translation == null) {
      throw new js._Boot.HaxeError("Error: Cannot displace Shape by null Vec2");
    }
    if (translation.lsq() > 0) {
      if (this.zpp_inner.type == 0) {
        var tmp = this.zpp_inner.circle;
        if (translation != null && translation.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this = translation.zpp_inner;
        if (_this._validate != null) {
          _this._validate();
        }
        var tmp1 = translation.zpp_inner.x;
        if (translation != null && translation.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this1 = translation.zpp_inner;
        if (_this1._validate != null) {
          _this1._validate();
        }
        tmp.__translate(tmp1, translation.zpp_inner.y);
      } else {
        var tmp2 = this.zpp_inner.polygon;
        if (translation != null && translation.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this2 = translation.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        var tmp3 = translation.zpp_inner.x;
        if (translation != null && translation.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this3 = translation.zpp_inner;
        if (_this3._validate != null) {
          _this3._validate();
        }
        tmp2.__translate(tmp3, translation.zpp_inner.y);
      }
    }
    if (translation.zpp_inner.weak) {
      if (translation != null && translation.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this4 = translation.zpp_inner;
      if (_this4._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this4._isimmutable != null) {
        _this4._isimmutable();
      }
      if (translation.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = translation.zpp_inner;
      translation.zpp_inner.outer = null;
      translation.zpp_inner = null;
      var o = translation;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    return this;
  };
  nape.shape.Shape.prototype.scale = function (scalex, scaley) {
    this.zpp_inner.immutable_midstep("Shape::scale()");
    if (
      this.zpp_inner.body != null &&
      this.zpp_inner.body.space != null &&
      this.zpp_inner.body.type == 1
    ) {
      throw new js._Boot.HaxeError(
        "Error: Cannot modify Shape belonging to a static Object once inside a Space"
      );
    }
    if (scalex != scalex || scaley != scaley) {
      throw new js._Boot.HaxeError("Error: Cannot scale Shape by NaN");
    }
    if (scalex == 0 || scaley == 0) {
      throw new js._Boot.HaxeError(
        "Error: Cannot Scale shape by a factor of 0"
      );
    }
    if (this.zpp_inner.type == 0) {
      var d = scalex * scalex - scaley * scaley;
      if (d * d < nape.Config.epsilon * nape.Config.epsilon) {
        this.zpp_inner.circle.__scale(scalex, scaley);
      } else {
        throw new js._Boot.HaxeError(
          "Error: Cannot perform a non equal scaling on a Circle"
        );
      }
    } else {
      this.zpp_inner.polygon.__scale(scalex, scaley);
    }
    return this;
  };
  nape.shape.Shape.prototype.rotate = function (angle) {
    this.zpp_inner.immutable_midstep("Shape::rotate()");
    if (
      this.zpp_inner.body != null &&
      this.zpp_inner.body.space != null &&
      this.zpp_inner.body.type == 1
    ) {
      throw new js._Boot.HaxeError(
        "Error: Cannot modify Shape belonging to a static Object once inside a Space"
      );
    }
    if (angle != angle) {
      throw new js._Boot.HaxeError("Error: Cannot rotate Shape by NaN");
    }
    var dr = angle % (2 * Math.PI);
    if (dr != 0.0) {
      var cos = Math.cos(angle);
      var sin = Math.sin(angle);
      if (this.zpp_inner.type == 0) {
        this.zpp_inner.circle.__rotate(sin, cos);
      } else {
        this.zpp_inner.polygon.__rotate(sin, cos);
      }
    }
    return this;
  };
  nape.shape.Shape.prototype.transform = function (matrix) {
    this.zpp_inner.immutable_midstep("Shape::transform()");
    if (
      this.zpp_inner.body != null &&
      this.zpp_inner.body.space != null &&
      this.zpp_inner.body.type == 1
    ) {
      throw new js._Boot.HaxeError(
        "Error: Cannot modify Shape belonging to a static Object once inside a Space"
      );
    }
    if (matrix == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot transform Shape by null matrix"
      );
    }
    if (matrix.singular()) {
      throw new js._Boot.HaxeError(
        "Error: Cannot transform Shape by a singular matrix"
      );
    }
    if (this.zpp_inner.type == 0) {
      if (matrix.equiorthogonal()) {
        this.zpp_inner.circle.__transform(matrix);
      } else {
        throw new js._Boot.HaxeError(
          "Error: Cannot transform Circle by a non equiorthogonal matrix"
        );
      }
    } else {
      this.zpp_inner.polygon.__transform(matrix);
    }
    return this;
  };
  nape.shape.Shape.prototype.contains = function (point) {
    if (point != null && point.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (point == null) {
      throw new js._Boot.HaxeError("Cannot check null point for containment");
    }
    if (
      (this.zpp_inner.body != null ? this.zpp_inner.body.outer : null) == null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Shape is not well defined without a Body"
      );
    }
    zpp_nape.geom.ZPP_Geom.validateShape(this.zpp_inner);
    var _this = point.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    var ret = zpp_nape.geom.ZPP_Collide.shapeContains(
      this.zpp_inner,
      point.zpp_inner
    );
    if (point.zpp_inner.weak) {
      if (point != null && point.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this1 = point.zpp_inner;
      if (_this1._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this1._isimmutable != null) {
        _this1._isimmutable();
      }
      if (point.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = point.zpp_inner;
      point.zpp_inner.outer = null;
      point.zpp_inner = null;
      var o = point;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    return ret;
  };
  nape.shape.Shape.prototype.copy = function () {
    return this.zpp_inner.copy();
  };
  nape.shape.Shape.prototype.toString = function () {
    var ret = this.zpp_inner.type == 0 ? "Circle" : "Polygon";
    return ret + "#" + this.zpp_inner_i.id;
  };
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
  nape.shape.Edge = $hxClasses["nape.shape.Edge"] = function () {
    this.zpp_inner = null;
    if (!zpp_nape.shape.ZPP_Edge.internal) {
      throw new js._Boot.HaxeError("Error: Cannot instantiate an Edge derp!");
    }
  };
  nape.shape.Edge.__name__ = ["nape", "shape", "Edge"];
  nape.shape.Edge.prototype.zpp_inner = null;
  Object.defineProperty(nape.shape.Edge.prototype, "polygon", {
    get: function() { return this.get_polygon(); },
  });
  nape.shape.Edge.prototype.get_polygon = function () {
    if (this.zpp_inner.polygon == null) {
      throw new js._Boot.HaxeError("Error: Edge not current in use");
    }
    return this.zpp_inner.polygon.outer_zn;
  };
  Object.defineProperty(nape.shape.Edge.prototype, "localNormal", {
    get: function() { return this.get_localNormal(); },
  });
  nape.shape.Edge.prototype.get_localNormal = function () {
    if (this.zpp_inner.polygon == null) {
      throw new js._Boot.HaxeError("Error: Edge not current in use");
    }
    if (this.zpp_inner.wrap_lnorm == null) {
      this.zpp_inner.getlnorm();
    }
    return this.zpp_inner.wrap_lnorm;
  };
  Object.defineProperty(nape.shape.Edge.prototype, "worldNormal", {
    get: function() { return this.get_worldNormal(); },
  });
  nape.shape.Edge.prototype.get_worldNormal = function () {
    if (this.zpp_inner.polygon == null) {
      throw new js._Boot.HaxeError("Error: Edge not current in use");
    }
    if (this.zpp_inner.wrap_gnorm == null) {
      this.zpp_inner.getgnorm();
    }
    return this.zpp_inner.wrap_gnorm;
  };
  Object.defineProperty(nape.shape.Edge.prototype, "length", {
    get: function() { return this.get_length(); },
  });
  nape.shape.Edge.prototype.get_length = function () {
    if (this.zpp_inner.polygon == null) {
      throw new js._Boot.HaxeError("Error: Edge not current in use");
    }
    this.zpp_inner.polygon.validate_laxi();
    return this.zpp_inner.length;
  };
  Object.defineProperty(nape.shape.Edge.prototype, "localProjection", {
    get: function() { return this.get_localProjection(); },
  });
  nape.shape.Edge.prototype.get_localProjection = function () {
    if (this.zpp_inner.polygon == null) {
      throw new js._Boot.HaxeError("Error: Edge not current in use");
    }
    this.zpp_inner.polygon.validate_laxi();
    return this.zpp_inner.lprojection;
  };
  Object.defineProperty(nape.shape.Edge.prototype, "worldProjection", {
    get: function() { return this.get_worldProjection(); },
  });
  nape.shape.Edge.prototype.get_worldProjection = function () {
    if (this.zpp_inner.polygon == null) {
      throw new js._Boot.HaxeError("Error: Edge not current in use");
    }
    if (this.zpp_inner.polygon.body == null) {
      throw new js._Boot.HaxeError(
        "Error: Edge world projection only makes sense for Polygons contained within a rigid body"
      );
    }
    var _this = this.zpp_inner.polygon;
    if (_this.zip_gaxi) {
      if (_this.body != null) {
        _this.zip_gaxi = false;
        _this.validate_laxi();
        var _this1 = _this.body;
        if (_this1.zip_axis) {
          _this1.zip_axis = false;
          _this1.axisx = Math.sin(_this1.rot);
          _this1.axisy = Math.cos(_this1.rot);
        }
        if (_this.zip_gverts) {
          if (_this.body != null) {
            _this.zip_gverts = false;
            _this.validate_lverts();
            var _this2 = _this.body;
            if (_this2.zip_axis) {
              _this2.zip_axis = false;
              _this2.axisx = Math.sin(_this2.rot);
              _this2.axisy = Math.cos(_this2.rot);
            }
            var li = _this.lverts.next;
            var cx_ite = _this.gverts.next;
            while (cx_ite != null) {
              var g = cx_ite;
              var l = li;
              li = li.next;
              g.x =
                _this.body.posx +
                (_this.body.axisy * l.x - _this.body.axisx * l.y);
              g.y =
                _this.body.posy +
                (l.x * _this.body.axisx + l.y * _this.body.axisy);
              cx_ite = cx_ite.next;
            }
          }
        }
        var ite = _this.edges.head;
        var cx_ite1 = _this.gverts.next;
        var u = cx_ite1;
        cx_ite1 = cx_ite1.next;
        while (cx_ite1 != null) {
          var v = cx_ite1;
          var e = ite.elt;
          ite = ite.next;
          e.gp0 = u;
          e.gp1 = v;
          e.gnormx = _this.body.axisy * e.lnormx - _this.body.axisx * e.lnormy;
          e.gnormy = e.lnormx * _this.body.axisx + e.lnormy * _this.body.axisy;
          e.gprojection =
            _this.body.posx * e.gnormx +
            _this.body.posy * e.gnormy +
            e.lprojection;
          if (e.wrap_gnorm != null) {
            e.wrap_gnorm.zpp_inner.x = e.gnormx;
            e.wrap_gnorm.zpp_inner.y = e.gnormy;
          }
          e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
          e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
          u = v;
          cx_ite1 = cx_ite1.next;
        }
        var v1 = _this.gverts.next;
        var e1 = ite.elt;
        ite = ite.next;
        e1.gp0 = u;
        e1.gp1 = v1;
        e1.gnormx = _this.body.axisy * e1.lnormx - _this.body.axisx * e1.lnormy;
        e1.gnormy = e1.lnormx * _this.body.axisx + e1.lnormy * _this.body.axisy;
        e1.gprojection =
          _this.body.posx * e1.gnormx +
          _this.body.posy * e1.gnormy +
          e1.lprojection;
        if (e1.wrap_gnorm != null) {
          e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
          e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
        }
        e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
        e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
      }
    }
    return this.zpp_inner.gprojection;
  };
  Object.defineProperty(nape.shape.Edge.prototype, "localVertex1", {
    get: function() { return this.get_localVertex1(); },
  });
  nape.shape.Edge.prototype.get_localVertex1 = function () {
    if (this.zpp_inner.polygon == null) {
      throw new js._Boot.HaxeError("Error: Edge not current in use");
    }
    this.zpp_inner.polygon.validate_laxi();
    var _this = this.zpp_inner.lp0;
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
  Object.defineProperty(nape.shape.Edge.prototype, "localVertex2", {
    get: function() { return this.get_localVertex2(); },
  });
  nape.shape.Edge.prototype.get_localVertex2 = function () {
    if (this.zpp_inner.polygon == null) {
      throw new js._Boot.HaxeError("Error: Edge not current in use");
    }
    this.zpp_inner.polygon.validate_laxi();
    var _this = this.zpp_inner.lp1;
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
  Object.defineProperty(nape.shape.Edge.prototype, "worldVertex1", {
    get: function() { return this.get_worldVertex1(); },
  });
  nape.shape.Edge.prototype.get_worldVertex1 = function () {
    if (this.zpp_inner.polygon == null) {
      throw new js._Boot.HaxeError("Error: Edge not current in use");
    }
    var _this = this.zpp_inner.polygon;
    if (_this.zip_gaxi) {
      if (_this.body != null) {
        _this.zip_gaxi = false;
        _this.validate_laxi();
        var _this1 = _this.body;
        if (_this1.zip_axis) {
          _this1.zip_axis = false;
          _this1.axisx = Math.sin(_this1.rot);
          _this1.axisy = Math.cos(_this1.rot);
        }
        if (_this.zip_gverts) {
          if (_this.body != null) {
            _this.zip_gverts = false;
            _this.validate_lverts();
            var _this2 = _this.body;
            if (_this2.zip_axis) {
              _this2.zip_axis = false;
              _this2.axisx = Math.sin(_this2.rot);
              _this2.axisy = Math.cos(_this2.rot);
            }
            var li = _this.lverts.next;
            var cx_ite = _this.gverts.next;
            while (cx_ite != null) {
              var g = cx_ite;
              var l = li;
              li = li.next;
              g.x =
                _this.body.posx +
                (_this.body.axisy * l.x - _this.body.axisx * l.y);
              g.y =
                _this.body.posy +
                (l.x * _this.body.axisx + l.y * _this.body.axisy);
              cx_ite = cx_ite.next;
            }
          }
        }
        var ite = _this.edges.head;
        var cx_ite1 = _this.gverts.next;
        var u = cx_ite1;
        cx_ite1 = cx_ite1.next;
        while (cx_ite1 != null) {
          var v = cx_ite1;
          var e = ite.elt;
          ite = ite.next;
          e.gp0 = u;
          e.gp1 = v;
          e.gnormx = _this.body.axisy * e.lnormx - _this.body.axisx * e.lnormy;
          e.gnormy = e.lnormx * _this.body.axisx + e.lnormy * _this.body.axisy;
          e.gprojection =
            _this.body.posx * e.gnormx +
            _this.body.posy * e.gnormy +
            e.lprojection;
          if (e.wrap_gnorm != null) {
            e.wrap_gnorm.zpp_inner.x = e.gnormx;
            e.wrap_gnorm.zpp_inner.y = e.gnormy;
          }
          e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
          e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
          u = v;
          cx_ite1 = cx_ite1.next;
        }
        var v1 = _this.gverts.next;
        var e1 = ite.elt;
        ite = ite.next;
        e1.gp0 = u;
        e1.gp1 = v1;
        e1.gnormx = _this.body.axisy * e1.lnormx - _this.body.axisx * e1.lnormy;
        e1.gnormy = e1.lnormx * _this.body.axisx + e1.lnormy * _this.body.axisy;
        e1.gprojection =
          _this.body.posx * e1.gnormx +
          _this.body.posy * e1.gnormy +
          e1.lprojection;
        if (e1.wrap_gnorm != null) {
          e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
          e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
        }
        e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
        e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
      }
    }
    var _this3 = this.zpp_inner.gp0;
    if (_this3.outer == null) {
      _this3.outer = new nape.geom.Vec2();
      var o = _this3.outer.zpp_inner;
      if (o.outer != null) {
        o.outer.zpp_inner = null;
        o.outer = null;
      }
      o._isimmutable = null;
      o._validate = null;
      o._invalidate = null;
      o.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o;
      _this3.outer.zpp_inner = _this3;
    }
    return _this3.outer;
  };
  Object.defineProperty(nape.shape.Edge.prototype, "worldVertex2", {
    get: function() { return this.get_worldVertex2(); },
  });
  nape.shape.Edge.prototype.get_worldVertex2 = function () {
    if (this.zpp_inner.polygon == null) {
      throw new js._Boot.HaxeError("Error: Edge not current in use");
    }
    var _this = this.zpp_inner.polygon;
    if (_this.zip_gaxi) {
      if (_this.body != null) {
        _this.zip_gaxi = false;
        _this.validate_laxi();
        var _this1 = _this.body;
        if (_this1.zip_axis) {
          _this1.zip_axis = false;
          _this1.axisx = Math.sin(_this1.rot);
          _this1.axisy = Math.cos(_this1.rot);
        }
        if (_this.zip_gverts) {
          if (_this.body != null) {
            _this.zip_gverts = false;
            _this.validate_lverts();
            var _this2 = _this.body;
            if (_this2.zip_axis) {
              _this2.zip_axis = false;
              _this2.axisx = Math.sin(_this2.rot);
              _this2.axisy = Math.cos(_this2.rot);
            }
            var li = _this.lverts.next;
            var cx_ite = _this.gverts.next;
            while (cx_ite != null) {
              var g = cx_ite;
              var l = li;
              li = li.next;
              g.x =
                _this.body.posx +
                (_this.body.axisy * l.x - _this.body.axisx * l.y);
              g.y =
                _this.body.posy +
                (l.x * _this.body.axisx + l.y * _this.body.axisy);
              cx_ite = cx_ite.next;
            }
          }
        }
        var ite = _this.edges.head;
        var cx_ite1 = _this.gverts.next;
        var u = cx_ite1;
        cx_ite1 = cx_ite1.next;
        while (cx_ite1 != null) {
          var v = cx_ite1;
          var e = ite.elt;
          ite = ite.next;
          e.gp0 = u;
          e.gp1 = v;
          e.gnormx = _this.body.axisy * e.lnormx - _this.body.axisx * e.lnormy;
          e.gnormy = e.lnormx * _this.body.axisx + e.lnormy * _this.body.axisy;
          e.gprojection =
            _this.body.posx * e.gnormx +
            _this.body.posy * e.gnormy +
            e.lprojection;
          if (e.wrap_gnorm != null) {
            e.wrap_gnorm.zpp_inner.x = e.gnormx;
            e.wrap_gnorm.zpp_inner.y = e.gnormy;
          }
          e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
          e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
          u = v;
          cx_ite1 = cx_ite1.next;
        }
        var v1 = _this.gverts.next;
        var e1 = ite.elt;
        ite = ite.next;
        e1.gp0 = u;
        e1.gp1 = v1;
        e1.gnormx = _this.body.axisy * e1.lnormx - _this.body.axisx * e1.lnormy;
        e1.gnormy = e1.lnormx * _this.body.axisx + e1.lnormy * _this.body.axisy;
        e1.gprojection =
          _this.body.posx * e1.gnormx +
          _this.body.posy * e1.gnormy +
          e1.lprojection;
        if (e1.wrap_gnorm != null) {
          e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
          e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
        }
        e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
        e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
      }
    }
    var _this3 = this.zpp_inner.gp1;
    if (_this3.outer == null) {
      _this3.outer = new nape.geom.Vec2();
      var o = _this3.outer.zpp_inner;
      if (o.outer != null) {
        o.outer.zpp_inner = null;
        o.outer = null;
      }
      o._isimmutable = null;
      o._validate = null;
      o._invalidate = null;
      o.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o;
      _this3.outer.zpp_inner = _this3;
    }
    return _this3.outer;
  };
  nape.shape.Edge.prototype.toString = function () {
    if (this.zpp_inner.polygon == null) {
      return "Edge(object-pooled)";
    } else if (this.zpp_inner.polygon.body == null) {
      this.zpp_inner.polygon.validate_laxi();
      return (
        "{ localNormal : " +
        ("{ x: " +
          this.zpp_inner.lnormx +
          " y: " +
          this.zpp_inner.lnormy +
          " }") +
        " }"
      );
    } else {
      var _this = this.zpp_inner.polygon;
      if (_this.zip_gaxi) {
        if (_this.body != null) {
          _this.zip_gaxi = false;
          _this.validate_laxi();
          var _this1 = _this.body;
          if (_this1.zip_axis) {
            _this1.zip_axis = false;
            _this1.axisx = Math.sin(_this1.rot);
            _this1.axisy = Math.cos(_this1.rot);
          }
          if (_this.zip_gverts) {
            if (_this.body != null) {
              _this.zip_gverts = false;
              _this.validate_lverts();
              var _this2 = _this.body;
              if (_this2.zip_axis) {
                _this2.zip_axis = false;
                _this2.axisx = Math.sin(_this2.rot);
                _this2.axisy = Math.cos(_this2.rot);
              }
              var li = _this.lverts.next;
              var cx_ite = _this.gverts.next;
              while (cx_ite != null) {
                var g = cx_ite;
                var l = li;
                li = li.next;
                g.x =
                  _this.body.posx +
                  (_this.body.axisy * l.x - _this.body.axisx * l.y);
                g.y =
                  _this.body.posy +
                  (l.x * _this.body.axisx + l.y * _this.body.axisy);
                cx_ite = cx_ite.next;
              }
            }
          }
          var ite = _this.edges.head;
          var cx_ite1 = _this.gverts.next;
          var u = cx_ite1;
          cx_ite1 = cx_ite1.next;
          while (cx_ite1 != null) {
            var v = cx_ite1;
            var e = ite.elt;
            ite = ite.next;
            e.gp0 = u;
            e.gp1 = v;
            e.gnormx =
              _this.body.axisy * e.lnormx - _this.body.axisx * e.lnormy;
            e.gnormy =
              e.lnormx * _this.body.axisx + e.lnormy * _this.body.axisy;
            e.gprojection =
              _this.body.posx * e.gnormx +
              _this.body.posy * e.gnormy +
              e.lprojection;
            if (e.wrap_gnorm != null) {
              e.wrap_gnorm.zpp_inner.x = e.gnormx;
              e.wrap_gnorm.zpp_inner.y = e.gnormy;
            }
            e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
            e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
            u = v;
            cx_ite1 = cx_ite1.next;
          }
          var v1 = _this.gverts.next;
          var e1 = ite.elt;
          ite = ite.next;
          e1.gp0 = u;
          e1.gp1 = v1;
          e1.gnormx =
            _this.body.axisy * e1.lnormx - _this.body.axisx * e1.lnormy;
          e1.gnormy =
            e1.lnormx * _this.body.axisx + e1.lnormy * _this.body.axisy;
          e1.gprojection =
            _this.body.posx * e1.gnormx +
            _this.body.posy * e1.gnormy +
            e1.lprojection;
          if (e1.wrap_gnorm != null) {
            e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
            e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
          }
          e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
          e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
        }
      }
      return (
        "{ localNormal : " +
        ("{ x: " +
          this.zpp_inner.lnormx +
          " y: " +
          this.zpp_inner.lnormy +
          " }") +
        " worldNormal : " +
        ("{ x: " +
          this.zpp_inner.gnormx +
          " y: " +
          this.zpp_inner.gnormy +
          " }") +
        " }"
      );
    }
  };
  nape.shape.Edge.prototype.__class__ = nape.shape.Edge;
  // nape.shape.EdgeIterator + nape.shape.EdgeList: converted to TypeScript → src/util/registerLists.ts
  // Registration handled by registerLists.ts at module load time.
  nape.shape.Polygon = $hxClasses["nape.shape.Polygon"] = function (
    localVerts,
    material,
    filter
  ) {
    this.zpp_inner_zn = null;
    nape.shape.Shape.zpp_internalAlloc = true;
    nape.shape.Shape.call(this);
    nape.shape.Shape.zpp_internalAlloc = false;
    if (localVerts == null) {
      throw new js._Boot.HaxeError("Error: localVerts cannot be null");
    }
    this.zpp_inner_zn = new zpp_nape.shape.ZPP_Polygon();
    this.zpp_inner_zn.outer = this;
    this.zpp_inner_zn.outer_zn = this;
    this.zpp_inner = this.zpp_inner_zn;
    this.zpp_inner_i = this.zpp_inner;
    this.zpp_inner_i.outer_i = this;
    if (localVerts instanceof Array) {
      var lv = localVerts;
      var _g = 0;
      while (_g < lv.length) {
        var vite = lv[_g];
        ++_g;
        if (vite == null) {
          throw new js._Boot.HaxeError(
            "Error: Array<Vec2> contains null objects"
          );
        }
        if (!(vite instanceof nape.geom.Vec2)) {
          throw new js._Boot.HaxeError(
            "Error: Array<Vec2> contains non Vec2 objects"
          );
        }
        var x = vite;
        if (x != null && x.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        if (this.zpp_inner_zn.wrap_lverts == null) {
          this.zpp_inner_zn.getlverts();
        }
        var tmp = this.zpp_inner_zn.wrap_lverts;
        if (x != null && x.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        if (x.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this = x.zpp_inner;
        if (_this._validate != null) {
          _this._validate();
        }
        var x1 = x.zpp_inner.x;
        if (x.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this1 = x.zpp_inner;
        if (_this1._validate != null) {
          _this1._validate();
        }
        var y = x.zpp_inner.y;
        var weak = false;
        if (weak == null) {
          weak = false;
        }
        if (y == null) {
          y = 0;
        }
        if (x1 == null) {
          x1 = 0;
        }
        if (x1 != x1 || y != y) {
          throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
        }
        var ret;
        if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
          ret = new nape.geom.Vec2();
        } else {
          ret = zpp_nape.util.ZPP_PubPool.poolVec2;
          zpp_nape.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
          ret.zpp_pool = null;
          ret.zpp_disp = false;
          if (ret == zpp_nape.util.ZPP_PubPool.nextVec2) {
            zpp_nape.util.ZPP_PubPool.nextVec2 = null;
          }
        }
        if (ret.zpp_inner == null) {
          var ret1;
          if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
            ret1 = new zpp_nape.geom.ZPP_Vec2();
          } else {
            ret1 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
            zpp_nape.geom.ZPP_Vec2.zpp_pool = ret1.next;
            ret1.next = null;
          }
          ret1.weak = false;
          ret1._immutable = false;
          ret1.x = x1;
          ret1.y = y;
          ret.zpp_inner = ret1;
          ret.zpp_inner.outer = ret;
        } else {
          if (ret != null && ret.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          var _this2 = ret.zpp_inner;
          if (_this2._immutable) {
            throw new js._Boot.HaxeError("Error: Vec2 is immutable");
          }
          if (_this2._isimmutable != null) {
            _this2._isimmutable();
          }
          if (x1 != x1 || y != y) {
            throw new js._Boot.HaxeError(
              "Error: Vec2 components cannot be NaN"
            );
          }
          var tmp1;
          if (ret != null && ret.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          var _this3 = ret.zpp_inner;
          if (_this3._validate != null) {
            _this3._validate();
          }
          if (ret.zpp_inner.x == x1) {
            if (ret != null && ret.zpp_disp) {
              throw new js._Boot.HaxeError(
                "Error: " + "Vec2" + " has been disposed and cannot be used!"
              );
            }
            var _this4 = ret.zpp_inner;
            if (_this4._validate != null) {
              _this4._validate();
            }
            tmp1 = ret.zpp_inner.y == y;
          } else {
            tmp1 = false;
          }
          if (!tmp1) {
            ret.zpp_inner.x = x1;
            ret.zpp_inner.y = y;
            var _this5 = ret.zpp_inner;
            if (_this5._invalidate != null) {
              _this5._invalidate(_this5);
            }
          }
        }
        ret.zpp_inner.weak = weak;
        tmp.push(ret);
      }
    } else if (localVerts instanceof nape.geom.Vec2List) {
      var lv1 = localVerts;
      var _g1 = lv1.iterator();
      while (true) {
        _g1.zpp_inner.zpp_inner.valmod();
        var length = _g1.zpp_inner.zpp_gl();
        _g1.zpp_critical = true;
        var tmp2;
        if (_g1.zpp_i < length) {
          tmp2 = true;
        } else {
          _g1.zpp_next = nape.geom.Vec2Iterator.zpp_pool;
          nape.geom.Vec2Iterator.zpp_pool = _g1;
          _g1.zpp_inner = null;
          tmp2 = false;
        }
        if (!tmp2) {
          break;
        }
        _g1.zpp_critical = false;
        var x2 = _g1.zpp_inner.at(_g1.zpp_i++);
        if (x2 == null) {
          throw new js._Boot.HaxeError("Error: Vec2List contains null objects");
        }
        if (x2 != null && x2.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        if (this.zpp_inner_zn.wrap_lverts == null) {
          this.zpp_inner_zn.getlverts();
        }
        var tmp3 = this.zpp_inner_zn.wrap_lverts;
        if (x2 != null && x2.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        if (x2.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this6 = x2.zpp_inner;
        if (_this6._validate != null) {
          _this6._validate();
        }
        var x3 = x2.zpp_inner.x;
        if (x2.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this7 = x2.zpp_inner;
        if (_this7._validate != null) {
          _this7._validate();
        }
        var y1 = x2.zpp_inner.y;
        var weak1 = false;
        if (weak1 == null) {
          weak1 = false;
        }
        if (y1 == null) {
          y1 = 0;
        }
        if (x3 == null) {
          x3 = 0;
        }
        if (x3 != x3 || y1 != y1) {
          throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
        }
        var ret2;
        if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
          ret2 = new nape.geom.Vec2();
        } else {
          ret2 = zpp_nape.util.ZPP_PubPool.poolVec2;
          zpp_nape.util.ZPP_PubPool.poolVec2 = ret2.zpp_pool;
          ret2.zpp_pool = null;
          ret2.zpp_disp = false;
          if (ret2 == zpp_nape.util.ZPP_PubPool.nextVec2) {
            zpp_nape.util.ZPP_PubPool.nextVec2 = null;
          }
        }
        if (ret2.zpp_inner == null) {
          var ret3;
          if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
            ret3 = new zpp_nape.geom.ZPP_Vec2();
          } else {
            ret3 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
            zpp_nape.geom.ZPP_Vec2.zpp_pool = ret3.next;
            ret3.next = null;
          }
          ret3.weak = false;
          ret3._immutable = false;
          ret3.x = x3;
          ret3.y = y1;
          ret2.zpp_inner = ret3;
          ret2.zpp_inner.outer = ret2;
        } else {
          if (ret2 != null && ret2.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          var _this8 = ret2.zpp_inner;
          if (_this8._immutable) {
            throw new js._Boot.HaxeError("Error: Vec2 is immutable");
          }
          if (_this8._isimmutable != null) {
            _this8._isimmutable();
          }
          if (x3 != x3 || y1 != y1) {
            throw new js._Boot.HaxeError(
              "Error: Vec2 components cannot be NaN"
            );
          }
          var tmp4;
          if (ret2 != null && ret2.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          var _this9 = ret2.zpp_inner;
          if (_this9._validate != null) {
            _this9._validate();
          }
          if (ret2.zpp_inner.x == x3) {
            if (ret2 != null && ret2.zpp_disp) {
              throw new js._Boot.HaxeError(
                "Error: " + "Vec2" + " has been disposed and cannot be used!"
              );
            }
            var _this10 = ret2.zpp_inner;
            if (_this10._validate != null) {
              _this10._validate();
            }
            tmp4 = ret2.zpp_inner.y == y1;
          } else {
            tmp4 = false;
          }
          if (!tmp4) {
            ret2.zpp_inner.x = x3;
            ret2.zpp_inner.y = y1;
            var _this11 = ret2.zpp_inner;
            if (_this11._invalidate != null) {
              _this11._invalidate(_this11);
            }
          }
        }
        ret2.zpp_inner.weak = weak1;
        tmp3.push(ret2);
      }
    } else if (localVerts instanceof nape.geom.GeomPoly) {
      var lv2 = localVerts;
      if (lv2 != null && lv2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "GeomPoly" + " has been disposed and cannot be used!"
        );
      }
      var verts = lv2.zpp_inner.vertices;
      if (verts != null) {
        var vite1 = verts;
        while (true) {
          var x4 = vite1.x;
          var y2 = vite1.y;
          if (y2 == null) {
            y2 = 0;
          }
          if (x4 == null) {
            x4 = 0;
          }
          if (x4 != x4 || y2 != y2) {
            throw new js._Boot.HaxeError(
              "Error: Vec2 components cannot be NaN"
            );
          }
          var ret4;
          if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
            ret4 = new nape.geom.Vec2();
          } else {
            ret4 = zpp_nape.util.ZPP_PubPool.poolVec2;
            zpp_nape.util.ZPP_PubPool.poolVec2 = ret4.zpp_pool;
            ret4.zpp_pool = null;
            ret4.zpp_disp = false;
            if (ret4 == zpp_nape.util.ZPP_PubPool.nextVec2) {
              zpp_nape.util.ZPP_PubPool.nextVec2 = null;
            }
          }
          if (ret4.zpp_inner == null) {
            var ret5;
            if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
              ret5 = new zpp_nape.geom.ZPP_Vec2();
            } else {
              ret5 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
              zpp_nape.geom.ZPP_Vec2.zpp_pool = ret5.next;
              ret5.next = null;
            }
            ret5.weak = false;
            ret5._immutable = false;
            ret5.x = x4;
            ret5.y = y2;
            ret4.zpp_inner = ret5;
            ret4.zpp_inner.outer = ret4;
          } else {
            if (ret4 != null && ret4.zpp_disp) {
              throw new js._Boot.HaxeError(
                "Error: " + "Vec2" + " has been disposed and cannot be used!"
              );
            }
            var _this12 = ret4.zpp_inner;
            if (_this12._immutable) {
              throw new js._Boot.HaxeError("Error: Vec2 is immutable");
            }
            if (_this12._isimmutable != null) {
              _this12._isimmutable();
            }
            if (x4 != x4 || y2 != y2) {
              throw new js._Boot.HaxeError(
                "Error: Vec2 components cannot be NaN"
              );
            }
            var tmp5;
            if (ret4 != null && ret4.zpp_disp) {
              throw new js._Boot.HaxeError(
                "Error: " + "Vec2" + " has been disposed and cannot be used!"
              );
            }
            var _this13 = ret4.zpp_inner;
            if (_this13._validate != null) {
              _this13._validate();
            }
            if (ret4.zpp_inner.x == x4) {
              if (ret4 != null && ret4.zpp_disp) {
                throw new js._Boot.HaxeError(
                  "Error: " + "Vec2" + " has been disposed and cannot be used!"
                );
              }
              var _this14 = ret4.zpp_inner;
              if (_this14._validate != null) {
                _this14._validate();
              }
              tmp5 = ret4.zpp_inner.y == y2;
            } else {
              tmp5 = false;
            }
            if (!tmp5) {
              ret4.zpp_inner.x = x4;
              ret4.zpp_inner.y = y2;
              var _this15 = ret4.zpp_inner;
              if (_this15._invalidate != null) {
                _this15._invalidate(_this15);
              }
            }
          }
          ret4.zpp_inner.weak = false;
          var x5 = ret4;
          vite1 = vite1.next;
          if (this.zpp_inner_zn.wrap_lverts == null) {
            this.zpp_inner_zn.getlverts();
          }
          var tmp6 = this.zpp_inner_zn.wrap_lverts;
          if (x5 != null && x5.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          if (x5.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          var _this16 = x5.zpp_inner;
          if (_this16._validate != null) {
            _this16._validate();
          }
          var x6 = x5.zpp_inner.x;
          if (x5.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          var _this17 = x5.zpp_inner;
          if (_this17._validate != null) {
            _this17._validate();
          }
          var y3 = x5.zpp_inner.y;
          var weak2 = false;
          if (weak2 == null) {
            weak2 = false;
          }
          if (y3 == null) {
            y3 = 0;
          }
          if (x6 == null) {
            x6 = 0;
          }
          if (x6 != x6 || y3 != y3) {
            throw new js._Boot.HaxeError(
              "Error: Vec2 components cannot be NaN"
            );
          }
          var ret6;
          if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
            ret6 = new nape.geom.Vec2();
          } else {
            ret6 = zpp_nape.util.ZPP_PubPool.poolVec2;
            zpp_nape.util.ZPP_PubPool.poolVec2 = ret6.zpp_pool;
            ret6.zpp_pool = null;
            ret6.zpp_disp = false;
            if (ret6 == zpp_nape.util.ZPP_PubPool.nextVec2) {
              zpp_nape.util.ZPP_PubPool.nextVec2 = null;
            }
          }
          if (ret6.zpp_inner == null) {
            var ret7;
            if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
              ret7 = new zpp_nape.geom.ZPP_Vec2();
            } else {
              ret7 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
              zpp_nape.geom.ZPP_Vec2.zpp_pool = ret7.next;
              ret7.next = null;
            }
            ret7.weak = false;
            ret7._immutable = false;
            ret7.x = x6;
            ret7.y = y3;
            ret6.zpp_inner = ret7;
            ret6.zpp_inner.outer = ret6;
          } else {
            if (ret6 != null && ret6.zpp_disp) {
              throw new js._Boot.HaxeError(
                "Error: " + "Vec2" + " has been disposed and cannot be used!"
              );
            }
            var _this18 = ret6.zpp_inner;
            if (_this18._immutable) {
              throw new js._Boot.HaxeError("Error: Vec2 is immutable");
            }
            if (_this18._isimmutable != null) {
              _this18._isimmutable();
            }
            if (x6 != x6 || y3 != y3) {
              throw new js._Boot.HaxeError(
                "Error: Vec2 components cannot be NaN"
              );
            }
            var tmp7;
            if (ret6 != null && ret6.zpp_disp) {
              throw new js._Boot.HaxeError(
                "Error: " + "Vec2" + " has been disposed and cannot be used!"
              );
            }
            var _this19 = ret6.zpp_inner;
            if (_this19._validate != null) {
              _this19._validate();
            }
            if (ret6.zpp_inner.x == x6) {
              if (ret6 != null && ret6.zpp_disp) {
                throw new js._Boot.HaxeError(
                  "Error: " + "Vec2" + " has been disposed and cannot be used!"
                );
              }
              var _this20 = ret6.zpp_inner;
              if (_this20._validate != null) {
                _this20._validate();
              }
              tmp7 = ret6.zpp_inner.y == y3;
            } else {
              tmp7 = false;
            }
            if (!tmp7) {
              ret6.zpp_inner.x = x6;
              ret6.zpp_inner.y = y3;
              var _this21 = ret6.zpp_inner;
              if (_this21._invalidate != null) {
                _this21._invalidate(_this21);
              }
            }
          }
          ret6.zpp_inner.weak = weak2;
          tmp6.push(ret6);
          if (x5 != null && x5.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          var _this22 = x5.zpp_inner;
          if (_this22._immutable) {
            throw new js._Boot.HaxeError("Error: Vec2 is immutable");
          }
          if (_this22._isimmutable != null) {
            _this22._isimmutable();
          }
          if (x5.zpp_inner._inuse) {
            throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
          }
          var inner = x5.zpp_inner;
          x5.zpp_inner.outer = null;
          x5.zpp_inner = null;
          var o = x5;
          o.zpp_pool = null;
          if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
            zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
          } else {
            zpp_nape.util.ZPP_PubPool.poolVec2 = o;
          }
          zpp_nape.util.ZPP_PubPool.nextVec2 = o;
          o.zpp_disp = true;
          var o1 = inner;
          if (o1.outer != null) {
            o1.outer.zpp_inner = null;
            o1.outer = null;
          }
          o1._isimmutable = null;
          o1._validate = null;
          o1._invalidate = null;
          o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
          zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
          if (vite1 == verts) {
            break;
          }
        }
      }
    } else {
      throw new js._Boot.HaxeError(
        "Error: Invalid type for polygon object, should be Array<Vec2>, Vec2List, GeomPoly or for flash10+ flash.Vector<Vec2>"
      );
    }
    if (localVerts instanceof Array) {
      var lv3 = localVerts;
      var i = 0;
      while (i < lv3.length) {
        var cur = lv3[i];
        var tmp8;
        if (cur.zpp_inner.weak) {
          if (cur != null && cur.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          var _this23 = cur.zpp_inner;
          if (_this23._immutable) {
            throw new js._Boot.HaxeError("Error: Vec2 is immutable");
          }
          if (_this23._isimmutable != null) {
            _this23._isimmutable();
          }
          if (cur.zpp_inner._inuse) {
            throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
          }
          var inner1 = cur.zpp_inner;
          cur.zpp_inner.outer = null;
          cur.zpp_inner = null;
          var o2 = cur;
          o2.zpp_pool = null;
          if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
            zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o2;
          } else {
            zpp_nape.util.ZPP_PubPool.poolVec2 = o2;
          }
          zpp_nape.util.ZPP_PubPool.nextVec2 = o2;
          o2.zpp_disp = true;
          var o3 = inner1;
          if (o3.outer != null) {
            o3.outer.zpp_inner = null;
            o3.outer = null;
          }
          o3._isimmutable = null;
          o3._validate = null;
          o3._invalidate = null;
          o3.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
          zpp_nape.geom.ZPP_Vec2.zpp_pool = o3;
          tmp8 = true;
        } else {
          tmp8 = false;
        }
        if (tmp8) {
          lv3.splice(i, 1);
          continue;
        }
        ++i;
      }
    } else if (localVerts instanceof nape.geom.Vec2List) {
      var lv4 = localVerts;
      if (lv4.zpp_inner._validate != null) {
        lv4.zpp_inner._validate();
      }
      var ins = lv4.zpp_inner.inner;
      var pre = null;
      var cur1 = ins.head;
      while (cur1 != null) {
        var x7 = cur1.elt;
        if (x7.outer.zpp_inner.weak) {
          cur1 = ins.erase(pre);
          if (x7.outer.zpp_inner.weak) {
            var _this24 = x7.outer;
            if (_this24 != null && _this24.zpp_disp) {
              throw new js._Boot.HaxeError(
                "Error: " + "Vec2" + " has been disposed and cannot be used!"
              );
            }
            var _this25 = _this24.zpp_inner;
            if (_this25._immutable) {
              throw new js._Boot.HaxeError("Error: Vec2 is immutable");
            }
            if (_this25._isimmutable != null) {
              _this25._isimmutable();
            }
            if (_this24.zpp_inner._inuse) {
              throw new js._Boot.HaxeError(
                "Error: This Vec2 is not disposable"
              );
            }
            var inner2 = _this24.zpp_inner;
            _this24.zpp_inner.outer = null;
            _this24.zpp_inner = null;
            var o4 = _this24;
            o4.zpp_pool = null;
            if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
              zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o4;
            } else {
              zpp_nape.util.ZPP_PubPool.poolVec2 = o4;
            }
            zpp_nape.util.ZPP_PubPool.nextVec2 = o4;
            o4.zpp_disp = true;
            var o5 = inner2;
            if (o5.outer != null) {
              o5.outer.zpp_inner = null;
              o5.outer = null;
            }
            o5._isimmutable = null;
            o5._validate = null;
            o5._invalidate = null;
            o5.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
            zpp_nape.geom.ZPP_Vec2.zpp_pool = o5;
          }
        } else {
          pre = cur1;
          cur1 = cur1.next;
        }
      }
    }
    if (material == null) {
      if (zpp_nape.phys.ZPP_Material.zpp_pool == null) {
        this.zpp_inner.material = new zpp_nape.phys.ZPP_Material();
      } else {
        this.zpp_inner.material = zpp_nape.phys.ZPP_Material.zpp_pool;
        zpp_nape.phys.ZPP_Material.zpp_pool = this.zpp_inner.material.next;
        this.zpp_inner.material.next = null;
      }
    } else {
      this.zpp_inner.immutable_midstep("Shape::material");
      if (material == null) {
        throw new js._Boot.HaxeError(
          "Error: Cannot assign null as Shape material"
        );
      }
      this.zpp_inner.setMaterial(material.zpp_inner);
      this.zpp_inner.material.wrapper();
    }
    if (filter == null) {
      if (zpp_nape.dynamics.ZPP_InteractionFilter.zpp_pool == null) {
        this.zpp_inner.filter = new zpp_nape.dynamics.ZPP_InteractionFilter();
      } else {
        this.zpp_inner.filter =
          zpp_nape.dynamics.ZPP_InteractionFilter.zpp_pool;
        zpp_nape.dynamics.ZPP_InteractionFilter.zpp_pool =
          this.zpp_inner.filter.next;
        this.zpp_inner.filter.next = null;
      }
    } else {
      this.zpp_inner.immutable_midstep("Shape::filter");
      if (filter == null) {
        throw new js._Boot.HaxeError(
          "Error: Cannot assign null as Shape filter"
        );
      }
      this.zpp_inner.setFilter(filter.zpp_inner);
      this.zpp_inner.filter.wrapper();
    }
    this.zpp_inner_i.insert_cbtype(
      zpp_nape.callbacks.ZPP_CbType.ANY_SHAPE.zpp_inner
    );
  };
  nape.shape.Polygon.__name__ = ["nape", "shape", "Polygon"];
  nape.shape.Polygon.__super__ = nape.shape.Shape;
  for (var k in nape.shape.Shape.prototype)
    nape.shape.Polygon.prototype[k] = nape.shape.Shape.prototype[k];
  nape.shape.Polygon.rect = function (x, y, width, height, weak) {
    if (weak == null) {
      weak = false;
    }
    if (x != x || y != y || width != width || height != height) {
      throw new js._Boot.HaxeError(
        "Error: Polygon.rect cannot accept NaN arguments"
      );
    }
    var x1 = x;
    var y1 = y;
    var weak1 = weak;
    if (weak1 == null) {
      weak1 = false;
    }
    if (y1 == null) {
      y1 = 0;
    }
    if (x1 == null) {
      x1 = 0;
    }
    if (x1 != x1 || y1 != y1) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var ret;
    if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
      ret = new nape.geom.Vec2();
    } else {
      ret = zpp_nape.util.ZPP_PubPool.poolVec2;
      zpp_nape.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == zpp_nape.util.ZPP_PubPool.nextVec2) {
        zpp_nape.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret.zpp_inner == null) {
      var ret1;
      if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
        ret1 = new zpp_nape.geom.ZPP_Vec2();
      } else {
        ret1 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.weak = false;
      ret1._immutable = false;
      ret1.x = x1;
      ret1.y = y1;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      if (ret != null && ret.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this = ret.zpp_inner;
      if (_this._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      if (x1 != x1 || y1 != y1) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp;
      if (ret != null && ret.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x1) {
        if (ret != null && ret.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        tmp = ret.zpp_inner.y == y1;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = x1;
        ret.zpp_inner.y = y1;
        var _this3 = ret.zpp_inner;
        if (_this3._invalidate != null) {
          _this3._invalidate(_this3);
        }
      }
    }
    ret.zpp_inner.weak = weak1;
    var x2 = x + width;
    var y2 = y;
    var weak2 = weak;
    if (weak2 == null) {
      weak2 = false;
    }
    if (y2 == null) {
      y2 = 0;
    }
    if (x2 == null) {
      x2 = 0;
    }
    if (x2 != x2 || y2 != y2) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var ret2;
    if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
      ret2 = new nape.geom.Vec2();
    } else {
      ret2 = zpp_nape.util.ZPP_PubPool.poolVec2;
      zpp_nape.util.ZPP_PubPool.poolVec2 = ret2.zpp_pool;
      ret2.zpp_pool = null;
      ret2.zpp_disp = false;
      if (ret2 == zpp_nape.util.ZPP_PubPool.nextVec2) {
        zpp_nape.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret2.zpp_inner == null) {
      var ret3;
      if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
        ret3 = new zpp_nape.geom.ZPP_Vec2();
      } else {
        ret3 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = ret3.next;
        ret3.next = null;
      }
      ret3.weak = false;
      ret3._immutable = false;
      ret3.x = x2;
      ret3.y = y2;
      ret2.zpp_inner = ret3;
      ret2.zpp_inner.outer = ret2;
    } else {
      if (ret2 != null && ret2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this4 = ret2.zpp_inner;
      if (_this4._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this4._isimmutable != null) {
        _this4._isimmutable();
      }
      if (x2 != x2 || y2 != y2) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp1;
      if (ret2 != null && ret2.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this5 = ret2.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      if (ret2.zpp_inner.x == x2) {
        if (ret2 != null && ret2.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this6 = ret2.zpp_inner;
        if (_this6._validate != null) {
          _this6._validate();
        }
        tmp1 = ret2.zpp_inner.y == y2;
      } else {
        tmp1 = false;
      }
      if (!tmp1) {
        ret2.zpp_inner.x = x2;
        ret2.zpp_inner.y = y2;
        var _this7 = ret2.zpp_inner;
        if (_this7._invalidate != null) {
          _this7._invalidate(_this7);
        }
      }
    }
    ret2.zpp_inner.weak = weak2;
    var x3 = x + width;
    var y3 = y + height;
    var weak3 = weak;
    if (weak3 == null) {
      weak3 = false;
    }
    if (y3 == null) {
      y3 = 0;
    }
    if (x3 == null) {
      x3 = 0;
    }
    if (x3 != x3 || y3 != y3) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var ret4;
    if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
      ret4 = new nape.geom.Vec2();
    } else {
      ret4 = zpp_nape.util.ZPP_PubPool.poolVec2;
      zpp_nape.util.ZPP_PubPool.poolVec2 = ret4.zpp_pool;
      ret4.zpp_pool = null;
      ret4.zpp_disp = false;
      if (ret4 == zpp_nape.util.ZPP_PubPool.nextVec2) {
        zpp_nape.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret4.zpp_inner == null) {
      var ret5;
      if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
        ret5 = new zpp_nape.geom.ZPP_Vec2();
      } else {
        ret5 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = ret5.next;
        ret5.next = null;
      }
      ret5.weak = false;
      ret5._immutable = false;
      ret5.x = x3;
      ret5.y = y3;
      ret4.zpp_inner = ret5;
      ret4.zpp_inner.outer = ret4;
    } else {
      if (ret4 != null && ret4.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = ret4.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (x3 != x3 || y3 != y3) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp2;
      if (ret4 != null && ret4.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this9 = ret4.zpp_inner;
      if (_this9._validate != null) {
        _this9._validate();
      }
      if (ret4.zpp_inner.x == x3) {
        if (ret4 != null && ret4.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this10 = ret4.zpp_inner;
        if (_this10._validate != null) {
          _this10._validate();
        }
        tmp2 = ret4.zpp_inner.y == y3;
      } else {
        tmp2 = false;
      }
      if (!tmp2) {
        ret4.zpp_inner.x = x3;
        ret4.zpp_inner.y = y3;
        var _this11 = ret4.zpp_inner;
        if (_this11._invalidate != null) {
          _this11._invalidate(_this11);
        }
      }
    }
    ret4.zpp_inner.weak = weak3;
    var x4 = x;
    var y4 = y + height;
    var weak4 = weak;
    if (weak4 == null) {
      weak4 = false;
    }
    if (y4 == null) {
      y4 = 0;
    }
    if (x4 == null) {
      x4 = 0;
    }
    if (x4 != x4 || y4 != y4) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var ret6;
    if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
      ret6 = new nape.geom.Vec2();
    } else {
      ret6 = zpp_nape.util.ZPP_PubPool.poolVec2;
      zpp_nape.util.ZPP_PubPool.poolVec2 = ret6.zpp_pool;
      ret6.zpp_pool = null;
      ret6.zpp_disp = false;
      if (ret6 == zpp_nape.util.ZPP_PubPool.nextVec2) {
        zpp_nape.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret6.zpp_inner == null) {
      var ret7;
      if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
        ret7 = new zpp_nape.geom.ZPP_Vec2();
      } else {
        ret7 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = ret7.next;
        ret7.next = null;
      }
      ret7.weak = false;
      ret7._immutable = false;
      ret7.x = x4;
      ret7.y = y4;
      ret6.zpp_inner = ret7;
      ret6.zpp_inner.outer = ret6;
    } else {
      if (ret6 != null && ret6.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this12 = ret6.zpp_inner;
      if (_this12._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this12._isimmutable != null) {
        _this12._isimmutable();
      }
      if (x4 != x4 || y4 != y4) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var tmp3;
      if (ret6 != null && ret6.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this13 = ret6.zpp_inner;
      if (_this13._validate != null) {
        _this13._validate();
      }
      if (ret6.zpp_inner.x == x4) {
        if (ret6 != null && ret6.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this14 = ret6.zpp_inner;
        if (_this14._validate != null) {
          _this14._validate();
        }
        tmp3 = ret6.zpp_inner.y == y4;
      } else {
        tmp3 = false;
      }
      if (!tmp3) {
        ret6.zpp_inner.x = x4;
        ret6.zpp_inner.y = y4;
        var _this15 = ret6.zpp_inner;
        if (_this15._invalidate != null) {
          _this15._invalidate(_this15);
        }
      }
    }
    ret6.zpp_inner.weak = weak4;
    return [ret, ret2, ret4, ret6];
  };
  nape.shape.Polygon.box = function (width, height, weak) {
    if (weak == null) {
      weak = false;
    }
    if (width != width || height != height) {
      throw new js._Boot.HaxeError(
        "Error: Polygon.box cannot accept NaN arguments"
      );
    }
    return nape.shape.Polygon.rect(
      -width / 2,
      -height / 2,
      width,
      height,
      weak
    );
  };
  nape.shape.Polygon.regular = function (
    xRadius,
    yRadius,
    edgeCount,
    angleOffset,
    weak
  ) {
    if (weak == null) {
      weak = false;
    }
    if (angleOffset == null) {
      angleOffset = 0.0;
    }
    if (
      xRadius != xRadius ||
      yRadius != yRadius ||
      angleOffset != angleOffset
    ) {
      throw new js._Boot.HaxeError(
        "Error: Polygon.regular cannot accept NaN arguments"
      );
    }
    var ret = [];
    var dangle = (Math.PI * 2) / edgeCount;
    var _g = 0;
    var _g1 = edgeCount;
    while (_g < _g1) {
      var i = _g++;
      var ang = i * dangle + angleOffset;
      var x = Math.cos(ang) * xRadius;
      var y = Math.sin(ang) * yRadius;
      var weak1 = weak;
      if (weak1 == null) {
        weak1 = false;
      }
      if (y == null) {
        y = 0;
      }
      if (x == null) {
        x = 0;
      }
      if (x != x || y != y) {
        throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
      }
      var ret1;
      if (zpp_nape.util.ZPP_PubPool.poolVec2 == null) {
        ret1 = new nape.geom.Vec2();
      } else {
        ret1 = zpp_nape.util.ZPP_PubPool.poolVec2;
        zpp_nape.util.ZPP_PubPool.poolVec2 = ret1.zpp_pool;
        ret1.zpp_pool = null;
        ret1.zpp_disp = false;
        if (ret1 == zpp_nape.util.ZPP_PubPool.nextVec2) {
          zpp_nape.util.ZPP_PubPool.nextVec2 = null;
        }
      }
      if (ret1.zpp_inner == null) {
        var ret2;
        if (zpp_nape.geom.ZPP_Vec2.zpp_pool == null) {
          ret2 = new zpp_nape.geom.ZPP_Vec2();
        } else {
          ret2 = zpp_nape.geom.ZPP_Vec2.zpp_pool;
          zpp_nape.geom.ZPP_Vec2.zpp_pool = ret2.next;
          ret2.next = null;
        }
        ret2.weak = false;
        ret2._immutable = false;
        ret2.x = x;
        ret2.y = y;
        ret1.zpp_inner = ret2;
        ret1.zpp_inner.outer = ret1;
      } else {
        if (ret1 != null && ret1.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this = ret1.zpp_inner;
        if (_this._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this._isimmutable != null) {
          _this._isimmutable();
        }
        if (x != x || y != y) {
          throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
        }
        var tmp;
        if (ret1 != null && ret1.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this1 = ret1.zpp_inner;
        if (_this1._validate != null) {
          _this1._validate();
        }
        if (ret1.zpp_inner.x == x) {
          if (ret1 != null && ret1.zpp_disp) {
            throw new js._Boot.HaxeError(
              "Error: " + "Vec2" + " has been disposed and cannot be used!"
            );
          }
          var _this2 = ret1.zpp_inner;
          if (_this2._validate != null) {
            _this2._validate();
          }
          tmp = ret1.zpp_inner.y == y;
        } else {
          tmp = false;
        }
        if (!tmp) {
          ret1.zpp_inner.x = x;
          ret1.zpp_inner.y = y;
          var _this3 = ret1.zpp_inner;
          if (_this3._invalidate != null) {
            _this3._invalidate(_this3);
          }
        }
      }
      ret1.zpp_inner.weak = weak1;
      var x1 = ret1;
      ret.push(x1);
    }
    return ret;
  };
  nape.shape.Polygon.prototype.zpp_inner_zn = null;
  Object.defineProperty(nape.shape.Polygon.prototype, "localVerts", {
    get: function() { return this.get_localVerts(); },
  });
  nape.shape.Polygon.prototype.get_localVerts = function () {
    if (this.zpp_inner_zn.wrap_lverts == null) {
      this.zpp_inner_zn.getlverts();
    }
    return this.zpp_inner_zn.wrap_lverts;
  };
  Object.defineProperty(nape.shape.Polygon.prototype, "worldVerts", {
    get: function() { return this.get_worldVerts(); },
  });
  nape.shape.Polygon.prototype.get_worldVerts = function () {
    if (this.zpp_inner_zn.wrap_gverts == null) {
      this.zpp_inner_zn.getgverts();
    }
    return this.zpp_inner_zn.wrap_gverts;
  };
  Object.defineProperty(nape.shape.Polygon.prototype, "edges", {
    get: function() { return this.get_edges(); },
  });
  nape.shape.Polygon.prototype.get_edges = function () {
    if (this.zpp_inner_zn.wrap_edges == null) {
      this.zpp_inner_zn.getedges();
    }
    return this.zpp_inner_zn.wrap_edges;
  };
  nape.shape.Polygon.prototype.validity = function () {
    return this.zpp_inner_zn.valid();
  };
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
  nape.space.Space = $hxClasses["nape.space.Space"] = function (
    gravity,
    broadphase
  ) {
    this.zpp_inner = null;
    if (gravity != null && gravity.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    this.zpp_inner = new zpp_nape.space.ZPP_Space(
      gravity == null ? null : gravity.zpp_inner,
      broadphase
    );
    this.zpp_inner.outer = this;
    if (gravity != null) {
      if (gravity.zpp_inner.weak) {
        if (gravity != null && gravity.zpp_disp) {
          throw new js._Boot.HaxeError(
            "Error: " + "Vec2" + " has been disposed and cannot be used!"
          );
        }
        var _this = gravity.zpp_inner;
        if (_this._immutable) {
          throw new js._Boot.HaxeError("Error: Vec2 is immutable");
        }
        if (_this._isimmutable != null) {
          _this._isimmutable();
        }
        if (gravity.zpp_inner._inuse) {
          throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
        }
        var inner = gravity.zpp_inner;
        gravity.zpp_inner.outer = null;
        gravity.zpp_inner = null;
        var o = gravity;
        o.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o;
        o.zpp_disp = true;
        var o1 = inner;
        if (o1.outer != null) {
          o1.outer.zpp_inner = null;
          o1.outer = null;
        }
        o1._isimmutable = null;
        o1._validate = null;
        o1._invalidate = null;
        o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
      }
    }
  };
  nape.space.Space.__name__ = ["nape", "space", "Space"];
  nape.space.Space.prototype.zpp_inner = null;
  Object.defineProperty(nape.space.Space.prototype, "userData", {
    get: function() { return this.get_userData(); },
  });
  nape.space.Space.prototype.get_userData = function () {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  };
  Object.defineProperty(nape.space.Space.prototype, "gravity", {
    get: function() { return this.get_gravity(); },
    set: function(v) { this.set_gravity(v); },
  });
  nape.space.Space.prototype.get_gravity = function () {
    if (this.zpp_inner.wrap_gravity == null) {
      this.zpp_inner.getgravity();
    }
    return this.zpp_inner.wrap_gravity;
  };
  nape.space.Space.prototype.set_gravity = function (gravity) {
    if (gravity != null && gravity.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (gravity == null) {
      throw new js._Boot.HaxeError("Error: Space::gravity cannot be null");
    }
    if (this.zpp_inner.wrap_gravity == null) {
      this.zpp_inner.getgravity();
    }
    var _this = this.zpp_inner.wrap_gravity;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (gravity != null && gravity.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = _this.zpp_inner;
    if (_this1._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this1._isimmutable != null) {
      _this1._isimmutable();
    }
    if (gravity == null) {
      throw new js._Boot.HaxeError("Error: Cannot assign null Vec2");
    }
    if (gravity != null && gravity.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this2 = gravity.zpp_inner;
    if (_this2._validate != null) {
      _this2._validate();
    }
    var x = gravity.zpp_inner.x;
    if (gravity != null && gravity.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this3 = gravity.zpp_inner;
    if (_this3._validate != null) {
      _this3._validate();
    }
    var y = gravity.zpp_inner.y;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this4 = _this.zpp_inner;
    if (_this4._immutable) {
      throw new js._Boot.HaxeError("Error: Vec2 is immutable");
    }
    if (_this4._isimmutable != null) {
      _this4._isimmutable();
    }
    if (x != x || y != y) {
      throw new js._Boot.HaxeError("Error: Vec2 components cannot be NaN");
    }
    var tmp;
    if (_this != null && _this.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this5 = _this.zpp_inner;
    if (_this5._validate != null) {
      _this5._validate();
    }
    if (_this.zpp_inner.x == x) {
      if (_this != null && _this.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this6 = _this.zpp_inner;
      if (_this6._validate != null) {
        _this6._validate();
      }
      tmp = _this.zpp_inner.y == y;
    } else {
      tmp = false;
    }
    if (!tmp) {
      _this.zpp_inner.x = x;
      _this.zpp_inner.y = y;
      var _this7 = _this.zpp_inner;
      if (_this7._invalidate != null) {
        _this7._invalidate(_this7);
      }
    }
    var ret = _this;
    if (gravity.zpp_inner.weak) {
      if (gravity != null && gravity.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this8 = gravity.zpp_inner;
      if (_this8._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this8._isimmutable != null) {
        _this8._isimmutable();
      }
      if (gravity.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = gravity.zpp_inner;
      gravity.zpp_inner.outer = null;
      gravity.zpp_inner = null;
      var o = gravity;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    if (this.zpp_inner.wrap_gravity == null) {
      this.zpp_inner.getgravity();
    }
    return this.zpp_inner.wrap_gravity;
  };
  Object.defineProperty(nape.space.Space.prototype, "broadphase", {
    get: function() { return this.get_broadphase(); },
  });
  nape.space.Space.prototype.get_broadphase = function () {
    if (this.zpp_inner.bphase.is_sweep) {
      if (zpp_nape.util.ZPP_Flags.Broadphase_SWEEP_AND_PRUNE == null) {
        zpp_nape.util.ZPP_Flags.internal = true;
        zpp_nape.util.ZPP_Flags.Broadphase_SWEEP_AND_PRUNE =
          new nape.space.Broadphase();
        zpp_nape.util.ZPP_Flags.internal = false;
      }
      return zpp_nape.util.ZPP_Flags.Broadphase_SWEEP_AND_PRUNE;
    } else {
      if (zpp_nape.util.ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE == null) {
        zpp_nape.util.ZPP_Flags.internal = true;
        zpp_nape.util.ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE =
          new nape.space.Broadphase();
        zpp_nape.util.ZPP_Flags.internal = false;
      }
      return zpp_nape.util.ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE;
    }
  };
  Object.defineProperty(nape.space.Space.prototype, "sortContacts", {
    get: function() { return this.get_sortContacts(); },
    set: function(v) { this.set_sortContacts(v); },
  });
  nape.space.Space.prototype.get_sortContacts = function () {
    return this.zpp_inner.sortcontacts;
  };
  nape.space.Space.prototype.set_sortContacts = function (sortContacts) {
    this.zpp_inner.sortcontacts = sortContacts;
    return this.zpp_inner.sortcontacts;
  };
  Object.defineProperty(nape.space.Space.prototype, "worldAngularDrag", {
    get: function() { return this.get_worldAngularDrag(); },
    set: function(v) { this.set_worldAngularDrag(v); },
  });
  nape.space.Space.prototype.get_worldAngularDrag = function () {
    return this.zpp_inner.global_ang_drag;
  };
  nape.space.Space.prototype.set_worldAngularDrag = function (
    worldAngularDrag
  ) {
    var d = worldAngularDrag;
    if (d != d) {
      throw new js._Boot.HaxeError(
        "Error: Space::worldAngularDrag cannot be NaN"
      );
    }
    this.zpp_inner.global_ang_drag = d;
    return this.zpp_inner.global_ang_drag;
  };
  Object.defineProperty(nape.space.Space.prototype, "worldLinearDrag", {
    get: function() { return this.get_worldLinearDrag(); },
    set: function(v) { this.set_worldLinearDrag(v); },
  });
  nape.space.Space.prototype.get_worldLinearDrag = function () {
    return this.zpp_inner.global_lin_drag;
  };
  nape.space.Space.prototype.set_worldLinearDrag = function (worldLinearDrag) {
    var d = worldLinearDrag;
    if (d != d) {
      throw new js._Boot.HaxeError(
        "Error: Space::worldLinearDrag cannot be NaN"
      );
    }
    this.zpp_inner.global_lin_drag = d;
    return this.zpp_inner.global_lin_drag;
  };
  Object.defineProperty(nape.space.Space.prototype, "compounds", {
    get: function() { return this.get_compounds(); },
  });
  nape.space.Space.prototype.get_compounds = function () {
    return this.zpp_inner.wrap_compounds;
  };
  Object.defineProperty(nape.space.Space.prototype, "bodies", {
    get: function() { return this.get_bodies(); },
  });
  nape.space.Space.prototype.get_bodies = function () {
    return this.zpp_inner.wrap_bodies;
  };
  Object.defineProperty(nape.space.Space.prototype, "liveBodies", {
    get: function() { return this.get_liveBodies(); },
  });
  nape.space.Space.prototype.get_liveBodies = function () {
    return this.zpp_inner.wrap_live;
  };
  Object.defineProperty(nape.space.Space.prototype, "constraints", {
    get: function() { return this.get_constraints(); },
  });
  nape.space.Space.prototype.get_constraints = function () {
    return this.zpp_inner.wrap_constraints;
  };
  Object.defineProperty(nape.space.Space.prototype, "liveConstraints", {
    get: function() { return this.get_liveConstraints(); },
  });
  nape.space.Space.prototype.get_liveConstraints = function () {
    return this.zpp_inner.wrap_livecon;
  };
  nape.space.Space.prototype.visitBodies = function (lambda) {
    if (lambda == null) {
      throw new js._Boot.HaxeError(
        "Error: lambda cannot be null for Space::visitBodies"
      );
    }
    var _this = this.zpp_inner.wrap_bodies;
    _this.zpp_inner.valmod();
    var _g = nape.phys.BodyIterator.get(_this);
    while (true) {
      _g.zpp_inner.zpp_inner.valmod();
      var _this1 = _g.zpp_inner;
      _this1.zpp_inner.valmod();
      if (_this1.zpp_inner.zip_length) {
        _this1.zpp_inner.zip_length = false;
        _this1.zpp_inner.user_length = _this1.zpp_inner.inner.length;
      }
      var length = _this1.zpp_inner.user_length;
      _g.zpp_critical = true;
      var tmp;
      if (_g.zpp_i < length) {
        tmp = true;
      } else {
        _g.zpp_next = nape.phys.BodyIterator.zpp_pool;
        nape.phys.BodyIterator.zpp_pool = _g;
        _g.zpp_inner = null;
        tmp = false;
      }
      if (!tmp) {
        break;
      }
      _g.zpp_critical = false;
      var b = _g.zpp_inner.at(_g.zpp_i++);
      lambda(b);
    }
    var _this2 = this.zpp_inner.wrap_compounds;
    _this2.zpp_inner.valmod();
    var _g1 = nape.phys.CompoundIterator.get(_this2);
    while (true) {
      _g1.zpp_inner.zpp_inner.valmod();
      var _this3 = _g1.zpp_inner;
      _this3.zpp_inner.valmod();
      if (_this3.zpp_inner.zip_length) {
        _this3.zpp_inner.zip_length = false;
        _this3.zpp_inner.user_length = _this3.zpp_inner.inner.length;
      }
      var length1 = _this3.zpp_inner.user_length;
      _g1.zpp_critical = true;
      var tmp1;
      if (_g1.zpp_i < length1) {
        tmp1 = true;
      } else {
        _g1.zpp_next = nape.phys.CompoundIterator.zpp_pool;
        nape.phys.CompoundIterator.zpp_pool = _g1;
        _g1.zpp_inner = null;
        tmp1 = false;
      }
      if (!tmp1) {
        break;
      }
      _g1.zpp_critical = false;
      var c = _g1.zpp_inner.at(_g1.zpp_i++);
      c.visitBodies(lambda);
    }
  };
  nape.space.Space.prototype.visitConstraints = function (lambda) {
    if (lambda == null) {
      throw new js._Boot.HaxeError(
        "Error: lambda cannot be null for Space::visitConstraints"
      );
    }
    var _this = this.zpp_inner.wrap_constraints;
    _this.zpp_inner.valmod();
    var _g = nape.constraint.ConstraintIterator.get(_this);
    while (true) {
      _g.zpp_inner.zpp_inner.valmod();
      var _this1 = _g.zpp_inner;
      _this1.zpp_inner.valmod();
      if (_this1.zpp_inner.zip_length) {
        _this1.zpp_inner.zip_length = false;
        _this1.zpp_inner.user_length = _this1.zpp_inner.inner.length;
      }
      var length = _this1.zpp_inner.user_length;
      _g.zpp_critical = true;
      var tmp;
      if (_g.zpp_i < length) {
        tmp = true;
      } else {
        _g.zpp_next = nape.constraint.ConstraintIterator.zpp_pool;
        nape.constraint.ConstraintIterator.zpp_pool = _g;
        _g.zpp_inner = null;
        tmp = false;
      }
      if (!tmp) {
        break;
      }
      _g.zpp_critical = false;
      var c = _g.zpp_inner.at(_g.zpp_i++);
      lambda(c);
    }
    var _this2 = this.zpp_inner.wrap_compounds;
    _this2.zpp_inner.valmod();
    var _g1 = nape.phys.CompoundIterator.get(_this2);
    while (true) {
      _g1.zpp_inner.zpp_inner.valmod();
      var _this3 = _g1.zpp_inner;
      _this3.zpp_inner.valmod();
      if (_this3.zpp_inner.zip_length) {
        _this3.zpp_inner.zip_length = false;
        _this3.zpp_inner.user_length = _this3.zpp_inner.inner.length;
      }
      var length1 = _this3.zpp_inner.user_length;
      _g1.zpp_critical = true;
      var tmp1;
      if (_g1.zpp_i < length1) {
        tmp1 = true;
      } else {
        _g1.zpp_next = nape.phys.CompoundIterator.zpp_pool;
        nape.phys.CompoundIterator.zpp_pool = _g1;
        _g1.zpp_inner = null;
        tmp1 = false;
      }
      if (!tmp1) {
        break;
      }
      _g1.zpp_critical = false;
      var c1 = _g1.zpp_inner.at(_g1.zpp_i++);
      c1.visitConstraints(lambda);
    }
  };
  nape.space.Space.prototype.visitCompounds = function (lambda) {
    if (lambda == null) {
      throw new js._Boot.HaxeError(
        "Error: lambda cannot be null for Space::visitCompounds"
      );
    }
    var _this = this.zpp_inner.wrap_compounds;
    _this.zpp_inner.valmod();
    var _g = nape.phys.CompoundIterator.get(_this);
    while (true) {
      _g.zpp_inner.zpp_inner.valmod();
      var _this1 = _g.zpp_inner;
      _this1.zpp_inner.valmod();
      if (_this1.zpp_inner.zip_length) {
        _this1.zpp_inner.zip_length = false;
        _this1.zpp_inner.user_length = _this1.zpp_inner.inner.length;
      }
      var length = _this1.zpp_inner.user_length;
      _g.zpp_critical = true;
      var tmp;
      if (_g.zpp_i < length) {
        tmp = true;
      } else {
        _g.zpp_next = nape.phys.CompoundIterator.zpp_pool;
        nape.phys.CompoundIterator.zpp_pool = _g;
        _g.zpp_inner = null;
        tmp = false;
      }
      if (!tmp) {
        break;
      }
      _g.zpp_critical = false;
      var c = _g.zpp_inner.at(_g.zpp_i++);
      lambda(c);
      c.visitCompounds(lambda);
    }
  };
  Object.defineProperty(nape.space.Space.prototype, "world", {
    get: function() { return this.get_world(); },
  });
  nape.space.Space.prototype.get_world = function () {
    return this.zpp_inner.__static;
  };
  Object.defineProperty(nape.space.Space.prototype, "arbiters", {
    get: function() { return this.get_arbiters(); },
  });
  nape.space.Space.prototype.get_arbiters = function () {
    if (this.zpp_inner.wrap_arbiters == null) {
      var ret = new zpp_nape.dynamics.ZPP_SpaceArbiterList();
      ret.space = this.zpp_inner;
      this.zpp_inner.wrap_arbiters = ret;
    }
    return this.zpp_inner.wrap_arbiters;
  };
  Object.defineProperty(nape.space.Space.prototype, "listeners", {
    get: function() { return this.get_listeners(); },
  });
  nape.space.Space.prototype.get_listeners = function () {
    return this.zpp_inner.wrap_listeners;
  };
  nape.space.Space.prototype.clear = function () {
    if (this.zpp_inner.midstep) {
      throw new js._Boot.HaxeError(
        "Error: Space::clear() cannot be called during space step()"
      );
    }
    this.zpp_inner.clear();
  };
  nape.space.Space.prototype.step = function (
    deltaTime,
    velocityIterations,
    positionIterations
  ) {
    if (positionIterations == null) {
      positionIterations = 10;
    }
    if (velocityIterations == null) {
      velocityIterations = 10;
    }
    if (deltaTime != deltaTime) {
      throw new js._Boot.HaxeError("Error: deltaTime cannot be NaN");
    }
    if (deltaTime <= 0) {
      throw new js._Boot.HaxeError(
        "Error: deltaTime must be strictly positive"
      );
    }
    if (velocityIterations <= 0) {
      throw new js._Boot.HaxeError(
        "Error: must use atleast one velocity iteration"
      );
    }
    if (positionIterations <= 0) {
      throw new js._Boot.HaxeError(
        "Error: must use atleast one position iteration"
      );
    }
    this.zpp_inner.step(deltaTime, velocityIterations, positionIterations);
  };
  Object.defineProperty(nape.space.Space.prototype, "timeStamp", {
    get: function() { return this.get_timeStamp(); },
  });
  nape.space.Space.prototype.get_timeStamp = function () {
    return this.zpp_inner.stamp;
  };
  Object.defineProperty(nape.space.Space.prototype, "elapsedTime", {
    get: function() { return this.get_elapsedTime(); },
  });
  nape.space.Space.prototype.get_elapsedTime = function () {
    return this.zpp_inner.time;
  };
  nape.space.Space.prototype.interactionType = function (shape1, shape2) {
    if (shape1 == null || shape2 == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate interaction type for null shapes"
      );
    }
    if (
      (shape1.zpp_inner.body != null ? shape1.zpp_inner.body.outer : null) ==
        null ||
      (shape2.zpp_inner.body != null ? shape2.zpp_inner.body.outer : null) ==
        null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate interaction type for shapes not part of a Body"
      );
    }
    if (
      (shape1.zpp_inner.body != null ? shape1.zpp_inner.body.outer : null)
        .zpp_inner.type == 1 &&
      (shape2.zpp_inner.body != null ? shape2.zpp_inner.body.outer : null)
        .zpp_inner.type == 1
    ) {
      return null;
    }
    if (
      (shape1.zpp_inner.body != null ? shape1.zpp_inner.body.outer : null) ==
      (shape2.zpp_inner.body != null ? shape2.zpp_inner.body.outer : null)
    ) {
      return null;
    }
    var s1 = shape1.zpp_inner;
    var s2 = shape2.zpp_inner;
    var _this = this.zpp_inner;
    var b1 = s1.body;
    var b2 = s2.body;
    var con_ignore;
    con_ignore = false;
    var cx_ite = b1.constraints.head;
    while (cx_ite != null) {
      var con = cx_ite.elt;
      if (con.ignore && con.pair_exists(b1.id, b2.id)) {
        con_ignore = true;
        break;
      }
      cx_ite = cx_ite.next;
    }
    var _g;
    var _g1;
    if (!con_ignore) {
      var cur = s1;
      while (cur != null && cur.group == null)
        if (cur.ishape != null) {
          cur = cur.ishape.body;
        } else if (cur.icompound != null) {
          cur = cur.icompound.compound;
        } else {
          cur = cur.ibody.compound;
        }
      var g1 = cur == null ? null : cur.group;
      var _g2;
      if (g1 == null) {
        _g2 = false;
      } else {
        var cur1 = s2;
        while (cur1 != null && cur1.group == null)
          if (cur1.ishape != null) {
            cur1 = cur1.ishape.body;
          } else if (cur1.icompound != null) {
            cur1 = cur1.icompound.compound;
          } else {
            cur1 = cur1.ibody.compound;
          }
        var g2 = cur1 == null ? null : cur1.group;
        if (g2 == null) {
          _g2 = false;
        } else {
          var ret = false;
          while (g1 != null && g2 != null) {
            if (g1 == g2) {
              ret = g1.ignore;
              break;
            }
            if (g1.depth < g2.depth) {
              g2 = g2.group;
            } else {
              g1 = g1.group;
            }
          }
          _g2 = ret;
        }
      }
      _g1 = !_g2;
    } else {
      _g1 = false;
    }
    if (_g1) {
      var _g3;
      if (s1.sensorEnabled || s2.sensorEnabled) {
        var _this1 = s1.filter;
        var x = s2.filter;
        _g3 =
          (_this1.sensorMask & x.sensorGroup) != 0 &&
          (x.sensorMask & _this1.sensorGroup) != 0;
      } else {
        _g3 = false;
      }
      if (_g3) {
        _g = 2;
      } else {
        var _g4;
        if (s1.fluidEnabled || s2.fluidEnabled) {
          var _this2 = s1.filter;
          var x1 = s2.filter;
          _g4 =
            (_this2.fluidMask & x1.fluidGroup) != 0 &&
            (x1.fluidMask & _this2.fluidGroup) != 0;
        } else {
          _g4 = false;
        }
        if (
          _g4 &&
          !(
            b1.imass == 0 &&
            b2.imass == 0 &&
            b1.iinertia == 0 &&
            b2.iinertia == 0
          )
        ) {
          _g = 0;
        } else {
          var _this3 = s1.filter;
          var x2 = s2.filter;
          _g =
            (_this3.collisionMask & x2.collisionGroup) != 0 &&
            (x2.collisionMask & _this3.collisionGroup) != 0 &&
            !(
              b1.imass == 0 &&
              b2.imass == 0 &&
              b1.iinertia == 0 &&
              b2.iinertia == 0
            )
              ? 1
              : -1;
        }
      }
    } else {
      _g = -1;
    }
    switch (_g) {
      case 0:
        if (zpp_nape.util.ZPP_Flags.InteractionType_FLUID == null) {
          zpp_nape.util.ZPP_Flags.internal = true;
          zpp_nape.util.ZPP_Flags.InteractionType_FLUID =
            new nape.callbacks.InteractionType();
          zpp_nape.util.ZPP_Flags.internal = false;
        }
        return zpp_nape.util.ZPP_Flags.InteractionType_FLUID;
      case 1:
        if (zpp_nape.util.ZPP_Flags.InteractionType_COLLISION == null) {
          zpp_nape.util.ZPP_Flags.internal = true;
          zpp_nape.util.ZPP_Flags.InteractionType_COLLISION =
            new nape.callbacks.InteractionType();
          zpp_nape.util.ZPP_Flags.internal = false;
        }
        return zpp_nape.util.ZPP_Flags.InteractionType_COLLISION;
      case 2:
        if (zpp_nape.util.ZPP_Flags.InteractionType_SENSOR == null) {
          zpp_nape.util.ZPP_Flags.internal = true;
          zpp_nape.util.ZPP_Flags.InteractionType_SENSOR =
            new nape.callbacks.InteractionType();
          zpp_nape.util.ZPP_Flags.internal = false;
        }
        return zpp_nape.util.ZPP_Flags.InteractionType_SENSOR;
      default:
        return null;
    }
  };
  nape.space.Space.prototype.shapesUnderPoint = function (
    point,
    filter,
    output
  ) {
    if (point != null && point.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (point == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate shapes under a null point :)"
      );
    }
    var ret = this.zpp_inner;
    if (point != null && point.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this = point.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    var ret1 = point.zpp_inner.x;
    if (point != null && point.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = point.zpp_inner;
    if (_this1._validate != null) {
      _this1._validate();
    }
    var ret2 = ret.shapesUnderPoint(
      ret1,
      point.zpp_inner.y,
      filter == null ? null : filter.zpp_inner,
      output
    );
    if (point.zpp_inner.weak) {
      if (point != null && point.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this2 = point.zpp_inner;
      if (_this2._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this2._isimmutable != null) {
        _this2._isimmutable();
      }
      if (point.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = point.zpp_inner;
      point.zpp_inner.outer = null;
      point.zpp_inner = null;
      var o = point;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    return ret2;
  };
  nape.space.Space.prototype.bodiesUnderPoint = function (
    point,
    filter,
    output
  ) {
    if (point != null && point.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (point == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate objects under a null point :)"
      );
    }
    var ret = this.zpp_inner;
    if (point != null && point.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this = point.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    var ret1 = point.zpp_inner.x;
    if (point != null && point.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    var _this1 = point.zpp_inner;
    if (_this1._validate != null) {
      _this1._validate();
    }
    var ret2 = ret.bodiesUnderPoint(
      ret1,
      point.zpp_inner.y,
      filter == null ? null : filter.zpp_inner,
      output
    );
    if (point.zpp_inner.weak) {
      if (point != null && point.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this2 = point.zpp_inner;
      if (_this2._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this2._isimmutable != null) {
        _this2._isimmutable();
      }
      if (point.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = point.zpp_inner;
      point.zpp_inner.outer = null;
      point.zpp_inner = null;
      var o = point;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    return ret2;
  };
  nape.space.Space.prototype.shapesInAABB = function (
    aabb,
    containment,
    strict,
    filter,
    output
  ) {
    if (strict == null) {
      strict = true;
    }
    if (containment == null) {
      containment = false;
    }
    if (aabb == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate shapes in a null AABB :)"
      );
    }
    var tmp;
    var _this = aabb.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    var _this1 = aabb.zpp_inner;
    if (_this1.maxx - _this1.minx != 0) {
      var _this2 = aabb.zpp_inner;
      if (_this2._validate != null) {
        _this2._validate();
      }
      var _this3 = aabb.zpp_inner;
      tmp = _this3.maxy - _this3.miny == 0;
    } else {
      tmp = true;
    }
    if (tmp) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate shapes in degenerate AABB :/"
      );
    }
    return this.zpp_inner.shapesInAABB(
      aabb,
      strict,
      containment,
      filter == null ? null : filter.zpp_inner,
      output
    );
  };
  nape.space.Space.prototype.bodiesInAABB = function (
    aabb,
    containment,
    strict,
    filter,
    output
  ) {
    if (strict == null) {
      strict = true;
    }
    if (containment == null) {
      containment = false;
    }
    if (aabb == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate objects in a null AABB :)"
      );
    }
    var tmp;
    var _this = aabb.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    var _this1 = aabb.zpp_inner;
    if (_this1.maxx - _this1.minx != 0) {
      var _this2 = aabb.zpp_inner;
      if (_this2._validate != null) {
        _this2._validate();
      }
      var _this3 = aabb.zpp_inner;
      tmp = _this3.maxy - _this3.miny == 0;
    } else {
      tmp = true;
    }
    if (tmp) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate objects in degenerate AABB :/"
      );
    }
    return this.zpp_inner.bodiesInAABB(
      aabb,
      strict,
      containment,
      filter == null ? null : filter.zpp_inner,
      output
    );
  };
  nape.space.Space.prototype.shapesInCircle = function (
    position,
    radius,
    containment,
    filter,
    output
  ) {
    if (containment == null) {
      containment = false;
    }
    if (position != null && position.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (position == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate shapes at null circle :)"
      );
    }
    if (radius != radius) {
      throw new js._Boot.HaxeError("Error: Circle radius cannot be NaN");
    }
    if (radius <= 0) {
      throw new js._Boot.HaxeError(
        "Error: Circle radius must be strictly positive"
      );
    }
    var ret = this.zpp_inner.shapesInCircle(
      position,
      radius,
      containment,
      filter == null ? null : filter.zpp_inner,
      output
    );
    if (position.zpp_inner.weak) {
      if (position != null && position.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this = position.zpp_inner;
      if (_this._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      if (position.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = position.zpp_inner;
      position.zpp_inner.outer = null;
      position.zpp_inner = null;
      var o = position;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    return ret;
  };
  nape.space.Space.prototype.bodiesInCircle = function (
    position,
    radius,
    containment,
    filter,
    output
  ) {
    if (containment == null) {
      containment = false;
    }
    if (position != null && position.zpp_disp) {
      throw new js._Boot.HaxeError(
        "Error: " + "Vec2" + " has been disposed and cannot be used!"
      );
    }
    if (position == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate objects at null circle :)"
      );
    }
    if (radius != radius) {
      throw new js._Boot.HaxeError("Error: Circle radius cannot be NaN");
    }
    if (radius <= 0) {
      throw new js._Boot.HaxeError(
        "Error: Circle radius must be strictly positive"
      );
    }
    var ret = this.zpp_inner.bodiesInCircle(
      position,
      radius,
      containment,
      filter == null ? null : filter.zpp_inner,
      output
    );
    if (position.zpp_inner.weak) {
      if (position != null && position.zpp_disp) {
        throw new js._Boot.HaxeError(
          "Error: " + "Vec2" + " has been disposed and cannot be used!"
        );
      }
      var _this = position.zpp_inner;
      if (_this._immutable) {
        throw new js._Boot.HaxeError("Error: Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      if (position.zpp_inner._inuse) {
        throw new js._Boot.HaxeError("Error: This Vec2 is not disposable");
      }
      var inner = position.zpp_inner;
      position.zpp_inner.outer = null;
      position.zpp_inner = null;
      var o = position;
      o.zpp_pool = null;
      if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
        zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        zpp_nape.util.ZPP_PubPool.poolVec2 = o;
      }
      zpp_nape.util.ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      var o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
    }
    return ret;
  };
  nape.space.Space.prototype.shapesInShape = function (
    shape,
    containment,
    filter,
    output
  ) {
    if (containment == null) {
      containment = false;
    }
    if (shape == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate shapes in a null shapes :)"
      );
    }
    if (
      (shape.zpp_inner.body != null ? shape.zpp_inner.body.outer : null) == null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Query shape needs to be inside a Body to be well defined :)"
      );
    }
    if (shape.zpp_inner.type == 1) {
      var res = shape.zpp_inner.polygon.valid();
      if (zpp_nape.util.ZPP_Flags.ValidationResult_VALID == null) {
        zpp_nape.util.ZPP_Flags.internal = true;
        zpp_nape.util.ZPP_Flags.ValidationResult_VALID =
          new nape.shape.ValidationResult();
        zpp_nape.util.ZPP_Flags.internal = false;
      }
      if (res != zpp_nape.util.ZPP_Flags.ValidationResult_VALID) {
        throw new js._Boot.HaxeError(
          "Error: Polygon query shape is invalid : " + res.toString()
        );
      }
    }
    return this.zpp_inner.shapesInShape(
      shape.zpp_inner,
      containment,
      filter == null ? null : filter.zpp_inner,
      output
    );
  };
  nape.space.Space.prototype.bodiesInShape = function (
    shape,
    containment,
    filter,
    output
  ) {
    if (containment == null) {
      containment = false;
    }
    if (shape == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate bodies in a null shapes :)"
      );
    }
    if (
      (shape.zpp_inner.body != null ? shape.zpp_inner.body.outer : null) == null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Query shape needs to be inside a Body to be well defined :)"
      );
    }
    if (shape.zpp_inner.type == 1) {
      var res = shape.zpp_inner.polygon.valid();
      if (zpp_nape.util.ZPP_Flags.ValidationResult_VALID == null) {
        zpp_nape.util.ZPP_Flags.internal = true;
        zpp_nape.util.ZPP_Flags.ValidationResult_VALID =
          new nape.shape.ValidationResult();
        zpp_nape.util.ZPP_Flags.internal = false;
      }
      if (res != zpp_nape.util.ZPP_Flags.ValidationResult_VALID) {
        throw new js._Boot.HaxeError(
          "Error: Polygon query shape is invalid : " + res.toString()
        );
      }
    }
    return this.zpp_inner.bodiesInShape(
      shape.zpp_inner,
      containment,
      filter == null ? null : filter.zpp_inner,
      output
    );
  };
  nape.space.Space.prototype.shapesInBody = function (body, filter, output) {
    if (body == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate shapes in null body"
      );
    }
    var ret = output == null ? new nape.shape.ShapeList() : output;
    var _this = body.zpp_inner.wrap_shapes;
    _this.zpp_inner.valmod();
    var _g = nape.shape.ShapeIterator.get(_this);
    while (true) {
      _g.zpp_inner.zpp_inner.valmod();
      var _this1 = _g.zpp_inner;
      _this1.zpp_inner.valmod();
      if (_this1.zpp_inner.zip_length) {
        _this1.zpp_inner.zip_length = false;
        _this1.zpp_inner.user_length = _this1.zpp_inner.inner.length;
      }
      var length = _this1.zpp_inner.user_length;
      _g.zpp_critical = true;
      var tmp;
      if (_g.zpp_i < length) {
        tmp = true;
      } else {
        _g.zpp_next = nape.shape.ShapeIterator.zpp_pool;
        nape.shape.ShapeIterator.zpp_pool = _g;
        _g.zpp_inner = null;
        tmp = false;
      }
      if (!tmp) {
        break;
      }
      _g.zpp_critical = false;
      var shape = _g.zpp_inner.at(_g.zpp_i++);
      var cur = this.shapesInShape(shape, false, filter, ret);
    }
    return ret;
  };
  nape.space.Space.prototype.bodiesInBody = function (body, filter, output) {
    if (body == null) {
      throw new js._Boot.HaxeError(
        "Error: Cannot evaluate shapes in null body"
      );
    }
    var ret = output == null ? new nape.phys.BodyList() : output;
    var _this = body.zpp_inner.wrap_shapes;
    _this.zpp_inner.valmod();
    var _g = nape.shape.ShapeIterator.get(_this);
    while (true) {
      _g.zpp_inner.zpp_inner.valmod();
      var _this1 = _g.zpp_inner;
      _this1.zpp_inner.valmod();
      if (_this1.zpp_inner.zip_length) {
        _this1.zpp_inner.zip_length = false;
        _this1.zpp_inner.user_length = _this1.zpp_inner.inner.length;
      }
      var length = _this1.zpp_inner.user_length;
      _g.zpp_critical = true;
      var tmp;
      if (_g.zpp_i < length) {
        tmp = true;
      } else {
        _g.zpp_next = nape.shape.ShapeIterator.zpp_pool;
        nape.shape.ShapeIterator.zpp_pool = _g;
        _g.zpp_inner = null;
        tmp = false;
      }
      if (!tmp) {
        break;
      }
      _g.zpp_critical = false;
      var shape = _g.zpp_inner.at(_g.zpp_i++);
      var cur = this.bodiesInShape(shape, false, filter, ret);
    }
    return ret;
  };
  nape.space.Space.prototype.convexCast = function (
    shape,
    deltaTime,
    liveSweep,
    filter
  ) {
    if (liveSweep == null) {
      liveSweep = false;
    }
    if (shape == null) {
      throw new js._Boot.HaxeError("Error: Cannot cast null shape :)");
    }
    if (
      (shape.zpp_inner.body != null ? shape.zpp_inner.body.outer : null) == null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Shape must belong to a body to be cast."
      );
    }
    if (deltaTime < 0 || deltaTime != deltaTime) {
      throw new js._Boot.HaxeError("Error: deltaTime must be positive");
    }
    return this.zpp_inner.convexCast(
      shape.zpp_inner,
      deltaTime,
      filter,
      liveSweep
    );
  };
  nape.space.Space.prototype.convexMultiCast = function (
    shape,
    deltaTime,
    liveSweep,
    filter,
    output
  ) {
    if (liveSweep == null) {
      liveSweep = false;
    }
    if (shape == null) {
      throw new js._Boot.HaxeError("Error: Cannot cast null shape :)");
    }
    if (
      (shape.zpp_inner.body != null ? shape.zpp_inner.body.outer : null) == null
    ) {
      throw new js._Boot.HaxeError(
        "Error: Shape must belong to a body to be cast."
      );
    }
    if (deltaTime < 0 || deltaTime != deltaTime) {
      throw new js._Boot.HaxeError("Error: deltaTime must be positive");
    }
    return this.zpp_inner.convexMultiCast(
      shape.zpp_inner,
      deltaTime,
      filter,
      liveSweep,
      output
    );
  };
  nape.space.Space.prototype.rayCast = function (ray, inner, filter) {
    if (inner == null) {
      inner = false;
    }
    if (ray == null) {
      throw new js._Boot.HaxeError("Error: Cannot cast null ray :)");
    }
    return this.zpp_inner.rayCast(ray, inner, filter);
  };
  nape.space.Space.prototype.rayMultiCast = function (
    ray,
    inner,
    filter,
    output
  ) {
    if (inner == null) {
      inner = false;
    }
    if (ray == null) {
      throw new js._Boot.HaxeError("Error: Cannot cast null ray :)");
    }
    return this.zpp_inner.rayMultiCast(ray, inner, filter, output);
  };
  nape.space.Space.prototype.__class__ = nape.space.Space;
  if (!nape.util) nape.util = {};
  nape.util.Debug = $hxClasses["nape.util.Debug"] = function () {};
  nape.util.Debug.__name__ = ["nape", "util", "Debug"];
  nape.util.Debug.version = function () {
    return "Nape 2.0.19";
  };
  nape.util.Debug.clearObjectPools = function () {
    while (nape.constraint.ConstraintIterator.zpp_pool != null) {
      var nxt = nape.constraint.ConstraintIterator.zpp_pool.zpp_next;
      nape.constraint.ConstraintIterator.zpp_pool.zpp_next = null;
      nape.constraint.ConstraintIterator.zpp_pool = nxt;
    }
    while (nape.phys.InteractorIterator.zpp_pool != null) {
      var nxt1 = nape.phys.InteractorIterator.zpp_pool.zpp_next;
      nape.phys.InteractorIterator.zpp_pool.zpp_next = null;
      nape.phys.InteractorIterator.zpp_pool = nxt1;
    }
    while (nape.phys.BodyIterator.zpp_pool != null) {
      var nxt2 = nape.phys.BodyIterator.zpp_pool.zpp_next;
      nape.phys.BodyIterator.zpp_pool.zpp_next = null;
      nape.phys.BodyIterator.zpp_pool = nxt2;
    }
    while (nape.phys.CompoundIterator.zpp_pool != null) {
      var nxt3 = nape.phys.CompoundIterator.zpp_pool.zpp_next;
      nape.phys.CompoundIterator.zpp_pool.zpp_next = null;
      nape.phys.CompoundIterator.zpp_pool = nxt3;
    }
    while (nape.callbacks.ListenerIterator.zpp_pool != null) {
      var nxt4 = nape.callbacks.ListenerIterator.zpp_pool.zpp_next;
      nape.callbacks.ListenerIterator.zpp_pool.zpp_next = null;
      nape.callbacks.ListenerIterator.zpp_pool = nxt4;
    }
    while (nape.callbacks.CbTypeIterator.zpp_pool != null) {
      var nxt5 = nape.callbacks.CbTypeIterator.zpp_pool.zpp_next;
      nape.callbacks.CbTypeIterator.zpp_pool.zpp_next = null;
      nape.callbacks.CbTypeIterator.zpp_pool = nxt5;
    }
    while (nape.geom.ConvexResultIterator.zpp_pool != null) {
      var nxt6 = nape.geom.ConvexResultIterator.zpp_pool.zpp_next;
      nape.geom.ConvexResultIterator.zpp_pool.zpp_next = null;
      nape.geom.ConvexResultIterator.zpp_pool = nxt6;
    }
    while (nape.geom.GeomPolyIterator.zpp_pool != null) {
      var nxt7 = nape.geom.GeomPolyIterator.zpp_pool.zpp_next;
      nape.geom.GeomPolyIterator.zpp_pool.zpp_next = null;
      nape.geom.GeomPolyIterator.zpp_pool = nxt7;
    }
    while (nape.geom.Vec2Iterator.zpp_pool != null) {
      var nxt8 = nape.geom.Vec2Iterator.zpp_pool.zpp_next;
      nape.geom.Vec2Iterator.zpp_pool.zpp_next = null;
      nape.geom.Vec2Iterator.zpp_pool = nxt8;
    }
    while (nape.geom.RayResultIterator.zpp_pool != null) {
      var nxt9 = nape.geom.RayResultIterator.zpp_pool.zpp_next;
      nape.geom.RayResultIterator.zpp_pool.zpp_next = null;
      nape.geom.RayResultIterator.zpp_pool = nxt9;
    }
    while (nape.shape.ShapeIterator.zpp_pool != null) {
      var nxt10 = nape.shape.ShapeIterator.zpp_pool.zpp_next;
      nape.shape.ShapeIterator.zpp_pool.zpp_next = null;
      nape.shape.ShapeIterator.zpp_pool = nxt10;
    }
    while (nape.shape.EdgeIterator.zpp_pool != null) {
      var nxt11 = nape.shape.EdgeIterator.zpp_pool.zpp_next;
      nape.shape.EdgeIterator.zpp_pool.zpp_next = null;
      nape.shape.EdgeIterator.zpp_pool = nxt11;
    }
    while (nape.dynamics.ContactIterator.zpp_pool != null) {
      var nxt12 = nape.dynamics.ContactIterator.zpp_pool.zpp_next;
      nape.dynamics.ContactIterator.zpp_pool.zpp_next = null;
      nape.dynamics.ContactIterator.zpp_pool = nxt12;
    }
    while (nape.dynamics.ArbiterIterator.zpp_pool != null) {
      var nxt13 = nape.dynamics.ArbiterIterator.zpp_pool.zpp_next;
      nape.dynamics.ArbiterIterator.zpp_pool.zpp_next = null;
      nape.dynamics.ArbiterIterator.zpp_pool = nxt13;
    }
    while (nape.dynamics.InteractionGroupIterator.zpp_pool != null) {
      var nxt14 = nape.dynamics.InteractionGroupIterator.zpp_pool.zpp_next;
      nape.dynamics.InteractionGroupIterator.zpp_pool.zpp_next = null;
      nape.dynamics.InteractionGroupIterator.zpp_pool = nxt14;
    }
    while (zpp_nape.util.ZNPNode_ZPP_CbType.zpp_pool != null) {
      var nxt15 = zpp_nape.util.ZNPNode_ZPP_CbType.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_CbType.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_CbType.zpp_pool = nxt15;
    }
    while (zpp_nape.util.ZNPNode_ZPP_CallbackSet.zpp_pool != null) {
      var nxt16 = zpp_nape.util.ZNPNode_ZPP_CallbackSet.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_CallbackSet.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_CallbackSet.zpp_pool = nxt16;
    }
    while (zpp_nape.phys.ZPP_Material.zpp_pool != null) {
      var nxt17 = zpp_nape.phys.ZPP_Material.zpp_pool.next;
      zpp_nape.phys.ZPP_Material.zpp_pool.next = null;
      zpp_nape.phys.ZPP_Material.zpp_pool = nxt17;
    }
    while (zpp_nape.util.ZNPNode_ZPP_Shape.zpp_pool != null) {
      var nxt18 = zpp_nape.util.ZNPNode_ZPP_Shape.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_Shape.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_Shape.zpp_pool = nxt18;
    }
    while (zpp_nape.phys.ZPP_FluidProperties.zpp_pool != null) {
      var nxt19 = zpp_nape.phys.ZPP_FluidProperties.zpp_pool.next;
      zpp_nape.phys.ZPP_FluidProperties.zpp_pool.next = null;
      zpp_nape.phys.ZPP_FluidProperties.zpp_pool = nxt19;
    }
    while (zpp_nape.util.ZNPNode_ZPP_Body.zpp_pool != null) {
      var nxt20 = zpp_nape.util.ZNPNode_ZPP_Body.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_Body.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_Body.zpp_pool = nxt20;
    }
    while (zpp_nape.util.ZNPNode_ZPP_Constraint.zpp_pool != null) {
      var nxt21 = zpp_nape.util.ZNPNode_ZPP_Constraint.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_Constraint.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_Constraint.zpp_pool = nxt21;
    }
    while (zpp_nape.util.ZNPNode_ZPP_Compound.zpp_pool != null) {
      var nxt22 = zpp_nape.util.ZNPNode_ZPP_Compound.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_Compound.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_Compound.zpp_pool = nxt22;
    }
    while (zpp_nape.util.ZNPNode_ZPP_Arbiter.zpp_pool != null) {
      var nxt23 = zpp_nape.util.ZNPNode_ZPP_Arbiter.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_Arbiter.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_Arbiter.zpp_pool = nxt23;
    }
    while (zpp_nape.util.ZPP_Set_ZPP_Body.zpp_pool != null) {
      var nxt24 = zpp_nape.util.ZPP_Set_ZPP_Body.zpp_pool.next;
      zpp_nape.util.ZPP_Set_ZPP_Body.zpp_pool.next = null;
      zpp_nape.util.ZPP_Set_ZPP_Body.zpp_pool = nxt24;
    }
    while (zpp_nape.callbacks.ZPP_CbSetPair.zpp_pool != null) {
      var nxt25 = zpp_nape.callbacks.ZPP_CbSetPair.zpp_pool.next;
      zpp_nape.callbacks.ZPP_CbSetPair.zpp_pool.next = null;
      zpp_nape.callbacks.ZPP_CbSetPair.zpp_pool = nxt25;
    }
    while (zpp_nape.util.ZNPNode_ZPP_InteractionListener.zpp_pool != null) {
      var nxt26 = zpp_nape.util.ZNPNode_ZPP_InteractionListener.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_InteractionListener.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_InteractionListener.zpp_pool = nxt26;
    }
    while (zpp_nape.util.ZNPNode_ZPP_CbSet.zpp_pool != null) {
      var nxt27 = zpp_nape.util.ZNPNode_ZPP_CbSet.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_CbSet.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_CbSet.zpp_pool = nxt27;
    }
    while (zpp_nape.util.ZNPNode_ZPP_Interactor.zpp_pool != null) {
      var nxt28 = zpp_nape.util.ZNPNode_ZPP_Interactor.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_Interactor.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_Interactor.zpp_pool = nxt28;
    }
    while (zpp_nape.util.ZNPNode_ZPP_BodyListener.zpp_pool != null) {
      var nxt29 = zpp_nape.util.ZNPNode_ZPP_BodyListener.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_BodyListener.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_BodyListener.zpp_pool = nxt29;
    }
    while (zpp_nape.callbacks.ZPP_Callback.zpp_pool != null) {
      var nxt30 = zpp_nape.callbacks.ZPP_Callback.zpp_pool.next;
      zpp_nape.callbacks.ZPP_Callback.zpp_pool.next = null;
      zpp_nape.callbacks.ZPP_Callback.zpp_pool = nxt30;
    }
    while (zpp_nape.callbacks.ZPP_CbSet.zpp_pool != null) {
      var nxt31 = zpp_nape.callbacks.ZPP_CbSet.zpp_pool.next;
      zpp_nape.callbacks.ZPP_CbSet.zpp_pool.next = null;
      zpp_nape.callbacks.ZPP_CbSet.zpp_pool = nxt31;
    }
    while (zpp_nape.util.ZNPNode_ZPP_CbSetPair.zpp_pool != null) {
      var nxt32 = zpp_nape.util.ZNPNode_ZPP_CbSetPair.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_CbSetPair.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_CbSetPair.zpp_pool = nxt32;
    }
    while (zpp_nape.util.ZNPNode_ZPP_ConstraintListener.zpp_pool != null) {
      var nxt33 = zpp_nape.util.ZNPNode_ZPP_ConstraintListener.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_ConstraintListener.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = nxt33;
    }
    while (zpp_nape.geom.ZPP_GeomVert.zpp_pool != null) {
      var nxt34 = zpp_nape.geom.ZPP_GeomVert.zpp_pool.next;
      zpp_nape.geom.ZPP_GeomVert.zpp_pool.next = null;
      zpp_nape.geom.ZPP_GeomVert.zpp_pool = nxt34;
    }
    while (zpp_nape.geom.ZPP_GeomVertexIterator.zpp_pool != null) {
      var nxt35 = zpp_nape.geom.ZPP_GeomVertexIterator.zpp_pool.next;
      zpp_nape.geom.ZPP_GeomVertexIterator.zpp_pool.next = null;
      zpp_nape.geom.ZPP_GeomVertexIterator.zpp_pool = nxt35;
    }
    while (zpp_nape.geom.ZPP_Mat23.zpp_pool != null) {
      var nxt36 = zpp_nape.geom.ZPP_Mat23.zpp_pool.next;
      zpp_nape.geom.ZPP_Mat23.zpp_pool.next = null;
      zpp_nape.geom.ZPP_Mat23.zpp_pool = nxt36;
    }
    while (zpp_nape.util.ZPP_Set_ZPP_CbSetPair.zpp_pool != null) {
      var nxt37 = zpp_nape.util.ZPP_Set_ZPP_CbSetPair.zpp_pool.next;
      zpp_nape.util.ZPP_Set_ZPP_CbSetPair.zpp_pool.next = null;
      zpp_nape.util.ZPP_Set_ZPP_CbSetPair.zpp_pool = nxt37;
    }
    while (zpp_nape.geom.ZPP_CutVert.zpp_pool != null) {
      var nxt38 = zpp_nape.geom.ZPP_CutVert.zpp_pool.next;
      zpp_nape.geom.ZPP_CutVert.zpp_pool.next = null;
      zpp_nape.geom.ZPP_CutVert.zpp_pool = nxt38;
    }
    while (zpp_nape.geom.ZPP_CutInt.zpp_pool != null) {
      var nxt39 = zpp_nape.geom.ZPP_CutInt.zpp_pool.next;
      zpp_nape.geom.ZPP_CutInt.zpp_pool.next = null;
      zpp_nape.geom.ZPP_CutInt.zpp_pool = nxt39;
    }
    while (zpp_nape.util.ZNPNode_ZPP_CutInt.zpp_pool != null) {
      var nxt40 = zpp_nape.util.ZNPNode_ZPP_CutInt.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_CutInt.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_CutInt.zpp_pool = nxt40;
    }
    while (zpp_nape.util.ZNPNode_ZPP_CutVert.zpp_pool != null) {
      var nxt41 = zpp_nape.util.ZNPNode_ZPP_CutVert.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_CutVert.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_CutVert.zpp_pool = nxt41;
    }
    while (zpp_nape.geom.ZPP_Vec2.zpp_pool != null) {
      var nxt42 = zpp_nape.geom.ZPP_Vec2.zpp_pool.next;
      zpp_nape.geom.ZPP_Vec2.zpp_pool.next = null;
      zpp_nape.geom.ZPP_Vec2.zpp_pool = nxt42;
    }
    while (zpp_nape.util.ZNPNode_ZPP_PartitionVertex.zpp_pool != null) {
      var nxt43 = zpp_nape.util.ZNPNode_ZPP_PartitionVertex.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_PartitionVertex.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_PartitionVertex.zpp_pool = nxt43;
    }
    while (zpp_nape.geom.ZPP_PartitionVertex.zpp_pool != null) {
      var nxt44 = zpp_nape.geom.ZPP_PartitionVertex.zpp_pool.next;
      zpp_nape.geom.ZPP_PartitionVertex.zpp_pool.next = null;
      zpp_nape.geom.ZPP_PartitionVertex.zpp_pool = nxt44;
    }
    while (zpp_nape.util.ZPP_Set_ZPP_PartitionVertex.zpp_pool != null) {
      var nxt45 = zpp_nape.util.ZPP_Set_ZPP_PartitionVertex.zpp_pool.next;
      zpp_nape.util.ZPP_Set_ZPP_PartitionVertex.zpp_pool.next = null;
      zpp_nape.util.ZPP_Set_ZPP_PartitionVertex.zpp_pool = nxt45;
    }
    while (zpp_nape.geom.ZPP_SimplifyV.zpp_pool != null) {
      var nxt46 = zpp_nape.geom.ZPP_SimplifyV.zpp_pool.next;
      zpp_nape.geom.ZPP_SimplifyV.zpp_pool.next = null;
      zpp_nape.geom.ZPP_SimplifyV.zpp_pool = nxt46;
    }
    while (zpp_nape.geom.ZPP_SimplifyP.zpp_pool != null) {
      var nxt47 = zpp_nape.geom.ZPP_SimplifyP.zpp_pool.next;
      zpp_nape.geom.ZPP_SimplifyP.zpp_pool.next = null;
      zpp_nape.geom.ZPP_SimplifyP.zpp_pool = nxt47;
    }
    while (zpp_nape.geom.ZPP_PartitionedPoly.zpp_pool != null) {
      var nxt48 = zpp_nape.geom.ZPP_PartitionedPoly.zpp_pool.next;
      zpp_nape.geom.ZPP_PartitionedPoly.zpp_pool.next = null;
      zpp_nape.geom.ZPP_PartitionedPoly.zpp_pool = nxt48;
    }
    while (zpp_nape.util.ZNPNode_ZPP_SimplifyP.zpp_pool != null) {
      var nxt49 = zpp_nape.util.ZNPNode_ZPP_SimplifyP.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_SimplifyP.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_SimplifyP.zpp_pool = nxt49;
    }
    while (zpp_nape.util.ZNPNode_ZPP_PartitionedPoly.zpp_pool != null) {
      var nxt50 = zpp_nape.util.ZNPNode_ZPP_PartitionedPoly.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_PartitionedPoly.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_PartitionedPoly.zpp_pool = nxt50;
    }
    while (zpp_nape.geom.ZPP_PartitionPair.zpp_pool != null) {
      var nxt51 = zpp_nape.geom.ZPP_PartitionPair.zpp_pool.next;
      zpp_nape.geom.ZPP_PartitionPair.zpp_pool.next = null;
      zpp_nape.geom.ZPP_PartitionPair.zpp_pool = nxt51;
    }
    while (zpp_nape.util.ZPP_Set_ZPP_PartitionPair.zpp_pool != null) {
      var nxt52 = zpp_nape.util.ZPP_Set_ZPP_PartitionPair.zpp_pool.next;
      zpp_nape.util.ZPP_Set_ZPP_PartitionPair.zpp_pool.next = null;
      zpp_nape.util.ZPP_Set_ZPP_PartitionPair.zpp_pool = nxt52;
    }
    while (zpp_nape.util.ZNPNode_ZPP_GeomVert.zpp_pool != null) {
      var nxt53 = zpp_nape.util.ZNPNode_ZPP_GeomVert.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_GeomVert.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_GeomVert.zpp_pool = nxt53;
    }
    while (zpp_nape.geom.ZPP_AABB.zpp_pool != null) {
      var nxt54 = zpp_nape.geom.ZPP_AABB.zpp_pool.next;
      zpp_nape.geom.ZPP_AABB.zpp_pool.next = null;
      zpp_nape.geom.ZPP_AABB.zpp_pool = nxt54;
    }
    while (zpp_nape.util.ZPP_Set_ZPP_SimpleVert.zpp_pool != null) {
      var nxt55 = zpp_nape.util.ZPP_Set_ZPP_SimpleVert.zpp_pool.next;
      zpp_nape.util.ZPP_Set_ZPP_SimpleVert.zpp_pool.next = null;
      zpp_nape.util.ZPP_Set_ZPP_SimpleVert.zpp_pool = nxt55;
    }
    while (zpp_nape.geom.ZPP_SimpleVert.zpp_pool != null) {
      var nxt56 = zpp_nape.geom.ZPP_SimpleVert.zpp_pool.next;
      zpp_nape.geom.ZPP_SimpleVert.zpp_pool.next = null;
      zpp_nape.geom.ZPP_SimpleVert.zpp_pool = nxt56;
    }
    while (zpp_nape.geom.ZPP_SimpleSeg.zpp_pool != null) {
      var nxt57 = zpp_nape.geom.ZPP_SimpleSeg.zpp_pool.next;
      zpp_nape.geom.ZPP_SimpleSeg.zpp_pool.next = null;
      zpp_nape.geom.ZPP_SimpleSeg.zpp_pool = nxt57;
    }
    while (zpp_nape.util.ZPP_Set_ZPP_SimpleSeg.zpp_pool != null) {
      var nxt58 = zpp_nape.util.ZPP_Set_ZPP_SimpleSeg.zpp_pool.next;
      zpp_nape.util.ZPP_Set_ZPP_SimpleSeg.zpp_pool.next = null;
      zpp_nape.util.ZPP_Set_ZPP_SimpleSeg.zpp_pool = nxt58;
    }
    while (zpp_nape.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool != null) {
      var nxt59 = zpp_nape.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool.next;
      zpp_nape.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool.next = null;
      zpp_nape.util.ZPP_Set_ZPP_SimpleEvent.zpp_pool = nxt59;
    }
    while (zpp_nape.geom.ZPP_SimpleEvent.zpp_pool != null) {
      var nxt60 = zpp_nape.geom.ZPP_SimpleEvent.zpp_pool.next;
      zpp_nape.geom.ZPP_SimpleEvent.zpp_pool.next = null;
      zpp_nape.geom.ZPP_SimpleEvent.zpp_pool = nxt60;
    }
    while (zpp_nape.util.Hashable2_Boolfalse.zpp_pool != null) {
      var nxt61 = zpp_nape.util.Hashable2_Boolfalse.zpp_pool.next;
      zpp_nape.util.Hashable2_Boolfalse.zpp_pool.next = null;
      zpp_nape.util.Hashable2_Boolfalse.zpp_pool = nxt61;
    }
    while (zpp_nape.geom.ZPP_ToiEvent.zpp_pool != null) {
      var nxt62 = zpp_nape.geom.ZPP_ToiEvent.zpp_pool.next;
      zpp_nape.geom.ZPP_ToiEvent.zpp_pool.next = null;
      zpp_nape.geom.ZPP_ToiEvent.zpp_pool = nxt62;
    }
    while (zpp_nape.util.ZNPNode_ZPP_SimpleVert.zpp_pool != null) {
      var nxt63 = zpp_nape.util.ZNPNode_ZPP_SimpleVert.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_SimpleVert.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_SimpleVert.zpp_pool = nxt63;
    }
    while (zpp_nape.util.ZNPNode_ZPP_SimpleEvent.zpp_pool != null) {
      var nxt64 = zpp_nape.util.ZNPNode_ZPP_SimpleEvent.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_SimpleEvent.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_SimpleEvent.zpp_pool = nxt64;
    }
    while (zpp_nape.geom.ZPP_MarchSpan.zpp_pool != null) {
      var nxt65 = zpp_nape.geom.ZPP_MarchSpan.zpp_pool.next;
      zpp_nape.geom.ZPP_MarchSpan.zpp_pool.next = null;
      zpp_nape.geom.ZPP_MarchSpan.zpp_pool = nxt65;
    }
    while (zpp_nape.geom.ZPP_MarchPair.zpp_pool != null) {
      var nxt66 = zpp_nape.geom.ZPP_MarchPair.zpp_pool.next;
      zpp_nape.geom.ZPP_MarchPair.zpp_pool.next = null;
      zpp_nape.geom.ZPP_MarchPair.zpp_pool = nxt66;
    }
    while (zpp_nape.util.ZNPNode_ZPP_Vec2.zpp_pool != null) {
      var nxt67 = zpp_nape.util.ZNPNode_ZPP_Vec2.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_Vec2.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_Vec2.zpp_pool = nxt67;
    }
    while (zpp_nape.shape.ZPP_Edge.zpp_pool != null) {
      var nxt68 = zpp_nape.shape.ZPP_Edge.zpp_pool.next;
      zpp_nape.shape.ZPP_Edge.zpp_pool.next = null;
      zpp_nape.shape.ZPP_Edge.zpp_pool = nxt68;
    }
    while (zpp_nape.util.ZNPNode_ZPP_AABBPair.zpp_pool != null) {
      var nxt69 = zpp_nape.util.ZNPNode_ZPP_AABBPair.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_AABBPair.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_AABBPair.zpp_pool = nxt69;
    }
    while (zpp_nape.util.ZNPNode_ZPP_Edge.zpp_pool != null) {
      var nxt70 = zpp_nape.util.ZNPNode_ZPP_Edge.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_Edge.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_Edge.zpp_pool = nxt70;
    }
    while (zpp_nape.space.ZPP_SweepData.zpp_pool != null) {
      var nxt71 = zpp_nape.space.ZPP_SweepData.zpp_pool.next;
      zpp_nape.space.ZPP_SweepData.zpp_pool.next = null;
      zpp_nape.space.ZPP_SweepData.zpp_pool = nxt71;
    }
    while (zpp_nape.space.ZPP_AABBNode.zpp_pool != null) {
      var nxt72 = zpp_nape.space.ZPP_AABBNode.zpp_pool.next;
      zpp_nape.space.ZPP_AABBNode.zpp_pool.next = null;
      zpp_nape.space.ZPP_AABBNode.zpp_pool = nxt72;
    }
    while (zpp_nape.space.ZPP_AABBPair.zpp_pool != null) {
      var nxt73 = zpp_nape.space.ZPP_AABBPair.zpp_pool.next;
      zpp_nape.space.ZPP_AABBPair.zpp_pool.next = null;
      zpp_nape.space.ZPP_AABBPair.zpp_pool = nxt73;
    }
    while (zpp_nape.util.ZNPNode_ZPP_AABBNode.zpp_pool != null) {
      var nxt74 = zpp_nape.util.ZNPNode_ZPP_AABBNode.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_AABBNode.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_AABBNode.zpp_pool = nxt74;
    }
    while (zpp_nape.dynamics.ZPP_Contact.zpp_pool != null) {
      var nxt75 = zpp_nape.dynamics.ZPP_Contact.zpp_pool.next;
      zpp_nape.dynamics.ZPP_Contact.zpp_pool.next = null;
      zpp_nape.dynamics.ZPP_Contact.zpp_pool = nxt75;
    }
    while (zpp_nape.util.ZNPNode_ZPP_Component.zpp_pool != null) {
      var nxt76 = zpp_nape.util.ZNPNode_ZPP_Component.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_Component.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_Component.zpp_pool = nxt76;
    }
    while (zpp_nape.space.ZPP_Island.zpp_pool != null) {
      var nxt77 = zpp_nape.space.ZPP_Island.zpp_pool.next;
      zpp_nape.space.ZPP_Island.zpp_pool.next = null;
      zpp_nape.space.ZPP_Island.zpp_pool = nxt77;
    }
    while (zpp_nape.space.ZPP_Component.zpp_pool != null) {
      var nxt78 = zpp_nape.space.ZPP_Component.zpp_pool.next;
      zpp_nape.space.ZPP_Component.zpp_pool.next = null;
      zpp_nape.space.ZPP_Component.zpp_pool = nxt78;
    }
    while (zpp_nape.space.ZPP_CallbackSet.zpp_pool != null) {
      var nxt79 = zpp_nape.space.ZPP_CallbackSet.zpp_pool.next;
      zpp_nape.space.ZPP_CallbackSet.zpp_pool.next = null;
      zpp_nape.space.ZPP_CallbackSet.zpp_pool = nxt79;
    }
    while (zpp_nape.dynamics.ZPP_SensorArbiter.zpp_pool != null) {
      var nxt80 = zpp_nape.dynamics.ZPP_SensorArbiter.zpp_pool.next;
      zpp_nape.dynamics.ZPP_SensorArbiter.zpp_pool.next = null;
      zpp_nape.dynamics.ZPP_SensorArbiter.zpp_pool = nxt80;
    }
    while (zpp_nape.dynamics.ZPP_FluidArbiter.zpp_pool != null) {
      var nxt81 = zpp_nape.dynamics.ZPP_FluidArbiter.zpp_pool.next;
      zpp_nape.dynamics.ZPP_FluidArbiter.zpp_pool.next = null;
      zpp_nape.dynamics.ZPP_FluidArbiter.zpp_pool = nxt81;
    }
    while (zpp_nape.util.ZPP_Set_ZPP_CbSet.zpp_pool != null) {
      var nxt82 = zpp_nape.util.ZPP_Set_ZPP_CbSet.zpp_pool.next;
      zpp_nape.util.ZPP_Set_ZPP_CbSet.zpp_pool.next = null;
      zpp_nape.util.ZPP_Set_ZPP_CbSet.zpp_pool = nxt82;
    }
    while (zpp_nape.util.ZNPNode_ZPP_FluidArbiter.zpp_pool != null) {
      var nxt83 = zpp_nape.util.ZNPNode_ZPP_FluidArbiter.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_FluidArbiter.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_FluidArbiter.zpp_pool = nxt83;
    }
    while (zpp_nape.dynamics.ZPP_ColArbiter.zpp_pool != null) {
      var nxt84 = zpp_nape.dynamics.ZPP_ColArbiter.zpp_pool.next;
      zpp_nape.dynamics.ZPP_ColArbiter.zpp_pool.next = null;
      zpp_nape.dynamics.ZPP_ColArbiter.zpp_pool = nxt84;
    }
    while (zpp_nape.util.ZNPNode_ZPP_SensorArbiter.zpp_pool != null) {
      var nxt85 = zpp_nape.util.ZNPNode_ZPP_SensorArbiter.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_SensorArbiter.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_SensorArbiter.zpp_pool = nxt85;
    }
    while (zpp_nape.util.ZNPNode_ZPP_Listener.zpp_pool != null) {
      var nxt86 = zpp_nape.util.ZNPNode_ZPP_Listener.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_Listener.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_Listener.zpp_pool = nxt86;
    }
    while (zpp_nape.util.ZNPNode_ZPP_ColArbiter.zpp_pool != null) {
      var nxt87 = zpp_nape.util.ZNPNode_ZPP_ColArbiter.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_ColArbiter.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_ColArbiter.zpp_pool = nxt87;
    }
    while (zpp_nape.util.ZNPNode_ZPP_InteractionGroup.zpp_pool != null) {
      var nxt88 = zpp_nape.util.ZNPNode_ZPP_InteractionGroup.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_InteractionGroup.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_InteractionGroup.zpp_pool = nxt88;
    }
    while (zpp_nape.util.ZNPNode_ZPP_ToiEvent.zpp_pool != null) {
      var nxt89 = zpp_nape.util.ZNPNode_ZPP_ToiEvent.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_ToiEvent.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_ToiEvent.zpp_pool = nxt89;
    }
    while (zpp_nape.dynamics.ZPP_InteractionFilter.zpp_pool != null) {
      var nxt90 = zpp_nape.dynamics.ZPP_InteractionFilter.zpp_pool.next;
      zpp_nape.dynamics.ZPP_InteractionFilter.zpp_pool.next = null;
      zpp_nape.dynamics.ZPP_InteractionFilter.zpp_pool = nxt90;
    }
    while (zpp_nape.util.ZNPNode_ConvexResult.zpp_pool != null) {
      var nxt91 = zpp_nape.util.ZNPNode_ConvexResult.zpp_pool.next;
      zpp_nape.util.ZNPNode_ConvexResult.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ConvexResult.zpp_pool = nxt91;
    }
    while (zpp_nape.util.ZNPNode_ZPP_GeomPoly.zpp_pool != null) {
      var nxt92 = zpp_nape.util.ZNPNode_ZPP_GeomPoly.zpp_pool.next;
      zpp_nape.util.ZNPNode_ZPP_GeomPoly.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_ZPP_GeomPoly.zpp_pool = nxt92;
    }
    while (zpp_nape.util.ZNPNode_RayResult.zpp_pool != null) {
      var nxt93 = zpp_nape.util.ZNPNode_RayResult.zpp_pool.next;
      zpp_nape.util.ZNPNode_RayResult.zpp_pool.next = null;
      zpp_nape.util.ZNPNode_RayResult.zpp_pool = nxt93;
    }
    while (zpp_nape.util.ZPP_PubPool.poolGeomPoly != null) {
      var nxt94 = zpp_nape.util.ZPP_PubPool.poolGeomPoly.zpp_pool;
      zpp_nape.util.ZPP_PubPool.poolGeomPoly.zpp_pool = null;
      zpp_nape.util.ZPP_PubPool.poolGeomPoly = nxt94;
    }
    while (zpp_nape.util.ZPP_PubPool.poolVec2 != null) {
      var nxt95 = zpp_nape.util.ZPP_PubPool.poolVec2.zpp_pool;
      zpp_nape.util.ZPP_PubPool.poolVec2.zpp_pool = null;
      zpp_nape.util.ZPP_PubPool.poolVec2 = nxt95;
    }
    while (zpp_nape.util.ZPP_PubPool.poolVec3 != null) {
      var nxt96 = zpp_nape.util.ZPP_PubPool.poolVec3.zpp_pool;
      zpp_nape.util.ZPP_PubPool.poolVec3.zpp_pool = null;
      zpp_nape.util.ZPP_PubPool.poolVec3 = nxt96;
    }
  };
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
  nape.Config.epsilon = 1e-8;
  nape.Config.fluidAngularDragFriction = 2.5;
  nape.Config.fluidAngularDrag = 100;
  nape.Config.fluidVacuumDrag = 0.5;
  nape.Config.fluidLinearDrag = 0.5;
  nape.Config.collisionSlop = 0.2;
  nape.Config.collisionSlopCCD = 0.5;
  nape.Config.distanceThresholdCCD = 0.05;
  nape.Config.staticCCDLinearThreshold = 0.05;
  nape.Config.staticCCDAngularThreshold = 0.005;
  nape.Config.bulletCCDLinearThreshold = 0.125;
  nape.Config.bulletCCDAngularThreshold = 0.0125;
  nape.Config.dynamicSweepLinearThreshold = 17;
  nape.Config.dynamicSweepAngularThreshold = 0.6;
  nape.Config.angularCCDSlipScale = 0.75;
  nape.Config.arbiterExpirationDelay = 6;
  nape.Config.staticFrictionThreshold = 2;
  nape.Config.elasticThreshold = 20;
  nape.Config.sleepDelay = 60;
  nape.Config.linearSleepThreshold = 0.2;
  nape.Config.angularSleepThreshold = 0.4;
  nape.Config.contactBiasCoef = 0.3;
  nape.Config.contactStaticBiasCoef = 0.6;
  nape.Config.contactContinuousBiasCoef = 0.4;
  nape.Config.contactContinuousStaticBiasCoef = 0.5;
  nape.Config.constraintLinearSlop = 0.1;
  nape.Config.constraintAngularSlop = 1e-3;
  nape.Config.illConditionedThreshold = 2e8;
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
