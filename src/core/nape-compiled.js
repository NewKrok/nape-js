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
  // --- All public API classes ---
  // All 23 subclass stubs removed: TS classes self-register via index.ts
  // side-effect imports. ZPP code uses factory callbacks (_createFn, _createBodyCb,
  // etc.) instead of nape namespace constructors for runtime creation.

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
